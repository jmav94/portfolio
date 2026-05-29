---
title: "Designing a recurring audit framework for AWS infrastructure"
summary: "Design of a recurring review system covering cost, security, reliability, database and hygiene across an AWS footprint, with structured execution and evidence-based reporting."
role: "Senior DevOps Engineer & AWS Solutions Architect"
industry: "Cross-border logistics"
year: "2025"
stack: ["AWS", "AWS CLI", "Bash", "Python", "CloudWatch", "Claude Code"]
metrics:
  - { label: "Audit pillars", value: "5 (cost, security, reliability, DB, hygiene)" }
  - { label: "Cadence", value: "On-demand + scheduled" }
  - { label: "Evidence model", value: "API-backed findings" }
featured: true
order: 3
---

## The problem

A continuously evolving AWS footprint generates recurring operational questions that benefit from periodic review:

- Are services right-sized after recent load changes?
- Is any IAM policy more permissive than required?
- Are backups being taken and tested as expected?
- Is any data stored unencrypted unintentionally?
- Are there Lambda functions outside the VPC that shouldn't be?
- Are CloudWatch log groups accumulating storage without retention policies?

Each of these can be answered through the AWS console, but doing it consistently across multiple environments requires sustained effort. The questions tend to get deprioritized until an issue surfaces.

## The framework

I designed the framework around five pillars of the Well-Architected Framework, each with a defined scope and verification approach:

- **Cost** — EC2, ECS/Fargate, RDS, Lambda, S3, networking and storage. Cross-referenced with CloudWatch utilization to identify right-sizing opportunities.
- **Security** — IAM, RDS, S3, Lambda, networking, encryption and security service posture.
- **Database** — RDS CloudWatch metrics in the remote phase, with optional detailed review (SSH + MySQL) for slow queries, deadlocks and problematic events.
- **Reliability** — backups, alarms, service stability, ENI limits, health checks and failover configuration.
- **Hygiene** — orphaned resources, misconfigurations, missing lifecycle policies and unnecessary storage accumulation.

The framework requires that **every finding must be backed by a real API call as evidence.** No finding is accepted into the report without a verifiable source. This rule is applied consistently regardless of the tool that executes the check.

## Implementation

The framework is executed through a combination of the AWS CLI, Bash and Python scripts, and a set of Claude Code commands that automate the data collection across the defined scope. The decision to use AI-assisted execution was deliberate: it removes the friction of running the checks manually each time, while keeping the contract (evidence-based findings) enforced by the framework itself, not by the tool.

The judgment loop stays human throughout:

- I design and update the framework, including which checks belong in which pillar and how severity is assigned.
- The execution layer (whichever tool) only collects and reports against the framework's rules.
- I review every report, prioritize based on context, and decide what gets implemented.

<div class="diagram-wrap" data-label="figure 03 :: well-architected audit fanout · read-only iam">
<svg class="diagram" viewBox="0 0 680 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI agents fanout diagram showing orchestrator dispatching to 5 specialized audit agents and synthesizing a report">
  <defs>
    <marker id="arr3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow"/></marker>
    <marker id="arr3A" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow-accent"/></marker>
  </defs>
  <line x1="20" y1="40" x2="660" y2="40" class="d-tier-rule"/>
  <text x="20" y="34" class="d-tier-label">01 · trigger</text>
  <text x="660" y="34" class="d-tier-label d-text-right">on-demand · scheduled</text>
  <rect x="270" y="60" width="140" height="46" rx="3" class="d-box d-box-accent"/>
  <text x="340" y="80" class="d-text d-text-accent">/aws-audit</text>
  <text x="340" y="97" class="d-text-mono">orchestrator agent</text>
  <line x1="340" y1="116" x2="340" y2="135" class="d-line" marker-end="url(#arr3)"/>
  <line x1="340" y1="140" x2="80" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="200" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="340" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="480" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="600" y2="195" class="d-line"/>
  <text x="20" y="180" class="d-tier-label">02 · specialized audit agents · read-only iam</text>
  <rect x="35" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="95" y="220" class="d-text">cost</text>
  <text x="95" y="237" class="d-text-mono">ec2 · ecs · rds</text>
  <text x="95" y="250" class="d-text-mono">s3 · lambda</text>
  <rect x="160" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="220" y="220" class="d-text">security</text>
  <text x="220" y="237" class="d-text-mono">iam · encryption</text>
  <text x="220" y="250" class="d-text-mono">net · public access</text>
  <rect x="285" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="345" y="220" class="d-text">database</text>
  <text x="345" y="237" class="d-text-mono">rds metrics · slow</text>
  <text x="345" y="250" class="d-text-mono">queries · deadlocks</text>
  <rect x="410" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="470" y="220" class="d-text">reliability</text>
  <text x="470" y="237" class="d-text-mono">backups · alarms</text>
  <text x="470" y="250" class="d-text-mono">eni · failover</text>
  <rect x="535" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="595" y="220" class="d-text">hygiene</text>
  <text x="595" y="237" class="d-text-mono">orphans · lifecycle</text>
  <text x="595" y="250" class="d-text-mono">log retention</text>
  <text x="340" y="285" class="d-annot" text-anchor="middle">contract :: verify every finding against a real API call before reporting</text>
  <line x1="95" y1="295" x2="320" y2="335" class="d-line-accent"/>
  <line x1="220" y1="295" x2="330" y2="335" class="d-line-accent"/>
  <line x1="345" y1="295" x2="345" y2="335" class="d-line-accent"/>
  <line x1="470" y1="295" x2="360" y2="335" class="d-line-accent"/>
  <line x1="595" y1="295" x2="370" y2="335" class="d-line-accent"/>
  <line x1="20" y1="325" x2="660" y2="325" class="d-tier-rule"/>
  <text x="20" y="320" class="d-tier-label">03 · synthesis</text>
  <text x="660" y="320" class="d-tier-label d-text-right">~20 min · markdown</text>
  <rect x="180" y="340" width="320" height="100" rx="3" class="d-box d-box-accent"/>
  <text x="340" y="360" class="d-text d-text-accent">audit report · grouped by severity</text>
  <text x="340" y="380" class="d-text-mono" text-anchor="middle">critical · high · medium · low</text>
  <line x1="190" y1="395" x2="490" y2="395" class="d-line-ghost"/>
  <text x="190" y="411" class="d-annot" text-anchor="start">— resource ARN</text>
  <text x="490" y="411" class="d-annot" text-anchor="end">verifying API call —</text>
  <text x="190" y="427" class="d-annot" text-anchor="start">— current state</text>
  <text x="490" y="427" class="d-annot" text-anchor="end">applying API call —</text>
</svg>
</div>

## How an audit run works

A run uses read-only IAM access and produces a Markdown report grouped by severity:

- **Critical** — requires immediate attention
- **High** — should be addressed within the week
- **Medium** — backlog item
- **Low** — improvement opportunity

Each finding includes:

- Exact AWS resource ARN
- Current state, with the API call to verify it
- Recommended fix, with the API call to apply it
- Brief explanation of why it matters

## Operating constraints

- Execution operates with read-only IAM permissions. Any apply step is an explicit manual action.
- Every finding references a real API call as evidence. This is a framework requirement, not a tool-level option.
- All output is reviewed manually before action. Automated execution speeds up data collection; prioritization and implementation are decided by the operator.

## Outcome

The audit cycle that was previously inconsistent now runs reliably across all environments. Findings are documented with reproducible verification steps, which makes the review process auditable and the fixes traceable. The framework defines what gets checked, how severity is assigned and what evidence is required. Execution speed is a benefit of the implementation; the integrity of the audit comes from the framework's structure.
