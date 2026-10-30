# INC-06 - Evidencia

Estado del incremento: **ACEPTADO (2026-10-29)**. Pipeline completo: LISTO 4/4
-> RED (31 rojos) -> GREEN backend+web (micro-fix fixture + micro-fix F3 +
enmiendas C4 `acceso-vencimiento.spec.ts` y `portal.spec.ts`) -> VERIFICADO
(bateria 88/88 x2) -> auditoria de navegacion (H-01/H-02 cerrados con viajes
nuevos; 94/94 x2) -> REVISADO (`code-reviewer` 2026-10-29: **ACEPTA CON
HALLAZGOS NO BLOQUEANTES**) -> **ACEPTADO**. **0 puntos certificados**
(regla de no duplicado; DEC-048 es mejora de regla de negocio).

**Nota de estado 2026-10-20 (apertura del paquete)**: DEC-048 fue aprobada por
el Producto; `acceptance-criteria-analyst` formulo `INC06-PEND-01..04` con
opciones y recomendaciones, propuso contrato y redacto la matriz de
navegacion/aplicabilidad. **No se ejecuto ningun comando** en toda la apertura
(solo documentacion). Regla de cuenta (DEC-011/DEC-016): **sin evidencia de
ejecucion no se certifica ningun punto** ni se marca ningun criterio como
verificado; **ningun criterio de este spec esta `IMPLEMENTADO` ni `ACEPTADO`**
y los puntos en juego son **0** (mejora de regla de negocio; seccion "Regla de
no duplicado" del spec).

**Base que debe permanecer intacta**: **INC-05 cerro el 2026-10-28**, por lo
que la base de referencia al arranque del RED es la de su cierre (re-medir y
anotar aqui): API **632/632**, Gherkin **214/214 exit 0** (guard 214), web
**188/188**, Playwright **57/57 x2**, migraciones **9/0 sin drift**
(`docs/incrementos/INC-05-servicios-personalizado-nutricion/evidencia.md`).
Ninguna base puede perder tests; los totales finales son la base mas los tests
nuevos. (Referencia historica INC-04: 536/153/183/56.)

## 1. Comandos de verificacion (pendientes de ejecucion)

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | RED | `club-beasts-api` | `npx tsc --noEmit` | exit 0 (el RED no rompe la compilacion) | **exit 0** (0 errores; los archivos nuevos compilan en strict) | 2026-10-29 |
| 2 | RED | `club-beasts-api` | `npx vitest run` | fallos **solo** en archivos nuevos; base intacta | **10 failed / 648 passed (658)**: fallos SOLO en `inc06-acceso-sin-membresia.test.ts` (10 rojos del flag `sinMembresiaActiva` ausente); **base API 632/632 intacta** | 2026-10-29 |
| 3 | RED | `club-beasts-api` | `npm run test:gherkin` | fallos solo en features nuevas (si PEND-01 fija copy); guard intacto -> exit 1 esperado | **exit 1 (esperado en RED)**: 6 failed / 214 passed de 220; fallos SOLO en `inc06-acceso-sin-membresia.feature` (6 escenarios nuevos); guard `INC00_SCENARIO_COUNT = 214` aborta con "se esperaban 214 escenarios ejecutados y se obtuvieron 220" — comportamiento esperado del RED, **guard SIN tocar** (se actualiza en GREEN); **base Gherkin 214/214 intacta** | 2026-10-29 |
| 4 | RED | `club-beasts-web` | `npx tsc --noEmit` / `npx vitest run` | exit 0 / base intacta | **tsc exit 0**; vitest **14 failed / 190 passed (204)**: 4 rojos en `inc06-aviso-membresia.test.tsx` + **10 preexistentes** en `inc07-navegacion-auth.test.tsx` (RED INC-07, no tocados); **base web 188/188 intacta** | 2026-10-29 |
| 5 | RED | - | `git status --porcelain` | cero cambios en `src/`, `prisma/`, `docs/producto/` y otros incrementos | **cumplido**: 55 entradas, todas preexistentes (INC-05/INC-06/INC-07 docs, `.opencode/`, `src/` de INC-05, `docs/producto/`) salvo el delta RED = 5 archivos nuevos + `docs/incrementos/INC-06-*/`; **cero** cambios propios en `src/`, `prisma/`, `docs/producto/`, tests aceptados ni INC-07 | 2026-10-29 |
| 6 | GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0, 0 errores | **exit 0** (0 errores; `resolverAccesoApp` en `membresia.service.ts` y el cambio aditivo de `portal.ts` compilan en strict) | 2026-10-29 |
| 7 | GREEN | `club-beasts-api` | `npx vitest run` | base intacta + tests nuevos en verde | **654 passed / 4 failed (658), exit 1**: 6 de los 10 rojos del flag pasan a verde y **todas** las aserciones de `sinMembresiaActiva` cumplen el contrato R1/R3; los 4 restantes (F1/F7/F4/R1) fallan ahora por un **defecto del fixture RED** (detalle en seccion 4: `apellidos: "Cliente${n}"` con digitos viola el regex aceptado `namesSchema` y el propio test aserta `portalResumenResponseSchema.parse`); **base API 632/632 intacta**; 22/26 del archivo INC-06 en verde | 2026-10-29 |
| 8 | GREEN | `club-beasts-api` | `npm run test:gherkin` | base + escenarios nuevos (guard actualizado **solo** aqui) | **220/220 exit 0**: 6 escenarios de `inc06-acceso-sin-membresia.feature` en verde; guard `INC00_SCENARIO_COUNT` 214 -> **220** (unico cambio del config); **base Gherkin 214/214 intacta** | 2026-10-29 |
| 9 | Modelo | `club-beasts-api` | `npx prisma migrate status` | sin drift; **sin migracion nueva** esperada (calculo derivado) | **9/0 sin drift** ("9 migrations found", "Database schema is up to date!", exit 0; sin migracion nueva) — re-ejecutado en GREEN | 2026-10-29 |
| 10 | GREEN web | `club-beasts-web` | `npx tsc --noEmit`, `npx vitest run`, `npm run build` | exit 0 / base intacta / PASS | **tsc exit 0** (0 errores); vitest **204 passed / 0 failed (204), exit 0** — los 4 rojos de `inc06-aviso-membresia.test.tsx` pasan a verde; base web intacta (**200/200** = 188 base + 10 INC-07 ya verdes al arranque de esta fase); total real **204** (188 + 10 INC-07 + 6 INC-06), no "208"; `npm run build` **PASS, exit 0** | 2026-10-29 |
| 11 | VERIFICADO | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base + E2E nuevos verdes (incluye matriz de navegacion: movil/escritorio/teclado, URL directa/recarga/atrás) | **VERIFICADO x2 (consistente)**: **88 tests: 85 passed / 3 failed (6.3m), exit 1 — IDENTICO en las 2 corridas** (mismos tests y mensajes); INC-06 **12/12 verdes** (matriz movil/escritorio, recarga, atras sin bucle, teclado+logout, sesion expirada, recepcion F2, mixto F3, regresion F7) + INC-07 19/19 verdes; base **54/57** — 3 rojos `portal.spec.ts` (`INC03-POR-01/06/07`) por el cambio **aprobado** `INC06-ACC-01` (snapshots: aviso DEC-051; reproducen aislados); total real **88** = 57 base + 19 INC-07 + 12 INC-06 (los 3 de `acceso-vencimiento.spec.ts` ya estan dentro de la base 57; el "91" del contrato los duplicaba). Estabilidad extra: `--repeat-each=2` inc07+inc06 = **62/62 exit 0** | 2026-10-29 |
| 11b | GREEN web | `club-beasts-web` | `npx playwright test tests/e2e/inc06-acceso-membresia.spec.ts --reporter=line` (**x2 corridas**) + `npx playwright test tests/e2e/acceso-vencimiento.spec.ts --reporter=line` (solo lectura, R12) | 12/12 INC-06 verdes; R12 reportado | **11 passed / 1 failed** en las 2 corridas INC-06 (rojo unico: mixto F3, conflicto test vs contrato ratificado — detalle en seccion 4; **no** es regresion de mi alcance); el viaje "URL directa + atras" quedo **verde y estable** tras el fix de URL del portal (3 corridas verdes: 2 aisladas + 2 completas); `acceso-vencimiento.spec.ts`: **1 failed / 2 passed** — **R12 CONFIRMADO en rojo** (`:90`, cambio `ACC-01`, sin tocar; su enmienda exige contrato propio del orquestador). **Sin ejecutar aqui**: la suite E2E completa x2 (paso VERIFICADO, tarea 14) | 2026-10-29 |
| 12 | Navegacion | web (auditoria) | recorrido de la matriz del spec por `ui-navigation-auditor` | todos los viajes `VERIFICADO` con evidencia; sin bucles ni enlaces rotos | _sin ejecutar_ | - |
| 13 | Revision | api + web + `docs/` | revision `code-reviewer`: re-ejecucion de esta tabla + lectura de `spec.md`, `decisiones.md` | sin hallazgos bloqueantes | _sin ejecutar_ | - |
| 14 | VERIFICADO (bateria, INC-06 tarea 14 / INC-07 paso 7) | api + web | bateria completa del contrato (8 comandos + x2 + repeat; detalle seccion 4 "VERIFICADO") | 8/8 comandos ejecutados; bases intactas = base + nuevos; x2 consistente | **OK con hallazgo de impacto**: tsc api 0 / vitest api 658/658 (=632+26) / gherkin 220/220 x2 (=214+6, guard 220) / migraciones 9/0 / tsc web 0 / vitest web 204/204 (=188+10+6) / build PASS / Playwright 88 (85 pass, 3 fail) x2 identico + repeat 62/62; **INC-06 100% verde** (26 API + 6 Gherkin + 6 unit + 12 E2E); hallazgo: 3 rojos base `portal.spec.ts` (`INC03-POR-01/06/07`) por el cambio **aprobado** `ACC-01` (no inventariados en R5/R12; enmienda pendiente del orquestador) | 2026-10-29 |

Comandos reproducibles (uno por verificacion):

```bash
# API
cd club-beasts-api && npx tsc --noEmit
cd club-beasts-api && npx vitest run
cd club-beasts-api && npm run test:gherkin
cd club-beasts-api && npx prisma migrate status

# Web
cd club-beasts-web && npx tsc --noEmit
cd club-beasts-web && npx vitest run
cd club-beasts-web && npm run build
cd club-beasts-web && npx playwright test
```

## 2. Estado por criterio (RED + GREEN + VERIFICADO ejecutados 2026-10-29; pendiente auditoria de navegacion + revision)

| Criterio | Estado spec (DEC-051, 2026-10-29) | Estado verificado | Evidencia |
|---|---|---|---|
| `INC06-ACC-01` | SPEC (desbloqueado por DEC-051) | **VERIFICADO CON SALVEDAD DE IMPACTO** — pruebas propias verdes; su cambio aprobado deja en rojo 3 viajes aceptados de `portal.spec.ts` no inventariados en R5/R12 | Bateria x2 2026-10-29: API F1/F2/F5, Gherkin 3 escenarios, unit 6/6 y E2E aviso (movil/escritorio, recarga, atras, teclado, sesion expirada) verdes; **salvedad**: `portal.spec.ts` `INC03-POR-01/06/07` en rojo por el aviso a pantalla completa (cambio **aprobado** DEC-048/DEC-051 PEND-03(a), snapshots = aviso; seccion 4 "VERIFICADO"); enmienda/alcance pendiente del orquestador |
| `INC06-ACC-02` | SPEC (regresion DEC-026/027) | **VERIFICADO** | Bateria x2: API F3 mixto + Gherkin + E2E mixto F3 verdes (portal sin aviso con servicio vigente, "Vencido" pintado, ingreso 403 `INGRESO_NO_PERMITIDO` con mensaje exacto); recepcion F2 verde x2 |
| `INC06-ACC-03` | SPEC (regresion DEC-025) | **VERIFICADO** | Bateria: API F4 CONGELADO + F4b fin de pausa + Gherkin verdes (201/estados calculados intactos) |
| `INC06-ACC-04` | SPEC (regresion HU-30/DEC-030/039) | **VERIFICADO** | Bateria x2: API 7 tests verdes (201 ACTIVA/CONGELADO; 403 VENCIDA/PROGRAMADA/SIN_VIGENCIA con mensajes exactos; rama SUSPENDIDO intacta; 401/403 permisos) + E2E recepcion F2 verde x2 |
| `INC06-ACC-05` | SPEC (desbloqueado por DEC-051) | **VERIFICADO** | Bateria x2: API login 200 con F2/F1 + `debeCambiarPin` + DEC-034 `AUTH_CLIENTE_INACTIVO` intactos; E2E sesion expirada -> login -> aviso verde x2 (banner DEC-010 + callbackUrl intactos) |
| `INC06-ACC-06` | SPEC (desbloqueado por DEC-051) | **VERIFICADO** | Bateria x2: unit 3/3 (copy exacto DEC-051, `role="alert"` + heading, guardia anti-"suspension") + sin tarjetas + E2E movil/escritorio (copy + sin scroll horizontal) verdes |
| `INC06-ACC-07` | SPEC (regresion HU-25) | **VERIFICADO** | Bateria x2: API F7/F4 (campos G14 intactos) + unit 2/2 (portal completo con `false`, PIN obligatorio intacto) + E2E F7 URL directa+recarga+atras verdes; pintado **con acceso** intacto (`portal.spec.ts:76/:105` verdes); (el pintado **sin** acceso es el cambio aprobado `ACC-01` — ver su salvedad) |

Regla de no duplicado a verificar en revision (`spec.md`, seccion homonima):
HU-16 (efecto vencido), HU-25 (portal), HU-30 (ingresos), HU-08/HU-17 (estados
y login INACTIVO) y HU-15 (congelacion) **ya estan pagados**; en INC-06 todo
criterio `REF` se verifica **sin aportar punto propio** y la certificacion es
**0 puntos**.

## 3. RED (ejecutado 2026-10-29)

**Archivos nuevos** (ningun archivo existente modificado):

| Archivo | Contenido | Criterios |
|---|---|---|
| `club-beasts-api/tests/integration/inc06-acceso-sin-membresia.test.ts` | 26 tests de integracion API (fixtures F1..F8, prefijo cedula 9946) | `ACC-01..05`, `ACC-07`, R1, R3, R4 |
| `club-beasts-api/features/inc06-acceso-sin-membresia.feature` | 6 escenarios Gherkin nuevos (deteccion y aviso; copy fijo DEC-051) | `ACC-01/02/03`, R1 |
| `club-beasts-api/features/steps/inc06-acceso.steps.ts` | 1 step nuevo (`el portal responde con sinMembresiaActiva {string}`) | `ACC-01` |
| `club-beasts-web/tests/unit/inc06-aviso-membresia.test.tsx` | 6 tests unit/UI del aviso (copy exacto, accesibilidad, sin tarjetas, PIN intacto) | `ACC-01/06/07` |
| `club-beasts-web/tests/e2e/inc06-acceso-membresia.spec.ts` | 12 tests E2E (matriz de navegacion: movil/escritorio, recarga, atras, teclado, sesion expirada, recepcion 403, mixto, regresion F7) | `ACC-01/02/04/05/06/07` |

**Conteo de rojos por archivo** (31 rojos INC-06 en total):

| Archivo | Tests | Rojos | Verdes | Motivo del rojo |
|---|---:|---:|---:|---|
| `inc06-acceso-sin-membresia.test.ts` (API) | 26 | **10** | 16 (regresiones) | `sinMembresiaActiva` no existe en `GET /portal/resumen` (`undefined` != true/false) |
| `inc06-acceso-sin-membresia.feature` (Gherkin) | 6 | **6** | 0 | idem flag ausente |
| `inc06-aviso-membresia.test.tsx` (unit web) | 6 | **4** | 2 (regresiones) | el aviso/copy DEC-051 no existe en `portal/page.tsx` |
| `inc06-acceso-membresia.spec.ts` (E2E) | 12 | **11** | 1 (regresion recepcion F2) | el aviso no existe y el flag del resumen esta ausente |

**Bases intactas con salvedades** (medidas 2026-10-29, al cierre del RED):

- API: **632/632 intacta** (658 = 632 base + 26 nuevos; fallos solo en el archivo nuevo).
- Gherkin: **214/214 intacta** (220 ejecutados = 214 base + 6 nuevos). **Salvedad del guard**: `INC00_SCENARIO_COUNT = 214` hace fallar la corrida completa con "se esperaban 214 escenarios ejecutados y se obtuvieron 220" — **comportamiento esperado del RED** (el guard no se toca aqui; se actualiza a 220 en GREEN).
- Web unit: **188/188 intacta** (204 = 188 base + 10 preexistentes INC-07 + 6 nuevos). **Salvedad**: los 10 rojos de `inc07-navegacion-auth.test.tsx` son el RED de INC-07 (preexistentes, no tocados).
- E2E: **57/57 intacta** (88 = 57 base + 19 preexistentes INC-07 + 12 nuevos; 58 verdes = 57 base + 1 regresion nueva). **Salvedades**: los 19 rojos de `inc07-navegacion-auth.spec.ts` son el RED de INC-07 (preexistentes, no tocados).
- Migraciones: **9/0 sin drift**, sin migracion nueva (el calculo es derivado, sin modelo nuevo).

**R5 / patron C4 (reporte, sin edicion)**: el E2E aceptado
`acceso-vencimiento.spec.ts:90-104` aserta las tarjetas del portal para un
cliente con GYM vencida unica; bajo DEC-048 + PEND-03(a) ese cliente vera el
aviso a pantalla completa, por lo que ese E2E **quedara en rojo tras el GREEN**
(cambio de comportamiento `INC06-ACC-01`, no regresion `ACC-07`). En esta
corrida RED sigue **verde** porque el producto aun no cambia. **No fue
modificado** (su enmienda exige contrato propio del orquestador).

**Ningun test aceptado modificado**: `acceso-vencimiento.spec.ts`,
`portal.spec.ts`, `recepcion.spec.ts`, `auth.spec.ts` y el resto de la base
quedan byte a byte intactos; el guard Gherkin tambien. Ninguna asercion vacia
ni paso opcional: los tests del flag fallan en RED por construccion
(`undefined` nunca coincide con true/false) y no "pasan por accidente"; las
regresiones en verde (16 API + 2 unit + 1 E2E) son guardias que protegen el
GREEN de INC-06 sobre comportamiento aceptado.

**Fixture F4b (documentacion)**: la pausa terminada del `INC06-ACC-03` se
escribe directamente en `MembresiaGymCambio` (fila `CONGELACION` + `fechaFin`
extendida) porque `POST .../congelar` exige `fechaFin` de la pausa hoy/futura;
el estado persistido es identico al que deja la API de INC-02 al terminar una
pausa (precedente `fixtureFila` de HU-13).

**Micro-fix del fixture RED (test-engineer, 2026-10-29)**: correccion
**solo de datos** del literal `apellidos` en `crearCliente`
(`inc06-acceso-sin-membresia.test.ts:136`), bajo contrato propio del
orquestador (patron de INC-01 `portal.test.ts:70-73`: el dato de prueba es el
que se corrige, nunca el schema ni la implementacion). Antes/despues del
literal:

```ts
// ANTES (defecto: digitos, viola namesSchema de HU-25)
apellidos: `Cliente${clienteSeq}`,

// DESPUES (patron "Cliente A/B/C..." con letra unica por fixture)
const letra = String.fromCharCode(65 + ((clienteSeq - 1) % 26));
apellidos: `Cliente ${letra}`,
```

**Cero aserciones tocadas, cero localizadores tocados, cero logica de test
tocada**: unico delta en el archivo el literal de datos + su derivacion
`letra` (A..J en cada corrida, unicas por fixture); 26/26 tests conservan
todas sus expectativas byte a byte.

**Micro-fix E2E F3 + enmienda C4 de R12 (test-engineer, 2026-10-29 — contrato
propio del orquestador)**: cierre de los dos puntos abiertos tras el GREEN web.
Alcance estricto: solo los viajes afectados de los 2 specs E2E (viaje F3 propio
del incremento + enmienda documentada del viaje aceptado, patron C4) y esta
evidencia. **Prohibidos y no tocados**: `src/`, backend, otros tests,
`docs/producto/`, INC-07; cero campos nuevos pedidos al producto; cero puntos
certificados.

*Micro-fix F3 (`inc06-acceso-membresia.spec.ts`, viaje mixto `INC06-ACC-02`):
`expectPortalCompleto` (redactado para F7, asertaba "Activo" del badge GYM
`ACTIVA` junto a "Vencido" — fallo real `expectPortalCompleto:200`, seccion 4)
se reemplaza por aserciones fieles a la matriz de navegacion ("Ingreso 403
(GYM vencida) pero portal sin aviso (hay servicio vigente); destinos
intactos"). Antes/despues:*

```ts
// ANTES (conflicto test-vs-contrato de la seccion 4)
await expectPortalCompleto(page); // incluye getByText("Activo") visible -> :200
await expect(page.getByText("Vencido", { exact: true })).toBeVisible();
await expectFlagResumen(request, cliente.cedula, false);
expect(res.status()).toBe(403);
expect(cuerpo.code).toBe("INGRESO_NO_PERMITIDO"); // sin mensaje

// DESPUES (1..4 de la matriz; sin campos nuevos del producto)
// (1) Sin aviso de activar membresia: hay servicio vigente.
await expect(page.getByText(TITULO_AVISO, { exact: true })).toHaveCount(0);
await expect(page.getByText(SUBTEXTO_AVISO, { exact: true })).toHaveCount(0);
// (2) El portal pinta el estado por servicio del GYM (DEC-026/027).
await expect(page.getByText("Vencido", { exact: true })).toBeVisible();
// (4) Destinos intactos: tarjetas del portal y salida del cliente.
for (const tarjeta of TARJETAS_PORTAL) {
  await expect(page.getByRole("heading", { name: tarjeta })).toBeVisible();
}
const logout = page.getByRole("button", { name: /cerrar sesi/i })
  .or(page.getByRole("link", { name: /cerrar sesi/i }));
await expect(logout).toBeVisible();
await expectFlagResumen(request, cliente.cedula, false); // R3, sin moverse
// (3) El ingreso se rige por GYM: 403 con el mensaje existente intacto.
expect(res.status()).toBe(403);
expect(cuerpo.code).toBe("INGRESO_NO_PERMITIDO");
expect(cuerpo.error).toBe(
  `La membresía no está habilitada para ingresar (vencida el ${cliente.fechaFin})`
);
```

Dato unico del fixture de ESTE viaje (`crearClienteF3`, solo de datos, mismos
valores de siempre): `fechaInicio`/`fechaFin` se fijan en constantes y la
fixture devuelve `fechaFin` (`sumarDias(hoyBogota(), -1)`) para asertar el
mensaje 403 existente con su fecha exacta (mismo patron que el viaje recepcion
F2). El helper `expectPortalCompleto` **queda intacto** (lo usa el viaje F7).

*Enmienda C4 (`acceso-vencimiento.spec.ts`, viaje de vencimiento unico,
riesgo `INC06-R12`, patron C4 de INC-05): cambio de comportamiento `INC06-ACC-01`
APROBADO (DEC-048 + DEC-051 PEND-03(a)), NO regresion `ACC-07` — el cliente con
GYM vencida unica ve el aviso de activar membresia (copy DEC-051) en lugar de
las tarjetas. Antes/despues del viaje:*

```ts
// ANTES (viaje aceptado, quedo EN ROJO tras el GREEN web: 1 failed / 2 passed)
test("el portal de un cliente con vigencia vencida muestra el estado vencido con 'Sin acceso al gimnasio'", ...)
await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
const estado = cardCon(page, "Estado de acceso");
await expect(estado.getByText("Vencido", { exact: true })).toBeVisible();
await expect(estado.getByText("Sin acceso al gimnasio", { exact: true })).toBeVisible();
await expect(estado.getByText(cliente.fechaFin, { exact: true })).toBeVisible();
await expect(estado.getByText("Activo", { exact: true })).toHaveCount(0);

// DESPUES (contrato nuevo DEC-048/DEC-051; titulo actualizado con el viaje)
test("el portal de un cliente con vigencia vencida unica muestra el aviso de activar membresia (DEC-051) en lugar de las tarjetas", ...)
await expect(page).toHaveURL(/\/portal/);
await expect(page.getByRole("heading", { name: "No tienes una membresia activa" })).toBeVisible();
await expect(page.getByText("Contacta recepcion para activar tu membresia y volver a acceder", { exact: true })).toBeVisible();
for (const tarjeta of ["Mi Informacion", "Estado de acceso", "Mi Rutina", "Plan Nutricional"]) {
  await expect(page.getByRole("heading", { name: tarjeta })).toHaveCount(0);
}
await expect(page.getByText("Activo", { exact: true })).toHaveCount(0); // INC03-VEN-03 intacto
```

Comentario de enmienda (C4) en el propio viaje citando DEC-048/DEC-051 y esta
seccion. Los otros 2 viajes del spec (DEC-026: login 200/401
`AUTH_INVALID_CREDENTIALS`; recepcion 403 `INGRESO_NO_PERMITIDO` con mensaje y
sin confirmacion) quedan **byte a byte intactos** (2 passed conservados);
`cardCon` sigue en uso por el viaje de recepcion.

*Comandos ejecutados (resultados reales, 2026-10-29; entorno Windows, API E2E
SQLite temporal + web dev server levantados por el `webServer` de Playwright,
puertos 3000/3001 verificados libres antes de correr)*:

| Comando | Resultado real |
|---|---|
| `cd club-beasts-web && npx playwright test tests/e2e/inc06-acceso-membresia.spec.ts tests/e2e/acceso-vencimiento.spec.ts --reporter=line` | **15 passed (1.2m), exit 0** = **15/15 verdes** (12 INC-06 + 3 `acceso-vencimiento`); viajes tocados en verde: F3 mixto (`INC06-ACC-02`) y el viaje de vencimiento unico enmendado (C4); sin skips/only; los 3 viajes del viaje-matriz movil/escritorio, sesion expirada, recepcion F2 y regresion F7 sin moverse |
| `cd club-beasts-web && npx tsc --noEmit` | **exit 0**, 0 errores |
| `cd club-beasts-web && npx vitest run` | **204 passed / 0 failed (204), exit 0** — sin cambios (solo confirma no-regresion de unit) |
| `git status --porcelain` | Delta propio = **2 specs + evidencia**: `tests/e2e/inc06-acceso-membresia.spec.ts` (untracked desde el RED, micro-fix F3), `tests/e2e/acceso-vencimiento.spec.ts` (**nueva modificacion** ` M`, unica enmienda C4) y este archivo. **Salvedad**: arbol sucio preexistente (INC-05/INC-06 RED/INC-07, `.opencode/`, `src/`, `docs/producto/`, features, tests API) intacto y no tocado por esta tarea |

Riesgo residual: los comentarios de cabecera de ambos specs siguen describiendo
el estado previo al GREEN (`acceso-vencimiento.spec.ts` cita
"Sin acceso al gimnasio" en portal y el header de `inc06-acceso-membresia.spec.ts` menciona R5
como pendiente de enmienda); quedaron **sin tocar** por respetar el alcance
"solo el viaje"; la verdad operativa queda aqui y en el comentario C4 del
viaje. Nada certificado (0 puntos; solo el orquestador certifica).

*Enmienda C4 de `portal.spec.ts` (3 viajes aceptados INC-03 — test-engineer,
2026-10-29, contrato propio del orquestador, patron C4 de INC-05): los viajes
`INC03-POR-01/06/07` asertaban el pintado PRE-DEC-048 para clientes **sin
membresia activa** y tras el cambio **aprobado** `INC06-ACC-01` (DEC-048 +
DEC-051 PEND-03(a)) esos clientes ven el aviso a pantalla completa
(`portal/page.tsx:253`). Cambio de comportamiento aprobado, **no** regresion
`ACC-07`. **Decision tomada (3/3 viajes reasignados a fixtures con membresia
activa; 0 enmendados al aviso)**: el proposito original de los 3 viajes
(identidad `INC03-POR-01`, pintado honesto `INC03-POR-06`, fronteras de
calendario `INC03-POR-07`) **sigue existiendo** en el producto bajo DEC-051
cuando hay membresia activa o servicio vigente; reasignarlos conserva sus
aserciones **byte a byte** (maximo valor de regresion). Enmendarlos al aviso
los habria convertido en copias de los 12 viajes de
`inc06-acceso-membresia.spec.ts` (aviso movil/escritorio, recarga, atras,
teclado, sesion expirada) y habria borrado la cobertura E2E unica de
"Sin vigencia"/"Sin fecha de vencimiento" y de las fronteras DEC-005/006. La
ruta del aviso con fixtures sin vigencia queda cubierta por F1/F2 de INC-06.
A continuacion, antes/despues por viaje (solo fixture/titulo/comentario;
**cero aserciones tocadas** en los 3):*

**Viaje 1 — `INC03-POR-01` (identidad; reasignado a fixture CON membresia
activa GYM):** el fixture pasa del cliente seed `1234567890` (sin vigencias ->
aviso) a un cliente API con vigencia ACTIVA; el nombre asertado se conserva
literal (el fixture nace "Carlos Rodriguez"). El login del cliente seed sigue
cubierto por el viaje verde "portal muestra secciones de información" (sin
tocar).

```ts
// ANTES (viaje aceptado INC-03, EN ROJO tras INC06-ACC-01: :28 "element(s) not found")
test("muestra información del cliente autenticado", async ({ page }) => {
  await loginAsClient(page); // seed 1234567890, sin vigencias -> hoy aviso
  await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
  await expect(page.getByText("Carlos Rodriguez", { exact: true })).toBeVisible();
});

// DESPUES (reasignado a fixture con membresia activa; aserciones identicas)
test("muestra información del cliente autenticado", async ({ page, request }) => {
  // comentario C4 (DEC-048 + DEC-051 PEND-03(a), INC06-ACC-01) en el viaje
  const cliente = await crearClientePortalApi(request, {
    sedeId: "sede-1", nombres: "Carlos", apellidos: "Rodriguez",
  });
  await crearVigenciaApi(request, cliente.id, sumarDias(hoyBogota(), -10), sumarDias(hoyBogota(), 30));
  await entrarAlPortal(page, cliente.cedula);
  await expect(page.getByRole("heading", { name: "Mi Portal" })).toBeVisible();
  await expect(page.getByText("Carlos Rodriguez", { exact: true })).toBeVisible(); // byte a byte
});
```

**Viaje 2 — `INC03-POR-06` (pintado honesto del estado vacio; reasignado a
fixture CON servicio vigente NO-GYM y cero vigencias GYM):** con NUTRICION
ACTIVA el flag `sinMembresiaActiva` es false (R1: cuenta cualquier tipo) y el
bloque GYM sigue siendo `SIN_VIGENCIA`/null (selector GYM intacto,
`membresia.service.ts:391-393`), por lo que el portal pinta las tarjetas y
"Estado de acceso" muestra "Sin vigencia" + "Sin fecha de vencimiento" sin
mentir. Aserciones byte a byte; el **titulo** se acota a la realidad
DEC-051 ("sin membresia" -> "sin vigencia GYM, con servicio vigente").

```ts
// ANTES (viaje aceptado, EN ROJO: :155 "Sin vigencia" -> element(s) not found)
test("cliente sin membresia ve Sin vigencia y Sin fecha de vencimiento, nunca Activo", ...)
const cliente = await crearClientePortalApi(request, { sedeId: "sede-1" });
await entrarAlPortal(page, cliente.cedula);
const estado = cardCon(page, "Estado de acceso");
await expect(estado.getByText("Sin vigencia", { exact: true })).toBeVisible();
await expect(estado.getByText("Sin fecha de vencimiento", { exact: true })).toBeVisible();
await expect(estado.getByText("Activo", { exact: true })).toHaveCount(0);
await expect(estado.getByText("Vencido", { exact: true })).toHaveCount(0);
await expect(page.getByText("Congelacion", { exact: true })).toHaveCount(0);

// DESPUES (mismas aserciones byte a byte; titulo acotado + fixture NUTRICION ACTIVA)
test("cliente sin vigencia GYM (con servicio vigente) ve Sin vigencia y Sin fecha de vencimiento, nunca Activo", ...)
const cliente = await crearClientePortalApi(request, { sedeId: "sede-1" });
await crearServicioNutricionApi(request, cliente.id, sumarDias(hoyBogota(), -5), sumarDias(hoyBogota(), 25));
await entrarAlPortal(page, cliente.cedula);
// ... 6 aserciones ANTERIORES, byte a byte identicas ...
```

**Viaje 3 — `INC03-POR-07` (fronteras DEC-005/006; cada caso reasignado a
fixture CON GYM en frontera + NUTRICION ACTIVA):** con PROGRAMADA/VENCIDA
unica el portal muestra el aviso (por eso el caso AntesDelInicio y el
DiaSiguiente caian); una NUTRICION ACTIVA por caso mantiene el portal pintado
y el selector GYM conserva el estado de frontera (el orden
`fechaFin desc, fechaInicio desc, id desc` + filtro `tipoServicio = "GYM"`
no cambia). Titulo y las 3 aserciones por caso **byte a byte**.

```ts
// ANTES (en el loop de los 3 casos: AntesDelInicio/UltimoDia/DiaSiguiente)
await crearVigenciaApi(request, cliente.id, caso.inicio, caso.fin);
await entrarAlPortal(page, cliente.cedula);

// DESPUES (mismas aserciones por caso; cada caso gana NUTRICION ACTIVA)
await crearVigenciaApi(request, cliente.id, caso.inicio, caso.fin);
// comentario C4 (DEC-048 + DEC-051 PEND-03(a), INC06-ACC-01) en el viaje
await crearServicioNutricionApi(request, cliente.id, sumarDias(hoy, -5), sumarDias(hoy, 25));
await entrarAlPortal(page, cliente.cedula);
```

**Infraestructura de fixture (misma enmienda, usada SOLO por los viajes 2 y
3):** helper local `crearServicioNutricionApi` en `portal.spec.ts` (misma
superficie `POST /clientes/:id/servicios-nutricion` que usa
`inc06-acceso-membresia.spec.ts`/`inc05-tipos-vigencia.spec.ts`; `e2e-helpers.ts`
sin tocar) + `type APIRequestContext` en el import. Los otros 5 viajes verdes
(`portal.spec.ts:51/:56/:119/:148/:288`) quedan **byte a byte intactos**; los
seeds (`start-api-e2e.mjs`, `prisma/seed.ts`) tambien (verificado con
`git diff` vacio).

*Comandos ejecutados (resultados reales, 2026-10-29; entorno Windows, API E2E
SQLite temporal + web dev server levantados por el `webServer` de Playwright,
puertos 3000/3001 verificados libres antes de correr)*:

| Comando | Resultado real |
|---|---|
| `cd club-beasts-web && npx tsc --noEmit` | **exit 0**, 0 errores |
| `cd club-beasts-web && npx playwright test tests/e2e/portal.spec.ts --reporter=line` | **8/8 verdes** con salvedad de entorno: 1a corrida **7 passed / 1 failed (32.2s), exit 1** cuyo unico fallo NO es de asercion sino `worker process exited unexpectedly (code=3221226505 = 0xC0000409)` (crash nativo transitorio del worker de Playwright/Windows en el viaje 1); **2a corrida (reproduccion): 8 passed (31.8s), exit 0**; el crash no reprodujo en 3 corridas posteriores (spec aislada + 2 completas) |
| `cd club-beasts-web && npx playwright test --reporter=line` **x2 corridas consecutivas** | **88 passed (6.2m), exit 0** y **88 passed (6.1m), exit 0** — **88/88 verdes identico en las 2 corridas** (85 previos + 3 enmendados; `portal.spec.ts` 8/8 dentro de cada corrida; sin skips/only) |
| `git status --porcelain` | 61 entradas; **delta propio = 2 archivos**: ` M club-beasts-web/tests/e2e/portal.spec.ts` (unica fuente tocada) + esta evidencia (dentro del dir untracked `?? docs/incrementos/INC-06-acceso-sin-membresia-activa/`). **Salvedad**: arbol sucio preexistente (INC-05/INC-06 RED+GREEN+VERIFICADO/INC-07, `src/`, `docs/producto/`, features, tests API, `.opencode/`) intacto y no tocado por esta tarea |

Riesgos residuales de esta enmienda: (1) el crash de worker `0xC0000409` de la
1a corrida es flake de entorno Windows (no reprodujo); monitorear en la
auditoria/CI. (2) El viaje 1 reasignado solapa parcialmente con el viaje
"cliente con vigencia activa..." (`portal.spec.ts:119`, identidad completa);
se conservo por ser el viaje dedicado de `INC03-POR-01` del smoke "Portal del
Cliente" (la alternativa de aviso habria sido la prueba de aviso #13 sin
criterio propio). (3) Los viajes 2/3 dependen ahora del fixture
`POST /clientes/:id/servicios-nutricion` (superficie INC-05; mismo patron que
F3 de `inc06-acceso-membresia.spec.ts`). (4) El comentario de cabecera del
bloque INC-03 (`portal.spec.ts`, criterios `INC03-POR-06/07` en terminos
pre-DEC-051) quedo **sin tocar** por el alcance "solo los viajes" (mismo
criterio que la enmienda C4 de `acceso-vencimiento.spec.ts`); la verdad
operativa queda en los comentarios C4 de cada viaje y aqui. (5) La relectura
de `INC03-POR-06` bajo DEC-051 ("Sin vigencia" se pinta sin vigencia GYM con
servicio vigente; sin ninguna vigencia activa manda el aviso) queda para la
validacion del analista/revisor. (6) El riesgo transitorio del viaje verde
"portal muestra secciones de información" (render de carga) sigue latente
(fuera de alcance; para la auditoria). Nada certificado (0 puntos; solo el
orquestador certifica).

## 4. Verificacion / GREEN (GREEN backend ejecutado 2026-10-29 — **BLOQUEADO PARCIAL**)

**Alcance de esta fase (backend-developer, tarea 12)**: solo backend API.
`ACC-06` (copy) y el GREEN web (tarea 13, `frontend-developer`) quedan fuera de
este contrato. Login e ingresos: **sin cambio** (DEC-051 PEND-02(a);
DEC-030/039/034 intactos). **Este paquete no certifica puntos** (0, mejora de
regla DEC-048).

**Archivos modificados (delta GREEN, 4/4 dentro del contrato)**:

| Archivo | Cambio | Contrato |
|---|---|---|
| `club-beasts-api/src/services/membresia.service.ts` | Nueva `resolverAccesoApp(clienteId, hoy)`: **un solo `findMany`** de los 3 tipos (`GYM|PERSONALIZADO|NUTRICION`) con `cambios`; por fila reutiliza `resolverEstadoAcceso` (sin duplicar `calcularEstado`/`pausasActivas`, `INC06-CONF-01`); `sinMembresiaActiva = !EXISTE fila con estado CALCULADO en {ACTIVA, CONGELADO}` (R1: solo vigencias; `PROGRAMADA` cae sola, sin rama especial); el bloque GYM se deriva del **mismo snapshot** con el selector ratificado (R10) | R1/R2/R10 |
| `club-beasts-api/src/routes/portal.ts` | `GET /portal/resumen` **aditivo**: `sinMembresiaActiva: boolean` top-level unico nuevo (R3, sin `accesoApp` ni `fechaInicio` — R11); campos G14 actuales intactos; orden R4 conservado (401 -> 403 rol -> 404 cliente -> resolucion -> 200); sin escritura | R3/R4/R11 |
| `club-beasts-api/vitest.cucumber.config.ts` | **Solo** el guard de conteo: `INC00_SCENARIO_COUNT` 214 -> **220** (6 escenarios nuevos del RED) | contrato GREEN |
| `docs/incrementos/INC-06-*/evidencia.md` | Solo secciones 1 (filas 6-9) y 4 (esta) | contrato GREEN |

**Comandos ejecutados (resultados reales, 2026-10-29)**:

| Comando | Resultado real |
|---|---|
| `npx tsc --noEmit` | **exit 0**, 0 errores |
| `npx vitest run` | **654 passed / 4 failed (658), exit 1** — ver "BLOQUEADO PARCIAL" abajo; **base API 632/632 intacta**; 22/26 del archivo INC-06 en verde |
| `npm run test:gherkin` | **220/220 passed, exit 0** — 6 escenarios INC-06 nuevos en verde; base Gherkin 214/214 intacta; guard 220 satisfecho |
| `npx prisma migrate status` | **9 migrations found / Database schema is up to date! / exit 0** — sin drift, **sin migracion nueva** |
| `git status --porcelain` | Delta GREEN = los 4 archivos permitidos (arriba). **Salvedad**: el arbol llega y queda sucio con trabajo preexistente de INC-05/INC-06 (RED)/INC-07 (docs, `src/`, tests, web, `.opencode/`); nada de eso fue tocado por esta fase |

**RED -> GREEN verificado**:

- Los **10 rojos del flag** cumplen ya el contrato R1/R3/R4 en su logica:
  6 pasan a verde en esta corrida (F2 `VENCIDA`, F5 `PROGRAMADA`, F3 mixto,
  F4 `CONGELADO` ACC-03, F4b fin de pausa, R3 forma exacta de la respuesta) y
  los 4 restantes pasan **todas** sus aserciones de `sinMembresiaActiva` y
  campos antes de caer en la asercion del schema (abajo).
- **Gherkin 220/220**: los 6 escenarios nuevos (deteccion, `PROGRAMADA`,
  mixto, congelado, `SUSPENDIDO` R1) ejecutan en verde con el flag real.
- Las **16 regresiones** del archivo (ingresos 201/403 mensajes exactos,
  orden de guardas estado->vigencia, login intacto/DEC-034, portal con acceso)
  siguen **verdes**; base API 632/632 sin perdida.

**BLOQUEADO PARCIAL — 4 tests del RED no pueden pasar sin tocar area
prohibida (defecto del fixture RED, no de la implementacion)**:

- F1 (`ACC-01`), F7 (`ACC-07`), F4 (`ACC-07`) y F6 (`R1`) — los 4 tests del
  archivo que llaman `portalResumenResponseSchema.parse(body)` — fallan con
  `ZodError: invalid_string` en `path: ["cliente","apellidos"]`.
- **Causa**: `inc06-acceso-sin-membresia.test.ts:136` crea los fixtures con
  `apellidos: "Cliente${clienteSeq}"` ("Cliente1", "Cliente2", ... con
  digitos); el regex aceptado `namesSchema`
  (`features/acceptance-criteria/HU-25-schemas.ts:20-24`,
  `^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$`) no admite digitos y el **mismo test** aserta
  ese schema sobre la respuesta (que pasa `apellidos` tal cual desde BD, sin
  alterar — "campos actuales intactos").
- **Precedente del proyecto (INC-01, documentado en
  `tests/integration/portal.test.ts:70-73`)**: "el correlativo del cliente se
  escribe con LETRAS (`Cliente A`, `Cliente B`, ...) para no romper el regex;
  **el dato de prueba es el que se corrige, nunca el schema ni la
  implementacion**". El fix minimo es de **datos del fixture** (p. ej.
  reutilizar el patron `apellidosFixture` de `portal.test.ts`), **sin tocar
  ninguna asercion**; el accepted test `portal.test.ts` usa exactamente ese
  patron y pasa.
