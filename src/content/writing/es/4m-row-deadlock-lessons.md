---
title: "Cuando indexar no basta: el fix de un deadlock de 4.2M filas"
summary: "Un índice composite que redujo un full-scan de 4.2M a 34 filas, y la reescritura de query que hizo el índice utilizable."
publishedAt: "2026-04-15"
tags: ["bases-de-datos", "mysql", "performance"]
minRead: 6
---

Una tabla MySQL en producción con **4.2M+ filas** — una tabla `sales_ticket` en un sistema POS multi-sucursal — empezó a mostrar deadlocks intermitentes en el servicio cash-register durante horas pico. El fix requirió tanto un nuevo índice como una reescritura de query. Solo uno de los dos no hubiera sido suficiente.

## Cómo se veía el síntoma

El mensaje de error en logs era estándar:

```
Deadlock found when trying to get lock; try restarting transaction
```

Las métricas CloudWatch de RDS se veían sanas: CPU en rangos normales, IOPS dentro de presupuesto, sin replication lag. El único contador que subía era el de deadlocks.

## Lo que realmente pasaba

Dos queries colisionaban sobre el mismo conjunto de filas pero adquiriendo locks en órdenes distintos:

1. Un `SELECT` para tickets pendientes que escaneaba por `DATE(created_at)`. La función que envolvía `created_at` impedía que la base de datos usara cualquier índice sobre esa columna.
2. Un `UPDATE` para estado de ticket que bloqueaba filas por primary key.

Como el `SELECT` estaba haciendo un full table scan sobre 4.2M filas, retenía locks de fila sobre tickets que el `UPDATE` intentaba modificar. Orden aleatorio, colisiones intermitentes, deadlock.

## El fix

Dos cambios, aplicados en orden:

### 1. Un índice composite diseñado para el access pattern

```sql
CREATE INDEX idx_st_pending_details
  ON sales_ticket (status, created_at, branch_id);
```

`EXPLAIN` antes: `rows: 4,213,891` (full table scan).
`EXPLAIN` después: `rows: 34`.

### 2. Reescribir la query para que sea index-friendly

La original:

```sql
SELECT * FROM sales_ticket
WHERE status = 'PENDING'
  AND DATE(created_at) = CURDATE()
  AND branch_id = ?;
```

El fix:

```sql
SELECT * FROM sales_ticket
WHERE status = 'PENDING'
  AND created_at >= CURDATE()
  AND created_at < CURDATE() + INTERVAL 1 DAY
  AND branch_id = ?;
```

Funcionalmente equivalente, pero la llamada a función (`DATE(created_at)`) defeats al índice. La comparación por rango lo usa directamente.

## Resultado

- **0 deadlocks nuevos** desde que se desplegó el fix.
- Row lock wait time en la tabla esencialmente cero en el dashboard.
- p99 latency en el endpoint afectado bajó de ~800ms a <50ms durante horas pico.

## Qué reviso ahora

Después de este incidente, cuando reviso queries contra tablas grandes, busco:

- Funciones envolviendo columnas indexadas dentro de cláusulas `WHERE`.
- Comparaciones por igualdad contra valores computados donde una comparación por rango sería index-friendly.
- El plan de `EXPLAIN`, antes de asumir que el índice se está usando.
- Queries con full-scan sobre hot paths — tienden a causar contención de locks bajo carga.

El error decía "deadlock found", pero la causa era un índice faltante-y-no-utilizable combinado con un query pattern que no le permitía al índice ayudar. Tratar el deadlock como un problema de locking en lugar de un problema de query-planning hubiera llevado a un fix distinto (y equivocado).
