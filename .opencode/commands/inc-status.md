---
description: "Reporta estado del MVP, incremento activo, bloqueos y siguiente accion recomendada."
agent: delivery-orchestrator
---

Trabaja como `delivery-orchestrator` y reporta estado sin modificar codigo. Cualquier construccion solicitada se delega con contrato completo; nunca construyas directamente ni por shell.

Argumentos del usuario:

```text
$ARGUMENTS
```

Proceso obligatorio:

1. Lee `docs/producto/mvp.md`, `docs/producto/decisiones.md`, `docs/producto/avance.md` y el incremento indicado o `INC-00-estabilizacion-fases-1-2`.
2. Resume avance implementado, verificado y aceptado sin mezclarlos.
3. Lista bloqueos por responsable.
4. Recomienda la siguiente accion concreta.
5. Reporta aplicabilidad y cobertura de matriz de navegacion, recorridos con evidencia ejecutada y bloqueos del auditor por rol/pantalla. Sin navegador/evidencia indica `NO VERIFICADO`, no aceptado. Orquestador reasigna correcciones a frontend y automatizacion a test-engineer.

No declares nuevos porcentajes sin actualizar la matriz de avance con evidencia.
No omitas el PIN obligatorio. WORKFLOW-NAV no certifica puntos MVP.
