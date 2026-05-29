---
title: "Architecting AWS for a 24/7 cross-border logistics operation"
summary: "End-to-end design and operation of a fleet of enterprise apps for a US–Mexico trucking company, built on AWS under the Well-Architected Framework."
role: "Senior DevOps Engineer & AWS Solutions Architect"
industry: "Cross-border logistics / trucking"
year: "2025 – Present"
stack: ["AWS", "ECS / Fargate", "RDS", "S3", "CloudFront", "Route 53", "GitHub Actions", "PostgreSQL", "Next.js", "TypeScript"]
metrics:
  - { label: "Cost reduction", value: "50–75%" }
  - { label: "AWS environments", value: "Multiple ($350–$3,400/mo)" }
  - { label: "Production apps", value: "6+" }
  - { label: "Operation", value: "24/7 across 2 countries" }
featured: true
order: 1
---

## Context

The client is a cross-border trucking company operating between the US and Mexico, with **150 employees, 370 tractor-trucks and 500 trailers** in continuous service. The operation runs on a set of internal applications: dispatch, mechanics, gates, drivers, payroll, interchanges, and a public-facing website.

When I joined as Senior DevOps Engineer in early 2025, the cloud footprint had grown organically. Some applications wrote directly against the production database from local development sessions. Secrets were duplicated across multiple locations. SSL was managed independently per app. There was no shared baseline for cost, security or reliability across environments.

My responsibility: take ownership of the AWS architecture end-to-end and standardize the operating model across the fleet.

## The architecture

I rebuilt the architecture aligned with the five pillars of the **AWS Well-Architected Framework**.

<div class="diagram-wrap" data-label="figure 01 :: aws fleet topology · rev. 2026.05">
<svg class="diagram" viewBox="0 0 680 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AWS architecture overview showing edge, compute, data, and observability tiers">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow"/></marker>
    <marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow-accent"/></marker>
  </defs>
  <line x1="20" y1="50" x2="660" y2="50" class="d-tier-rule"/>
  <text x="20" y="44" class="d-tier-label">01 · Edge</text>
  <text x="660" y="44" class="d-tier-label d-text-right" text-anchor="end">DNS · CDN · TLS</text>
  <line x1="20" y1="200" x2="660" y2="200" class="d-tier-rule"/>
  <text x="20" y="194" class="d-tier-label">02 · Compute</text>
  <text x="660" y="194" class="d-tier-label d-text-right" text-anchor="end">ECS Fargate · 6+ services</text>
  <line x1="20" y1="370" x2="660" y2="370" class="d-tier-rule"/>
  <text x="20" y="364" class="d-tier-label">03 · Data &amp; observability</text>
  <text x="660" y="364" class="d-tier-label d-text-right" text-anchor="end">Multi-env · audited</text>
  <rect x="270" y="70" width="140" height="38" rx="3" class="d-box"/>
  <text x="340" y="93" class="d-text">Route 53</text>
  <text x="340" y="123" class="d-text-mono">DNS + failover</text>
  <line x1="340" y1="135" x2="340" y2="158" class="d-line" marker-end="url(#arr)"/>
  <rect x="220" y="160" width="240" height="38" rx="3" class="d-box d-box-accent"/>
  <text x="340" y="183" class="d-text d-text-accent">CloudFront + ACM</text>
  <rect x="100" y="220" width="480" height="130" rx="4" class="d-box-ghost"/>
  <text x="120" y="240" class="d-tier-label">ECS Fargate cluster</text>
  <rect x="120" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="170" y="281" class="d-text">dispatch</text>
  <rect x="232" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="282" y="281" class="d-text">mechanics</text>
  <rect x="344" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="394" y="281" class="d-text">drivers</text>
  <rect x="456" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="506" y="281" class="d-text">gates</text>
  <rect x="120" y="304" width="100" height="34" rx="2" class="d-box"/>
  <text x="170" y="325" class="d-text">payroll</text>
  <rect x="232" y="304" width="100" height="34" rx="2" class="d-box"/>
  <text x="282" y="325" class="d-text">interchanges</text>
  <rect x="344" y="304" width="212" height="34" rx="2" class="d-box d-box-ghost"/>
  <text x="450" y="325" class="d-text-mono">+ public website · /others</text>
  <line x1="340" y1="198" x2="340" y2="220" class="d-line" marker-end="url(#arr)"/>
  <line x1="170" y1="350" x2="170" y2="395" class="d-line-accent" marker-end="url(#arrA)"/>
  <line x1="340" y1="350" x2="340" y2="395" class="d-line-accent" marker-end="url(#arrA)"/>
  <line x1="506" y1="350" x2="506" y2="395" class="d-line" marker-end="url(#arr)"/>
  <rect x="60" y="400" width="220" height="86" rx="3" class="d-box d-box-accent"/>
  <text x="170" y="421" class="d-text d-text-accent">RDS PostgreSQL</text>
  <text x="170" y="442" class="d-text-mono">primary + read replica</text>
  <text x="170" y="458" class="d-text-mono">staging DB · readonly_dev</text>
  <text x="170" y="475" class="d-text-mono">+ pgvector</text>
  <rect x="300" y="400" width="160" height="50" rx="3" class="d-box"/>
  <text x="380" y="421" class="d-text">S3 · Lambda</text>
  <text x="380" y="440" class="d-text-mono">assets · workers</text>
  <rect x="480" y="400" width="160" height="50" rx="3" class="d-box"/>
  <text x="560" y="421" class="d-text">CloudWatch</text>
  <text x="560" y="440" class="d-text-mono">logs · alarms · insights</text>
  <line x1="600" y1="240" x2="640" y2="240" class="d-line-ghost"/>
  <text x="650" y="232" class="d-num" text-anchor="end">04</text>
  <text x="650" y="246" class="d-annot" text-anchor="end">GitHub Actions · blue-green</text>
  <text x="340" y="510" class="d-annot" text-anchor="middle">Per-environment VPC · IAM least-privilege · centralized SSL/TLS · secret mgmt via Secrets Manager</text>
