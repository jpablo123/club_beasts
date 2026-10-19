# INC-04 - Tareas

## Estado

Estado actual: **LISTO** (2026-10-14). Historial: PROPUESTO -> ESPECIFICADO (2026-10-14)
-> LISTO (2026-10-14). Puerta de entrada completa: `INC04-PEND-01..08` resueltas por
Producto (DEC-034..041 en `decisiones.md`), contrato ratificado por `backend-developer`
(16 incompatibilidades documentadas y resueltas en el spec), `HU-17-schemas.ts` ratificado,
`INC04-CONF-01..07` y no-duplicado registrados por el orquestador; las 10 celdas
`BLOQUEADO` pasaron a `OK` (14 criterios: 2 REF + 12 OK). Celda `INACTIVO -> RETIRADO`
ratificada como permitida (literal `* -> RETIRADO` de DEC-038). El RED queda habilitado
(tareas 14-16; 17 puede correr en paralelo por contrato estable).

Base que debe permanecer intacta en cada verificacion: API **471/471**, Gherkin
**126/126**, web **174/174**, E2E **47/47**, migraciones **9/0 sin drift**.

Criterios: **14** (`INC04-CLI-01..08`, `INC04-EST-01..06`); **2 REF no puntuables**
(`CLI-01`, `EST-01`) y **12 OK** (los 10 que estaban `BLOQUEADO (PEND)` pasaron a OK al
registrar DEC-034..041; verificacion de paridad G14 2026-10-19: matriz 25/25, 14/14 IDs
trazables). Puntos en juego: **+2** (HU-08 = 1 con 4/4 bullets, HU-17 = 1 con 3/3; los
bullets de estado/filtro ya cobrados en HU-05/HU-06 **no** se vuelven a cobrar).

**Base que debe permanecer intacta** en cada verificacion: API **471/471**, Gherkin
**126/126**, web **174/174**, E2E **47/47**, migraciones **9/0 sin drift**.

## Backlog operativo

