# INC-03 - Evidencia

Estado del incremento: **VERIFICADO — GREEN consolidado y bateria E2E cerrada** (2026-10-14).
Historial: la puerta de entrada se cerro el 2026-10-10 (`INC03-PEND-01..08` resueltas,
DEC-026..033, contrato ratificado); el RED se registro el 2026-10-13 (secciones 2 y 3); el
GREEN se consolido el 2026-10-13/14 y la verificacion completa (incluidas las 2 corridas E2E)
se ejecuto y registro el **2026-10-14** (secciones 1, 4 y 5). Queda pendiente unicamente la
revision de `code-reviewer` (seccion 6, tarea 20): **ningun punto se certifica hasta entonces**.

Regla de cuenta (DEC-011/DEC-016): **sin evidencia de ejecucion no se certifica ningun punto**
ni se marca ningun criterio como verificado. Base que permanece intacta al cerrar: API
`379/379`, web `148/148`, Gherkin `63/63`, Playwright `30/30`
(`docs/incrementos/INC-02-congelacion-hu-15/evidencia.md`) — verificada en las corridas GREEN
de 2026-10-14 (los conteos totales son la base mas los tests nuevos; ninguna base perdio tests).

## 1. Comandos de verificacion

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0, 0 errores | **PASS (exit 0)** | 2026-10-14 |
| 2 | GREEN | `club-beasts-api` | `npx vitest run` | base 379/379 intacta + los 92 tests nuevos en verde | **26 archivos, 471/471 PASAN**, exit 0 | 2026-10-14 |
| 3 | GREEN | `club-beasts-api` | `npm run test:gherkin` | base 63/63 + 63 escenarios nuevos = 126 | **7 archivos (`.feature`), 126/126 PASAN**, exit 0 (guard `INC00_SCENARIO_COUNT = 126`) | 2026-10-14 |
| 4 | Modelo | `club-beasts-api` | `npx prisma migrate status` | 0 pendientes, sin drift | **8 migraciones, 0 pendientes** ("Database schema is up to date!"); `20261013220244_add_ingresos_y_perfil_pendiente` + `20261013224545_add_user_sede` | 2026-10-14 |
| 5 | GREEN | `club-beasts-web` | `npx tsc --noEmit` | exit 0, 0 errores | **PASS (exit 0)** | 2026-10-14 |
| 6 | GREEN | `club-beasts-web` | `npx vitest run` | base 148/148 intacta + los 26 tests nuevos en verde | **20 archivos, 174/174 PASAN**, exit 0 | 2026-10-14 |
| 7 | Build | `club-beasts-web` | `npm run build` | PASS | **PASS (exit 0)**: compilado + 11 paginas generadas (incluye `/recepcion` y `/portal`) | 2026-10-14 |
| 8 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base 30/30 + 17 nuevos = 47, verde en ambas corridas | **Corrida 1: 47/47 PASAN (3.2m), exit 0. Corrida 2: 47/47 PASAN (3.0m), exit 0** | 2026-10-14 |
| 9 | Revision | - | revision `code-reviewer` | sin hallazgos bloqueantes | **Sin ejecutar** (tarea 20; se abre con esta evidencia) | - |

Nota de integridad: las filas 1 a 8 se re-ejecutaron y se midieron el 2026-10-14 para esta
evidencia (no se transcriben corridas previas); el RED con sus conteos granulares sigue
registrado en las secciones 2 y 3. La base INC-02 (`379`/`148`/`63`/`30`) permanece verde: los
totales son la base mas los tests nuevos (`+92` API, `+63` escenarios, `+26` web, `+17` E2E).
Correccion de errata del encabezado previo: la base web de INC-02 es `148/148` (no `147`), tal
como ya constaba en las filas 2/6 de la tabla RED.

Verificacion extra del DBA (2026-10-13): `npx prisma validate` PASS, `npx prisma generate` PASS, `npx tsx prisma/seed.ts` PASS (seed sin cambios; F13/F14 cubiertos).

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

## 2. Evidencia por criterio (RED registrado 2026-10-13; GREEN verificado 2026-10-14)

Cada fila describe la evidencia **RED** que abrio el criterio (historico, se conserva). El
GREEN consolidado esta en la seccion 4 y la ejecucion medida en la seccion 1 (todas las filas
ROJAS del RED quedaron verdes el 2026-10-13/14: 86 API + 26 web + 63 escenarios).

