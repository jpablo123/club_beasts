# INC-03 - Vencimiento, recepcion y portal con estado real (HU-16 + bloque 4)

## Estado

Estado actual: **LISTO** (2026-10-10). Puerta de entrada completa:

- `INC03-PEND-01..08` resueltas por el Producto el 2026-10-10 y registradas como
  **DEC-026..DEC-033** en `docs/producto/decisiones.md`.
- Contrato ratificado por `backend-developer` el 2026-10-10 (ver seccion "Estado" historica
  abajo y "Contrato API propuesto").
- `CONF-01..06` ratificadas y regla de no-duplicado HU-16 vs bloque 4 asignada por el
  orquestador (secciones correspondientes de `decisiones.md`).

Las 40 celdas de criterios quedan **OK** (ninguna bloqueada). Las celdas del contrato que
decian `Pendiente (PEND-xx)` se rellenan con la decision aprobada; el detalle de cada rama
esta en DEC-026..033.

Decisiones resumidas que gobiernan la implementacion:

- **DEC-026 (`PEND-01` = B)**: login **no cambia** (identidad/PIN, HU-02 intacta). La
  denegacion por vencimiento vive en el **portal** (muestra `VENCIDA` sin acceso) y en
  **recepcion** (`403 INGRESO_NO_PERMITIDO` al ingresar). El codigo `VIGENCIA_VENCIDA` (403)
  queda disponible para la respuesta del portal si la UI lo necesita; **#7 no se modifica**.
- **DEC-027 (`PEND-02` = a)**: cliente con GYM `VENCIDA` + NUTRICION `ACTIVA` usa su
  servicio vigente; el portal de INC-03 expone **solo GYM** (regla de seleccion ratificada),
  sin bloquear por otros servicios.
- **DEC-028 (`PEND-03` = a)**: `alertas` se derivan del estado (`ESTADO_CLIENTE` si
  `estado != ACTIVO`; `MEMBRESIA_VENCIDA` si `estadoAccesoGym = VENCIDA`); sin modelo nuevo.
- **DEC-029 (`PEND-04` = b)**: **no** existe `Cliente.foto`; `foto` viaja siempre `null`.
- **DEC-030 (`PEND-05` = b)**: `SUSPENDIDO`/`RETIRADO` con membresia `ACTIVA` ->
  `403 INGRESO_NO_PERMITIDO` (paso de orden entre 403-vigencia y 201).
- **DEC-031 (`PEND-06` = b)**: en #5, `sedeId` **opcional**; si se omite se usa la sede del
  recepcionista derivada del token; minimo de 4 campos; la sede efectiva se expone en la
  respuesta.
- **DEC-032 (`PEND-07` = a)**: campo `Cliente.perfilPendiente Boolean @default(false)`.
- **DEC-033 (`PEND-08` = b)**: `perfilPendiente` se limpia cuando el cliente tiene `email`.

## Objetivo

Cerrar la HU-16 (gap **G7**: el vencimiento debe afectar recepcion, portal y acceso, no solo
calcular una etiqueta) y el **bloque 4 completo** (HU-25 portal con estado real, HU-29 consulta
por cedula en recepcion, HU-30 ingreso por sede, HU-31 creacion rapida), siguiendo la ruta
fijada en `docs/producto/avance.md:127` (+11 puntos: HU-16 = 1 + bloque 4 = 10).

Nota de alcance de `docs/producto/mvp.md:58` (mandatoria para el cierre): *"HU-16 requiere que
el vencimiento afecte la recepcion, el portal y el acceso al servicio; no basta con calcular
una etiqueta visual."*

## Alcance incluido

- **Deteccion y exposicion del vencimiento** en las tres superficies exigidas por
  `mvp.md:58`: ficha (existe, se verifica), portal (hoy hardcodeado) y recepcion (no existe),
  con una **unica fuente de calculo** (`calcularEstado`) consumida por todas.
- **Acceso denegado al servicio vencido** (`HU16-C04`) segun la decision de Producto
  `INC03-PEND-01`/`PEND-02`.
- **Portal del cliente con datos reales**: nombre, cedula, sede, estado de acceso, fecha de
  vencimiento y rango de congelacion (este ultimo ya habilitado por INC-02).
- **Recepcion**: consulta por cedula (identidad, estado, vencimiento, congelacion, ultimo
  ingreso, alertas) y pantalla que lo pinta.
- **Registro de ingreso** con entidad nueva `Ingreso` (fecha, hora, sede, usuario), multiples
  ingresos por dia, historial visible y guardas de membresia habilitada.
- **Creacion rapida de cliente** desde recepcion con marca de perfil a completar y
  completitud posterior por `PATCH /clientes/:id`.
- **Modelo de datos**: entidad `Ingreso`; campos `Cliente.perfilPendiente` y `Cliente.foto`
  (estos dos ultimos sujetos a `INC03-PEND-07` y `INC03-PEND-04`).
- Pruebas TDD/ATDD (RED/GREEN), Gherkin, E2E y evidencia reproducible.

## Fuera de alcance

- **Anamnesis** (HU-09/10/11/28) y **PEND-003** (campos de anamnesis): no pertenece a este
  incremento; se resuelve en el incremento de bloque 5 (DEC-021).
- **Rutinas** (HU-18..21, HU-26), **nutricion** (HU-22..24, HU-27), **reportes/historial/
  notificaciones** (HU-32/33/34, HU-34 notificacion de vencimiento por correo).
- **Congelacion**: cerrada en `INC-02-congelacion-hu-15` (ACEPTADO 2026-10-08, DEC-022..025).
  INC-03 solo **lee** el estado `CONGELADO` y el rango; no crea, edita ni borra pausas, y no
  implementa ningun bloqueo por congelacion (**DEC-025**: durante la pausa el acceso se
  conserva).
- **HU-08/HU-17** (estados generales del cliente, INC-04) y **HU-13/HU-14** (INC-05). El
  criterio bloqueado `INC03-ING-10` solo pregunta que pasa en el ingreso con esos estados.
- **Bloqueo por `INACTIVO`** (HU-08/INC-04), no por vencimiento.
- Constraint de solapamiento en Postgres (R-01/G13), ESLint/hooks (R-06), flaky base R-10/R-09:
  backlog global, no se incluyen aqui.

## Criterios de aceptacion

IDs estables `INC03-XXX-nn` (VEN = vencimiento/HU-16, POR = portal/HU-25, REC = recepcion
consulta/HU-29, ING = ingreso/HU-30, RAP = creacion rapida/HU-31). El criterio ISTQB de
origen es el del archivo `HU-XX-criterios-aceptacion.md` (ya escrito; aqui solo se traza).
Estado: `OK` = observable y comprobable hoy con el spec; `BLOQUEADO` = depende de una
decision de Producto pendiente.

