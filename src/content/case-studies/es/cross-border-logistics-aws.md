---
title: "Arquitectura AWS para una operación logística transfronteriza 24/7"
summary: "Diseño y operación end-to-end de un conjunto de aplicaciones empresariales para una empresa de transporte USA–México, construido sobre AWS bajo el Well-Architected Framework."
role: "Senior DevOps Engineer & AWS Solutions Architect"
industry: "Logística transfronteriza / transporte"
year: "2025 – Presente"
stack: ["AWS", "ECS / Fargate", "RDS", "S3", "CloudFront", "Route 53", "GitHub Actions", "PostgreSQL", "Next.js", "TypeScript"]
metrics:
  - { label: "Reducción de costos", value: "50–75%" }
  - { label: "Entornos AWS", value: "Múltiples ($350–$3,400/mes)" }
  - { label: "Apps en producción", value: "6+" }
  - { label: "Operación", value: "24/7 en 2 países" }
featured: true
order: 1
---

## Contexto

El cliente es una empresa de transporte transfronterizo que opera entre USA y México, con **150 empleados, 370 tractocamiones y 500 cajas** en servicio continuo. La operación corre sobre un conjunto de aplicaciones internas: despacho, mecánica, gate, drivers, nómina, interchanges y un sitio público.

Cuando entré como Senior DevOps Engineer a inicios de 2025, la infraestructura cloud había crecido orgánicamente. Algunas aplicaciones escribían directamente contra la base de datos de producción desde sesiones de desarrollo local. Los secretos estaban duplicados en varios lugares. SSL se gestionaba de forma independiente por app. No había una baseline compartida de costo, seguridad ni confiabilidad entre entornos.

Mi responsabilidad: hacerme cargo de la arquitectura AWS de punta a punta y estandarizar el modelo operativo del conjunto de aplicaciones.

## La arquitectura

Reconstruí la arquitectura alineada con los cinco pilares del **AWS Well-Architected Framework**.

<div class="diagram-wrap" data-label="figura 01 :: topología del conjunto aws · rev. 2026.05">
<svg class="diagram" viewBox="0 0 680 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista de arquitectura AWS mostrando capas edge, compute, data y observabilidad">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow"/></marker>
    <marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow-accent"/></marker>
  </defs>
  <line x1="20" y1="50" x2="660" y2="50" class="d-tier-rule"/>
  <text x="20" y="44" class="d-tier-label">01 · Edge</text>
  <text x="660" y="44" class="d-tier-label d-text-right" text-anchor="end">DNS · CDN · TLS</text>
  <line x1="20" y1="200" x2="660" y2="200" class="d-tier-rule"/>
  <text x="20" y="194" class="d-tier-label">02 · Compute</text>
  <text x="660" y="194" class="d-tier-label d-text-right" text-anchor="end">ECS Fargate · 6+ servicios</text>
  <line x1="20" y1="370" x2="660" y2="370" class="d-tier-rule"/>
  <text x="20" y="364" class="d-tier-label">03 · Datos y observabilidad</text>
  <text x="660" y="364" class="d-tier-label d-text-right" text-anchor="end">Multi-env · auditado</text>
  <rect x="270" y="70" width="140" height="38" rx="3" class="d-box"/>
  <text x="340" y="93" class="d-text">Route 53</text>
  <text x="340" y="123" class="d-text-mono">DNS + failover</text>
  <line x1="340" y1="135" x2="340" y2="158" class="d-line" marker-end="url(#arr)"/>
  <rect x="220" y="160" width="240" height="38" rx="3" class="d-box d-box-accent"/>
  <text x="340" y="183" class="d-text d-text-accent">CloudFront + ACM</text>
  <rect x="100" y="220" width="480" height="130" rx="4" class="d-box-ghost"/>
  <text x="120" y="240" class="d-tier-label">ECS Fargate cluster</text>
  <rect x="120" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="170" y="281" class="d-text">despacho</text>
  <rect x="232" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="282" y="281" class="d-text">mecánica</text>
  <rect x="344" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="394" y="281" class="d-text">drivers</text>
  <rect x="456" y="260" width="100" height="34" rx="2" class="d-box"/>
  <text x="506" y="281" class="d-text">gate</text>
  <rect x="120" y="304" width="100" height="34" rx="2" class="d-box"/>
  <text x="170" y="325" class="d-text">nómina</text>
  <rect x="232" y="304" width="100" height="34" rx="2" class="d-box"/>
  <text x="282" y="325" class="d-text">interchanges</text>
  <rect x="344" y="304" width="212" height="34" rx="2" class="d-box d-box-ghost"/>
  <text x="450" y="325" class="d-text-mono">+ sitio público · /otros</text>
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
  <text x="560" y="440" class="d-text-mono">logs · alarmas · insights</text>
  <line x1="600" y1="240" x2="640" y2="240" class="d-line-ghost"/>
  <text x="650" y="232" class="d-num" text-anchor="end">04</text>
  <text x="650" y="246" class="d-annot" text-anchor="end">GitHub Actions · blue-green</text>
  <text x="340" y="510" class="d-annot" text-anchor="middle">VPC por entorno · IAM least-privilege · SSL/TLS centralizado · secretos via Secrets Manager</text>
