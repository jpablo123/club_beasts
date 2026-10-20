# INC-04 - Evidencia

Estado del incremento: **RED medido, GREEN ejecutado y VERIFICADO medido el
2026-10-19 por `test-engineer` (tarea #20)**. La puerta de
entrada se cumplio el 2026-10-14 (`INC04-PEND-01..08` -> DEC-034..041, contrato
ratificado por `backend-developer`, `INC04-CONF-01..07` + regla de no-duplicado
registrados por el orquestador en `decisiones.md`). La fase RED quedo medida en la
seccion 3 (API 43/529, Gherkin 18/153 + guard 126!=153, web 6/183; base intacta); el
GREEN quedo commiteado en `c59179e` y la bateria de verificacion de la seccion 1 corre
**536/536 API, 153/153 Gherkin exit 0, 183/183 web, build PASS, tsc 0/0, migraciones
9/0**; E2E **56/56 en las 2 corridas consecutivas** (base 47/47 + 6/6 INC-04 + 3 del
spec `cambio-pin-obligatorio.spec.ts`, tras el **fix suelto autorizado** del portal en
`f2968c5`; ver 5.2). El bug de producto del `authorize` que dejaba 2 E2E en rojo quedо
**resuelto y verificado** por `frontend-developer` (seccion 5.1) e `INC04-CLI-04` quedo
**Verde** (seccion 2). Revision `code-reviewer` (tarea 21, seccion 6): **ACEPTA CON
HALLAZGOS NO BLOQUEANTES** — 12 hallazgos (1 MEDIO, 9 BAJO, 2 SUGERENCIA), **0
bloqueantes**. Secciones 1-6 sin huecos: las condiciones de certificacion de la seccion
7 estan cumplidas.

Regla de cuenta (DEC-011/DEC-016): **sin evidencia de ejecucion no se certifica ningun
punto** ni se marca ningun criterio como verificado. **Base que permanece intacta al
cerrar** (medida en el cierre de INC-03, `docs/incrementos/INC-03-vencimiento-recepcion-portal/evidencia.md`):
API **471/471**, Gherkin **126/126**, web **174/174**, Playwright **47/47**, migraciones
**9/0 sin drift** (la 9ª, `20261014213742_add_cliente_estado_cambio`, ya aplicada y verificada por `database-admin` el 2026-10-19; ver 1.1). Ninguna base puede perder tests; los totales finales son la base mas
los tests nuevos.

## 1. Comandos de verificacion

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0, 0 errores | **exit 0, 0 errores** | 2026-10-19 |
| 2 | GREEN | `club-beasts-api` | `npx vitest run` | base 471/471 intacta + tests nuevos en verde | **536/536 passed (29 archivos)**, exit 0 = base 471 + 58 INC-04 + 7 nuevos del gap G-02 | 2026-10-19 |
| 3 | GREEN | `club-beasts-api` | `npm run test:gherkin` | base 126/126 + escenarios nuevos (guard actualizado en GREEN) | **153/153 escenarios (9 features)**, guard `INC00_SCENARIO_COUNT = 153`, exit 0 | 2026-10-19 |
| 4 | Modelo | `club-beasts-api` | `npx prisma migrate status` | 0 pendientes, sin drift (base 8 migraciones) | **9 migraciones encontradas + "Database schema is up to date!" = 9 aplicadas, 0 pendientes, sin drift**, exit 0 | 2026-10-19 |
| 5 | GREEN | `club-beasts-web` | `npx tsc --noEmit` | exit 0, 0 errores | **exit 0, 0 errores** (el `include` del tsconfig cubre `tests/e2e/**`) | 2026-10-19 |
| 6 | GREEN | `club-beasts-web` | `npx vitest run` | base 174/174 intacta + tests nuevos en verde | **183/183 passed (22 archivos)**, exit 0 | 2026-10-19 |
| 7 | Build | `club-beasts-web` | `npm run build` | PASS | **PASS**, exit 0 (11 rutas + middleware) | 2026-10-19 |
| 8 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base 47/47 + 6 INC-04 + 3 ajeno = 56/56 verdes | **Corrida A y B identicas (3.8m c/u): 56 tests -> 55 passed / 1 failed**, exit 1 en ambas. Desglose: base **47/47 verde intacta** + **6/6 E2E INC-04 verdes** + 3/3 del spec `cambio-pin-obligatorio.spec.ts`; el fallo unico de esa medicion (2da capa del spec ajeno) quedo **resuelto por el fix suelto autorizado `f2968c5`** (persistencia de `debeCambiarPin` antes de pintar exito). **Re-medido por el revisor y confirmado en la re-ejecucion final: 56/56 exit 0 en las 2 corridas** | 2026-10-19 |
| 9 | Revision | `club-beasts-api` + `club-beasts-web` + `docs/` | revision `code-reviewer` (tarea 21): re-ejecucion de la seccion 1 + lectura de `spec.md`, `decisiones.md` y G14, y diff `0f3c76a..f2968c5` | sin hallazgos bloqueantes | **EJECUTADA 2026-10-19 -> `ACEPTA CON HALLAZGOS NO BLOQUEANTES`** (12 hallazgos: 1 MEDIO, 9 BAJO, 2 SUGERENCIA; **0 bloqueantes**, ver seccion 6). Re-medido por el revisor: API **536/536**, Gherkin **153/153 exit 0** (guard 153), web **183/183**, `tsc --noEmit` **0/0 en api y web**, `migrate status` **9/0 sin drift**, `build` **PASS** (11 rutas + middleware), E2E **56/56 exit 0 en 2 corridas consecutivas** (base 47 + 6 INC-04 + 3 `cambio-pin`) | 2026-10-19 |
| E1 | E2E | `club-beasts-web` | `npx playwright test cambio-pin-obligatorio --reporter=line` (aislado, tras el **fix suelto autorizado**) | diagnostico del spec ajeno | **2 passed / 1 failed** (27.6s), exit 1: el `strict mode violation: getByLabel('Nuevo PIN') resolved to 2 elements` quedo **resuelto** con el localizador exacto (los tests 2 y 3 verdes en todas las corridas); el test 1 cae en una **2da capa preexistente** distinta (carrera `update()` vs navegacion, ver 5.2), medida **flaky** con `--repeat-each=3 -g "volver al inicio"` -> **1 passed / 2 failed**. Fallo ajeno al incremento: **reportado, no corregido** | 2026-10-19 |
| E2 | E2E | `club-beasts-web` | `npx playwright test inc04 --reporter=line` (specs nuevos, tras el fix de `authorize` / 5.1) | diagnostico INC-04 | **6 passed / 0 failed** (45.5s), exit 0: verdes `EST-06/CLI-03` (sin motivo y con motivo), **ciclo `CLI-04/CLI-08` con el literal de cuenta inactiva en el navegador**, control ACTIVO y reactivacion DEC-020; el literal ya viaja a `CredentialsSignin.code` (5.1 cerrado) | 2026-10-19 |
| R1 | **RED** | `club-beasts-api` | `npx tsc --noEmit` | exit 0 (el RED no debe romper la compilacion) | **exit 0, 0 errores** | 2026-10-19 |
| R2 | **RED** | `club-beasts-api` | `npx vitest run` | fallos SOLO en los 3 archivos nuevos; base 471 intacta | **529 tests: 43 failed / 486 passed** (detalle 3) | 2026-10-19 |
| R3 | **RED** | `club-beasts-api` | `npm run test:gherkin` | fallos SOLO en las 2 features nuevas; guard 126 intacto -> exit 1 esperado | **153 escenarios: 18 failed / 135 passed** + guard `[INC00-QA-06] se esperaban 126 y se obtuvieron 153` (exit 1) | 2026-10-19 |
| R4 | **RED** | `club-beasts-web` | `npx tsc --noEmit` | exit 0 (el RED no debe romper la compilacion) | **exit 0, 0 errores** | 2026-10-19 |
| R5 | **RED** | `club-beasts-web` | `npx vitest run` | fallos SOLO en tests nuevos/actualizados INC-04; base 174 intacta | **183 tests: 6 failed / 177 passed** (detalle 3) | 2026-10-19 |
| R6 | **RED** | - | `git status --porcelain` | cero cambios en `src/`, `prisma/`, `docs/producto/`, E2E y otros incrementos | **confirmado**: solo tests/features/steps/world.ts/evidencia.md de INC-04 (+ E2E ajeno `cambio-pin-obligatorio.spec.ts` sin tocar) | 2026-10-19 |

Comandos reproducibles (uno por verificacion):

```bash
# 1) Typecheck API
cd club-beasts-api && npx tsc --noEmit

# 2) Suite unit/integracion API (RED/GREEN)
cd club-beasts-api && npx vitest run

# 3) Gherkin (ATDD)
cd club-beasts-api && npm run test:gherkin

# 4) Migraciones
cd club-beasts-api && npx prisma migrate status

# 5) Typecheck web
cd club-beasts-web && npx tsc --noEmit

# 6) Unit/component tests web
cd club-beasts-web && npx vitest run

# 7) Build de produccion web
cd club-beasts-web && npm run build

# 8) E2E completo (API E2E SQLite aislado + Next)
cd club-beasts-web && npx playwright test
```

## 1.1 Verificacion de modelo previa al RED (2026-10-19, `database-admin`)

Ejecutada sobre los cambios Prisma ya presentes en el worktree (tarea #17, completada):

| Comando | Resultado |
|---|---|
| `npx prisma validate` | schema valido, exit 0 |
| `npx prisma migrate status` | **9 migraciones, 0 pendientes**, "Database schema is up to date!" |
| `npx prisma migrate diff` (migrations -> dev.db y schema -> dev.db) | ambos "empty migration" = **drift 0** |
| `npx prisma generate` | Prisma Client v6.19.3 regenerado |
| `npx tsx prisma/seed.ts` | OK (upserts idempotentes; sin riesgo FK RESTRICT) |
| `npx vitest run` | **471/471** intacta |

`migration.sql` = `schema.prisma` a nivel byte (CREATE TABLE + CREATE INDEX; portable
SQLite/PostgreSQL, DEC-012; FK RESTRICT/CASCADE como `Ingreso`/`MembresiaGymCambio`).
Modelo `ClienteEstadoCambio` conforme a DEC-036 (`motivo` NOT NULL = DEC-035;
`actorId` ratificado en el spec, incompatibilidad #15). La migracion **ya esta aplicada**
en `dev.db` (2026-10-14). Residual asignado al RED: `features/support/world.ts` debe
borrar `ClienteEstadoCambio` antes de `cliente.deleteMany` (FK RESTRICT); hoy inocuo
porque ningun step Gherkin escribe historial.

## 2. Evidencia por criterio (plantilla)

| Criterio | Evidencia minima requerida (spec INC-04) | Estado RED | Estado GREEN |
|---|---|---|---|
| `INC04-CLI-01` | REF: evidencia ya aceptada de HU-05/HU-06 (`clientes.test.ts:435`, `clientes.feature` C13); sin pruebas nuevas | n/a | n/a |
| `INC04-CLI-02` | Integracion: ficha 200 integra tras inactivar + busqueda por cedula + count de historial N -> N+1 + `DELETE /clientes/:id` 404; Gherkin | RED: 1 test integracion **falla**; Gherkin `clientes-inactivacion.feature:83` **falla** (:96 pasa solo porque el borrado fisico ya esta prohibido; no acredita el cambio de estado) | **Verde 2026-10-19** (comandos 2 y 3): `clientes-estados.test.ts` 43/43 y `clientes-inactivacion.feature` 15/15 con la implementacion real |
| `INC04-CLI-03` | Integracion: 200 con `motivo` + `actualizadoPorId` + `ultimoCambio` asertados en respuesta **y** BD (misma transaccion); 400 x3 mensajes; 404; 403 `CLIENTE`; unit web del payload | RED: 8 tests integracion (7 **fallan**, pasan 403 `CLIENTE` y 404) + unit web payload **falla**; Gherkin motivos **fallan** (`clientes-estados.feature:9,18,26,34`) | **Verde 2026-10-19** (comandos 2, 3 y 6): integracion + Gherkin + unit web del payload; **ademas E2E nuevo verde** (`inc04-estados-cliente.spec.ts`, ver 5) |
| `INC04-CLI-04` | Integracion: 401 `AUTH_CLIENTE_INACTIVO` sin token; PIN mal -> `AUTH_INVALID_CREDENTIALS`; ACTIVO -> 200 (regresion HU-02); unit web del mensaje; **E2E** de login bloqueado; Gherkin | RED: 1/5 tests **falla** (solo el 401 con codigo explicito; las 4 regresiones verdes); Gherkin `:9` **falla** (`:18`,`:26` verdes); web: mensaje en `role=alert` **falla** + `classifyError` INC04-R11 **falla** | **Verde 2026-10-19** (comandos 2, 3, 6 y 8/E2): API + Gherkin + unit web verdes, y el **E2E exigido ahora verde**: `inc04-login-cliente-inactivo.spec.ts` **2/2** (backend 401 con literal + navegador `role="alert"` = literal, URL en `/login-cliente`, sin `Mi Portal`; control ACTIVO entra a `/portal`) tras el fix de `authorize` que re-lanza `CredentialsSignin` (5.1 **cerrado**); confirmado en **E2 aislado 6/6** y en **ambas corridas completas** |
| `INC04-CLI-05` | Integracion: 409 `CLIENTE_INACTIVO` sin fila creada (count sin cambio); 201 regresion; 404; Gherkin | RED: 3/10 tests **fallan** (409, orden CONF-06 solape, roles DEC-001); regresiones 201/404/403 verdes; Gherkin `:34` **falla** (`:44`,`:52` verdes) | **Verde 2026-10-19** (comandos 2 y 3): `clientes-bloqueo-inactivo.test.ts` 10/10 + `clientes-inactivacion.feature` 15/15 |
| `INC04-CLI-06` | Integracion segun `PEND-07` (opcion (b): sin cambio; opcion (a): `GET /portal/resumen` -> 403 con sesion previa) | PEND-07 = (b) DEC-040: 1 test de regresion **verde** (sesion previa sigue 200) + Gherkin `:134` **verde**; sin pruebas nuevas | **Verde 2026-10-19** (comandos 2 y 3): sin cambio de comportamiento; regresiones verdes |
| `INC04-CLI-07` | Integracion: 403 `INGRESO_NO_PERMITIDO` con `INACTIVO` + membresia activa, sin fila; regresion de `INC03-ING-10` (`SUSPENDIDO`/`RETIRADO`); Gherkin | RED: 1/10 test **falla** (INACTIVO -> 403); regresiones INC03-ING-10 (2) verdes; Gherkin `:59` **falla** (`:72` verde) | **Verde 2026-10-19** (comandos 2 y 3) |
| `INC04-CLI-08` | Integracion: `DUENO` y `RECEPCIONISTA` reactivan -> 200 + historial; `CLIENTE` -> 403; sin motivo -> 400; login vuelve 200; membresia-gym vuelve 201; Gherkin | RED: 3/4 tests **fallan** (DUENO, RECEPCIONISTA, sin motivo); `CLIENTE` 403 verde; Gherkin `:105`,`:116`,`:124` **fallan** | **Verde 2026-10-19** (comandos 2, 3 y 6) + **E2E de reactivacion verde** (`inc04-estados-cliente.spec.ts` "reactivar (DEC-020)...", ver 5) |
| `INC04-EST-01` | REF: evidencia ya aceptada de HU-05/HU-06; sin pruebas nuevas | n/a | n/a |
| `INC04-EST-02` | Integracion: `A -> B` con motivo persiste fila de historial con actor y fecha en la misma transaccion; Gherkin | RED: 2 tests **fallan**; Gherkin `clientes-estados.feature:42`,`:53` **fallan** | **Verde 2026-10-19** (comandos 2 y 3) |
| `INC04-EST-03` | Integracion: 400 `Motivo es requerido cuando cambia el estado` y estado sin cambio; unit web del error en formulario; Gherkin | RED: 5 tests **fallan** (omitido, 1-2 chars, 201 chars, `""` literal D4, CONF-07); unit web 400 `role=alert` **falla**; Gherkin `:9`,`:18`,`:26`,`:34` **fallan** (el `:63` CONF-07 pasa porque hoy se ignora todo motivo) | **Verde 2026-10-19** (comandos 2, 3 y 6) + **E2E nuevo verde** que pinta el 400 en `role="alert"` (`inc04-estados-cliente.spec.ts`, ver 5) |
| `INC04-EST-04` | Integracion: 3 cambios -> 3 registros ordenados (mas reciente primero) + datos base intactos + busqueda/filtro operativos + `DELETE` 404; Gherkin | RED: 1 test **falla**; Gherkin `clientes-estados.feature:72` **falla** | **Verde 2026-10-19** (comandos 2 y 3) |
| `INC04-EST-05` | Integracion: matriz aprobada (200 permitidas, 409 `TRANSICION_INVALIDA` sin cambio, no-op 200 sin registro nuevo); Gherkin | RED: **25/25 celdas fallan** (la implementacion ignora `estado`); paridad literal matriz G14 vs spec **verde** (contrato importado intacto); Gherkin `:91`,`:102`,`:111` **fallan** (`:83` no-op pasa por accidente) | **Verde 2026-10-19** (comandos 2 y 3): matriz 25/25 + paridad G14 + no-op CONF-02 con la implementacion real |
| `INC04-EST-06` | Unit web: formulario envia `{ estado, motivo }`; muestra el 400 con `role="alert"`; **E2E**: cambio de estado con motivo en navegador | RED: unit web payload **falla** (motivo ausente); campo Motivo y manejo del 400 en `cliente-edicion` **fallan** (2 tests nuevos); E2E pendiente por diseño (tarea #20, GREEN) | **Verde 2026-10-19** (comandos 6 y 8/E2): unit web + **2 E2E nuevos verdes** de cambio de estado con motivo en el navegador (`inc04-estados-cliente.spec.ts`, ver 5) |
| **Todos** | `tsc` API y web 0/0, `vitest` API y web sobre la base intacta, `build`, `migrate status`, revision `code-reviewer` | RED: `tsc` API 0/0 y web 0/0; build/E2E/revision pendientes (GREEN) | **Verde 2026-10-19, revision incluida**: `tsc` **0/0** (api y web), `vitest` API **536/536** y web **183/183** sobre la base intacta, Gherkin **153/153** exit 0, build **PASS**, `migrate status` **9/0 sin drift**, E2E **56/56 x2** (base 47 + 6 INC-04 + 3 `cambio-pin`), revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES (0 bloqueantes)** |

## 3. RED (ejecutado 2026-10-19 por `test-engineer`)

Patron INC-03 respetado: **cero cambios en `src/`, `prisma/`, `docs/producto/`, E2E y
otros incrementos** (verificado con `git status --porcelain`, fila R6); los tests nuevos
definen el comportamiento INC-04 y **fallan contra el codigo actual** (el modelo
`ClienteEstadoCambio` existe desde la migracion 9 pero `src/` no lo usa: el campo
`estado` del PATCH se stripa en el schema actual y los endpoints de bloqueo no existen).

Residual previo al RED cerrado: `features/support/world.ts` ahora borra
`clienteEstadoCambio` antes de `cliente.deleteMany` (FK RESTRICT de la migracion 9);
sin este fix los 27 escenarios nuevos dejarian filas huerfanas en el world hooks.

### 3.1 Tests creados

| Fecha | Archivo(s) nuevo(s) | Tests | Fallan | Pasan | Criterios | Notas |
|---|---|---:|---:|---:|---|---|
| 2026-10-19 | `tests/integration/clientes-estados.test.ts` | 43 | 38 | 5 | `CLI-02`, `CLI-03`, `CLI-06` (regresion DEC-040), `CLI-08`, `EST-02..05`, `DEC-041`, `CONF-07` | Prefijo cedula `9904`; matriz `EST-05` = 25 celdas por loop sobre `transicionesAprobadas`/`clasificarTransicion` (G14 `HU-17-schemas.ts`) + test de paridad con la matriz literal del spec. Verdes: 403 `CLIENTE`, 404, `CLIENTE` no-reactiva, sesion previa DEC-040, paridad G14 |
| 2026-10-19 | `tests/integration/auth-cliente-inactivo.test.ts` | 5 | 1 | 4 | `CLI-04` | Prefijo `9914`; unico fallo = 401 `AUTH_CLIENTE_INACTIVO` con literal G14. Regresiones verdes: PIN mal, ACTIVO 200, NUEVO 200, cedula inexistente 401 |
| 2026-10-19 | `tests/integration/clientes-bloqueo-inactivo.test.ts` | 10 | 4 | 6 | `CLI-05`, `CLI-07` + regresion `INC03-ING-10` | Prefijo `9924`; fallos = 3x409 `CLIENTE_INACTIVO` (literal, orden CONF-06 solape, roles DEC-001) + 1x403 `INGRESO_NO_PERMITIDO`; regresiones verdes: 201 HU-12, 404, 403 rol CLIENTE, 201 INC-03, INC03-ING-10 SUSPENDIDO/RETIRADO |
| 2026-10-19 | `features/clientes-inactivacion.feature` | 15 escenarios | 8 | 7 | `CLI-02..08` | Steps en `features/steps/inc04-estados.steps.ts` (reutiliza `inc03-soporte.ts`); materializacion D4 del motivo: `(omitido)` = campo ausente, `(201 caracteres)` = `"a".repeat(201)`, `""` = literal vacio |
| 2026-10-19 | `features/clientes-estados.feature` | 12 escenarios | 10 | 2 | `EST-02..05`, `CLI-03` | Verdes por accidente (documentado): `:63` CONF-07 y `:83` no-op pasan porque hoy todo `estado`/`motivo` se ignora; **el GREEN debe seguir pasandolos con la implementacion real** |
| 2026-10-19 | `club-beasts-web/tests/unit/cliente-estados-payload.test.ts` | 4 | 1 | 3 | `EST-06`/`CLI-03` (DEC-035) | Falta el envio de `motivo` en el payload de edicion |
| 2026-10-19 | `club-beasts-web/tests/unit/login-cliente-inactivo.test.tsx` | 2 | 1 | 1 | `CLI-04` | `signIn` mockeado con el literal del backend; exige `role="alert"` sin navegacion al portal |
| **Totales** | API 3 archivos + 2 features | 58 tests + 27 escenarios | 43 + 18 | 15 + 9 | - | - |

### 3.2 Tests aceptados actualizados (DEC-035, `PEND-02` = (a); ninguno eliminado)

Ver detalle en la seccion **4.2** (registro adelantado en el RED): API
`clientes.test.ts` x3, `features.test.ts` x1 (verdes en RED porque el schema actual
stripa `motivo`); web `cliente-edicion.test.tsx` x1 (**rojo en RED**: exige que el
payload lleve `motivo`, que hoy no viaja).

### 3.3 Conteo por bateria y confirmacion de base intacta

| Bateria | Comando | Total | Failed | Passed | Base | Base intacta |
|---|---|---:|---:|---:|---|---|
| API unit/integracion | `cd club-beasts-api && npx vitest run` | 529 | **43** | 486 | 471 | **Si**: los 43 fallos estan SOLO en los 3 archivos nuevos; 486 = 471 base + 15 regresiones nuevas verdes |
| Gherkin | `cd club-beasts-api && npm run test:gherkin` | 153 escenarios | **18** | 135 | 126 | **Si**: los 18 fallos son SOLO escenarios de las 2 features nuevas; 135 = 126 base + 9 escenarios nuevos verdes. El guard `INC00_SCENARIO_COUNT = 126` no se toco y marco exit 1 (`se esperaban 126 y se obtuvieron 153`) = salida esperada en RED; **GREEN debe actualizarlo a 153** |
| Web unit/component | `cd club-beasts-web && npx vitest run` | 183 | **6** | 177 | 174 | **Si**: 177 = 174 base (1 test aceptado ahora rojo por DEC-035, ver 4.2) + 4 nuevos verdes; los 6 fallos = 5 tests nuevos INC-04 + 1 aceptado actualizado |
| Typecheck | `npx tsc --noEmit` (api y web) | - | 0 | - | - | **exit 0 / exit 0** |

Detalle de los 6 fallos web: `api-errors.test.ts` INC04-R11 (el 401
`AUTH_CLIENTE_INACTIVO` no se clasifica explicitamente hoy),
`cliente-estados-payload.test.ts` (falta `motivo`), `login-cliente-inactivo.test.tsx`
(no hay `role="alert"` con el literal), `cliente-edicion.test.tsx` x3 (test aceptado
DEC-035 sin `motivo` + campo Motivo inexistente + 400 sin manejar).

### 3.4 Gherkin: desglose de los 18 escenarios en rojo

- `clientes-inactivacion.feature` (8/15): `:9` (`CLI-04` 401), `:34` (`CLI-05` 409),
  `:59` (`CLI-07` 403), `:83` (`CLI-02` historial), `:105`/`:116`/`:124` (`CLI-08`).
- `clientes-estados.feature` (10/12): `:9`/`:18`/`:26`/`:34` (`EST-03` motivos),
  `:42`/`:53` (`EST-02` historial), `:72` (`EST-04` acumulado), `:91`/`:102`/`:111`
  (`EST-05` terminal/no-op/409).

### Gaps abiertos por el RED (para el GREEN)

| # | Gap | Responsable | Bloquea |
|---|---|---|---|
| G-01 | `club-beasts-api/vitest.cucumber.config.ts`: guardar `INC00_SCENARIO_COUNT = 126` debe actualizarse a **153** en GREEN (intencionalmente intacto en RED) | `test-engineer`/`backend-developer` | cierre Gherkin |
| G-02 | `club-beasts-api/tests/unit/cliente.schema.test.ts:152`: valida el schema `updateCliente` actual sin `motivo`; GREEN debe extenderlo al contrato DEC-035 (no tocado en RED por restriccion de archivos permitidos) | `test-engineer` | cobertura unit del schema |
| G-03 | E2E: `club-beasts-web/tests/e2e/e2e-helpers.ts:91` envia `data: { estado }` sin `motivo` (lo usan `clientes.spec.ts:81` y `recepcion.spec.ts:83`); GREEN debe pasarlo por el formulario con motivo y agregar el E2E de login bloqueado (`CLI-04`) y de cambio de estado con motivo (`EST-06`) | `test-engineer` | seccion 5 (Playwright) |
| G-04 | Tests aceptados API siguen verdes en RED porque el schema stripa `motivo` (ver 4.2): el GREEN debe confirmar que siguen verdes con el contrato real (respuesta expone `ultimoCambio`) | `backend-developer` | regresion HU-05 |
| G-05 | 9 escenarios Gherkin nuevos pasan en RED por ausencia de implementacion (`clientes-inactivacion.feature:18,26,44,52,72,96,134` y `clientes-estados.feature:63,83`); el GREEN debe re-ejecutarlos y confirmar que siguen verdes con el comportamiento real | `test-engineer` | cierre sin regresiones accidentales |

## 4. GREEN (ejecutado en commit `c59179e` por `backend-developer`; el detalle por
archivo sigue **pendiente de registro por su autor**; abajo solo se registra la
re-ejecucion de verificacion hecha por `test-engineer` el 2026-10-19)

| Fecha | Archivo | Cambio | Criterios |
|---|---|---|---|
| 2026-10-19 | (re-ejecucion, no certificacion) | Bateria completa reproducida desde cero: API **536/536**, Gherkin **153/153** (exit 0), web **183/183**, `build` PASS, `tsc` 0/0 en ambos directorios, `migrate status` **9/0 sin drift**; Playwright 2 corridas **51/56** con los mismos 5 fallos (3 ajenos preexistentes + 2 por bug de producto 5.1) = estado intermedio antes de los fixes; **estado final medido en 1 (filas 1-8): E2E 55/56 x2 tras cerrar 5.1 y el fix suelto ajeno** | Todos (ver 1 y 5) |

### 4.1 Cierre de los gaps abiertos por el RED

| # | Gap | Cierre | Fecha |
|---|---|---|---|
| G-01 | `club-beasts-api/vitest.cucumber.config.ts`: guardar `INC00_SCENARIO_COUNT = 126` debe actualizarse a **153** en GREEN (intencionalmente intacto en RED) | **Cerrado**: el guard quedo en 153 (commit `c59179e`) y `npm run test:gherkin` cierra **153/153, exit 0** (fila 3) | 2026-10-19 |
| G-02 | `club-beasts-api/tests/unit/cliente.schema.test.ts:152`: valida el schema `updateCliente` actual sin `motivo`; GREEN debe extenderlo al contrato DEC-035 | **Cerrado**: +7 tests de schema (limite 3 y 200; rechazo de 1-2, `""` literal y 201 con los mensajes exactos G14; `motivo` viajero sin `estado` CONF-07; `estado` sin `motivo` sigue parseando porque el 400 lo emite el endpoint). `cliente.schema.test.ts` 43 -> **50/50**; suite API **536/536** | 2026-10-19 |
| G-03 | E2E: `club-beasts-web/tests/e2e/e2e-helpers.ts:91` enviaba `data: { estado }` sin `motivo` (lo usan `clientes.spec.ts:81` y `recepcion.spec.ts:83`); GREEN debe migrarlo y agregar el E2E de login bloqueado (`CLI-04`) y de cambio de estado con motivo (`EST-06`) | **Cerrado**: el helper ahora envia `{ estado, motivo }` (`MOTIVO_CAMBIO_ESTADO_E2E`, cambio de contrato DEC-035 documentado en 4.2; ninguna asercion debilitada), se crearon 6 E2E nuevos y **los 6 estan verdes** en E2 aislado y en ambas corridas completas (el rojo de 2 de ellos por 5.1 **queda resuelto**: ver cierre de 5.1) | 2026-10-19 |
| G-04 | Tests aceptados API siguen verdes en RED porque el schema stripa `motivo`; el GREEN debe confirmarlos con el contrato real (respuesta expone `ultimoCambio`) | **Cerrado**: con la implementacion real la suite API queda **536/536** incluidos `clientes.test.ts` 29/29 y `features.test.ts` 12/12 (el PATCH con `motivo` persiste historial y la ficha expone `ultimoCambio` derivado) | 2026-10-19 |
| G-05 | 9 escenarios Gherkin pasaban en RED por ausencia de implementacion; el GREEN debe re-ejecutarlos y confirmar que siguen verdes con el comportamiento real | **Cerrado**: `npm run test:gherkin` **153/153, exit 0** con la implementacion real (las 2 features nuevas 15 + 12 verdes) | 2026-10-19 |

### 4.2 Actualizaciones controladas de tests aceptados (solo si `PEND-02` = (a))

Registrar aqui cada test aceptado actualizado (archivo:linea, porque, y que el cambio de
contrato esta aprobado en `decisiones.md`); ningun test puede quedar eliminado.

| Test aceptado | Motivo del cambio | Decision que lo ampara |
|---|---|---|
| `club-beasts-api/tests/integration/clientes.test.ts:428` (test aceptado `INC00-CLI-02` "DUENO puede cambiar sedeId y estado") | El payload del PATCH ahora envia `motivo` junto con `estado` (antes no lo enviaba) | DEC-035 (`PEND-02` = (a)) |
| `club-beasts-api/tests/integration/clientes.test.ts:459` (test aceptado `INC00-CLI-02` "RECEPCIONISTA puede cambiar sedeId y estado") | El payload del PATCH ahora envia `motivo` junto con `estado` | DEC-035 (`PEND-02` = (a)) |
| `club-beasts-api/tests/integration/clientes.test.ts:740` (test aceptado HU-05 de filtro por estado; el fixture excluido pasa a `ACTIVO`) | El PATCH que prepara el fixture ahora envia `motivo` porque cambia el estado | DEC-035 / CONF-07 |
| `club-beasts-api/tests/integration/features.test.ts:340` (step de edicion de cliente del Gherkin runner) | Paso `... con motivo viajero "..."` agregado al payload del step existente; escenario sin cambios | DEC-035 / CONF-07 |
| `club-beasts-web/tests/unit/cliente-edicion.test.tsx` (test aceptado `INC00-CLI-02`: "envia sedeId, estado y motivo elegidos en el modo edicion") | El formulario ahora debe enviar `motivo` junto con `estado`; **en RED este test queda ROJO** porque el payload actual no lo incluye (RED correcto, no eliminado) | DEC-035 / `INC04-EST-06` |
| `club-beasts-web/tests/e2e/e2e-helpers.ts` (fixture `cambiarEstadoCliente` que usan los E2E aceptados `clientes.spec.ts:81` y `recepcion.spec.ts:83`) | El helper ahora envia `{ estado, motivo }` en el PATCH (antes `{ estado }` solo, que con el contrato vigente devolveria 400); **ningun test aceptado fue eliminado, omitido ni debilitado**: sus aserciones siguen intactas y ahora verifican el contrato real | DEC-035 (`PEND-02` = (a)) |

Nota de fase: los tests aceptados API quedan **verdes** durante el RED porque el schema
`updateCliente` actual stripa el campo desconocido `motivo` (no lo rechaza ni lo
persiste); su asercion sobre los campos que ya existen sigue valiendo. Se documenta
como gap G-04 para que GREEN confirme la asercion con el contrato real. El test
aceptado web queda **rojo** en RED porque alli la asercion es sobre el payload enviado,
que si cambia con DEC-035. Ningun test aceptado fue eliminado ni marcado `skip`.

## 5. Verificacion final y E2E (ejecutada 2026-10-19 por `test-engineer`)

Base intacta: **los 47 E2E aceptados (10 specs) siguen verdes en las 2 corridas
consecutivas**; no se elimino ni se marco `skip` ningun test de la base. El spec ajeno
`cambio-pin-obligatorio.spec.ts` (fuera del incremento) estaba **3/3 en rojo
preexistente** por un selector ambiguo propio (`getByLabel("Nuevo PIN")` matchea
"Nuevo PIN" y "Confirmar Nuevo PIN"): con el **fix suelto autorizado** (seccion 5.2)
queda **2/3 verdes y 1 fallo flaky preexistente** (2da capa, tambien ajena a INC-04,
reportada en 5.2), aislado (fila E1) que en suite completa (fila 8). Los **6 E2E
INC-04 estan 6/6 verdes** en E2 aislado y en ambas corridas completas (5.1 cerrado).

| Spec E2E | Tests | Criterios | Aserciones reales (sin opcionales ni vacias) | Estado (corrida A / corrida B) |
|---|---:|---|---|---|
| `inc04-estados-cliente.spec.ts` (**nuevo**) | 4 | `INC04-EST-06`, `INC04-CLI-03`, `INC04-EST-02` (ultimoCambio), ciclo `INC04-CLI-04` + `INC04-CLI-08` / `DEC-020` | (1) sin motivo: `role="alert"` con el literal del 400 del backend + `Guardar` sigue visible + `GET /clientes/:id` con `estado` sin cambio y `motivo` null + badge `NUEVO`; (2) con motivo: modo edicion cerrado + badge `INACTIVO` + sin alertas + API `estado`/`motivo` del ultimo cambio; (3) ciclo: badge `INACTIVO` -> login del cliente con literal bloqueado -> reactivacion con motivo -> login `/portal`; (4) reactivacion DEC-020: API `estado`/`motivo` + login del cliente vuelve a `/portal` | (1) **verde/verde**, (2) **verde/verde**, (3) **verde/verde** (5.1 cerrado), (4) **verde/verde** |
| `inc04-login-cliente-inactivo.spec.ts` (**nuevo**) | 2 | `INC04-CLI-04` (DEC-034) | (1) backend 401 + `code` + literal + `token` undefined, y navegador con `role="alert"` = literal, URL en `/login-cliente` y sin heading `Mi Portal`; (2) control ACTIVO: `/portal` + heading + cero alertas | (1) **verde/verde** (5.1 cerrado), (2) **verde/verde** |
| Specs base (10 archivos aceptados) | 47 | INC-00..INC-03 | Sin cambios de asercion; solo el helper de fixture `cambiarEstadoCliente` migra al contrato DEC-035 (4.2) | **47 verdes / 47 verdes** intactos en ambas corridas |
| `cambio-pin-obligatorio.spec.ts` (ajeno; **fix suelto autorizado** solo en el localizador, ver 5.2) | 3 | - | Ciclo completo de salida de `ChangePinForm` con `debeCambiarPin: true`; **ninguna asercion debilitada** | **2 verdes / 1 rojo flaky** en ambas corridas: tests 2 y 3 verdes siempre; test 1 en rojo por 2da capa preexistente (E1) |
| **Total** | **56** | - | - | **55 passed / 1 failed** en ambas corridas (3.8m c/u), exit 1; **mismo fallo unico en A y B = base e INC-04 sin flaky**; el fallo restante es el spec ajeno (flaky medido, ver 5.2). **56/56 no alcanzado por 1 test ajeno** |

Notas exigidas: sin `isVisible()` condicional, sin `waitForTimeout`, sin `skip`/`only`,
sin aserciones vacias; fixtures con cedula/PIN unicos y SQLite temporal aislado por
corrida (DEC-012); los E2E nuevos no dependen de fechas (los cambios de estado son
inmediatos), por lo que no usan `hoyBogota()`; 2 corridas consecutivas identicas.

Patron de localizador documentado en los specs nuevos: los `role="alert"` se acotan a
`main` (`alertaDePantalla`) porque el anunciador de rutas de Next.js
(`#__next-route-announcer__`, siempre en el DOM y colgando de `body`) tambien expone
`role="alert"` y vuelve ambiguo el localizador global (mismo patron de acotado que
`cardCon` en recepcion); las aserciones sobre el literal del backend se mantienen
exactas.

### 5.1 BLOQUEO (RESUELTO el 2026-10-19): bug de producto impedia verificar `INC04-CLI-04` (y el ciclo del HU-08)

**Archivo**: `club-beasts-web/src/lib/auth.ts:66-99` (fuera del alcance de archivos de
esta tarea: **reportado, no corregido por `test-engineer`**; corregido despues por
`frontend-developer`, ver cierre abajo).

`authorize` lanza `CuentaInactivaSignin` con el literal aprobado (lineas 81-83) **dentro**
del `try` cuyo `catch { return null; }` (lineas 97-99) se traga cualquier excepcion. El
literal nunca llega a `CredentialsSignin.code`, Auth.js emite el
`CredentialsSignin` generico con `code=credentials` y `/login-cliente`
(`src/app/login-cliente/page.tsx:47-51`) cae al fallback `"Cedula o PIN invalido"`.

Evidencia de corrida (identica en A y B):

```
Error: expect(locator).toContainText(expected) failed
Locator: locator('main').getByRole('alert')
Expected substring: "La cuenta está inactiva. Contacte con recepción."
Received string:    "Cedula o PIN invalido"
```

Impacto: `INC04-CLI-04` **queda sin verificar** (su evidencia minima exige el E2E del
login bloqueado) y el test 3 del ciclo HU-08 se detiene en el paso del bloqueo. La rama
de reactivacion (`DEC-020`) tiene E2E propio **verde** (test 4 del spec).

Correccion sugerida al propietario de `src/` (no aplicada por restriccion de alcance):
re-lanzar el `CredentialsSignin` en el catch, p. ej.
`catch (err) { if (err instanceof CredentialsSignin) throw err; return null; }`
(`CredentialsSignin` ya esta importado en el archivo). Verificado que `next-auth`
`5.0.0-beta.32` si propaga `code` al navegador (`SignInResponse.code`,
`node_modules/next-auth/lib/client.d.ts:55`) y que `@auth/core` lo escribe en la URL de
error (`params.set("code", error.code)`), por lo que el literal viajaria
percent-encoded tal como asumen los criterios.

#### Cierre de 5.1 (2026-10-19, verificacion `test-engineer`)

**RESUELTO.** `frontend-developer` aplico exactamente la correccion sugerida en
`club-beasts-web/src/lib/auth.ts` (el `catch` de `authorize` re-lanza los
`CredentialsSignin` antes de caer a `return null`; `auth.ts:97-104`), por lo que el
literal de cuenta inactiva llega a `CredentialsSignin.code` y a `/login-cliente`.

Evidencia de cierre (mismo dia):

| Verificacion | Resultado |
|---|---|
| `npx playwright test inc04 --reporter=line` (E2, aislado) | **6 passed / 0 failed** (45.5s), exit 0 |
| Corrida A completa (`npx playwright test --reporter=line`) | 6/6 INC-04 verdes (55/56 total; unico rojo = spec ajeno, 5.2) |
| Corrida B completa (`npx playwright test --reporter=line`) | 6/6 INC-04 verdes (55/56 total; unico rojo = spec ajeno, 5.2) |

Impacto revertido: `INC04-CLI-04` de **PARCIAL/NO verificado** a **Verde** (seccion 2),
con su evidencia minima de **E2E de login bloqueado** cumplida; el test 3 del ciclo
HU-08 (`inc04-estados-cliente.spec.ts`) ejecuta el bloqueo completo y pasa.
El bloqueo de esta seccion **queda cerrado**.

### 5.2 Fix suelto autorizado (ajeno a INC-04) + capa 2 preexistente REPORTADA

**Nota exigida**: el cambio en `club-beasts-web/tests/e2e/cambio-pin-obligatorio.spec.ts`
es un **fix suelto autorizado por el producto**, **fuera de los puntos de INC-04** (no
aporta ni cobra criterios del incremento). Se aplico con el minimo posible y **sin
debilitar ninguna asercion**: solo se acoto el localizador ambiguo propio del spec.

Cambio exacto (unica linea de comportamiento, en el helper `cambiarPinObligatorio`):

```ts
// antes (strict mode violation: matchea "Nuevo PIN" y "Confirmar Nuevo PIN")
await page.getByLabel("Nuevo PIN").fill(PIN_NUEVO);

// despues (localizador exacto al campo real label="Nuevo PIN", ChangePinForm.tsx:93)
await page.getByLabel("Nuevo PIN", { exact: true }).fill(PIN_NUEVO);
```

El spec sigue probando el ciclo completo de salida de `ChangePinForm` con
`debeCambiarPin: true` (3 tests, todas las aserciones originales intactas, sin
`skip`/`only` ni esperas agregadas). Efecto medido: **3/3 rojo (strict mode) -> 2/3
verdes estables** (tests 2 y 3 verdes en todas las corridas).

**Hallazgo restante (fuera de alcance: REPORTADO, no corregido).** El test 1 del mismo
spec ("volver al inicio no repite el formulario") queda **flaky** por una carrera
**preexistente y ajena a INC-04**: `PortalPage.onSuccess` dispara
`update({ user: { ..., debeCambiarPin: false } })` **sin await**
(`src/app/portal/page.tsx:90-94`) y el test navega de inmediato (click en el logo +
`page.goto("/portal")`, que aborta los fetches en vuelo). Si el `POST` de `update()` no
persiste el JWT antes de la carga fresca, el portal relee `debeCambiarPin = true` y vuelve
a pintar el formulario; la asercion fuerte `Mi Informacion` (solo existe en la rama
completa del portal) lo detecta, mientras que `toHaveCount(0)` puede pasar durante la
ventana `status === "loading"` y `Mi Portal` existe tambien en la rama del formulario.

Evidencia de la carrera (2026-10-19):

```
npx playwright test cambio-pin-obligatorio --repeat-each=3 -g "volver al inicio"
-> 1 passed / 2 failed (misma instantanea en los fallos: formulario "Cambio de PIN
   Obligatorio" visible de nuevo en /portal)
```

En las corridas completas A y B el mismo test fallo **1/1 en ambas** (mismo unico fallo),
por lo que el total quedo en **55/56 y no 56/56**.

Diagnostico de alcance (por que no es de INC-04): el fix INC-04 en `src/lib/auth.ts`
solo toca la ruta de error de `authorize` (login fallido) y este test hace login
**exitoso**; el portal no se ha tocado desde INC-03 (`0f3c76a`). Tampoco lo provoca el
fix del localizador: era una capa **enmascarada** (el helper compartido fallaba en strict
mode antes de llegar a esta asercion). Tambien se descarto que lo causaran los cambios
del arbol de trabajo en `e2e-helpers.ts` (solo cambian `cambiarEstadoCliente`, no usado
por este spec).

Correccion fuera de este alcance (propietario de `src/` o del spec): (a) en `src/`,
persistir la salida del cambio de PIN antes de pintar exito (p. ej. `await update(...)`
o rehidratar `debeCambiarPin` desde `GET /portal/resumen`), o (b) en el spec, esperar la
estabilidad de la sesion antes de navegar. **APLICADA (a) en `f2968c5`** con
autorizacion explicita del Producto como **fix suelto** (`portal/page.tsx` con ref
`pinChangeInProgress` + bucle drenar/escribir, `ChangePinForm` con `onSuccess`
awaitable): el spec ajeno paso de 2/3 a **3/3** y la suite completa a **56/56 x2**
(medido por el `code-reviewer` en la fila 9 de la seccion 1). Diagnostico de la capa 2
(el `update()` sin await se abortaba con la navegacion y Auth.js re-emite la cookie con
`debeCambiarPin: true` en el `GET /api/auth/session` en vuelo) confirmado con traces de
Playwright y descifrado de cookies JWE.

## 6. Revision (tarea 21, `code-reviewer`)

**Fecha**: 2026-10-19 · **Revisor**: `code-reviewer` · **Base**: `0f3c76a` -> `f2968c5`
(commits revisados: `40388e5` RED, `c59179e` GREEN, `ad1d783` verificacion,
`f2968c5` fix suelto autorizado) · **Dictamen**: **ACEPTA CON HALLAZGOS NO
BLOQUEANTES** (12 hallazgos: 1 MEDIO, 9 BAJO, 2 SUGERENCIA; **0 BLOQUEANTES**)

Alcance: revision de **solo lectura** sobre `src/`, `tests/`, `features/`,
`prisma/` y docs de producto/incrementos. La unica escritura autorizada de esta
tarea es esta seccion 6 y la fila 9 de la seccion 1; sin commits (el arbol estaba
limpio antes de escribir). No se certifica ningun porcentaje aqui: la fraccion de
puntos la cierra la tarea 22.

### 6.1 Resultado por area del checklist

| Area del checklist | Resultado | Verificacion del revisor |
|---|---|---|
| Seguridad / DEC-001 | **CUMPLE** | Los 7 endpoints del spec con su rol: `PATCH /clientes/:id` staff (`src/routes/clientes.ts:197-199`), `POST /clientes` staff (`:162-164`), `GET /clientes/:id` con roles **inline** y `CLIENTE` self-only (`:117-158`, mensaje propio `No tienes permisos para consultar esta ficha.`), `POST /clientes/:id/membresias-gym` staff (`src/routes/membresia.ts:135-137`) con guarda `CLIENTE_INACTIVO` en el **servicio** (`src/services/membresia.service.ts:430-441`), `POST /recepcion/ingresos` con `STAFF_ROLES` (`src/routes/recepcion.ts:198-200`) e `INACTIVO` dentro de la **misma condicion** de estado (`:233-238`), `POST /auth/login-cliente` publico con orden credenciales -> estado (`src/routes/auth.ts:36-63`) y `GET /portal/resumen` solo `CLIENTE` (`src/routes/portal.ts:26-28`). `CLIENTE` -> 403 comprobado en `clientes-estados.test.ts`, `clientes-bloqueo-inactivo.test.ts`, Gherkin y E2E `recepcion.spec.ts` |
| Privacidad | **CUMPLE** | Para rol `CLIENTE` la ficha devuelve `motivo: null` y sin `ultimoCambio` (`src/routes/clientes.ts:131-158`, DEC-041); `actor` expone **solo** `{ id, nombre }` (`src/services/cliente.service.ts:298,308,344-350`), nunca `email`/`contrasena` (SEC-03); el login 200 **sin** `estado` (`src/routes/auth.ts:57,65-72`); `GET /portal/resumen` no expone `estado` ni `motivo` (verificado en `portal.test.ts`); el 401 `AUTH_CLIENTE_INACTIVO` no trae `token` y se clasifica antes del 401 generico (`lib/api.ts` INC04-R11, `api-errors.test.ts`). Hueco de cobertura: REV-10 |
| No duplicado (HU-05/HU-06/DEC-030/HU-16) | **CUMPLE** | Regla de no-duplicado de `decisiones.md:59-61` aplicada: `INC04-CLI-01` = `HU08-C01` y `INC04-EST-01` = `HU17-C01` estan marcados **REF / No (duplicado)** en ambos documentos G14 (`HU-08-criterios-aceptacion.md:15,22-28`; `HU-17-criterios-aceptacion.md:9,15,22-28`), sin pruebas nuevas presentadas como nuevas (seccion 2 los deja `n/a`); la rama de ingreso solo suma `INACTIVO` (DEC-039) y `SUSPENDIDO`/`RETIRADO` siguen cobrados en HU-30 (`INC03-ING-10` verde); el efecto vencido sigue en HU-16. `docs/producto/avance.md` sigue en **41/100 sin puntos nuevos** |
| Regresion INC-03 / HU-02 / HU-05 | **CUMPLE** | Base intacta re-medida: API 471 -> **536/536**, Gherkin 126 -> **153/153 exit 0**, web 174 -> **183/183**, E2E 47 -> **56/56 x2** (los 47 aceptados verdes); `auth.test.ts`/`portal.test.ts`/`membresia-*.test.ts`/`recepcion-*.test.ts` sin fallos; rama `SUSPENDIDO`/`RETIRADO` del ingreso intacta; HU-02 (login 200 para ACTIVO/NUEVO) con sus 4 regresiones verdes en `auth-cliente-inactivo.test.ts:138-158`. HU-05 se actualizo **solo** bajo DEC-035(a) y **sin eliminar ni debilitar** ningun test (seccion 4.2), con el cambio de contrato registrado en `decisiones.md` (ver REV-01 para su efecto en la UI) |
| Coherencia de decisiones | **CUMPLE** (deriva documental: REV-03, REV-07) | `DEC-034..041` y `INC04-CONF-01..07` aplicadas en codigo y probadas: roles (DEC-037), 401 de login (DEC-034), `ClienteEstadoCambio` + `actorId` (DEC-036 e incompatibilidad #15), matriz 5x5 con `RETIRADO` terminal (DEC-038), 403 de ingreso (DEC-039), sesion previa sin revocar (DEC-040), `motivo` staff-only (DEC-041). Sin `PEND-*` ni `BLOQUEADO`/`P-04` restantes en los `.md` G14 |
| Calidad de pruebas | **CUMPLE** | `grep` de `.only(`/`.skip(`/`test.skip` sobre todo el repo: **0 coincidencias**; sin aserciones vacias ni pasos opcionales (`test.skip`, `isVisible()` condicional, `waitForTimeout` no aparecen en los specs nuevos); matriz `EST-05` = **25 celdas reales** por loop sobre `transicionesAprobadas`/`clasificarTransicion` (G14) + test de paridad con la matriz literal del spec; mensajes **exactos** G14 con tildes (`auth-cliente-inactivo.test.ts:118-119`, `:134`; `cliente-edicion.test.tsx:234`; `cliente.schema.test.ts`); 27 escenarios Gherkin con steps que asertan estado+BD; guard `INC00_SCENARIO_COUNT = 153` -> exit 0; E2E reales contra API y navegador (`role="alert"` acotado a `main`) |
| Compilacion / suites | **CUMPLE** | Re-ejecucion completa de la seccion 1 por el revisor (fila 9): `tsc --noEmit` **0/0** (api y web), `vitest` **536/536** y **183/183**, `test:gherkin` **153/153 exit 0**, `prisma migrate status` **9/0 sin drift**, `npm run build` **PASS**, `playwright` **56/56 exit 0 x2 corridas consecutivas** |

### 6.2 Hallazgos

| ID | Severidad | Archivo:linea | Descripcion | Recomendacion |
|---|---|---|---|---|
| REV-01 | **MEDIO** | `club-beasts-web/src/lib/cliente-payload.ts:49,56-57`; `src/app/clientes/[id]/page.tsx:66,246-248` | El form se hidrata con el cliente (`page.tsx:66`) y **siempre** envia `estado` (`cliente-payload.ts:49`), mientras el `motivo` solo viaja si no esta vacio (`:57`). Con DEC-035(a) **cualquier guardado de staff sin cambio de estado** (telefono, email, sede, observaciones) llega como `{estado, motivo: ausente}` -> **400 `Motivo es requerido cuando cambia el estado`**. El copy del campo (`page.tsx:247`, "Obligatorio cuando cambias el estado") es enganoso y **ninguna prueba cubre el guardado de un campo suelto**: `tests/unit/cliente-payload.test.ts:15-58` (aceptado INC00-CLI-03) genera payloads `{estado}` sin `motivo` que hoy el backend rechazaria, `cliente-edicion.test.tsx` mockea la API y ninguno de los 56 E2E edita un campo sin estado | Enviar `estado` solo cuando difiera del inicial (payload por diff) **o** exigir `motivo` en el cliente solo si cambio el select; corregir el copy; anadir 1 unit + 1 E2E del guardado sin cambio de estado. **No bloquea INC-04** (ningun criterio incluido depende de esto, el API acepta PATCH sin `estado` y el mensaje guia al usuario), pero debe registrarse como follow-up en `avance.md`/`decisiones.md` en la tarea 22 (ver 6.3, R-B) |
| REV-02 | BAJO | `club-beasts-api/src/routes/clientes.ts:219-227`; `src/services/cliente.service.ts:295-296` | La regla `estado -> motivo` vive **solo en la ruta**; el servicio usa las no-null assertions `motivo!` y `actorId!`. Un futuro llamador de `updateCliente` (INC-05, job, otra ruta) que pase `estado` sin `motivo` produciria **500** (violacion NOT NULL de `ClienteEstadoCambio.motivo`) en vez del 400 del contrato. Ademas, un body con otro campo invalido **y** `estado` sin `motivo` devuelve solo los mensajes Zod (el de motivo no se une), mientras el `superRefine` de G14 (`HU-08-schemas.ts:91-99`) uniria ambos | Mover la regla al `superRefine` de `updateClienteSchema` o validarla al inicio de `updateCliente` con el error tipado que la ruta mapea a 400; sustituir las `!` por un guard explicito; anadir 1 test de combinacion multi-error |
| REV-03 | BAJO (doc) | `docs/incrementos/INC-04-estados-cliente/spec.md:312-313,329` vs `:440`; `docs/producto/decisiones.md` (DEC-036 y CONF-03) | Contradiccion interna de texto: `:312-313` y `:329` dicen que `motivo` "se valida en Zod / vive en Zod", la nota de implementacion `:440` (2026-10-19) dice que quedo en la **ruta**, y el resumen de CONF-03 en `decisiones.md` ordena el motivo **despues** de la matriz (el codigo y el spec lo ponen antes de la 404). Igual, `decisiones.md` DEC-036 cita `creadoPorId` mientras el codigo y el G14 usan `actorId` (ya ratificado como incompatibilidad #15, `spec.md:445`) | Unificar el texto (corregir `:312-313`/`:329`, CONF-03 y DEC-036 hacia la nota de `:440`). Solo deriva documental: el comportamiento observable esta cubierto por tests |
| REV-04 | BAJO | `club-beasts-api/src/services/membresia.service.ts:435-441` vs `:448` | La guarda `409 CLIENTE_INACTIVO` se evalua **fuera** de la `$transaction` que hace solape + insert (TOCTOU): entre la lectura del estado y la escritura puede llegar la inactivacion -> 201 de membresia para un cliente `INACTIVO` | Mover el `findUnique` de estado dentro de la transaccion (`tx.cliente.findUnique`); el orden de respuesta 409 antes de `MEMBRESIA_SOLAPADA` (CONF-06) se conserva |
| REV-05 | BAJO (residual) | `club-beasts-api/src/services/cliente.service.ts:235-263` vs `:275-299` | La matriz se evalua sobre el estado leido y la escritura ocurre despues **dentro** de la misma transaccion, sin lock optimista: dos PATCH concurrentes pueden leer el mismo estado origen y escribir dos filas con el mismo `estadoAnterior` (el `tx.cliente.update` no condiciona el `where` al estado leido) | Condicionar la escritura al estado observado (`tx.cliente.updateMany` con `where: { id, estado: estadoOrigen }` y abortar si `count === 1`); riesgo residual hoy: trafico staff, un solo desarrollador y SQLite serializa escrituras |
| REV-06 | BAJO | `club-beasts-web/src/app/login-cliente/page.tsx:52-53` | Para errores de Auth.js distintos de `CredentialsSignin` (`AccessDenied`, `Configuration`, ...) se pinta `result.error` **crudo** en el `role="alert"` (rotulo tecnico en ingles ante el usuario) | Mapear a un literal en espanol ("Cedula o PIN invalido" o "No se pudo iniciar sesion") manteniendo el literal de cuenta inactiva tal cual |
| REV-07 | BAJO (doc) | `evidencia.md:11,39,352-365` vs `tareas.md:51` | Deriva de evidencia: el encabezado y las filas 8/5.2 registran E2E **55/56** y dicen que el fix del portal quedo **"No aplicada"**, pero `f2968c5` lo aplico **y creo** `tests/e2e/cambio-pin-obligatorio.spec.ts` (115 lineas); `tareas.md` #20 ya afirma **56/56 x2**. Re-medido por el revisor tras `f2968c5`: **56/56 exit 0 en 2 corridas consecutivas** | Reconciliar encabezado, fila 8 y 5.2 (marcar el fix como "aplicada en `f2968c5`" y 56/56 x2) en la tarea 22; la seccion 6 deja constancia del valor medido |
| REV-08 | BAJO | `club-beasts-api/src/services/cliente.service.ts:313-327` | En un no-op (CONF-02) la respuesta del PATCH **eco** del motivo viajero (`:317-319`) aunque no se persistio (CONF-07), mientras `GET /clientes/:id` devuelve el motivo del ultimo cambio real -> PATCH y GET pueden discrepar, contra la letra de `spec.md:204-205` ("motivo (del ultimo cambio o `null`)") | Devolver siempre el motivo derivado (o `null`) y no pintar el viajero en la respuesta |
| REV-09 | SUGERENCIA (perf) | `club-beasts-api/src/services/cliente.service.ts:344-350` | `getUltimoCambioEstado` trae `include: actor` completo para la ficha, que solo usa `motivo` (`routes/clientes.ts:131-158`): join extra por cada `GET /clientes/:id` | `select: { id: true, motivo: true, createdAt: true }` (hoy basta `motivo`) |
| REV-10 | BAJO (cobertura) | `club-beasts-api/src/routes/auth.ts:57,65-72`; `tests/integration/auth-cliente-inactivo.test.ts:138-158`; `tests/integration/clientes-privacy.test.ts:262-273` | La respuesta 200 del login **no** expone `estado` (spec `:231-232`: "identica a HU-02"), pero **ningun test lo aserta**: ni el de privacidad (solo credenciales) ni el de regresion, ni el payload del JWT | `expect(body.cliente).not.toHaveProperty("estado")` + asercion analog sobre el JWT decodificado |
| REV-11 | SUGERENCIA | `club-beasts-web/src/app/portal/page.tsx:166` | `pinChangeInProgress.current = true` nunca se reinicia a `false`. Hoy es **inerte** porque `pinChangeSuccess` (`:106`) vuelve la pantalla de exito terminal en el mismo montaje (y el `Navbar` solo enlaza a `/`), pero cualquier refactor que reactive `pinChangeSuccess` dejaria el refresco de `GET /portal/resumen` deshabilitado para el resto del montaje (`:50`) | Reiniciar el ref en un `finally` del `onSuccess` o en el cleanup del efecto |
| REV-12 | BAJO | `club-beasts-web/src/app/portal/page.tsx:167-178`; `src/components/ChangePinForm.tsx:50-64` | `update()` se llama hasta 3 veces y **fuera** del `try/finally` del loop: si falla tras `api.auth.changePin` ya exitoso, el `catch` de `ChangePinForm` muestra "Error al cambiar el PIN." con el PIN **ya cambiado** y `debeCambiarPin` sigue `true` (salida posible: reintentar usando el PIN nuevo como actual; no bloqueante). En el caso feliz se emiten 2 `POST /api/auth/session` redundantes | Envolver `update()` en `try`, distinguir error de persistencia de error de cambio de PIN, y salir del loop en el primer `update()` exitoso |

### 6.3 Dictamen

**ACEPTA CON HALLAZGOS NO BLOQUEANTES.** No se encontro ningun hallazgo
bloqueante: los 14 criterios de la seccion 2 estan **cerrados** (12 con evidencia
ejecutada el 2026-10-19 y 2 marcados REF/no puntuables con la evidencia de
HU-05/HU-06 re-medida intacta), la base
anterior no perdio ni un test, la seguridad/privacidad exigidas por el spec
estan implementadas y verificadas, y las suites re-medidas cierran en verde
(fila 9). Los 12 hallazgos (1 MEDIO, 9 BAJO, 2 SUGERENCIA) son deudas de codigo,
de documentacion y de cobertura que **no afectan a ningun criterio incluido**.
La tarea 22 puede cerrar la fraccion real (max. +2) si Producto asume REV-01 como
follow-up; **no se certifica aqui ningun porcentaje**.

**R-A — ¿el 400 de `motivo` en la ruta (no en Zod) viola CONF-03?** **No.** El
**orden observable** es el ratificado (`spec.md:307-313` y `:569`): 401/403 del
preHandler (`routes/clientes.ts:199`) -> 400 de params (`:201-205`) -> 400 de body
Zod (`:209-213`) -> **400 de `motivo` (`:219-227`, dentro del paso de 400 body y
antes de la 404)** -> 404 (`:229-232`) -> 409 de matriz (servicio) -> 400 sede /
409 duplicado -> 200. La unica diferencia es el **mecanismo**: la regla vive en la
ruta y no en el `superRefine` del schema, y eso esta **documentado y ratificado**
en la propia nota de implementacion de `spec.md:440` (2026-10-19), porque el test
aceptado `tests/unit/cliente.schema.test.ts:150-155` exige que `{estado}` sin
`motivo` siga parseando a nivel de schema y porque ningun criterio Gherkin/REST
distingue ambas ubicaciones (misma postura que la incompatibilidad #9,
`spec.md:326-333`). La contradiccion de texto que queda (`:312-313`, `:329` y el
resumen de CONF-03 en `decisiones.md` todavia dicen "en Zod") es el hallazgo
**REV-03 (BAJO, documental)**; la fragilidad de diseño de dejar la regla fuera
del schema/servicio es **REV-02 (BAJO)**. Ninguno bloquea.

**R-B — el form siempre envia `estado`: ¿regresion de HU-05 o consecuencia
ratificada?** **Consecuencia ratificada del contrato, no regresion de HU-05, y no
bloquea.** Fundamento: (i) `INC04-PEND-02` opcion (a) se aprobo como "motivo
obligatorio en **todo** PATCH que traiga `estado`" y el propio spec dice
literalmente que eso "se registra como cambio de contrato en `decisiones.md`,
**no como regresion**" (`spec.md:555`, ratificado en DEC-035), con el riesgo
explicito `INC04-R01` y su mitigacion "tests aceptados actualizados, nunca
borrados" (`spec.md:579`, aplicado en la seccion 4.2 de este archivo); (ii) el
contrato del endpoint sigue siendo el de `spec.md:198-217` (body admite `motivo`;
si trae `estado` distinto se escribe historial en la misma transaccion; la
respuesta agrega `motivo` y `ultimoCambio`; `motivo` sin `estado` no se persiste,
CONF-07) y `spec.md:301-313` (el 400 de motivo es **paso de 400 body** antes de la
404), sin olvidar `spec.md:568-573` (CONF-02 no-op 200 sin registro, CONF-03
orden, CONF-04 mensajes, CONF-07 motivo viajero); (iii) el criterio `EST-06`
exige que el formulario envie `{estado, motivo}` y que pinte el 400 en
`role="alert"`, lo cual esta cumplido y ademas probado en 2 E2E y 1 unit; (iv) a
nivel **API** HU-05 sigue intacta: un PATCH **sin** `estado` no exige `motivo`
(`clientes.test.ts` sigue verde, 536/536). Lo que **si** cambio es la **UI**:
como `cliente-payload.ts:49` copia `estado` en todo payload (forma pre-existente
de INC-00) y `:57` solo anade `motivo` si no esta vacio, **todo** guardado de
staff pide ahora motivo, el copy de `page.tsx:247` es inexacto y el caso no tiene
cobertura. Ese es **REV-01 (MEDIO, no bloqueante)** porque no afecta a ningun
criterio incluido ni falla ninguna prueba, pero **debe convertirse en decision de
Producto/alcance** en la tarea 22 (diff de payload o validacion en cliente): si
Producto considera que "staff puede editar un campo sin motivo" es una garantia
aceptada de HU-05 que debe mantenerse en produccion, entonces si pasaria a
bloquear el cierre hasta corregir el payload.

**R-C — `pinChangeInProgress` + bucle drenar/escribir y `onSuccess` awaitable:
¿regresion de INC-03/DEC-025/DEC-027 o del flujo de PIN?** **No es regresion: es
un fix de carrera y el flujo de PIN queda mas deterministico.** Evidencia:
(i) `f2968c5` solo toca `src/app/portal/page.tsx`, `src/components/ChangePinForm.tsx`
y el spec ajeno; `src/lib/session-traffic.ts` **es pre-existente**
(commit `721c511`), aqui solo se reutiliza `holdSessionTraffic` /
`waitForSessionTrafficIdle`; (ii) los cambios viven en la rama de **cambio de PIN
obligatorio** (`portal/page.tsx:137-188`) y en el gate de exito (`:100-135`);
la rama completa del portal y el efecto de `GET /portal/resumen` (`:33-75`)
conservan el comportamiento INC03-POR-* y la rama INC-03 de error/reintento
(`:59-70,215-227`) sigue intacta; (iii) verificado en pruebas: los 47 E2E
aceptados (incluidos los 6 `INC03-POR-*` y el de sesion vencida) siguen verdes,
web **183/183**, `build` PASS y `cambio-pin-obligatorio.spec.ts` pasa de
**2/3 (1 flaky)** a **3/3** en las 2 corridas completas; (iv) la carrera que
remedia es la documentada en 5.2 (una `GET /api/auth/session` en vuelo re-firma
la cookie con `debeCambiarPin: true` despues del `update()`, misma clase que
GAP-009), por lo que el cambio **cierra** un defecto en lugar de introducir uno;
el `onSuccess` awaitable (`ChangePinForm.tsx:50-54`) solo prolonga el `loading`
hasta persistir el flag. Residuales no bloqueantes: **REV-11** (el ref nunca se
reinicia, hoy inerte) y **REV-12** (un fallo de `update()` tras cambiar el PIN
muestra un mensaje enganoso y deja 2 POST redundantes). DEC-025/DEC-027 no se
alteran: no se cambia el contrato del endpoint de cambio de PIN ni la politica de
sesion, solo la persistencia del flag en el cliente.

**R-D — ¿estan verificados los 14 criterios? ¿los 2 REF no son puntuables?**
**Si.** Los 14 criterios (`INC04-CLI-01..08` + `INC04-EST-01..06`) estan
**verificados con ejecucion** salvo los 2 marcados REF: `INC04-CLI-01` =
`HU08-C01` y `INC04-EST-01` = `HU17-C01`, que **no son puntuables en INC-04** por
la regla de no-duplicado (estado y filtro ya acreditados en HU-05/HU-06): los dos
documentos G14 los declaran `REF (base aceptada en HU-05/HU-06) / No (duplicado)`
(`HU-08-criterios-aceptacion.md:15,22-28`; `HU-17-criterios-aceptacion.md:9,15,22-28`),
el spec los deja `n/a` en la seccion 2 y **no se presentan pruebas nuevas como
si fueran suyas**. Su evidencia sigue siendo la de HU-05/HU-06, que aqui se
re-medio intacta (536/536 API y 153/153 Gherkin, con `clientes.test.ts` y
`clientes.feature` C13 en verde). Los **12 restantes** tienen evidencia ejecutada
el 2026-10-19: integracion (`clientes-estados.test.ts` 43/43,
`clientes-bloqueo-inactivo.test.ts` 10/10, `auth-cliente-inactivo.test.ts` 5/5),
Gherkin (`clientes-inactivacion.feature` 15/15 + `clientes-estados.feature` 12/12
dentro del total 153/153), unit web (`cliente-estados-payload.test.ts`,
`login-cliente-inactivo.test.tsx`, `cliente-edicion.test.tsx`, `api-errors.test.ts`)
y **E2E reales** (`inc04-estados-cliente.spec.ts` 4/4 y
`inc04-login-cliente-inactivo.spec.ts` 2/2, verdes en las 2 corridas completas).
Los 2 criterios REF/`n/a` de la seccion 2 (`INC04-CLI-01`, `INC04-EST-01`) no
cuentan como pendientes; **ningun criterio incluido quedo BLOQUEADO, opcional o
sin ejecutar**.

**Riesgos residuales (no bloqueantes).** REV-01 (UX del guardado de staff: la
decision queda en Producto); REV-04/REV-05 (carreras de concurrencia en
servicios y matriz, ventana pequena, trafico staff); REV-02/REV-08 (contrato de
`motivo` fuera del schema y eco del motivo viajero en no-op); REV-10/REV-12
(huecos de cobertura); REV-03/REV-07 (deriva documental de `spec.md`,
`decisiones.md` y de las secciones 1/5.2 de este archivo); `INC04-R10` (flaky de
base, hoy sin manifestacion: 56/56 x2).

**Acciones de la tarea 22 (orquestador) — TODAS EJECUTADAS 2026-10-19.** (1) Secciones
1, 8 y 5.2 reconciliadas con **56/56 x2** y el fix del portal marcado como **aplicado en
`f2968c5`** (REV-07); (2) REV-01 registrado como follow-up **PEND-004** en
`decisiones.md` y como riesgo en `avance.md` (no bloqueante: el contrato de API y los
criterios de INC-04 no dependen de el); (3) deriva REV-03 corregida en `spec.md`
(secciones "Orden de evaluacion" y nota `HU08-C03`) y en la CONF-03 de `decisiones.md`,
mas la nota de `actorId` sobre DEC-036; (4) REV-02/REV-04/REV-05/REV-06/REV-08/REV-10/
REV-12 triados como deuda tecnica en la tabla de riesgos de `avance.md` (REV-09/REV-11
como sugerencias). Cierre de la seccion 7 abajo.

## 7. Cierre (tarea 22, orquestador) — COMPLETADO 2026-10-19

Con revision sin bloqueantes (seccion 6) y evidencia completa (secciones 1-5). Fraccion
certificada: **+2** (HU-08 4/4 = 1.0; HU-17 3/3 = 1.0; los bullets de estado/filtro ya
cobrados en HU-05/HU-06 no se re-cobran).

| Artefacto | Cambio esperado | Estado |
|---|---|---|
| `docs/producto/avance.md` | Puntos certificados de INC-04 | **Hecho (2026-10-19)**: entrada de cierre +43/100, fila INC-04 ACEPTADO, tabla de avance 14 en bloque 2, riesgos REV-01..REV-12, siguiente accion = INC-05 |
| `docs/producto/mvp.md` | HU-08 y HU-17 por fraccion | **Hecho (2026-10-19)**: bloque 2 -> **14/15** (HU-08 4/4, HU-17 3/3), total -> **43**, ampliacion 2026-10-19 |
| `docs/producto/auditoria-puntos-inc00.md` | Nueva seccion de trazabilidad INC-04 (HU <-> criterios <-> evidencia) | **Hecho (2026-10-19)**: seccion 10 (10.1 HU-08 4/4, 10.2 HU-17 3/3, 10.3 totales 41 -> 43) |
| `docs/producto/decisiones.md` | `INC04-PEND-01..08` resueltas (DEC-034..) + `INC04-CONF-01..07` + no-duplicado | **Hecho**: DEC-034..041 y CONF-01..07 (2026-10-14); notas 2026-10-19 (CONF-03 enmendada por REV-03, `actorId` de DEC-036, follow-up **PEND-004**) |