| ID | HU (bullet) | Criterio origen | Que se observa y comprueba | Estado |
|---|---|---|---|---|
| `INC03-VEN-01` | HU-16 b1 | `HU16-C01` | Deteccion en cada lectura: `hoy == fechaFin` -> vigente; `hoy == fechaFin+1` -> vencida; sigue la `fechaFin` extendida por congelacion, sin flag persistido | OK (confirmacion `CONF-01`: deteccion derivada sin job) |
| `INC03-VEN-02` | HU-16 b2 | `HU16-C02` | El estado expuesto pasa a `VENCIDA` en API y UI, y vuelve a `ACTIVA`/`PROGRAMADA` al postergar `fechaFin` | OK |
| `INC03-VEN-03` | HU-16 b3 (+ nota `mvp.md:58`) | `HU16-C03` | `VENCIDA` visible en las **3 superficies**: ficha (badge ya existe), **portal** (fin del hardcode `"Activo"` de `portal/page.tsx:122`) y **recepcion** (HU-29) | OK |
| `INC03-VEN-04` | HU-16 b4 | `HU16-C04` | El acceso al servicio vencido queda denegado de forma observable y probada, con codigo propio distinto de credenciales invalidas | OK (DEC-026: portal sin acceso + ingreso 403; login intacto) |
| `INC03-VEN-05` | HU-16 b3 (transversal) | `HU16-C01`/`HU16-C03` ("unica fuente") | Ficha, listado, portal y recepcion devuelven **el mismo** estado calculado por la misma regla (cierra la divergencia `cliente.service.ts:144-149` que no pasa pausas a `calcularEstado`) | OK |
| `INC03-POR-01` | HU-25 b1 | `HU25-C01` | `GET /portal/resumen` 200 con nombre completo, cedula y sede principal desde la BD | OK |
| `INC03-POR-02` | HU-25 b2 | `HU25-C02` | `estadoAccesoGym` calculado por backend (enum), sin texto fijo en la UI | OK |
| `INC03-POR-03` | HU-25 b3 | `HU25-C03` | `fechaVencimiento = fechaFin` (`YYYY-MM-DD`), dia final inclusivo | OK |
| `INC03-POR-04` | HU-25 b4 | `HU25-C04` | Si hay congelacion vigente, el portal muestra el rango `{fechaInicio, fechaFin}`; si no, `null` | OK (habilitado por INC-02) |
| `INC03-POR-05` | HU-25 transversal | `HU25-C05` | Autorizacion DEC-001: sin token 401, staff 403, `CLIENTE` 200 solo con sus propios datos | OK |
| `INC03-POR-06` | HU-25 transversal | `HU25-C06` | Cliente sin membresia -> `SIN_VIGENCIA` + `fechaVencimiento: null`; la UI **nunca** muestra "Activo" | OK |
| `INC03-POR-07` | HU-25 transversal | `HU25-C07` | Tres consultas con `hoy = fechaInicio-1`, `fechaFin`, `fechaFin+1` -> `PROGRAMADA`, `ACTIVA`, `VENCIDA` (DEC-005/006) | OK |
| `INC03-REC-01` | HU-29 b1 | `HU29-C01` | Consulta 200 con nombre completo, cedula, sede y `foto: string \| null` | OK (DEC-029: campo `foto` inexistente; `foto` siempre `null`, acreditado como opcional ausente) |
| `INC03-REC-02` | HU-29 b2 | `HU29-C02` | `estadoAccesoGym` real en recepcion (enum del backend) | OK |
| `INC03-REC-03` | HU-29 b3 | `HU29-C03` | `fechaVencimiento` y `congelacion` (o `null`) en la respuesta | OK |
| `INC03-REC-04` | HU-29 b4 | `HU29-C04` | `ultimoIngreso = {fecha, hora, sede}` del mas reciente, o `null` si nunca ingreso (requiere `Ingreso` de HU-30 en el mismo incremento: orden HU-30 -> HU-29) | OK (orden fijado) |
| `INC03-REC-05` | HU-29 b5 | `HU29-C05` | `alertas: [{codigo, mensaje}]` no sensibles, o `[]` | OK (DEC-028: derivadas de estado; codigos `ESTADO_CLIENTE`/`MEMBRESIA_VENCIDA`) |
| `INC03-REC-06` | HU-29 transversal | `HU29-C06` | `?cedula=ABC` / `12345` / `12345678901` / vacia -> 400 `VALIDATION_ERROR` `Cédula debe ser numérica de 6 a 10 dígitos` (mensaje exacto de `common.schema.ts:6`; ratificado para el caso vacio en #2/#4) | OK |
| `INC03-REC-07` | HU-29 transversal | `HU29-C07` | Cedula bien formada inexistente -> 404 `NOT_FOUND` | OK |
| `INC03-REC-08` | HU-29 transversal | `HU29-C08` | Permisos DEC-001: 401 sin token, 403 `CLIENTE`, 200/404 staff | OK |
| `INC03-REC-09` | HU-29 transversal | `HU29-C09` | Unicidad DEC-002: exactamente un objeto cliente en la respuesta (nunca array) | OK |
| `INC03-REC-10` | HU-29 transversal | `HU29-C10` | La respuesta no contiene `pin`, hash, email, telefono, anamnesis ni notas de salud | OK |
| `INC03-ING-01` | HU-30 transversal | `HU30-C01` | `POST /recepcion/ingresos` 201 con ingreso persistido | OK |
| `INC03-ING-02` | HU-30 b1 | `HU30-C02` | 2do y 3er ingreso del mismo dia -> 201 cada uno, fila nueva, sin 409 ni dedupe | OK (`CONF-03`: tambien entre sedes) |
| `INC03-ING-03` | HU-30 b2 | `HU30-C03` | Fila con `fecha`, `hora` (America/Bogota), `sedeId` y `registradoPorId` = `request.user.id` | OK (formato de hora: decision tecnica adoptada, `CONF-06`) |
| `INC03-ING-04` | HU-30 b3 | `HU30-C04` + `HU30-C11` | `ACTIVA`/`CONGELADO` -> 201; `VENCIDA`/`PROGRAMADA`/sin vigencia -> 403 `INGRESO_NO_PERMITIDO`; bordes `fechaFin` 201 y `fechaFin+1` 403 | OK (rama `CONGELADO` = 201 por **DEC-025**, `CONF-02`; la rama `VENCIDA` se prueba aqui pero el punto del efecto lo acredita `INC03-VEN-04`) |
| `INC03-ING-05` | HU-30 b4 | `HU30-C05` | `GET /recepcion/ingresos` 200 con lista ordenada desc, `total`, y `[]/0` sin ingresos | OK |
| `INC03-ING-06` | HU-30 transversal | `HU30-C06` | Cedula inexistente -> 404 sin crear fila | OK |
| `INC03-ING-07` | HU-30 transversal | `HU30-C07` | Cedula invalida -> 400 `VALIDATION_ERROR`, sin escritura | OK |
| `INC03-ING-08` | HU-30 transversal | `HU30-C08` | `sedeId` ausente/vacio/mal formado -> 400; inexistente -> 400 "La sede indicada no existe..." | OK |
| `INC03-ING-09` | HU-30 transversal | `HU30-C09` | Permisos DEC-001: 401 / 403 `CLIENTE` / staff 201 | OK |
| `INC03-ING-10` | HU-30 transversal | `HU30-C10` | Cliente `SUSPENDIDO`/`RETIRADO` con membresia `ACTIVA` intenta ingresar | OK (DEC-030: `403 INGRESO_NO_PERMITIDO`) |
| `INC03-ING-11` | HU-30 transversal | `HU30-C11` | Extremos inclusivos al decidir el ingreso (DEC-005/006) | OK |
| `INC03-RAP-01` | HU-31 b1 | `HU31-C01` | `POST /recepcion/clientes-rapidos` 201 con el minimo de datos | OK (DEC-031: minimo 4 campos; `sedeId` opcional con default del token) |
| `INC03-RAP-02` | HU-31 b2 | `HU31-C02` | `perfilPendiente = true` **persistido** (visible en lectura posterior, no solo en el 201) | OK (DEC-032: campo `perfilPendiente`) |
| `INC03-RAP-03` | HU-31 b3 | `HU31-C03` | `DUENO` completa el perfil con `PATCH /clientes/:id` y los campos quedan persistidos | OK (DEC-033: la marca se limpia al tener `email`) |
| `INC03-RAP-04` | HU-31 transversal | `HU31-C04` | Mismas validaciones de HU-04 sobre la **nueva** superficie: 400 por cedula/telefono/nombres/campos, 400 sede, sin escritura | OK |
| `INC03-RAP-05` | HU-31 transversal | `HU31-C05` | Permisos DEC-001: 401 / 403 `CLIENTE` / staff 201 | OK |
| `INC03-RAP-06` | HU-31 transversal | `HU31-C06` | `estado = "NUEVO"` y `creadoPorId` = actor; respuesta con `creadoPor.{id,nombre}` | OK |
| `INC03-RAP-07` | HU-31 transversal | `HU31-C07` | Cedula duplicada -> 409 `DUPLICATE`, sin segunda fila | OK |

> **Conteo**: 40 criterios; **7 bloqueados** (`VEN-04`, `REC-01`, `REC-05`, `ING-10`,
> `RAP-01`, `RAP-02`, `RAP-03`), 33 listos. Ningun bullet de HU-16/25/29/30/31 queda sin
> criterio asignado (trazabilidad completa bullet -> criterio -> criterio ISTQB de origen).
> El spec **no declara puntos**: DEC-016 + revision posterior son los que certifican.

### Regla de no duplicado (auditoria `auditoria-puntos-inc00.md:197`, regla 3)

- El efecto "vencido = sin acceso / recepcion lo detecta" se acredita **una sola vez en
  HU-16** (`INC03-VEN-03`, `INC03-VEN-04`), nunca en HU-25/HU-29/HU-30: estos ultimos solo
  acreditan su contrato y su pintado.
- La rama `VENCIDA -> 403` de `INC03-ING-04` se **especifica y prueba** en HU-30, pero el
  punto del efecto es de HU-16. **Asignado por el orquestador (2026-10-10, `decisiones.md`)**:
  el punto va a **HU-16** (bloque 3), no al bloque 4.
- El estado en **ficha** ya esta acreditado (INC01-FIC-02 / HU-12 / HU-07): `INC03-VEN-03`
  solo exige verificarlo, no vuelve a puntuarlo.
- Peso: HU-16 = **1 punto** (`auditoria:117`); bloque 4 = **10 puntos** sin ponderar por HU
  (`auditoria:120-127`): el reparto por fraccion dentro del bloque 4 lo fija el orquestador al
  cierre. Ruta total de INC-03: **+11** (`avance.md:127`).

## Contrato API propuesto

> **Contrato que backend y frontend deben poder consumir en paralelo una vez abierta la puerta
> LISTO.**
> Convenciones del proyecto verificadas: **sin prefijo `/api`** en el backend
> (`club-beasts-api/src/index.ts:23-25`; el prefijo `/api` solo aplica a rutas Next.js),
> cuerpo de error `{ error: string, code: string }` (`src/lib/errors.ts`), fechas en
> `America/Bogota` (DEC-005) con extremos inclusivos (DEC-006), roles DEC-001
> (`DUENO`/`RECEPCIONISTA` = staff; `CLIENTE` = portal). Los schemas Zod de respuesta
> **son los G14**: `HU-16-schemas.ts`, `HU-25-schemas.ts`, `HU-29-schemas.ts`,
> `HU-30-schemas.ts`, `HU-31-schemas.ts` (`club-beasts-api/features/acceptance-criteria/`).
> **Ratificado**: `src/` **no puede importarlos** (`tsconfig.json` de la API tiene
> `rootDir: "./src"` + `include: ["src/**/*"]`, y `exclude: ["tests"]`); por eso en
> `src/schemas/` se declaran schemas **equivalentes** (`portal.schema.ts`,
> `recepcion.schema.ts`) y los **tests** importan los archivos G14 directamente (precedente ya
> usado: `tests/integration/membresia-congelacion.test.ts:44` importa `HU-15-schemas`). La
> autoridad ante cualquier duda son los G14 + los criterios, no el spec.

### Endpoints

| # | Metodo | Path | Roles permitidos | Exito | Schema (respuesta) | Criterios | Contrato |
|---|---|---|---|---|---|---|---|
| 1 | `GET` | `/portal/resumen` | `CLIENTE` | 200 | `portalResumenResponseSchema` (`HU-25-schemas.ts`) | `POR-01..07` | **Fijado** |
| 2 | `GET` | `/recepcion/consulta?cedula=<cedula>` | `DUENO`, `RECEPCIONISTA` | 200 | `consultaRecepcionResponseSchema` (`HU-29-schemas.ts`) | `REC-01..10` | **Fijado**; `alertas` derivadas de estado (DEC-028); `foto` siempre `null` (DEC-029) |
| 3 | `POST` | `/recepcion/ingresos` | `DUENO`, `RECEPCIONISTA` | 201 | `ingresoResponseSchema` (`HU-30-schemas.ts`) | `ING-01..04`, `ING-06..09`, `ING-11` | **Fijado**; rama estado general: `SUSPENDIDO`/`RETIRADO` -> 403 (DEC-030) |
| 4 | `GET` | `/recepcion/ingresos?cedula=<cedula>[&fecha=YYYY-MM-DD]` | `DUENO`, `RECEPCIONISTA` | 200 | `ingresosListResponseSchema` | `ING-05` | **Fijado** |
| 5 | `POST` | `/recepcion/clientes-rapidos` | `DUENO`, `RECEPCIONISTA` | 201 | `clienteRapidoResponseSchema` (`HU-31-schemas.ts`) | `RAP-01,02,04..07` | **Fijado**; `sedeId` opcional con default del token (DEC-031); marca `perfilPendiente` de campo nuevo (DEC-032) |
| 6 | `PATCH` | `/clientes/:id` (ruta existente HU-05, `src/routes/clientes.ts:171`; **correccion del borrador**: el parametro real es `:id`, `clienteParamsSchema` de `HU-31-schemas.ts`) | `DUENO`, `RECEPCIONISTA` (precedente HU-05 aceptado) | 200 | DTO de cliente | `RAP-03` | **Fijado**; la marca se limpia al tener `email` (DEC-033) |
| 7 | `POST` | `/auth/login-cliente` | `CLIENTE` (previo a sesion) | 200 | sesion existente | `VEN-04` | **Sin modificacion** (DEC-026: el login es identidad/PIN; la denegacion por vencimiento vive en portal y recepcion) |
| 8 | `GET` | `/clientes/:clienteId/membresias-gym` y `/clientes/:id` (lecturas existentes) | segun existente hoy | 200 | DTO existente (`estado` calculado) | `VEN-01,02,05` | **Fijado** (correccion: misma fuente con pausas) |
| 9 | UI | `/portal` (`club-beasts-web/src/app/portal/page.tsx`) | sesion `CLIENTE` | render | consume #1 | `VEN-03`, `POR-01..07` | **Fijado** (eliminar `page.tsx:122` hardcodeado) |
| 10 | UI | pantalla de recepcion (nueva: consulta + ingreso + alta rapida) | sesion staff (middleware) | render | consume #2, #3, #5 | `VEN-03`, `REC-*`, `ING-*`, `RAP-*` | **Fijado** (paginas nuevas en `club-beasts-web/src/app/recepcion/`) |

- **Sin job ni cron**: el vencimiento se **deriva en cada lectura** (mismo modelo que
  `calcularEstado`); lo exigible es que las tres superficies consuman esa unica fuente
  (`CONF-01`, **ratificada 2026-10-10**).
- La ficha/administracion no cambia de contrato: solo se corrige la fuente de calculo
  (`cliente.service.ts:144-149` debe pasar los rangos de pausa como si hace
  `membresia.service.ts:251`) para que ficha, listado, portal y recepcion no contradigan.

### Fuente unica de estado (ratificado; cierra `INC03-VEN-05` e `INC03-R09`)

- `pausasActivas` (`membresia.service.ts:169`) y `pausaVigente` (`membresia.service.ts:142`)
  se **exportan** (hoy son privadas del modulo) desde `membresia.service.ts`.
- Se agrega **un unico** helper `resolverEstadoAcceso(membresiaGym | null, cambios, hoy)` ->
  `{ estadoAccesoGym, fechaVencimiento, congelacion }` consumido por **#1 portal, #2 consulta,
  #3 ingreso y la ficha corregida** (`getClienteById`), de modo que no existan dos calculos:
  - `estadoAccesoGym = calcularEstado(fechaInicio, fechaFin, hoy, pausasActivas(cambios))`
    con la precedencia `CONGELADO` ya aceptada en INC-02 (`membresia.service.ts:18-40`).
  - **`SIN_VIGENCIA`** cuando el cliente no tiene **ninguna** fila `MembresiaGym`
    (`HU25-C06`); `fechaVencimiento = null` en ese caso.
  - **`fechaVencimiento = fechaFin`** (`YYYY-MM-DD`) de la vigencia seleccionada (dia final
    inclusivo, DEC-006; `HU25-C03`).
  - **`congelacion`** = rango de `pausaVigente` de esa misma vigencia **solo si
    `hoy` esta dentro del rango** (es decir, solo si `estadoAccesoGym === "CONGELADO"`);
    en cualquier otro caso `null`. Ratificado asi por la redaccion de HU-25 b4 ("**si el
    cliente esta congelado**...") y por el escenario `HU-25` Gherkin (CONGELADO + rango);
    una pausa futura o ya expirada (sin fila `DESCONGELACION`) **no** se expone. Si
    Producto quiere mostrar pausas futuras, es una ampliacion de contrato, no un criterio
    actual.
- **Seleccion determinista de la vigencia que alimenta #1/#2/#3** (regla nueva, antes
  ambigua): solo se consideran filas con `tipoServicio = "GYM"` (DEC-004; el portal y la
  recepcion **no** exponen `PERSONALIZADO`/`NUTRICION` en INC-03) y se toma **una** vigencia
  por `orderBy: [{ fechaFin: "desc" }, { fechaInicio: "desc" }, { id: "desc" }]` (la de
  vencimiento mas lejano; con periodos secuenciales de DEC-007 eso selecciona el periodo
  vigente/futuro, no el histórico). **DEC-027 (2026-10-10) confirma esta regla**: el portal
  de INC-03 expone solo GYM; un GYM vencido no bloquea otros servicios (el cliente accede a
  su NUTRICION vigente; INC-05 podra ampliar la exposicion multi-servicio).
- La guarda de **#3** evalua **solo la vigencia GYM** seleccionada (lectura literal de
  `HU-30-C04`, que habla de "vigencia gym"); con DEC-027 queda **fijada** como "solo GYM",
  no "al menos un servicio vigente".

