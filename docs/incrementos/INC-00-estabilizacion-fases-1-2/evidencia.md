# INC-00 - Evidencia

Este archivo se actualiza al ejecutar verificaciones. No registrar resultados no ejecutados.

Estado del incremento: **ACEPTADO** (2026-10-06). 29/29 criterios con revision sin hallazgos bloqueantes.

## Comandos de verificacion

Verificacion final reproducida por `code-reviewer` el 2026-10-06 (cifras nuevas respecto al corte 2026-10-05):

| Area | Comando | Fecha | Estado | Resultado |
|---|---|---|---|---|
| API Prisma | `npx prisma validate` | 2026-10-06 | Ejecutado | PASS, schema valido |
| API Prisma | `npx prisma generate` | 2026-10-06 | Ejecutado | PASS, Prisma Client v6.19.3 |
| API Prisma migracion | `npx prisma migrate status` | 2026-10-06 | Ejecutado | PASS, **5 migraciones aplicadas, 0 pendientes** (incluye `20261006235238_add_pin_reset_traceability`) |
| API Prisma drift | `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` | 2026-10-06 | Ejecutado | PASS, `No difference detected.` (exit 0) |
| API TypeScript | `npx tsc --noEmit` | 2026-10-06 | Ejecutado | PASS, exit code 0, 0 errores |
| API tests | `npx vitest run` | 2026-10-06 | Ejecutado | PASS, **16 archivos, 245 tests** (corte previo: 187) |
| API Gherkin | `npm run test:gherkin` | 2026-10-06 | Ejecutado | PASS, **63/63 ejecuciones expandidas, 0 omitidas, exit 0** (28 auth + 35 clientes) |
| API Gherkin guard | `CUCUMBER_OPTIONS="--tags @noexiste" npx vitest run -c vitest.cucumber.config.ts` | 2026-10-06 | Ejecutado | PASS (guard): 2 escenarios omitidos -> **exit 1** con `[INC00-QA-06] Alcance Gherkin incompleto` |
| Web TypeScript | `npx tsc --noEmit` | 2026-10-06 | Ejecutado | PASS, 0 errores |
| Web unit tests | `npx vitest run` | 2026-10-06 | Ejecutado | PASS, **14 archivos, 118 tests** (corte previo: 26/67) |
| Web build | `npm run build` | 2026-10-06 | Ejecutado | PASS con warnings conocidos (multiple lockfiles, jose Edge Runtime) |
| Web E2E | `npx playwright test` | 2026-10-06 | Ejecutado | PASS, **22/22** (chromium, API 3001 + Web 3000, SQLite aislada; corte previo: 16/16) |

Nota de estabilidad (riesgo R-09): la primera ejecucion de `npx vitest run` (web) de esta sesion, a las 22:01 y en paralelo con la bateria de la API, fallo 1 de 118 tests sin registrar el nombre del test. Las 18 corridas siguientes (6 seguidas, 1 con carga paralela reproducida, 8 con `--reporter=json` y 3 bajo carga de API vitest + tsc + gherkin) dieron 118/118. Queda abierto para QA capturar el fallo con reporter en CI.

## Estado de criterios

Todos los criterios de `spec.md` quedaron **ACEPTADOS** tras la re-revision final de `code-reviewer` (2026-10-06), que reprodujo la bateria de comandos anterior.

