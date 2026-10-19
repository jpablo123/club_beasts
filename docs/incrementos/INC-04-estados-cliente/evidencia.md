# INC-04 - Evidencia

Estado del incremento: **RED** (ejecutado 2026-10-19 por `test-engineer`). La puerta de
entrada se cumplio el 2026-10-14 (`INC04-PEND-01..08` -> DEC-034..041, contrato
ratificado por `backend-developer`, `INC04-CONF-01..07` + regla de no-duplicado
registrados por el orquestador en `decisiones.md`). La fase RED quedo medida en la
seccion 3 (API 43/529, Gherkin 18/153 + guard 126!=153, web 6/183; base intacta).
GREEN y revision **todavia sin ejecutar**: **ningun punto se certifica hasta que las
secciones 1-5 esten medidas y la seccion 6 no tenga bloqueantes.**

Regla de cuenta (DEC-011/DEC-016): **sin evidencia de ejecucion no se certifica ningun
punto** ni se marca ningun criterio como verificado. **Base que permanece intacta al
cerrar** (medida en el cierre de INC-03, `docs/incrementos/INC-03-vencimiento-recepcion-portal/evidencia.md`):
API **471/471**, Gherkin **126/126**, web **174/174**, Playwright **47/47**, migraciones
**9/0 sin drift** (la 9ª, `20261014213742_add_cliente_estado_cambio`, ya aplicada y verificada por `database-admin` el 2026-10-19; ver 1.1). Ninguna base puede perder tests; los totales finales son la base mas
los tests nuevos.

