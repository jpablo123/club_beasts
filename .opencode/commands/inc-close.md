---
description: "Cierra un incremento solo si cumple criterios, pruebas, evidencia y revision."
agent: delivery-orchestrator
---

Trabaja como `delivery-orchestrator` para evaluar cierre del incremento indicado por el usuario.

Argumentos del usuario:

```text
$ARGUMENTS
```

Proceso obligatorio:

1. Identifica el incremento activo. Si no se indica, usa `INC-00-estabilizacion-fases-1-2`.
2. Lee `spec.md`, `tareas.md`, `evidencia.md`, `docs/producto/mvp.md` y `docs/producto/avance.md`.
3. Construye una tabla: criterio, implementacion, prueba, comando ejecutado, resultado, revision.
4. Si falta cualquier evidencia obligatoria, declara `BLOQUEADO` y enumera exactamente que falta.
5. Si hay hallazgos bloqueantes, no aceptes el incremento.
6. Solo si todo cumple, actualiza `docs/producto/avance.md` con puntos aceptados y deja el incremento `ACEPTADO`.

No cierres criterios obligatorios como pospuestos. Una exclusion requiere cambio de alcance aprobado en `docs/producto/decisiones.md` y reflejado en el spec.