- **Por que no se corrigio aqui**: el contrato de esta fase prohibe tocar
  tests ("los rojos son el contrato") y prohibe tocar
  `HU-25-schemas.ts` (artefacto aceptado de HU-25, fuera de las areas
  permitidas). Corromper `apellidos` en la API para satisfacer el regex
  violaria "campos actuales intactos" (R3). **Ninguna salida es posible
  dentro de las areas permitidas -> BLOQUEADO (parcial)**, owner:
  `test-engineer` (correccion de datos del fixture RED bajo contrato propio)
  o enmienda explicita del orquestador.
- **Nota aritmetica del contrato**: el objetivo "642/642" de la tarea es
  inconsistente con su propio desglose (632 base + 26 nuevos = **658**). Con
  el fixture corregido el total real esperado es **658/658**; hoy: 654/658.

**Riesgos / salvedades**:

- `INC06-R12` sigue **pendiente y fuera de esta fase**: el E2E aceptado
  `acceso-vencimiento.spec.ts` quedara en rojo tras el GREEN **web**
  (cambio `ACC-01`, patron C4); su enmienda exige contrato propio del
  orquestador. Con solo el cambio backend el E2E no se mueve.
- La respuesta `GET /portal/resumen` es ahora un superconjunto aditivo de
  G14 (9 claves top-level exactas, asertado en verde por el test R3); zod
  no-estricto de HU-25 la acepta (verificado por Gherkin y por las
  regresiones).