### Regla de seleccion del mensaje de validacion (ratificada)

Convencion del proyecto: un `code` = **un** status HTTP; el mensaje puede variar por condicion
usando claves internas con sufijo (precedente INC-02, `src/routes/membresia.ts:52-56`).

- **#2, #4 (query) y #3 (body)**: `errors[0].message` de Zod (patron de `src/routes/auth.ts:39`
  y `src/routes/clientes.ts:81`), **con una excepcion ratificada**: si el campo `cedula`
  viola la regex (incluido `""`), se responde exactamente
  `Cédula debe ser numérica de 6 a 10 dígitos` (selecciona el issue `invalid_string`). Se
  hace porque `HU29-C06`/`HU30-C07` exigen ese mensaje para `?cedula=` vacio, mientras HU-02
  (aceptada) exige `Cédula es requerida` para `""` **solo en login** (`#7` conserva
  `errors[0]`: `""` -> `Cédula es requerida`, sin regex -> mensaje de formato). Si `cedula`
  falta del todo en #2/#4 -> `required_error` -> 400 `Cédula es requerida`.
- **#5 (body) y #6 (body)**: `errors.join(", ")` (patron exacto de `POST /clientes`,
  `src/routes/clientes.ts:142-143`, y de `PATCH /clientes/:id`, `:185-186`). Con eso,
  `cedula: ""` en #5 **contiene** el mensaje numerico (Zod emite ambos issues), lo que
  satisface `HU31-C04` sin contradecir a HU-04.
