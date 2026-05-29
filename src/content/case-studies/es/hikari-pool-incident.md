---
title: "Resolviendo un HikariPool exhaustion de 7 horas en producción"
summary: "Anatomía de una caída: 23K errores, la cascada que ocultó la causa raíz, y la observabilidad que quedó como resultado."
role: "Solutions Architect & DevOps Lead"
industry: "SaaS hospitalario (POS multi-sucursal)"
year: "2024"
stack: ["AWS", "ECS / Fargate", "RDS MySQL", "Java / Spring Boot", "HikariCP", "CloudWatch"]
metrics:
  - { label: "Duración de la caída", value: "~7h 25min" }
  - { label: "Errores registrados", value: "23,500+" }
  - { label: "Connection leak", value: "137/h → 21/h (-85%)" }
  - { label: "Alarmas agregadas", value: "15+" }
featured: true
order: 2
---

## Contexto

Un SaaS POS multi-sucursal corriendo en ECS Fargate (Java / Spring Boot) con RDS MySQL. Tres servicios comparten la base de datos a través de pools HikariCP: gateway, auth, cash-register.

Una tarde, el servicio cash-register dejó de aceptar requests. El patrón en logs: `HikariPool-1 - Connection is not available, request timed out`. Para cuando identificamos la causa, **23K errores se habían acumulado** y el servicio había estado degradado por **~7 horas**.

## La cascada que ocultó la causa raíz

La base de datos en sí operaba normal. Las métricas RDS de CloudWatch mostraban CPU en niveles normales, conexiones muy por debajo de `max_connections`, y query latency sin cambios.

La capa faltante eran las métricas a nivel de connection pool. La visibilidad disponible cubría el lado de la base de datos, no el estado interno del pool de cada servicio. El síntoma (timeouts) parecía relacionado con la base de datos, pero la causa real (leaks dentro de la aplicación) no era visible desde métricas RDS.

La causa, identificada leyendo thread dumps:

- 55 servicios en el codebase usaban métodos transaccionales, varios con **OSIV (Open Session In View) habilitado** — el patrón de Spring que mantiene la Hibernate session abierta durante todo el request, incluyendo el render de vista.
- Varios controllers llamaban APIs externas **dentro de transacciones**, reteniendo conexiones por segundos durante la llamada HTTP.
- Bajo carga, el pool se drenaba más rápido de lo que las conexiones regresaban. Una vez agotado, cada nuevo request se encolaba en la wait queue hasta timeout.

