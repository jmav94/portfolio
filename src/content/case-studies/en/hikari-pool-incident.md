---
title: "Resolving a 7-hour HikariPool exhaustion in production"
summary: "Anatomy of an outage: 23K errors, the cascade that hid the root cause, and the observability that came out of fixing it."
role: "Solutions Architect & DevOps Lead"
industry: "Hospitality SaaS (multi-branch POS)"
year: "2024"
stack: ["AWS", "ECS / Fargate", "RDS MySQL", "Java / Spring Boot", "HikariCP", "CloudWatch"]
metrics:
  - { label: "Outage duration", value: "~7h 25min" }
  - { label: "Errors logged", value: "23,500+" }
  - { label: "Connection leak", value: "137/h → 21/h (-85%)" }
  - { label: "Alarms added", value: "15+" }
featured: true
order: 2
---

## Context

A multi-branch POS SaaS running on ECS Fargate (Java / Spring Boot) with RDS MySQL. Three services share the database through HikariCP connection pools: gateway, auth, cash-register.

One afternoon, the cash-register service stopped accepting requests. The pattern in logs: `HikariPool-1 - Connection is not available, request timed out`. By the time we identified the cause, **23K errors had accumulated** and the service had been degraded for **~7 hours**.

## The cascade that hid the root cause

The database itself was operating normally. CloudWatch RDS metrics showed CPU at normal levels, connections well below `max_connections`, and query latency unchanged.

The missing layer was connection-pool-level metrics. The available visibility covered the database side, not the internal state of each service's pool. The symptom (timeouts) appeared to be database-related, but the actual cause (leaks inside the application) wasn't visible from RDS metrics.

The cause, identified through thread dumps:

- 55 services in the codebase used transactional methods, several with **OSIV (Open Session In View) enabled** — the Spring pattern that keeps a Hibernate session open during the entire request, including view rendering.
- Several controllers were calling external APIs **inside transactions**, holding connections for seconds during the HTTP call.
- Under load, the pool drained faster than connections returned. Once exhausted, every new request queued on the wait queue until timeout.

<div class="diagram-wrap" data-label="figure 02 :: pool exhaustion cascade · what we saw vs. what was happening">
<svg class="diagram" viewBox="0 0 680 480" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="HikariPool exhaustion cascade diagram">
  <defs>
    <marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow"/></marker>
    <marker id="arr2A" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow-accent"/></marker>
  </defs>
  <line x1="20" y1="40" x2="660" y2="40" class="d-tier-rule"/>
  <text x="20" y="34" class="d-tier-label">what the dashboards showed (green)</text>
  <text x="660" y="34" class="d-tier-label d-text-right">what was actually happening</text>
  <rect x="40" y="70" width="260" height="56" rx="3" class="d-box"/>
  <text x="170" y="90" class="d-text">RDS MySQL · metrics</text>
  <text x="170" y="108" class="d-text-mono">CPU normal · max_conn far · latency flat</text>
  <text x="170" y="121" class="d-text-mono d-text-accent">→ "database is fine"</text>
  <text x="40" y="155" class="d-num">no metric for what's happening</text>
  <text x="40" y="170" class="d-num">inside each service's pool ↓</text>
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
  <line x1="420" y1="126" x2="420" y2="160" class="d-line" marker-end="url(#arr2)"/>
  <line x1="530" y1="126" x2="530" y2="160" class="d-line" marker-end="url(#arr2)"/>
  <line x1="620" y1="126" x2="620" y2="160" class="d-line-accent" marker-end="url(#arr2A)"/>
  <rect x="370" y="170" width="280" height="118" rx="4" class="d-box-ghost"/>
  <text x="510" y="190" class="d-tier-label" text-anchor="middle">inside the leak path :: 55 services audited</text>
  <rect x="385" y="205" width="120" height="32" rx="2" class="d-box"/>
  <text x="445" y="225" class="d-text">@Transactional</text>
  <line x1="505" y1="221" x2="525" y2="221" class="d-line" marker-end="url(#arr2)"/>
  <rect x="525" y="205" width="115" height="32" rx="2" class="d-box d-box-accent"/>
  <text x="582" y="225" class="d-text d-text-accent">External API</text>
  <text x="510" y="258" class="d-annot" text-anchor="middle">conn held for seconds during HTTP call</text>
  <text x="510" y="275" class="d-annot" text-anchor="middle">+ OSIV keeping session open through render</text>
  <line x1="510" y1="300" x2="510" y2="335" class="d-line-accent" marker-end="url(#arr2A)"/>
  <rect x="370" y="340" width="280" height="50" rx="3" class="d-box d-box-accent"/>
  <text x="510" y="360" class="d-text d-text-accent">Pool exhausted · timeouts</text>
  <text x="510" y="378" class="d-text-mono">"HikariPool-1 - Connection is not available"</text>
  <line x1="40" y1="420" x2="660" y2="420" class="d-tier-rule"/>
  <text x="40" y="445" class="d-text d-text-left">7h 25min outage</text>
  <text x="40" y="462" class="d-text-mono d-text-left">until pattern identified</text>
  <text x="350" y="445" class="d-text">23,500+ errors</text>
  <text x="350" y="462" class="d-text-mono">stacked on wait queue</text>
  <text x="660" y="445" class="d-text d-text-accent d-text-right">137/h → 21/h leak rate</text>
  <text x="660" y="462" class="d-text-mono d-text-right">after fix · 48h post-deploy</text>
</svg>
</div>

## The fix

1. **OSIV disabled** at the application level — sessions live only inside `@Transactional` boundaries.
2. **55 services audited** for transaction scope; external calls moved outside the transactional block.
3. **HikariCP pool sizing rebalanced** across the three services based on actual concurrency profiles (gateway 300, auth 150, worker 50 — total 500 of 2,730 max, ~18% utilization headroom).
4. **Connection leak detection** turned on in Hikari config (`leakDetectionThreshold`) so future leaks log a stack trace immediately.

Result: **connection leaks dropped from <span class="num">137/h</span> to <span class="num">21/h</span> (-85%)** within 48 hours of deploy.

## Observability improvements

To prevent recurrence and surface similar patterns before they reach production, I added:

- **CloudWatch metric filters** on log lines matching `HikariPool.*timed out`, `Connection is not available`, and `pool stats:` — alarm configured at rate > 5/min.
- **CloudWatch Insights queries** saved as named runbook entries (`pool-saturation`, `connection-leaks`, `slow-transactions`).
- **15+ new CloudWatch Alarms** organized by category: memory pressure, connection saturation, task health, RDS replication lag — each with a one-line runbook attached to the alarm description.
- **Container Insights** enabled on ECS Fargate for real-time CPU, memory and connection visibility per task.

When a similar pattern appeared in sandbox five days later during the OSIV rollout on a different service, the alarm fired in **under 2 minutes** and the issue was caught before it reached production traffic.

## Outcome

The incident was resolved and the patterns that caused it were addressed at the application and observability layers. Pool-level visibility now exists where it didn't before, with alarms and runbooks in place for the categories of failure observed during the incident.
