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

Ampliacion 2026-10-14: cierre de `INC-03-vencimiento-recepcion-portal` (+11 puntos: HU-16 4/4 = 1; bloque 4 completo 10/10 con reparto INC03-R05: HU-25 3 + HU-29 3 + HU-30 3 + HU-31 1) con evidencia en `docs/incrementos/INC-03-vencimiento-recepcion-portal/evidencia.md` (RED 2026-10-13, GREEN 471/471 + Gherkin 126/126 x2 + web 174/174 + E2E 47/47 x2, revision `code-reviewer` sin hallazgos bloqueantes) y trazabilidad en la seccion 9 de `docs/producto/auditoria-puntos-inc00.md` (incluye el no-duplicado del efecto vencido -> solo HU-16).

Ampliacion 2026-10-19: cierre de `INC-04-estados-cliente` (+2 puntos: HU-08 4/4 y HU-17 3/3, bloque 2 a **14/15**) con evidencia en `docs/incrementos/INC-04-estados-cliente/evidencia.md` (RED 43 API + 18 Gherkin + 6 web en rojo; GREEN `c59179e`; verificacion API 536/536 + Gherkin 153/153 + web 183/183 + build PASS + migraciones 9/0 + E2E 56/56 x2; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes) y trazabilidad en la seccion 10 de `docs/producto/auditoria-puntos-inc00.md` (incluye el no-duplicado: estado/filtro -> HU-05/HU-06, rama SUSPENDIDO/RETIRADO -> HU-30).

Ampliacion 2026-11-05: cierre de `INC-09-anamnesis-deportiva` (**+12 puntos: bloque 5 completo** â€” HU-09 4/4, HU-10 4/4, HU-11 3/3 = 2, HU-28 3/3 = 2) con evidencia en `docs/incrementos/INC-09-anamnesis-deportiva/evidencia.md` (RED 250 pruebas + 4 enmiendas C4; GREEN T8 modelo `Anamnesis` 1:1 migracion 10/0 + T9 API 807/807 + T10 web/E2E; bateria x2 identica API 807/807 + Gherkin 220/220 + web 303/303 + E2E 135/135; auditoria NAV-AN-01..09 VERIFICADO con NAV-F-01..06 cerrados; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 7/7 CONFORME; bateria final **143/143** tras INC09-FIX-04) y trazabilidad en la **seccion 12** de `docs/producto/auditoria-puntos-inc00.md` (no-duplicado: campos 1-10 snapshot sin puntos de HU-04/05, HU-07 b4 sin puntos, DEC-060 sin bullet). Decisiones del ciclo: DEC-052+Anexo (23 campos del formulario real), DEC-055 (5 sensibles con RH), DEC-056/056a (snapshot + pre-llenado 1,2,9,10), DEC-057 (1 por cliente), DEC-058 (solo DUENO escribe), DEC-059 (regex/limites), DEC-060 (gate por servicio vigente), DEC-061 (limite AN-26 al vaciar un solo campo). **Corte objetivo del 50% SUPERADO (61/100)**.

Ampliacion 2026-11-18: cierre de `INC-10-rutinas` (**+18 puntos: bloque 6 completo** â€” HU-18 4/4, HU-19 5/5, HU-20 4/4, HU-21 3/3, HU-26 2/2; HU-13 b4 cerrada **+0** por split INC10-R01) con evidencia en `docs/incrementos/INC-10-rutinas/evidencia.md` (RED 268 pruebas; GREEN T6 modelo + migracion 11/0 + T7 API + T8 web; FIX-01..06; verificacion final INC10-VER-FINAL API 1034/1034 + Gherkin 220/220 + web 401/401 + build PASS + E2E **213/213** + invert 143/143 + PIN 3/3; auditoria NAV-RU-01..24 **24 plenos / 0 fallidas**; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, REV-01..11) y trazabilidad en la **seccion 13** de `docs/producto/auditoria-puntos-inc00.md` (no-duplicado: RU-05/18/25 REF sin punto, HU-07 b5/b6 anotados para su cierre, DEC-018 cobrado en HU-19 b2). Decisiones del ciclo: DEC-062..070 + Anexo DEC-052. **Total actual: 79/100 (79%)**.

