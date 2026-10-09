---
description: "Reporta estado del MVP, incremento activo, bloqueos y siguiente accion recomendada."
agent: delivery-orchestrator
---

Trabaja como `delivery-orchestrator` y reporta estado sin modificar codigo salvo que el usuario lo pida explicitamente.

Argumentos del usuario:

```text
$ARGUMENTS
```

Proceso obligatorio:

1. Lee `docs/producto/mvp.md`, `docs/producto/decisiones.md`, `docs/producto/avance.md` y el incremento indicado o `INC-00-estabilizacion-fases-1-2`.
2. Resume avance implementado, verificado y aceptado sin mezclarlos.
3. Lista bloqueos por responsable.
4. Recomienda la siguiente accion concreta.

No declares nuevos porcentajes sin actualizar la matriz de avance con evidencia.
