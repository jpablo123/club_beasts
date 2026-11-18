# INC-12 - Nutricion, asignacion e historial - Spec

Estado: **PROPUESTO** (2026-11-18). Abierto tras el cierre de INC-11 (79/100).

## Objetivo

Cerrar el bloque 7 del MVP (12 puntos): creacion de plan nutricional estructurado, asignacion activa con gate de vigencia del servicio de nutricion, historial de planes y visualizacion en el portal del cliente. Analogia directa con INC-10 (rutinas): reutilizar el patron asignacion/historial/snapshot/portal.

## Historias cubiertas

- **HU-22** Creacion de plan nutricional estructurado (Prioridad Alta) — 5 bullets.
- **HU-23** Asignacion de plan nutricional activo (Prioridad Alta) — 4 bullets.
- **HU-24** Historial de planes nutricionales (Prioridad Media) — 4 bullets.
- **HU-27** Visualizacion del plan nutricional activo en portal (Prioridad Alta) — 4 bullets.

Total: 17 bullets (analogia con INC-10's 16 + portal).

## Peso del bloque

12 puntos (mvp.md bloque 7). Reparto por DEC-016 a definir al cierre en `auditoria-puntos-inc00.md` §14 (analogia §13).

## Decisiones pendientes (PEND-NUT)

A resolver por Producto antes de LISTO (analogia PEND-RUT):

- **PEND-NUT-01** Estructura del plan: campos biometricos (peso, talla, % grasa, etc.) y objetivos caloricos — fijos o libres.
- **PEND-NUT-02** Macros: distribucion de macronutrientes como texto/numero manual (no se calculan automaticamente, HU-22 c5) — formato exacto.
- **PEND-NUT-03** Tiempos de comida: estructura (desayuno/almuerzo/... con alimentos y cantidades) — fija o libre.
- **PEND-NUT-04** Recomendaciones y suplementacion: texto libre o estructurado.
- **PEND-NUT-05** Gate de vigencia: solo servicio de nutricion en estado ACTIVA permite activar plan (analogia DEC-066); si vence despues, el plan queda intacto y el portal lo oculta (analogia INC05-PER-05).
- **PEND-NUT-06** Permisos: solo DUENO crea/edita/asigna (analogia DEC-065); RECEPCIONISTA solo lectura; CLIENTE solo lectura de la suya.
- **PEND-NUT-07** Portal: visualizacion completa solo lectura (analogia DEC-068); nunca actor.
- **PEND-NUT-08** Literales y paths del contrato (analogia DEC-070).

## Criterios NU-xx mapeados (HU-22/HU-23/HU-24/HU-27)

Fuente canónica: `club-beasts-api/features/acceptance-criteria/HU-{22,23,24,27}-criterios-aceptacion.md` y sus schemas.

- HU-22: NU-01..NU-08 (creación estructurada, validación, macros manuales, tiempos, recomendaciones, no-cálculo, permisos, recurso/contrato).
- HU-23: NU-20..NU-28 (asignación exitosa, reemplazo, recursos, gate de vigencia, visibilidad REF, cliente inactivo, permisos, mismo plan).
- HU-24: NU-29..NU-35 (fechas, actor, cierre, lectura staff, snapshot, permisos, inmutabilidad).
- HU-27: NU-36..NU-42 (solo su plan, gate, contenido, mensaje, oculto por vigencia, solo lectura, permisos/aislamiento).

## Contratos R1-R8 / C1-C9 (analogia INC-10, a ratificar)

- R1: una sola plan activo por cliente (invariante 0-1; reemplazo cierra el anterior con `fechaFin` = inicio de la nueva).
- R2: gate de vigencia al momento del cambio — solo servicio de nutricion `ACTIVA` permite asignar (409 `SIN_VIGENCIA_NUTRICION`); si vence después, asignación intacta y portal oculta (patrón INC05-PER-05); sin jobs/cron.
- R3: edición por secciones (presente = reemplaza, ausente = conserva) en PATCH de plan.
- R4: permisos — solo DUENO crea/edita/asigna; RECEPCIONISTA solo lectura; CLIENTE solo lectura de la suya (analogia DEC-065).
- R5: snapshot del contenido al asignar (DEC-067 analogo); historial inmutable.
- R6: portal solo lectura, nunca actor (DEC-068 analogo); marcadores `SIN_PLAN` vs `OCULTA_POR_VIGENCIA`.
- R7: cliente sin estado activo (SUSPENDIDO/RETIRADO/INACTIVO) → 409 `CLIENTE_INACTIVO` (analogia DEC-069).
- R8: orden de guardas del endpoint de asignación: 401 → 403 → 400 params/body → 404 → 409 CLIENTE_INACTIVO → 409 SIN_VIGENCIA_NUTRICION → 409 PLAN_YA_ACTIVO → 201.

C1-C9 (contrato HTTP, a ratificar por backend-developer):
- C1: paths sin prefijo `/api` (analogia DEC-070).
- C2: código de vigencia `SIN_VIGENCIA_NUTRICION` (mensaje exacto de `HU-23-schemas.ts`).
- C3: códigos `CLIENTE_NO_ENCONTRADO`, `PLAN_NO_ENCONTRADO`, `PLAN_YA_ACTIVO`, `ASIGNACION_CONFLICTO` (concurrencia).
- C4: marcadores de lectura `SIN_PLAN` vs `OCULTA_POR_VIGENCIA` (staff con estado discriminado) y `SIN_PLAN_MENSAJE` = "No tienes un plan nutricional activo" (portal).
- C5: path de asignación `POST /clientes/:clienteId/planes-nutricionales/asignacion`.
- C6: creación separada `POST /planes-nutricionales` + `PATCH /planes-nutricionales/:id`.
- C7: historial `GET /clientes/:clienteId/planes-nutricionales/historial` y activa `GET .../activa`.
- C8: portal `GET /portal/plan-nutricional` (solo lectura, gate por servicio vigente).
- C9: no se recibe `fechaFin`/`estado`/`actor` en el body (los setea el sistema).

## Contrato API (a ratificar)

Analogia con INC-10:
- `POST /planes-nutricionales` (creacion estructurada)
- `GET /planes-nutricionales`, `GET /planes-nutricionales/:id`
- `PATCH /planes-nutricionales/:id` (edicion por secciones)
- `POST /clientes/:clienteId/planes-nutricionales/asignacion` (asignacion, invariante 0-1 activos, gate de vigencia)
- `GET /clientes/:clienteId/planes-nutricionales/activa`
- `GET /clientes/:clienteId/planes-nutricionales/historial`
- `GET /portal/plan-nutricional` (solo lectura, gate por servicio vigente)

## Modelo de datos (a definir por database-admin)

Analogia con INC-10: `PlanNutricional` + `PlanNutricionalAsignacion` (snapshot del contenido al asignar, fechas inicio/fin, actor). Migracion nueva.

## Navegacion

Aplicabilidad: **SI** (nuevas pantallas `/nutricion`, `/nutricion/nueva`, `/nutricion/:id`, `/nutricion/:id/editar`, `/portal/plan-nutricional`, seccion historial en ficha). Se requiere matriz NAV-NUT-01..NN por rol antes de LISTO (analogia NAV-RU).

## No-goals

- No calcular macros automaticamente (HU-22 c5).
- No historial versionado del plan (block 8 HU-32).
- No cambios a INC-10/INC-11 cerrados salvo endpoints de ficha ya existentes.

## Puntos

12 (0 hasta evidencia + revision + aceptacion).

## Cierre de HU-07 b5/b6

Los endpoints `/clientes/:id/rutinas/{activa,historial}` (INC-10 C9) ya existen; el cierre de HU-07 b5/b6 (rutina activa + historial en ficha) se acredita como **+1 punto en bloque 2** al final de INC-12 o en un incremento de cierre, sin duplicar con bloque 6 (INC10-R01 / INC10-R02).