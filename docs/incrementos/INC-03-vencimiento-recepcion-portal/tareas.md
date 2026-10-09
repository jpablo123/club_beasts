# INC-03 - Tareas

## Estado

Estado actual: **BLOQUEADO** (2026-10-09). Spec, criterios y plantilla de evidencia listos;
el incremento no entra en ejecucion hasta resolver `INC03-PEND-01..08` (Producto) y ratificar
el contrato (backend-developer), segun el checklist de la puerta LISTO de `spec.md`.

Criterios: **40** (`INC03-VEN-01..05`, `INC03-POR-01..07`, `INC03-REC-01..10`,
`INC03-ING-01..11`, `INC03-RAP-01..07`); **7 bloqueados** por decision de Producto
(`VEN-04`, `REC-01`, `REC-05`, `ING-10`, `RAP-01`, `RAP-02`, `RAP-03`).

## Backlog operativo

| # | Tarea | Criterios | Agente | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Spec de INC-03 (objetivo, alcance, criterios, contrato API, fixtures, evidencia, riesgos) | todos | acceptance-criteria-analyst | Alta | **Completada (2026-10-09)**: paquete `spec.md` + `tareas.md` + `evidencia.md`; 40 criterios |
| 2 | Resolver `INC03-PEND-01` y `INC03-PEND-02` (que bloquea VENCIDA y multi-servicio) y registrarlos en `docs/producto/decisiones.md` | `VEN-04` | Producto + Orquestador | **Critica** (bloquea LISTO) | Pendiente |
| 3 | Resolver `INC03-PEND-03` (definicion de "alerta operativa no sensible") | `REC-05` | Producto | **Critica** (bloquea LISTO) | Pendiente |
| 4 | Resolver `INC03-PEND-04` (campo `Cliente.foto` si/no) | `REC-01` | Producto + database-admin | **Critica** (bloquea LISTO) | Pendiente |
| 5 | Resolver `INC03-PEND-05` (estado general `SUSPENDIDO`/`RETIRADO` en el ingreso) | `ING-10` | Producto | **Critica** (bloquea LISTO) | Pendiente |
| 6 | Resolver `INC03-PEND-06` (`sedeId` obligatorio o sede por defecto en la creacion rapida) | `RAP-01` | Producto + Backend | **Critica** (bloquea LISTO) | Pendiente |
| 7 | Resolver `INC03-PEND-07` (campo `perfilPendiente` vs derivacion) | `RAP-02` | Producto + database-admin | **Critica** (bloquea LISTO) | Pendiente |
| 8 | Resolver `INC03-PEND-08` (condicion que limpia `perfilPendiente`) | `RAP-03` | Producto | **Critica** (bloquea LISTO) | Pendiente |
| 9 | Ratificar el contrato del spec (paths, bodies, errores, orden de evaluacion, mensajes exactos) | todos | backend-developer | Alta (bloquea LISTO) | Pendiente |
| 10 | Registrar las confirmaciones `CONF-01..06` y el reparto de no-duplicado HU-16 vs bloque 4 | `VEN-01..05` + reparto de puntos | Orquestador | Alta (bloquea LISTO) | Pendiente |
| 11 | Pasar el incremento a **LISTO** (checklist completo) y habilitar el RED | todos | Orquestador | Alta | Pendiente |
| 12 | **RED** de API: integracion de `/portal/resumen`, `/recepcion/consulta`, `/recepcion/ingresos` (POST+GET), `/recepcion/clientes-rapidos`, guardas de vigencia y permisos (sin tocar `src/`) | `POR-*`, `REC-*`, `ING-*`, `RAP-*`, `VEN-01..05` | test-engineer | Alta | Pendiente |
| 13 | **RED** de UI: unit tests del portal con datos reales y de la pantalla de recepcion (consulta, ingreso, alta rapida) | `POR-*`, `REC-*`, `ING-*`, `RAP-*`, `VEN-03` | test-engineer | Alta | Pendiente |
| 14 | Escenarios **Gherkin** nuevos (`features/*.feature` + `features/steps/*`) para vencimiento, portal, recepcion e ingreso; mantener el guard `test:gherkin` en verde | `VEN-*`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | test-engineer | Alta | Pendiente |
| 15 | Migracion Prisma: entidad `Ingreso` + `Cliente.perfilPendiente` (+ `Cliente.foto` si `PEND-04` = si) + fixtures/seed (F1..F14) | `ING-*`, `RAP-01/02` | database-admin | Alta | Pendiente |
| 16 | **GREEN** API: `routes/recepcion.ts` (consulta, ingresos, clientes-rapidos), `routes/portal.ts` (o equivalente), schemas Zod reutilizando los `HU-XX-schemas.ts` | `POR-*`, `REC-*`, `ING-*`, `RAP-*` | backend-developer | Alta | Pendiente |
| 17 | **GREEN** API de vencimiento: fuente unica de estado (exportar `pausasActivas`, corregir `cliente.service.ts:144-149`) y guardas de acceso si `PEND-01` lo exige | `VEN-01..05` | backend-developer | Alta | Pendiente |
| 18 | **GREEN** UI: portal con estado real (eliminar `portal/page.tsx:122`) y pantalla de recepcion (consulta por cedula, registrar ingreso, creacion rapida, marca de perfil pendiente) | `VEN-03`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | frontend-developer | Alta | Pendiente |
| 19 | **VERIFICADO**: E2E real de portal y recepcion, bateria completa (API + web + Playwright) y registro en `evidencia.md` | todos | test-engineer | Alta | Pendiente |
| 20 | **Revision**: seguridad/permisos, DEC-005/006/017/025, no duplicado de puntos, pruebas sin aserciones vacias | todos | code-reviewer | Alta | Pendiente |
| 21 | Actualizar `docs/producto/avance.md`, `docs/producto/mvp.md` y `docs/producto/auditoria-puntos-inc00.md` con los puntos aceptados (+11 max., solo si la revision no bloquea) | HU-16 + HU-25/29/30/31 | Orquestador (delivery-orchestrator) | Alta | Pendiente |

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