- `sedeId` ausente/vacio/>36 -> `sedeId es requerido` / `sedeId excede longitud máxima`
  (`sedeIdSchema` de `HU-30-schemas.ts`/`HU-31-schemas.ts`); **inexistente** -> mensaje
  proprio (ver tabla de errores).

### Detalle ratificado por endpoint

- **#1 `GET /portal/resumen`**: `preHandler: [fastify.authenticateRoles(["CLIENTE"])]`; sin
  parametros; identidad de `request.user.id` (el cliente del token). Lee
  `selectCliente` + la vigencia GYM seleccionada + `cambios` (para las pausas). Si el cliente
  del token ya no existe en BD -> 404 `NOT_FOUND` (`Cliente no encontrado`); el token no
  caduca la existencia del registro. Salida 200 = `portalResumenResponseSchema`.
- **#2 `GET /recepcion/consulta`**: `authenticateRoles(["DUENO","RECEPCIONISTA"])`;
  `nombreCompleto = nombres + " " + apellidos`; `sede = cliente.sede` (`{id, nombre}`);
  `ultimoIngreso` = fila `Ingreso` **mas reciente del cliente** por
  `orderBy: [{fecha: "desc"}, {hora: "desc"}]` (strings ceros a la izquierda ordenan
  lexicograficamente), o `null`; `alertas` **derivadas del estado** (DEC-028):
  `[{codigo: "ESTADO_CLIENTE", mensaje}]` si `cliente.estado != "ACTIVO"` y
  `[{codigo: "MEMBRESIA_VENCIDA", mensaje}]` si `estadoAccesoGym == "VENCIDA"` (pueden
  coexistir en ese orden; `[]` si ninguna aplica; mensajes no sensibles: sin anamnesis,
  notas de salud, email, telefono ni PIN). Mensajes exactos (deterministas para las pruebas):
  `ESTADO_CLIENTE` -> `El cliente tiene estado ${cliente.estado}` (p. ej. `... SUSPENDIDO`);
  `MEMBRESIA_VENCIDA` -> `La membresía venció el ${fechaVencimiento}` (`YYYY-MM-DD`).
  `foto` **siempre `null`** (DEC-029, campo inexistente); `fechaActual = getTodayBogota()`.
- **#3 `POST /recepcion/ingresos`**: body **solo** `{ cedula, sedeId }` (el cliente no envia
  `fecha` ni `hora`: las calcula el servidor). `fecha = getTodayBogota()`,
  `hora = getHoraBogota()` (nuevo helper exportado junto a `getTodayBogota()` en
  `membresia.service.ts`, `HH:mm:ss` America/Bogota con `padStart(2,"0")`;
  `CONF-06`/`HU30-C03`). `registradoPorId = request.user.id`. Respuesta 201 =
  `ingresoResponseSchema` (**incluye `cedula`, `sede {id,nombre}` y
  `registradoPor {id,nombre}`**, no solo ids) y `createdAt` ISO 8601. No hay dedupe: 2do y 3er
  ingreso del dia (y de otra sede) son 201 (`CONF-03`).
- **#4 `GET /recepcion/ingresos`**: query `{ cedula, fecha? }`; **404 si la cedula no existe
  en `Cliente`** (igual que #2/#3; los criterios no lo prueban, se fija aqui para que
  `test-engineer` no lo deje ambiguo); el filtro `fecha` es exacto sobre la columna `fecha`;
  `total` = numero de filas **devueltas** (con el filtro aplicado, no el total historico);
  orden `[{fecha: "desc"}, {hora: "desc"}]`; cliente existente sin filas -> `{ingresos: [],
  total: 0}` (`HU30-C05`).
- **#5 `POST /recepcion/clientes-rapidos`**: reutiliza `createCliente()` de
  `cliente.service.ts` (que ya valida sede antes de escribir -> 400 y ya setea
  `estado: "NUEVO"`, `debeCambiarPin: true`, PIN por defecto hasheado y `creadoPorId`), con
  `actorId = request.user.id`. **Cuerpo minimo (DEC-031)**: `{ cedula, nombres, apellidos,
  telefono }`; `sedeId` **opcional**: si se omite o va vacio, se usa la **sede del
  recepcionista** derivada del token (`User.sedeId`; si el usuario no tuviera sede -> 400
  `sedeId es requerido`). El body admite ademas `email`/`observaciones` opcionales (mensajes
  HU-04). La respuesta usa un **select propio** (`selectClienteRapido`): `selectCliente` +
  `perfilPendiente` (DEC-032, campo nuevo) + `creadoPor: {select: {id, nombre}}`
  (precedente `MembresiaDTO.creadoPor`, `membresia.service.ts:225`; **nunca** expone email ni
  hash de `User`) y **sin `pin`** (SEC-03). `estado = "NUEVO"` y `perfilPendiente = true`
  cumplen `HU31-C02`/`C06`. La respuesta expone `sede {id, nombre}` efectiva (default o
  enviada), para que la UI pinte a que sede quedo asignado el cliente.
- **#6 `PATCH /clientes/:id`**: contrato ya existente (orden y mensajes en la seccion de
  orden); **la completitud del perfil rapido usa exactamente `completarPerfilSchema`**
  (HU-31) -> campos opcionales con los mensajes de HU-04; `perfilPendiente` **no se expone en
  el body**: la limpieza es **automatica** y sigue la regla **DEC-033**: tras un PATCH
  exitoso, si el cliente resultante tiene `email` (no nulo ni vacio), `perfilPendiente` pasa
  a `false`; si no tiene email, la marca no cambia. #5/#2/#6 no agregan campos de escritura
  de la marca. La lectura posterior de la marca (`RAP-02`) es sobre `GET /clientes/:id` y
  `POST /recepcion/clientes-rapidos` (el listado `GET /clientes` y la consulta #2 **no** la
  exponen: sus schemas G14 no la incluyen).