- Sin modelo ni migracion; sin cambios en `recepcion.ts`, `auth.ts`, prisma
  ni frontend. **Nada certificado** (0 puntos; solo el orquestador certifica).

**Micro-fix del fixture + re-ejecucion de la suite backend (test-engineer,
2026-10-29 — BLOQUEADO PARCIAL resuelto)**: bajo contrato propio del
orquestador se aplico el micro-fix **solo de datos** documentado en la seccion
3 (literal `apellidos` de `crearCliente`; **ninguna asercion, localizador ni
logica de test tocados**). El bloqueo "4 tests no pueden pasar sin tocar area
prohibida" queda **resuelto**: los 4 tests (F1/F7/F4/R1) pasan todas sus
aserciones sin cambiar ninguna expectativa. Re-ejecucion real:

| Comando | Resultado real |
|---|---|
| `npx vitest run` | **658 passed / 0 failed (658), exit 0** — base API 632/632 intacta + 26/26 INC-06 en verde (incluidos los 4 del defecto F1/F7/F4/R1) |
| `npm run test:gherkin` | **220/220 passed, exit 0** — sin cambios en features ni guard; solo confirma no-regresion |
| `npx tsc --noEmit` | **exit 0**, 0 errores |
| `git status --porcelain` | Delta propio = **2 archivos**: `club-beasts-api/tests/integration/inc06-acceso-sin-membresia.test.ts` (untracked desde el RED, micro-fix de datos) + `docs/incrementos/INC-06-*/evidencia.md` (esta seccion). **Salvedad**: arbol sucio preexistente (INC-05/INC-06 RED/INC-07, `.opencode/`, `src/`, web, `docs/producto/`) intacto y no tocado por esta fase |

