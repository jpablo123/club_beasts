# INC-03 - Tareas

## Estado

Estado actual: **ACEPTADO** (2026-10-14). Historial: BLOQUEADO (2026-10-09) -> LISTO
(2026-10-10, puerta de entrada completa) -> RED (2026-10-13) -> GREEN + VERIFICADO +
REVISADO + ACEPTADO (2026-10-14). Pipeline final: API tsc 0/0 + vitest **471/471**,
Gherkin **126/126 x2** (guard actualizado 63->126), web tsc 0/0 + vitest **174/174** +
build PASS, Playwright **47/47 x2**, migraciones 8/0 sin drift, revision
`code-reviewer` **ACEPTA sin hallazgos bloqueantes** (REV-01..REV-05 no bloqueantes).
Certificacion de puntos: **+11** (HU-16 1 + bloque 4 10, reparto INC03-R05) en
`docs/producto/auditoria-puntos-inc00.md` seccion 9; total MVP 30 -> **41/100**.

Criterios: **40** (`INC03-VEN-01..05`, `INC03-POR-01..07`, `INC03-REC-01..10`,
`INC03-ING-01..11`, `INC03-RAP-01..07`); **0 bloqueados** (los 7 que dependian de PEND
quedaron OK con DEC-026..033).

## Backlog operativo