## 1. Comandos de verificacion

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0, 0 errores | Sin ejecutar | - |
| 2 | GREEN | `club-beasts-api` | `npx vitest run` | base 471/471 intacta + tests nuevos en verde | Sin ejecutar | - |
| 3 | GREEN | `club-beasts-api` | `npm run test:gherkin` | base 126/126 + escenarios nuevos (guard actualizado en GREEN) | Sin ejecutar | - |
| 4 | Modelo | `club-beasts-api` | `npx prisma migrate status` | 0 pendientes, sin drift (base 8 migraciones) | Sin ejecutar | - |
| 5 | GREEN | `club-beasts-web` | `npx tsc --noEmit` | exit 0, 0 errores | Sin ejecutar | - |
| 6 | GREEN | `club-beasts-web` | `npx vitest run` | base 174/174 intacta + tests nuevos en verde | Sin ejecutar | - |
| 7 | Build | `club-beasts-web` | `npm run build` | PASS | Sin ejecutar | - |
| 8 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base 47/47 + nuevos, verde en ambas corridas | Sin ejecutar | - |
| 9 | Revision | - | revision `code-reviewer` | sin hallazgos bloqueantes | Sin ejecutar | - |
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
| `INC04-CLI-02` | Integracion: ficha 200 integra tras inactivar + busqueda por cedula + count de historial N -> N+1 + `DELETE /clientes/:id` 404; Gherkin | RED: 1 test integracion **falla**; Gherkin `clientes-inactivacion.feature:83` **falla** (:96 pasa solo porque el borrado fisico ya esta prohibido; no acredita el cambio de estado) | Sin registrar |
| `INC04-CLI-03` | Integracion: 200 con `motivo` + `actualizadoPorId` + `ultimoCambio` asertados en respuesta **y** BD (misma transaccion); 400 x3 mensajes; 404; 403 `CLIENTE`; unit web del payload | RED: 8 tests integracion (7 **fallan**, pasan 403 `CLIENTE` y 404) + unit web payload **falla**; Gherkin motivos **fallan** (`clientes-estados.feature:9,18,26,34`) | Sin registrar |
| `INC04-CLI-04` | Integracion: 401 `AUTH_CLIENTE_INACTIVO` sin token; PIN mal -> `AUTH_INVALID_CREDENTIALS`; ACTIVO -> 200 (regresion HU-02); unit web del mensaje; **E2E** de login bloqueado; Gherkin | RED: 1/5 tests **falla** (solo el 401 con codigo explicito; las 4 regresiones verdes); Gherkin `:9` **falla** (`:18`,`:26` verdes); web: mensaje en `role=alert` **falla** + `classifyError` INC04-R11 **falla** | Sin registrar |
| `INC04-CLI-05` | Integracion: 409 `CLIENTE_INACTIVO` sin fila creada (count sin cambio); 201 regresion; 404; Gherkin | RED: 3/10 tests **fallan** (409, orden CONF-06 solape, roles DEC-001); regresiones 201/404/403 verdes; Gherkin `:34` **falla** (`:44`,`:52` verdes) | Sin registrar |
| `INC04-CLI-06` | Integracion segun `PEND-07` (opcion (b): sin cambio; opcion (a): `GET /portal/resumen` -> 403 con sesion previa) | PEND-07 = (b) DEC-040: 1 test de regresion **verde** (sesion previa sigue 200) + Gherkin `:134` **verde**; sin pruebas nuevas | Sin registrar |
| `INC04-CLI-07` | Integracion: 403 `INGRESO_NO_PERMITIDO` con `INACTIVO` + membresia activa, sin fila; regresion de `INC03-ING-10` (`SUSPENDIDO`/`RETIRADO`); Gherkin | RED: 1/10 test **falla** (INACTIVO -> 403); regresiones INC03-ING-10 (2) verdes; Gherkin `:59` **falla** (`:72` verde) | Sin registrar |
| `INC04-CLI-08` | Integracion: `DUENO` y `RECEPCIONISTA` reactivan -> 200 + historial; `CLIENTE` -> 403; sin motivo -> 400; login vuelve 200; membresia-gym vuelve 201; Gherkin | RED: 3/4 tests **fallan** (DUENO, RECEPCIONISTA, sin motivo); `CLIENTE` 403 verde; Gherkin `:105`,`:116`,`:124` **fallan** | Sin registrar |
| `INC04-EST-01` | REF: evidencia ya aceptada de HU-05/HU-06; sin pruebas nuevas | n/a | n/a |
| `INC04-EST-02` | Integracion: `A -> B` con motivo persiste fila de historial con actor y fecha en la misma transaccion; Gherkin | RED: 2 tests **fallan**; Gherkin `clientes-estados.feature:42`,`:53` **fallan** | Sin registrar |
| `INC04-EST-03` | Integracion: 400 `Motivo es requerido cuando cambia el estado` y estado sin cambio; unit web del error en formulario; Gherkin | RED: 5 tests **fallan** (omitido, 1-2 chars, 201 chars, `""` literal D4, CONF-07); unit web 400 `role=alert` **falla**; Gherkin `:9`,`:18`,`:26`,`:34` **fallan** (el `:63` CONF-07 pasa porque hoy se ignora todo motivo) | Sin registrar |
| `INC04-EST-04` | Integracion: 3 cambios -> 3 registros ordenados (mas reciente primero) + datos base intactos + busqueda/filtro operativos + `DELETE` 404; Gherkin | RED: 1 test **falla**; Gherkin `clientes-estados.feature:72` **falla** | Sin registrar |
| `INC04-EST-05` | Integracion: matriz aprobada (200 permitidas, 409 `TRANSICION_INVALIDA` sin cambio, no-op 200 sin registro nuevo); Gherkin | RED: **25/25 celdas fallan** (la implementacion ignora `estado`); paridad literal matriz G14 vs spec **verde** (contrato importado intacto); Gherkin `:91`,`:102`,`:111` **fallan** (`:83` no-op pasa por accidente) | Sin registrar |
| `INC04-EST-06` | Unit web: formulario envia `{ estado, motivo }`; muestra el 400 con `role="alert"`; **E2E**: cambio de estado con motivo en navegador | RED: unit web payload **falla** (motivo ausente); campo Motivo y manejo del 400 en `cliente-edicion` **fallan** (2 tests nuevos); E2E pendiente por diseño (tarea #20, GREEN) | Sin registrar |
| **Todos** | `tsc` API y web 0/0, `vitest` API y web sobre la base intacta, `build`, `migrate status`, revision `code-reviewer` | RED: `tsc` API 0/0 y web 0/0; build/E2E/revision pendientes (GREEN) | Sin ejecutar |

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

## 4. GREEN (pendiente; registrar al consolidarlo)

| Fecha | Archivo | Cambio | Criterios |
|---|---|---|---|
| Sin registrar | | | |

### 4.1 Cierre de los gaps abiertos por el RED

| # | Gap | Cierre | Fecha |
|---|---|---|---|
| Sin registrar | | | |

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

Nota de fase: los tests aceptados API quedan **verdes** durante el RED porque el schema
`updateCliente` actual stripa el campo desconocido `motivo` (no lo rechaza ni lo
persiste); su asercion sobre los campos que ya existen sigue valiendo. Se documenta
como gap G-04 para que GREEN confirme la asercion con el contrato real. El test
aceptado web queda **rojo** en RED porque alli la asercion es sobre el payload enviado,
que si cambia con DEC-035. Ningun test aceptado fue eliminado ni marcado `skip`.

## 5. Verificacion final y E2E (pendiente)

| Spec E2E | Tests | Escenarios | Criterios | Estado (corrida 1 / corrida 2) |
|---|---:|---|---|---|
| Sin registrar | | | | |

Notas exigidas: sin `isVisible()` condicional, sin `waitForTimeout`, sin `skip`/`only`,
sin aserciones vacias; fechas relativas a `hoyBogota()`; 2 corridas consecutivas sin
flaky; base 47/47 intacta.

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