Reproduccion previa del defecto (evidencia "antes", solo archivo INC-06):
**4 failed / 22 passed (26)** exactamente en ACC-01 F1, ACC-07 F7, ACC-07 F4
y R1 F6, todos con `ZodError` en `path: ["cliente","apellidos"]` — coincide
con el diagnostico del GREEN backend. Nota aritmetica confirmada: el total
real es **658/658** (632 base + 26 nuevos), no "642/642".

### GREEN web (frontend-developer, tarea 13, 2026-10-29)

**Alcance de esta fase**: solo frontend web. `ACC-01` (aviso a pantalla
completa), `ACC-06` (copy DEC-051 + accesibilidad) y `ACC-07` (regresion del
pintado con acceso + flujo de PIN intacto). **Este paquete no certifica
puntos** (0, mejora de regla DEC-048).

**Archivos modificados (delta, 3/3 dentro del contrato)**:

| Archivo | Cambio | Contrato |
|---|---|---|
| `club-beasts-web/src/app/portal/page.tsx` | (a) Pantalla de aviso a **pantalla completa** cuando `resumen.sinMembresiaActiva` es true (DEC-051 PEND-03(a)): Navbar + tarjeta central con el copy **exacto** PEND-01(a) ("No tienes una membresia activa" + "Contacta recepcion para activar tu membresia y volver a acceder"), `role="alert"` con el copy completo y el titulo como heading (`<h1>`, INC06-ACC-06), **sin** las 4 tarjetas (incluida "Mi Informacion") y **sin** la palabra "suspension"; logout "Cerrar sesion" (`signOut -> /login-cliente`) conservado en el aviso. (b) Guardas **antes** del aviso intactas: `pinChangeSuccess` y `debeCambiarPin` primero (HU-03/`session-traffic.ts` sin tocar, `pinChangeInProgress` intacto). (c) Con `false` o campo ausente: pintado actual **intacto** (regresion ACC-07). (d) **Recompocicion de URL** del portal tras back/forward (ver "Carrera de navegacion" abajo) | `ACC-01`, `ACC-06`, `ACC-07` |
| `club-beasts-web/src/lib/api.ts` | Aditivo: `sinMembresiaActiva: boolean` en `PortalResumen` (R3: booleano top-level unico) | R3 |
| `docs/incrementos/INC-06-*/evidencia.md` | Solo secciones 1 (filas 10/11b) y 4 (este bloque) | contrato GREEN web |