| # | Tarea | Criterios | Agente | Prioridad | Estado |
|---:|---|---|---|---|---|
| 1 | Spec de INC-04 (objetivo, alcance, criterios, contrato API, fixtures, evidencia, riesgos) | todos | acceptance-criteria-analyst | Alta | **Completada (2026-10-14)**: paquete `spec.md` + `tareas.md` + `evidencia.md`; 14 criterios |
| 2 | Resolver `INC04-PEND-01` (login del cliente INACTIVO) | `CLI-04`, `CLI-08` | Producto + Orquestador | **Critica** (bloquea LISTO) | **Completada (2026-10-14)**: DEC-034 (a) 401 `AUTH_CLIENTE_INACTIVO` |
| 3 | Resolver `INC04-PEND-02` (alcance/obligatoriedad del `motivo`) | `CLI-03`, `EST-03`, `EST-06` | Producto | **Critica** (bloquea LISTO y el RED) | **Completada (2026-10-14)**: DEC-035 (a) obligatorio en todo cambio |
| 4 | Resolver `INC04-PEND-03` (modelo de historial de estados) | `CLI-02`, `CLI-03`, `EST-02`, `EST-04` | Producto + database-admin | **Critica** (bloquea LISTO y la migracion) | **Completada (2026-10-14)**: DEC-036 (a) modelo `ClienteEstadoCambio` |
| 5 | Resolver `INC04-PEND-04` (quien inactiva/suspende/retira) | `CLI-03`, `CLI-08`, `EST-02` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-14)**: DEC-037 (b) DUENO + RECEPCIONISTA |
| 6 | Resolver `INC04-PEND-05` (matriz de transiciones) | `EST-05` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-14)**: DEC-038 (b) matriz, RETIRADO terminal; celda INACTIVO->RETIRADO permitida, ratificada por orquestador |
| 7 | Resolver `INC04-PEND-06` (INACTIVO en el ingreso fisico) | `CLI-07` | Producto + backend | **Critica** (bloquea LISTO) | **Completada (2026-10-14)**: DEC-039 (a) 403 `INGRESO_NO_PERMITIDO` |
| 8 | Resolver `INC04-PEND-07` (sesion JWT ya emitida) | `CLI-06` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-14)**: DEC-040 (b) expira con TTL 24h |
| 9 | Resolver `INC04-PEND-08` (exposicion del `motivo` al rol CLIENTE) | `CLI-03`, `EST-02` | Producto | **Critica** (bloquea LISTO) | **Completada (2026-10-14)**: DEC-041 (a) solo staff |
| 10 | Crear `club-beasts-api/features/acceptance-criteria/HU-17-schemas.ts` (contrato G14 ausente, incompatibilidad #1 del spec) | `EST-*` | acceptance-criteria-analyst | Alta (bloquea RED) | **Completada (2026-10-14)**: reescrito como version ratificada (+199/-39), paridad de matriz verificada; enmienda de los `.md` ISTQB (incompatibilidad #14) delegada aparte |
| 11 | Ratificar el contrato del spec (paths, bodies, mensajes exactos, orden de evaluacion, modelo, 409/401 propuestos) | todos | backend-developer | Alta (bloquea LISTO) | **Completada (2026-10-14)**: 7 endpoints ratificados, 16 incompatibilidades documentadas y ajustadas en el spec; API 471/471 intacta |
| 12 | Registrar `INC04-CONF-01..07` y la regla de no-duplicado (estado/filtro -> HU-05/HU-06; DEC-030 -> HU-30; vencimiento -> HU-16) en `docs/producto/decisiones.md` | `CLI-01`, `EST-01`, `CLI-07` | Orquestador | Alta (bloquea LISTO) | **Completada (2026-10-14)**: secciones CONF-01..07 y no-duplicado INC-04 en `decisiones.md` |
| 13 | Pasar el incremento a **LISTO** (checklist del spec completo) y habilitar el RED | todos | Orquestador | Alta | **Completada (2026-10-14)**: checklist completa; 10 celdas BLOQUEADO -> OK; `ESPECIFICADO -> LISTO` |
| 14 | **RED** de API: integracion de `PATCH /clientes/:id` (motivo/historial/transiciones), `POST /auth/login-cliente` (rama inactiva), guarda 409 en membresias, rama `INACTIVO` en ingreso; sin tocar `src/` | `CLI-02..08`, `EST-02..05` | test-engineer | Alta | Pendiente |
| 15 | **RED** de UI: unit de `cliente-payload`/formulario con `motivo`, mensaje de cuenta inactiva en login, clasificacion del 401 | `EST-06`, `CLI-03`, `CLI-04` | test-engineer | Alta | Pendiente |
| 16 | Escenarios **Gherkin** nuevos (`features/*.feature` + `features/steps/*`) para inactivacion, motivo, historial y transiciones; guardar el guard `INC00_SCENARIO_COUNT = 126` para actualizar en GREEN | todos los puntuable | test-engineer | Alta | Pendiente |
| 17 | Migracion Prisma: `ClienteEstadoCambio` (+ back-relations en `Cliente`/`User`) o columnas livianas, segun `PEND-03`; limpieza de FKs en fixtures/seed | `CLI-02/03`, `EST-02/04` | database-admin | Alta | **Completada (2026-10-19)**: modelo + back-relations verificados contra DEC-036 (motivo NOT NULL = DEC-035); migracion `20261014213742` portable (CREATE TABLE + CREATE INDEX, FK RESTRICT/CASCADE) **ya aplicada**: **9 migraciones / 0 pendientes, drift 0** en ambas direcciones, `prisma generate` OK, seed sin riesgo FK (solo upserts), API 471/471 intacta. **Residual movido al RED (test-engineer)**: `features/support/world.ts` debe borrar `ClienteEstadoCambio` antes de `cliente.deleteMany` (FK RESTRICT); hoy inocuo porque ningun step escribe historial |
| 18 | **GREEN** API: `routes/clientes.ts` + `services/cliente.service.ts` (motivo, historial, transiciones, exposicion), `services/auth.service.ts` + `routes/auth.ts` (`PEND-01`), `services/membresia.service.ts` (guarda 409), `routes/recepcion.ts` (`PEND-06`), `src/schemas/*` | `CLI-*`, `EST-02..05` | backend-developer | Alta | Pendiente |
| 19 | **GREEN** UI: campo `motivo` en `/clientes/[id]`, mensaje de login bloqueado, `classifyError` para `AUTH_CLIENTE_INACTIVO` | `EST-06`, `CLI-03/04/06` | frontend-developer | Alta | Pendiente |
| 20 | **VERIFICADO**: E2E real, bateria completa (API + web + Playwright), guard de gherkin actualizado y registro en `evidencia.md` | todos | test-engineer | Alta | Pendiente |
| 21 | **Revision**: seguridad/permisos DEC-001, no duplicado (HU-05/HU-06/DEC-030), regresion de INC-03, pruebas sin aserciones vacias | todos | code-reviewer | Alta | Pendiente |
| 22 | Actualizar `docs/producto/avance.md`, `docs/producto/mvp.md` y `docs/producto/auditoria-puntos-inc00.md` con los puntos aceptados (+2 max., solo si la revision no bloquea y los bullets cierran 4/4 y 3/3) | HU-08 + HU-17 | Orquestador (delivery-orchestrator) | Alta | Pendiente |

## Orden recomendado

1. #1 (este paquete) -> #2..#9 (decisiones de Producto, **una sola pasada** con las
   opciones ya formuladas en el spec) -> #10 (HU-17-schemas) -> #11 (ratificacion de
   contrato) -> #12 -> #13: **puerta LISTO**.
