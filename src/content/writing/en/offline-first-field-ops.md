---
title: "Offline-first sync for field operations under intermittent connectivity"
summary: "Architecture and design decisions for a field app that has to stay functional through full connectivity, low signal and complete offline periods."
publishedAt: "2026-03-20"
tags: ["architecture", "offline-first", "resilience"]
minRead: 8
---

In cross-border trucking operations, connectivity varies significantly within short time windows: full LTE at the yard, one bar at a remote crossing, no signal behind a metal building an hour later. For a field app that captures inspections, gate events and interchange transfers, the architecture has to assume any of these states at any time.

This post describes the architecture we landed on after two iterations that didn't hold up under real operating conditions.

## What didn't work

**First iteration: direct API calls with exponential backoff.** This handled brief network drops but failed in two ways. An in-memory retry queue was lost whenever the operator killed the app to save battery. And multi-step workflows (open inspection → fill → photo upload → sign → submit) left the workflow in an inconsistent state when any step failed, forcing the operator to start over.

**Second iteration: write to local storage, sync on a 5-minute timer.** This solved the first problem but introduced others. Conflicts accumulated when two operators on different devices touched the same record while offline. Uploaded photos persisted locally indefinitely, causing storage bloat. The sync timer didn't fire reliably because the OS killed background tasks to save battery.

## The architecture that works

The current design has four parts.

### 1. Write to local storage first, always

Every write goes to local IndexedDB (web) or SQLite (native) with a `pending_sync` flag and a client-generated UUID. The UI updates immediately from local state — no spinners, no "queued" labels. The operator experience is identical online and offline.

### 2. Sync as state reconciliation, not as an operation queue

Instead of queuing operations to replay, the client syncs state. Periodically (and on app foreground, network change, or manual pull-to-refresh):

1. Send all `pending_sync=true` records to the server.
2. Server returns the canonical state for each (accepted, conflict, rejected).
3. Client updates local state to match the server response.

This is more code than an operation queue, but it's robust to dropped sync attempts, app restarts and conflicts.

### 3. Conflict resolution at the server, with audit trail

When two devices submit the same inspection field while offline, the rule is:

> Last writer wins by server-received timestamp, with the losing version preserved in an audit table.

This is deterministic, explainable to operators, and reversible by an admin if needed. More elaborate strategies (per-field last-writer, field-level CRDTs) added complexity without proportional benefit at the operational scale.

### 4. Background sync with foreground fallback

On native, the OS background sync APIs handle most cases. On web, Service Worker `sync` events handle them. In both cases, aggressive sync triggers on app foreground, network reconnect and pull-to-refresh cover the cases where background sync doesn't fire (battery-saving OS kills, restricted background execution).

### Storage with bounded lifetimes

Photos and attachments are kept locally until confirmed synced, plus a 24h grace window before eviction. The grace prevents a flaky reconnect from re-uploading a 5MB photo.

## Operator experience

- Open the app: all assigned work is visible, regardless of connectivity.
- Complete an inspection: action is immediate, no spinner.
- Drive into a no-signal area: app continues working normally.
- Network reconnects: a small badge briefly indicates "syncing N items", then disappears.
- Conflict occurs: an inbox item explains what happened and what the server kept.

## Notes on offline-first as an architectural choice

Offline-first is not a feature that can be added after an online-first design. Every layer of the application has to assume the network may not be there: the data model handles divergence and reconciliation, the UI assumes eventual consistency, the user-visible state comes from local truth rather than remote truth. It requires more code than online-first, and the additional complexity is justified by the operating conditions of the field where the app runs.
