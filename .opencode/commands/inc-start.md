---
description: "Inicia o reanuda un incremento usando el protocolo de entrega del MVP."
agent: delivery-orchestrator
---

Trabaja como `delivery-orchestrator` sobre el incremento indicado por el usuario.

Argumentos del usuario:

```text
$ARGUMENTS
```

Proceso obligatorio:

1. Identifica el incremento activo. Si no se indica, usa `INC-00-estabilizacion-fases-1-2`.
2. Lee `docs/producto/mvp.md`, `docs/producto/decisiones.md`, `docs/producto/avance.md` y los archivos del incremento.
3. Verifica estado actual: `PROPUESTO`, `ESPECIFICADO`, `LISTO`, `RED`, `IMPLEMENTADO`, `VERIFICADO`, `REVISADO`, `ACEPTADO` o `BLOQUEADO`.
4. Si faltan criterios, decisiones o datos de prueba, deja el incremento `BLOQUEADO` y formula preguntas concretas.
5. Si esta listo, delega trabajo con el contrato obligatorio: criterios, archivos permitidos, pruebas esperadas, no-goals y evidencia requerida.
6. Actualiza tareas o evidencia solo cuando haya cambios reales.

No certifiques avance sin evidencia ejecutada y revision.
