---
title: "Diseño de un framework de auditoría recurrente para infraestructura AWS"
summary: "Diseño de un sistema de revisión recurrente que cubre costo, seguridad, confiabilidad, base de datos e higiene sobre una infraestructura AWS, con ejecución estructurada y reporte basado en evidencia."
role: "Senior DevOps Engineer & AWS Solutions Architect"
industry: "Logística transfronteriza"
year: "2025"
stack: ["AWS", "AWS CLI", "Bash", "Python", "CloudWatch", "Claude Code"]
metrics:
  - { label: "Pilares de auditoría", value: "5 (costos, seguridad, confiabilidad, DB, higiene)" }
  - { label: "Cadencia", value: "On-demand + programada" }
  - { label: "Modelo de evidencia", value: "Hallazgos respaldados por API" }
featured: true
order: 3
---

## El problema

Una infraestructura AWS en evolución continua genera preguntas operativas recurrentes que se benefician de una revisión periódica:

- ¿Los servicios siguen right-sized después de los últimos cambios de carga?
- ¿Hay alguna política IAM más permisiva de lo necesario?
- ¿Los backups se están tomando y probando como se espera?
- ¿Hay algún dato almacenado sin encriptar por accidente?
- ¿Hay funciones Lambda fuera de la VPC que no deberían estarlo?
- ¿Hay log groups de CloudWatch acumulando storage sin políticas de retención?

Cada una se puede responder con la consola AWS, pero hacerlo consistentemente entre múltiples entornos requiere esfuerzo sostenido. Las preguntas tienden a des-priorizarse hasta que algún problema sale a la luz.

## El framework

Diseñé el framework alrededor de cinco pilares del Well-Architected Framework, cada uno con alcance definido y enfoque de verificación:

- **Costos** — EC2, ECS/Fargate, RDS, Lambda, S3, networking y storage. Cruzado con utilización de CloudWatch para identificar oportunidades de right-sizing.
- **Seguridad** — IAM, RDS, S3, Lambda, networking, encryption y postura de servicios de seguridad.
- **Base de datos** — métricas RDS CloudWatch en la fase remota, con revisión detallada opcional (SSH + MySQL) para slow queries, deadlocks y eventos problemáticos.
- **Confiabilidad** — backups, alarmas, estabilidad de servicios, ENI limits, health checks y configuración de failover.
- **Higiene** — recursos huérfanos, malas configuraciones, lifecycle policies faltantes y acumulación innecesaria de storage.

El framework requiere que **cada hallazgo esté respaldado por una llamada API real como evidencia.** Ningún hallazgo se acepta en el reporte sin una fuente verificable. Esta regla se aplica de forma consistente sin importar la herramienta que ejecuta el check.

## Implementación

El framework se ejecuta mediante una combinación del AWS CLI, scripts en Bash y Python, y un set de comandos de Claude Code que automatizan la recolección de datos sobre el alcance definido. La decisión de usar ejecución asistida por IA fue deliberada: elimina la fricción de correr los checks manualmente cada vez, manteniendo el contrato (hallazgos basados en evidencia) impuesto por el framework mismo, no por la herramienta.

El loop de juicio se mantiene humano en todo momento:

- Yo diseño y actualizo el framework, incluyendo qué checks pertenecen a qué pilar y cómo se asigna la severidad.
- La capa de ejecución (cualquier herramienta) solo recolecta y reporta contra las reglas del framework.
- Yo reviso cada reporte, priorizo según contexto, y decido qué se implementa.