**Comandos ejecutados (resultados reales, 2026-10-29)**:

| Comando | Resultado real |
|---|---|
| `npx tsc --noEmit` | **exit 0**, 0 errores |
| `npx vitest run` | **204 passed / 0 failed (204), exit 0** — los 4 rojos del aviso en verde; **base intacta 200/200** (188 + 10 INC-07); total real **204** (el "208/208" del contrato no coincide con el conteo real: 188 + 10 INC-07 + 6 INC-06 = 204) |
| `npm run build` | **PASS, exit 0** (11 rutas, `/portal` 3.01 kB) |
| `npx playwright test tests/e2e/inc06-acceso-membresia.spec.ts --reporter=line` | **11 passed / 1 failed** (x2 corridas consecutivas, mismo resultado) — rojo unico: mixto F3 (abajo); la matriz de navegacion (login->aviso, recarga, **atras sin bucle**, movil 375px/escritorio, teclado+logout, sesion expirada -> aviso) queda **en verde** |
| `npx playwright test tests/e2e/acceso-vencimiento.spec.ts --reporter=line` (solo lectura) | **1 failed / 2 passed** — **INC06-R12 CONFIRMADO**: `acceso-vencimiento.spec.ts:90` ("el portal de un cliente con vigencia vencida muestra el estado vencido con 'Sin acceso al gimnasio'") queda **en rojo** por el cambio `ACC-01` (el cliente con GYM vencida unica ahora ve el aviso a pantalla completa). **Archivo sin tocar**; su enmienda exige contrato propio del orquestador (patron C4 / R5) |
| `git status --porcelain` | Delta propio = **2 archivos fuente** (`src/app/portal/page.tsx`, `src/lib/api.ts`) + esta evidencia. **Salvedad**: el arbol llega y queda sucio con trabajo preexistente no commiteado de INC-05/INC-06 (RED)/INC-07 (59 entradas: `src/`, tests, `docs/producto/`, `.opencode/`, `docs/incrementos/*`); de ellos, `portal/page.tsx` y `lib/api.ts` ya traian cambios ajenos (INC-07/INC-05) que se **preservaron** (el diff acumulado incluye esos cambios previos). Tambien: proceso node huerfano que ocupaba el puerto 3001 (API tsx de una corrida previa) detenido para poder levantar el webServer de Playwright (`reuseExistingServer: false`) — limpieza de entorno, sin cambios de archivos |

