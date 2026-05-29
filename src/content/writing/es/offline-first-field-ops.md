---
title: "Sync offline-first para operaciones de campo bajo conectividad intermitente"
summary: "Arquitectura y decisiones de diseño para una app de campo que tiene que mantenerse funcional en condiciones de conectividad completa, baja señal y offline total."
publishedAt: "2026-03-20"
tags: ["arquitectura", "offline-first", "resiliencia"]
minRead: 8
---

En operaciones de transporte transfronterizo, la conectividad varía significativamente en ventanas cortas de tiempo: LTE completo en el yard, una barra en un cruce remoto, sin señal detrás de un edificio de metal una hora después. Para una app de campo que captura inspecciones, eventos de gate y transferencias de interchange, la arquitectura tiene que asumir cualquiera de estos estados en cualquier momento.

Este post describe la arquitectura a la que llegamos después de dos iteraciones que no aguantaron las condiciones reales de operación.

## Lo que no funcionó

**Primera iteración: llamadas API directas con exponential backoff.** Manejaba caídas breves de red pero falló en dos formas. Una retry queue en memoria se perdía cuando el operador mataba la app para ahorrar batería. Y los workflows multi-paso (abrir inspección → llenar → upload foto → firmar → submit) dejaban el workflow en estado inconsistente cuando cualquier paso fallaba, forzando al operador a empezar de nuevo.

**Segunda iteración: escribir a storage local, sincronizar con timer de 5 minutos.** Resolvió el primer problema pero introdujo otros. Los conflictos se acumulaban cuando dos operadores en dispositivos distintos tocaban el mismo registro mientras estaban offline. Las fotos subidas persistían localmente indefinidamente, causando storage bloat. El timer de sync no disparaba de forma confiable porque el OS mataba los background tasks para ahorrar batería.

## La arquitectura que funciona

El diseño actual tiene cuatro partes.

### 1. Escribir a storage local primero, siempre

Cada escritura va a IndexedDB local (web) o SQLite (nativo) con un flag `pending_sync` y un UUID generado por cliente. La UI actualiza inmediatamente desde el estado local — sin spinners, sin labels "en cola". La experiencia del operador es idéntica online y offline.

### 2. Sync como reconciliación de estado, no como operation queue

En lugar de encolar operaciones para repetir, el cliente sincroniza estado. Periódicamente (y en app foreground, cambio de red, o pull-to-refresh manual):

1. Enviar todos los registros `pending_sync=true` al servidor.
2. El servidor regresa el estado canónico para cada uno (aceptado, conflicto, rechazado).
3. El cliente actualiza el estado local para que coincida con la respuesta del servidor.

Es más código que una operation queue, pero es robusto contra intentos de sync caídos, reinicios de app y conflictos.

### 3. Resolución de conflictos en el servidor, con audit trail

Cuando dos dispositivos submitearon el mismo campo de inspección estando offline, la regla es:

> Last writer wins por timestamp de recepción del servidor, con la versión perdedora preservada en una tabla de auditoría.

Es determinístico, explicable a los operadores y reversible por un admin si es necesario. Estrategias más elaboradas (last-writer por campo, CRDTs a nivel campo) agregaban complejidad sin beneficio proporcional a la escala operativa.

### 4. Background sync con foreground fallback

En nativo, las APIs de background sync del OS manejan la mayoría de los casos. En web, los eventos `sync` de Service Worker los manejan. En ambos casos, triggers agresivos de sync en app foreground, reconexión de red y pull-to-refresh cubren los casos donde el background sync no dispara (kills del OS por batería, ejecución background restringida).

### Storage con tiempos de vida acotados

Fotos y attachments se mantienen localmente hasta confirmar sync, más una ventana de gracia de 24h antes de evictar. La gracia previene que una reconexión inestable re-suba una foto de 5MB.

## Experiencia del operador

- Abrir la app: todo el trabajo asignado es visible, sin importar la conectividad.
- Completar una inspección: la acción es inmediata, sin spinner.
- Manejar a una zona sin señal: la app sigue funcionando normal.
- La red se reconecta: un badge pequeño brevemente indica "sincronizando N items", luego desaparece.
- Ocurre un conflicto: un item en inbox explica qué pasó y qué guardó el servidor.

## Notas sobre offline-first como decisión arquitectónica

Offline-first no es una feature que se pueda agregar después de un diseño online-first. Cada capa de la aplicación tiene que asumir que la red puede no estar ahí: el modelo de datos maneja divergencia y reconciliación, la UI asume consistencia eventual, el estado visible al usuario viene de la verdad local en lugar de la remota. Requiere más código que online-first, y la complejidad adicional se justifica por las condiciones de operación del campo donde corre la app.
