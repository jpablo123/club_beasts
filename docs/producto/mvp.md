# MVP Club Beasts - Matriz de Alcance y Ponderacion

Este documento es la fuente de verdad para medir avance del MVP. Los porcentajes de `fase1.md` y `fase2.md` son referencias historicas; el avance aceptado se calcula solo con criterios verificados en esta matriz.

## Regla de medicion

```text
avance aceptado = puntos aceptados / 100
```

Un punto solo cuenta cuando su criterio tiene:

- Especificacion clara.
- Implementacion en API y/o frontend segun corresponda.
- Prueba automatizada relevante.
- Evidencia de ejecucion.
- Revision sin hallazgos bloqueantes.

La existencia de codigo, pantallas o tests no equivale a aceptacion.

## Bloques del MVP

Puntos aceptados certificados el 2026-10-06 tras el cierre de `INC-00-estabilizacion-fases-1-2`. Desglose por HU, ponderacion y evidencia: `docs/producto/auditoria-puntos-inc00.md`.

Ampliacion 2026-10-07: cierre de `INC-01-cierre-gaps-bloque-1-2` (+3 puntos: HU-01 4/4, HU-04 4/4, HU-05 4/4) con evidencia en `docs/incrementos/INC-01-cierre-gaps-bloque-1-2/evidencia.md` (RED/GREEN, bateria 252+118+25+63, revision 5/5 ACEPTA sin bloqueantes) y trazabilidad en la seccion 7 de `docs/producto/auditoria-puntos-inc00.md`.

Ampliacion 2026-10-08: cierre de `INC-02-congelacion-hu-15` (+3.5 puntos: HU-15 4/4 con b1 enmendado por DEC-023, HU-12 4/4 con el bullet de estado congelado) con evidencia en `docs/incrementos/INC-02-congelacion-hu-15/evidencia.md` (RED 121/127, GREEN 379/379 + 147/147, E2E 30/30 x2, revision `code-reviewer` sin hallazgos bloqueantes) y trazabilidad en la seccion 8 de `docs/producto/auditoria-puntos-inc00.md`.

| Bloque | Peso | HU relacionadas | Estado actual |
|---|---:|---|---|
| Identidad, sesiones y permisos | 10 | HU-01, HU-02, HU-03 | **10/10 aceptado**: HU-01 4/4 (guard de rol en UI cubierto por E2E `acceso-roles.spec.ts`, INC-01), HU-02 4/4, HU-03 4/4 |
| Clientes, sedes, estados y ficha basica | 15 | HU-04, HU-05, HU-06, HU-07, HU-08, HU-17 | **12/15 aceptado**: HU-04 4/4 y HU-05 4/4 (trazabilidad asertada en respuesta y BD, INC-01), HU-06 4/4, HU-07 3/6 (transversal), HU-08 0, HU-17 0 |
| Vigencias de servicios y congelacion | 15 | HU-12, HU-13, HU-14, HU-15, HU-16 | **8/15 aceptado**: HU-12 4/4 (INC-02 cerro el bullet "muestra ... congelada" con estado `CONGELADO` en API/UI), HU-15 4/4 (INC-02, b1 con alcance enmendado DEC-023), HU-13 0, HU-14 0, HU-16 0 |
| Recepcion, ingresos y portal operativo | 10 | HU-25, HU-29, HU-30, HU-31 | **0/10**: sin codigo en las cuatro HU |
| Anamnesis y privacidad | 12 | HU-09, HU-10, HU-11, HU-28 | Pendiente |
| Rutinas, asignacion e historial | 18 | HU-18, HU-19, HU-20, HU-21, HU-26 | Pendiente |
| Nutricion, asignacion e historial | 12 | HU-22, HU-23, HU-24, HU-27 | Pendiente |
| Historial, reportes y notificaciones | 8 | HU-32, HU-33, HU-34 | Pendiente |
| **Total** | **100** | HU-01 a HU-34 | **30 puntos aceptados (30%)** |

## Corte objetivo del 50%

El corte recomendado para llegar a 50 puntos prioriza operacion diaria completa antes de seguimiento deportivo avanzado:

| Orden | Bloque / incremento | Puntos acumulables | Resultado esperado |
|---:|---|---:|---|
| 0 | Estabilizacion fases 1 y 2 | 0 | Cerrar deuda de seguridad, pruebas y evidencia de lo ya construido |
| 1 | Identidad, sesiones y permisos | 10 | Tres roles autenticados, permisos correctos y recuperacion segura de sesion |
| 2 | Clientes, sedes, estados y ficha basica | 15 | CRUD, busqueda, filtros, estado general, ficha basica y trazabilidad |
| 3 | Vigencias de servicios y congelacion | 15 | Membresia gym, personalizado y nutricion con renovacion, congelacion y concurrencia |
| 4 | Recepcion, ingresos y portal operativo | 10 | Consulta por cedula, elegibilidad, ingreso por sede y portal con estado real |
| | **Total corte 50%** | **50** | Operacion basica utilizable de punta a punta |

## Notas de alcance

- HU-13 y HU-14 no se aceptan completas solo por registrar vigencias. Sus reglas sobre rutina personalizada activa y plan nutricional activo se aceptan cuando existan las asignaciones correspondientes.
- HU-07 es transversal. La ficha puede sumar puntos parciales en el bloque de clientes, pero no queda completa hasta mostrar vigencias, rutina, plan, anamnesis, notas e historial.
- HU-16 requiere que el vencimiento afecte la recepcion, el portal y el acceso al servicio; no basta con calcular una etiqueta visual.
- HU-32 no se reemplaza con auditoria tecnica de membresias. Debe existir historial de negocio visible para el usuario autorizado.

## Criterios de salida globales

- API y web compilan sin errores.
- Las rutas criticas tienen pruebas de integracion.
- Los flujos criticos tienen E2E reales, sin aserciones vacias ni pasos opcionales.
- Las pruebas usan datos aislados y deterministas.
- Los permisos se prueban por rol y por propiedad del recurso.
- Las reglas con concurrencia tienen pruebas especificas.
- La documentacion de avance coincide con la evidencia ejecutada.