| Criterio(s) | Evidencia minima requerida | Estado |
|---|---|---|
| `INC03-VEN-01`, `INC03-VEN-02` | Integracion API: bordes `fechaFin`/`fechaFin+1` en listado y ficha; Gherkin | **RED**: 5 tests verdes sobre lecturas existentes (red de seguridad del refactor) + 7 escenarios Gherkin en rojo |
| `INC03-VEN-03` | Integracion API (portal + recepcion) + **E2E** de las 3 superficies + Gherkin | **RED**: integracion + Gherkin en rojo; E2E pendiente de GREEN |
| `INC03-VEN-04` | Integracion API + **E2E** del bloqueo observable (DEC-026: portal `VENCIDA` sin acceso + ingreso 403; login intacto) | **RED**: tests de ingreso 403 y portal en rojo; E2E pendiente |
| `INC03-VEN-05` | Integracion: mismo estado en ficha, listado, portal y recepcion (mismo fixture) | **RED**: test explicito falla por la divergencia real de la ficha (sin pausas) — GREEN debe cerrarlo |
| `INC03-POR-01..04`, `INC03-POR-06`, `INC03-POR-07` | Integracion API + unit web del portal + **E2E** + Gherkin | **RED**: API 11F/1P, web portal 8F, Gherkin 6 escenarios en rojo |
| `INC03-POR-05` | Integracion 401/403/200 + unit del guard + E2E de rol | **RED**: incluido en `portal.test.ts` + unit web |
| `INC03-REC-01..04`, `INC03-REC-06..10` | Integracion API + unit de la pantalla + **E2E** + Gherkin | **RED**: API 22F, web consulta 7F, Gherkin 12 escenarios en rojo |
| `INC03-REC-05` | Integracion + unit + E2E + Gherkin (alertas derivadas, DEC-028) | **RED**: cubierto en los mismos archivos (alertas `ESTADO_CLIENTE`/`MEMBRESIA_VENCIDA`) |
| `INC03-ING-01..09`, `INC03-ING-11` | Integracion API (todas las ramas) + unit del boton + **E2E** + Gherkin | **RED**: API 29F, web ingreso 5F, Gherkin 18 escenarios en rojo |
| `INC03-ING-10` | Integracion (403 `SUSPENDIDO`/`RETIRADO`, DEC-030) | **RED**: incluido en `recepcion-ingresos.test.ts` |
| `INC03-RAP-01..07` | Integracion API + unit del formulario + **E2E** + Gherkin | **RED**: API 22F (sede default depende de `User.sedeId`, ver gap), web rapida 6F, Gherkin 10 escenarios en rojo |
| `INC03-RAP-03` | Integracion de `PATCH /clientes/:id` + unit de la marca (limpieza con `email`, DEC-033) | **RED**: incluido en API y web |
| Todos | `tsc` API y web, `vitest` API y web, `build`, `migrate status`, revision `code-reviewer` | RED: tsc 0/0, migrate 0 pendientes, vitest con rojos intencionales; build/E2E/revision tras GREEN |

## 3. RED (registrado 2026-10-13)