**RED -> GREEN verificado**:

- Unit `inc06-aviso-membresia.test.tsx`: **4 rojos -> 6/6 verdes** (copy
  exacto, `role="alert"` + heading, guardia anti-"suspension", sin tarjetas;
  regresiones `false`/PIN intactas sin moverse). **Ninguna asercion tocada**.
- E2E `inc06-acceso-membresia.spec.ts`: **11 rojos -> 10 pasan a verde**
  (8 movil/escritorio + sesion expirada + F7) + 1 verde preexistente (recepcion
  F2) = **11/12**; el rojo restante es F3 (conflicto test-vs-contrato, abajo).
- API/Gherkin: sin cambios en esta fase (backend ya verde: 658/658 + 220/220).

**Carrera de navegacion detectada y corregida (viaje "URL directa + atras")**:

- **Sintoma reproducido** (2/2 en movil y escritorio, sin `--trace`): tras
  `login -> goto /portal -> reload -> goBack`, `toHaveURL(/\/portal/)` fallaba
  con `Received string: "http://localhost:3000/login-cliente"` (14 polls / 5 s)
  mientras el **DOM ya mostraba el aviso** (evidencia: `error-context.md`, YAML
  de la pagina con el heading del aviso + "Cerrar sesion"). Con `--trace on`
  el viaje pasaba (2/2): la carrera depende del timing de hidratacion.
- **Mecanismo** (diagnostico en `%TEMP%`, sin tocar el repo): el historial es
  `[/login-cliente, /portal]` (`goto` a la misma URL no agrega entrada); el
  `goBack` dispara un `popstate` hacia `/login-cliente`; si el router de Next
  aun no esta hidratado ese `popstate` se pierde y el redirect del middleware
  (`middleware.ts:16-19`, CLIENTE autenticado -> `/portal`) nunca llega a
  aplicarse: el documento sigue pintando `/portal` con la URL de la entrada
  anterior. Verificado: con el router hidratado el redirect aterriza solo
  (URL `/portal` en ~1.5 s); con el `goBack` inmediato al `reload` se pierde.
- **Fix (en `portal/page.tsx`, area permitida)**: el portal solo se pinta en
  `/portal`; un efecto recompone la URL con un **unico** `router.replace("/portal")`
  al montar (cubre el popstate perdido) y ante `popstate`/`pageshow`. Sin
  bucle (al quedar `/portal` la guarda deja de actuar) y sin competir con la
  salida por sesion (solo corre autenticado). **Evidencia post-fix**: 2
  corridas aisladas + 2 corridas completas del spec **verdes** en ese viaje.
- No se tocaron `middleware.ts`, `redirect.ts`, `session-traffic.ts`,
  `ChangePinForm.tsx` ni `Navbar.tsx`.

**BLOQUEADO (parcial) — mixto F3 no puede pasar sin violar el contrato
(conflicto test-vs-contrato, NO defecto del GREEN)**:

- `inc06-acceso-membresia.spec.ts:511` (`expectPortalCompleto`) aserta
  `getByText("Activo", { exact: true })` **visible** y en la linea 513
  `getByText("Vencido", { exact: true })` **visible** al mismo tiempo para el
  cliente F3 (GYM `VENCIDA` + NUTRICION `ACTIVA`).
- Falla real: `expect(locator).toBeVisible() failed — Locator: getByText('Activo',
  { exact: true }) — element(s) not found` (`expectPortalCompleto:200`).
- **Por que es irresoluble dentro del contrato**: (1) el resumen solo expone el
  bloque **GYM** + `sinMembresiaActiva` (R3 "campo unico", 9 claves top-level;
  verificado en `portal.ts:65-81`) y para F3 `estadoAccesoGym = "VENCIDA"` -> el
  badge pinta "Vencido" (unico texto "Activo" de la app es el badge `ACTIVA`,
  `EstadoAccesoBadge.tsx:19`); no existe dato para pintar "Activo" de NUTRICION
  sin **romper R3** (backend, prohibido) ; (2) añadir un indicador "Activo" al
  portal con `sinMembresiaActiva: false` cambiaria el "pintado actual intacto"
  exigido por el propio contrato (`ACC-07`) y romperia el unit `inc06-aviso-
  membresia.test.tsx` ("Activo" unico) o `portal-estado.test.tsx` ("nunca
  'Activo'"); (3) tocar el test esta prohibido. El helper `expectPortalCompleto`
  parece redactado para el caso F7 (GYM `ACTIVA`) y reutilizado en F3, donde sus
  dos aserciones de estado son mutuamente incompatibles con los contratos
  ratificados. **Owner**: `test-engineer` (correccion del RED bajo contrato
  propio) o enmienda explicita del orquestador (p. ej. que F3 asierte solo
  "sin aviso" + "Vencido", como fija la matriz del spec: "portal sin aviso").
- Este es el **unico** test rojo de INC-06 web; no es regresion de mi alcance
  (el pintado con acceso, el aviso, la navegacion y las guardas de PIN/logout
  estan en verde).

**Riesgos / salvedades**:

- `INC06-R12`: confirmado en rojo tras el GREEN web (reportado arriba, sin
  tocar el archivo). Queda **pendiente de enmienda** por contrato propio.
- La recompocicion de URL es un guard defensivo de la pagina; con URL correcta
  es **no-op** (todas las regresiones aceptadas de `/portal` pasan). Si la
  auditoria de navegacion prefiere otro mecanismo (p. ej. fix en middleware),
  es cambio de area distinta con contrato propio.
- Salvedad aritmetica: el esperado "208/208" del contrato no corresponde al
  universo real de unit (**204** = 188 + 10 INC-07 + 6 INC-06); medido y
  documentado.
- **Nada certificado** (0 puntos; solo el orquestador certifica).

### VERIFICADO (bateria completa — `test-engineer`, 2026-10-29; INC-06 tarea 14 / INC-07 paso 7)

Tarea **solo-ejecucion** con base intacta: **cero cambios de codigo, tests,
features ni prisma**; unico archivo editado de INC-06 esta evidencia.
Entorno: Windows, Node v24.15.0 / npm 11.12.1; API E2E SQLite temporal + web
dev server levantados por el `webServer` de Playwright (puertos 3000/3001
verificados libres antes de correr). **0 puntos** (solo el orquestador
certifica); ningun criterio pasa a `ACEPTADO` con este paso (faltan auditoria
de navegacion y revision).

**Bateria completa del contrato (resultados exactos)**:

| # | Comando | Resultado |
|---:|---|---|
| 1 | `cd club-beasts-api && npx tsc --noEmit` | **exit 0** |
| 2 | `cd club-beasts-api && npx vitest run` | **658 passed / 0 failed (658), exit 0** (33 archivos; = base 632 + 26 INC-06) |
| 3 | `cd club-beasts-api && npm run test:gherkin` **x2 corridas** | **220/220 exit 0 en las 2 corridas identicas** (12 archivos; = base 214 + 6 INC-06; guard `INC00_SCENARIO_COUNT = 220` satisfecho) |
| 4 | `cd club-beasts-api && npx prisma migrate status` | **9 migrations found / "Database schema is up to date!" / exit 0** — 9/0 sin drift, sin migracion nueva |
| 5 | `cd club-beasts-web && npx tsc --noEmit` | **exit 0** |
| 6 | `cd club-beasts-web && npx vitest run` | **204 passed / 0 failed (204), exit 0** (25 archivos; = base 188 + 10 INC-07 + 6 INC-06) |
| 7 | `cd club-beasts-web && npm run build` | **PASS, exit 0** (11 rutas; `/portal` compila con el aviso) |
| 8 | `cd club-beasts-web && npx playwright test --reporter=line` **x2 corridas consecutivas** | **88 tests: 85 passed / 3 failed (6.3m), exit 1 — IDENTICO en las 2 corridas** (mismos 3 tests, mismos mensajes, verificados); INC-06 **12/12 verdes**, INC-07 19/19 verdes; base **54/57** (3 rojos `portal.spec.ts`, ver "Hallazgo"); total real **88** |
| 9 | (estabilidad, opcional) `--repeat-each=2` sobre `inc07-navegacion-auth.spec.ts` + `inc06-acceso-membresia.spec.ts` | **62 passed / 0 failed (3.6m), exit 0** (31 viajes x 2 repeticiones) |
| 10 | (diagnostico) `npx playwright test tests/e2e/portal.spec.ts --reporter=line` | **5 passed / 3 failed (40.4s), exit 1** — los mismos 3 fallos reproducen **aislados** (no dependen del orden de la suite) |

**Consistencia x2**: Gherkin 220/220 = 220/220; Playwright 85/3 = 85/3 con
mismos tests fallidos y mensajes identicos. Sin skips/only. Logs de corrida:
`%TEMP%\inc07-inc06-verify-pw-run1.log`, `...-run2.log`, `...-repeat.log`;
snapshots de fallo en `club-beasts-web/test-results/*/error-context.md`.

**Bases y totales finales (base + nuevos; base intacta confirmada)**:

| Suite | Base | Nuevos | Total real | Estado |
|---|---:|---:|---:|---|
| API vitest | 632 | +26 INC-06 | **658/658** | intacta |
| Gherkin | 214 | +6 INC-06 | **220/220 x2** | intacta (guard 220) |
| Web vitest | 188 | +10 INC-07 +6 INC-06 | **204/204** | intacta |
| Playwright | 57 (incluye `acceso-vencimiento` 3) | +19 INC-07 +12 INC-06 | **88** = 85 pass / 3 fail, x2 identico | **INC-06 12/12 verdes**; base 54/57 (hallazgo abajo) |

**Salvedad aritmetica del contrato**: el esperado "91" suma "+3
`acceso-vencimiento`" que ya estan **dentro** de la base 57 (57 + 19 + 12 =
**88**, desglose por archivo verificado en el log).

