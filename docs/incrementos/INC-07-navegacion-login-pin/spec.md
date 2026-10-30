# INC-07 - Navegacion de regreso al dashboard en login y cambio de PIN (DEC-049)

## Estado

Estado actual: **ACEPTADO (2026-10-29)**. Pipeline completo: **PROPUESTO -> ESPECIFICADO -> LISTO (4/4) -> RED (29 rojos) -> GREEN (29/29 verdes) -> VERIFICADO (bateria 94/94 E2E x2, API 658, Gherkin 220, web 204) -> auditoria de navegacion (H-01/H-02 cerrados con 6 viajes nuevos) -> REVISADO (`code-reviewer`: ACEPTA CON HALLAZGOS NO BLOQUEANTES; W1 cerrado con fixture NAV-04 en estado estacionario) -> ACEPTADO**. Casillas cerradas:
PEND-01 ratificada (**DEC-050**), contrato **RATIFICA CON CORRECCIONES C1..C6**
(`frontend-developer`, incorporadas a este spec; **`INC07-CONF-01` ENMENDADA**
para el CTA `NAV-04`), CONF-01..03 + no-duplicado y matriz de navegacion
aprobados. **El RED esta habilitado** para `test-engineer` (contrato propio
del orquestador). Paquete abierto por
`acceptance-criteria-analyst` bajo contrato del orquestador tras la aprobacion
de **DEC-049** (Producto, 2026-10-20, `docs/producto/decisiones.md:57`):
"las UIs de **login** y de **cambio de PIN** deben incluir siempre un **link
visible para regresar al dashboard** (hoy pierden toda la navegacion); se
resuelve en un incremento de frontend **con E2E**".

Historial del pipeline: **PROPUESTO -> ESPECIFICADO (2026-10-20) -> LISTO
(2026-10-29)**. La ambiguedad de destino (`INC07-PEND-01`) se resolvio en
**DEC-050** (2026-10-29, opcion (a)). Hoy
**ningun criterio esta `IMPLEMENTADO` ni `ACEPTADO`**: los 6 criterios estan
`SPEC`. Este documento **no declara puntos** (DEC-016); el reparto es **0** con
argumento trazable en "Regla de no duplicado".

Puerta **LISTO** (gate unico) — **4 de 4 cerradas (2026-10-29)**:

1. [x] **`INC07-PEND-01` ratificada por Producto** en
   `docs/producto/decisiones.md` (**DEC-050**, 2026-10-29: opcion (a),
   destino por rol y estado).
2. [x] **Contrato ratificado por `frontend-developer`** — **RATIFICA CON
   CORRECCIONES C1..C6** (2026-10-29), incorporadas a este spec; incluye la
   enmienda de **`INC07-CONF-01`** (CTA `NAV-04` como `<a href>` nativo).
