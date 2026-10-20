# INC-04 - Evidencia

Estado del incremento: **RED medido, GREEN ejecutado y VERIFICADO medido el
2026-10-19 por `test-engineer` (tarea #20)**. La puerta de
entrada se cumplio el 2026-10-14 (`INC04-PEND-01..08` -> DEC-034..041, contrato
ratificado por `backend-developer`, `INC04-CONF-01..07` + regla de no-duplicado
registrados por el orquestador en `decisiones.md`). La fase RED quedo medida en la
seccion 3 (API 43/529, Gherkin 18/153 + guard 126!=153, web 6/183; base intacta); el
GREEN quedo commiteado en `c59179e` y la bateria de verificacion de la seccion 1 corre
**536/536 API, 153/153 Gherkin exit 0, 183/183 web, build PASS, tsc 0/0, migraciones
9/0**; E2E **55/56 en las 2 corridas** (base 47/47 + 6/6 INC-04 verdes; el unico rojo
es el spec ajeno, ver 5.2). El bug de producto del `authorize` que dejaba 2 E2E en
rojo quedo **resuelto y verificado** por `frontend-developer` (seccion 5.1) e
`INC04-CLI-04` quedo **Verde** (seccion 2). Quedan **2 notas abiertas**: (a) revision
`code-reviewer` (tarea 21, seccion 6; unico bloqueante de certificacion) y (b) el spec
ajeno `cambio-pin-obligatorio.spec.ts` cierra **2/3** tras su **fix suelto autorizado**
(1 fallo flaky preexistente y fuera de los puntos de INC-04, reportado en 5.2).
**Ningun punto se certifica hasta que las secciones 1-5 esten sin huecos y la seccion
6 no tenga bloqueantes.**

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
| 8 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base 47/47 + 6 INC-04 + 3 ajeno = 56/56 verdes | **Corrida A y B identicas (3.8m c/u): 56 tests -> 55 passed / 1 failed**, exit 1 en ambas. Desglose: base **47/47 verde intacta** + **6/6 E2E INC-04 verdes** + 2/3 del spec ajeno; **unico fallo = test 1 de `cambio-pin-obligatorio.spec.ts` (preexistente y ajeno, 2da capa, flaky: ver 5.2)**. **56/56 NO se alcanzo**: el fallo restante es del spec ajeno, fuera de los puntos de INC-04 y reportado. Base e INC-04 **sin flaky**: mismo fallo unico en A y B | 2026-10-19 |
| 9 | Revision | - | revision `code-reviewer` | sin hallazgos bloqueantes | Sin ejecutar (tarea 21) | - |
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
| **Todos** | `tsc` API y web 0/0, `vitest` API y web sobre la base intacta, `build`, `migrate status`, revision `code-reviewer` | RED: `tsc` API 0/0 y web 0/0; build/E2E/revision pendientes (GREEN) | **Verde 2026-10-19 salvo la revision**: `tsc` **0/0** (api y web), `vitest` API **536/536** y web **183/183** sobre la base intacta, Gherkin **153/153** exit 0, build **PASS**, `migrate status` **9/0 sin drift**, E2E base **47/47 + 6/6 INC-04** intactos en 2 corridas (55/56; el 56.o es el spec ajeno, 2da capa preexistente, ver 5.2). **Pendiente**: revision `code-reviewer` (tarea 21) |

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
estabilidad de la sesion antes de navegar. **No aplicada** por restriccion de la tarea
(solo el localizador del spec ajeno + este archivo) y por la instruccion de no reformar
nada mas del spec ajeno.

## 6. Revision (tarea 21, pendiente)

**Fecha**: - · **Revisor**: `code-reviewer` · **Base**: HEAD al abrir RED · **Dictamen**: -

### 6.1 Resultado por area del checklist

| Area del checklist | Resultado | Verificacion del revisor |
|---|---|---|
| Seguridad / DEC-001 | - | permisos de PATCH/membresias/ingreso; `CLIENTE` 403; ficha self-only con `PEND-08` |
| Privacidad | - | `motivo`/`ultimoCambio` no expuestos al rol `CLIENTE`; sin fuga de datos en el historial |
| No duplicado (HU-05/HU-06/DEC-030/HU-16) | - | sin puntos re-cobrados; criterios REF sin pruebas nuevas presentadas como nuevas |
| Regresion INC-03 / HU-02 / HU-05 | - | DEC-030 intacta; HU-02 intacta; HU-05 actualizado **solo** si `PEND-02`=(a) documentado |
| Coherencia de decisiones | - | `PEND-01..08` reflejadas en codigo; `CONF-01..07` aplicadas |
| Calidad de pruebas | - | sin `.only`/`.skip`/aserciones vacias; mensajes exactos con tildes; steps Gherkin con aserciones reales |
| Compilacion / suites | - | re-ejecucion de la seccion 1 |

### 6.2 Hallazgos

| ID | Severidad | Archivo:linea | Descripcion | Recomendacion |
|---|---|---|---|---|
| Sin registrar | | | | |

### 6.3 Dictamen

-

## 7. Cierre (tarea 22, orquestador) — pendiente

Solo con revision sin bloqueantes y evidencia completa. Fraccion real: **+2 max.** (HU-08:
1 si cierra 4/4; HU-17: 1 si cierra 3/3; los bullets de estado/filtro ya cobrados en
HU-05/HU-06 no se re-cobran).

| Artefacto | Cambio esperado | Estado |
|---|---|---|
| `docs/producto/avance.md` | Puntos certificados de INC-04 | Sin registrar |
| `docs/producto/mvp.md` | HU-08 y HU-17 por fraccion | Sin registrar |
| `docs/producto/auditoria-puntos-inc00.md` | Nueva seccion de trazabilidad INC-04 (HU <-> criterios <-> evidencia) | Sin registrar |
| `docs/producto/decisiones.md` | `INC04-PEND-01..08` resueltas (DEC-034..) + `INC04-CONF-01..07` + no-duplicado | Sin registrar |