<div class="diagram-wrap" data-label="figura 03 :: fanout de auditoría well-architected · iam read-only">
<svg class="diagram" viewBox="0 0 680 460" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagrama de fanout de agentes IA mostrando orchestrator que despacha a 5 agentes especializados y sintetiza un reporte">
  <defs>
    <marker id="arr3es" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow"/></marker>
    <marker id="arr3esA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="d-arrow-accent"/></marker>
  </defs>
  <line x1="20" y1="40" x2="660" y2="40" class="d-tier-rule"/>
  <text x="20" y="34" class="d-tier-label">01 · trigger</text>
  <text x="660" y="34" class="d-tier-label d-text-right">on-demand · programada</text>
  <rect x="270" y="60" width="140" height="46" rx="3" class="d-box d-box-accent"/>
  <text x="340" y="80" class="d-text d-text-accent">/aws-audit</text>
  <text x="340" y="97" class="d-text-mono">agente orchestrator</text>
  <line x1="340" y1="116" x2="340" y2="135" class="d-line" marker-end="url(#arr3es)"/>
  <line x1="340" y1="140" x2="80" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="200" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="340" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="480" y2="195" class="d-line"/>
  <line x1="340" y1="140" x2="600" y2="195" class="d-line"/>
  <text x="20" y="180" class="d-tier-label">02 · agentes especializados · iam read-only</text>
  <rect x="35" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="95" y="220" class="d-text">costos</text>
  <text x="95" y="237" class="d-text-mono">ec2 · ecs · rds</text>
  <text x="95" y="250" class="d-text-mono">s3 · lambda</text>
  <rect x="160" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="220" y="220" class="d-text">seguridad</text>
  <text x="220" y="237" class="d-text-mono">iam · encryption</text>
  <text x="220" y="250" class="d-text-mono">net · acceso público</text>
  <rect x="285" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="345" y="220" class="d-text">database</text>
  <text x="345" y="237" class="d-text-mono">rds metrics · slow</text>
  <text x="345" y="250" class="d-text-mono">queries · deadlocks</text>
  <rect x="410" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="470" y="220" class="d-text">confiabilidad</text>
  <text x="470" y="237" class="d-text-mono">backups · alarmas</text>
  <text x="470" y="250" class="d-text-mono">eni · failover</text>
  <rect x="535" y="200" width="120" height="62" rx="3" class="d-box"/>
  <text x="595" y="220" class="d-text">higiene</text>
  <text x="595" y="237" class="d-text-mono">huérfanos · lifecycle</text>
  <text x="595" y="250" class="d-text-mono">log retention</text>
  <text x="340" y="285" class="d-annot" text-anchor="middle">contrato :: verificar cada hallazgo contra una llamada API real antes de reportar</text>
  <line x1="95" y1="295" x2="320" y2="335" class="d-line-accent"/>
  <line x1="220" y1="295" x2="330" y2="335" class="d-line-accent"/>
  <line x1="345" y1="295" x2="345" y2="335" class="d-line-accent"/>
  <line x1="470" y1="295" x2="360" y2="335" class="d-line-accent"/>
  <line x1="595" y1="295" x2="370" y2="335" class="d-line-accent"/>
  <line x1="20" y1="325" x2="660" y2="325" class="d-tier-rule"/>
  <text x="20" y="320" class="d-tier-label">03 · síntesis</text>
  <text x="660" y="320" class="d-tier-label d-text-right">~20 min · markdown</text>
  <rect x="180" y="340" width="320" height="100" rx="3" class="d-box d-box-accent"/>
  <text x="340" y="360" class="d-text d-text-accent">reporte de auditoría · por severidad</text>
  <text x="340" y="380" class="d-text-mono" text-anchor="middle">critical · high · medium · low</text>
  <line x1="190" y1="395" x2="490" y2="395" class="d-line-ghost"/>
  <text x="190" y="411" class="d-annot" text-anchor="start">— ARN del recurso</text>
  <text x="490" y="411" class="d-annot" text-anchor="end">API call de verificación —</text>
  <text x="190" y="427" class="d-annot" text-anchor="start">— estado actual</text>
  <text x="490" y="427" class="d-annot" text-anchor="end">API call para aplicar —</text>
</svg>
</div>

## Cómo funciona un audit run

Un run usa acceso IAM read-only y produce un reporte Markdown agrupado por severidad:

- **Critical** — requiere atención inmediata
- **High** — debería atenderse durante la semana
- **Medium** — item de backlog
- **Low** — oportunidad de mejora

Cada hallazgo incluye:

- ARN exacto del recurso AWS
- Estado actual, con la llamada API para verificarlo
- Fix recomendado, con la llamada API para aplicarlo
- Breve explicación de por qué importa

## Restricciones operativas

- La ejecución opera con permisos IAM read-only. Cualquier paso de apply es una acción manual explícita.
- Cada hallazgo referencia una llamada API real como evidencia. Es un requerimiento del framework, no una opción a nivel herramienta.
- Todo output se revisa manualmente antes de actuar. La ejecución automatizada acelera la recolección de datos; la priorización e implementación las decide el operador.

## Resultado

El ciclo de auditoría que antes era inconsistente ahora corre de forma confiable entre todos los entornos. Los hallazgos están documentados con pasos de verificación reproducibles, lo cual hace el proceso de revisión auditable y los fixes trazables. El framework define qué se revisa, cómo se asigna severidad y qué evidencia se requiere. La velocidad de ejecución es un beneficio de la implementación; la integridad de la auditoría viene de la estructura del framework.