| # | Tarea | Criterios | Agente | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Spec de INC-03 (objetivo, alcance, criterios, contrato API, fixtures, evidencia, riesgos) | todos | acceptance-criteria-analyst | Alta | **Completada (2026-10-09)**: paquete `spec.md` + `tareas.md` + `evidencia.md`; 40 criterios |
| 2 | Resolver `INC03-PEND-01` y `INC03-PEND-02` (que bloquea VENCIDA y multi-servicio) y registrarlos en `docs/producto/decisiones.md` | `VEN-04` | Producto + Orquestador | **Critica** (bloquea LISTO) | **Completada (2026-10-10)**: DEC-026 (opcion B: login intacto; denegacion en portal+ingreso) y DEC-027 (opcion a: acceso al servicio vigente) |
| 3 | Resolver `INC03-PEND-03` (definicion de "alerta operativa no sensible") | `REC-05` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-10)**: DEC-028 (opcion a: derivadas de estado) |
| 4 | Resolver `INC03-PEND-04` (campo `Cliente.foto` si/no) | `REC-01` | Producto + database-admin | **Critica** (bloquea LISTO) | **Completada (2026-10-10)**: DEC-029 (opcion b: sin columna; `foto` siempre `null`) |
| 5 | Resolver `INC03-PEND-05` (estado general `SUSPENDIDO`/`RETIRADO` en el ingreso) | `ING-10` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-10)**: DEC-030 (opcion b: 403 `INGRESO_NO_PERMITIDO`) |
| 6 | Resolver `INC03-PEND-06` (`sedeId` obligatorio o sede por defecto en la creacion rapida) | `RAP-01` | Producto + Backend | **Critica** (bloquea LISTO) | **Completada (2026-10-10)**: DEC-031 (opcion b: default del token, minimo 4 campos) |
| 7 | Resolver `INC03-PEND-07` (campo `perfilPendiente` vs derivacion) | `RAP-02` | Producto + database-admin | **Critica** (bloquea LISTO) | **Completada (2026-10-10)**: DEC-032 (opcion a: campo nuevo) |
| 8 | Resolver `INC03-PEND-08` (condicion que limpia `perfilPendiente`) | `RAP-03` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-10)**: DEC-033 (opcion b: al tener `email`) |
| 9 | Ratificar el contrato del spec (paths, bodies, errores, orden de evaluacion, mensajes exactos) | todos | backend-developer | Alta (bloquea LISTO) | **Completada (2026-10-10)**: contrato verificado contra `src/`; ajustes en el spec (path `PATCH /clientes/:id`, mensajes exactos con tildes, orden de errores #4/#6, fuente unica de estado con `pausasActivas` exportado, regla de seleccion de vigencia GYM, modelo `Ingreso` con back-relations + indice); 8 incompatibilidades G14 documentadas; celdas PEND luego rellenadas con DEC-026..033 |
| 10 | Registrar las confirmaciones `CONF-01..06` y el reparto de no-duplicado HU-16 vs bloque 4 | `VEN-01..05` + reparto de puntos | Orquestador | Alta (bloquea LISTO) | **Completada (2026-10-10)**: secciones en `decisiones.md` (CONF ratificadas; no-duplicado: efecto -> HU-16, contrato/pintado -> bloque 4) |
| 11 | Pasar el incremento a **LISTO** (checklist completo) y habilitar el RED | todos | Orquestador | Alta | **Completada (2026-10-10)**: checklist del spec completa; `BLOQUEADO -> LISTO` |
| 12 | **RED** de API: integracion de `/portal/resumen`, `/recepcion/consulta`, `/recepcion/ingresos` (POST+GET), `/recepcion/clientes-rapidos`, guardas de vigencia y permisos (sin tocar `src/`) | `POR-*`, `REC-*`, `ING-*`, `RAP-*`, `VEN-01..05` | test-engineer | Alta | **Completada (2026-10-13)**: 5 archivos, 92 tests; base 379 verde; 86 en rojo granular; grep confirma rutas inexistentes |
| 13 | **RED** de UI: unit tests del portal con datos reales y de la pantalla de recepcion (consulta, ingreso, alta rapida) | `POR-*`, `REC-*`, `ING-*`, `RAP-*`, `VEN-03` | test-engineer | Alta | **Completada (2026-10-13)**: 4 archivos, 26 tests; base 148 verde; 26 en rojo; contratos de UI (aria-labels/botones) fijados en las cabeceras |
| 14 | Escenarios **Gherkin** nuevos (`features/*.feature` + `features/steps/*`) para vencimiento, portal, recepcion e ingreso; mantener el guard `test:gherkin` en verde | `VEN-*`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | test-engineer | Alta | **Completada (2026-10-13)**: 5 features + 7 steps, 63 escenarios nuevos en rojo, base 63 verde; traducciones G14 aplicadas; al consolidar GREEN actualizar guard a 126 (GAP-RED-03) |
| 15 | Migracion Prisma: entidad `Ingreso` + `Cliente.perfilPendiente` (**sin `foto`**: DEC-029) + fixtures/seed (F1..F14) | `ING-*`, `RAP-01/02` | database-admin | Alta | **Completada (2026-10-13)**: migracion `20261013220244` (CREATE TABLE + ADD COLUMN portable), 7/0, sin drift, seed sin cambios; **enmienda pendiente**: `User.sedeId` (GAP-RED-01, DEC-031) |
| 15b | Enmienda de modelo: `User.sedeId` (default de sede del recepcionista, DEC-031) + backfill del RECEPCIONISTA en el seed | `RAP-01` | database-admin | Alta | **Completada (2026-10-13/14)**: migracion `20261013224545_add_user_sede`, backfill en `prisma/seed.ts` y fixture E2E `start-api-e2e.mjs` (GAP-RED-01 cerrado) |
| 16 | **GREEN** API: `routes/recepcion.ts` (consulta, ingresos, clientes-rapidos), `routes/portal.ts` (o equivalente), schemas Zod reutilizando los `HU-XX-schemas.ts` | `POR-*`, `REC-*`, `ING-*`, `RAP-*` | backend-developer | Alta | **Completada (2026-10-14)**: rutas/schemas nuevos; fix del select del PATCH (`selectClienteUpdate` con `creadoPor`+`perfilPendiente`, GAP-RED-04 cerrado); vitest 471/471 |
| 17 | **GREEN** API de vencimiento: fuente unica de estado (exportar `pausasActivas`, corregir `cliente.service.ts:144-149`); **#7 login sin modificacion** (DEC-026) | `VEN-01..05` | backend-developer | Alta | **Completada (2026-10-14)**: fuente unica `resolverEstadoAcceso`; `auth.*` intacto; VEN-05 verificado (mismo estado en ficha/listado/portal/recepcion) |
| 18 | **GREEN** UI: portal con estado real (eliminar `portal/page.tsx:122`) y pantalla de recepcion (consulta por cedula, registrar ingreso, creacion rapida, marca de perfil pendiente) | `VEN-03`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | frontend-developer | Alta | **Completada (2026-10-14)**: portal con estado real + `src/app/recepcion/*` + `EstadoAccesoBadge`; tipado del `fetchApi<T>` (0 errores tsc; 174/174; build PASS) |
| 19 | **VERIFICADO**: E2E real de portal y recepcion, bateria completa (API + web + Playwright) y registro en `evidencia.md` | todos | test-engineer | Alta | **Completada (2026-10-14)**: specs `recepcion.spec.ts` (5), `recepcion-creacion-rapida.spec.ts` (4), `acceso-vencimiento.spec.ts` (3), `portal.spec.ts` extendido (+5); Playwright 47/47 x2; evidencia secciones 1/4/5 registradas; Gherkin 126/126 x2 |
| 20 | **Revision**: seguridad/permisos, DEC-005/006/017/025, no duplicado de puntos, pruebas sin aserciones vacias | todos | code-reviewer | Alta | **Completada (2026-10-14)**: **ACEPTA sin hallazgos bloqueantes**; REV-01 (MEDIO) y REV-02..05 (BAJO/SUG) pasados a backlog; dictamen en `evidencia.md` seccion 6 |
| 21 | Actualizar `docs/producto/avance.md`, `docs/producto/mvp.md` y `docs/producto/auditoria-puntos-inc00.md` con los puntos aceptados (+11 max., solo si la revision no bloquea) | HU-16 + HU-25/29/30/31 | Orquestador (delivery-orchestrator) | Alta | **Completada (2026-10-14)**: **+11 certificados** (HU-16 4/4 = 1; bloque 4 = 10 con reparto INC03-R05: HU-25 3 + HU-29 3 + HU-30 3 + HU-31 1); total **41/100** |

## Orden recomendado

1. #1 (este paquete) -> #2..#8 (decisiones de Producto) -> #9 (ratificacion de contrato) ->
   #10 -> #11: **puerta LISTO**.
2. #12 y #13 en paralelo (RED), #14 en paralelo con ellos.
3. #15 -> #16 -> #17 -> #18 (orden por dependencia de datos).
4. #19 -> #20 -> #21.

Ninguna tarea de RED/GREEN arranca antes de #11: la puerta es un gate unico (los 7 criterios
bloqueados comparten spec con los 33 no bloqueados).

