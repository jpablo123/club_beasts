# INC-07 - Evidencia

Estado del incremento: **ACEPTADO (2026-10-29)**. Pipeline completo: LISTO 4/4
-> RED (29 rojos) -> GREEN (29/29) -> VERIFICADO (bateria 88/88 x2 -> 94/94 x2
tras cierre H-01/H-02 y W1) -> auditoria de navegacion -> REVISADO
(`code-reviewer` 2026-10-29: **ACEPTA CON HALLAZGOS NO BLOQUEANTES**; W1
cerrado, W2 backlog, W3/W4 corregidos) -> **ACEPTADO**. **0 puntos certificados**
(regla de no duplicado; DEC-049 es UX sobre flujos aceptados).

**Nota de estado 2026-10-20 (apertura del paquete)**: DEC-049 fue aprobada por
el Producto; `acceptance-criteria-analyst` inventario las pantallas de auth
(`/login`, `/login-cliente`, rama `debeCambiarPin` y rama `pinChangeSuccess` de
`/portal`), formulo `INC07-PEND-01` (destino por rol/estado) con recomendacion
adoptada provisionalmente, propuso contrato de frontend y redacto la matriz de
navegacion/aplicabilidad. **No se ejecuto ningun comando** en toda la apertura
(solo documentacion). Regla de cuenta (DEC-011/DEC-016): **sin evidencia de
ejecucion no se certifica ningun punto** ni se marca ningun criterio como
verificado; **ningun criterio de este spec esta `IMPLEMENTADO` ni `ACEPTADO`**
y los puntos en juego son **0** (UX sobre flujos aceptados; seccion "Regla de
no duplicado" del spec).

**Base que debe permanecer intacta**: **INC-05 cerro el 2026-10-28**, por lo
que la base de referencia al arranque del RED es la de su cierre (re-medir y
anotar aqui): API **632/632** (intacta, sin cambios backend), Gherkin
**214/214 exit 0**, web **188/188**, Playwright **57/57 x2**, migraciones
**9/0 sin drift**. INC-07 **no toca backend**: API/Gherkin se corrren solo como
base intacta. (Referencia historica INC-04: 536/153/183/56.)

## 1. Comandos de verificacion (pendientes de ejecucion)

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | RED | `club-beasts-web` | `npx tsc --noEmit` | exit 0 (el RED no rompe la compilacion) | **OK**: exit 0 | 2026-10-29 |
| 2 | RED | `club-beasts-web` | `npx vitest run` | fallos **solo** en archivos nuevos; base 183 intacta | **ROJO esperado**: 10/10 nuevos en rojo, solo `tests/unit/inc07-navegacion-auth.test.tsx`; **base web 188/188 intacta** (198 total: 188 pass / 10 fail) | 2026-10-29 |
| 3 | RED | `club-beasts-web` | `npx playwright test --reporter=line` | fallos solo en `inc07-navegacion-auth.spec.ts`; E2E aceptados intactos (base 56 sin perdida) | **ROJO esperado**: 19/19 nuevos en rojo, **todos** en `inc07-navegacion-auth.spec.ts` (`toHaveCount(1)` recibe 0: link/CTA ausente); **base E2E 57/57 intacta** (76 total, 7.6m) | 2026-10-29 |
| 4 | RED | `club-beasts-api` | `npx vitest run` | base 536 intacta (sin cambios backend) | **OK**: **632/632 pass, exit 0** (base API intacta) | 2026-10-29 |
| 5 | RED | - | `git status --porcelain` | cero cambios en `club-beasts-api/src/`, `prisma/`, `docs/producto/` y otros incrementos | **OK (con nota)**: esta tarea solo modifico sus 3 archivos permitidos (2 tests nuevos + esta evidencia); el arbol **arranco** con 50 rutas sucias preexistentes de otros incrementos (33 modificadas + 17 sin trackear: INC-05/INC-06, `.opencode/`, `AGENTS.md`, `docs/producto/`, `opencode.jsonc`) identicas al snapshot inicial, **sin tocar** por esta tarea | 2026-10-29 |
| 6 | GREEN | `club-beasts-web` | `npx tsc --noEmit` | exit 0, 0 errores | **OK**: exit 0 | 2026-10-29 |
| 7 | GREEN | `club-beasts-web` | `npx vitest run` | base 183/183 intacta + tests nuevos en verde | **OK (con salvedad INC-06)**: 204 tests: **200 pass / 4 fail**; los **10 unit de `inc07-navegacion-auth.test.tsx` pasaron a verde** (RED -> GREEN); base 188/188 intacta; los 4 fail son los preexistentes de `inc06-aviso-membresia.test.tsx` (RED de INC-06, fuera de mi alcance) | 2026-10-29 |
| 8 | GREEN | `club-beasts-web` | `npm run build` | PASS | **OK**: PASS, sin errores (compila `/login`, `/login-cliente`, `/portal` con los links nuevos) | 2026-10-29 |
| 9 | VERIFICADO | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base + `inc07-navegacion-auth.spec.ts` verdes (clic y teclado, movil/escritorio) | **VERIFICADO x2 (consistente)**: **88 tests: 85 passed / 3 failed (6.3m), exit 1 — resultado IDENTICO en las 2 corridas** (mismos tests y mensajes); INC-07 **19/19 verdes** (clic y teclado, movil 375px/escritorio 1280px, atras/recarga con guarda, callbackUrl/fallbacks) y INC-06 12/12 verdes; base **54/57** — 3 rojos `portal.spec.ts` (INC-03) por el cambio **aprobado** de INC-06 (snapshots: aviso DEC-051; **cero fallos atribuibles a INC-07**; detalle seccion 4 "VERIFICADO"). Total real **88** = 57 base + 19 INC-07 + 12 INC-06. Estabilidad extra: `--repeat-each=2` inc07+inc06 = **62/62 exit 0** | 2026-10-29 |
| 10 | VERIFICADO | `club-beasts-api` | `npx vitest run` + `npm run test:gherkin` x2 + `npx prisma migrate status` | bases intactas (prudencia: backend intocado) | **OK**: API **658/658 pass exit 0** (= 632 base + 26 INC-06, intacta); Gherkin **220/220 exit 0 en las 2 corridas identicas** (= 214 base + 6 INC-06; guard 220 satisfecho); migraciones **9 migrations found / "Database schema is up to date!" / exit 0** = 9/0 sin drift | 2026-10-29 |
| 11 | Navegacion | web (auditoria) | recorrido de la matriz del spec por `ui-navigation-auditor` | todos los viajes `VERIFICADO` con evidencia; sin bucles ni enlaces rotos | _sin ejecutar_ | - |
| 12 | Revision | web + `docs/` | revision `code-reviewer`: re-ejecucion de esta tabla + lectura de `spec.md`, `decisiones.md` | sin hallazgos bloqueantes | _sin ejecutar_ | - |
| 13 | VERIFICADO (bateria, INC-07 paso 7 / INC-06 tarea 14) | api + web | bateria completa del contrato (8 comandos + x2 + repeat; detalle seccion 4 "VERIFICADO") | 8/8 comandos ejecutados; bases intactas = base + nuevos; x2 consistente | **OK con hallazgo de base (no de INC-07)**: tsc api 0 / vitest api 658/658 / gherkin 220/220 x2 / migraciones 9/0 / tsc web 0 / vitest web 204/204 / build PASS / Playwright 88 (85 pass, 3 fail) x2 identico + repeat 62/62; **INC-07 100% verde** (10 unit + 19 E2E x2); hallazgo: 3 rojos base `portal.spec.ts` por el cambio aprobado `INC06-ACC-01` (enmienda pendiente del orquestador) | 2026-10-29 |

Comandos reproducibles (uno por verificacion):

```bash
# Web (principal)
cd club-beasts-web && npx tsc --noEmit
cd club-beasts-web && npx vitest run
cd club-beasts-web && npm run build
cd club-beasts-web && npx playwright test

# Base intacta (prudencia; backend intocado)
cd club-beasts-api && npx vitest run
cd club-beasts-api && npm run test:gherkin
cd club-beasts-api && npx prisma migrate status
```

## 2. Estado por criterio (RED + GREEN + VERIFICADO ejecutados 2026-10-29; pendiente auditoria de navegacion + revision)

| Criterio | Estado spec (2026-10-20) | Estado verificado | Evidencia |
|---|---|---|---|
| `INC07-NAV-01` | SPEC (adoptado PEND-01(a), ratificada DEC-050) | **VERIFICADO (automatizado)**; pendiente auditoria navegacion + revision | Unit 2/2 + E2E 4/4 verdes en las **2 corridas completas x2** (clic y teclado, movil 375px y escritorio 1280px) + `--repeat-each=2` verde; tsc exit 0; build PASS, 2026-10-29 |
| `INC07-NAV-02` | SPEC (adoptado PEND-01(a)) | **VERIFICADO (automatizado)**; pendiente auditoria + revision | Unit 2/2 (incluye link cruzado conservado) + E2E 4/4 verdes x2 (clic y teclado, 2 viewports), 2026-10-29 |
| `INC07-NAV-03` | SPEC (adoptado PEND-01(a)) | **VERIFICADO (automatizado)**; pendiente auditoria + revision | Unit 1/1 (link fuera de `<nav>`, re-render repinta el formulario) + E2E 4/4 verdes x2 (atras + recarga con guarda `debeCambiarPin` intacta, cambio de PIN completo sin tocar la carrera `update()`), 2026-10-29 |
| `INC07-NAV-04` | SPEC | **VERIFICADO (automatizado)**; pendiente auditoria + revision | Unit 1/1 (CTA `href="/portal"` nativo, fuera de `<nav>`) + E2E 4/4 verdes x2 (clic y teclado, 2 viewports, hasta portal completo), 2026-10-29 |
| `INC07-NAV-05` | SPEC (regresion INC00-AUTH-03) | **VERIFICADO (automatizado)**; pendiente auditoria + revision | Unit 4/4 + E2E 3/3 verdes x2 (`callbackUrl=/clientes` conservado y distinguible del fallback, fallback staff `/clientes`, fallback cliente `/portal`), 2026-10-29 |
| `INC07-NAV-06` | SPEC (regresion E2E aceptados) | **VERIFICADO** (cierre 2026-10-29) — cero regresiones atribuibles a INC-07; los 3 rojos transitorios de `portal.spec.ts` (`INC03-POR-01/06/07`) fueron resueltos por la **enmienda C4** de INC-06 (3 viajes reasignados a fixtures con membresia activa, aserciones byte a byte; `docs/incrementos/INC-06-*/evidencia.md` §3) y la base volvio a **57/57**; cierre de H-01/H-02 (6 viajes nuevos) + cierre W1 (fixture NAV-04 con vigencia ACTIVA) dejaron la bateria final en **94/94 verdes x2 identicas** (logs: `%TEMP%\opencode\inc07-inc06-h01-h02-pw-run1/2.log`, `inc07-w1-pw-full.log`); `--repeat-each=2` 62/62 | E2E completas x2 identicas (2026-10-29) |

Regla de no duplicado a verificar en revision (`spec.md`, seccion homonima):
HU-01/02/03 (bloque 1, 10/10) y HU-25 + E2E de cambio de PIN (INC-03/04) **ya
estan pagados**; en INC-07 todo criterio se verifica **sin aportar punto
propio** y la certificacion es **0 puntos**.

## 3. RED (EJECUTADO 2026-10-29 — `test-engineer`, contrato del orquestador)

**Fase RED completada.** Todos los tests nuevos estan **en rojo por el
link/CTA ausente** (el GREEN es de `frontend-developer`; `src/` intacto).
Ningun criterio pasa a `IMPLEMENTADO`/`VERIFICADO`/`ACEPTADO` con este paso:
0 puntos (regla de no duplicado).

### Archivos nuevos/afectados (solo los 3 permitidos por contrato)

| Archivo | Contenido | Criterios |
|---|---|---|
| `club-beasts-web/tests/unit/inc07-navegacion-auth.test.tsx` | 10 tests unit (render + localizador + `href` exacto + orden de Tab por pantalla/estado + ramas `useSession`) | `NAV-01..05` |
| `club-beasts-web/tests/e2e/inc07-navegacion-auth.spec.ts` | 19 tests E2E (clic y teclado, movil 375px / escritorio 1280px; atras y recarga en NAV-03; callbackUrl/fallbacks en NAV-05) | `NAV-01..05` |
| `docs/incrementos/INC-07-navegacion-login-pin/evidencia.md` | solo secciones 1 (filas RED), 2 y 3 (esta) | - |

### Conteo de rojos por archivo (motivo uniforme: localizador nuevo ausente)

| Archivo | Rojos | Detalle por criterio | Motivo observado |
|---|---|---|---|
| `tests/unit/inc07-navegacion-auth.test.tsx` | **10/10** | NAV-01: 2, NAV-02: 2, NAV-03: 1, NAV-04: 1, NAV-05: 4 | `getAllByRole("link", { name: "Volver al inicio" })` / `findAllByRole("link", { name: "Ir a mi portal" })` → *unable to find element* (hoy no existen en `src/`) |
| `tests/e2e/inc07-navegacion-auth.spec.ts` | **19/19** | NAV-01: 4, NAV-02: 4, NAV-03: 4, NAV-04: 4, NAV-05: 3 | `expect(link).toHaveCount(1)` → `Received: 0` (19/19; cero fallos de fixtures/API/entorno) |

### Comandos ejecutados y resultados exactos (2026-10-29)

| Comando | Resultado |
|---|---|
| `cd club-beasts-web && npx tsc --noEmit` | **exit 0** |
| `cd club-beasts-web && npx vitest run` | **198 tests: 188 pass / 10 fail** (los 10 fail = `inc07-navegacion-auth.test.tsx`; **base web 188/188 intacta**) |
| `cd club-beasts-web && npx playwright test --reporter=line` | **76 tests: 57 pass / 19 fail** (los 19 fail = `inc07-navegacion-auth.spec.ts`; **base E2E 57/57 intacta**; 7.6m) |
| `cd club-beasts-api && npx vitest run` | **632/632 pass, exit 0** (base API intacta; backend intocado) |
| `cd club-beasts-api && npx prisma migrate status` | **9 migrations found / "Database schema is up to date!"** — 9/0 sin drift, sin migraciones nuevas |
| `git status --porcelain` | 50 rutas sucias **preexistentes** al contrato (33 modificadas + 17 sin trackear: INC-05/INC-06, `.opencode/`, `AGENTS.md`, `docs/producto/`, `opencode.jsonc`) identicas al snapshot inicial; **esta tarea solo toco sus 3 archivos permitidos** |

### Bases intactas y no-modificacion de aceptados

- Base web **188/188**, base E2E **57/57**, base API **632/632**: sin perdida.
- **Ningun test aceptado modificado ni eliminado**; ningun archivo de
  `src/`, `club-beasts-api/`, `prisma/`, `docs/producto/` ni de
  `docs/incrementos/INC-06-*` fue tocado. Tampoco `playwright.config.ts`,
  `vitest.config.ts` ni `tests/e2e/e2e-helpers.ts`.
- Localizadores C4 aplicados: `getByRole("link", { name, exact: true })`
  (Playwright) con `toHaveCount(1)` + `toBeVisible()` + `href` exacto; en
  unit, `getByRole("link", { name })` — en `@testing-library/dom` el string
  de `name` compara por igualdad completa (equivalente de `exact: true`;
  RTL no expone esa opcion en `ByRoleOptions`) + unicidad
  `getAllByRole(...).toHaveLength(1)` + `getAttribute("href")`. En la rama
  `debeCambiarPin` jamas se usa `a[href="/"]` global ni `nav a[href="/"]`
  (C3): el unico selector es el nombre de rol exacto y `link.closest("nav")`.

### Correcciones aplicadas al borrador RED preexistente (4 defectos que habrian fallado tambien en verde)

1. Unit NAV-03 asertaba `nav a[href="/"]` -> `null`, pero el **logo del
   Navbar es `a[href="/"]` dentro de `<nav>`**: cambiado a
   `link.closest("nav") === null` (esencia del C3).
2. E2E NAV-05 autenticaba con `loginComoDueno`, cuyo helper re-navega a
   `/login` y **borraba el `callbackUrl`** antes del submit (prueba incapaz
   de distinguir callback de fallback = asercion vacia): cambiado a login en
   linea que conserva el query + caso unit con `callbackUrl` distinguible
   (`/clientes/cliente-42`).
3. `expectLanding` exigia el CTA "Iniciar sesion", inexistente para un
   CLIENTE autenticado (la landing muestra "Ir al sistema"): separado
   `expectLanding` (hero, valido con y sin sesion) de
   `expectLandingConCtasDeLogin` (solo flujos anonimos, fila de matriz).
4. Fixture `apellidos: "Inc07"` rechazado por el backend (400 "Apellidos
   solo pueden contener letras y espacios"): cambiado a `apellidos:
   "Navegacion"`; verificado que el unico motivo de rojo sea el localizador
   ausente (0 errores de fixtures en la corrida final).

### Notas y riesgos para el orquestador

- **Entorno**: la primera corrida E2E fallo por servidores `webServer`
  huérfanos (API 3001 + Next 3000) de un intento interrumpido previo
  (creados 12:50, sin runner activo); se limpiaron esos 2 procesos y se
  re-ejecuto la corrida completa. Log integro:
  `C:\Users\User\AppData\Local\Temp\opencode\inc07-red-playwright.log`.
- **NAV-05 observabilidad**: el escenario literal de la matriz
  (`callbackUrl=/clientes` -> `/clientes`) es indistinguible del fallback
  staff (`/clientes`); se cubrio la observabilidad con (a) asercion de que
  el query sobrevive al render del link, (b) login en linea que no borra el
  query y (c) unit con `callbackUrl=/clientes/cliente-42` (distinto del
  fallback). Si el orquestador prefiere un caso E2E distinguible adicional
  (p. ej. `callbackUrl=/dashboard`), se agrega con contrato propio.
- La corrida Playwright del RED es **x1**; la matriz/`NAV-06` piden x2 en
  VERIFICADO (paso 7).
- Gherkin no aplica (sin backend nuevo; DEC-049 es 100% frontend):
  `npm run test:gherkin` queda como prudencia del paso VERIFICADO.

## 4. Verificacion / GREEN (EJECUTADO 2026-10-29 — `frontend-developer`)

**Fase GREEN completada.** Los 10 unit y los 19 E2E del RED pasaron a
**verde** con la implementacion fiel al contrato ratificado (C1..C6). Ningun
test fue modificado; ninguna rama `useSession` nueva gatea la visibilidad del
link. **0 puntos** (regla de no duplicado; nada pasa a `ACEPTADO` con este
paso: faltan VERIFICADO, auditoria de navegacion y revision).

### Archivos modificados (solo los permitidos por contrato)

| Archivo | Cambio | Criterios |
|---|---|---|
| `club-beasts-web/src/app/login/page.tsx` | Link "Volver al inicio" como **hermano DESPUES** de "Portal del Cliente" dentro del `div.mt-6.text-center`. `href="/"` por defecto; `href="/dashboard"` solo con sesion staff (`useSession()`, rama C1 inobservable por middleware; link **siempre visible**, sin gatear por `status`). Estilo consistente con el link cruzado (`text-sm text-gray-400 hover:text-royal`) | `NAV-01` |
| `club-beasts-web/src/app/login-cliente/page.tsx` | Mismo patron: "Volver al inicio" **despues** del link cruzado "Iniciar sesion como Dueno/Recepcionista" (`href="/login"`, conservado intacto). `href="/"` por defecto; `href="/portal"` solo con sesion CLIENTE (C1) | `NAV-02` |
| `club-beasts-web/src/app/portal/page.tsx` | (a) Rama `debeCambiarPin`: link "Volver al inicio" `href="/"` (`next/link`) **debajo del `ChangePinForm` y fuera de `<nav>`** (C3); sin tocar `ChangePinForm` ni `pinChangeInProgress`/`session-traffic`. (b) Rama `pinChangeSuccess`: CTA "Ir a mi portal" como **`<a href="/portal">` nativo** (C2: misma URL no remonta el componente con `next/link`) dentro de la tarjeta de exito y fuera de `<nav>` | `NAV-03`, `NAV-04` |
| `docs/incrementos/INC-07-navegacion-login-pin/evidencia.md` | solo secciones 1 (filas 6-8) y 4 (esta) | - |

### Comandos ejecutados y resultados exactos (2026-10-29)

| Comando | Resultado |
|---|---|
| `cd club-beasts-web && npx tsc --noEmit` | **exit 0** |
| `cd club-beasts-web && npx vitest run` | **204 tests: 200 pass / 4 fail** — los **10/10 unit de `inc07-navegacion-auth.test.tsx` en verde** (RED -> GREEN: localizadores `href` exactos, orden de Tab, ramas `useSession`, guarda PIN intacta, `callbackUrl` intacto); **base web 188/188 intacta**; los **4 fail = `inc06-aviso-membresia.test.tsx`** (6 tests: 2 pass/4 fail), RED **preexistente de INC-06** fuera del alcance de esta tarea |
| `cd club-beasts-web && npx playwright test tests/e2e/inc07-navegacion-auth.spec.ts --reporter=line` | **19 passed (1.0m) — 19/19 en verde** (RED -> GREEN: clic y teclado, movil 375px y escritorio 1280px, atras/recarga con guarda intacta, cambio de PIN completo sin tocar la carrera `update()`, CTA `href="/portal"` a portal completo, callbackUrl/fallbacks intactos) |
| `cd club-beasts-web && npx playwright test --reporter=line` | **88 tests: 77 pass / 11 fail (7.1m)** — **base E2E 57/57 intacta** + INC-07 **19/19 verdes** + 1 pass extra de INC-06; los **11 fail = `inc06-acceso-membresia.spec.ts`**, RED **preexistente de INC-06** (salvedad prevista en el contrato) |
| `cd club-beasts-web && npm run build` | **PASS** (sin errores; rutas `/login`, `/login-cliente`, `/portal` compilan con los links nuevos) |
| `git status --porcelain` | **Delta de esta tarea: 3 archivos `src/` permitidos** (`login/page.tsx`, `login-cliente/page.tsx`, `portal/page.tsx`) + esta evidencia. El arbol llego **sucio** con trabajo preexistente de otros incrementos (INC-05/INC-06, `.opencode/`, `AGENTS.md`, `docs/producto/`, `opencode.jsonc`, features/tests API), **sin tocar** por esta tarea |

### Verificacion de los tests rojos del RED y salvedades

- **RED -> GREEN verificado**: los 10 unit + 19 E2E que `test-engineer` dejo
  en rojo el 2026-10-29 pasan **todos** en verde (contados arriba). Ningun
  test nuevo ni aceptado fue modificado (los unicos tests en rojo son los
  preexistentes de INC-06 y ninguno es de INC-07).
- **Salvedad INC-06 (no mios)**: 4 unit (`inc06-aviso-membresia.test.tsx`) y
  11 E2E (`inc06-acceso-membresia.spec.ts`) en rojo **preexistentes al GREEN**
  (RED de INC-06, cuyo GREEN corre por contrato aparte). Cero fallos de INC-07
  en ambas corridas.

### No-interferencia confirmada (INC07-CONF-02/03, NAV-05/06)

- `resolvePostLoginPath` y el query `callbackUrl` intactos (los unit/E2E
  `NAV-05` en verde: `callbackUrl=/clientes` -> `/clientes`,
  `/clientes/cliente-42` distinguible del fallback, fallbacks `/clientes` y
  `/portal` conservados).
- Guarda `debeCambiarPin` intacta: navegar fuera y volver a `/portal`
  repinta el formulario (unit + E2E NAV-03 verdes); sin bypass ni dismissal.
- Carrera `update()`/`pinChangeInProgress` sin tocar: el cambio de PIN
  obligatorio completo sigue pasando (E2E NAV-03 y `cambio-pin-obligatorio`
  dentro de la corrida completa, 57/57 base intacta).
- Sin cambios en `middleware.ts`, `redirect.ts`, `session-traffic.ts`,
  `Navbar.tsx`, `ChangePinForm.tsx`, backend ni prisma.

**Nota de alcance**: la corrida Playwright del GREEN es **x1**; la matriz y
`NAV-06` piden x2 en VERIFICADO (paso 7, `test-engineer`). La evidencia de
la matriz de navegacion la aporta `ui-navigation-auditor` (seccion 5).

### VERIFICADO (bateria completa — `test-engineer`, 2026-10-29; INC-07 paso 7 / INC-06 tarea 14)

Tarea **solo-ejecucion** con base intacta: **cero cambios de codigo, tests,
features ni prisma**; unico archivo editado de INC-07 esta evidencia.
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
| 7 | `cd club-beasts-web && npm run build` | **PASS, exit 0** (11 rutas; `/login`, `/login-cliente`, `/portal` compilan) |
| 8 | `cd club-beasts-web && npx playwright test --reporter=line` **x2 corridas consecutivas** | **88 tests: 85 passed / 3 failed (6.3m), exit 1 — IDENTICO en las 2 corridas** (mismos 3 tests, mismos mensajes de error, verificados); INC-07 **19/19 verdes**, INC-06 **12/12 verdes**; base **54/57** (3 rojos `portal.spec.ts`, ver "Hallazgo"); total real **88** |
| 9 | (estabilidad, opcional) `--repeat-each=2` sobre `inc07-navegacion-auth.spec.ts` + `inc06-acceso-membresia.spec.ts` | **62 passed / 0 failed (3.6m), exit 0** (31 viajes x 2 repeticiones) |
| 10 | (diagnostico) `npx playwright test tests/e2e/portal.spec.ts --reporter=line` | **5 passed / 3 failed (40.4s), exit 1** — los mismos 3 fallos reproducen **aislados** (no dependen del orden de la suite) |

**Consistencia x2**: Gherkin 220/220 = 220/220; Playwright 85/3 = 85/3 con
mismos tests fallidos y mensajes identicos. Sin skips/only. Logs de corrida:
`%TEMP%\inc07-inc06-verify-pw-run1.log`, `...-run2.log`, `...-repeat.log`;
snapshots de fallo en `club-beasts-web/test-results/*/error-context.md`.

**Composicion real del E2E (x2 identica; desglose por archivo verificado en
el log)**: 57 base (`acceso-roles` 3, `acceso-vencimiento` 3, `auth` 8,
`cambio-pin-obligatorio` 3, `clientes` 8, `congelacion` 5,
`inc04-estados-cliente` 4, `inc04-login-cliente-inactivo` 2,
`inc05-tipos-vigencia` 1, `membresia` 2, `portal` 8, `recepcion` 5,
`recepcion-creacion-rapida` 4, `sesion-vencida` 1) + 19
`inc07-navegacion-auth` + 12 `inc06-acceso-membresia` = **88**. **Salvedad
aritmetica del contrato**: el esperado "91" suma "+3 `acceso-vencimiento`"
que ya estan **dentro** de la base 57 (57 + 19 + 12 = **88**); el total real
ejecutado es 88.

**Hallazgo — base 54/57 por el cambio APROBADO de INC-06 (cero fallos de
INC-07)**: los 3 rojos son viajes aceptados de `portal.spec.ts` (criterios
INC-03) que asertaban el pintado PRE-DEC-048 para clientes **sin membresia
activa**:

| Test exacto | Asercion que falla (linea) | Estado del DOM (snapshot Playwright) |
|---|---|---|
| `portal.spec.ts:24 › Portal del Cliente › muestra información del cliente autenticado` | `:28` `expect(page.getByText("Carlos Rodriguez", { exact: true })).toBeVisible()` -> `element(s) not found` | aviso DEC-051: heading "No tienes una membresia activa" + "Contacta recepcion..." + "Cerrar sesion" (`INC03-POR-01`) |
| `portal.spec.ts:145 › cliente sin membresia ve Sin vigencia y Sin fecha de vencimiento, nunca Activo` | `:155` `estado.getByText("Sin vigencia", { exact: true })` -> `element(s) not found` | idem aviso (`INC03-POR-06`) |
| `portal.spec.ts:163 › los extremos de la vigencia se pintan en el portal: fechaInicio-1 Programado, ...` | `:211` caso "AntesDelInicio" (`hoy=2026-10-29, vigencia 2026-10-30 a 2026-12-08`) `estado.getByText("Programado", { exact: true })` -> `element(s) not found` | idem aviso (`INC03-POR-07`; el caso "DiaSiguiente"/VENCIDA tambien quedaria en rojo — el test aborta en el caso 1) |

**Causa (diagnostico solo-lectura; sin correcciones por contrato)**:
`portal/page.tsx:253` (`if (resumen?.sinMembresiaActiva)`) reemplaza todo el
portal por el aviso DEC-051 — comportamiento **APROBADO** (`INC06-ACC-01`,
DEC-048 + DEC-051 PEND-03(a); R1: solo {ACTIVA, CONGELADO} cuentan como
membresia activa). Los fixtures afectados no tienen membresia activa: el
cliente seed `1234567890` (`start-api-e2e.mjs` no crea filas de vigencia) y
los de `crearClientePortalApi` sin vigencia / con PROGRAMADA. El inventario
de impacto de INC-06 (R5/R12 + enmienda C4) cubrio **solo**
`acceso-vencimiento.spec.ts:90` y **no inventario** estos 3 viajes (mismo
patron que R12: cambio de comportamiento aprobado, NO regresion). Verificado
que `portal.spec.ts`, `start-api-e2e.mjs` y `prisma/seed.ts` estan **byte a
byte intactos** (`git diff --stat` vacio vs HEAD). **Owner**: decision del
orquestador — enmienda patron C4 bajo contrato propio o revision de alcance.
No tocado en esta tarea (el contrato prohibe corregir aqui).

**Riesgo observado (sin fallo)**: `portal.spec.ts:36 › portal muestra
secciones de información` y la asercion `:27` ("Mi Portal") pasan 2/2 porque
capturan el **render de carga** previo a la respuesta del resumen; el estado
estacionario del cliente seed es ahora el aviso (sin tarjetas). Riesgo latente
de flake / asercion sobre estado transitorio — para la auditoria y la
revision.

**Seccion 5 sin tocar**: el recorrido por fila de la matriz de navegacion es
entrega de `ui-navigation-auditor`; aqui solo consta la bateria automatizada.

## 5. Auditoria de navegacion (EJECUTADA 2026-10-29 — `ui-navigation-auditor` + cierre H-01/H-02)

**Informe de `ui-navigation-auditor` (2026-10-29)**: matriz INC-07 (15 filas)
revisada fila a fila contra evidencia ejecutada (Playwright de `test-engineer`,
logs revisados) + contraste estatico. **Decision D-01 del orquestador**: la
evidencia ejecutada por QA (con logs persistidos) es evidencia ejecutada
valida para la casilla de navegacion; el auditor no disponia de navegador
propio en su sesion y lo declara explicitamente. Resultado por fila (W4:
persistido aqui por el orquestador, resumen del informe del auditor):

| Fila | Pantalla | Estado | Entrada | Resultado | Evidencia |
|---|---|---|---|---|---|
| NAV-01 | `/login` anonimo | URL directa | clic | **VERIFICADO** | `inc07-navegacion-auth.spec.ts:116` x2 viewports, 88/88 x2 y 94/94 x2 |
| NAV-01 | `/login` anonimo | teclado (Tab) | Enter | **VERIFICADO** | `:129` (`toBeFocused` + navegacion a `/`) |
| NAV-01 | `/login` anonimo | movil 375px + escritorio 1280px | carga | **VERIFICADO** | `:116` (`expectSinOverflowHorizontal` ambos) |
| NAV-01 | `/login` staff autenticado | URL directa | — | **NO APLICA (justificado)** | `middleware.ts:16-21` redirige antes de montar; rama `href="/dashboard"` cubierta por unit |
| NAV-05 | `/login` con `callbackUrl=/clientes` | login valido | DUENO | **VERIFICADO** (salvedad: `/clientes` indistinguible del fallback; observabilidad reforzada con unit `/clientes/cliente-42`) | `:254` |
| NAV-02 | `/login-cliente` anonimo | URL directa | clic | **VERIFICADO** | `:145` x2 viewports |
| NAV-02 | `/login-cliente` CLIENTE autenticado | URL directa | — | **NO APLICA (justificado)** | `middleware.ts:16-19` redirige a `/portal` |
| NAV-05 | `/login-cliente` sin param | login valido | CLIENTE | **VERIFICADO** | `:285` (fallback `/portal`) |
| NAV-03 | `/portal` `debeCambiarPin` | post-login | clic -> `/` | **VERIFICADO** | `:181` x2 viewports |
| NAV-03 | `/portal` `debeCambiarPin` | atras del navegador | goBack | **VERIFICADO** (guarda intacta, sin bypass ni bucle) | `:181` |
| NAV-03 | `/portal` `debeCambiarPin` | recarga | reload | **VERIFICADO** (formulario persiste; carrera `update()` intacta) | `:181` |
| NAV-04 | `/portal` `pinChangeSuccess` | tras F3 | clic/teclado | **VERIFICADO** (W1 cerrado: fixture con vigencia ACTIVA -> estado estacionario) | `:255/:270` (post-W1 19/19) |
| NAV-06 | flujos existentes | corrida completa | x2 | **VERIFICADO** | 94/94 x2 identicas (ver seccion 1, fila 9) |
| `/dashboard` staff | URL directa | sesion staff | URL | **VERIFICADO (ejecutado, cierre H-01a)** | `inc07-dashboard-staff.spec.ts:91/:99` x2 |
| Landing `/` | anonimo | desde `/login` | clic | **VERIFICADO** (salvedad: CTAs viven en el hero, no en el Navbar; sin impacto) | `inc07:116/129/145/165`, `auth.spec.ts:27` |

**Bucles/enlaces rotos**: ninguno. Todos los `href` nuevos son rutas internas
existentes; transiciones del middleware analizadas y sin bucles. **Logout por
rol**: staff `/clientes`->`/` VERIFICADO (`auth.spec.ts:27`); staff
`/dashboard`->`/` VERIFICADO (H-01d, `inc07-dashboard-staff.spec.ts:111/:125`);
CLIENTE aviso->`/login-cliente` VERIFICADO (`inc06:344`); CLIENTE portal
completo->`/login-cliente` VERIFICADO (H-01c, `inc06:652`); **`/recepcion`
staff sin control de logout propio (H-03, preexistente INC-03) -> escalado a
Producto** (fuera de alcance INC-06/07). Hallazgos del auditor H-01..H-08
desglosados en `avance.md` (H-01/H-02 cerrados aqui; H-04 cerrado con logs
persistidos; H-05 opcional; H-06/H-07 backlog; H-08 documental).

### Cierre de hallazgos H-01/H-02 (viajes faltantes) — `test-engineer`, contrato del orquestador (2026-10-29)

El informe de `ui-navigation-auditor` (2026-10-29) dejo filas de la matriz
**sin recorrido ejecutado**. Esta tarea cierra los hallazgos asignados a
INC-07 (**H-01a** URL directa `/dashboard` staff; **H-01d** logout staff
desde `/dashboard`) con viajes E2E reales ejecutados en navegador (Chromium,
Playwright; API E2E SQLite temporal + web dev server). Destinos fijados por
**DEC-050**: `/dashboard` **sin cambio** (dashboard accesible con sesion
staff); logout staff -> **`/`**. Los hallazgos **H-01b** (ACC-04 con
RECEPCIONISTA), **H-01c** (logout CLIENTE desde el portal completo F7) y
**H-02** (overflow del aviso en escritorio 1280px) se cierran con viajes en
`inc06-acceso-membresia.spec.ts` y quedan registrados en la seccion 5 de
`docs/incrementos/INC-06-acceso-sin-membresia-activa/evidencia.md` (mismas
corridas).

**Decision de archivo (contrato)**: viajes nuevos en archivo nuevo
`club-beasts-web/tests/e2e/inc07-dashboard-staff.spec.ts` (preferencia del
contrato), no en `acceso-roles.spec.ts` (E2E aceptado de INC-01, intocado).
Sin fase RED: los viajes verifican comportamiento esperado **sin cambio** (un
rojo seria regresion del destino fijado); `src/` intocado.

Filas afectadas — Resultado/Evidencia (criterio / pantalla / estado / entrada
/ salida esperada / rol / prueba / resultado / evidencia):

| Hallazgo | Criterio | Pantalla | Estado | Entrada | Salida esperada (DEC-050) | Rol | Prueba | Resultado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| H-01a | navegacion (fila `/dashboard` staff de la matriz INC-07) | `/dashboard` | sesion staff viva | URL directa con sesion | **Sin cambio**: dashboard accesible — URL `/dashboard` sin redirect, heading "Dashboard", "Bienvenido, David Rozo", modulos Clientes/Dashboard y "Salir" visibles | DUENO | `club-beasts-web/tests/e2e/inc07-dashboard-staff.spec.ts:91` | **VERIFICADO (ejecutado)** — 2 corridas completas verdes | Playwright x2 `94 passed`; logs `%TEMP%\opencode\inc07-inc06-h01-h02-pw-run1.log` / `...-run2.log` |
| H-01a | idem | `/dashboard` | sesion staff viva | URL directa con sesion | idem ("Bienvenido, Maria Garcia") | RECEPCIONISTA | `inc07-dashboard-staff.spec.ts:99` | **VERIFICADO (ejecutado)** — x2 | idem |
| H-01d | logout por rol | `/dashboard` | sesion staff viva | Clic en "Salir" (Navbar, `signOut({ callbackUrl: "/" })`) | **`/`** (landing: hero "Alto Rendimiento" + CTA "Iniciar sesion"; sesion cerrada) | DUENO | `inc07-dashboard-staff.spec.ts:111` | **VERIFICADO (ejecutado)** — x2 | idem |
| H-01d | idem | `/dashboard` | sesion staff viva | Clic en "Salir" | idem | RECEPCIONISTA | `inc07-dashboard-staff.spec.ts:125` | **VERIFICADO (ejecutado)** — x2 | idem |

**Nota de cierre H-01/H-02 (2026-10-29, `test-engineer`)**: **6 viajes
E2E nuevos verdes** (4 en `inc07-dashboard-staff.spec.ts` para H-01a/H-01d y
2 en `inc06-acceso-membresia.spec.ts` para H-01b/H-01c) + **1 extension de
asercion** (H-02: `expectSinOverflowHorizontal` del aviso ahora se mide en
movil 375px **y** escritorio 1280px, `inc06-acceso-membresia.spec.ts:322-325`;
antes solo movil). Sin tocar `src/`, backend, prisma, seeds, otros tests
aceptados ni specs de incremento. Comandos ejecutados (logs persistidos en
`%TEMP%\opencode\` por trazabilidad H-04):

| # | Comando | Resultado |
|---:|---|---|
| 1 | `cd club-beasts-web && npx tsc --noEmit` | **exit 0** |
| 2 | `cd club-beasts-web && npx playwright test tests/e2e/inc07-dashboard-staff.spec.ts tests/e2e/inc06-acceso-membresia.spec.ts --reporter=line` (corrida focalizada previa) | **18 passed (1.5m), exit 0** |
| 3 | `cd club-beasts-web && npx playwright test --reporter=line` — **corrida completa 1** | **94 passed (7.0m), exit 0** — cuenta exacta: **94** = base **88** (57 base + 12 INC-06 + 19 INC-07) + **6 viajes nuevos** (4 INC-07 + 2 INC-06); cero fallos |
| 4 | `cd club-beasts-web && npx playwright test --reporter=line` — **corrida completa 2** | **94 passed (7.1m), exit 0** — resultado **IDENTICO** al de la corrida 1 (mismos 94 tests, cero fallos) |
| 5 | `cd club-beasts-web && npx vitest run` | **204 passed / 0 failed (204), exit 0** — **sin cambios** (sin tests unit nuevos; unit intactos) |

Log integros: `%TEMP%\opencode\inc07-inc06-h01-h02-tsc.log`,
`inc07-inc06-h01-h02-pw-focused.log`, `inc07-inc06-h01-h02-pw-run1.log`,
`inc07-inc06-h01-h02-pw-run2.log`, `inc07-inc06-h01-h02-vitest.log` y snapshot
`inc07-inc06-h01-h02-git-status.log`.

**Salvedad `git status` (62 rutas sucias)**: la mayoria son **preexistentes**
a esta tarea (trabajo sin commitear de INC-05/INC-06/INC-07, `.opencode/`,
`AGENTS.md`, `docs/producto/`, `opencode.jsonc`); esta tarea solo toco sus
**4 archivos permitidos** (`inc07-dashboard-staff.spec.ts` nuevo,
`inc06-acceso-membresia.spec.ts` con H-01b/H-01c/H-02 y las secciones 5 de
las dos `evidencia.md`). Cero cambios en `src/`, `club-beasts-api/`,
`prisma/`, seeds, `docs/producto/`, `playwright.config.ts`,
`tests/e2e/e2e-helpers.ts` ni otros tests aceptados.

**0 puntos** (solo el orquestador certifica; regla de no duplicado): esta
tarea no cambia el estado de ningun criterio; las filas cerradas quedan con
evidencia **ejecutada en navegador** para la decision del orquestador sobre
la casilla de recorridos obligatorios de navegacion.

## 6. Revision (EJECUTADA 2026-10-29 — `code-reviewer`)

**Veredicto: ACEPTA CON HALLAZGOS NO BLOQUEANTES** (0 bloqueantes). Reprodujo:
API 658/658, Gherkin 220/220, web 204/204, build PASS, tsc 0/0, E2E **94/94
exit 0**. Cobertura de los 8 puntos del contrato (no-duplicado, no-interferencia
`callbackUrl`/guarda PIN/carrera `update()`, pruebas sin aserciones vacias,
base sin perdida, seguridad/privacidad, H-07 backlog, consistencia
documental): **todos CUMPLEN**. Hallazgos: **W1** (NAV-04 asertado en render
transitorio) -> **CERRADO** (fixture con vigencia ACTIVA, ver abajo);
**W2** (clase H-07 en `portal.spec.ts:56`, test base aceptado) -> **backlog**,
enmienda C4 recomendada en proximo incremento; **W3** (fila NAV-06
desactualizada) -> **CERRADO** (fila actualizada en seccion 2); **W4**
(resultado por fila del auditor no persistido) -> **CERRADO** (persistido en
seccion 5); **S1/S2** (regex de URL debiles; casts de sesion) -> menores,
backlog. Riesgos residuales de la revision: flake latente transitorio
(W1/W2 clase), crash transitorio de worker Windows `0xC0000409` (una ocasion,
no reprodujo), rama C1 inobservable solo-unit (justificada en matriz).

### Cierre de hallazgo W1 (fixture NAV-04 en estado estacionario) — `test-engineer`, contrato del orquestador (2026-10-29)

**Hallazgo W1** (revision `code-reviewer` 2026-10-29, veredicto ACEPTA CON
HALLAZGOS NO BLOQUEANTES): los viajes NAV-04 (`inc07-navegacion-auth.spec.ts`,
antes lineas 235 y 248) creaban el cliente con `crearClienteApi` **sin
vigencias**, por lo que la asercion de "Mi Informacion" ("portal completo
(identidad, estado)") se cumplia solo sobre el **render de carga**: bajo
DEC-051 (`portal/page.tsx:253`, `if (resumen?.sinMembresiaActiva)`) el estado
estacionario de un cliente sin membresia activa es el aviso a pantalla
completa "No tienes una membresia activa", no las tarjetas del portal. Fuente
de flake y verificacion del literal de NAV-04 solo en transitorio.

**Cambio aplicado (patron C4, solo fixture; aserciones byte a byte)** en
`club-beasts-web/tests/e2e/inc07-navegacion-auth.spec.ts`:

- Antes (fixture NAV-04): `await entrarPortalConCambioPendiente(page, request);`
  -> el helper creaba el cliente con `crearClienteApi` (sin vigencias) y no
  devolvia el fixture; "Mi Informacion" se asertiaba contra el render de carga.
- Despues: `entrarPortalConCambioPendiente` devuelve el `ClienteFixture`
  (cambio aditivo; NAV-03 lo ignora y queda intacto) y cada viaje NAV-04 añade
  `await crearVigenciaActiva(request, cliente.id);` **antes** de
  `completarCambioPin` — helper local que reutiliza `crearVigenciaApi` de
  `e2e-helpers.ts` (mismo helper de los specs INC-06) con fechas relativas
  DEC-013 (`sumarDias(hoyBogota(), -30)` .. `sumarDias(hoyBogota(), 30)`,
  mismo rango que INC-06 F7). Con la vigencia GYM ACTIVA, `sinMembresiaActiva`
  es `false` (R1: solo {ACTIVA, CONGELADO} cuentan) y el portal completo es el
  **estado estacionario**: la asercion ya no depende del timing del fetch del
  resumen.
- Aserciones conservadas **byte a byte**: `toHaveCount(1)`, `toBeVisible()`,
  `toHaveAttribute("href", "/portal")`, `toHaveURL(/.*portal/)` y
  `getByRole("heading", { name: "Mi Informacion" })` sin ningun cambio; solo
  se modifico/anadio la fixture. NAV-03 (guarda `debeCambiarPin`) no recibe
  vigencia: su fixture queda byte a byte igual.

**Comandos ejecutados y resultados exactos (2026-10-29; logs en
`%TEMP%\opencode\`)**:

| # | Comando | Resultado | Log |
|---:|---|---|---|
| 1 | `cd club-beasts-web && npx playwright test tests/e2e/inc07-navegacion-auth.spec.ts --reporter=line` | **19 passed (1.1m), exit 0** — 19/19 verdes (incluidos los 4 viajes NAV-04: movil/escritorio x clic/teclado) | `%TEMP%\opencode\inc07-w1-pw-focused.log` |
| 2 | `cd club-beasts-web && npx playwright test --reporter=line` | **94 passed (6.7m), exit 0** — **94/94 verdes**, cuenta exacta 94 (cero fallos, cero regresiones) | `%TEMP%\opencode\inc07-w1-pw-full.log` |
| 3 | `cd club-beasts-web && npx tsc --noEmit` | **exit 0** | `%TEMP%\opencode\inc07-w1-tsc.log` |

**Riesgos / notas**: (a) el cambio es de fixture, no de comportamiento: no
toca `src/`, backend, otros tests ni criterios; NAV-04 pasa a verificar el
literal de "portal completo" en estado estacionario (elimina el flake W1, no
cambia el destino). (b) El patron del riesgo transitorio del render de carga
segnalado en la seccion 4 ("Riesgo observado") sigue vigente para
`portal.spec.ts:36` y su asercion `:27` (fixtures sin membresia activa
ajenos a NAV-04); **fuera del alcance de esta tarea** (solo fixture NAV-04),
queda como deuda para la decision del orquestador. (c) 0 puntos (solo el
orquestador certifica; esta nota cierra un hallazgo de revision, no certifica
criterios).

## 7. Cierre y certificacion (solo el orquestador)

**CERRADO Y ACEPTADO el 2026-10-29.** Pipeline completo ejecutado: LISTO 4/4
(DEC-050 + contrato C1..C6 + CONF/no-duplicado + matriz aprobada) -> RED (10
unit + 19 E2E rojos) -> GREEN (`frontend-developer`: 3 pantallas, CTA nativo
C2, fuera de `<nav>` C3) -> VERIFICADO (bateria completa; E2E x2) -> auditoria
de navegacion (resultado por fila persistido en seccion 5; H-01a/H-01d
cerrados con `inc07-dashboard-staff.spec.ts`) -> REVISADO (ACEPTA CON HALLAZGOS
NO BLOQUEANTES; W1 cerrado, W3/W4 corregidos) -> **ACEPTADO**.

Este incremento **no certifica puntos** (0; mejora UX aprobada, DEC-049; regla
de no duplicado verificada en revision): la certificacion de cierre es el
registro en `docs/producto/avance.md` con la evidencia ejecutada. **WORKFLOW-NAV
no certifica puntos MVP.**