**Hallazgo — impacto del cambio APROBADO de ESTE incremento sobre la base
(3 rojos en `portal.spec.ts`, INC-03)**: viajes aceptados que asertaban el
pintado PRE-DEC-048 para clientes **sin membresia activa**:

| Test exacto | Asercion que falla (linea) | Estado del DOM (snapshot Playwright) |
|---|---|---|
| `portal.spec.ts:24 › Portal del Cliente › muestra información del cliente autenticado` | `:28` `expect(page.getByText("Carlos Rodriguez", { exact: true })).toBeVisible()` -> `element(s) not found` | aviso DEC-051: heading "No tienes una membresia activa" + "Contacta recepcion..." + "Cerrar sesion" (`INC03-POR-01`) |
| `portal.spec.ts:145 › cliente sin membresia ve Sin vigencia y Sin fecha de vencimiento, nunca Activo` | `:155` `estado.getByText("Sin vigencia", { exact: true })` -> `element(s) not found` | idem aviso (`INC03-POR-06`) |
| `portal.spec.ts:163 › los extremos de la vigencia se pintan en el portal: fechaInicio-1 Programado, ...` | `:211` caso "AntesDelInicio" (`hoy=2026-10-29, vigencia 2026-10-30 a 2026-12-08`) `estado.getByText("Programado", { exact: true })` -> `element(s) not found` | idem aviso (`INC03-POR-07`; el caso "DiaSiguiente"/VENCIDA tambien quedaria en rojo — el test aborta en el caso 1) |

**Causa (diagnostico solo-lectura; sin correcciones por contrato)**:
`portal/page.tsx:253` (`if (resumen?.sinMembresiaActiva)`) reemplaza todo el
portal por el aviso DEC-051 — comportamiento **APROBADO de este incremento**
(`INC06-ACC-01`, DEC-048 + DEC-051 PEND-03(a); R1: solo {ACTIVA, CONGELADO}
cuentan como membresia activa; PROGRAMADA/SIN_VIGENCIA/VENCIDA unica caen al
aviso). Los fixtures afectados no tienen membresia activa: el cliente seed
`1234567890` (`start-api-e2e.mjs` no crea filas de vigencia) y los de
`crearClientePortalApi` sin vigencia / con PROGRAMADA. **Misma clase** que
`INC06-R12`/enmienda C4 de `acceso-vencimiento.spec.ts:90` (cambio de
comportamiento aprobado, NO regresion `ACC-07`): el inventario de impacto
R5/R12 cubrio **solo** ese viaje y **no inventario** estos 3 viajes de
`portal.spec.ts`. Verificado que `portal.spec.ts`, `start-api-e2e.mjs` y
`prisma/seed.ts` estan **byte a byte intactos** (`git diff --stat` vacio vs
HEAD). **Owner**: decision del orquestador — enmienda patron C4 bajo contrato
propio o revision de alcance. No tocado en esta tarea (el contrato prohibe
corregir aqui).

**Riesgo observado (sin fallo)**: `portal.spec.ts:36 › portal muestra
secciones de información` y la asercion `:27` ("Mi Portal") pasan 2/2 porque
capturan el **render de carga** previo a la respuesta del resumen; el estado
estacionario del cliente seed es ahora el aviso (sin tarjetas). Riesgo latente
de flake / asercion sobre estado transitorio — para la auditoria y la
revision.

**Seccion 5 sin tocar**: el recorrido por fila de la matriz de navegacion es
entrega de `ui-navigation-auditor`; aqui solo consta la bateria automatizada.

## 5. Auditoria de navegacion (EJECUTADA 2026-10-29 — `ui-navigation-auditor` + cierre H-01/H-02)

**Informe de `ui-navigation-auditor` (2026-10-29)**: matriz INC-06 (12 filas
del spec) revisada fila a fila contra evidencia ejecutada (Playwright de
`test-engineer`, logs revisados) + contraste estatico. **Decision D-01 del
orquestador**: la evidencia ejecutada por QA (logs persistidos) es evidencia
ejecutada valida para la casilla de navegacion. Resultado por fila (W4:
persistido aqui por el orquestador):

| Fila | Pantalla | Estado | Entrada | Resultado | Evidencia |
|---|---|---|---|---|---|
| ACC-05+ACC-01 | `/login-cliente`->`/portal` | sin membresia (F2) | URL directa + login | **VERIFICADO** (copy DEC-051 exacto, `role="alert"`, 0x "suspension", 4 tarjetas ausentes) | `inc06-acceso-membresia.spec.ts:299` x2 viewports |
| ACC-01 | `/portal` aviso | recarga | reload | **VERIFICADO** (aviso persiste) | `:314` |
| ACC-01 | `/portal` aviso | atras tras recarga | goBack | **VERIFICADO** (sin bucle; recomposicion `router.replace("/portal")` idempotente) | `:327` |
| ACC-06 | `/portal` aviso | movil 375px | carga | **VERIFICADO** (sin overflow) | `:299` movil |
| ACC-06 | `/portal` aviso | escritorio 1280px | carga | **VERIFICADO** (H-02 cerrado: overflow medido en ambos viewports, `:322-325`) | `:299` escritorio + cierre H-02 |
| ACC-06 | `/portal` aviso | teclado | Tab | **VERIFICADO** (`role="alert"` + heading; sin foco trampa; logout alcanzable) | `:344` |
| ACC-07 | `/portal` con acceso (F7) | URL directa + recarga + atras | CLIENTE | **VERIFICADO** (portal completo sin aviso, destinos intactos) | `:559` |
| ACC-05 | sesion expirada -> login -> portal | 401 real + F2 | CLIENTE | **VERIFICADO** (banner DEC-010 + aviso; sin bucle) | `:376` |
| ACC-04 | `/recepcion` consulta+ingreso F2 | flujo staff | DUENO | **VERIFICADO** (403 mensaje existente en zona actual) | `:462` |
| ACC-04 | `/recepcion` consulta+ingreso F2 | flujo staff | RECEPCIONISTA | **VERIFICADO (ejecutado, cierre H-01b)** | `:518` (x2 corridas completas) |
| ACC-02 | `/recepcion` + `/portal` mixto F3 | flujo | CLIENTE/staff | **VERIFICADO** (ingreso 403 por API real; portal sin aviso, destinos intactos; salvedad: la pierna UI de recepcion con F3 se verifico con F2) | `:504` |
| ACC-04 | `/login` staff | URL directa | DUENO/RECEPCIONISTA | **VERIFICADO** (sin cambio) | `auth.spec.ts:4,11,19,27` |
| Logout CLIENTE portal completo | `/portal` F7 | clic "Cerrar sesion" | CLIENTE | **VERIFICADO (ejecutado, cierre H-01c)** -> `/login-cliente` | `:652` |
| App movil nativa | — | — | — | **NO APLICA (justificado)** | no existe app movil en el MVP |
| Landing `/` | anonimo | URL directa | — | **VERIFICADO** (sin cambio; salvedad: via navegacion/signOut, no `goto("/")` literal) | `inc07`, `auth.spec.ts:27` |

**Sin enlaces rotos ni bucles**. **Logout staff desde `/recepcion`**: sin
control propio (H-03, preexistente INC-03, `Navbar showAuth={false}`) —
**escalado a Producto** (fuera de alcance INC-06/07). Hallazgos del auditor
H-01..H-08: H-01b/H-01c/H-02 cerrados aqui; H-04 cerrado (logs persistidos);
H-05 opcional; H-06/H-07 backlog; H-08 documental.

Pendiente de `ui-navigation-auditor`: recorrer la matriz de navegacion del
`spec.md` (viajes por rol, movil/escritorio/teclado, URL directa, recarga,
atrás, sesion expirada, sin bucles/enlaces rotos) y devolver el resultado fila
por fila con evidencia. Ningun viaje pasa a `VERIFICADO` sin ejecucion real.

**Linea de estado de la enmienda (2026-10-29)**: el micro-fix del viaje F3
(`INC06-ACC-02`, matriz: "portal sin aviso; destinos intactos") y la enmienda
C4 del viaje de vencimiento unico de `acceso-vencimiento.spec.ts`
(`INC06-R12`/`INC06-ACC-01`, DEC-048 + DEC-051 PEND-03(a)) estan **aplicados y
ejecutados** por `test-engineer` bajo contrato propio (15/15 E2E verdes,
antes/despues y comandos en la seccion 3); las filas de la matriz afectadas
conservan su estado **NO VERIFICADO** hasta el recorrido por fila del auditor
con evidencia (el cambio de expectativas del viaje de vencimiento unico se
registra aqui como cambio de comportamiento aprobado, no como regresion).

**Linea de estado de la enmienda C4 de `portal.spec.ts` (2026-10-29)**: los 3
viajes aceptados INC-03 (`INC03-POR-01/06/07`) quedan **enmendados y
ejecutados** por `test-engineer` bajo contrato propio (patron C4; los 3
**reasignados** a fixtures con membresia activa — GYM ACTIVA, NUTRICION ACTIVA
sin vigencia GYM y GYM en frontera + NUTRICION ACTIVA — con aserciones byte a
byte; decision y antes/despues en la seccion 3). Verificacion: `portal.spec.ts`
**8/8 verdes** (salvedad: crash transitorio de worker `0xC0000409` en la 1a
corrida, no reprodujo) y suite completa **88/88 verdes x2 corridas**. Las
filas de la matriz afectadas conservan su estado **NO VERIFICADO** hasta el
recorrido por fila del auditor con evidencia; el cambio es comportamiento
**aprobado** (`INC06-ACC-01`, DEC-048 + DEC-051 PEND-03(a)), no regresion.