| Criterio | Estado | Base |
|---|---|---|
| INC00-SEC-01 | ACEPTADO | 403 por ficha ajena + listado CLIENTE 403; re-revision sin bloqueantes |
| INC00-SEC-02 | ACEPTADO | Permisos DUENO/RECEPCIONISTA cubiertos; re-revision sin bloqueantes |
| INC00-SEC-03 | ACEPTADO | Sin hash/PIN en respuestas cliente/auth/membresia; re-revision sin bloqueantes |
| INC00-SEC-04 | ACEPTADO | Reset persiste `pinResetPorId` + `pinResetAt` atomicos; prueba de trazabilidad funcional (actor DUENO y RECEPCIONISTA, PIN nuevo entra y el viejo da 401) en `tests/integration/auth-reset-traceability.test.ts` |
| INC00-AUTH-01..07 | ACEPTADO | Rework de recuperacion con compuerta de trafico de sesion (`session-traffic.ts`) + cierre confirmado (`session-recovery.ts`); E2E real `sesion-vencida.spec.ts` (401 `AUTH_TOKEN_EXPIRED` real, banner, cookie borrada, `callbackUrl`); controles positivos de AUTH-04/05/06/07 |
| INC00-CLI-01 | ACEPTADO | Validaciones de creacion incluida sede existente -> 400 sin fuga interna de Prisma (`expectSinDetalleInterno`) |
| INC00-CLI-02 | ACEPTADO | PATCH `sedeId`/`estado` con DUENO y RECEPCIONISTA; CLIENTE 403 sin mutacion; UI con selects de sede/estado |
| INC00-CLI-03 | ACEPTADO | `""`/blanco -> `null` en respuesta y BD; omitido = sin cambio; UI envia limpieza intencional |
| INC00-CLI-04 | ACEPTADO | Busqueda/filtros por cedula, nombre, sede y estado con incluido/excluido asertado por id |
| INC00-CLI-05 | ACEPTADO | UI con filtro de sede, paginacion real, estados vacio/error+reintento; E2E `clientes.spec.ts` |
| INC00-MEM-01..05, 07 | ACEPTADO | 31 tests de membresia verdes; sin regresion en la re-revision final |
| INC00-MEM-06 | ACEPTADO | Corregido el preset inclusivo (`fin = inicio + N - 1`); unit `membresia-fechas` + `membership-presets` y E2E `membresia.spec.ts` asertando 30 dias inclusivos |
| INC00-QA-01 | ACEPTADO | Cero `expect(true)` reales, cero skip/only; re-revision sin cambios |
| INC00-QA-02 | ACEPTADO | 5 specs E2E sin `isVisible()` condicional ni `waitForTimeout`; re-revision sin cambios |
| INC00-QA-03 | ACEPTADO | Fixtures incluido/excluido asertados por id en API, Gherkin y E2E |
| INC00-QA-04 | ACEPTADO | SQLite temporal con seed deterministico; suites repetidas 2 veces seguidas en verde |
| INC00-QA-05 | ACEPTADO | Evidencia de comandos API y web reproducida por el revisor (tabla superior) |
| INC00-QA-06 | ACEPTADO | Runner Gherkin real: 63/63 exit 0 + guard anti-skip exit 1; `features.test.ts` no se usa como sustituto |

## Evidencia RED registrada

Historico del corte 2026-10-05 (privacidad, aislamiento, sesion, membresia, QA) conservado en la version anterior de este archivo; se reproduce aqui el ciclo RED/GREEN del trabajo de cierre (2026-10-06):