| Fecha | Archivo(s) nuevo(s) | Tests | Fallan | Pasan | Criterios | Notas |
|---|---|---:|---:|---:|---|---|
| 2026-10-13 | `club-beasts-api/tests/integration/portal.test.ts` | 12 | 11 | 1 | `POR-01..07`, `VEN-03`, `VEN-04` | 404 ruta inexistente; el verde es la guarda de login DEC-026 |
| 2026-10-13 | `club-beasts-api/tests/integration/recepcion-consulta.test.ts` | 22 | 22 | 0 | `REC-01..10` | alertas DEC-028 asertadas |
| 2026-10-13 | `club-beasts-api/tests/integration/recepcion-ingresos.test.ts` | 29 | 29 | 0 | `ING-01..11`, `VEN-04` | mensajes exactos con tildes |
| 2026-10-13 | `club-beasts-api/tests/integration/recepcion-rapida.test.ts` | 22 | 22 | 0 | `RAP-01..07` | DEC-031/032/033 |
| 2026-10-13 | `club-beasts-api/tests/integration/vencimiento.test.ts` | 7 | 2 | 5 | `VEN-01,02,05` | 5 verdes = red de seguridad sobre lecturas existentes; `VEN-05` falla por la divergencia real de la ficha |
| 2026-10-13 | `club-beasts-web/tests/unit/portal-estado.test.tsx` | 8 | 8 | 0 | `POR-*`, `VEN-03/04` | hardcode "Activo" expuesto |
| 2026-10-13 | `club-beasts-web/tests/unit/recepcion-consulta.test.tsx` | 7 | 7 | 0 | `REC-*` | import dinamico de `@/app/recepcion/page` (inexistente) |
| 2026-10-13 | `club-beasts-web/tests/unit/recepcion-ingreso.test.tsx` | 5 | 5 | 0 | `ING-*` | idem |
| 2026-10-13 | `club-beasts-web/tests/unit/recepcion-rapida.test.tsx` | 6 | 6 | 0 | `RAP-*` | idem |
| 2026-10-13 | `club-beasts-api/features/{vencimiento,portal,recepcion-consulta,recepcion-ingresos,recepcion-rapida}.feature` + 7 steps `inc03-*` | 63 escenarios | 63 | 0 (base) | todos | base 63/63 verde; traducciones G14 aplicadas (sin `/api`, sedes reales, fechas dinamicas, DEC-026 sin login-401) |
| - | **Total RED** | 92 API + 26 web + 63 escenarios | 86 API + 26 web + 63 esc. | 6 API + 148 web base + 63 esc. base | - | base intacta en los tres suites |

Exigencias del RED cumplidas: conteo granular registrado; **base 379/379, 148/148 y Gherkin 63/63 permanecen verdes**; grep confirmo que `src/routes/portal.ts` y `src/routes/recepcion.ts` no existian; cero cambios en `src/` durante el RED.

### Gaps abiertos por el RED (para el GREEN)

| # | Gap | Responsable | Bloquea |
|---|---|---|---|
| GAP-RED-01 | `User.sedeId` no existe en el schema: DEC-031 (default de sede del recepcionista) necesita la columna + relacion + backfill del seed del RECEPCIONISTA | database-admin (enmienda de migracion) | `RAP-01` sin `sedeId` y 1 escenario Gherkin |
| GAP-RED-02 | `world.ts` (hooks Gherkin) choca con FKs de `Ingreso`/`MembresiaGym` en la limpieza de `cliente.deleteMany` | test-engineer (autorizado por el orquestador en GREEN) | aislamiento de los 63 escenarios nuevos |
| GAP-RED-03 | Guard `INC00_SCENARIO_COUNT = 63` en `vitest.cucumber.config.ts` debe pasar a **126** al consolidar el GREEN | test-engineer/backend (autorizado en GREEN) | `npm run test:gherkin` exit 0 final |
| GAP-RED-04 | `selectFichaCliente` no expone `perfilPendiente` (lectura de `RAP-02/03` en `GET /clientes/:id`) | backend-developer (GREEN) | verdes de RAP-02/03 |

## 4. GREEN (consolidado 2026-10-13/14; medido el 2026-10-14)