<div class="diagram-wrap" data-label="figura 02 :: cascada de pool exhaustion · lo que vimos vs. lo que pasaba">
<svg class="diagram" viewBox="0 0 680 480" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagrama de cascada de HikariPool exhaustion">
  <defs>
    <marker id="arr2es" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow"/></marker>
    <marker id="arr2esA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow-accent"/></marker>
  </defs>
  <line x1="20" y1="40" x2="660" y2="40" class="d-tier-rule"/>
  <text x="20" y="34" class="d-tier-label">lo que mostraban los dashboards (verde)</text>
  <text x="660" y="34" class="d-tier-label d-text-right">lo que en realidad pasaba</text>
  <rect x="40" y="70" width="260" height="56" rx="3" class="d-box"/>
  <text x="170" y="90" class="d-text">RDS MySQL · métricas</text>
  <text x="170" y="108" class="d-text-mono">CPU ok · max_conn lejos · latencia flat</text>
  <text x="170" y="121" class="d-text-mono d-text-accent">→ "la base está bien"</text>
  <text x="40" y="155" class="d-num">no había métrica de lo que pasaba</text>
  <text x="40" y="170" class="d-num">dentro del pool de cada servicio ↓</text>
  <rect x="370" y="70" width="100" height="56" rx="3" class="d-box"/>
  <text x="420" y="90" class="d-text">gateway</text>
  <text x="420" y="106" class="d-text-mono">HikariCP</text>
  <text x="420" y="119" class="d-text-mono">pool: 300</text>
  <rect x="480" y="70" width="100" height="56" rx="3" class="d-box"/>
  <text x="530" y="90" class="d-text">auth</text>
  <text x="530" y="106" class="d-text-mono">HikariCP</text>
  <text x="530" y="119" class="d-text-mono">pool: 150</text>
  <rect x="590" y="70" width="60" height="56" rx="3" class="d-box d-box-accent"/>
  <text x="620" y="90" class="d-text d-text-accent">cash</text>
  <text x="620" y="106" class="d-text-mono">⚠ leaked</text>
  <line x1="420" y1="126" x2="420" y2="160" class="d-line" marker-end="url(#arr2es)"/>
  <line x1="530" y1="126" x2="530" y2="160" class="d-line" marker-end="url(#arr2es)"/>
  <line x1="620" y1="126" x2="620" y2="160" class="d-line-accent" marker-end="url(#arr2esA)"/>
  <rect x="370" y="170" width="280" height="118" rx="4" class="d-box-ghost"/>
  <text x="510" y="190" class="d-tier-label" text-anchor="middle">path del leak :: 55 servicios auditados</text>
  <rect x="385" y="205" width="120" height="32" rx="2" class="d-box"/>
  <text x="445" y="225" class="d-text">@Transactional</text>
  <line x1="505" y1="221" x2="525" y2="221" class="d-line" marker-end="url(#arr2es)"/>
  <rect x="525" y="205" width="115" height="32" rx="2" class="d-box d-box-accent"/>
  <text x="582" y="225" class="d-text d-text-accent">API externa</text>
  <text x="510" y="258" class="d-annot" text-anchor="middle">conn retenida segundos durante llamada HTTP</text>
  <text x="510" y="275" class="d-annot" text-anchor="middle">+ OSIV manteniendo sesión abierta hasta render</text>
  <line x1="510" y1="300" x2="510" y2="335" class="d-line-accent" marker-end="url(#arr2esA)"/>
  <rect x="370" y="340" width="280" height="50" rx="3" class="d-box d-box-accent"/>
  <text x="510" y="360" class="d-text d-text-accent">Pool agotado · timeouts</text>
  <text x="510" y="378" class="d-text-mono">"HikariPool-1 - Connection is not available"</text>
  <line x1="40" y1="420" x2="660" y2="420" class="d-tier-rule"/>
  <text x="40" y="445" class="d-text d-text-left">7h 25min de caída</text>
  <text x="40" y="462" class="d-text-mono d-text-left">hasta identificar el patrón</text>
  <text x="350" y="445" class="d-text">23,500+ errores</text>
  <text x="350" y="462" class="d-text-mono">apilados en wait queue</text>
  <text x="660" y="445" class="d-text d-text-accent d-text-right">137/h → 21/h leak rate</text>
  <text x="660" y="462" class="d-text-mono d-text-right">post-fix · 48h post-deploy</text>
</svg>
</div>

## El fix

1. **OSIV deshabilitado** a nivel aplicación — las sesiones viven solo dentro de fronteras `@Transactional`.
2. **55 servicios auditados** para scope transaccional; llamadas externas movidas fuera del bloque transaccional.
3. **Sizing de HikariCP rebalanceado** entre los tres servicios basado en perfiles reales de concurrencia (gateway 300, auth 150, worker 50 — total 500 de 2,730 max, ~18% headroom de utilización).
4. **Connection leak detection** activado en config Hikari (`leakDetectionThreshold`) para que futuros leaks loguen stack trace inmediatamente.

Resultado: **connection leaks bajaron de <span class="num">137/h</span> a <span class="num">21/h</span> (-85%)** en 48 horas post-deploy.

## Mejoras de observabilidad

Para prevenir recurrencia y detectar patrones similares antes de que lleguen a producción, agregué:

- **Metric filters de CloudWatch** sobre líneas de log matcheando `HikariPool.*timed out`, `Connection is not available`, y `pool stats:` — alarma configurada con rate > 5/min.
- **CloudWatch Insights queries** guardadas como entradas de runbook nombradas (`pool-saturation`, `connection-leaks`, `slow-transactions`).
- **15+ nuevas CloudWatch Alarms** organizadas por categoría: memory pressure, connection saturation, task health, RDS replication lag — cada una con un runbook de una línea adjunto en la descripción de la alarma.
- **Container Insights** habilitado en ECS Fargate para visibilidad de CPU, memoria y conexiones en tiempo real por task.

Cuando un patrón similar apareció en sandbox cinco días después durante el rollout de OSIV en otro servicio, la alarma se disparó en **menos de 2 minutos** y el problema se contuvo antes de tocar tráfico productivo.

## Resultado

El incidente fue resuelto y los patrones que lo causaron se atendieron en las capas de aplicación y observabilidad. La visibilidad a nivel de pool existe donde no existía antes, con alarmas y runbooks en su lugar para las categorías de falla observadas durante el incidente.