- **#7 `POST /auth/login-cliente`**: **sin modificacion** (DEC-026, opcion B). El login
  sigue siendo solo identidad/cedula+PIN (HU-02 aceptada 4/4 intacta). No se agrega guarda de
  vigencia ni codigo `VIGENCIA_VENCIDA` en esta ruta; el acceso denegado por vencimiento se
  observa en el **portal** (200 con `estadoAccesoGym = VENCIDA` y la UI muestra sin acceso;
  la API de lectura nunca es error por vencimiento) y en **recepcion** (`403
  INGRESO_NO_PERMITIDO` en #3). `accesoVencimientoDenegadoSchema` queda **fuera de uso** en
  INC-03 salvo que la UI del portal necesite el codigo `VIGENCIA_VENCIDA` en un campo
  derivado (no aplica: #1 responde 200).
- **#8 `GET /clientes/:id` y `GET /clientes/:clienteId/membresias-gym`**: sin cambio de
  contrato (ya calculan estado; el segundo ya pasa pausas). Solo se corrige la fuente de la
  ficha (`selectFichaCliente` debe agregar `cambios` y `tipoServicio` a la seleccion de
  `membresias`, hoy en `cliente.service.ts:52-58`, y usar `resolverEstadoAcceso`). Nota: la
  ficha conserva sus mensajes propios de 403 (`No tienes permisos para consultar esta
  ficha.`, `clientes.ts:114-126`), distintos del preHandler; es un precedente ya aceptado en
  INC-00/01 y **no se toca** en INC-03.

### Errores (tabla consolidada; un `code` = un unico **status**, convencion `RESPUESTAS_ERROR`)

> **Ratificado 2026-10-10**: los mensajes de la columna "Mensaje" son los textos **exactos**
> del codigo actual (con tildes). Donde el borrador decia "proponer" o escribia sin tilde, se
> reemplaza por el mensaje real; donde el codigo tiene dos mensajes para el mismo `code`, se
> documenta la condicion (precedente INC-02, `src/routes/membresia.ts:52-56`).

| Status | `code` | Condicion | Mensaje | Endpoint(s) |
|---|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `cedula` fuera de `/^\d{6,10}$/` (incluido `""`) | `Cédula debe ser numérica de 6 a 10 dígitos` (`src/schemas/common.schema.ts:6`) | #2, #3, #4, #5 |
| 400 | `VALIDATION_ERROR` | `cedula` ausente del query (#2/#4) | `Cédula es requerida` (regla `required_error`) | #2, #4 |
| 400 | `VALIDATION_ERROR` | campos de #5 invalidos | mensajes de HU-04/HU-31 con tilde: `Teléfono debe ser móvil colombiano (3XXXXXXXXX)`, `Nombres solo pueden contener letras y espacios`, `Apellidos solo pueden contener letras y espacios`, `Campo requerido`, `Nombres son requeridos` (ausente), `Email tiene formato inválido`, `Observaciones no pueden exceder 500 caracteres` | #5 |
| 400 | `VALIDATION_ERROR` | `sedeId` ausente/vacio | `sedeId es requerido` | #3, #5 |
| 400 | `VALIDATION_ERROR` | `sedeId` > 36 | `sedeId excede longitud máxima` | #3, #5 |
| 400 | `VALIDATION_ERROR` | `sedeId` bien formado pero inexistente | `La sede indicada no existe. Verifique el identificador enviado.` (`src/routes/clientes.ts:45`) | #3, #5 |
| 400 | `VALIDATION_ERROR` | `fecha` de query mal formada en #4 | `Fecha debe tener formato YYYY-MM-DD` (`HU-30-schemas.ts:15`) | #4 |
| 401 | `AUTH_TOKEN_MISSING` | sin header Authorization | `Token de autenticación requerido.` (`src/plugins/auth.ts:39`) | #1..#6, #8 |
| 401 | `AUTH_TOKEN_INVALID` | token ilegible/firmado distinto | `Token de autenticación inválido.` (`src/plugins/auth.ts:45`) | #1..#6, #8 |
| 401 | `AUTH_TOKEN_EXPIRED` | token expirado | `Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.` (`src/plugins/auth.ts:32`) | #1..#6, #8 |
| 403 | `AUTH_FORBIDDEN` | rol fuera de los permitidos (p. ej. `CLIENTE` en recepcion; staff en #1) | `No tienes permisos para realizar esta acción.` (`src/plugins/auth.ts:60`) | #1..#6 |
| 401 | `AUTH_INVALID_CREDENTIALS` | cedula/PIN incorrectos | `Cédula o PIN inválido` (`src/routes/auth.ts:47`; ya aceptado en HU-02) | #7 |
| 400 | `VALIDATION_ERROR` | #7 con `pin` mal formado | `PIN debe ser de 4 dígitos` (`src/schemas/auth.schema.ts:23`) | #7 |
| 403 | `INGRESO_NO_PERMITIDO` | vigencia GYM `VENCIDA` | `La membresía no está habilitada para ingresar (vencida el YYYY-MM-DD)` (YYYY-MM-DD = `fechaFin`) | #3 |
| 403 | `INGRESO_NO_PERMITIDO` | vigencia GYM `PROGRAMADA` | `La membresía no está habilitada para ingresar (aún no inicia desde YYYY-MM-DD)` (YYYY-MM-DD = `fechaInicio`) | #3 |
| 403 | `INGRESO_NO_PERMITIDO` | cliente sin ninguna vigencia GYM | `La membresía no está habilitada para ingresar (no tiene vigencia activa)` | #3 |
| 403 | `INGRESO_NO_PERMITIDO` | estado general `SUSPENDIDO`/`RETIRADO` (DEC-030) | `El cliente está ${estado} y no puede registrar ingresos` (`SUSPENDIDO`\|`RETIRADO`) | #3 |
| — | `VIGENCIA_VENCIDA` | **No usado en INC-03** (DEC-026: #7 sin modificacion; #1/#2 son lecturas 200) | — (el efecto se observa con `estadoAccesoGym = VENCIDA` + `INGRESO_NO_PERMITIDO`) | — |
| 404 | `NOT_FOUND` | cliente inexistente (cedula bien formada o `id` inexistente) | `Cliente no encontrado` (`src/routes/clientes.ts:130,191`) | #2, #3, #4, #6 (y #1 si el cliente del token ya no existe) |
| 409 | `DUPLICATE` | cedula ya registrada (DEC-002, P2002) | `Ya existe un cliente con esa cédula` (`src/routes/clientes.ts:59`) | #5 |

Notas de ratificacion:

- **`INGRESO_NO_PERMITIDO` tiene 3 mensajes (uno por motivo)**: se implementa con claves
  internas con sufijo (`INGRESO_NO_PERMITIDO_VENCIDA` / `_PROGRAMADA` / `_SIN_VIGENCIA`) en
  el mapa `RESPUESTAS_ERROR` de la ruta, devolviendo siempre `code: "INGRESO_NO_PERMITIDO"`.
  Es lo que exige `HU30-C04` ("mensaje distinto por motivo") y lo que ya hace INC-02.
- **`VIGENCIA_VENCIDA` queda fuera del alcance de INC-03** por **DEC-026** (opción B): no se
  usa en #7 ni en #2/#3. Si en el futuro Producto elige la opción A, el status ratificado es
  **403** (no 401): (i) 401 significa "no autenticado" y la identidad ya fue validada;
  (ii) `club-beasts-web/src/lib/api.ts:98-155` clasifica **cualquier 401** que no sea
  `AUTH_INVALID_CREDENTIALS` como `session_expired` y dispararia `recoverSession` sobre un
  cliente que no tiene sesion que recuperar; con 403 cae en `forbidden` y la UI puede mostrar
  el mensaje.
- **`AUTH_FORBIDDEN` tiene dos mensajes hoy** (preHandler: `No tienes permisos para realizar
  esta acción.`; ficha propia: `No tienes permisos para consultar esta ficha.`, `clientes.ts:116`)
  y **no se unifican** en INC-03: ambos son de criterios ya aceptados (HU-15/HU-07).
- Los enums de error de los G14 (`consultaRecepcionErrorSchema`, `ingresoErrorSchema`,
  `clienteRapidoErrorSchema`) **no contienen `VIGENCIA_VENCIDA`** y con DEC-026 **no hay que
  agregarlo**: #2/#3 no devuelven ese codigo (la denegacion de ingreso usa
  `INGRESO_NO_PERMITIDO`).

### Orden de evaluacion (deterministico)

> Cada endpoint tiene **un** orden cerrado; el primero que aplica responde y se detiene
> (patron INC-02). El paso de estado general de #3 (DEC-030) esta **colocado** en el orden
> de abajo, sin reordenar los demas.

- **#1 portal**: 401/403 (preHandler) -> 404 (cliente del token inexistente) -> 200.
- **#2 consulta**: 401/403 (preHandler) -> 400 (schema de query: formato de `cedula`) -> 404
  (cliente) -> 200.
- **#3 ingreso**: 401/403 (preHandler) -> 400 (Zod: `cedula`, `sedeId` formato) -> 404
  (cliente) -> 400 (`sedeId` inexistente) -> 403 `INGRESO_NO_PERMITIDO` (estado general
  `SUSPENDIDO`/`RETIRADO` por DEC-030, **antes** de evaluar vigencia: un cliente suspendido
  no pasa aunque su membresia este activa) -> 403 `INGRESO_NO_PERMITIDO` (vigencia GYM:
  `VENCIDA` / `PROGRAMADA` / sin vigencia) -> 201. **Sin escritura** en 400/403/404.
- **#4 listado**: 401/403 (preHandler) -> 400 (Zod: `cedula`, `fecha` si viaja) -> 404
  (cliente) -> 200 (filtros y orden).
- **#5 creacion rapida**: 401/403 (preHandler) -> 400 (Zod: formato y campos minimos) -> 400
  (`sedeId` inexistente; la valida `createCliente` antes de escribir) -> 409 `DUPLICATE`
  (P2002) -> 201.
- **#6 PATCH**: 401/403 (preHandler) -> 400 (params `id`) -> 400 (body: formato/campos) ->
  404 (cliente) -> 200 (o 400 sede inexistente / 409 P2002 si el body los trae, via
  `responderErrorCliente`).
- **#7 login**: 400 (cedula/PIN) -> 401 `AUTH_INVALID_CREDENTIALS` -> 200 (sesion). **Sin
  guarda de vencimiento** (DEC-026).
- **#1 portal / #8 lecturas**: el vencimiento **no** es error de lectura (siempre 200).

### Modelo de datos propuesto (tarea `database-admin`, fuera de este paquete de documentacion)

```prisma
model Ingreso {
  id              String   @id @default(cuid())
  clienteId       String
  sedeId          String
  registradoPorId String
  fecha           String   // YYYY-MM-DD America/Bogota (DEC-005)
  hora            String   // HH:mm:ss America/Bogota (decision tecnica CONF-06)
  createdAt       DateTime @default(now())
  cliente         Cliente  @relation(fields: [clienteId], references: [id])
  sede            Sede     @relation(fields: [sedeId], references: [id])
  registradoPor   User     @relation(fields: [registradoPorId], references: [id])

  @@index([clienteId, fecha]) // ultimoIngreso (#2) e historial (#4)
}

model Cliente {
  // ... campos actuales ...
  perfilPendiente Boolean @default(false) // DEC-032 (campo nuevo, 1 columna)
  // NOTA: sin `foto` — DEC-029 (2026-10-10): la columna NO se crea en INC-03
  ingresos        Ingreso[]               // back-relation OBLIGATORIA (Prisma)
}

model Sede {
  // ... campos actuales ...
  ingresos Ingreso[] // back-relation OBLIGATORIA
}

model User {
  // ... campos actuales ...
  ingresosRegistrados Ingreso[] // back-relation OBLIGATORIA (registradoPor)
}
```

> **Ratificado 2026-10-10**: el `schema.prisma` actual de `Cliente`/`Sede`/`User`
> (`prisma/schema.prisma:26-58`) **no tiene** las back-relations `ingresos` /
> `ingresosRegistrados`; sin ellas `prisma migrate` falla al crear `Ingreso`. Las 3 se agregan
> en la misma migracion. Sin constraint de unicidad: **N filas por `(clienteId, fecha)`** ya
> que los multiples ingresos por dia son criterio (`ING-02`); el `@@index([clienteId, fecha])`
> es para #2/#4, no una restriccion. Migracion portable SQLite + PostgreSQL (DEC-012,
> `INC03-R10`).

- `fecha`/`hora` como **string** (consistente con `MembresiaGym.fechaInicio/fechaFin`, ya
  aceptados) en lugar de timestamp UTC: evita conversiones al leer y hace determinista la
  filtro por `?fecha=` (`CONF-06`, decision tecnica adoptada aqui; si Producto/DBA prefieren
  timestamp, solo cambia la persistencia, no el contrato de respuesta).
- Sin modelo nuevo para congelacion ni alertas: **DEC-028 (2026-10-10) confirmo la opcion
  (a)** (alertas derivadas de estados en tiempo de lectura); no hay modelo ni endpoint nuevos.
- Migracion portable `ADD COLUMN` / `CREATE TABLE` compatible SQLite (dev, DEC-012) y
  PostgreSQL (prod).

### Incompatibilidades con criterios/schemas G14 (ratificacion, igual que INC-02)

> Los archivos G14 **no se editan desde este spec** (los edita `acceptance-criteria-analyst`
> cuando el orquestador lo pida). Aqui solo se documenta que hay que enmendar y con que
> contrato final, para que el RED no se escriba sobre un schema vencido.

| # | Incompatibilidad | Contrato final (fuente) | Cambio exigido |
|---|---|---|---|
| 1 | `HU-16-schemas.ts` define `portalEstadoSchema` (`servicios[]`, `accesoConcedido`) y `recepcionEstadoClienteSchema` (`servicios[]`, `puedeIngresar`): borradores de HU-16 que **no** son las respuestas de #1/#2 | #1 = `portalResumenResponseSchema` (`HU-25-schemas.ts`, `estadoAccesoGym` escalonado); #2 = `consultaRecepcionResponseSchema` (`HU-29-schemas.ts`, escalonado) | **No implementar** `portalEstadoSchema`/`recepcionEstadoClienteSchema` en INC-03; los criterios `POR-*`/`REC-*` se prueban contra los schemas de HU-25/HU-29. Con DEC-026/027: `accesoConcedido`/`puedeIngresar`/`servicios[]` quedan **fuera del alcance** (el portal expone solo GYM escalonado; el "sin acceso" es UX sobre `estadoAccesoGym = VENCIDA`) |
| 2 | `HU-29-criterios-aceptacion.md` pide que la consulta no contenga `email`; el schema ya la excluye, pero **agrega** `foto` y `alertas` que el codigo de INC-00/01 no tiene | `foto: string \| null` y `alertas: [{codigo, mensaje}]` **siempre presentes** en la respuesta (nunca ausentes); con DEC-028/029: `foto = null` **siempre**; `alertas` derivadas de estado (ver detalle de #2) | **Resuelto**: forma y valores fijados; no hay celdas pendientes |
| 3 | `HU-31-schemas.ts` exige `creadoPor.{id,nombre}` y `perfilPendiente` en el 201 de #5; `selectCliente` (`cliente.service.ts:25-43`) **no** selecciona la relacion `User` (excluida a proposito por INC01-TRZ-01/02: "solo los IDS") | `creadoPor: { id, nombre }` en #5 (precedente: `MembresiaDTO.creadoPor`, `membresia.service.ts:225`) | Select propio `selectClienteRapido` en el GREEN; **nunca** exponer `email`/`contrasena`/`pin` de `User` ni del cliente |
| 4 | `HU-29`/`HU-30`/`HU-31` `*ErrorSchema` no incluyen `VIGENCIA_VENCIDA` ni `INVALID_OPERATION`; el borrador original del spec los usaba en #7 | Con **DEC-026**: `VIGENCIA_VENCIDA` **no se usa** en INC-03 (#7 sin modificacion; #2/#3 no lo devuelven) | **Resuelto**: los enums G14 **no se tocan** |
| 5 | `HU-16-criterios-aceptacion.md:293` (borrador Gherkin) espera **401** `VIGENCIA_VENCIDA` al login | Con **DEC-026**: el login **no** rechaza por vencimiento; el efecto se observa en portal (`VENCIDA` sin acceso) e ingreso (`403 INGRESO_NO_PERMITIDO`) | `test-engineer`, al escribir el RED: **no** implementar ese escenario de login; traducirlo al bloqueo observable en portal/recepcion (o omitirlo del alcance con nota en `evidencia.md`, ya que el punto lo acreditan `VEN-03`/`VEN-04`/`ING-04`) |
| 6 | El borrador de HU-29/HU-30/HU-31 usa nombres de sede/ids ficticios (`"Sede Norte"`, `uid-sede-norte`) que **no coinciden con el seed real** (`prisma/seed.ts`: `sede-1` "Sede Principal", `sede-2` "Sede Secundaria"); lo mismo afecta al fixture **F14** del spec | Los ids/nombres reales son los del seed; los Gherkin se **traducen** en el RED (mismo criterio DEC-013 que las fechas fijas) | `test-engineer` traduce fixtures al conectar los `.feature`; el fixture F14 de este spec (seccion "Fixtures") **arrastra el mismo error de nombre** y debe corregirse en la siguiente revision del paquete |
| 7 | `selectFichaCliente` (`cliente.service.ts:52-58`) no selecciona `cambios` ni `tipoServicio` en `membresias`, y `getClienteById:148` llama `calcularEstado` **sin** el 4.º argumento (rangos de pausa): la ficha contradice al listado en `CONGELADO` (`INC03-R04`, gap ya documentado en `HU-25-criterios-aceptacion.md:250-256`) | Unico calculo: `resolverEstadoAcceso`/`calcularEstado(..., pausasActivas(cambios))` tambien en la ficha | Agregar `cambios` y `tipoServicio` al select de `membresias` de la ficha y reutilizar el helper; **no** tocar `calcularEstado` ni los DTO de INC-02 |
| 8 | `HU-30` no fija el orden ni el significado de `total` del listado #4 | Orden `[{fecha: "desc"}, {hora: "desc"}]`; `total` = filas devueltas **con** el filtro `fecha` aplicado | Ya fijado en "Detalle ratificado por endpoint" (#4); los `.feature` lo escriben asi |

## Fixtures y datos de prueba

Aislamiento: **DEC-012** (SQLite aislado por ejecucion, limpieza automatica) y **DEC-013**
(fechas dinamicas relativas a `getTodayBogota()`, nunca fechas de calendario fijas; los
Gherkin con fechas fijas del borrador los traduce `test-engineer` en el RED, igual que en
INC-02).

| # | Fixture | Creacion | Para que prueba |
|---|---|---|---|
| F1 | Cliente + vigencia GYM `ACTIVA` que abarca hoy (`hoy-30 .. hoy+30`) | API existente (patron `membresia.spec.ts`) | Happy path portal (#1), consulta (#2), ingreso 201 (#3) |
| F2 | Vigencia `VENCIDA` (`fechaFin = hoy - 1`) | API (PATCH `fechaFin`) o directa en BD | `VENCIDA` en portal/recepcion, ingreso 403 (`VEN-02/03`, `ING-04`) |
| F3 | Vigencia `PROGRAMADA` (`fechaInicio = hoy + 1`) | directa en BD | portal `PROGRAMADA`, ingreso 403 (`POR-07`, `ING-11`) |
| F4 | Cliente **sin** membresia | API HU-04 sin membresia | `SIN_VIGENCIA` (`POR-06`), ingreso 403 (`ING-04`) |
| F5 | Vigencia con congelacion que cubre hoy (INC-02) | doble llamada a `POST .../congelar` | `CONGELADO` + rango en portal/recepcion (`POR-04`, `REC-03`) e ingreso **201** por DEC-025 (`CONF-02`) |
| F6 | Frontera `hoy == fechaFin` | F1 con `fechaFin = hoy` | `ACTIVA` e ingreso 201 (`ING-11`, `POR-07`) |
| F7 | Frontera `hoy == fechaFin + 1` | F1 con `fechaFin = hoy - 1` | `VENCIDA` e ingreso 403 (`ING-11`) |
| F8 | Cliente multi-servicio: `GYM` vencido + `NUTRICION` vigente | **directa en BD** (`tipoServicio`, API solo crea GYM hasta INC-05) | DEC-027: el login/lecturas no bloquean por el GYM vencido; el portal de INC-03 expone solo GYM (`VENCIDA`) |
| F9 | Cliente con 2 ingresos previos (ayer 18:30 y hoy 07:15) | `POST /recepcion/ingresos` x2 | `ultimoIngreso` y historial (`REC-04`, `ING-05`) |
| F10 | Cliente creado por flujo rapido (`perfilPendiente = true`) | `POST /recepcion/clientes-rapidos` | `RAP-01..03,06,07` |
| F11 | Cedulas invalidas (`ABC`, `12345`, `12345678901`, `""`) y inexistente (`99999999`) | - | `REC-06/07`, `ING-06/07`, `RAP-04` |
| F12 | Cliente `SUSPENDIDO` con membresia `ACTIVA` | directa en BD (HU-17 esta en INC-04; el estado se setea en la fila `Cliente`) | `ING-10` (DEC-030: 403), `REC-05` (DEC-028: alerta `ESTADO_CLIENTE`) |
| F13 | Staff: `DUENO` y `RECEPCIONISTA`; `CLIENTE` con PIN | seed existente | permisos `REC-08`, `ING-09`, `RAP-05`, `POR-05` |
| F14 | Sedes `Sede Norte` / `Sede Sur` con ids del seed | seed existente | `sedeId` (`ING-08`), multi-sede (`CONF-03`) |

Supuestos: cada test crea sus fixtures y limpia al terminar; sin dependencia entre archivos;
ningun fixture reutiliza estado de otra corrida; fechas siempre relativas a hoy (Bogota).

## Evidencia requerida por criterio

| Criterio(s) | Integracion API (Vitest) | Unit/UI (Vitest web) | E2E (Playwright) | Gherkin (`features/*.feature`) |
|---|---|---|---|---|
| `VEN-01`, `VEN-02` | si (listado + ficha) | no | no | si |
| `VEN-03` | si (portal + recepcion) | si (portal) | **si** (portal y recepcion en navegador) | si |
| `VEN-04` | **si** (ingreso 403 con vencimiento; portal 200 con `VENCIDA`) | no | **si** (bloqueo observable en portal y recepcion) | si |
| `VEN-05` | si (mismo estado en 4 lecturas) | no | no | si |
| `POR-01..04`, `POR-06`, `POR-07` | si | si (componente portal) | **si** | si |
| `POR-05` | si (401/403/200) | si (guard de rol) | si | si |
| `REC-01..04`, `REC-06..10` | si | si (pantalla de recepcion) | **si** | si |
| `REC-05` | si (alertas derivadas de estado, DEC-028) | si | si | si |
| `ING-01..09`, `ING-11` | si | si (boton/estado en UI) | **si** | si |
| `ING-10` | si (DEC-030: 403) | no | no | si |
| `RAP-01..07` | si | si (formulario de recepcion) | **si** | si |
| **Todos** | `npx tsc --noEmit` (0), `npx vitest run` (sin regresiones sobre la base), `npm run test:gherkin` (exit 0) | `npx tsc --noEmit`, `npx vitest run`, `npm run build` | `npx playwright test` completo | `npx prisma migrate status` (0 pendientes, sin drift) |
| **Revision** | `code-reviewer`: seguridad/permisos, reglas DEC-005/006/017/025, no duplicado de puntos, pruebas sin aserciones vacias | | | |

Los `.feature` y `steps/` los crea `test-engineer` en el RED (el analista no los toca; regla
de INC-02). Guard existente: `npm run test:gherkin` falla con `exit 1` si el alcance esta
incompleto.

### Checklist de puerta LISTO

- [x] Spec con objetivo, alcance incluido/excluido y fuera de alcance explicito (este archivo).
- [x] Criterios `INC03-XXX-nn` con trazabilidad bullet -> criterio ISTQB de origen (40/40).
- [x] Contrato API propuesto con endpoints, roles, errores, orden de evaluacion y estados.
- [x] Fixtures + supuestos de aislamiento (DEC-012/DEC-013).
- [x] Plantilla de evidencia (`evidencia.md`) y backlog (`tareas.md`).
- [x] Criterios ISTQB de HU-16/25/29/30/31 existentes y referenciados (G14 cerrado).
- [x] Fuera de alcance confirmado (anamnesis/PEND-003, rutinas, nutricion, notificaciones,
      congelacion ya cerrada en INC-02).
- [x] **`INC03-PEND-01..08` resueltos por Producto (2026-10-10) y registrados en
      `docs/producto/decisiones.md` como DEC-026..DEC-033**.
- [x] Contrato **ratificado por `backend-developer`** (ajustes de paths/bodies/errores sobre
      este borrador, igual que INC-02) -> **hecho 2026-10-10**: `PATCH /clientes/:id`, mensajes
      exactos con tilde de `src/`, regla de seleccion del mensaje Zod, orden de #1/#3/#4/#6,
      fuente unica de estado (`pausasActivas`/`pausaVigente` + `resolverEstadoAcceso`), back-relations
      de `Ingreso` y tabla de 8 incompatibilidades G14.
- [x] Regla de **no duplicado** (HU-16 vs bloque 4) asignada por el orquestador
      (2026-10-10, `decisiones.md`): el efecto "vencido = sin acceso" acredita 1 punto en
      HU-16; el bloque 4 acredita contrato y pintado.
- [x] Confirmaciones `CONF-01..06` **ratificadas** por el orquestador (2026-10-10,
      `decisiones.md`).

**Puerta LISTO cumplida el 2026-10-10: el incremento pasa a LISTO y habilita RED.**

## Plan de ejecucion por agente

| Paso | Agente | Entrega | Criterios | Depende de |
|---:|---|---|---|---|
| 1 | acceptance-criteria-analyst | `spec.md`, `tareas.md`, `evidencia.md` (este paquete) | todos | - (hecho 2026-10-09) |
| 2 | Orquestador + Producto | Resolver `INC03-PEND-01..08` -> `decisiones.md` (DEC-026..033) | `VEN-04`, `REC-01/05`, `ING-10`, `RAP-01/02/03` | paso 1 (hecho 2026-10-10) |
| 3 | backend-developer | Ratificar contrato (endpoints, bodies, errores, orden) en este spec | todos | paso 2 (hecho 2026-10-10) |
| 4 | Orquestador | Puerta **LISTO**: checklist completa -> `tareas.md` en ejecucion | - | pasos 2-3 (hecho 2026-10-10) |
| 5 | test-engineer | **RED**: integracion API + unit web + escenarios Gherkin (sin tocar `src/`) | todos | paso 4 |
| 6 | database-admin | Migracion `Ingreso` + `perfilPendiente` (sin `foto`: DEC-029) + fixtures/seed | `ING-*`, `RAP-01/02` | paso 4 |
| 7 | backend-developer | **GREEN** API: `recepcion.ts` (consulta, ingresos, clientes-rapidos), `portal.ts`, unificacion de fuente de estado (**#7 login sin modificacion**, DEC-026) | `VEN-*`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | pasos 5-6 |
| 8 | frontend-developer | **GREEN** UI: portal con datos reales (fin del hardcode), pantalla de recepcion (consulta + ingreso + alta rapida), marca de perfil pendiente | `VEN-03`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | paso 7 |
| 9 | test-engineer | **VERIFICADO**: E2E real, bateria completa, registro en `evidencia.md` | todos | paso 8 |
| 10 | code-reviewer | **REVISADO**: seguridad/permisos, DEC-005/006/017/025, no duplicado, calidad de pruebas | todos | paso 9 |
| 11 | Orquestador | Certificacion: `avance.md`, `mvp.md`, `auditoria-puntos-inc00.md` (+11 solo si la revision no bloquea) | todos | paso 10 |

## Decisiones (resueltas el 2026-10-10)

Las 8 decisiones fueron aprobadas por el Producto el 2026-10-10 (confirmacion unica de las
recomendaciones del orquestador) y registradas como **DEC-026..DEC-033** en
`docs/producto/decisiones.md`. Se conserva la tabla original como historico:

| ID | Pregunta concreta a Producto | Opcion aprobada | Decision |
|---|---|---|---|
| `INC03-PEND-01` | Cuando una vigencia esta `VENCIDA`, que se bloquea y en que punto? | **(B)** | DEC-026 |
| `INC03-PEND-02` | Cliente con GYM vencido y NUTRICION vigente, puede usar el vigente? | **(a)** | DEC-027 |
| `INC03-PEND-03` | Que es una "alerta operativa no sensible" y de donde sale? | **(a)** derivada de estados | DEC-028 |
| `INC03-PEND-04` | Se crea `Cliente.foto` en INC-03? | **(b)** no | DEC-029 |
| `INC03-PEND-05` | Cliente `SUSPENDIDO`/`RETIRADO` con membresia activa puede ingresar? | **(b)** no, 403 | DEC-030 |
| `INC03-PEND-06` | `sedeId` obligatorio o default del recepcionista en la creacion rapida? | **(b)** default | DEC-031 |
| `INC03-PEND-07` | Marca de perfil pendiente: campo nuevo o derivacion? | **(a)** campo nuevo | DEC-032 |
| `INC03-PEND-08` | Que condicion limpia `perfilPendiente`? | **(b)** tener `email` | DEC-033 |

PEND-003 (anamnesis) **no** pertenece a este incremento (DEC-021).

### Confirmaciones no bloqueantes (ratificadas por el orquestador el 2026-10-10)

| ID | Tema | Opcion por defecto adoptada en este spec | Fuente |
|---|---|---|---|
| `CONF-01` | El "detecta" de HU-16 b1 se satisface con **deteccion derivada en cada lectura** (sin job/cron) mientras las 3 superficies usen la misma fuente | Aceptar derivacion | abierto #5 de `HU-16-criterios-aceptacion.md` |
| `CONF-02` | `CONGELADO` permite ingreso -> **201** | Mantener **DEC-025** (acceso conservado); si Producto lo cambia, hay que enmendar DEC-025 explicitamente y la rama vuelve a 403 | `decisiones.md:33,45`; `HU30-AB-08` |
| `CONF-03` | Varios ingresos del mismo dia **en sedes distintas** | Permitir (la HU no lo restringe) | `HU30-AB-03` |
| `CONF-04` | Etiquetas UI del estado | Rotulos en espanol (`Activo`, `Vencido`, `Programado`, `Congelado`, `Sin vigencia`) mapeados desde el enum; la API siempre devuelve el enum | `HU25-AB-02` |
| `CONF-05` | Quien completa el perfil rapido | Se mantiene HU-05: `DUENO` y `RECEPCIONISTA` (la HU solo exige que el **dueno pueda**) | precedente HU-05 aceptado; `HU31-AB-04` |
| `CONF-06` | Persistencia de la hora de ingreso | String `HH:mm:ss` America/Bogota (consistente con las fechas string de `MembresiaGym`); ratificado 2026-10-10: se agrega `getHoraBogota()` junto a `getTodayBogota()` (`membresia.service.ts:8-16`) | `HU30-AB-06` |

## Riesgos

| ID | Riesgo | Impacto | Mitigacion | Responsable |
|---|---|---|---|---|
| `INC03-R01` | `PEND-01` opcion A (bloquear login) choca con HU-02 ya **aceptada 4/4** | Regresion de criterios aceptados y de E2E existentes | **Cerrado (2026-10-10)**: DEC-026 aprobo la opcion **B**; el login no cambia, HU-02 intacta | Producto + Orquestador |
| `INC03-R02` | Duplicado de puntos HU-16 vs bloque 4 (regla 3 de la auditoria) | Contar dos veces el mismo "vencido en portal/recepcion" | **Asignado (2026-10-10)**: regla fijada en `decisiones.md` (el efecto acredita en HU-16; el bloque 4 solo contrato/pintado); reflejado en la seccion de no-duplicado de este spec | Orquestador |
| `INC03-R03` | `PEND-03` opcion (b) (alertas con texto libre) implicaria modelo + endpoint + UI nuevos | Subida de alcance dentro de INC-03 | **Cerrado (2026-10-10)**: DEC-028 aprobo la opcion **(a)** (derivadas de estado, sin modelo nuevo) | Orquestador + Backend |
| `INC03-R04` | Corregir la fuente de estado de la ficha (`cliente.service.ts:144-149` sin pausas) puede regresar pruebas ya aceptadas de INC-00/INC-01/INC-02 | Regresion de 379/379 API | RED primero sobre la divergencia; no tocar `calcularEstado`, solo su llamada/select | Backend + QA |
| `INC03-R05` | Bloque 4 = 10 puntos **sin ponderar por HU** (`auditoria:120`) | Desacuerdo al repartir fracciones | **Asignado (2026-10-10)**: no-duplicado fijado en `decisiones.md` (HU-16 = 1 por el efecto; bloque 4 = 10 por contrato/pintado); el reparto por fraccion se cierra en `auditoria-puntos-inc00.md` | Orquestador |
| `INC03-R06` | Fechas: corrida sobre medianoche `America/Bogota` desfasa fixtures dinamicos | Flaky | Mismo patron aceptado en INC-02 (`hoyBogota()` por test) | QA |
| `INC03-R07` | Flaky base sin cerrar: **R-10** (`clientes.spec.ts:147`) y **R-09** (1 fallo web sin capturar) | Bateria E2E/vitest inestable al cerrar | Guard ya probado (`toHaveCount(0)` antes de leer listas); capturar con `--reporter=json` | test-engineer |
| `INC03-R08` | Orden HU-30 -> HU-29: `REC-04` (`ultimoIngreso`) exige la entidad `Ingreso` | `REC-04` sin verificar si se hace al reves | Orden fijado en el plan de ejecucion (paso 6 antes que el GREEN de #2) | Orquestador + Backend |
| `INC03-R09` | `pausasActivas` no esta exportado (`membresia.service.ts:169`) y portal/recepcion deben consumir la misma fuente que el listado | Dos calculos distintos de `CONGELADO` | Exportar/extraer el helper en el GREEN (gap ya documentado en `HU-25-criterios-aceptacion.md`) | Backend |
| `INC03-R10` | SQLite (dev/PR) vs PostgreSQL (prod): tipos de string de fecha/hora y unicidad | Diferencias entre entornos (R-02/R-01 heredados) | Migracion portable; no meter constraints nuevos sin probar en Postgres | DBA + DevOps |

## Trazabilidad de decisiones aprobadas aplicadas

| Decision | Aplicacion en INC-03 |
|---|---|
| DEC-001 (roles) | Permisos de todos los endpoints nuevos |
| DEC-002 (cedula identificadora) | Regex `/^\d{6,10}$/` y unicidad en consulta/ingreso/creacion rapida |
| DEC-004 (servicios separados) | Fixture F8 multi-servicio; con DEC-027 el portal de INC-03 expone solo GYM y no bloquea por otros servicios |
| DEC-005 (America/Bogota) | `fecha`/`hora` de ingreso, `hoy` de toda evaluacion |
| DEC-006 (inclusivos) | Bordes `fechaFin`/`fechaInicio` en `VEN-01`, `POR-07`, `ING-11` |
| DEC-007 (renovar = periodo nuevo) | Transicion `VENCIDA -> ACTIVA` sin flag obsoleto (`VEN-02`) |
| DEC-012 / DEC-013 | Aislamiento SQLite y fixtures dinamicos |
| DEC-016 (fraccionable) | Reparto por bullet; este spec no declara puntos |
| DEC-017 (recepcion gestiona vigencias) | `POST .../congelar` etc. ya en INC-02; en INC-03 recepcion **lee** vigencias via consulta e ingreso con roles staff |
| DEC-025 (congelacion no bloquea acceso) | Rama `CONGELADO -> 201` en `ING-04`; INC-03 no implementa bloqueo por pausa (`CONF-02`) |
| DEC-026 (`PEND-01`=B) | #7 login sin modificacion; denegacion en portal (`VENCIDA` sin acceso) e ingreso (`403 INGRESO_NO_PERMITIDO`); `VIGENCIA_VENCIDA` fuera de uso en INC-03 |
| DEC-027 (`PEND-02`=a) | Guarda de #3 sobre solo GYM; portal expone solo GYM; F8 sin bloqueo multi-servicio |
| DEC-028 (`PEND-03`=a) | `alertas` derivadas de estado en #2 (`ESTADO_CLIENTE`/`MEMBRESIA_VENCIDA`); sin modelo nuevo |
| DEC-029 (`PEND-04`=b) | Sin columna `Cliente.foto`; `foto` siempre `null` en #2 |
| DEC-030 (`PEND-05`=b) | `SUSPENDIDO`/`RETIRADO` -> 403 `INGRESO_NO_PERMITIDO` en #3 (paso de orden antes de vigencia) |
| DEC-031 (`PEND-06`=b) | #5 con `sedeId` opcional y default del token; minimo 4 campos; sede efectiva en la respuesta |
| DEC-032 (`PEND-07`=a) | Columna `Cliente.perfilPendiente Boolean @default(false)` en la migracion |
| DEC-033 (`PEND-08`=b) | `PATCH /clientes/:id` limpia la marca solo si el cliente queda con `email` |
| DEC-021 / PEND-003 | Anamnesis **fuera** de este incremento |