| Fecha | Archivo | Cambio | Criterios |
|---|---|---|---|
| 2026-10-13 | `club-beasts-api/prisma/schema.prisma` + migracion `20261013220244_add_ingresos_y_perfil_pendiente` | entidad `Ingreso`, `perfilPendiente` en `Cliente` (DEC-032; sin `foto`, DEC-029) | `ING-*`, `RAP-01/02` |
| 2026-10-13 | `club-beasts-api/prisma/schema.prisma` + migracion `20261013224545_add_user_sede` | `User.sedeId` (FK `Sede`, opcional) + backfill del RECEPCIONISTA en `prisma/seed.ts` (`sede-1`) | cierra **GAP-RED-01**, `RAP-01` |
| 2026-10-13 | `club-beasts-api/src/routes/recepcion.ts` + `src/schemas/recepcion.schema.ts` (nuevos) | consulta, ingresos (POST+GET), clientes-rapidos | `REC-*`, `ING-*`, `RAP-*` |
| 2026-10-13 | `club-beasts-api/src/routes/portal.ts` + `src/schemas/portal.schema.ts` (nuevos) | `GET /portal/resumen` | `POR-*` |
| 2026-10-13 | `club-beasts-api/src/services/membresia.service.ts`, `cliente.service.ts`, `src/index.ts` | fuente unica de estado (`resolverEstadoAcceso`), guardas de vigencia, servicio de ingresos, registro de rutas | `VEN-*`, todos |
| 2026-10-13 | `club-beasts-api/src/routes/auth.ts` + `auth.service.ts` | **sin modificacion** (DEC-026: login intacto; `git status` no los lista) | `VEN-04` |
| 2026-10-13 | `club-beasts-api/vitest.cucumber.config.ts` | guard `INC00_SCENARIO_COUNT = 63 -> 126` | cierra **GAP-RED-03** |
| 2026-10-13 | `club-beasts-api/features/support/world.ts` | limpieza respetuosa con FKs de `Ingreso`/`MembresiaGym` | cierra **GAP-RED-02** |
| 2026-10-13 | `club-beasts-web/src/app/portal/page.tsx` | datos reales; elimina el `"Activo"` hardcodeado (linea 122) | `VEN-03`, `POR-*` |
| 2026-10-13 | `club-beasts-web/src/app/recepcion/`, `src/components/recepcion/`, `src/components/EstadoAccesoBadge.tsx` (nuevos) | consulta, ingreso, alta rapida, badge de estado | `REC-*`, `ING-*`, `RAP-*` |
| 2026-10-13 | `club-beasts-web/src/lib/api.ts` | clientes del portal/recepcion en el cliente API | `POR-*`, `REC-*`, `ING-*`, `RAP-*` |
| 2026-10-14 | `club-beasts-web/tests/e2e/start-api-e2e.mjs` (**fixture E2E**) | el RECEPCIONISTA del seed E2E recibe `sedeId: "sede-1"` (espejo de `prisma/seed.ts`) | **desviacion justificada**: el alta rapida sin `sedeId` respondia `400 sedeId es requerido` porque el fixture no acompano el GREEN de GAP-RED-01; corregir el fixture, no el producto (DEC-031/spec #5) |
| 2026-10-14 | `club-beasts-web/tests/e2e/e2e-helpers.ts` | helpers INC-03: `crearVigenciaApi`, `congelarApi`, `fijarPinApi`, `crearClientePortalApi`, `loginComoClienteCon`, `cardCon` | `POR-*`, `REC-*`, `ING-*`, `RAP-*`, `VEN-*` |
| 2026-10-14 | **Totales GREEN (medidos)** | API `tsc` 0/0 · API `471/471` · Gherkin `126/126` · web `tsc` 0/0 · web `174/174` · build PASS · migraciones 8/0 pendientes · **E2E `47/47` x2 corridas** | todos |

### 4.1 Cierre de los gaps abiertos por el RED

| # | Gap | Cierre | Fecha |
|---|---|---|---|
| GAP-RED-01 | `User.sedeId` inexistente | migracion `20261013224545_add_user_sede` + backfill del RECEPCIONISTA en `prisma/seed.ts` (+ fixture E2E el 2026-10-14, ver fila anterior) | 2026-10-13/14 |
| GAP-RED-02 | FKs de `world.ts` en la limpieza Gherkin | hooks ajustados; los 126 escenarios corren aislados | 2026-10-13 |
| GAP-RED-03 | guard de conteo de escenarios | `INC00_SCENARIO_COUNT = 126`; `npm run test:gherkin` exit 0 | 2026-10-13 |
| GAP-RED-04 | `selectFichaCliente` sin `perfilPendiente` | select actualizado; lectura de `RAP-02/03` verde en API, web y E2E | 2026-10-13 |

### 4.2 Observaciones de verificacion (no bloqueantes, para la revision)

1. **`DUENO` sin sede no puede usar el alta rapida.** El contrato ratificado (spec INC-03
   #5) dice: `sedeId` opcional, default = `User.sedeId` del token; si el usuario no tiene
   sede -> `400 "sedeId es requerido"`. En el seed (dev y E2E) solo el RECEPCIONISTA tiene
   sede: un `DUENO` que use el formulario recibira ese 400. Es comportamiento **conforme al
   contrato**, pero conviene decidir si el DUENO debe tener sede por defecto o si la UI debe
   ofrecer selector de sede. Por eso los E2E de `RAP-*` operan con `recep@clubbeasts.com`.
2. El `web vitest` emite avisos `act(...)` en `recepcion-consulta/rapida.test.tsx` (React
   Testing Library); son warnings de ruido, **0 fallos**, fuera del alcance de esta tarea.

## 5. Verificacion final y E2E (tarea 19)

Ejecutado el **2026-10-14** con `cd club-beasts-web && npx playwright test --reporter=line`
(dos corridas consecutivas; API E2E SQLite aislada por corrida + Next dev levantados por
`tests/e2e/start-api-e2e.mjs`, `workers: 1`, `reuseExistingServer: false`).

| Spec E2E | Tests | Escenarios | Criterios | Estado (corrida 1 / corrida 2) |
|---|---:|---|---|---|
| `portal.spec.ts` (extendido; los 3 tests base intactos) | 8 | activa, congelacion vigente, sin vigencia, extremos `fechaInicio-1`/`fechaFin`/`fechaFin+1`, 401/403 + redireccion staff | `VEN-03`, `POR-01..07` | VERDE / VERDE |
| `recepcion.spec.ts` (nuevo) | 5 | consulta+historial (2 ingresos), rechazos 400/404, vencido con alertas DEC-028, respuesta sin campos sensibles, guard CLIENTE (UI + 403/401) | `VEN-03`, `REC-01..10`, `ING-01..05` | VERDE / VERDE |
| `recepcion-creacion-rapida.spec.ts` (nuevo) | 4 | minimo de 4 campos sin `select` (DEC-031), completar perfil con email (DEC-033), duplicado 409, telefono invalido 400 | `RAP-01..07`, `DEC-031..033` | VERDE / VERDE |
| `acceso-vencimiento.spec.ts` (nuevo) | 3 | login vencido 200 (nunca 401) + PIN incorrecto 401, portal `Vencido` sin acceso, ingreso 403 `INGRESO_NO_PERMITIDO` + alert | `VEN-04`, `DEC-026` | VERDE / VERDE |
| `acceso-roles`, `auth`, `clientes`, `congelacion`, `membresia`, `sesion-vencida` (base INC-02, intactos) | 27 | regressions de INC-00/01/02 | base | VERDE / VERDE |
| **Suite completa** | **47** | base INC-02 `30/30` intacta (27 en los specs sin tocar + los 3 de `portal.spec.ts` conservados tal cual) + 17 nuevos = 8+5+4+3+27 | todos | **47/47 PASAN (3.2m), exit 0 / 47/47 PASAN (3.0m), exit 0** |

Notas de la tarea 19:

- **Trazabilidad RED/GREEN**: el RED de este incremento se ejecuto y registro en API y web
  unit/integracion (secciones 2 y 3: 86 + 26 rojos + 63 escenarios); los E2E **no se
  ejecutaron en RED** (requieren la app levantada y las rutas ya implementadas), por eso la
  fila 8 quedo en "Sin ejecutar" hasta hoy. Los 17 tests E2E nuevos se escribieron contra el
  contrato ratificado (spec #2/#5/#7) y se corrieron por primera vez el 2026-10-14, donde
  hallaron **3 fallos reales de fixture** (no de producto): el seed E2E no asignaba
  `User.sedeId` al recepcionista (GAP-RED-01 se cerro en `prisma/seed.ts` pero no en el
  fixture). Diagnostico y correccion en la seccion 4 (fila 2026-10-14) y 4.2.
- Sin `isVisible()` condicional, sin `waitForTimeout`, sin `skip`/`only`, sin aserciones
  vacias; fechas relativas a `hoyBogota()` (`America/Bogota`, offset fijo -05:00).
- Las 2 corridas consecutivas sin flaky confirman el aislamiento: cada corrida crea su propia
  base SQLite temporal, siembra usuarios/clientes/sedes y levanta API + Next propios.

## 6. Revision (tarea 20)

**Fecha**: 2026-10-14 · **Revisor**: `code-reviewer` · **Base**: HEAD `e952c8f` (cierre INC-02)
+ worktree GREEN consolidado 2026-10-14 · **Dictamen**: **ACEPTA CON HALLAZGOS NO BLOQUEANTES**

Checklist ejecutado contra el spec INC-03 (40 criterios, DEC-026..033 y CONF-01..06
ratificadas). Verificacion previa al dictamen re-ejecutada por el revisor: API
`tsc` 0/0 + `471/471`, Gherkin `126/126`, web `tsc` 0/0 + `174/174`, Playwright `47/47`
— todos exit 0, coinciden con las secciones 1/4/5.

### 6.1 Resultado por area del checklist

| Area del checklist | Resultado | Verificacion del revisor |
|---|---|---|
| Seguridad / DEC-001 | **OK** | `portal.ts` con `authenticateRoles(["CLIENTE"])`; las 4 rutas de `recepcion.ts` con `STAFF_ROLES = ["DUENO","RECEPCIONISTA"]`; token CLIENTE -> 403 en consulta/ingresos/rapida y en staff del portal; `GET /clientes/:id` conserva el guard CLIENTE self-only; `auth.ts`/`auth.service.ts` intactos (`git status` no los lista, DEC-026) |
| Privacidad / R-11 / DEC-028 | **OK** | `selectFichaCliente` expone solo `creadoPorId` (sin relation User: sin nombre/email); `creadoPor {id, nombre}` solo en `selectClienteUpdate` (PATCH staff) y `selectClienteRapido` (POST staff). `REC-10` recorre el cuerpo serializado y aserta ausencia de pin/hash/email/telefono/anamnesis. DEC-028: alertas unicamente `ESTADO_CLIENTE`/`MEMBRESIA_VENCIDA` derivadas del estado, sin texto libre |
| Fechas / DEC-005/006 | **OK** | Fuente unica `getTodayBogota`/`getHoraBogota` (offset fijo -05:00, correcto para America/Bogota sin DST); bordes `fechaFin` y `fechaFin+1` probados en integracion, Gherkin y E2E (extremos del portal) |
| Coherencia DEC-017/025..033 | **OK** | DEC-025/CONF-02: CONGELADO con acceso (`calcularEstado` calcula CONGELADO; sin bloqueo); DEC-030: orden 404 -> 400 sede -> 403 estado -> 403 vigencia verificado en `recepcion.ts`; DEC-029: sin columna `foto`, contrato con `foto: null`; DEC-031/032/033 mapeados en `crearClienteRapido`/`updateCliente` |
| No duplicado HU-16 vs bloque 4 | **OK** | Efecto "vencido = sin acceso" acreditado solo en HU-16 (VEN-03/04 + rama ING-04); bloque 4 solo contrato/pintado. Fuente unica de estado `resolverEstadoAcceso` consumida por listado, ficha, portal y recepcion |
| Calidad de pruebas | **OK** | Grep global sin `.only`/`.skip`/`isVisible()`/`waitForTimeout`/`expect(true)`; pasos Gherkin con aserciones reales (status, codes y mensajes exactos); E2E de VEN-04 sin pasos opcionales; fixtures aisladas por prefijo de cedula; limpieza Gherkin respetuosa con FKs |
| Alcance | **OK** | `git status`/diff limitados a INC-03 (rutas, servicios, migraciones, tests, UI recepcion/portal, docs del incremento y de producto). Nada de anamnesis/rutinas/nutricion/INC-04/05. Congelacion consumida solo en lectura (secuencia de pausas para el estado) |
| Compilacion / suites | **OK** | Re-ejecutado por el revisor: 0 errores de tipo y suites completas en verde en ambos paquetes |

### 6.2 Hallazgos (ninguno bloqueante)

| ID | Severidad | Archivo:linea | Descripcion | Recomendacion |
|---|---|---|---|---|
| INC03-REV-01 | MEDIO | `club-beasts-api/src/routes/recepcion.ts:357-369`; `tests/integration/recepcion-rapida.test.ts` | La rama del contrato ratificado "DUENO sin `User.sedeId` y sin `sedeId` en el body -> `400 sedeId es requerido`" no tiene integration test propio (el mensaje solo se prueba en ING-08, ruta distinta). Comportamiento conforme al spec #5 y ya documentado en 4.2.1 | Agregar 1 test de integracion que llame `POST /recepcion/clientes-rapidos` con token de un DUENO sin sede y aserta 400 + mensaje exacto (0 escritura) |
| INC03-REV-02 | BAJO | `club-beasts-api/tests/setup-isolated-sqlite.ts` vs `club-beasts-api/prisma/seed.ts` y `club-beasts-web/tests/e2e/start-api-e2e.mjs` | Divergencia de fixtures: el seed de vitest siembra sede al DUENO; el seed real y el fixture E2E solo al RECEPCIONISTA. Hace que la rama REV-01 pase en vitest pero no sea representativa del entorno E2E/prod | Unificar: quitar sede al DUENO en `setup-isolated-sqlite.ts` (o asignarla en todos los seeds) para que las tres superficies midan lo mismo |
| INC03-REV-03 | BAJO | `club-beasts-web/src/lib/api.ts` (metodo `portal.resumen`); `club-beasts-web/src/app/portal/page.tsx:34` | `api.portal.resumen()` devuelve `Record<string, unknown>` y la pagina necesita `as unknown as PortalResumen` | Tipar el metodo con generico (`fetchApi<PortalResumen>`) y eliminar el cast doble en la pagina |
| INC03-REV-04 | BAJO | `club-beasts-api/tests/integration/recepcion-consulta.test.ts:407` | El titulo del test dice "SUSPENDIDO + VENCIDA" pero la fixture usa `estado: "RETIRADO"`; la asercion es correcta (mensaje exacto RETIRADO) | Renombrar el titulo a "RETIRADO + VENCIDA" para que titulo y fixture coincidan |
| INC03-REV-05 | SUGGERIMENTO | `club-beasts-web/tests/e2e/acceso-vencimiento.spec.ts:66` | Comentario con phrasing impreciso ("DEC-026 lo prohíbe bloquear") | Reescribir: "DEC-026 prohibe bloquear el login por vencimiento" |

### 6.3 Riesgos residuales (asumidos, no bloquean)

1. **R-01 (conocido)**: `POST /recepcion/ingresos` hace check-then-create sobre la vigencia; bajo SQLite single-writer y un solo desarrollador el TOCTOU es despreciable, pero dos requests concurrentes podrian registrar un ingreso justo despues de un cambio de vigencia. Consistente con el riesgo abierto del stack, no lo agrava INC-03.
2. **DUENO sin sede en alta rapida** (REV-01/REV-02 + observacion 4.2.1): en el seed real un DUENO recibira el 400 del contrato; es comportamiento conforme, pero Producto debe decidir si el DUENO recibe sede por defecto o si la UI ofrece selector. Mientras, los E2E de RAP-* operan con RECEPCIONISTA (justificado).
3. **Offset fijo -05:00** en `getHoraBogota`: correcto para America/Bogota (Colombia sin DST); si el proyecto cambiara de zona horaria hay que revisar la funcion.
4. Avisos `act(...)` de React Testing Library en los unit web de recepcion (ruido, 0 fallos; ya documentado en 4.2.2).

### 6.4 Dictamen

**ACEPTA CON HALLAZGOS NO BLOQUEANTES.** Los 5 hallazgos de 6.2 son mejoras de cobertura/calidad sin afectar criterios incluidos: el comportamiento de los 40 criterios esta implementado, verificado con evidencia de ejecucion (secciones 1/4/5) y libre de fugas de datos sensibles. **Ningun hallazgo bloquea la aceptacion**; la tarea 21 (cierre y certificacion de puntos por el orquestador) puede proceder, incorporando REV-01/REV-02 como trabajo de follow-up.

## 7. Cierre (tarea 21, orquestador) — ejecutado 2026-10-14

| Artefacto | Cambio esperado | Estado |
|---|---|---|
| `docs/producto/avance.md` | +11 puntos **solo si** la revision no bloquea y hay evidencia completa | **Hecho (2026-10-14)**: revision ACEPTA sin bloqueantes + evidencia completa -> **+11 certificados (30 -> 41)** |
| `docs/producto/mvp.md` | Bloque 3 (HU-16) y bloque 4 (HU-25/29/30/31) actualizados por fraccion | **Hecho (2026-10-14)**: bloque 3 9/15, bloque 4 10/10, total 41/100 |
| `docs/producto/auditoria-puntos-inc00.md` | Nueva seccion de trazabilidad INC-03 (HU <-> criterios <-> evidencia), incluido el reparto de no-duplicado HU-16 vs bloque 4 | **Hecho (2026-10-14)**: seccion 9, reparto INC03-R05 (HU-25 3, HU-29 3, HU-30 3, HU-31 1) |
| `docs/producto/decisiones.md` | `INC03-PEND-01..08` resueltos y `CONF-01..06` registrados | **Ya estaba (2026-10-10)**: DEC-026..033 + CONF-01..06 + regla no-duplicado |