## Archivos permitidos por agente

- `acceptance-criteria-analyst`: solo `docs/incrementos/INC-03-*/` (este paquete). **No** toca
  `features/acceptance-criteria/HU-XX-*` (se reusan tal cual), `features/*.feature` ni `steps/`.
- `test-engineer`: `club-beasts-api/tests/integration/*.test.ts` (nuevos), tests unit/UI de
  `club-beasts-web/tests/unit*`, `club-beasts-api/features/*.feature` y `features/steps/*`,
  `club-beasts-web/tests/e2e/*.spec.ts` (nuevos), `docs/incrementos/INC-03-*/evidencia.md`.
- `database-admin`: `club-beasts-api/prisma/schema.prisma`, migracion nueva, seed/fixtures.
- `backend-developer`: `club-beasts-api/src/routes/` (nuevos `recepcion.ts`/`portal.ts` y
  ajustes puntuales en `clientes.ts`, `auth.ts`), `src/services/` (`membresia.service.ts`,
  `cliente.service.ts`, `auth.service.ts` solo si `PEND-01` lo exige), `src/schemas/`.
- `frontend-developer`: `club-beasts-web/src/app/portal/page.tsx`, paginas nuevas
  `src/app/recepcion/*`, componentes nuevos, `src/lib/api.ts`.
- `code-reviewer`: solo lectura + `docs/incrementos/INC-03-*/evidencia.md` (seccion de
  revision).
- `Orquestador`: `docs/producto/*` (fuera de este paquete: lo hace el orquestador, no este
  agente).

## Fuera de este incremento (no tocar)

- Anamnesis (HU-09/10/11/28, PEND-003/DEC-021), rutinas (HU-18..21/26), nutricion
  (HU-22..24/27), reportes/historial/notificaciones (HU-32/33/34).
- Congelacion (INC-02 cerrado; aqui solo se lee `CONGELADO` y el rango).
- HU-08/HU-17 (INC-04) salvo la pregunta puntual `PEND-05`; HU-13/HU-14 (INC-05).
- Riesgos globales R-01/R-02/R-06/R-09/R-10 (backlog aparte).

## Riesgos de gestion del incremento

| Riesgo | Mitigacion |
|---|---|
\| 8 decisiones de Producto abiertas al mismo tiempo | Resolverlas en una sola pasada (una reunion/una entrada en `decisiones.md`), con las opciones ya formuladas en `spec.md` |
| Alcance amplio (5 HU, 40 criterios, 2 paquetes API nuevos) | Orden fijado; no abrir critico en `PEND-03` opcion (b) sin aprobacion explicita de alcance |
| Regresion de la fuente de estado en la ficha (INC-00/01/02 aceptados) | RED primero + bateria completa antes/despues del GREEN |
| Reparto de los 10 puntos del bloque 4 sin ponderar por HU | Fijar el reparto con el orquestador antes de certificar (INC03-R05) |