| Fecha | Criterios | Comando | Resultado | Archivos |
|---|---|---|---|---|
| 2026-10-06 | INC00-MEM-06 (RED) | `npx vitest run tests/unit/membership-presets.test.tsx` (web) | RED esperado: 8/8 fallan; el DOM pintaba `hoy + N` (31/91/181/366 dias inclusivos) en vez de `hoy + (N-1)` | `club-beasts-web/src/components/MembershipSection.tsx` |
| 2026-10-06 | INC00-CLI-02, CLI-03, CLI-05 (RED) | `npx vitest run tests/unit/cliente-payload.test.ts clientes-lista.test.tsx` (web) | RED esperado: suites sin compilar (modulos inexistentes) + 11 tests fallando; `if (form.email)` omitia la limpieza y no existia paginacion ni filtro de sede | `club-beasts-web/src/lib/cliente-payload.ts`, `clientes-lista.ts`, `sedes.ts` (nuevos) |
| 2026-10-06 | INC00-MEM-06, CLI-02, CLI-03, CLI-05 (GREEN) | `npx vitest run` (web) | GREEN: **108 tests** (67 base + 41 nuevos); tsc 0 errores; build OK | `club-beasts-web/src/**`, `tests/unit/*` |
| 2026-10-06 | INC00-SEC-04 (RED) | `npx vitest run tests/integration/auth-reset-traceability.test.ts` | RED esperado: 2 failed / 4 (`pinResetPorId` y `pinResetAt` quedaban null) | `club-beasts-api/src/services/auth.service.ts`, `src/routes/auth.ts` |
| 2026-10-06 | INC00-SEC-04 (GREEN) | `npx vitest run tests/integration/auth-reset-traceability.test.ts` | GREEN: 4/4; actor y fecha atomicos; PIN nuevo entra, viejo 401; sin hash en respuestas | idem |
| 2026-10-06 | INC00-QA-06, D3 (RED) | `npm run test:gherkin` | RED esperado: **61/63, exit 1**; C05 esperaba `Nombres solo pueden contener letras y espacios` | `club-beasts-api/src/schemas/common.schema.ts` |
| 2026-10-06 | INC00-QA-06, D3 (GREEN) | `npm run test:gherkin` | GREEN: **63/63, exit 0** con `namesSchemaFor("Nombres"\|"Apellidos")` | `club-beasts-api/src/schemas/common.schema.ts`, `cliente.schema.ts` |
| 2026-10-06 | INC00-CLI-03 (RED) | `npx vitest run tests/integration/clientes-opcionales.test.ts` | RED esperado: 3 failed / 4 (`""` y `"   "` persistian como texto en vez de `null`) | `club-beasts-api/src/schemas/cliente.schema.ts`, `src/services/cliente.service.ts` |
| 2026-10-06 | INC00-CLI-03 (GREEN) | `npx vitest run tests/integration/clientes-opcionales.test.ts` | GREEN: 4/4 (respuesta y BD en `null`; omitido = sin cambio) | idem |
| 2026-10-06 | INC00-CLI-01 (RED) | `npx vitest run tests/integration/clientes.test.ts` | RED esperado: 2 failed / 29; `POST`/`PATCH` con `sedeId` inexistente devolvia **500 con `P2003`, ruta y fragmento de codigo** | `club-beasts-api/src/services/cliente.service.ts`, `src/routes/clientes.ts` |
| 2026-10-06 | INC00-CLI-01 (GREEN) | `npx vitest run tests/integration/clientes.test.ts` | GREEN: 29/29; 400 `VALIDATION_ERROR` sin detalle interno | idem |
| 2026-10-06 | INC00-AUTH-02, AUTH-03, GAP-009 (RED) | `npx playwright test tests/e2e/sesion-vencida.spec.ts` | RED real: 1 failed. 401 `AUTH_TOKEN_EXPIRED` obtenido, pero `signOut` + `GET /api/auth/session` en vuelo re-emitian la cookie -> bucle `/login <-> /clientes` (traza: `set-cookie Max-Age=0` seguido de `set-cookie Expires=+30d`) | `club-beasts-web/src/lib/session-recovery.ts`, `src/lib/api.ts` |
| 2026-10-06 | INC00-AUTH-01..07, GAP-009 (GREEN) | `npx playwright test` + `npx vitest run` (web) | GREEN: E2E **22/22** y web **118/118** (compuerta `session-traffic.ts`, `signOut({redirect:false})` + confirmacion de sesion cerrada antes de navegar) | `club-beasts-web/src/lib/session-traffic.ts` (nuevo), `src/lib/session-recovery.ts`, `tests/unit/session-traffic.test.ts`, `session-recovery-close.test.ts` |
| 2026-10-06 | INC00-QA-06 (certificacion) | `CUCUMBER_OPTIONS="--tags @noexiste" npx vitest run -c vitest.cucumber.config.ts` | Guard verificado: 2 omitidos -> exit 1 (impide que una corrida reducida quede verde) | `club-beasts-api/vitest.cucumber.config.ts` |

Evidencia de la migracion de trazabilidad (2026-10-06): `npx prisma migrate dev --name add_pin_reset_traceability` exit 0 (migracion creada y aplicada), `migrate status` 5/0, `migrate diff --exit-code` sin drift, `npx vitest run` 227/227 en el momento del cambio.

## Revisiones

