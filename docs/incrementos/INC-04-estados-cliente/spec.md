# INC-04 - Estados del cliente: inactivacion, motivo e historial (HU-08 + HU-17)

## Estado

Estado actual: **ACEPTADO** (2026-10-19, +2 puntos certificados; evidencia y revision en `evidencia.md`).
Contrato ratificado por `backend-developer` (2026-10-14, secciones "Contrato API
propuesto", "Orden de evaluacion", "Matriz de transiciones ratificada", "Errores" e
"incompatibilidades"). Puerta de entrada, hoy:

- `INC04-PEND-01..08` **resueltas 2026-10-14** y registradas como **`DEC-034..041`**
  (`docs/producto/decisiones.md:42-49`); toda referencia `INC04-PEND-XX` de este spec
  se lee como su DEC correspondiente (mapa en la seccion "Decisiones pendientes").
- Ratificacion de contrato por `backend-developer`: **hecha 2026-10-14**.
- Confirmaciones `INC04-CONF-01..07` y regla de no-duplicado: **ratificadas por el
  orquestador 2026-10-14** (`decisiones.md:55-61`); casilla del checklist cerrada en
  la sincronizacion 2026-10-19.
- Lateral (no de backend): `HU-17-criterios-aceptacion.md` y
  `HU-08-criterios-aceptacion.md` **ya enmendados** (2026-10-14, matriz final
  DEC-038); la enmienda de `HU-17-schemas.ts` + `.md` se commitea con este paquete
  (incompatibilidad #14).
- Las celdas `BLOQUEADO (PEND-XX)` de la tabla de criterios pasaron a `OK` (14
  criterios: 2 REF + 12 OK).

Historial del pipeline: PROPUESTO (2026-10-14) -> **ESPECIFICADO (2026-10-14)** ->
contrato ratificado (2026-10-14) -> LISTO (2026-10-14, sincronizado 2026-10-19) -> RED
(2026-10-19) -> IMPLEMENTADO (2026-10-19) -> VERIFICADO (2026-10-19) -> REVISADO
(2026-10-19, 0 bloqueantes) -> **ACEPTADO (2026-10-19)**.

## Objetivo

Cerrar la **HU-08** (inactivacion de clientes sin borrado fisico: gap **G8** de la
auditoria) y la **HU-17** (estados generales del cliente: gap **G9**), sumando **+2 puntos
MVP** sobre la ruta al 50% fijada en `docs/producto/avance.md:172`
(41 + INC-04 (+2) + INC-05 (+6) + anamnesis (+1, DEC-021) = 50).

Ambas HU estan en **0/4** y **0/3** bullets hoy (`auditoria-puntos-inc00.md:51,57`): el
catalogo de estados, el filtro y el cambio de estado **ya estan pagados** en HU-05/HU-06;
lo exclusivo que falta es **motivo + actor + historial del cambio** y el **bloqueo de
acceso del cliente INACTIVO** (`auditoria:72-82`, G8 `:161`, G9 `:162`).

Nota de alcance: la HU-08 dice literalmente *"Un cliente inactivo no puede **ingresar** ni
acceder a servicios activos nuevos sin ser reactivado"*; este spec cubre las tres
superficies de ese bullet (login del portal, asignacion de servicios nuevos y — sujeto a
`INC04-PEND-06` — ingreso fisico en recepcion), mas la reactivacion exigida por DEC-020.

## Alcance incluido

- **HU-08 b2**: conservacion de historial y datos sin borrado fisico (incluye prueba de
  que `DELETE /clientes/:id` no existe).
- **HU-08 b3**: registro de **quien** realizo el cambio (actor) y el **motivo** de la
  inactivacion, con persistencia transaccional.
- **HU-08 b4**: bloqueo de acceso del cliente `INACTIVO` (login del portal, creacion de
  servicios nuevos, y — segun `INC04-PEND-06` — ingreso fisico) hasta ser reactivado, mas
  la **reactivacion** por `DUENO`/`RECEPCIONISTA` (DEC-020).
- **HU-17 b2**: el cambio de estado **registra motivo** (persistencia + obligatoriedad
  segun `INC04-PEND-02`).
- **HU-17 b3**: el estado general **no elimina** el historial previo (acumulacion
  verificable de N a N+1 registros).
- **Derivado de HU-17 b1 / expectativa G9** (`auditoria:179`): rechazo de **transiciones
  invalidas** con matriz aprobada (`INC04-PEND-05`).
- **UI**: el formulario de edicion de cliente captura y envia `motivo` cuando el cambio
  lo exige (`INC04-EST-06`), para que la operacion siga siendo posible desde la web.
- **Modelo de datos**: modelo nuevo `ClienteEstadoCambio` (o alternativa liviana, segun
  `INC04-PEND-03`) + migracion portable SQLite/PostgreSQL (DEC-012).
- Pruebas TDD/ATDD (RED/GREEN), Gherkin, E2E y evidencia reproducible.

## Fuera de alcance

- **INC-03 cerrado** (ACEPTADO 2026-10-14): no se reabre su alcance. Se tocan
  `routes/recepcion.ts` y `routes/membresia.ts` **solo** para agregar la guarda de
  `INACTIVO` (si `PEND-06`/`PEND-01` lo aprueban), con sus pruebas de regresion
  (`INC03-ING-10`, `INC03-RAP-*`) obligatoriamente verdes.
- **DEC-030 ya probada**: la rama `SUSPENDIDO`/`RETIRADO -> 403 INGRESO_NO_PERMITIDO` del
  ingreso **no se vuelve a cobrar ni a re-especificar** (punto de HU-30, `INC03-ING-10`).
  Aqui solo se especifica la rama **`INACTIVO`** (bullet exclusivo de HU-08, sujeto a
  `PEND-06`).
- **HU-05 / HU-06 ya aceptados**: cambio de estado generico, enum y filtro por estado NO
  se re-especifican ni se re-cobran (secciones REF de los criterios).
- **INC-05** (HU-13/HU-14 servicios personalizado/nutricion): la guarda de servicios nuevos
  se implementa en el **servicio** (`INC04-CONF-06`) para que INC-05 la herede; este
  incremento no crea esas rutas.
- **Anamnesis** (HU-09/10/11/28, PEND-003/DEC-021), **rutinas** (HU-18..21/26),
  **nutricion** (HU-22..24/27), **reportes/historial/notificaciones** (HU-32/33/34): la
  **UI visible del historial** de estados es HU-07/HU-32 (bloques 7-8); aqui solo se
  persiste y se observa desde API/BD (`INC04-CONF-05`).
- **Recepcion**: no se anaden pantallas nuevas; se lee/escribe solo lo que exijan los
  criterios de bloqueo (ingreso y consulta existentes de INC-03).
- Riesgos globales R-01..R-04, R-06..R-09, R-11, D2, REV-01..REV-05 (backlog global).

## Bullets de origen (trazabilidad obligatoria)

**HU-08 — Inactivacion de clientes sin borrado fisico** (`historias-usuario-gimnasio.md:143-156`):

| # | Bullet |
|---|---|
| b1 | El sistema permite cambiar el estado del cliente a inactivo. |
| b2 | El sistema conserva su historial. |
| b3 | El sistema registra quien realizo el cambio y el motivo. |
| b4 | Un cliente inactivo no puede ingresar ni acceder a servicios activos nuevos sin ser reactivado. |

**HU-17 — Gestion de estados generales del cliente** (`historias-usuario-gimnasio.md:281-293`):

| # | Bullet |
|---|---|
| b1 | El sistema permite manejar estados generales como nuevo, activo, suspendido, retirado e inactivo. |
| b2 | El sistema registra motivo cuando el estado cambia. |
| b3 | El estado general no elimina el historial previo del cliente. |

## Criterios de aceptacion

IDs estables `INC04-CLI-nn` (HU-08) e `INC04-EST-nn` (HU-17). El criterio ISTQB de origen
es el del archivo G14 correspondiente
(`club-beasts-api/features/acceptance-criteria/HU-08-criterios-aceptacion.md` /
`HU-17-criterios-aceptacion.md`, creados 2026-10-08). Estado: `OK` = observable y
comprobable con el spec; `BLOQUEADO` = depende de una decision de Producto pendiente;
`REF` = trazabilidad de un bullet ya pagado en HU-05/HU-06 (**no puntuable**).

| ID | HU (bullet) | Criterio origen | Que se observa y comprueba | Estado |
|---|---|---|---|---|
| `INC04-CLI-01` | HU-08 b1 | `HU08-C01` (REF) | `PATCH /clientes/:id` con `estado: "INACTIVO"` refleja el estado en ficha, listado y `?estado=INACTIVO`; evidencia **ya aceptada** (`INC00-CLI-02`, `clientes.feature` C13) | OK (REF, **no puntuable**: duplicado HU-05/HU-06) |
| `INC04-CLI-02` | HU-08 b2 | `HU08-C02` | Tras inactivar: `GET /clientes/:id` 200 con **todos** los campos originales + `estado: "INACTIVO"`; la busqueda por cedula lo sigue encontrando; el historial **acumula** (N -> N+1, los registros previos siguen); `DELETE /clientes/:id` -> 404 (ruta inexistente) | OK (DEC-036: modelo `ClienteEstadoCambio`) |
| `INC04-CLI-03` | HU-08 b3 | `HU08-C03` | `PATCH /clientes/:id` con `{ estado: "INACTIVO", motivo }` -> 200 con `motivo`, `actualizadoPorId` = actor y `ultimoCambio { estadoAnterior, estadoNuevo, motivo, actor, createdAt }`; en la **misma transaccion** se persiste el registro de historial; 400 con los 3 mensajes de motivo; 404 id inexistente; 403 rol `CLIENTE` | OK (DEC-035 motivo obligatorio + DEC-036 registro; roles DEC-037) |
| `INC04-CLI-04` | HU-08 b4 | `HU08-C04a` | `POST /auth/login-cliente` con cliente `INACTIVO` + PIN correcto -> **401 `AUTH_CLIENTE_INACTIVO`** sin `token`; con PIN incorrecto -> 401 `AUTH_INVALID_CREDENTIALS` (no revela el estado: anti-enumeracion); cliente ACTIVO -> 200 (regresion HU-02) | OK (DEC-034) |
| `INC04-CLI-05` | HU-08 b4 | `HU08-C04b` | `POST /clientes/:clienteId/membresias-gym` con cliente `INACTIVO` -> **409 `CLIENTE_INACTIVO`** y **sin fila creada**; cliente no inactivo -> 201 (regresion HU-12); cliente inexistente -> 404 | OK (bullet literal; guarda en el servicio, `CONF-06`) |
| `INC04-CLI-06` | HU-08 b4 | `HU08-C04c` | Comportamiento de la **sesion JWT emitida antes** de inactivar al cliente (revocacion inmediata vs expiracion por TTL) | OK (DEC-040: expira con TTL 24h, sin revocacion inmediata; sin cambio de codigo, prueba de no-regresion) |
| `INC04-CLI-07` | HU-08 b4 | literal b4 (gap de G14: `HU08-C04b` excluye el ingreso fisico) | `POST /recepcion/ingresos` con cliente `INACTIVO` -> **403 `INGRESO_NO_PERMITIDO`** (mensaje `El cliente está INACTIVO y no puede registrar ingresos`), sin fila creada; rama `SUSPENDIDO`/`RETIRADO` **no se re-cobra** (DEC-030, `INC03-ING-10`) | OK (DEC-039) |
| `INC04-CLI-08` | HU-08 b4 (reactivacion) | `HU08-C05` + DEC-020 | `DUENO` y `RECEPCIONISTA` envian `PATCH { estado: "ACTIVO", motivo }` sobre `INACTIVO` -> 200, historial `INACTIVO -> ACTIVO` con actor; el login del cliente vuelve a 200; vuelve a permitirse crear servicios nuevos; rol `CLIENTE` -> 403; sin motivo -> 400 | OK (DEC-020 aprobada; destino `ACTIVO` via `CONF-01`) |
| `INC04-EST-01` | HU-17 b1 | `HU17-C01` (REF) | Enum de exactamente 5 valores en escritura y filtro; ficha/listado lo muestran; fuera de enum -> 400 `Invalid enum value`; evidencia **ya aceptada** (HU-05 `INC00-CLI-02`, HU-06 `clientes.feature` C13) | OK (REF, **no puntuable**: duplicado HU-05/HU-06) |
| `INC04-EST-02` | HU-17 b2 | `HU17-C02a` | `PATCH` con `estado: B` (`B != A`) + `motivo` -> 200 con `ultimoCambio { estadoAnterior: A, estadoNuevo: B, motivo, actor, createdAt }`; fila de historial en BD en la misma transaccion; el motivo queda recuperable posteriormente (no se sobreescribe) | OK (DEC-036) |
| `INC04-EST-03` | HU-17 b2 | `HU17-C02b` | `PATCH` con `estado` **sin** `motivo` -> 400 `VALIDATION_ERROR` `Motivo es requerido cuando cambia el estado` y el estado **no** cambia (lectura literal de la HU) | OK (DEC-035 opcion a) |
| `INC04-EST-04` | HU-17 b3 | `HU17-C03` | Tres cambios de estado consecutivos -> **3 registros** en orden cronologico (mas reciente primero), count crece y nunca se reemplaza; los campos base del cliente (cedula, nombres, sede, vigencias, `createdAt`) quedan intactos; busqueda y filtro siguen funcionando; `DELETE` -> 404 | OK (DEC-036) |
| `INC04-EST-05` | HU-17 b1 (derivado) | `HU17-C04` (expectativa auditoria `G9`, `auditoria:179`) | Transicion permitida -> 200 con motivo; transicion **no** permitida segun la matriz -> **409 `TRANSICION_INVALIDA`** y el estado **no** cambia; mismo estado actual -> 200 no-op **sin** registro nuevo | OK (DEC-038: matriz 5x5, RETIRADO terminal; celda `INACTIVO -> RETIRADO` **permitida** por la regla `* -> RETIRADO`, ratificada por el orquestador 2026-10-14) |
| `INC04-EST-06` | HU-17 b2 (UI) | derivado (necesidad de la UI) | El formulario web de edicion captura `motivo` y lo envia con el cambio de estado; sin el, el 400 del backend se muestra en la UI (role=alert) y el estado no cambia; unit + E2E | OK (DEC-035 opcion a) |

> **Conteo (2026-10-14, tras decisiones)**: 14 criterios = **8 de HU-08** + **6 de HU-17**; 2 `REF` no puntuables (`CLI-01`, `EST-01`) y **12 `OK`** (0 bloqueados). Ningun bullet de HU-08 ni HU-17 queda sin criterio asignado. El spec **no declara puntos**: DEC-016 y la revision posterior son los que certifican.
>
> **Cierre de la puerta (2026-10-14)**: las 10 celdas `BLOQUEADO (PEND-XX)` pasan a `OK` con `DEC-034..041` (certificacion del orquestador al registrar CONF-01..07; este rol no cuenta criterios como aceptados): `DEC-034` -> `CLI-04`, `DEC-035` -> `CLI-03`/`EST-03/06`, `DEC-036` -> `CLI-02`/`EST-02/04`, `DEC-038` -> `EST-05`, `DEC-039` -> `CLI-07`, `DEC-040` -> `CLI-06`.

### Regla de no duplicado (auditoria `auditoria-puntos-inc00.md:72-82, 193-200`)

- El bullet 1 de **cada** HU (cambiar estado / catalogo de estados) y el filtro por estado
  **ya estan pagados** en HU-05 (4 pts) y HU-06 (3 pts): `INC04-CLI-01` y `INC04-EST-01`
  son **REF**, cierran su bullet con la evidencia **ya aceptada** (`clientes.test.ts:435`,
  `clientes.feature` C13) y **no se vuelven a cobrar**.
- "No borra fisicamente" ya esta pagado en HU-05 (`auditoria:80`): `CLI-02` solo
  **verifica** la ausencia de `DELETE`, no aporta punto adicional por esa parte.
- La rama `SUSPENDIDO`/`RETIRADO -> 403` del ingreso es de **HU-30** (DEC-030,
  `INC03-ING-10`, aceptado): `INC04-CLI-07` solo especifica la rama **`INACTIVO`**.
- El bloqueo de **vencimiento** es de HU-16 (DEC-026, aceptado): aqui el bloqueo es por
  **estado**, exigido por HU-08 b4; son razones y rutas distintas (el login por vencimiento
  **no** se modifica).
- Peso: HU-08 = **1 punto** y HU-17 = **1 punto** (`auditoria:105-106`), **solo** si se
  cierran **4/4** y **3/3** bullets respectivamente (spec + implementacion + prueba +
  evidencia + revision, DEC-016). Si un PEND cierra con la opcion que excluye un criterio
  (p. ej. `PEND-05` opcion (a)), el bullet afectado **no** se cierra y el punto no se
  certifica sin cambio explicito de alcance en `decisiones.md`.

## Contrato API propuesto

> **Contrato que backend y frontend deben poder consumir en paralelo una vez abierta la
> puerta LISTO.** Convenciones verificadas: **sin prefijo `/api`** (`src/index.ts:25-29`),
> error `{ error, code }` (`src/lib/errors.ts:3`), fechas `America/Bogota` (DEC-005/006),
> roles DEC-001 (`DUENO`/`RECEPCIONISTA` = staff; `CLIENTE` = portal). Los schemas G14 de
> respuesta son `HU-08-schemas.ts` **y `HU-17-schemas.ts`** (ambos existen y estan
> commiteados desde `721c511`, cierre G14 2026-10-08: la incompatibilidad #1 del borrador
> ("HU-17-schemas NO existe") era **falsa** y se corrige aqui) en
> `club-beasts-api/features/acceptance-criteria/`. Ratificado en INC-03: `src/` **no puede
> importar** G14 (`rootDir: "./src"`); en `src/schemas/` se declaran equivalentes y los
> **tests** importan los G14 directamente (precedente
> `tests/integration/membresia-congelacion.test.ts:44`).
>
> **Ratificado por `backend-developer` (2026-10-14)** contra `src/` con las DEC-034..041
> ya registradas en `docs/producto/decisiones.md`. Autoridad ante dudas, acotada:
> (i) **contrato de respuesta** = G14 (`HU-08-schemas.ts` / `HU-17-schemas.ts`);
> (ii) **contrato de peticion y mensajes de campos ya aceptados** = codigo `src/`
> (HU-04/HU-05/INC-03); de `updateClienteConMotivoSchema` (G14) se toma **solo** la regla
> de `motivo` (3 mensajes + `superRefine`), no su schema completo (ver incompatibilidad
> #10); (iii) celdas G14 marcadas `P-04`/`propuesto` = resueltas por **DEC-038**
> (ver "Matriz de transiciones ratificada" mas abajo); (iv) mensajes nuevos sin
> fuente en G14 ni `src/` se fijan en la tabla de Errores (caso `TRANSICION_INVALIDA`).

### Endpoints

| # | Metodo | Path | Roles permitidos | Exito | Schema (respuesta) | Criterios | Contrato |
|---|---|---|---|---|---|---|---|
| 1 | `PATCH` | `/clientes/:id` (ruta existente, `src/routes/clientes.ts:171`) | `DUENO`, `RECEPCIONISTA` (precedente HU-05; DEC-037) | 200 | DTO actual (`selectClienteUpdate`, `cliente.service.ts:90-94`) **+ aditivos** `motivo: string \| null` y `ultimoCambio?` (= registro completo `clienteEstadoCambioSchema`, ver detalle #1) | `CLI-01`, `CLI-03`, `CLI-08`, `EST-02`, `EST-03`, `EST-05` | **Ratificado (2026-10-14)**: mensajes de la tabla de Errores; orden de "Orden de evaluacion"; `ultimoCambio` completo (incompatibilidad #2) |
| 2 | `GET` | `/clientes/:id` (ficha, `src/routes/clientes.ts:100-134`) | staff; `CLIENTE` self-only | 200 | DTO ficha (`selectFichaCliente`) **+ aditivo** `motivo: string \| null` (solo staff, DEC-041; para `CLIENTE` el campo va `null`) | `CLI-02`, `CLI-03`, `EST-04` | **Ratificado (2026-10-14)**: orden real `401 -> 400 params -> 403 inline -> 404 -> 200`; mensajes propios de 403 de la ficha intactos |
| 3 | `POST` | `/auth/login-cliente` (`src/routes/auth.ts:36-59`) | previo a sesion | 200 | sesion existente `{ token, cliente, tokenExpiresAt }` (sin cambios) | `CLI-04`, `CLI-08` | **Ratificado (2026-10-14, DEC-034)**: rama 401 `AUTH_CLIENTE_INACTIVO` tras validar credenciales, sin `token`; mensaje G14 exacto |
| 4 | `POST` | `/clientes/:clienteId/membresias-gym` (existente, `src/routes/membresia.ts:124`) | `DUENO`, `RECEPCIONISTA` | 201 | DTO vigencia (sin cambios) | `CLI-05` | **Ratificado (2026-10-14)**: guarda `409 CLIENTE_INACTIVO` en el **servicio** `crearMembresia` (`CONF-06`), **antes** del solape; mensaje G14 exacto |
| 5 | `POST` | `/recepcion/ingresos` (existente INC-03, `src/routes/recepcion.ts:198-287`) | `DUENO`, `RECEPCIONISTA` | 201 | `ingresoResponseSchema` (sin cambios) | `CLI-07` | **Ratificado (2026-10-14, DEC-039)**: la misma condicion `if` de estado (`recepcion.ts:229-234`) se amplia con `INACTIVO`; mensaje lo produce el **template existente** (`:231`), sin clave con sufijo |
| 6 | UI | `/clientes/[id]` (`club-beasts-web/src/app/clientes/[id]/page.tsx:194-206`, Select de estado) | sesion staff | render | consume #1 | `EST-06`, `CLI-03` | **Ratificado (consume #1)**: campo `motivo` en el formulario de cambio de estado (DEC-035) |
| 7 | UI | `/login` (portal cliente) | previo a sesion | render | consume #3 | `CLI-04` | **Ratificado (consume #3)**: muestra `La cuenta está inactiva. Contacte con recepción.` (DEC-034) |

### Detalle por endpoint

> Ratificado 2026-10-14 contra `src/`: cada referencia de linea existe y los mensajes
> citados son los del codigo o del G14 (marcados como tales).

- **#1 `PATCH /clientes/:id`**: contrato existente (mensajes de HU-04/HU-05 intactos:
  `src/schemas/cliente.schema.ts` se **extiende**, no se reemplaza) con tres ampliaciones:
  (i) body admite `motivo` (3-200; mensajes G14 `HU-08-schemas.ts:28-31` identicos en
  `HU-17-schemas.ts:66-69`; `superRefine` de `updateClienteConMotivoSchema`
  `HU-08-schemas.ts:89-97`, espejo `HU-17-schemas.ts:133-141`); (ii) si el body trae `estado` **distinto** del actual, se
  escribe el registro de historial junto con el update (mismo `prisma.$transaction`/update,
  `HU08-C03`); (iii) la respuesta agrega `motivo` (del ultimo cambio o `null`) y
  `ultimoCambio` (solo cuando hubo cambio de estado; si no cambio, ausente).
  `motivo` sin `estado` **no se persiste** (`CONF-07`). El estado mismo que llega es el
  que se aplica: el servidor **no** deriva estados (`CONF-01`). **`ultimoCambio` es el
  registro completo** de `clienteEstadoCambioSchema` (G14 `HU-08-schemas.ts:104-112`):
  `{ id, clienteId, estadoAnterior, estadoNuevo, motivo, actor: { id, nombre }, createdAt }`
  con `createdAt` en ISO string (precedente `Ingreso.createdAt.toISOString()`,
  `recepcion.ts:284`); los 5 campos que listan los criterios HU08-C03/HU17-C02a son
  subconjunto de ese registro (incompatibilidad #2). `actor` sale de la relacion al
  `User` con `select: { id, nombre }` (precedente `MembresiaGymCambio.actor`,
  `membresia.service.ts:356`); jamas `email`/`contrasena` (SEC-03).
  Errores de body del PATCH: **todos** los mensajes se unen con `", "`
  (`clientes.ts:185-186`); con un solo error invalido el mensaje es el texto exacto de la
  tabla de Errores.
- **#2 `GET /clientes/:id`**: agrega `motivo` derivado del ultimo cambio de historial
  (una sola fuente, `DEC-036` = `PEND-03` opcion (a)); para el rol `CLIENTE` el campo va
  `null` (DEC-041). Orden **real** del codigo: `401` (preHandler `authenticate`,
  `clientes.ts:102`) -> `400` (params `:104-108`) -> `403` (roles en linea `:114-126`,
  mensajes propios `No tienes permisos para consultar esta ficha.`) -> `404` (`:129-131`)
  -> `200`. La ficha conserva sus 403 propios (precedente aceptado INC-03) y **no** se
  unifican con el preHandler. No se expone `ultimoCambio` ni `historialEstados` en la
  ficha (`CONF-05`; incompatibilidad #13).
- **#3 login**: orden cerrado `400 (schema: primer error de loginClientSchema)` -> `401
  AUTH_INVALID_CREDENTIALS` (credenciales) -> `401 AUTH_CLIENTE_INACTIVO` (PIN ok +
  estado `INACTIVO`) -> `200`. **Primero credenciales, despues estado**
  (`HU08-C04a`: un atacante sin PIN recibe siempre el 401 generico). Cambio de GREEN:
  `loginClient` (`auth.service.ts:14-28`) debe traer `estado` en el `findUnique` y
  `routes/auth.ts` devolver el 401 propio **sin emitir token**; la respuesta de exito
  (`{ token, cliente, tokenExpiresAt }`) queda **identica** a HU-02 (regresion).
- **#4 membresias-gym**: orden `401/403 (preHandler) -> 400 (params
  membresiaParamsSchema) -> 400 (body createMembresiaSchema: formato de fechas y
  `fechaFin >= fechaInicio`, **primer** error, `membresia.ts:136-141`) -> 404 (cliente,
  lookup en la ruta `:149-158`) -> 409 `CLIENTE_INACTIVO` (guarda en
  `crearMembresia` **antes** del solape, `CONF-06`) -> 409 `MEMBRESIA_SOLAPADA`
  (DEC-008) -> 201`. El "400 fechas" de orden invalido **no** va despues del 409: es
  parte del paso 400 body (Zod); tras el 409 solo queda el solape (incompatibilidad
  #12). Guarda en el **servicio** para que INC-05 (PERSONALIZADO/NUTRICION) la herede.
- **#5 ingreso**: el paso de estado existente (`routes/recepcion.ts:227-234`) pasa de
  `SUSPENDIDO || RETIRADO` a incluir `INACTIVO` en la **misma** condicion; el mensaje
  `El cliente está INACTIVO y no puede registrar ingresos` lo produce el **template
  existente** `` `El cliente está ${cliente.estado} y no puede registrar ingresos` ``
  (`:231`) — no hace falta clave con sufijo ni un `if` nuevo: `INGRESO_NO_PERMITIDO`
  ya convive con multiples mensajes por condicion en esta ruta (precedente INC-03 de
  mapa; aqui basta la condicion). Todo lo demas del orden de INC-03 queda **intacto**.
- **#6/#7 UI**: el formulario de estado envia `{ estado, motivo }`
  (`cliente-payload.ts:41` hoy envia solo `estado`: cambio EST-06/DEC-035); el portal
  muestra el mensaje del 401 propio sin intentar recuperar sesion (`classifyError`
  `club-beasts-web/src/lib/api.ts:180-201` clasifica hoy cualquier 401 como
  `session_expired` y `:268` dispararia `recoverSession`; riesgo `INC04-R11`).

### Errores (tabla consolidada; un `code` = un unico **status**)

> **Ratificado 2026-10-14**: los mensajes de la columna "Mensaje" son los textos
> **exactos** del codigo actual (con tildes) o del G14 cuando lo fija; donde el borrador
> decia "propuesto" se sustituye por el texto final (precedente de ratificacion INC-03).

| Status | `code` | Condicion | Mensaje | Endpoint |
|---|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` de params ausente / > 36 | `id es requerido` / `id excede longitud máxima` (`src/schemas/cliente.schema.ts:88-93`) | #1, #2 |
| 400 | `VALIDATION_ERROR` | `motivo` ausente en un cambio de estado (superRefine) | `Motivo es requerido cuando cambia el estado` (G14 `HU-08-schemas.ts:94`) | #1 |
| 400 | `VALIDATION_ERROR` | `motivo` de 1-2 caracteres | `Motivo debe tener al menos 3 caracteres` (G14 `HU-08-schemas.ts:30`) | #1 |
| 400 | `VALIDATION_ERROR` | `motivo` de 201+ caracteres | `Motivo no puede exceder 200 caracteres` (G14 `HU-08-schemas.ts:31`) | #1 |
| 400 | `VALIDATION_ERROR` | `estado` fuera del enum | mensaje Zod completo `Invalid enum value. Expected 'NUEVO' \| 'ACTIVO' \| 'SUSPENDIDO' \| 'RETIRADO' \| 'INACTIVO', received '<valor>'` (zod 3.23; precedente HU-05: los `.feature`/steps lo asertan con `toContain("Invalid enum value")`, `clientes.feature:144` + `auth.steps.ts:63`) | #1 |
| 400 | `VALIDATION_ERROR` | otros campos de #1 invalidos (nombres, telefono, email, sedeId, observaciones) | mensajes HU-04/HU-05 **intactos** del `src` (ver incompatibilidad #10: no se adoptan los del G14 `updateClienteConMotivoSchema`) | #1 |
| 400 | `VALIDATION_ERROR` | `sedeId` bien formado pero inexistente (tras el 404, dentro de `updateCliente`) | `La sede indicada no existe. Verifique el identificador enviado.` (`src/routes/clientes.ts:45`) | #1 |
| 400 | `VALIDATION_ERROR` | `cedula`/`pin` mal formados en el login (el endpoint reporta el **primer** error, `auth.ts:40`) | `Cédula es requerida`, `Cédula debe ser numérica de 6 a 10 dígitos`, `PIN es requerido`, `PIN debe ser de 4 dígitos` (`src/schemas/auth.schema.ts:15-24`) | #3 |
| 400 | `VALIDATION_ERROR` | `clienteId` de params mal formado en #4 (primer error) | `clienteId es requerido` (`src/schemas/membresia.schema.ts:77-85`) | #4 |
| 400 | `VALIDATION_ERROR` | fechas de #4 mal formadas, vacias o `fechaFin < fechaInicio` (Zod, **antes** del 404) | `Fecha de inicio es requerida`, `Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)`, `Fecha fin es requerida`, `Fecha fin debe ser una fecha válida (YYYY-MM-DD)`, `Fecha fin no puede ser anterior a fecha de inicio` (`src/schemas/membresia.schema.ts:32-46`; primer error, `membresia.ts:138-141`) | #4 |
| 401 | `AUTH_TOKEN_MISSING` | sin header Authorization | `Token de autenticación requerido.` (`src/plugins/auth.ts:39`) | #1, #2, #4, #5 |
| 401 | `AUTH_TOKEN_INVALID` | token ilegible/firmado distinto | `Token de autenticación inválido.` (`src/plugins/auth.ts:45`) | #1, #2, #4, #5 |
| 401 | `AUTH_TOKEN_EXPIRED` | token vencido | `Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.` (`src/plugins/auth.ts:32`) | #1, #2, #4, #5 |
| 401 | `AUTH_INVALID_CREDENTIALS` | cedula/PIN incorrectos (antes de evaluar estado) | `Cédula o PIN inválido` (`src/routes/auth.ts:47`, ya aceptado HU-02) | #3 |
| 401 | `AUTH_CLIENTE_INACTIVO` | PIN correcto + estado `INACTIVO` (DEC-034; **sin** `token`) | `La cuenta está inactiva. Contacte con recepción.` (G14 `HU08-C04a`, literal) | #3 |
| 403 | `AUTH_FORBIDDEN` | rol fuera de los permitidos (p. ej. `CLIENTE` en #1/#4/#5) — preHandler | `No tienes permisos para realizar esta acción.` (`src/plugins/auth.ts:60`) | #1, #4, #5 |
| 403 | `AUTH_FORBIDDEN` | ficha: `CLIENTE` consultando a otro (`user.id !== id`) o rol que no sea staff/CLIENTE — chequeo **en linea** de la ruta | `No tienes permisos para consultar esta ficha.` (`src/routes/clientes.ts:116,124`; mensaje propio, precedente aceptado, **no** se unifica) | #2 |
| 404 | `NOT_FOUND` | cliente inexistente | `Cliente no encontrado` (`src/routes/clientes.ts:130,191`; `membresia.ts:154-157`; en #5 por cedula: `recepcion.ts:75`) | #1, #2, #4, #5 |
| 409 | `TRANSICION_INVALIDA` | matriz de transiciones ratificada (DEC-038) | `Transición de estado no permitida` (**fijado aqui**: G14 lo dejo "propuesto"; DEC-038 aprobo el 409, no el texto) | #1 |
| 409 | `CLIENTE_INACTIVO` | asignacion de servicio nuevo a cliente `INACTIVO` (servicio, antes del solape) | `El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos.` (G14 `HU08-C04b`, literal) | #4 |
| 409 | `DUPLICATE` | cedula ya registrada (P2002, contrato existente) | `Ya existe un cliente con esa cédula` (`src/routes/clientes.ts:59`) | #1 |
| 403 | `INGRESO_NO_PERMITIDO` | estado `INACTIVO` (DEC-039) | `El cliente está INACTIVO y no puede registrar ingresos` (template existente `recepcion.ts:231`) | #5 |
| 403 | `INGRESO_NO_PERMITIDO` | estados `SUSPENDIDO`/`RETIRADO` (DEC-030) | ya existente (`El cliente está ${estado} y no puede registrar ingresos`), **no se toca** | #5 |
| 403 | `INGRESO_NO_PERMITIDO` | vigencia GYM `VENCIDA`/`PROGRAMADA`/`SIN_VIGENCIA` (INC-03) | ya existentes (`recepcion.ts:243-261`), **no se tocan** | #5 |

Notas de ratificacion:

- **`ultimoCambio` y `motivo` son aditivos**: ningun mensaje ni campo existente cambia;
  el unico contrato de request que cambia es el de #1 con `motivo` (DEC-035: cambio de
  contrato documentado, no regresion).
- **Errores multiples de #1**: el body del PATCH une todos los mensajes con `", "`
  (`clientes.ts:185-186`); los tests asertan el mensaje exacto con bodies que producen un
  solo error (precedente HU-04/HU-05).
- **401 vs 403 (`AUTH_CLIENTE_INACTIVO`)**: se mantiene en **401** por ser fallo de
  autenticacion (G14/DEC-034), pero el web **debe** clasificarlo explicitamente antes del
  `status === 401` generico de `club-beasts-web/src/lib/api.ts:199-200` (que hoy cae en
  `session_expired` y dispararia `recoverSession` en `:268`); riesgo `INC04-R11`.
- **Sin escritura** en ninguno de los 400/401/403/404/409 de esta tabla.

### Orden de evaluacion (deterministico)

> Ratificado 2026-10-14 contra el orden **real** del codigo actual; el primer paso que
> aplica responde y se detiene (patron INC-02/03). Donde el borrador divergia del codigo
> (ficha #2, fechas de #4) se corrige aqui (incompatibilidades #11/#12).

- **#1 PATCH**: 401/403 (preHandler) -> 400 (params `id`) -> 400 (body: campos, enum,
  **motivo**; todos los mensajes unidos con `", "`) -> 404 (cliente) -> 409
  (`TRANSICION_INVALIDA`, matriz ratificada) -> 400 (`sedeId` inexistente) / 409
  (`DUPLICATE`) -> 200. **Sin escritura** en 400/404/409. El 409 de transicion va
  **antes** de la validacion de `sedeId` porque la matriz se evalua con el estado ya
  leido (tras el 404) y no escribe nada; `motivo` se valida **dentro del paso de 400
  body**, antes de la 404 (implementado en la ruta tras el parseo — ver nota de la
  incompatibilidad #10 — porque el schema aceptado debe seguir parseando `{estado}`
  solo), no aqui.
- **#2 ficha**: 401 (preHandler `authenticate`) -> 400 (params) -> 403 (roles en linea:
  CLIENTE self-only / rol no permitido; mensaje propio) -> 404 -> 200.
- **#3 login**: 400 (cedula/PIN, primer error) -> 401 `AUTH_INVALID_CREDENTIALS` -> 401
  `AUTH_CLIENTE_INACTIVO` -> 200.
- **#4 membresias-gym**: 401/403 (preHandler) -> 400 (params) -> 400 (body: formato de
  fechas y orden de fechas, **primer** error) -> 404 (cliente) -> 409
  `CLIENTE_INACTIVO` (servicio, antes del solape) -> 409 `MEMBRESIA_SOLAPADA` ->
  201.
- **#5 ingreso**: orden **INTACTO** de INC-03 (401/403 -> 400 -> 404 -> 400 sede -> **403
  estado** -> 403 vigencia -> 201); solo se amplia la condicion del paso de estado con
  `INACTIVO`.

Nota sobre el orden de `HU08-C03` (G14): el criterio escribe "primero formato/enum, luego
existencia del cliente, luego permiso de rol, luego motivo"; el codigo **no** puede
validar el rol despues de la 404 sin reescribir la arquitectura de auth (DEC-001:
preHandler) y el motivo se valida **en el paso de 400 body** (ruta, antes de la 404). Se ratifica el orden del codigo
(= orden ya aceptado de INC-03 para el PATCH); el G14 solo **enumera** los codigos
posibles, y **ningun** escenario Gherkin de HU-08/HU-17 cubre las combinaciones que
discriminan los dos ordenes (`CLIENTE` + id inexistente; id inexistente + `motivo`
ausente) — el RED no debe asertar esas combinaciones (incompatibilidad #9).

### Matriz de transiciones ratificada (DEC-038 = `INC04-PEND-05` opcion (b))

| Actual \\ Siguiente | `NUEVO` | `ACTIVO` | `SUSPENDIDO` | `RETIRADO` | `INACTIVO` |
|---|---|---|---|---|---|
| `NUEVO` | no-op 200 | si | si | si | si |
| `ACTIVO` | 409 | no-op 200 | si | si | si |
| `SUSPENDIDO` | 409 | si | no-op 200 | si | si |
| `RETIRADO` | 409 | 409 | 409 | no-op 200 | 409 |
| `INACTIVO` | 409 | si (DEC-020) | 409 | **si** (ver nota) | no-op 200 |

- `si` = 200 con `motivo` obligatorio (DEC-035) y registro en historial; no-op 200 =
  mismo estado, **sin** registro nuevo (`CONF-02`); 409 = `TRANSICION_INVALIDA` sin
  escritura.
- La matriz sale **literalmente** de la opcion (b) aprobada como DEC-038: `RETIRADO`
  terminal ("no se reactiva ni se cambia"), `NUEVO -> ACTIVO/SUSPENDIDO/RETIRADO/
  INACTIVO`, `ACTIVO <-> SUSPENDIDO`, `* -> RETIRADO/INACTIVO`, `INACTIVO -> ACTIVO`.
- **`INACTIVO -> RETIRADO` = permitida** por la clausula `* -> RETIRADO` (dar de baja
  definitiva a un inactivo no reactiva ni cambia un RETIRADO, asi que no choca con la
  terminalidad). El borrador G14 la dejo como celda `P-04` "propuesto: rechazar"; la
  enmienda de `HU-17-schemas.ts` (2026-10-14, sin commitear) ya la puso en `true`
  (`transicionesAprobadas.INACTIVO: { ACTIVO: true, RETIRADO: true }`, `:284-293`) —
  **paridad verificada celda por celda con esta matriz el 2026-10-14**; queda pendiente
  alinear el `.md` (incompatibilidad #14). Si el orquestador/Product prefirieran la
  propuesta original del G14 para esa unica celda, cambia **solo** ella (409) en los tres
  lugares (spec, `.ts`, `.md`) y `EST-05` no pierde cobertura.

### Modelo de datos propuesto (tarea `database-admin`, fuera de este paquete de documentacion)

Opcion recomendada en el borrador, **confirmada por DEC-036** (`INC04-PEND-03` =
**(a)**), patron `MembresiaGymCambio` (`prisma/schema.prisma:92-113`):

```prisma
model ClienteEstadoCambio {
  id             String   @id @default(cuid())
  clienteId      String
  cliente        Cliente  @relation(fields: [clienteId], references: [id])
  estadoAnterior String?  // null solo si no hubo estado previo conocido
  estadoNuevo    String   // NUEVO | ACTIVO | SUSPENDIDO | RETIRADO | INACTIVO
  motivo         String   // 3-200, requerido (HU-17 b2 / HU-08 b3)
  actorId        String
  actor          User     @relation(fields: [actorId], references: [id])
  createdAt      DateTime @default(now())

  @@index([clienteId, createdAt])
}

model Cliente {
  // ... campos actuales ...
  estadoCambios ClienteEstadoCambio[] // back-relation OBLIGATORIA (Prisma)
}

model User {
  // ... campos actuales ...
  estadosClienteCambiados ClienteEstadoCambio[] // back-relation OBLIGATORIA (actor)
}
```

> **Ratificado 2026-10-14**: el `schema.prisma` actual (`prisma/schema.prisma:43-71`
> `Cliente`, `:21-41` `User`) **no tiene** el modelo ni las back-relations; sin ellas
> `prisma migrate` falla (precedente ratificado INC-03 con `Ingreso`); las 3 piezas
> (`model ClienteEstadoCambio` + `estadoCambios` + `estadosClienteCambiados`) van en la
> **misma migracion**. A diferencia de `MembresiaGymCambio` (que usa `@relation("...")`
> porque `User<->MembresiaGym` tiene dos relaciones), aqui **no** hace falta nombre de
> relacion: cada par de modelos tiene una sola fila de relation. `DEC-036` describe el
> historial como "(clienteId, estadoAnterior, estadoNuevo, motivo, **creadoPorId**,
> createdAt)"; el nombre de columna ratificado aqui es **`actorId`** (con relacion
> `actor`), por el G14 (`ultimoCambio.actor: { id, nombre }` en
> `clienteEstadoCambioSchema`) y el patron `MembresiaGymCambio.actorId`
> (`schema.prisma:96-97`); DEC-036 se lee como descripcion del **contenido** (quien
> realizo el cambio), no del identificador de columna (incompatibilidad #15; si el
> orquestador prefiere alinear la columna a `creadoPorId`, solo cambia el nombre en
> `schema.prisma` + este bloque, **no** el contrato de respuesta).

- **Sin columna `motivo` en `Cliente`**: `motivo` de la respuesta/ficha se **deriva** del
  ultimo `ClienteEstadoCambio` (una sola fuente, sin divergencia).
- Migracion portable `CREATE TABLE` compatible SQLite (dev, DEC-012) y PostgreSQL (prod);
  sin constraints nuevos sin probar en Postgres (R-01/R-02 heredados); el
  `@@index([clienteId, createdAt])` es de lectura (ficha/orden del historial), no una
  restriccion; **sin** unique sobre `(clienteId, estadoNuevo)` (varios cambios al mismo
  estado en momentos distintos son validos).
- Alternativa liviana (`INC04-PEND-03` = **(b)**, descartada por **DEC-036** =
  opcion (a)): `Cliente.estadoMotivo String?` +
  `actualizadoPorId/updatedAt` (ya existen); **no** satisface la acumulacion de
  `INC04-EST-04` ni la matriz de `EST-05`.

### Incompatibilidades con criterios/schemas G14 y con `src/` (ratificacion; los G14 no se editan aqui)

> Ratificacion de `backend-developer` (2026-10-14), igual que INC-03. Los archivos G14
> **no se editan desde este spec** (los edita `acceptance-criteria-analyst` cuando el
> orquestador lo pida); aqui se documenta el contrato final y que hay que enmendar, para
> que el RED no se escriba sobre un schema vencido. Las 8 primeras filas son las del
> borrador (ya resueltas o corregidas); 9-16 son las que arrojo la verificacion contra
> `src/`.

| # | Incompatibilidad | Contrato final (fuente) | Cambio exigido |
|---|---|---|---|
| 1 | El borrador afirma que **`HU-17-schemas.ts` no existe**; verificado: **existe y esta commiteado** (`721c511`, cierre G14 2026-10-08) y ademas ya trae una **enmienda sin commitear del 2026-10-14** (`git status: M`) alineada a DEC-034..041 (matriz, ficha, orden) | Los tests G14 de HU-17 **ya** tienen contrato importable: `motivoCambioEstadoSchema`, `cambioEstadoClienteSchema`, `updateClienteConMotivoSchema`, `clienteEstadoCambioSchema` (con `id`/`clienteId` opcionales), `respuestaPatchClienteSchema`, `respuestaCambioEstadoSchema`, `fichaClienteResponseSchema`, `transicionErrorSchema`/`transicionInvalidaResponseSchema`, `loginClienteInactivoResponseSchema`, `transicionesAprobadas` + `clasificarTransicion` | **Sin accion de creacion** (tarea #10 de `tareas.md` y casilla del checklist pasan a sin objeto; el orquestador corrige `tareas.md`, fuera de este archivo). **Pendiente lateral**: commitear la enmienda y alinear el **`.md`** (ver #14); `INC04-R07` queda re-scoped a eso |
| 2 | `HU08-C03`/`HU17-C02a` describen la respuesta del PATCH como `{ id, cedula, estado, motivo, actualizadoPorId, updatedAt, ultimoCambio }` (un subconjunto, y `ultimoCambio` solo con 5 campos); pero (a) el DTO real del PATCH tiene ~15 campos (`selectClienteUpdate`) y la web los consume, y (b) el schema G14 `respuestaCambioEstadoSchema.ultimoCambio` **exige** `clienteEstadoCambioSchema` completo: `id`, `clienteId`, `actor: { id, nombre }` y `createdAt` (`HU-08-schemas.ts:104-126`) | Respuesta = DTO actual **+** `motivo` y `ultimoCambio` **completo** `{ id, clienteId, estadoAnterior, estadoNuevo, motivo, actor { id, nombre }, createdAt }` (aditivo, nunca quita campos); los schemas G14 validan el subconjunto (Zod ignora campos extra) | Ratificado en backend (detalle #1); los tests validan con G14 **y** asertan los campos extra |
| 3 | `updateClienteConMotivoSchema` (HU-08) trae un `superRefine` que **exige** `motivo` en todo PATCH con `estado`; hoy `updateClienteSchema` lo permite sin motivo y tests aceptados dependen de eso. **Impacto real corregido** (el borrador sobre/infra-conto): unit `cliente.schema.test.ts:152` (**no** `:252`, que valida `searchClientesSchema` de filtro y no lleva motivo); integracion `clientes.test.ts:426,456,736` (**no** `:486`, que es 403 por preHandler y nunca llega a Zod) y `features.test.ts:339`; web `cliente-payload.ts:41` + units `cliente-payload.test.ts` y `cliente-edicion.test.tsx:163`; **omitido en el borrador**: helper E2E `club-beasts-web/tests/e2e/e2e-helpers.ts:91` (`data: { estado }` sin motivo), usado por `clientes.spec.ts:81` y `recepcion.spec.ts:83` (romperia la base **47/47**). Ningun step Gherkin actual envia `estado` via PATCH (solo telefono/email en `clientes.steps.ts`/`inc03-fixtures.steps.ts`) | **DEC-035** (opción a) adoptada: obligatoriedad universal del motivo; la adopcion es **controlada y documentada** (cambio de contrato, no regresion) | Decidido en `PEND-02`/DEC-035: el RED actualiza (nunca borra) esa lista; el GREEN extiende el schema `src` (#10) |
| 4 | `HU08-C04a` pide 401 `AUTH_CLIENTE_INACTIVO`; `HU-02` (aceptada 4/4) exige 200 con token para clientes no bloqueados y 401 `AUTH_INVALID_CREDENTIALS` para credenciales malas | Coexisten por **orden**: credenciales primero (`auth.service.ts:14-28` + `routes/auth.ts:44-50`), estado despues (DEC-034); los tests de HU-02 no cambian y la respuesta de exito queda identica | Verificar en RED que `auth.test.ts` (HU-02) queda intacto |
| 5 | `HU08-C04b` propone **409** `CLIENTE_INACTIVO`, hoy `routes/membresia.ts` no tiene ningun 409 de estado de cliente (el 409 existente es `DUPLICATE` de cedula, `clientes.ts:56-60`) | 409 con `code: "CLIENTE_INACTIVO"` (distinto de `DUPLICATE`: el `code` desambigua) y mensaje G14 exacto; guarda en `crearMembresia` **antes** del solape (`CONF-06`) | Ratificado en backend (tabla de Errores + orden #4) |
| 6 | `HU17-C04` propone **409** `TRANSICION_INVALIDA`; grep `TRANSICION` = 0 en `src/` (re-verificado 2026-10-14) | **DEC-038** (opcion b): aplica; mensaje fijado `Transición de estado no permitida` (G14 lo dejo "propuesto") | GREEN crea el code en el servicio de cliente; RED lo prueba con la matriz ratificada |
| 7 | `HU08-C02`/`HU17-C03` exigen observar el historial; **no hay endpoint de lectura** de historial y la UI de historial es HU-07/HU-32 | `CONF-05`: historial observable via `ultimoCambio` (respuesta del PATCH) + lectura directa en BD desde steps/integracion (precedente: `features/steps/inc03-fixtures.steps.ts` ya usa `prisma`) | Sin endpoint nuevo en INC-04; si Producto quiere verlo en UI, es HU-32 |
| 8 | Fixture G14 con cedulas fijas (`1234567890`) y estados puestos "en el Given" | Estados se setean en BD directa (el setter de estado via API exige motivo segun DEC-035; ya existen helpers `crearCliente` directos en los tests de recepcion); fechas relativas a `getTodayBogota()` (DEC-013) | `test-engineer` traduce los `.feature` en el RED (criterio DEC-013 ya aplicado en INC-03) |
| 9 | `HU08-C03` ordena "formato/enum -> existencia -> **permiso de rol** -> motivo"; el codigo valida rol en el **preHandler** (antes de params/body/404) y el motivo en Zod (antes de la 404) | Orden del codigo = orden ratificado (mismo precedente INC-03 del PATCH: 401/403 -> 400 -> 404); los codigos del G14 (400/403/404) siguen siendo todos posibles | El RED **no** aserta las 2 combinaciones que discriminan los ordenes (`CLIENTE` + id inexistente -> 403 aqui, 404 en el G14; id inexistente + motivo ausente -> 400 aqui, 404 en el G14): ningun `.feature` G14 las cubre |
| 10 | `updateClienteConMotivoSchema` (G14) **no** es un drop-in de `updateClienteSchema` (`src/schemas/cliente.schema.ts:34-56`): no tiene el `blankToNull` de `email`/`observaciones` (rechaza `null` y no normaliza `""`), no acepta `email: null`, y los mensajes de nombres difieren (`Nombres no pueden exceder 100 caracteres` vs `No puede exceder 100 caracteres` de `namesSchemaFor`, `common.schema.ts:38-45`); los tests aceptados dependen del comportamiento src (`cliente.schema.test.ts:192-224`, `clientes-opcionales.test.ts:138-139`, `clientes.test.ts:365-366`) | El GREEN **extiende** `updateClienteSchema` con `motivo` + el `superRefine` identico al G14 (`HU-08-schemas.ts:89-97`); de G14 se toma la regla de motivo y los schemas de **respuesta**, nunca su schema de request completo | `backend-developer` en GREEN; `test-engineer` valida respuestas con G14 y requests con el schema `src` (precedente INC-03: equivalentes en `src/schemas/`). **Nota de implementacion (2026-10-19)**: el 400 de `motivo` ausente quedo en la **ruta** (`routes/clientes.ts`, tras el parseo y antes del 404, orden CONF-03) y no en el `superRefine` del schema, porque `tests/unit/cliente.schema.test.ts:150-155` (aceptado) exige que `{estado}` sin `motivo` siga parseando a nivel schema; el criterio Gherkin/REST no distingue ambas ubicaciones |
| 11 | El borrador ordenaba la ficha `#2` como `401/403 -> 400 params -> 404`; en el codigo el 403 de la ficha es **inline** y se evalua **despues** del 400 de params (`clientes.ts:102-126`) | Orden real: `401 -> 400 params -> 403 (CLIENTE self-only / rol no permitido, mensaje propio "No tienes permisos para consultar esta ficha.") -> 404 -> 200` | Ya aplicado en "Orden de evaluacion" y en la tabla de Errores; el RED aserta ese orden |
| 12 | El borrador colocaba en #4 un "400/409 fechas" **despues** del 409 `CLIENTE_INACTIVO`; en el codigo el formato/orden de fechas es Zod (400 body, **antes** del 404, `membresia.schema.ts:32-46`) y tras el 409 de estado solo queda el solape (`hasOverlap` en `crearMembresia`) | Orden #4: `401/403 -> 400 params -> 400 body (fechas) -> 404 -> 409 CLIENTE_INACTIVO -> 409 MEMBRESIA_SOLAPADA -> 201` | Ya aplicado en "Orden de evaluacion" y "Detalle #4" |
| 13 | El borrador G14 definia `fichaConHistorialEstadosSchema` (exigia `historialEstados: []` en la ficha); **ya resuelto 2026-10-14**: la enmienda de `HU-17-schemas.ts` lo **reemplazo** por `fichaClienteResponseSchema` (`:219-228`: DTO ficha + `motivo: nullable`, **sin** array de historial), coherente con que **ningun criterio** pide ese campo (HU17-C03 observa el historial en BD) y `CONF-05` fija `ultimoCambio` + lectura directa | **No se expone** `historialEstados` en la ficha de INC-04; los tests validan `GET /clientes/:id` con `fichaClienteResponseSchema` (el schema viejo ya no se exporta) | Sin accion: `test-engineer` usa el schema nuevo en el RED (precedente INC-03 incompatibilidad #1: no implementar lo que el alcance no pide) |
| 14 | La matriz del G14 dejaba celdas `P-04` ("propuesto: rechazar") y `HU-17-criterios-aceptacion.md` sigue hoy **BLOQUEADO (P-04)** con la matriz vieja (`:18,62-71,102-111,194,224`) y con `HU08-C04b` marcado "(propuesto)" (`HU-08-criterios-aceptacion.md:75`); **el `.ts` ya fue enmendado 2026-10-14** (sin commitear): `transicionesAprobadas` (`:284-293`) = exactamente la matriz ratificada de este spec, incluida `INACTIVO -> RETIRADO: true` por la regla `* -> RETIRADO` de DEC-038, con `RETIRADO: {}` terminal y `clasificarTransicion` (diagonal -> `NO_OP`, `CONF-02`) | Matriz de la seccion "Matriz de transiciones ratificada" (5x5 cerrada); el `.ts` ya la refleja celda por celda (paridad verificada 2026-10-14) | `acceptance-criteria-analyst`: (i) **enmendar `HU-17-criterios-aceptacion.md`** (quitar BLOQUEADO/P-04, escribir la matriz final y `409 TRANSICION_INVALIDA` como decidido) y `HU-08-criterios-aceptacion.md:75` (409 ya decidido por DEC-038), (ii) commitear la enmienda del `.ts`; el RED aserta **paridad** spec == `transicionesAprobadas`. Si el orquestador/Product prefiriera fijar `INACTIVO -> RETIRADO` en 409 (contra la lectura literal de `* -> RETIRADO`), cambia una sola celda en los 3 lugares |
| 15 | **DEC-036** describe el modelo con `creadoPorId`; el spec, el G14 (`ultimoCambio.actor`) y el patron `MembresiaGymCambio` usan `actorId`/`actor`; el propio G14 **delega** la eleccion de nombre en `database-admin` (`HU-17-schemas.ts:151-153`) | Columna ratificada: **`actorId`** + relation `actor` (contenido = quien realizo el cambio, tal como lo resume DEC-036); back-relations `Cliente.estadoCambios` y `User.estadosClienteCambiados`, en la misma migracion | `database-admin` usa `actorId` (cierra la delegacion del G14 con este spec); si el orquestador quiere alinear el nombre con la redaccion literal de DEC-036, solo cambia `schema.prisma` + este spec; el contrato de respuesta **no** cambia |
| 16 | El borrador decia para #5 "mensaje propio por condicion, patron de claves con sufijo ya usado en INC-03"; el codigo actual ya produce el mensaje exacto del contrato con el **template existente** `` `El cliente está ${estado} y no puede registrar ingresos` `` (`recepcion.ts:231`) | Basta ampliar la condicion del `if` de `recepcion.ts:229-234` con `INACTIVO`; el mensaje resultante es literalmente `El cliente está INACTIVO y no puede registrar ingresos`; sin mapa ni claves nuevas | GREEN de una sola condicion; la rama DEC-030 (`SUSPENDIDO`/`RETIRADO`) queda intacta (regresion `INC03-ING-10`) |

## Fixtures y datos de prueba

Aislamiento: **DEC-012** (SQLite aislado por ejecucion) y **DEC-013** (fechas relativas a
`getTodayBogota()`). Cedulas con prefijo por suite (precedente INC-03).

| # | Fixture | Creacion | Para que prueba |
|---|---|---|---|
| F1 | Cliente `ACTIVO` con membresia GYM vigente (`hoy-30 .. hoy+30`) y PIN `1234` | API HU-04 + membresia | Happy paths de #1, #4, #5; regresion login 200 (`CLI-04`, `CLI-05`, `CLI-08`) |
| F2 | Cliente `INACTIVO` con motivo previo y historial de 1 cambio | directa en BD (o API con motivo, segun DEC-035) | `CLI-02`, `CLI-03`, `CLI-04`, `CLI-07`, `CLI-08` |
| F3 | Cliente `INACTIVO` con membresia `ACTIVA` | F2 + membresia | `CLI-07` (ingreso 403 con membresia paga) y `CLI-05` |
| F4 | Cliente con **2 cambios de estado previos** registrados | 2 llamadas a #1 con motivo | acumulacion 2 -> 3 (`EST-04`), `CLI-02` |
| F5 | Cliente `SUSPENDIDO` con membresia `ACTIVA` (ya usado en INC-03 F12) | directa en BD | rama DEC-030 **intacta** (regresion, no se re-cobra) |
| F6 | Cliente `RETIRADO` con membresia `ACTIVA` | directa en BD | matriz de transiciones (`EST-05`) + rama DEC-030 |
| F7 | Token de cliente emiten **antes** de inactivarlo (sesion abierta) | login previo + inactivacion | `CLI-06` (DEC-040: sesion expira sola, sin revocacion) |
| F8 | Staff: `DUENO` y `RECEPCIONISTA`; `CLIENTE` con PIN | seed existente | permisos de #1/#4/#5 y 403 `CLIENTE` |
| F9 | Cedulas invalidas / inexistente (`ABC`, `12345`, `99999999`) y PIN mal | - | 400/404/401 de #3 y #1 |
| F10 | Cliente `NUEVO` recien creado (0 cambios de historial) | API HU-04 | primera transicion `NUEVO -> X` y `estadoAnterior: "NUEVO"` |

Supuestos: cada test crea sus fixtures y limpia al terminar (la limpieza Gherkin debe
borrar `ClienteEstadoCambio` **antes** que `Cliente` por las FKs, precedente `world.ts`
de INC-03); sin dependencia entre archivos; fechas siempre relativas a hoy (Bogota).

## Evidencia requerida por criterio

| Criterio(s) | Integracion API (Vitest) | Unit/UI (Vitest web) | E2E (Playwright) | Gherkin (`features/*.feature`) |
|---|---|---|---|---|
| `CLI-01`, `EST-01` (REF) | no nuevas (evidencia HU-05/HU-06) | no | no | no |
| `CLI-02` | si (ficha + busqueda + count de historial + DELETE 404) | no | no | si |
| `CLI-03` | si (respuesta **y** BD transaccional; 3 mensajes de 400; 404; 403) | si (payload con motivo) | no | si |
| `CLI-04` | si (401 propio + orden credenciales/estado + 200 regresion) | si (mensaje en la pantalla de login) | **si** (login bloqueado en navegador) | si |
| `CLI-05` | si (409 sin fila creada + 201 regresion) | no | no | si |
| `CLI-06` | si (segun DEC-040: sin revocacion, sin test de bloqueo) | no (DEC-040: la sesion no cambia de UX) | no | si |
| `CLI-07` | si (403 `INACTIVO` + regresion DEC-030) | no | no | si |
| `CLI-08` | si (ambos roles 200, 403 CLIENTE, login vuelve 200, servicios vuelven 201) | no | no | si |
| `EST-02` | si (respuesta **y** BD) | no | no | si |
| `EST-03` | si (400 + estado sin cambio) | si (UI muestra el 400) | no | si |
| `EST-04` | si (3 registros ordenados + datos base intactos + DELETE 404) | no | no | si |
| `EST-05` | si (200 permitida, 409 invalida sin cambio, no-op 200) | no | no | si |
| `EST-06` | no | **si** (formulario + `cliente-payload`) | **si** (cambio de estado con motivo en navegador) | si |
| **Todos** | `npx tsc --noEmit` (0), `npx vitest run` (base **471/471** intacta), `npm run test:gherkin` (exit 0, base **126/126**) | `npx tsc --noEmit`, `npx vitest run` (base **174/174**), `npm run build` | `npx playwright test` (base **47/47**) | `npx prisma migrate status` (0 pendientes, sin drift) |
| **Revision** | `code-reviewer`: seguridad/permisos DEC-001, no duplicado (HU-05/HU-06/DEC-030), regresion de INC-03, pruebas sin aserciones vacias | | | |

Los `.feature` y `steps/` los crea `test-engineer` en el RED (el analista no los toca;
regla de INC-02/03). Guard existente: `npm run test:gherkin` falla con `exit 1` si el
alcance esta incompleto; el guard `INC00_SCENARIO_COUNT = 126` (`vitest.cucumber.config.ts`)
se actualizara en el GREEN con los escenarios nuevos.

### Checklist de puerta LISTO

- [x] Spec con objetivo, alcance incluido/excluido y fuera de alcance explicito (este archivo).
- [x] Criterios `INC04-CLI-01..08` e `INC04-EST-01..06` con trazabilidad bullet -> criterio ISTQB G14 (14/14).
- [x] Contrato API propuesto con endpoints, roles, errores, orden de evaluacion y modelo de datos.
- [x] Fixtures + supuestos de aislamiento (DEC-012/DEC-013).
- [x] Plantilla de evidencia (`evidencia.md`) y backlog (`tareas.md`).
- [x] Criterios ISTQB de HU-08/HU-17 existentes y referenciados (G14 cerrado 2026-10-08).
- [x] Fuera de alcance confirmado (INC-05, anamnesis/DEC-021, INC-03 cerrado, HU-05/HU-06 aceptados, UI de historial = HU-07/HU-32).
- [x] Regla de **no duplicado** definida en este spec (estado/filtro -> HU-05/HU-06; DEC-030 -> HU-30; vencimiento -> HU-16).
- [x] **`INC04-PEND-01..08` resueltas por Producto** y registradas en `docs/producto/decisiones.md` como **DEC-034..041** (verificado 2026-10-14 en `decisiones.md:42-49`).
- [x] Contrato **ratificado por `backend-developer`** (paths, bodies, mensajes exactos, orden, modelo) — hecho 2026-10-14 (ver secciones "Contrato API", "Orden de evaluacion", "Matriz de transiciones", incompatibilidades #1-#16).
- [x] `INC04-CONF-01..07` ratificadas por el orquestador en `decisiones.md`
  (seccion "Confirmaciones de INC-04 ratificadas por el orquestador (2026-10-14)" +
  regla de no-duplicado INC-04). Cerrada el **2026-10-19** al sincronizar este
  checklist con la evidencia ya registrada.
- [x] `HU-17-schemas.ts` **ya existe** y **ya esta enmendado** al contrato de este spec
  (commiteado en `721c511` + enmienda del 2026-10-14: matriz DEC-038,
  `fichaClienteResponseSchema`, orden CONF-03) — la incompatibilidad #1 era falsa.
  La enmienda de los `.md` (`HU-17-criterios-aceptacion.md` con la matriz final
  DEC-038, sin `BLOQUEADO (P-04)`, y `HU-08-criterios-aceptacion.md`) esta hecha
  desde 2026-10-14 y se commitea con este paquete (incompatibilidad #14).

**Puerta LISTO cumplida (sincronizacion 2026-10-19): 12/12 casillas cerradas con
evidencia en `decisiones.md:42-61`. El RED queda habilitado (tareas 14-16 de
`tareas.md`).**

## Plan de ejecucion por agente

| Paso | Agente | Entrega | Criterios | Depende de |
|---:|---|---|---|---|
| 1 | acceptance-criteria-analyst | `spec.md`, `tareas.md`, `evidencia.md` (este paquete) | todos | - (hecho 2026-10-14) |
| 2 | Orquestador + Producto | Resolver `INC04-PEND-01..08` -> `decisiones.md` — **hecho 2026-10-14 (`DEC-034..041`)** | `CLI-02/03/04/06/07`, `EST-02/03/04/05/06` | paso 1 |
| 3 | acceptance-criteria-analyst | `HU-17-schemas.ts` **ya existe y ya esta enmendado** (2026-10-14, paridad con este spec verificada): falta (i) enmendar `HU-17-criterios-aceptacion.md` (BLOQUEADO `P-04` -> matriz final) y `HU-08-criterios-aceptacion.md:75`, (ii) commitear la enmienda del `.ts` (incompatibilidad #14) | `EST-*` | paso 2 |
| 4 | backend-developer | Ratificar contrato (endpoints, bodies, errores, orden, mensajes, modelo) en este spec — **hecho 2026-10-14** | todos | paso 2 |
| 5 | Orquestador | Registrar `INC04-CONF-01..07` + no-duplicado; puerta **LISTO** | - | pasos 2-4 |
| 6 | test-engineer | **RED**: integracion API + unit web + escenarios Gherkin (sin tocar `src/`) | todos | paso 5 |
| 7 | database-admin | Migracion `ClienteEstadoCambio` (o columnas, segun `PEND-03`) + limpieza de FKs en fixtures/seed | `CLI-02/03`, `EST-02/04` | paso 5 |
| 8 | backend-developer | **GREEN** API: `clientes.ts`/`cliente.service.ts` (motivo+historial+transiciones), `auth.*` (`PEND-01`), `membresia.*` (guarda 409), `recepcion.ts` (`PEND-06`) | `CLI-*`, `EST-02..05` | pasos 6-7 |
| 9 | frontend-developer | **GREEN** UI: campo `motivo` en edicion de cliente, mensaje de cuenta inactiva en login, clasificacion de 401 | `EST-06`, `CLI-03/04` | paso 8 |
| 10 | test-engineer | **VERIFICADO**: E2E real, bateria completa (base intacta), registro en `evidencia.md` | todos | paso 9 |
| 11 | code-reviewer | **REVISADO**: seguridad/permisos, no duplicado, regresion INC-03, calidad de pruebas | todos | paso 10 |
| 12 | Orquestador | Certificacion: `avance.md`, `mvp.md`, `auditoria-puntos-inc00.md` (+2 solo si la revision no bloquea) | todos | paso 11 |

## Decisiones pendientes

Formuladas con el patron `INC03-PEND-*` (opciones concretas para Producto). Responsable
por defecto: **Producto** (confirmacion unica de las recomendaciones del orquestador,
igual que INC-03).

> **Resueltas 2026-10-14 → `DEC-034..041`** (`docs/producto/decisiones.md:42-49`), una
> por una en el orden `PEND-01 → DEC-034`, `PEND-02 → DEC-035`, `PEND-03 → DEC-036`,
> `PEND-04 → DEC-037`, `PEND-05 → DEC-038`, `PEND-06 → DEC-039`, `PEND-07 → DEC-040`,
> `PEND-08 → DEC-041`. La tabla queda como historial de la pregunta/opciones; las
> opciones aprobadas coinciden con la recomendacion de la columna 4. Ratificacion de
> backend citando estos PEND debe leerse como citando su DEC.

| ID | Pregunta concreta a Producto | Opciones | **Recomendacion del orquestador-analista** | Criterios afectados |
|---|---|---|---|---|
| `INC04-PEND-01` | ¿Un cliente `INACTIVO` puede autenticarse en el portal (`POST /auth/login-cliente`) con cedula y PIN correctos? | **(a)** No: 401 propio `AUTH_CLIENTE_INACTIVO` (sin token) despues de validar credenciales; **(b)** Si, pero el portal muestra un aviso de cuenta inactiva | **(a)**: es la lectura de HU-08 b4 ("no puede... acceder"); el G14 ya fija el contrato y el orden anti-enumeracion; la opcion (b) exigiria exponer `estado` en `GET /portal/resumen` (contrato nuevo de INC-03) y solo pone un aviso, no un bloqueo. **Impacto (a)**: `auth.service.ts:14-28` + `routes/auth.ts` + clasificacion web (`R11`) | `CLI-04`, `CLI-08` |
| `INC04-PEND-02` | ¿El `motivo` es **obligatorio en todo PATCH que traiga `estado`** (lectura literal de HU-17 b2), solo en cambios **criticos** (INACTIVO/SUSPENDIDO/RETIRADO), o es exigible solo en la **UI**? | **(a)** obligatorio en todo cambio de estado (literal); **(b)** solo en cambios criticos; **(c)** solo UI, la API no exige | **(a)**: cierra el bullet 2/2 de HU-17 sin ambiguedad (con (b), un `SUSPENDIDO -> ACTIVO` sin motivo no registraria nada y el bullet queda parcial; con (c) el bullet no es observable en API). **Impacto (a)**: actualizacion controlada de tests aceptados `cliente.schema.test.ts:152,252`, `clientes.test.ts:426,456,486,736`, `features.test.ts:339` + campo `motivo` en `cliente-payload.ts:41` y sus unit — se registra como cambio de contrato en `decisiones.md`, no como regresion | `CLI-03`, `EST-03`, `EST-06` |
| `INC04-PEND-03` | ¿Como se persiste el historial de cambios de estado? | **(a)** modelo nuevo `ClienteEstadoCambio` (auditoria completa: `estadoAnterior/estadoNuevo/motivo/actor/createdAt`, patron `MembresiaGymCambio`); **(b)** campos livianos en `Cliente` (`estadoMotivo` + `actualizadoPorId/At` ya existentes) | **(a)**: HU-17 b3 exige **historial** acumulable (3 registros ordenados) y HU-08 b2 "conserva su historial"; (b) no permite probar `EST-04` ni `EST-05`. Costo: 1 tabla + back-relations (migracion portable) | `CLI-02`, `CLI-03`, `EST-02`, `EST-04` |
| `INC04-PEND-04` | ¿Quien puede inactivar / suspender / retirar? | **(a)** solo `DUENO` (HU-08 dice "Como dueno"); **(b)** `DUENO` y `RECEPCIONISTA` (HU-17 dice "Como dueno o recepcionista") | **(b)** ambos: la ruta `PATCH /clientes/:id` ya permite ambos roles y el test **aceptado** `clientes.test.ts:435` (`INC00-CLI-02`, RECEPCIONISTA cambia estado) haria 403 con (a) — (a) **regresaria HU-05 aceptada**; ademas DEC-020 ya da ambos para reactivar (asimetria sin (b) seria incoherente) | `CLI-03`, `CLI-08`, `EST-02` |
| `INC04-PEND-05` | ¿Que transiciones estan permitidas? | **(a)** cualquier estado a cualquier estado (status quo, sin 409); **(b)** matriz: `RETIRADO` terminal, `NUEVO -> ACTIVO/SUSPENDIDO/RETIRADO/INACTIVO`, `ACTIVO <-> SUSPENDIDO`, `* -> RETIRADO/INACTIVO`, `INACTIVO -> ACTIVO`; transicion fuera -> 409 `TRANSICION_INVALIDA` | **(b)**: es la expectativa `G9` de la auditoria ("transiciones invalidas rechazadas") y la matriz propuesta por el G14 (`HU17-C04`); con (a) no existe "transicion invalida" que probar y hay que **excluir `EST-05` con cambio explicito de alcance** en `decisiones.md` (el bullet 1 de HU-17 se evaluaria con la parte restante) | `EST-05` |
| `INC04-PEND-06` | ¿Un cliente `INACTIVO` puede registrar **ingreso fisico** (`POST /recepcion/ingresos`) teniendo membresia activa? | **(a)** No: 403 `INGRESO_NO_PERMITIDO` (misma rama de estado que DEC-030, mensaje propio); **(b)** Si: el bloqueo es solo portal + servicios nuevos | **(a)**: es literal de HU-08 b4 ("no puede **ingresar**") y coherente con DEC-030 (un suspendido no entra; un inactivo menos). **Impacto (a)**: modifica un endpoint **aceptado** de INC-03 (`routes/recepcion.ts:227-232`) — se agrega una condicion al `if` existente y se mantienen verdes `INC03-ING-10` y sus Gherkin | `CLI-07` |
| `INC04-PEND-07` | ¿La sesion JWT ya emitida a un cliente que queda `INACTIVO` se revoca de inmediato o expira sola? | **(a)** revocacion inmediata (chequeo de estado en cada request del portal: `GET /portal/resumen` -> 403); **(b)** expira con el TTL de 24 h (DEC-009/DEC-010) | **(b)**: "servicios activos nuevos" de HU-08 b4 son **asignaciones**, no lecturas; la opcion (a) introduciria un chequeo de estado en el middleware/token y una superficie de error nueva en el portal ya aceptado. Con (b), `CLI-04` (bloqueo del login) ya cierra el "no puede acceder" operativo; el riesgo de 20 h de sesion propia y de solo-lectura es acotado | `CLI-06` |
| `INC04-PEND-08` | ¿El `motivo` (y `ultimoCambio`) se exponen en la ficha cuando la consulta es del **propio cliente** (`GET /clientes/:id` self-only, rol `CLIENTE`)? | **(a)** solo staff: para `CLIENTE` el campo va `null`/ausente; **(b)** visible tambien para el cliente | **(a)**: el motivo puede contener informacion interna ("falta de pago"), coherente con la politica de privacidad ya aplicada en INC-03 (`REC-10`, `SEC-03`, riesgo R-11); el cliente no necesita el motivo para nada del portal | `CLI-03`, `EST-02` |

### Confirmaciones no bloqueantes (opciones por defecto adoptadas en este spec; ratificables)

| ID | Tema | Opcion por defecto adoptada | Fuente |
|---|---|---|---|
| `INC04-CONF-01` | Estado destino de la reactivacion | La prueba envia `estado: "ACTIVO"` y aserta ese valor; el servidor no deriva estados (DEC-020 "reactivar") | `HU08-C05` (P-03 del G14) |
| `INC04-CONF-02` | Mismo estado (no-op) | 200 y **sin** registro nuevo de historial (la HU solo pide registrar "cuando el estado cambia") | `HU17-C04` |
| `INC04-CONF-03` | Orden de validacion de `PATCH` | 401/403 -> 400 params -> 400 body -> 404 -> 409 transicion -> 400 sede/409 duplicado -> 200 | seccion "Orden de evaluacion" |
| `INC04-CONF-04` | Limites y mensajes de `motivo` | 3..200 con los 3 mensajes exactos del G14 (`Motivo es requerido cuando cambia el estado`, `Motivo debe tener al menos 3 caracteres`, `Motivo no puede exceder 200 caracteres`) | `HU-08-schemas.ts:28-31` |
| `INC04-CONF-05` | Observabilidad del historial | `ultimoCambio` en la respuesta del PATCH + lectura directa en BD desde steps/integracion; **sin endpoint nuevo** de historial (UI de historial = HU-07/HU-32) | incompatibilidad #7 |
| `INC04-CONF-06` | Donde vive la guarda de servicios nuevos | En `membresia.service` (no solo en la ruta GYM) para que INC-05 herede la misma regla | `HU08-C04b` |
| `INC04-CONF-07` | `motivo` sin `estado` en el body | Se **ignora** (no se persiste, no se registra, sin error nuevo) | `HU08-C03` "que NO cubre" |

## Riesgos

| ID | Riesgo | Impacto | Mitigacion | Responsable |
|---|---|---|---|---|
| `INC04-R01` | `PEND-02` opcion (a) cambia un contrato **ya aceptado** (4+ tests de HU-05/HU-03-Gherkin y la UI) | Aceptaciones previas podrian leerse como regresion | Actualizacion **controlada y documentada**: registrar el cambio de contrato en `decisiones.md` junto al PEND; RED primero; ningun test aceptado se borra, se actualiza con motivo | Producto + Orquestador + QA |
| `INC04-R02` | Bloquear el login (`PEND-01`) podria romper HU-02 (aceptada 4/4) o el E2E de portal | Regresion de 4 puntos ya certificados | Orden credenciales -> estado; suite completa antes/despues; escenario de regresion "cliente ACTIVO -> 200" explicito en el RED | Backend + QA |
| `INC04-R03` | Duplico de puntos: estado/filtro (HU-05/06) y DEC-030 (HU-30) ya cobrados | Contar dos veces el mismo efecto | Regla de no-duplicado en este spec; criterios `CLI-01`/`EST-01` marcados REF; `CLI-07` solo rama `INACTIVO` | Orquestador |
| `INC04-R04` | `PEND-04` opcion (a) (solo DUENO) regresaria `INC00-CLI-02` aceptado | Pierde 3 puntos de HU-05 | Recomendacion (b); si Producto elige (a), hay que enmendar HU-05 explicitamente | Producto |
| `INC04-R05` | `PEND-06` y `PEND-01` tocan endpoints **aceptados** de INC-03 (ingreso, auth) | Regresion de la base 471/471, 126/126, 47/47 | Guards incondicionales en RED; rama `SUSPENDIDO`/`RETIRADO` intacta; bateria completa antes/despues del GREEN | Backend + QA |
| `INC04-R06` | Guard Gherkin: `INC00_SCENARIO_COUNT = 126` debe subir con los escenarios nuevos | `test:gherkin` fallaria en el cierre | Actualizar el guard en el GREEN (precedente GAP-RED-03 de INC-03) | test-engineer |
| `INC04-R07` | (re-scoped dos veces en la ratificacion 2026-10-14) `HU-17-schemas.ts` **si existe** y su matriz ya parifica con este spec, pero la enmienda esta **sin commitear** y `HU-17-criterios-aceptacion.md` sigue `BLOQUEADO (P-04)` con la matriz vieja | RED/Gherkin asertarian contra un `.md` vencido o perderian la enmienda al hacer checkout | Paso 3 del plan antes del RED: enmendar el `.md` y commitear el `.ts` (incompatibilidad #14); el RED aserta paridad spec == `transicionesAprobadas` | acceptance-criteria-analyst |
| `INC04-R08` | Si la guarda de servicios nuevos vive solo en la ruta GYM, INC-05 la olvida | HU-13/HU-14 crearian servicios a clientes inactivos | `CONF-06`: guarda en el servicio | Backend |
| `INC04-R09` | Migracion nueva SQLite (dev/PR) vs PostgreSQL (prod) | Diferencias entre entornos (R-01/R-02 heredados) | Migracion portable `CREATE TABLE`; sin constraints sin probar en Postgres | DBA + DevOps |
| `INC04-R10` | Flaky base sin cerrar: **R-09** (1 fallo web sin capturar) | Bateria inestable al cerrar | `--reporter=json` si aparece; guard de `toHaveCount` ya aplicado en `clientes.spec.ts` | test-engineer |
| `INC04-R11` | 401 `AUTH_CLIENTE_INACTIVO` caeria en el `status === 401 -> session_expired` de `club-beasts-web/src/lib/api.ts:199-200` y dispararia `recoverSession` (`:268`) | UX rota en el login (recuperacion de una sesion inexistente) | Clasificar el `code` explicitamente en `classifyError` antes del 401 generico (mismo criterio que INC-03 con `VIGENCIA_VENCIDA`) | frontend-developer |
| `INC04-R12` | Alcance parcial: si un PEND cierra con la opcion que excluye un criterio, la HU queda sin 4/4 o 3/3 | El punto (+2) no se certifica | El spec no declara puntos; el orquestador certifica solo con la fraccion real y cambio de alcance explicito registrado | Orquestador |

## Trazabilidad de decisiones aprobadas aplicadas

| Decision | Aplicacion en INC-04 |
|---|---|
| DEC-001 (roles) | Permisos de #1, #4, #5; 403 `CLIENTE`; staff = `DUENO`/`RECEPCIONISTA` |
| DEC-002 (cedula) | Identificador del login y de las busquedas de fixtures |
| DEC-005 / DEC-006 (Bogota, inclusivos) | Fechas de fixtures y `createdAt` del historial |
| DEC-009 / DEC-010 (TTL 24 h) | Base de la opcion (b) de `PEND-07` |
| DEC-011 / DEC-016 (evidencia y fraccion) | Este spec no declara puntos; `evidencia.md` exige ejecucion por criterio |
| DEC-012 / DEC-013 (aislamiento, fechas relativas) | Fixtures F1..F10 |
| DEC-020 (reactivacion por ambos roles) | `CLI-08` + insumo de `PEND-04` |
| DEC-026 (login intacto por **vencimiento**) | No choca con `PEND-01`: aqui el bloqueo es por **estado** (HU-08 b4), y solo el vencimiento queda fuera |
| DEC-030 (403 a SUSPENDIDO/RETIRADO) | Rama **intacta** en #5; `CLI-07` agrega solo `INACTIVO` (DEC-039) |
| PEND-003 / DEC-021 | Anamnesis fuera de alcance |