</svg>
</div>

### Cómputo y networking

- **ECS Fargate** para todos los servicios productivos. Sin instancias EC2 que gestionar, autoscaling configurado por servicio.
- **CloudFront + ACM** frente a toda superficie pública, con una estrategia centralizada de certificados para todos los subdominios.
- **Route 53** como única fuente de verdad para DNS, con failover por health-checks en rutas críticas.
- Topología de **VPC por entorno** para mantener dev, staging y producción completamente aislados.

### Datos

- **RDS PostgreSQL** con read replicas para cargas de reportería y un usuario `readonly_dev` dedicado para queries ad-hoc seguros sobre producción.
- Una **base de datos staging** separada, sembrada desde dumps de producción, eliminando la necesidad de desarrollar contra datos productivos.
- **pgvector** para features con embeddings.

### Despliegue

- Pipelines **GitHub Actions** por repositorio (cada app es su propio repo), con:
  - Linting, type-check y test gate
  - Build → push a ECR → deploy vía swap de task-definition de ECS (blue-green, `minimumHealthyPercent=100`, `maximumPercent=200`)
  - Rollback automático ante fallo en health-check
- **Gestión de secretos estandarizada** entre GitHub Secrets, Dockerfile build args y variables de entorno de workflow.

### Observabilidad

- **CloudWatch Logs** con retención de 30 días y metric filters sobre patrones clave: saturación de conexiones, picos 5xx, fallas de deploy.
- **CloudWatch Alarms** enrutadas a SNS, con runbooks específicos por categoría (memory pressure, connection saturation, dependencias externas).

## Problemas clave resueltos

### 1. Reducción de costos del 50–75% entre entornos

Las facturas mensuales iniciales iban de <span class="num">$700</span> a <span class="num">$6,000+</span> entre entornos, con gasto significativo no justificado.

Acciones que movieron el número:

- **Right-sizing de task definitions de ECS** basado en métricas reales de CloudWatch, no estimaciones.
- **IOPS de storage RDS** ajustados en entornos que no requerían provisioned IOPS.
- **Lifecycle policies de ECR**: proteger `:latest*`, mantener 20 builds históricos, eliminar el resto.
- **Retención de CloudWatch Logs** estandarizada en 30 días para logs operacionales, más larga solo donde compliance lo requería.
- **Apagado programado** de entornos no productivos los fines de semana.

Rango mensual final: <span class="num">$350</span> a <span class="num">$3,400/mes</span>, con curvas de costo predecibles.

### 2. Migración de apps fuera del acceso directo a la DB de producción

Tres aplicaciones escribían a producción directamente desde sesiones de desarrollo local. Esto ponía en riesgo data real: <span class="num">28K+</span> inspecciones, <span class="num">~500</span> operadores, años de registros de despacho.

El fix fue estructural:

- Creé una **base de datos staging** con el mismo esquema, sembrada desde dumps de producción.
- Introduje un usuario **`readonly_dev`** con privilegios `SELECT` únicamente sobre producción para queries seguros.
- Agregué un flag `DISABLE_EMAIL` a nivel del servicio SES para prevenir envíos accidentales de email a clientes durante sesiones de dev.
- Documenté el nuevo workflow de local-dev para que se volviera el default del equipo.

### 3. Offline-first para operaciones de campo

Varias operaciones suceden en entornos con conectividad intermitente (camiones en yards, drivers en cruces remotos). Diseñé un modelo de **captura y sync offline-first** para las apps de campo: las escrituras van a storage local, las sync queues reconcilian cuando regresa la red, y la resolución de conflictos sucede del lado del servidor con audit trail por operador.

### 4. Manejo de URLs same-origin entre worktrees

El `NEXT_PUBLIC_API_URL` de cada app estaba hardcoded a `localhost:3000`, lo cual rompía al correr dos worktrees en puertos distintos. Diseñé una estrategia same-origin: derivar el API base de la propia request en dev, fallback a la URL productiva configurada en producción. Documentado como playbook por app para aplicar el fix de forma consistente en todas las aplicaciones.

## Resultado

- Una huella AWS multi-app operando dentro de presupuestos definidos con comportamiento de costo predecible.
- Un workflow de desarrollo local seguro donde el equipo puede correr cualquier app localmente sin arriesgar datos productivos.
- Un perfil de resiliencia para operaciones de campo que maneja pérdida de conectividad.
- Un modelo de despliegue consistente entre todas las apps con rollback automático ante falla.

Hacia adelante, las decisiones arquitectónicas se evalúan contra los pilares del Well-Architected Framework y la baseline operativa establecida aquí.