| Fecha | Criterios | Revisor | Resultado | Hallazgos |
|---|---|---|---|---|
| 2026-10-05 | INC00-SEC-01, SEC-02, SEC-03 | code-reviewer | Bloquea aceptacion: si | Falta probar `GET /clientes` con CLIENTE, cobertura de SEC-03 incompleta, etiquetas de criterios mal alineadas, `any` en autorizacion |
| 2026-10-05 | INC00-SEC-01, SEC-02, SEC-03 | code-reviewer | Bloquea aceptacion: no | Re-revision sin bloqueantes; advertencia no bloqueante de `any` |
| 2026-10-05 | INC00-QA-04, QA-05 | code-reviewer | Bloquea aceptacion: si | Setup global rompia suites antiguas; faltaban fixtures |
| 2026-10-05 | INC00-QA-04, QA-05 | code-reviewer | Bloquea aceptacion: si | Aislamiento API resuelto; QA-05 sin evidencia web |
| 2026-10-05 | INC00-QA-04, QA-05 | code-reviewer | Bloquea aceptacion: no (veredicto vigente) | Migracion corregida, 4/0, sin drift; 187/187 API y 26/26 web reproducidos |
| 2026-10-05 | INC00-AUTH-01..07, QA-01, QA-03 | code-reviewer | Bloquea aceptacion: si, solo por AUTH-02 y AUTH-03 | B1: mensaje aprobado sin superficie en UI; B2: retorno sin prueba y carrera con `router.push` |
| 2026-10-05 | INC00-AUTH-01..07, INC00-MEM-01..07 (re-revision) | code-reviewer | **13 de 14 ACEPTA; MEM-06 NO ACEPTA** | B-1: el preset de 30 dias creaba 31 dias inclusivos (`MembershipSection.tsx:142,154,166`) y no estaba probado; NB-1..NB-10 (interleaving de concurrencia, sin E2E de expiracion, `any`, coherencia documental). Reprodujo: API 227/227, web 67/67, build, E2E 16/16 |
| 2026-10-06 | **Los 29 criterios de `spec.md` (re-revision final de cierre)** | code-reviewer | **Bloquea aceptacion: no. 29/29 ACEPTA** | **0 bloqueantes**, 12 no bloqueantes (NB-01..NB-12) y 8 riesgos residuales (R-01..R-08). Reprodujo: API 245/245, Gherkin 63/63 + guard exit 1, web 118/118, build OK, E2E 22/22, tsc 0/0, migrate 5/0. Archivos tocados: ninguno |

## Hallazgos de revision

