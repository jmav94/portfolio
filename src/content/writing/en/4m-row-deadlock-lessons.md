---
title: "When indexing isn't enough: a 4.2M-row deadlock fix"
summary: "A composite index that reduced a full-scan from 4.2M to 34 rows, and the query rewrite that made the index usable."
publishedAt: "2026-04-15"
tags: ["databases", "mysql", "performance"]
minRead: 6
---

A production MySQL table with **4.2M+ rows** — a `sales_ticket` table in a multi-branch POS system — started showing intermittent deadlocks in the cash-register service during peak hours. The fix required both a new index and a query rewrite. Just one of them wouldn't have been enough.

## What the symptom looked like

The error message in logs was standard:

```
Deadlock found when trying to get lock; try restarting transaction
```

CloudWatch RDS metrics looked healthy: CPU within normal range, IOPS within budget, no replication lag. The deadlock counter was the only signal climbing.

## What was actually happening

Two queries were colliding on the same set of rows but acquiring locks in different orders:

1. A `SELECT` for pending tickets that scanned by `DATE(created_at)`. The function wrapping `created_at` prevented the database from using any index on that column.
2. An `UPDATE` for ticket status that locked rows by primary key.

Because the `SELECT` was doing a full table scan over 4.2M rows, it was holding row locks on tickets that the `UPDATE` was trying to modify. Random order, intermittent collisions, deadlock.

## The fix

Two changes, applied in order:

### 1. A composite index built for the access pattern

```sql
CREATE INDEX idx_st_pending_details
  ON sales_ticket (status, created_at, branch_id);
```

`EXPLAIN` before: `rows: 4,213,891` (full table scan).
`EXPLAIN` after: `rows: 34`.

### 2. Rewriting the query to be index-friendly

The original:

```sql
SELECT * FROM sales_ticket
WHERE status = 'PENDING'
  AND DATE(created_at) = CURDATE()
  AND branch_id = ?;
```

The fix:

```sql
SELECT * FROM sales_ticket
WHERE status = 'PENDING'
  AND created_at >= CURDATE()
  AND created_at < CURDATE() + INTERVAL 1 DAY
  AND branch_id = ?;
```

Functionally equivalent, but the function call (`DATE(created_at)`) defeats the index. The range comparison uses it directly.

## Result

- **0 new deadlocks** since the fix was deployed.
- Row lock wait time on the table essentially zero on the dashboard.
- p99 latency on the affected endpoint dropped from ~800ms to <50ms during peak hours.

## What I check now

After this incident, when reviewing queries against large tables, I look for:

- Functions wrapping indexed columns inside `WHERE` clauses.
- Equality comparisons against computed values where a range comparison would be index-friendly.
- The `EXPLAIN` plan, before assuming the index is being used.
- Full-scan queries on hot paths — these tend to cause lock contention under load.

The error said "deadlock found", but the cause was a missing-and-unusable index combined with a query pattern that didn't let the index help. Treating the deadlock as a locking problem instead of a query-planning problem would have led to a different (and wrong) fix.