| Bloque | Peso | HU relacionadas | Estado actual |
|---|---:|---|---|
| Identidad, sesiones y permisos | 10 | HU-01, HU-02, HU-03 | **10/10 aceptado**: HU-01 4/4 (guard de rol en UI cubierto por E2E `acceso-roles.spec.ts`, INC-01), HU-02 4/4, HU-03 4/4 |
| Clientes, sedes, estados y ficha basica | 15 | HU-04, HU-05, HU-06, HU-07, HU-08, HU-17 | **14/15 aceptado**: HU-04 4/4 y HU-05 4/4 (trazabilidad asertada en respuesta y BD, INC-01), HU-06 4/4, HU-07 3/6 (transversal), HU-08 4/4 (INC-04: motivo+actor+historial, bloqueo INACTIVO y reactivacion), HU-17 3/3 (INC-04: motivo obligatorio, historial acumulable y matriz de transiciones) |
| Vigencias de servicios y congelacion | 15 | HU-12, HU-13, HU-14, HU-15, HU-16 | **15/15 aceptado**: HU-12 4/4, HU-15 4/4 (INC-02; DEC-042 enmendada: los 3 tipos congelables), HU-16 4/4 (INC-03: vencimiento con efecto observable en portal, recepcion y acceso; efecto cobrado una sola vez), HU-13 4/4 y HU-14 3/3 (INC-05: vigencias de personalizado/nutricion con estados calculados, congelacion y visibilidad en listado/ficha; HU-13 b4 de asignaciones **cerrada en INC-10 sin puntos nuevos** â€” split explicito INC10-R01, peso 3 ya al maximo) |
| Recepcion, ingresos y portal operativo | 10 | HU-25, HU-29, HU-30, HU-31 | **10/10 aceptado (INC-03)**: HU-25 4/4 (portal con estado real), HU-29 5/5 (consulta por cedula con alertas derivadas de estado, DEC-028), HU-30 4/4 (ingresos por sede con guardas de vigencia), HU-31 3/3 (creacion rapida con `perfilPendiente`); reparto INC03-R05 en auditoria seccion 9 |
| Anamnesis y privacidad | 12 | HU-09, HU-10, HU-11, HU-28 | **12/12 aceptado (INC-09, 2026-11-05)**: HU-09 4/4 (registro 23 campos/4 secciones, trazabilidad), HU-10 4/4 (permisos por rol, 5 sensibles DEC-055 filtrados en API, privacidad), HU-11 3/3 (guardado parcial, PENDIENTE/COMPLETA derivado), HU-28 3/3 (portal `/portal/anamnesis` solo lectura, gate DEC-060); HU-07 b4 sin puntos (no-duplicado) |
| Rutinas, asignacion e historial | 18 | HU-18, HU-19, HU-20, HU-21, HU-26 | **18/18 aceptado (INC-10, 2026-11-18)**: HU-18 4/4 (tipo generica/induccion, estructura, reutilizacion; b4 REF sin punto), HU-19 5/5 (info+diagnostico, arbol macro/meso/micro DEC-018, series/intensidades, evaluaciones), HU-20 4/4 (una sola activa, tipos, gate de vigencia RU-23, b4 REF sin punto), HU-21 3/3 (fechas, actor, cierre de la anterior, historial en ficha), HU-26 2/2 (portal solo lectura, version vigente, no-edicion); reparto INC10-R01 en auditoria seccion 13 |
| Nutricion, asignacion e historial | 12 | HU-22, HU-23, HU-24, HU-27 | **12/12 aceptado (INC-12, 2026-11-18)**: HU-22 4/4 (biometricos/objetivos fijos, macros manuales, comidas estructuradas, recomendaciones, no calculo), HU-23 4/4 (un solo activo, gate DEC-079, visible portal, sin nutricion informa sin plan), HU-24 2/2 (fechas, actor, cierre anterior, historial ficha), HU-27 2/2 (portal solo lectura, alimentos/cantidades/recomendaciones, mensaje claro, no-edicion); reparto INC12 en auditoria seccion 14; frontend parcial (solo portal) y E2E NAV-NUT NO VERIFICADO como residual |
| Historial, reportes y notificaciones | 8 | HU-32, HU-33, HU-34 | Pendiente |
| **Total** | **100** | HU-01 a HU-34 | **100 puntos aceptados (100%)** |

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
Ampliacion 2026-11-18 (2): cierre de INC-11-ux-anamnesis (0 puntos). Total sigue 79/100.

Ampliacion 2026-11-18 (3): cierre de INC-12-nutricion (+12 puntos, bloque 7 completo). Total actual: 91/100 (91%).