| ID | Hallazgo | Estado | Evidencia de cierre |
|---|---|---|---|
| GAP-001 | Cliente puede consultar ficha ajena | **Cerrado** | `clientes-privacy.test.ts` 7 tests + re-revision SEC-01/02/03; cierre global de INC-00 |
| GAP-002 | Reset de PIN sin trazabilidad funcional completa | **Cerrado** | `auth-reset-traceability.test.ts` 4/4: `pinResetPorId` + `pinResetAt` atomicos, actor DUENO y RECEPCIONISTA, login con PIN nuevo y 401 con el viejo, sin hash; aceptado en re-revision final |
| GAP-003 | UI clientes incompleta (sede, paginacion, limpieza de opcionales) | **Cerrado** | Filtro de sede + paginacion real + limpieza intencional; `clientes-lista.test.tsx` 11, `cliente-edicion.test.tsx` 5, `cliente-payload.test.ts` 8; E2E `clientes.spec.ts` |
| GAP-004 | Recuperacion de sesion no centralizada desde el cliente HTTP | **Cerrado** | `session-recovery.ts` + `session-traffic.ts`; unit 118/118; E2E real de expiracion |
| GAP-005 | Carreras de sesion no cubiertas (401 tardio / concurrente) | **Cerrado** | Compupuerta de trafico + doble confirmacion de cierre; controles positivos AUTH-07; E2E `sesion-vencida.spec.ts` |
| GAP-006 | Membresias con riesgo de concurrencia en Postgres | **Abierto (riesgo R-01)** | SQLite no reproduce check-then-insert concurrente; no hay constraint de exclusión. Requiere estrategia en Postgres antes de produccion |
| GAP-007 | PATCH de membresias permite fecha vacia | **Cerrado** | 400 en Zod + `assertFechaEditable`; invariante en tests; aceptado |
| GAP-008 | Preset de 30 dias crea 31 dias | **Cerrado** | `membresia-fechas.ts` con `fin = inicio + N - 1`; unit (4 presets + bordes) y E2E asertando 30 dias inclusivos |
| GAP-009 | Sin E2E real de membresias ni de recuperacion de sesion | **Cerrado** | `membresia.spec.ts` (preset 30 dias + solape rechazado) y `sesion-vencida.spec.ts` (401 real + banner + cookie borrada); E2E 22/22 |
| GAP-010 | Tests con aserciones vacias, condiciones opcionales o filtros que aprueban sin datos | **Cerrado** | QA-01/02/03/04/05 aceptados; sin `expect(true)`, `isVisible()`, `waitForTimeout`, `skip/only` |
| GAP-011 | Gherkin no conectado como ATDD real | **Cerrado** | `npm run test:gherkin` 63/63 exit 0 con guard anti-skip exit 1; alcance en `gherkin-alcance.md` (DEC-014) |
| GAP-012 | BD de pruebas no aislada de desarrollo | **Cerrado** | SQLite temporal con seed deterministico en API y E2E; suites repetidas en verde |
| GAP-013 | AUTH-02: mensaje aprobado sin superficie observable en UI | **Cerrado** | `SessionExpiredBanner` con `role="alert"` + E2E real de expiracion |
| GAP-014 | AUTH-03: retorno sin prueba, guard sin cobertura, carrera con `router.push` | **Cerrado** | `redirect.test.ts` 12 pruebas + `resolveSessionExit` + E2E con `callbackUrl` verificado |

## Riesgos residuales (para `docs/producto/avance.md`)

| ID | Riesgo | Accion sugerida |
|---|---|---|
| R-01 | Sin constraint de solapamiento a nivel de BD (GAP-006): la integridad depende de transaccion + lock optimista, no reproducible en SQLite | Definir constraint/exclusión o `SELECT ... FOR UPDATE` en Postgres antes de produccion |
| R-02 | Migraciones generadas para SQLite mientras el objetivo declarado es PostgreSQL | Regenerar/validar historial de migraciones contra Postgres antes de desplegar |
| R-03 | Determinismo de filtros y orden en Postgres (`contains` sin insensitive, `orderBy` sin desempate) | Añadir desempate y definir sensibilidad de caso al migrar de motor |
| R-04 | Sin `setErrorHandler` global en Fastify y un `parse` lanzado en `GET membresias` (`index.ts:9-27`, `auth.ts:76-84,112-126`, `membresia.ts:84`) | Backlog: handler global con `mapPrismaError` + `safeParse` |
| R-05 | Documentacion de evidencia/avance desactualizada respecto a la ejecucion | Cerrado con esta consolidacion (2026-10-06) |
| R-06 | Sin ESLint/Prettier ni hooks git instalados, pese a lo declarado en `AGENTS.md` | Añadir configuracion o corregir la declaracion |
| R-07 | Compuerta de sesion "best effort" (timeout 3 s / deadman 10 s) | Garantia mejor-esfuerza con doble verificacion; documentada |
| R-08 | Sedes hardcodeadas en la UI (sin endpoint) y secretos locales de E2E | Decision de contrato registrada; ampliar lista o crear endpoint si crece el catalogue |

## Cierre

INC-00 se considera **cerrado y aceptado**: los 29 criterios de `spec.md` estan aceptados, la bateria de comandos (typecheck, unit, integracion, Gherkin, build y E2E) fue reproducida sin hallazgos bloqueantes por `code-reviewer` y no se requirio ningun cambio de alcance.

Los puntos del MVP no se certifican desde aqui: INC-00 tiene peso 0 en `docs/producto/mvp.md`. La asignacion de puntos a los bloques 1-3 exige la auditoria HU <-> codigo <-> criterios con evidencia, que realiza el orquestador en `docs/producto/avance.md`.