</svg>
</div>

### Compute & networking

- **ECS Fargate** for all production services. No EC2 instances to manage, autoscaling configured per service.
- **CloudFront + ACM** in front of every public surface, with a centralized certificate strategy across all subdomains.
- **Route 53** as the single source of truth for DNS, with health-checked failover on critical paths.
- **Per-environment VPC** topology to keep dev, staging and production fully isolated.

### Data

- **RDS PostgreSQL** with read replicas for reporting workloads and a dedicated `readonly_dev` user for safe ad-hoc queries on production.
- A separate **staging database** seeded from production dumps, removing the need to develop against production data.
- **pgvector** for embedding-based features.

### Delivery

- **GitHub Actions** pipelines per repository (each app is its own repo), with:
  - Linting, type-check and test gate
  - Build → push to ECR → deploy via ECS task-definition swap (blue-green, `minimumHealthyPercent=100`, `maximumPercent=200`)
  - Automated rollback on health-check failure
- **Standardized secret management** across GitHub Secrets, Dockerfile build args and workflow environment variables.

### Observability

- **CloudWatch Logs** with 30-day retention and metric filters on key patterns: connection saturation, 5xx spikes, deploy failures.
- **CloudWatch Alarms** routed to SNS, with category-specific runbooks (memory pressure, connection saturation, external dependencies).

## Key problems solved

### 1. Cost reduction of 50–75% across environments

Initial monthly bills ranged from <span class="num">$700</span> to <span class="num">$6,000+</span> across environments, with significant unjustified spend.

Actions that moved the number:

- **Right-sizing ECS task definitions** based on real CloudWatch metrics, not estimates.
- **RDS storage IOPS** adjusted on environments that didn't require provisioned IOPS.
- **ECR lifecycle policies**: protect `:latest*`, keep 20 historical builds, remove the rest.
- **CloudWatch Logs retention** standardized at 30 days for operational logs, longer only where compliance required it.
- **Scheduled shutdown** of non-production environments on weekends.

Final monthly range: <span class="num">$350</span> to <span class="num">$3,400/mo</span>, with predictable cost curves.

### 2. Migrating apps off direct production-DB access

Three applications wrote to production directly from local development sessions. This put real data at risk: <span class="num">28K+</span> inspections, <span class="num">~500</span> operators, years of dispatch records.

The fix was structural:

- Created a **staging database** with the same schema, seeded from production dumps.
- Introduced a **`readonly_dev` user** with `SELECT`-only privileges on production for safe queries.
- Added a `DISABLE_EMAIL` flag at the SES service level to prevent accidental emails to customers during dev sessions.
- Documented the new local-dev workflow so it became the default for the team.

### 3. Offline-first for field operations

Several operations happen in environments with intermittent connectivity (trucks at yards, drivers at remote crossings). I designed an **offline-first capture and sync** model for the field apps: writes go to local storage, sync queues reconcile when network returns, and conflict resolution happens server-side with operator audit trail.

### 4. Same-origin URL handling across worktrees

Each app's `NEXT_PUBLIC_API_URL` was hardcoded to `localhost:3000`, which broke when running two worktrees on different ports. I designed a same-origin URL strategy: derive the API base from the request itself in dev, fall back to the configured production URL in production. Documented as a per-app playbook to apply the fix consistently across the fleet.

## Outcome

- A multi-app AWS footprint operating within defined budgets with predictable cost behavior.
- A safe local development workflow where the team can run any app locally without risking production data.
- A resilience profile for field operations that handles connectivity loss.
- A consistent deployment model across all apps with automated rollback on failure.

Going forward, architectural decisions are evaluated against the Well-Architected Framework pillars and the operating baseline established here.