3. [x] **`INC07-CONF-01..03` y la regla de no-duplicado ratificadas por el
   orquestador** en `decisiones.md` (seccion "Ratificaciones del
   orquestador (2026-10-29)", **0 puntos**).
4. [x] **Matriz de navegacion/aplicabilidad** de este spec **aprobada** por el
   orquestador (destinos esperados fijados por DEC-050; resultado inicial de
   todas las filas `NO VERIFICADO`).

**Definition of Ready satisfecha (2026-10-29): el RED esta habilitado** para
`test-engineer` bajo contrato propio del orquestador.

## Objetivo

Que las pantallas de **autenticacion** (`/login`, `/login-cliente`) y el flujo
de **cambio de PIN** (formulario obligatorio y su pantalla de exito dentro de
`/portal`) incluyan **siempre** un **link visible** de regreso al dashboard del
rol, navegable por **`href` real** (no solo JS), **alcanzable por teclado** y
**sin romper** el `callbackUrl` del login (INC00-AUTH-03) ni el flujo de cambio
de PIN obligatorio (carrera `update()` ya estabilizada en INC-04).

**Impacto declarado**: es **UX sobre flujos ya aceptados** (HU-02/HU-03 login y
sesiones 10/10; HU-25 portal aceptado; E2E `cambio-pin-obligatorio.spec.ts` ya
aceptado). **Aporta 0 puntos MVP** (ver "Regla de no duplicado"): no existe
bullet de HU en `docs/producto/mvp.md` que pague navegacion de pantallas de
autenticacion.

## Pantallas inventariadas (lectura de `club-beasts-web/src/app/`, 2026-10-20)

| Pantalla | Ruta | Quien la ve | Navegacion actual (gap) |
|---|---|---|---|
| Login staff | `/login` (`src/app/login/page.tsx`) | anonimo (DUENO/RECEPCIONISTA) | Tiene link cruzado "Portal del Cliente" (`/login-cliente`, linea 94); **sin link a `/` ni a dashboard** |
| Login cliente | `/login-cliente` (`src/app/login-cliente/page.tsx`) | anonimo (CLIENTE) | Tiene link cruzado "Iniciar sesion como Dueno/Recepcionista" (linea 121); **sin link a `/` ni a portal** |
| Cambio de PIN obligatorio | `/portal` con `session.user.debeCambiarPin == true` (`src/app/portal/page.tsx:137-188` -> `ChangePinForm.tsx`) | CLIENTE autenticado con flag | `Navbar showAuth={false}` solo pinta el logo (link a `/`); **sin link de regreso visible al portal/dashboard ni salida** |
| Exito de cambio de PIN | `/portal` con `pinChangeSuccess` (`portal/page.tsx:106-135`) | CLIENTE autenticado (flag ya `false`) | **Sin CTA ni link**: un callejon; el usuario debe saber que recargar o navegar |
| Portal (dashboard del CLIENTE) | `/portal` (`portal/page.tsx:190-311`) | CLIENTE con acceso | Con "Cerrar sesion" (linea 203); destino post-login por defecto del cliente (`resolvePostLoginPath("/portal")`) |
| Dashboard staff | `/dashboard` (`src/app/dashboard/page.tsx`) | sesion staff | Existe; **no** es el destino post-login por defecto del staff (que es `/clientes`, `login/page.tsx:35`) |

**"Dashboard" por rol** (adopcion provisional, `INC07-PEND-01`)**: CLIENTE ->
**`/portal`** (es su pantalla de inicio post-login, `login-cliente/page.tsx:57`);
DUENO/RECEPCIONISTA -> **`/dashboard`** (la pagina `/dashboard` existe y es el
unico artefacto llamado dashboard); **anonimo** (en un login no hay sesion) ->
**`/`** (landing, unico destino accesible sin credenciales).

## Alcance incluido

- **`/login`** (staff): link visible de regreso (destino segun
  `INC07-PEND-01`), `<a>`/`Link` con `href` real, orden de tabulacion
  logico, sin afectar el submit del formulario ni `resolvePostLoginPath`.
- **`/login-cliente`**: mismo comportamiento.
- **Cambio de PIN obligatorio** (`ChangePinForm` dentro de `/portal`): link
  visible de regreso **sin romper** la guarda `debeCambiarPin` (navegar fuera
  no cambia el flag; volver a `/portal` repinta el formulario — ver
  `INC07-PEND-01` para evitar un bucle aparente) y **sin tocar** la compuerta
  de trafico de sesion (`pinChangeInProgress`/`session-traffic.ts`).
- **Pantalla de exito "PIN Actualizado"**: CTA/link visible al portal
  (dashboard del CLIENTE), ya con el flag `false` persistido.
- Pruebas **TDD/ATDD** + **E2E obligatorio** (literal de DEC-049): unit de
  render/localizadores + E2E de navegacion por teclado y por clic.
- **Matriz de navegacion/aplicabilidad** (obligatoria para la puerta LISTO).

## Fuera de alcance

- **Diseno/UX de las pantallas** (layout, colores, copy de errores): intactos;
  solo se **agrega** el link.
- **Navbar de las paginas de login**: no se migra `/login` ni `/login-cliente`
  al `Navbar` compartido (cambio visual mayor fuera de DEC-049); el link se
  agrega en la posicion existente de links cruzados.
- **Rutas, guards de rol, `resolvePostLoginPath`, `session-recovery`,
  `session-traffic`, `ChangePinForm` (logica de validacion/POST)**: intactos;
  solo referencia de no-interferencia.
- **E2E/units aceptados existentes** (`cambio-pin-obligatorio.spec.ts`,
  `auth.spec.ts`, `sesion-vencida.spec.ts`, `portal.spec.ts`, `acceso-roles.spec.ts`):
  **no se modifican**; si un localizador suyo se ve afectado por el link nuevo,
  `test-engineer` lo **reporta** al orquestador (enmienda con contrato propio,
  patron C4 de INC-05).
- **INC-06** (`acceso-sin-membresia-activa`): incremento **independiente**; no
  se mezclan alcances ni archivos.
- **Backend** (`club-beasts-api`): **sin cambios** (DEC-049 es 100% frontend).
- Riesgos globales `R-01..R-11`, `D2`, `REV-01..REV-12` (backlog aparte).

## Bullets de origen (trazabilidad obligatoria)

DEC-049 no corresponde a un bullet de HU; su trazabilidad de **afectacion** es:

| Flujo/HU | Estado hoy | Como afecta INC-07 |
|---|---|---|
| HU-02/HU-03 (login/sesiones, 10/10 aceptados) | `/login` y `/login-cliente` pierden la navegacion | Link agregado; flujo intacto (`INC07-NAV-05`) |
| HU-25 (portal, 4/4 aceptado; INC-03) | El formulario de PIN y el exito son callejones dentro de `/portal` | Link/CTA visible en ambos estados |
| E2E `cambio-pin-obligatorio.spec.ts` (aceptado, 3/3 tras fix `f2968c5`) | Cubre la carrera `update()` | Regresion obligatoria (`INC07-NAV-06`) |

## Criterios de aceptacion

IDs estables `INC07-NAV-nn`. Sin G14 previo (DEC-049 es requisito nuevo, no
HU). Leyenda: `SPEC` = decidido con recomendacion adoptada (sigue **sin**
estar `IMPLEMENTADO`/`LISTO`/`ACEPTADO`: le faltan implementacion, prueba,
evidencia, revision **y ratificacion de PEND-01** en la puerta LISTO).

| ID | Origen | Que se observa y comprueba | Estado | Puntuable |
|---|---|---|---|---|
| `INC07-NAV-01` | DEC-049 | **`/login` (staff)**: link visible "Volver al inicio" (destino `/` si es anonimo; `/dashboard` si hay sesion staff — `INC07-PEND-01(a)`) con `href` navegable (abrir en nueva pestana funciona sin JS), alcanzable por `Tab` despues de los campos/boton, y al activarlo se navega al destino esperado. El submit del login y `resolvePostLoginPath("/clientes")` quedan intactos | **SPEC** (adoptado PEND-01(a), pendiente ratificacion) | No (0) |
| `INC07-NAV-02` | DEC-049 | **`/login-cliente`**: mismo comportamiento con destino `/` (anonimo) / `/portal` (sesion CLIENTE). El link cruzado existente a `/login` (linea 121) **se conserva** | **SPEC** (adoptado PEND-01(a)) | No (0) |
| `INC07-NAV-03` | DEC-049 | **Cambio de PIN obligatorio** (`/portal` con `debeCambiarPin`): link visible "Volver al inicio" con `href="/"` (recomendacion PEND-01(a): el dashboard del cliente **es** `/portal` y volver a el repintaria el formulario — el destino `/` evita el bucle aparente); reachable por teclado; **navegar no altera el flag** (volver a `/portal` repinta el formulario: sin bypass de la guarda) y **no toca** la carrera `update()`/`pinChangeInProgress` | **SPEC** (adoptado PEND-01(a)) | No (0) |
| `INC07-NAV-04` | DEC-049 | **Pantalla "PIN Actualizado"**: CTA/link "Ir a mi portal" con `href="/portal"` (flag ya `false`), visible y por teclado; al activarlo se pinta el portal completo (identidad, estado) | **SPEC** | No (0) |
| `INC07-NAV-05` | INC00-AUTH-03 (REF) | **`callbackUrl` intacto**: `/login?callbackUrl=/clientes` con credenciales validas aterriza en `/clientes`; `/login-cliente?callbackUrl=/recepcion-url-invalida-cliente` y sin `callbackUrl` conservan sus fallbacks; los links nuevos **no** borran ni consumen el query param del formulario | **SPEC** | No (0; ya cobrado en HU-02/INC-00) |
| `INC07-NAV-06` | DEC-049 | **Regresion E2E**: `cambio-pin-obligatorio.spec.ts` (3/3), `auth.spec.ts`, `sesion-vencida.spec.ts`, `acceso-roles.spec.ts` y `portal.spec.ts` **intactos**; base web **183/183** y E2E **56/56** sin perdida | **SPEC** | No (0) |

> **Conteo**: **6 criterios**, todos `SPEC` (PEND-01 adoptada por
> recomendacion, pendiente de ratificacion en la puerta LISTO). **0
> puntuables** (ver "Regla de no duplicado"). El spec **no declara puntos**
> (DEC-016).
>
> **E2E obligatorio** (literal DEC-049): `NAV-01..04` con navegacion por clic
> **y por teclado**, en movil y escritorio; `NAV-05/06` como regresion.

### Regla de no duplicado (obligatoria; patron INC-02/03/04/05)

Verificada contra `docs/producto/mvp.md`:

- **Bloque 1 (Identidad, sesiones y permisos) 10/10 aceptado**: HU-01 (guard de
  rol, cubierto por E2E `acceso-roles.spec.ts`), HU-02 (login 4/4), HU-03
  (sesiones 4/4). Ninguno de esos bullets paga **navegacion** entre pantallas:
  agregar un link no cierra ningun gap de HU-01/02/03 ni de la auditoria
  (`auditoria-puntos-inc00.md` no tiene seccion de navegacion de auth).
- **HU-25 4/4 y el E2E de cambio de PIN** ya estan acreditados (INC-03/INC-04):
  INC-07 **no** re-cobra el flujo de cambio de PIN ni el portal.
- **DEC-049 es UX de flujos aceptados**: sin bullet de `mvp.md` que la pague.
  **Conclusion: 0 puntos**, queda como mejora de UX/usoabilidad aprobada.
  Cualquier fraccion intentada sobre HU-01/02/03/25 aqui seria **duplicado**
  (DEC-016).

## Decisiones pendientes

**RESUELTA 2026-10-29: `INC07-PEND-01` -> `DEC-050` (opcion (a), destino por
rol y estado).** Tabla conservada como historial:

| ID | Pregunta concreta a Producto | Opciones | **Recomendacion del analista** | Criterios afectados |
|---|---|---|---|---|
| `INC07-PEND-01` | **Destino del "link al dashboard" por pantalla**: DEC-049 dice "regresar al dashboard", pero (i) en un login **no hay sesion** (no hay dashboard accesible), (ii) el dashboard del CLIENTE **es** el propio `/portal` (volver a el durante el cambio de PIN obligatorio repintaria el formulario) y (iii) el staff **no** aterriza en `/dashboard` sino en `/clientes`. ¿Cual es el destino exacto en cada pantalla y estado? | **(a)** destino **por rol y estado**: anonimo en `/` y `/login-cliente` -> **`/`** (landing); en cambio de PIN obligatorio -> **`/`** (evita el bucle con `/portal`); en "PIN Actualizado" -> **`/portal`**; si hubiese sesion staff en `/login` -> `/dashboard`; **(b)** destino unico **`/`** para todas las pantallas de auth; **(c)** literal duro "dashboard" en todos los casos (`/dashboard` staff / `/portal` cliente), aceptando el bucle en el cambio de PIN | **(a)**: es el unico coherente con la arquitectura real (landing `/` como raiz publica; `/portal` como dashboard de CLIENTE; `/dashboard` como dashboard staff) y **no crea bucles**; el label "dashboard" de DEC-049 se interpreta como "pantalla de inicio del rol", que para un anonimo es la landing. Con (c) el usuario autenticado en el cambio de PIN obligatorio quedaria en un loop visible `/portal` -> formulario. Si Producto prefiere (b) (mas simple, un solo destino), el label del link deberia ser "Volver al inicio" en todas partes | `INC07-NAV-01..04` |

### Confirmaciones no bloqueantes (opciones por defecto adoptadas; ratificables)

| ID | Tema | Opcion por defecto adoptada | Fuente |
|---|---|---|---|
| `INC07-CONF-01` | Forma del link | `Link` de `next/link` con `href` real (navegable sin JS, abre en nueva pestana, alcanzable por `Tab`); label en espanol "Volver al inicio" (o "Ir a mi portal" en `NAV-04`); estilo consistente con los links cruzados existentes (`text-sm text-gray-400 hover:text-royal`). **ENMENDADA 2026-10-29 (ratificacion del orquestador sobre la correccion C2 de `frontend-developer`)**: el CTA de `NAV-04` ("Ir a mi portal") es un **`<a href="/portal">` nativo**, no `next/link`, porque la URL actual ya es `/portal` y un `next/link` a la misma URL no remonta el componente (la tarjeta de exito seguiria pintandose); los demas links ("Volver al inicio") siguen siendo `next/link` | `login/page.tsx:92-99`, DEC-049 |
| `INC07-CONF-02` | No-interferencia con la guarda `debeCambiarPin` | El link **no** modifica sesion ni flag; `/portal` sigue pintando el formulario mientras `debeCambiarPin == true` (guarda existente intacta); sin bypass ni dismissal | `portal/page.tsx:137-188` |
| `INC07-CONF-03` | Base a preservar | Ningun test aceptado se elimina ni se modifica; base al arranque: API **536/536** (intacta, sin cambios backend), Gherkin **153/153**, web **183/183**, E2E **56/56**, migraciones **9/0** (medidas al cierre de INC-04; re-medir si INC-05 cierra antes) | DEC-011 + evidencia INC-04 |

## Contrato de frontend propuesto (pendiente de ratificacion por `frontend-developer`)

> Sin cambios de backend. Convenciones verificadas contra `src/`: los links
> cruzados actuales usan `Link` de `next/link` (`login/page.tsx:6,93-99`;
> `login-cliente/page.tsx:6,120-126`); la guarda de cambio de PIN vive en
> `portal/page.tsx:98,137-188`.

| # | Pantalla/componente | Cambio propuesto (ratificado 2026-10-29, C1..C6) | Criterios |
|---|---|---|---|
| 1 | `src/app/login/page.tsx` | Link "Volver al inicio" como **hermano DESPUES** del link existente dentro del `div className="mt-6 text-center"` (lineas 92-99; se conserva el link "Portal del Cliente" `href="/login-cliente"`). **`href` fijado por DEC-050 (C1)**: `href="/"` por defecto; `href="/dashboard"` solo si `useSession()` reporta sesion staff. **Nota C1**: esa rama es hoy inobservable en navegador — `middleware.ts:15-21` redirige `/login` autenticado a `/clientes` antes de montar la pagina; el link se renderiza **siempre visible** (sin gatear por `status`, para no romper la visibilidad/Tab de `NAV-01` durante `loading`) y solo cambia su `href`. La sub-fila de la matriz queda `NO APLICABLE (justificado: middleware redirige)` | `NAV-01`, `NAV-05` |
| 2 | `src/app/login-cliente/page.tsx` | Mismo patron en el bloque de links de la linea 119-126 (se conserva "Iniciar sesion como Dueno/Recepcionista" `href="/login"` de la linea 121). `href="/"` por defecto; `href="/portal"` solo con sesion CLIENTE (mismo caso inobservable por middleware -> `NO APLICABLE` justificado en la matriz) | `NAV-02`, `NAV-05` |
| 3 | `src/app/portal/page.tsx` (rama `debeCambiarPin`) | Link "Volver al inicio" `href="/"` **fuera de `<nav>`** (debajo del `ChangePinForm`; condicion explicita C3: el Navbar logo es `a[href="/"]` dentro de `nav` y el E2E aceptado `cambio-pin-obligatorio.spec.ts:58` usa `nav a[href="/"]` — montarlo dentro de `<nav>` produciria strict mode violation). **Sin** tocar `ChangePinForm` (logica) ni `pinChangeInProgress` | `NAV-03`, `NAV-06` |
| 4 | `src/app/portal/page.tsx` (rama `pinChangeSuccess`) | CTA "Ir a mi portal" **`<a href="/portal">` nativo** (no `next/link`) dentro de la tarjeta de exito y **fuera de `<nav>`**. **Razon C2**: la URL ya es `/portal`; una navegacion client-side a la misma URL con `next/link` **no remonta** el componente y la tarjeta "PIN Actualizado" seguiria pintandose (fallaria `NAV-04`). El `<a>` nativo fuerza el remontaje completo, cumple "href real, navegable sin JS, Tab" y no toca la carrera `update()` | `NAV-04` |
| 5 | Tests (expectativas; el RED lo entrega `test-engineer`, paso 5 del plan) | Unit web nuevos (render + localizador + `href` exacto por pantalla/estado) + E2E nuevo `inc07-navegacion-auth.spec.ts` (clic y teclado, movil/escritorio, callbackUrl intacto, guarda PIN intacta). Frontend **no** edita tests aceptados; si un localizador ajeno se ve afectado, se reporta al orquestador para enmienda con contrato propio (patron C4) | `NAV-01..06` |

**Localizadores ratificados (2026-10-29, C4 — endurecidos)**: siempre
`getByRole("link", { name: ..., exact: true })` + asercion de `href` exacto +
`toHaveCount(1)` + `toBeVisible()`:

| Pantalla/estado | E2E (Playwright) | Unit (Vitest/RTL) |
|---|---|---|
| `/login` anonimo | `page.getByRole("link", { name: "Volver al inicio", exact: true })` -> `href="/"` | `screen.getByRole("link", { name: "Volver al inicio" })` -> `href="/"` |
| `/login-cliente` anonimo | igual + link cruzado `name: "Iniciar sesion como Dueno/Recepcionista", exact: true` -> `href="/login"` conservado | idem |
| `/portal` `debeCambiarPin` | `getByRole("link", { name: "Volver al inicio", exact: true })` -> `href="/"`; **nunca** `a[href="/"]` global (2 matches: logo `Navbar.tsx:24` + nuevo) | idem |
| `/portal` `pinChangeSuccess` | `getByRole("link", { name: "Ir a mi portal", exact: true })` -> `href="/portal"` | idem |

Los unit existentes ya mockean `useSession` (`login-session-expired.test.tsx:25-30`,
`login-cliente-inactivo.test.tsx:36-39`) y `next/link` como `<a href>`, por lo
que `toHaveAttribute("href", ...)` es observable. `exact: true` evita colision
de nombres ("Volver al inicio" vs "Portal del Cliente" vs "Ir a mi portal").

## Fixtures y datos de prueba

Aislamiento: **DEC-012** (SQLite) y seed existente (E2E aceptados ya crean
usuarios/clients; reutilizar sus helpers, precedente `cambio-pin-obligatorio.spec.ts`).

| # | Fixture | Creacion | Para que prueba |
|---|---|---|---|
| F1 | Staff DUENO con credenciales validas | seed existente | `NAV-01`, `NAV-05` (callbackUrl `/clientes`) |
| F2 | Cliente `ACTIVO` con PIN conocido y `debeCambiarPin: true` | patron del E2E `cambio-pin-obligatorio.spec.ts` | `NAV-03`, `NAV-06` (guarda + carrera intactas) |
| F3 | Mismo cliente tras cambiar el PIN (flag `false`) | transicion F2 -> POST change-pin | `NAV-04` (exito -> portal) |
| F4 | Cliente sin sesion; token vencido | helpers de `sesion-vencida.spec.ts` | `NAV-02`, `NAV-05` (fallback y banner intactos) |

Supuestos: sin fixtures nuevas de BD; los E2E nuevos **no** comparten estado
con los aceptados; viewport movil (375px) y escritorio (1280px) en el mismo
spec.

## Evidencia requerida por criterio

| Criterio(s) | Unit/UI (Vitest web) | E2E (Playwright) | Integracion API / Gherkin |
|---|---|---|---|
| `NAV-01` | si (render `/login`: link presente, `href` exacto, orden de tab) | si (clic + teclado, movil/escritorio, destino correcto) | no (sin backend) |
| `NAV-02` | si (idem `/login-cliente`; link cruzado conservado) | si (idem) | no |
| `NAV-03` | si (rama `debeCambiarPin`: link presente; navegar y volver repinta el formulario) | si (link -> `/` -> volver a `/portal` -> formulario aun activo; cambio de PIN exitoso completo) | no |
| `NAV-04` | si (rama exito: CTA con `href="/portal"`) | si (F3: CTA -> portal completo) | no |
| `NAV-05` | si (query param preservado en el DOM del form) | si (`?callbackUrl=/clientes` login -> `/clientes`; sin param -> fallback `/clientes` y `/portal`) | no |
| `NAV-06` | no | si (corrida completa: E2E aceptados intactos) | no (API sin cambios: `vitest run` base intacta) |
| **Todos** | `npx tsc --noEmit`, `npx vitest run` (base web intacta), `npm run build` | `npx playwright test` **x2 corridas** (base E2E intacta) | `npx vitest run` API base intacta (536) + `npm run test:gherkin` (153) + `npx prisma migrate status` (9/0) por prudencia; **sin cambios esperados** |
| **Revision** | `code-reviewer`: no duplicado (HU-01/02/03/25), no-interferencia (callbackUrl, guarda PIN, carrera `update()`), pruebas sin aserciones vacias | | |

## Matriz de navegacion/aplicabilidad (obligatoria; DEC-049 afecta navegacion)

> Para el `ui-navigation-auditor` y la puerta LISTO de navegacion. Resultado
> **inicial de todas las filas: `NO VERIFICADO`**. Destinos **esperados**
> fijados aqui (adoptando `INC07-PEND-01(a)`); los no aplicables se justifican.

| Criterio | Pantalla | Estado | Entrada | Salida esperada | Rol | Prueba | Resultado | Evidencia |
|---|---|---|---|---|---|---|---|---|
| `NAV-01` | `/login` | anonimo | URL directa | Link "Volver al inicio" visible; click -> **`/`** (landing con Navbar y CTAs de login) | anonimo | `inc07-navegacion-auth.spec.ts` | NO VERIFICADO | _pendiente_ |
| `NAV-01` | `/login` | anonimo | **Teclado**: `Tab` desde el campo Email | El link es alcanzable y activable sin mouse | anonimo | mismo spec (paso teclado) | NO VERIFICADO | _pendiente_ |
| `NAV-01` | `/login` | anonimo | **Movil** (375px) y **escritorio** | Link visible sin scroll horizontal en ambos | anonimo | mismo spec (2 viewports) | NO VERIFICADO | _pendiente_ |
| `NAV-01` | `/login` | **staff autenticado** (sesion viva) | URL directa | **NO APLICABLE (justificado 2026-10-29, C1)**: `middleware.ts:15-21` redirige `/login` autenticado a `/clientes` antes de montar la pagina; la rama `href="/dashboard"` del link es inobservable en navegador (el link se renderiza siempre, solo cambia su `href`) | DUENO/RECEPCIONISTA | inspeccion unit (`useSession`) | No aplicable (justificado) | - |
| `NAV-05` | `/login` | anonimo con `callbackUrl=/clientes` | URL directa con query -> login valido | Aterriza en **`/clientes`**; el link nuevo no consume el param | DUENO | mismo spec + regresion `auth.spec.ts` | NO VERIFICADO | _pendiente_ |
| `NAV-02` | `/login-cliente` | anonimo | URL directa | Link "Volver al inicio" -> **`/`**; link cruzado "Iniciar sesion como Dueno/Recepcionista" -> `/login` **conservado** | anonimo | mismo spec | NO VERIFICADO | _pendiente_ |
| `NAV-02` | `/login-cliente` | **CLIENTE autenticado** (sesion viva) | URL directa | **NO APLICABLE (justificado 2026-10-29, C1)**: `middleware.ts` redirige `/login-cliente` autenticado a `/portal` antes de montar la pagina; la rama `href="/portal"` del link es inobservable en navegador | CLIENTE | inspeccion unit (`useSession`) | No aplicable (justificado) | - |
| `NAV-05` | `/login-cliente` | anonimo sin `callbackUrl` | Login valido | Aterriza en **`/portal`** (fallback intacto) | CLIENTE | mismo spec + regresion | NO VERIFICADO | _pendiente_ |
| `NAV-03` | `/portal` | `debeCambiarPin == true` | Post-login con F2 | Formulario de PIN + link "Volver al inicio" visible; click -> **`/`** | CLIENTE | mismo spec | NO VERIFICADO | _pendiente_ |
| `NAV-03` | `/portal` | `debeCambiarPin == true` | **Atras** del navegador tras el link | Regresa al formulario de PIN (la guarda sigue activa; **sin** bypass ni bucle infinito) | CLIENTE | mismo spec | NO VERIFICADO | _pendiente_ |
| `NAV-03` | `/portal` | `debeCambiarPin == true` | **Recarga** del portal | El formulario persiste (dato de sesion, no de navegacion) | CLIENTE | mismo spec | NO VERIFICADO | _pendiente_ |
| `NAV-04` | `/portal` | `pinChangeSuccess` | Tras cambiar PIN (F3) | Tarjeta "PIN Actualizado" + CTA "Ir a mi portal" -> **`/portal`** completo | CLIENTE | mismo spec | NO VERIFICADO | _pendiente_ |
| `NAV-06` | flujos existentes | - | Corrida completa del E2E | `cambio-pin-obligatorio` 3/3, `auth`, `sesion-vencida`, `acceso-roles`, `portal` intactos | staff/CLIENTE | `npx playwright test` x2 | NO VERIFICADO | _pendiente_ |
| - | `/dashboard` | staff | URL directa | **Sin cambio** (no se toca; el link nuevo solo apunta a ella si hay sesion staff en `/login`) | DUENO/RECEPCIONISTA | regresion | NO VERIFICADO (esperado: sin cambio) | _pendiente_ |
| - | Landing `/` | anonimo | desde `/login` | Navbar con CTAs de login intactos (sin cambios en `/`) | anonimo | inspeccion E2E | NO VERIFICADO (esperado: sin cambio) | _pendiente_ |

**Bucles/enlaces rotos evaluados**: con PEND-01(a) no hay bucle
(`/portal`(gate) -> `/` -> landing accesible; el unico retorno al gate es el
propio usuario); todos los `href` nuevos son rutas internas existentes
(`/`, `/portal`, `/dashboard`); sin enlaces externos ni `javascript:`. Los
flujos de sesion expirada (DEC-010) y `callbackUrl` (INC00-AUTH-03) quedan
**fuera del camino** del link nuevo (no compiten: el link es una navegacion
voluntaria, no parte del flujo de recuperacion).

## Riesgos

| ID | Riesgo | Impacto | Mitigacion | Responsable |
|---|---|---|---|---|
| `INC07-R01` | **Regresion del flujo `callbackUrl`** (INC00-AUTH-03 aceptado): un link que manipule la URL o el router podria consumir/borrar el param | Perdida del retorno post-login | `NAV-05` explicito; el link **no** toca `resolvePostLoginPath` ni el query; regresion `auth.spec.ts`/`sesion-vencida.spec.ts` | Frontend + QA |
| `INC07-R02` | **Regresion de la carrera del cambio de PIN obligatorio** (carrera `update()`/`pinChangeInProgress` estabilizada en INC-04, fix `f2968c5`) | Reaparece el flaky corregido el 2026-10-19 | `NAV-03/06` sin tocar `session-traffic` ni el efecto del portal; E2E `cambio-pin-obligatorio.spec.ts` como regresion obligatoria; `INC07-CONF-02` | Frontend + QA |
| `INC07-R03` | **Guarda `debeCambiarPin`**: el link podria percibirse como bypass (navegar fuera y volver) | Usuario cree que cambio el PIN sin cambiarlo | `NAV-03` verifica que volver repinta el formulario; sin dismissal del flag | Frontend + QA |
| `INC07-R04` | **Localizadores**: los E2E aceptados usan selects sensibles (precedente `strict mode violation` de `cambio-pin-obligatorio.spec.ts`) | E2E ajenos en rojo por un nodo nuevo | Asertar `href` exacto + nombre de rol; si un E2E aceptado se ve afectado, **enmienda con contrato propio** (patron C4), nunca editarlo en silencio | QA |
| `INC07-R05` | **Duplico de puntos**: HU-01/02/03/25 ya cobrados | Contar UX como puntos de HU (DEC-016) | Seccion "Regla de no duplicado"; **0 puntos** declarados | Orquestador |
| `INC07-R06` | `INC07-PEND-01` sin ratificar al momento de escribir el RED | Link apuntando a un destino que Producto cambie | Ratificar PEND-01 como casilla 1 de la puerta LISTO **antes** del RED | Producto + Orquestador |

## Trazabilidad de decisiones aprobadas aplicadas

| Decision | Aplicacion en INC-07 |
|---|---|
| DEC-049 (requisito) | Spec completo; `NAV-01..04`; E2E obligatorio |
| INC00-AUTH-03 (callbackUrl) | `NAV-05`; riesgo `INC07-R01`; sin cambios en `redirect.ts`/`session-recovery` |
| DEC-010 (sesion vencida) | Sin cambios; el link no compite con el banner (matriz) |
| DEC-034 / INC-04 (cambio de PIN, carrera `update()`) | `NAV-03/06`; `INC07-CONF-02`; riesgo `INC07-R02` |
| DEC-011 / DEC-016 (evidencia, fraccion) | 0 puntos; plantilla de evidencia |
| DEC-012 (aislamiento) | Fixtures F1..F4 (helpers existentes) |

## Checklist de puerta LISTO

- [x] Spec con objetivo, alcance incluido/excluido y fuera de alcance explicito (este archivo).
- [x] Criterios `INC07-NAV-01..06` con trazabilidad y estados.
- [x] Regla de **no duplicado** con argumento trazable (**0 puntos**).
- [x] **`INC07-PEND-01` formulada** con opciones y recomendacion (adoptada
  provisionalmente, pendiente de ratificacion).
- [x] Contrato de frontend **propuesto** (pendiente de ratificacion).
- [x] Fixtures + supuestos de aislamiento.
- [x] Plantilla de evidencia (`evidencia.md`) y backlog (`tareas.md`).
- [x] **Matriz de navegacion/aplicabilidad** incluida (resultado inicial `NO VERIFICADO`).
- [x] **`INC07-PEND-01` ratificada por Producto** en `docs/producto/decisiones.md`
  (**DEC-050**, 2026-10-29, confirmacion unica de la recomendacion (a)).
- [x] Contrato **ratificado por `frontend-developer`** — **RATIFICA CON
  CORRECCIONES C1..C6** (2026-10-29), incorporadas a este spec; enmienda de
  `INC07-CONF-01` (CTA `NAV-04` nativo).
- [x] **`INC07-CONF-01..03` + no-duplicado ratificadas por el orquestador**
  (`decisiones.md`, 2026-10-29).
- [x] **Matriz de navegacion aprobada** por el orquestador (2026-10-29;
  destinos esperados por DEC-050, todas las filas `NO VERIFICADO` hasta
  evidencia ejecutada).

**Puerta LISTO: 4/4 casillas de cierre (2026-10-29). El incremento paso a
`LISTO`** y completo el pipeline el mismo dia: RED -> GREEN -> VERIFICADO
(bateria 94/94 E2E x2) -> auditoria de navegacion -> REVISADO
(ACEPTA CON HALLAZGOS NO BLOQUEANTES; W1 cerrado) -> **ACEPTADO**.
Certificacion: **0 puntos** (mejora UX DEC-049; regla de no duplicado) —
solo registro del cierre en `avance.md`.

## Plan de ejecucion por agente

| Paso | Agente | Entrega | Criterios | Depende de |
|---:|---|---|---|---|
| 1 | acceptance-criteria-analyst | `spec.md`, `tareas.md`, `evidencia.md` (este paquete) | todos | - (hecho 2026-10-20) |
| 2 | Orquestador + Producto | Ratificar `INC07-PEND-01` (recomendacion (a)) en `decisiones.md` | `NAV-01..04` | paso 1 |
| 3 | frontend-developer | Ratificar contrato (componentes, localizadores, no-interferencia) en este spec | todos | paso 2 |
| 4 | Orquestador | Registrar `INC07-CONF-01..03` + no-duplicado + matriz de navegacion; puerta **LISTO** | - | pasos 2-3 |
| 5 | test-engineer | **RED**: unit web (render + href + tab por pantalla/estado) + E2E `inc07-navegacion-auth.spec.ts` (clic, teclado, movil/escritorio, callbackUrl, guarda PIN); sin tocar `src/` | `NAV-01..06` | paso 4 |
| 6 | frontend-developer | **GREEN**: links/CTA en `/login`, `/login-cliente` y las dos ramas de `/portal` | `NAV-01..04` | paso 5 |
| 7 | test-engineer | **VERIFICADO**: bateria completa con base intacta (API 536, Gherkin 153, web 183, E2E 56 o las medidas al arranque), registro en `evidencia.md` | todos | paso 6 |
| 8 | ui-navigation-auditor | Auditoria de la matriz de navegacion (viajes ejecutados por rol, movil/escritorio/teclado, URL directa/recarga/atrás) | matriz | paso 7 |
| 9 | code-reviewer | **REVISADO**: no duplicado, no-interferencia (callbackUrl, guarda PIN, carrera `update()`), pruebas sin aserciones vacias | todos | paso 8 |
| 10 | Orquestador | Certificacion: `avance.md`/`decisiones.md` (**0 puntos**; solo registro de la mejora UX) | todos | paso 9 |