2. #14 y #15 en paralelo (RED), #16 en paralelo con ellos.
3. #17 -> #18 -> #19 (orden por dependencia de datos).
4. #20 -> #21 -> #22.

Ninguna tarea de RED/GREEN arranca antes de #13: la puerta es un gate unico (los 10
criterios bloqueados comparten spec con los 4 no bloqueados). **El RED no puede escribirse
antes de `PEND-02`**: define si los tests aceptados de HU-05 se actualizan o no.

## Archivos permitidos por agente

- `acceptance-criteria-analyst`: `docs/incrementos/INC-04-*/` (este paquete) y, en la tarea
  #10, `club-beasts-api/features/acceptance-criteria/HU-17-schemas.ts`. **No** toca
  `HU-08-*`/`HU-17-criterios-aceptacion.md` salvo enmienda explicita del orquestador,
  `features/*.feature` ni `steps/`.
- `test-engineer`: `club-beasts-api/tests/integration/*.test.ts` (nuevos), tests unit/UI de
  `club-beasts-web/tests/unit*`, `club-beasts-api/features/*.feature` y
  `features/steps/*`, `club-beasts-web/tests/e2e/*.spec.ts` (nuevos),
  `club-beasts-api/vitest.cucumber.config.ts` (solo el guard de conteo en GREEN) y
  `docs/incrementos/INC-04-*/evidencia.md`.
- `database-admin`: `club-beasts-api/prisma/schema.prisma`, migracion nueva,
  seed/fixtures (limpieza de FKs del modelo nuevo).
- `backend-developer`: `club-beasts-api/src/routes/` (`clientes.ts`, `auth.ts`,
  `membresia.ts`, `recepcion.ts`), `src/services/` (`cliente.service.ts`,
  `auth.service.ts`, `membresia.service.ts`), `src/schemas/` (`cliente.schema.ts`,
  `auth.schema.ts`, `common.schema.ts` si hace falta).
- `frontend-developer`: `club-beasts-web/src/app/clientes/[id]/page.tsx`,
  `src/lib/cliente-payload.ts`, pagina de login del portal, `src/lib/api.ts`
  (`classifyError`), `src/app/portal/page.tsx` solo si `PEND-07` opcion (a).
- `code-reviewer`: solo lectura + `docs/incrementos/INC-04-*/evidencia.md` (seccion de
  revision).
- `Orquestador`: `docs/producto/*` (fuera de este paquete: lo hace el orquestador, no este
  agente).

## Fuera de este incremento (no tocar)

- **INC-03 cerrado**: no se reabre su alcance; `recepcion.ts`/`membresia.ts` solo reciben
  las guardas aprobadas por `PEND-06`/`PEND-05`-adjacentes, con regresiones verdes.
- **INC-05** (HU-13/HU-14): la guarda de servicios nuevos se hereda del servicio
  (`CONF-06`), no se crean rutas ni asignaciones aqui.
- **Anamnesis** (HU-09/10/11/28, PEND-003/DEC-021), **rutinas** (HU-18..21/26),
  **nutricion** (HU-22..24/27), **reportes/historial/notificaciones** (HU-32/33/34): la UI
  visible del historial de estados es de HU-07/HU-32.
- **HU-05/HU-06/HU-16/HU-30** ya aceptados: no se re-cobran ni se re-especifican.
- Riesgos globales R-01..R-04, R-06..R-09, R-11, D2, REV-01..REV-05 (backlog aparte).

## Riesgos de gestion del incremento

| Riesgo | Mitigacion |
|---|---|
| 8 decisiones de Producto abiertas al mismo tiempo | Resolverlas en una sola pasada (una entrada en `decisiones.md`, patron DEC-026..033), con las opciones y recomendaciones ya formuladas en `spec.md` |
| `PEND-02` toca tests aceptados (HU-05/Gherkin/UI) | Actualizacion controlada documentada como cambio de contrato; RED antes que GREEN; ningun test aceptado se elimina |
| Alcance amplio (2 HU, 14 criterios, 3 rutas existentes) | Orden fijado; no abrir la puerta con criterios bloqueados sin decision registrada |
| Regresion de la base certificada (471/126/174/47) | Bateria completa antes/despues del GREEN; rama DEC-030 y HU-02 con pruebas de regresion explicitas |
| Cerrar con fraccion parcial (un PEND que excluye criterio) | El spec no declara puntos; el orquestador certifica solo la fraccion real cerrada (DEC-016) |