### Cierre de hallazgos H-01/H-02 (viajes faltantes) — `test-engineer`, contrato del orquestador (2026-10-29)

El informe de `ui-navigation-auditor` (2026-10-29) dejo filas de la matriz
**sin recorrido ejecutado**. Esta tarea cierra los hallazgos asignados a
INC-06 (**H-01b** flujo `ACC-04` con RECEPCIONISTA; **H-01c** logout CLIENTE
desde el portal completo F7; **H-02** overflow del aviso en escritorio
1280px) con viajes/aserciones E2E reales ejecutados en navegador (Chromium,
Playwright; API E2E SQLite temporal + web dev server). Destinos fijados:
403 con el mensaje existente en recepcion, logout CLIENTE ->
**`/login-cliente`** (DEC-051 PEND-02(a): login intacto) y aviso sin scroll
horizontal en ambos viewports de `ACC-06`. Los hallazgos **H-01a** (URL
directa `/dashboard` staff) y **H-01d** (logout staff -> `/`, DEC-050) se
cierran con viajes en `inc07-dashboard-staff.spec.ts` y quedan registrados en
la seccion 5 de
`docs/incrementos/INC-07-navegacion-login-pin/evidencia.md` (mismas corridas).

Filas afectadas — Resultado/Evidencia (criterio / pantalla / estado / entrada
/ salida esperada / rol / prueba / resultado / evidencia):

| Hallazgo | Criterio | Pantalla | Estado | Entrada | Salida esperada | Rol | Prueba | Resultado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| H-01b | `ACC-04` (fila `/recepcion` consulta + ingreso de la matriz INC-06) | `/recepcion` | cliente F2 (GYM vencida) en consulta e ingreso | Flujo recepcion con sesion **RECEPCIONISTA**: consulta por cedula + registrar ingreso | Consulta muestra estado **"Vencido"**; ingreso **403** con el mensaje existente exacto ("La membresía no está habilitada para ingresar (vencida el <fecha>)"), sin "Ingreso registrado"; la API real con el token del RECEPCIONISTA responde el mismo 403 `INGRESO_NO_PERMITIDO` | RECEPCIONISTA | `club-beasts-web/tests/e2e/inc06-acceso-membresia.spec.ts:518` | **VERIFICADO (ejecutado)** — 2 corridas completas verdes | Playwright x2 `94 passed`; logs `%TEMP%\opencode\inc07-inc06-h01-h02-pw-run1.log` / `...-run2.log` |
| H-01c | logout por rol (matriz INC-06: "el logout del portal (`signOut -> /login-cliente`) queda intacto"; `ACC-07` "mismos destinos que hoy") | `/portal` (portal completo) | CLIENTE F7 con membresia ACTIVA (sin aviso) | Clic en "Cerrar sesion" del portal completo | **`/login-cliente`** con la pantalla "Portal del Cliente" y su formulario visibles (login intacto, DEC-051 PEND-02(a)) | CLIENTE | `inc06-acceso-membresia.spec.ts:652` | **VERIFICADO (ejecutado)** — x2 | idem |
| H-02 | `ACC-06` (fila "Carga en **movil** (375px) y **escritorio**" de la matriz INC-06) | `/portal` (aviso) | sin membresia activa (F2) | Carga del aviso en movil 375px y escritorio 1280px | Copy completo visible **sin scroll horizontal en AMBOS viewports** (antes solo se media en movil) | CLIENTE | `inc06-acceso-membresia.spec.ts:312` (asercion extendida `:322-325`, 1 test x 2 viewports) | **VERIFICADO (ejecutado)** — x2 (instancias movil y escritorio verdes) | idem |

**Nota de cierre H-01/H-02 (2026-10-29, `test-engineer`)**: **6 viajes E2E
nuevos verdes** (2 en `inc06-acceso-membresia.spec.ts` para H-01b/H-01c y 4
en `inc07-dashboard-staff.spec.ts` para H-01a/H-01d) + **1 extension de
asercion** (H-02: `expectSinOverflowHorizontal` del aviso ahora se mide en
movil 375px **y** escritorio 1280px, `inc06-acceso-membresia.spec.ts:322-325`;
antes solo movil). Sin tocar `src/`, backend, prisma, seeds, otros tests
aceptados ni specs de incremento. Comandos ejecutados (logs persistidos en
`%TEMP%\opencode\` por trazabilidad H-04):

| # | Comando | Resultado |
|---:|---|---|
| 1 | `cd club-beasts-web && npx tsc --noEmit` | **exit 0** |
| 2 | `cd club-beasts-web && npx playwright test tests/e2e/inc07-dashboard-staff.spec.ts tests/e2e/inc06-acceso-membresia.spec.ts --reporter=line` (corrida focalizada previa) | **18 passed (1.5m), exit 0** (14 INC-06 + 4 INC-07) |
| 3 | `cd club-beasts-web && npx playwright test --reporter=line` — **corrida completa 1** | **94 passed (7.0m), exit 0** — cuenta exacta: **94** = base **88** (57 base + 12 INC-06 + 19 INC-07) + **6 viajes nuevos** (2 INC-06 + 4 INC-07); cero fallos |
| 4 | `cd club-beasts-web && npx playwright test --reporter=line` — **corrida completa 2** | **94 passed (7.1m), exit 0** — resultado **IDENTICO** al de la corrida 1 (mismos 94 tests, cero fallos) |
| 5 | `cd club-beasts-web && npx vitest run` | **204 passed / 0 failed (204), exit 0** — **sin cambios** (sin tests unit nuevos; unit intactos) |

Log integros: `%TEMP%\opencode\inc07-inc06-h01-h02-tsc.log`,
`inc07-inc06-h01-h02-pw-focused.log`, `inc07-inc06-h01-h02-pw-run1.log`,
`inc07-inc06-h01-h02-pw-run2.log`, `inc07-inc06-h01-h02-vitest.log` y snapshot
`inc07-inc06-h01-h02-git-status.log`.

**Salvedad `git status` (62 rutas sucias)**: la mayoria son **preexistentes**
a esta tarea (trabajo sin commitear de INC-05/INC-06/INC-07, `.opencode/`,
`AGENTS.md`, `docs/producto/`, `opencode.jsonc`); esta tarea solo toco sus
**4 archivos permitidos** (`inc06-acceso-membresia.spec.ts` con
H-01b/H-01c/H-02, `inc07-dashboard-staff.spec.ts` nuevo y las secciones 5 de
las dos `evidencia.md`). Cero cambios en `src/`, `club-beasts-api/`,
`prisma/`, seeds, `docs/producto/`, `playwright.config.ts`,
`tests/e2e/e2e-helpers.ts` ni otros tests aceptados.

**0 puntos** (solo el orquestador certifica; regla de no duplicado): esta
tarea no cambia el estado de ningun criterio; las filas cerradas quedan con
evidencia **ejecutada en navegador** para la decision del orquestador sobre
la casilla de recorridos obligatorios de navegacion.

## 6. Revision (EJECUTADA 2026-10-29 — `code-reviewer`)

**Veredicto: ACEPTA CON HALLAZGOS NO BLOQUEANTES** (0 bloqueantes; revision
combinada INC-07/INC-06). Reprodujo API **658/658**, Gherkin **220/220**, web
**204/204**, build PASS, E2E **94/94 exit 0**. Cobertura de los 8 puntos del
contrato (no-duplicado HU-16/25/30/08/15/17, fuente unica + guardas intactas,
pruebas sin aserciones vacias, base sin perdida, seguridad/privacidad, H-07
backlog, consistencia documental): **todos CUMPLEN**. Enmiendas C4 verificadas
con valor de regresion conservado (fixture `apellidos`, micro-fix F3, C4
`acceso-vencimiento.spec.ts`, C4 `portal.spec.ts` reasignado). Hallazgos
W1..W4/S1/S2 del informe combinado: W1 cerrado (fixture NAV-04, INC-07);
W2 backlog (`portal.spec.ts:56` clase transitoria, test base aceptado);
W3/W4 cerrados (documentales); S1/S2 backlog.

Pendiente de `code-reviewer`: no duplicado (HU-16/25/30/08/15/17), fuente unica
de estado (`INC06-CONF-01`), orden de guardas intacto (`INC06-CONF-03`),
regresion de la base certificada, pruebas sin aserciones vacias ni pasos
opcionales.

## 7. Cierre y certificacion (solo el orquestador)

**CERRADO Y ACEPTADO el 2026-10-29.** Pipeline completo ejecutado: LISTO 4/4
(DEC-051 + contrato R1..R5 + CONF/no-duplicado + matriz aprobada) -> RED (31
pruebas rojas: API 26, Gherkin 6, unit 6, E2E 12) -> GREEN backend
(`resolverAccesoApp` R1/R2/R10, `GET /portal/resumen` aditivo R3, guard
Gherkin 220) + GREEN web (aviso a pantalla completa DEC-051, guardas PIN
intactas) + micro-fix fixture (precedente INC-01) + micro-fix F3 + **enmiendas
C4** (`acceso-vencimiento.spec.ts` viaje vencimiento unico; `portal.spec.ts`
3 viajes INC-03 reasignados a fixtures con membresia activa) -> VERIFICADO
(bateria 88/88 x2) -> auditoria de navegacion (resultado por fila en seccion
5; H-01b/H-01c/H-02 cerrados) -> REVISADO (ACEPTA CON HALLAZGOS NO
BLOQUEANTES) -> **ACEPTADO**.

Este incremento **no certifica puntos** (0; mejora de regla de negocio DEC-048;
regla de no duplicado verificada en revision): la certificacion de cierre es
el registro del cambio de regla en `docs/producto/avance.md` /
`decisiones.md` con la evidencia ejecutada.
