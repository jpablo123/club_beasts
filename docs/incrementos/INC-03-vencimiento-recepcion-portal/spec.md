# INC-03 - Vencimiento, recepcion y portal con estado real (HU-16 + bloque 4)

## Estado

Estado actual: **BLOQUEADO** (2026-10-09). El spec esta completo y firmado; el incremento no
pasa a `LISTO` porque faltan **8 decisiones de Producto** que afectan permisos, datos o UX
(`INC03-PEND-01..08`, seccion "Decisiones pendientes"). Cada una tiene pregunta concreta,
opciones, criterios afectados y responsable. Ninguna decision esta inventada aqui: solo se
registran opciones.

- Al resolverse `INC03-PEND-01..08` en `docs/producto/decisiones.md` y ratificar el contrato
  por `backend-developer`, el estado pasa `BLOQUEADO -> ESPECIFICADO -> LISTO` **sin
  reescritura estructural** del spec: solo se rellenan las celdas marcadas `Pendiente
  (PEND-xx)` del contrato.
- 33 de 40 criterios **no dependen** de ninguna decision abierta y quedan listos para RED en
  cuanto se abra la puerta (la puerta es un unico gate: no se abre parcialmente).
- Los criterios `HU-16-*`, `HU-25-*`, `HU-29-*`, `HU-30-*` y `HU-31-*` ya existen en
  `club-beasts-api/features/acceptance-criteria/` (G14 cerrado 2026-10-08): **se reusan, no se
  reescriben**. Este spec los referencia y les da contrato, fixtures, evidencia y plan.

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
| `INC03-VEN-04` | HU-16 b4 | `HU16-C04` | El acceso al servicio vencido queda denegado de forma observable y probada, con codigo propio distinto de credenciales invalidas | **BLOQUEADO** (`INC03-PEND-01`, `INC03-PEND-02`) |
| `INC03-VEN-05` | HU-16 b3 (transversal) | `HU16-C01`/`HU16-C03` ("unica fuente") | Ficha, listado, portal y recepcion devuelven **el mismo** estado calculado por la misma regla (cierra la divergencia `cliente.service.ts:144-149` que no pasa pausas a `calcularEstado`) | OK |
| `INC03-POR-01` | HU-25 b1 | `HU25-C01` | `GET /portal/resumen` 200 con nombre completo, cedula y sede principal desde la BD | OK |
| `INC03-POR-02` | HU-25 b2 | `HU25-C02` | `estadoAccesoGym` calculado por backend (enum), sin texto fijo en la UI | OK |
| `INC03-POR-03` | HU-25 b3 | `HU25-C03` | `fechaVencimiento = fechaFin` (`YYYY-MM-DD`), dia final inclusivo | OK |
| `INC03-POR-04` | HU-25 b4 | `HU25-C04` | Si hay congelacion vigente, el portal muestra el rango `{fechaInicio, fechaFin}`; si no, `null` | OK (habilitado por INC-02) |
| `INC03-POR-05` | HU-25 transversal | `HU25-C05` | Autorizacion DEC-001: sin token 401, staff 403, `CLIENTE` 200 solo con sus propios datos | OK |
| `INC03-POR-06` | HU-25 transversal | `HU25-C06` | Cliente sin membresia -> `SIN_VIGENCIA` + `fechaVencimiento: null`; la UI **nunca** muestra "Activo" | OK |
| `INC03-POR-07` | HU-25 transversal | `HU25-C07` | Tres consultas con `hoy = fechaInicio-1`, `fechaFin`, `fechaFin+1` -> `PROGRAMADA`, `ACTIVA`, `VENCIDA` (DEC-005/006) | OK |
| `INC03-REC-01` | HU-29 b1 | `HU29-C01` | Consulta 200 con nombre completo, cedula, sede y `foto: string \| null` | **BLOQUEADO** (`INC03-PEND-04`: si existe campo `foto`; la forma del contrato no cambia) |
| `INC03-REC-02` | HU-29 b2 | `HU29-C02` | `estadoAccesoGym` real en recepcion (enum del backend) | OK |
| `INC03-REC-03` | HU-29 b3 | `HU29-C03` | `fechaVencimiento` y `congelacion` (o `null`) en la respuesta | OK |
| `INC03-REC-04` | HU-29 b4 | `HU29-C04` | `ultimoIngreso = {fecha, hora, sede}` del mas reciente, o `null` si nunca ingreso (requiere `Ingreso` de HU-30 en el mismo incremento: orden HU-30 -> HU-29) | OK (orden fijado) |
| `INC03-REC-05` | HU-29 b5 | `HU29-C05` | `alertas: [{codigo, mensaje}]` no sensibles, o `[]` | **BLOQUEADO** (`INC03-PEND-03`) |
| `INC03-REC-06` | HU-29 transversal | `HU29-C06` | `?cedula=ABC` / `12345` / `12345678901` / vacia -> 400 `VALIDATION_ERROR` "Cedula debe ser numerica de 6 a 10 digitos" | OK |
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
| `INC03-ING-10` | HU-30 transversal | `HU30-C10` | Cliente `SUSPENDIDO`/`RETIRADO` con membresia `ACTIVA` intenta ingresar | **BLOQUEADO** (`INC03-PEND-05`) |
| `INC03-ING-11` | HU-30 transversal | `HU30-C11` | Extremos inclusivos al decidir el ingreso (DEC-005/006) | OK |
| `INC03-RAP-01` | HU-31 b1 | `HU31-C01` | `POST /recepcion/clientes-rapidos` 201 con el minimo de datos | **BLOQUEADO** (`INC03-PEND-06`: minimo de 5 con `sedeId` o 4 con sede por defecto) |
| `INC03-RAP-02` | HU-31 b2 | `HU31-C02` | `perfilPendiente = true` **persistido** (visible en lectura posterior, no solo en el 201) | **BLOQUEADO** (`INC03-PEND-07`: campo nuevo vs derivacion) |
| `INC03-RAP-03` | HU-31 b3 | `HU31-C03` | `DUENO` completa el perfil con `PATCH /clientes/:id` y los campos quedan persistidos | **BLOQUEADO parcial** (la completitud es OK; la limpieza de `perfilPendiente` depende de `INC03-PEND-08`) |
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
  punto del efecto es de HU-16; el orquestador lo asigna al bloque que cierre primero
  (abierto #3 de `HU-16-criterios-aceptacion.md`).
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
> (`DUENO`/`RECEPCIONISTA` = staff; `CLIENTE` = portal). Los schemas Zod oficiales ya existen
> y se importan tal cual: `HU-16-schemas.ts`, `HU-25-schemas.ts`, `HU-29-schemas.ts`,
> `HU-30-schemas.ts`, `HU-31-schemas.ts` (G14).

### Endpoints

| # | Metodo | Path | Roles permitidos | Exito | Schema (respuesta) | Criterios | Contrato |
|---|---|---|---|---|---|---|---|
| 1 | `GET` | `/portal/resumen` | `CLIENTE` | 200 | `portalResumenResponseSchema` (`HU-25-schemas.ts`) | `POR-01..07` | **Fijado** |
| 2 | `GET` | `/recepcion/consulta?cedula=<cedula>` | `DUENO`, `RECEPCIONISTA` | 200 | `consultaRecepcionResponseSchema` (`HU-29-schemas.ts`) | `REC-01..10` | **Fijado**; `alertas` -> `PEND-03`; `foto` -> `PEND-04` |
| 3 | `POST` | `/recepcion/ingresos` | `DUENO`, `RECEPCIONISTA` | 201 | `ingresoResponseSchema` (`HU-30-schemas.ts`) | `ING-01..04`, `ING-06..09`, `ING-11` | **Fijado**; rama estado general -> `PEND-05` |
| 4 | `GET` | `/recepcion/ingresos?cedula=<cedula>[&fecha=YYYY-MM-DD]` | `DUENO`, `RECEPCIONISTA` | 200 | `ingresosListResponseSchema` | `ING-05` | **Fijado** |
| 5 | `POST` | `/recepcion/clientes-rapidos` | `DUENO`, `RECEPCIONISTA` | 201 | `clienteRapidoResponseSchema` (`HU-31-schemas.ts`) | `RAP-01,02,04..07` | **Pendiente (`PEND-06` cuerpo minimo, `PEND-07` marca)** |
| 6 | `PATCH` | `/clientes/:clienteId` (ruta existente HU-05, `src/routes/clientes.ts:171`) | `DUENO`, `RECEPCIONISTA` (precedente HU-05 aceptado) | 200 | DTO de cliente | `RAP-03` | **Fijado**; limpieza de la marca -> `PEND-08` |
| 7 | `POST` | `/auth/login-cliente` (**modificacion** de `src/services/auth.service.ts:14-28`) | `CLIENTE` (previo a sesion) | 200 / **401|403 `VIGENCIA_VENCIDA`** | sesion existente / `accesoVencimientoDenegadoSchema` | `VEN-04` | **Pendiente (`PEND-01`, `PEND-02`)** |
| 8 | `GET` | `/clientes/:clienteId/membresias-gym` y `/clientes/:id` (lecturas existentes) | segun existente hoy | 200 | DTO existente (`estado` calculado) | `VEN-01,02,05` | **Fijado** (correccion: misma fuente con pausas) |
| 9 | UI | `/portal` (`club-beasts-web/src/app/portal/page.tsx`) | sesion `CLIENTE` | render | consume #1 | `VEN-03`, `POR-01..07` | **Fijado** (eliminar `page.tsx:122` hardcodeado) |
| 10 | UI | pantalla de recepcion (nueva: consulta + ingreso + alta rapida) | sesion staff (middleware) | render | consume #2, #3, #5 | `VEN-03`, `REC-*`, `ING-*`, `RAP-*` | **Fijado** (paginas nuevas en `club-beasts-web/src/app/recepcion/`) |

- **Sin job ni cron**: el vencimiento se **deriva en cada lectura** (mismo modelo que
  `calcularEstado`); lo exigible es que las tres superficies consuman esa unica fuente
  (`CONF-01`, confirmar en LISTO).
- La ficha/administracion no cambia de contrato: solo se corrige la fuente de calculo
  (`cliente.service.ts:144-149` debe pasar los rangos de pausa como si hace
  `membresia.service.ts:251`) para que ficha, listado, portal y recepcion no contradigan.

### Errores (tabla consolidada; un `code` = un unico mensaje, convencion `RESPUESTAS_ERROR`)

| Status | `code` | Condicion | Mensaje | Endpoint(s) |
|---|---|---|---|---|
| 400 | `VALIDATION_ERROR` | cedula fuera de `/^\d{6,10}$/` | `Cedula debe ser numerica de 6 a 10 digitos` (mensaje ya existente de HU-04) | #2, #3, #4, #5 |
| 400 | `VALIDATION_ERROR` | campos de #5 invalidos (nombres/apellidos/telefono/email) | mensajes existentes de HU-04 (`Teléfono debe ser móvil colombiano (3XXXXXXXXX)`, `Nombres solo pueden contener letras y espacios`, ...) | #5 |
| 400 | `VALIDATION_ERROR` | `sedeId` ausente/vacio/>36 o inexistente | `La sede indicada no existe. Verifique el identificador enviado.` (patron `src/routes/clientes.ts:41-48`) | #3, #5 |
| 400 | `VALIDATION_ERROR` | `fecha` de query mal formada en #4 | mensaje de campo | #4 |
| 401 | `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` | preHandler (sin token / invalido / vencido) | mensajes existentes | #1..#6, #8 |
| 403 | `AUTH_FORBIDDEN` | rol fuera de los permitidos (p. ej. `CLIENTE` en recepcion; staff en #1) | `No tienes permisos para realizar esta acción.` | #1..#6 |
| 403 | `INGRESO_NO_PERMITIDO` | membresia `VENCIDA` / `PROGRAMADA` / sin vigencia (mensaje especifico por motivo) | proponer: `La membresía no está habilitada para ingresar (vencida el YYYY-MM-DD)` / `...aún no inicia (desde YYYY-MM-DD)` / `...no tiene vigencia activa` | #3 |
| 403 | `INGRESO_NO_PERMITIDO` | **PEND-05**: estado general `SUSPENDIDO`/`RETIRADO` | **Pendiente (`PEND-05`)** | #3 |
| 401/403 | `VIGENCIA_VENCIDA` | **PEND-01/PEND-02**: acceso denegado por vencimiento | candidato: `Su membresía se venció el YYYY-MM-DD...` — **Pendiente (`PEND-01`)** | #7 (y/o #2/#3 segun opcion) |
| 404 | `NOT_FOUND` | cliente inexistente (`Cliente no encontrado`) | `Cliente no encontrado` | #2, #3, #4, #6 |
| 409 | `DUPLICATE` | cedula ya registrada (DEC-002) | `Ya existe un cliente con esa cedula` | #5 |

### Orden de evaluacion (deterministico)

- **#2 consulta**: 401/403 (preHandler) -> 400 (schema de query) -> 404 (cliente) -> 200.
- **#3 ingreso**: 401/403 (preHandler) -> 400 (Zod: cedula, sedeId) -> 404 (cliente) -> 400
  (sede inexistente) -> 403 `INGRESO_NO_PERMITIDO` (vigencia; y estado general si `PEND-05`
  lo resuelve como rechazo) -> 201.
- **#5 creacion rapida**: 401/403 (preHandler) -> 400 (Zod: formato y campos minimos) -> 400
  (sede inexistente) -> 409 `DUPLICATE` -> 201.
- **#7 login** (si `PEND-01` = opcion A): 400 (cedula/PIN) -> 401 credenciales invalidas ->
  403/401 `VIGENCIA_VENCIDA` (regla de vigencia, **despues** de validar identidad, para no
  filtrar ni confundir con credenciales).
- **#1 portal / #8 lecturas**: 401/403 -> 200 siempre (el vencimiento no es error de lectura).

### Modelo de datos propuesto (tarea `database-admin`, fuera de este paquete de documentacion)

```prisma
model Ingreso {
  id             String   @id @default(cuid())
  clienteId      String
  sedeId         String
  registradoPorId String
  fecha          String   // YYYY-MM-DD America/Bogota (DEC-005)
  hora           String   // HH:mm:ss America/Bogota (decision tecnica CONF-06)
  createdAt      DateTime @default(now())
  cliente        Cliente  @relation(fields: [clienteId], references: [id])
  sede           Sede     @relation(fields: [sedeId], references: [id])
  registradoPor  User     @relation(fields: [registradoPorId], references: [id])
}

model Cliente {
  // ... campos actuales ...
  perfilPendiente Boolean @default(false) // PEND-07 (campo vs derivacion)
  foto            String?                 // PEND-04 (URL o null)
}
```

- `fecha`/`hora` como **string** (consistente con `MembresiaGym.fechaInicio/fechaFin`, ya
  aceptados) en lugar de timestamp UTC: evita conversiones al leer y hace determinista la
  filtro por `?fecha=` (`CONF-06`, decision tecnica adoptada aqui; si Producto/DBA prefieren
  timestamp, solo cambia la persistencia, no el contrato de respuesta).
- Sin modelo nuevo para congelacion ni alertas **si** `PEND-03` resuelve opcion (a)
  (alertas derivadas de estados); la opcion (b) exigiaria modelo + endpoint nuevos (riesgo
  `R-03`).
- Migracion portable `ADD COLUMN` / `CREATE TABLE` compatible SQLite (dev, DEC-012) y
  PostgreSQL (prod).

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
| F8 | Cliente multi-servicio: `GYM` vencido + `NUTRICION` vigente | **directa en BD** (`tipoServicio`, API solo crea GYM hasta INC-05) | `PEND-02` (acceso multi-servicio) |
| F9 | Cliente con 2 ingresos previos (ayer 18:30 y hoy 07:15) | `POST /recepcion/ingresos` x2 | `ultimoIngreso` y historial (`REC-04`, `ING-05`) |
| F10 | Cliente creado por flujo rapido (`perfilPendiente = true`) | `POST /recepcion/clientes-rapidos` | `RAP-01..03,06,07` |
| F11 | Cedulas invalidas (`ABC`, `12345`, `12345678901`, `""`) y inexistente (`99999999`) | - | `REC-06/07`, `ING-06/07`, `RAP-04` |
| F12 | Cliente `SUSPENDIDO` con membresia `ACTIVA` | API HU-17 (o directa en BD si HU-17 esta en INC-04) | `ING-10` (`PEND-05`), `REC-05` (`PEND-03`) |
| F13 | Staff: `DUENO` y `RECEPCIONISTA`; `CLIENTE` con PIN | seed existente | permisos `REC-08`, `ING-09`, `RAP-05`, `POR-05` |
| F14 | Sedes `Sede Norte` / `Sede Sur` con ids del seed | seed existente | `sedeId` (`ING-08`), multi-sede (`CONF-03`) |

Supuestos: cada test crea sus fixtures y limpia al terminar; sin dependencia entre archivos;
ningun fixture reutiliza estado de otra corrida; fechas siempre relativas a hoy (Bogota).

## Evidencia requerida por criterio

| Criterio(s) | Integracion API (Vitest) | Unit/UI (Vitest web) | E2E (Playwright) | Gherkin (`features/*.feature`) |
|---|---|---|---|---|
| `VEN-01`, `VEN-02` | si (listado + ficha) | no | no | si |
| `VEN-03` | si (portal + recepcion) | si (portal) | **si** (portal y recepcion en navegador) | si |
| `VEN-04` | **si** (login/ingreso con vencimiento) | no | **si** (bloqueo observable) | si (escenarios marcados hasta `PEND-01/02`) |
| `VEN-05` | si (mismo estado en 4 lecturas) | no | no | si |
| `POR-01..04`, `POR-06`, `POR-07` | si | si (componente portal) | **si** | si |
| `POR-05` | si (401/403/200) | si (guard de rol) | si | si |
| `REC-01..04`, `REC-06..10` | si | si (pantalla de recepcion) | **si** | si |
| `REC-05` | si (una vez resuelto `PEND-03`) | si | si | si (hasta `PEND-03`: no se escribe) |
| `ING-01..09`, `ING-11` | si | si (boton/estado en UI) | **si** | si |
| `ING-10` | si (una vez resuelto `PEND-05`) | no | no | si (hasta `PEND-05`: no se escribe) |
| `RAP-01..07` | si | si (formulario de recepcion) | **si** | si (hasta `PEND-06/07/08`: no se escriben las ramas afectadas) |
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
- [ ] **`INC03-PEND-01..08` resueltos por Producto y registrados en
      `docs/producto/decisiones.md`** -> **bloqueante**.
- [ ] Contrato **ratificado por `backend-developer`** (ajustes de paths/bodies/errores sobre
      este borrador, igual que INC-02) -> **bloqueante**.
- [ ] Regla de **no duplicado** (HU-16 vs bloque 4) asignada por el orquestador para el
      reparto de puntos (abierto #3 de HU-16) -> afecta al cierre, no al RED.
- [ ] Confirmaciones `CONF-01..06` registradas (opcion por defecto adoptada en este spec).

## Plan de ejecucion por agente

| Paso | Agente | Entrega | Criterios | Depende de |
|---:|---|---|---|---|
| 1 | acceptance-criteria-analyst | `spec.md`, `tareas.md`, `evidencia.md` (este paquete) | todos | - (hecho 2026-10-09) |
| 2 | Orquestador + Producto | Resolver `INC03-PEND-01..08` -> `decisiones.md`; estado `BLOQUEADO -> ESPECIFICADO` | `VEN-04`, `REC-01/05`, `ING-10`, `RAP-01/02/03` | paso 1 |
| 3 | backend-developer | Ratificar contrato (endpoints, bodies, errores, orden) en este spec | todos | paso 2 |
| 4 | Orquestador | Puerta **LISTO**: checklist completa -> `tareas.md` en ejecucion | - | pasos 2-3 |
| 5 | test-engineer | **RED**: integracion API + unit web + escenarios Gherkin (sin tocar `src/`) | todos los no bloqueados | paso 4 |
| 6 | database-admin | Migracion `Ingreso` (+ `perfilPendiente`/`foto` segun PEND) + fixtures/seed | `ING-*`, `RAP-01/02` | paso 4 |
| 7 | backend-developer | **GREEN** API: `recepcion.ts` (consulta, ingresos, clientes-rapidos), `portal.ts`, unificacion de fuente de estado, guardas de vigencia en login si `PEND-01` | `VEN-*`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | pasos 5-6 |
| 8 | frontend-developer | **GREEN** UI: portal con datos reales (fin del hardcode), pantalla de recepcion (consulta + ingreso + alta rapida), marca de perfil pendiente | `VEN-03`, `POR-*`, `REC-*`, `ING-*`, `RAP-*` | paso 7 |
| 9 | test-engineer | **VERIFICADO**: E2E real, bateria completa, registro en `evidencia.md` | todos | paso 8 |
| 10 | code-reviewer | **REVISADO**: seguridad/permisos, DEC-005/006/017/025, no duplicado, calidad de pruebas | todos | paso 9 |
| 11 | Orquestador | Certificacion: `avance.md`, `mvp.md`, `auditoria-puntos-inc00.md` (+11 solo si la revision no bloquea) | todos | paso 10 |

## Decisiones pendientes (bloquean la puerta LISTO)

Ninguna de estas reglas esta aprobada en `docs/producto/decisiones.md`; **no se inventan
 aqui**. PEND-003 (anamnesis) no pertenece a este incremento (DEC-021).

| ID | Pregunta concreta a Producto | Opciones | Criterio(s) afectado(s) | Responsable |
|---|---|---|---|---|
| `INC03-PEND-01` | **P1 de HU-16**: cuando una vigencia esta `VENCIDA`, **que se bloquea exactamente y en que punto**? | **(A)** `POST /auth/login-cliente` rechaza `401/403 VIGENCIA_VENCIDA` si el cliente no tiene **ningun** servicio vigente; **(B)** login identico (es identidad/PIN), el portal muestra el servicio vencido sin acceso y **recepcion/HU-30 rechaza el ingreso**; **(C)** mixta: login permitido, portal solo-lectura con `VENCIDA`, ingreso denegado en recepcion | `VEN-04` (**BLOQUEADO**), contrato #7, ramas de #2/#3 | Producto + Orquestador |
| `INC03-PEND-02` | **P2 de HU-16**: cliente con `GYM` vencido y `NUTRICION` vigente (DEC-004 multi-servicio), **puede autenticarse y usar el servicio vigente**? | **(a)** si, accede al vigente (portal muestra GYM `VENCIDA` + NUTRICION `ACTIVA`); **(b)** no, cualquier servicio vencido bloquea; **(c)** regla por tipo de servicio (solo GYM condiciona acceso a sede) | `VEN-04` (**BLOQUEADO**), fixture F8 | Producto |
| `INC03-PEND-03` | **HU29-AB-01**: que es una **"alerta operativa no sensible"** y de donde sale? | **(a)** derivada de estados (`ESTADO_CLIENTE` cuando `estado != ACTIVO`; `MEMBRESIA_VENCIDA` cuando `estadoAccesoGym = VENCIDA`), **(b)** texto libre que recepcion registra por cliente (exigiria modelo + endpoint nuevos), **(c)** ambos. Ademas: confirmar exclusiones (anamnesis, notas de salud, email, telefono, PIN) | `REC-05` (**BLOQUEADO**), b5 de HU-29 | Producto (+ Backend si es (b)) |
| `INC03-PEND-04` | **HU29-AB-02**: se crea el campo **`Cliente.foto` (URL)** en INC-03? | **(a)** si, migracion con `foto String?` (la UI puede poblarlo despues); **(b)** no, el contrato mantiene `foto: null` y el bullet se acredita como "campo opcional ausente" | `REC-01` (**BLOQUEADO**; la forma `string \| null` no cambia), modelo | Producto + database-admin |
| `INC03-PEND-05` | **HU30-AB-01**: un cliente `SUSPENDIDO` o `RETIRADO` con membresia gym `ACTIVA` **puede registrar ingreso**? | **(a)** si, solo cuenta la membresia (lectura literal de HU-30); **(b)** no, `403 INGRESO_NO_PERMITIDO` (coherente con HU-17, aclarando que HU-17/INC-04 es otro alcance) | `ING-10` (**BLOQUEADO**), orden de errores #3 | Producto |
| `INC03-PEND-06` | **HU31-AB-01**: en la creacion rapida, **`sedeId` es obligatorio** (como HU-04) o **usa por defecto la sede del recepcionista**? | **(a)** obligatorio -> minimo de 5 campos (`cedula,nombres,apellidos,telefono,sedeId`); **(b)** default sede del token -> minimo de 4 y hay que exponer/derivar la sede en la respuesta | `RAP-01` (**BLOQUEADO**), cuerpo #5 | Producto (+ Backend) |
| `INC03-PEND-07` | **HU31-AB-02**: la marca "perfil requiere completarse" es un **campo `Cliente.perfilPendiente Boolean @default(false)`** o se **deriva** de datos faltantes (p. ej. `email == null`)? | **(a)** campo nuevo (simple, explicito, migracion de 1 columna); **(b)** derivacion (sin columna, pero la regla queda en el codigo y obliga a definirla junto con `PEND-08`) | `RAP-02` (**BLOQUEADO**), modelo | Producto + database-admin |
| `INC03-PEND-08` | **HU31-AB-03**: **que condicion exacta limpia `perfilPendiente`**? | **(a)** cualquier `PATCH` exitoso del dueño, **(b)** solo al tener `email`, **(c)** `email` + `observaciones`, **(d)** accion manual "marcar como completo" | `RAP-03` (**BLOQUEADO parcial**: la completitud de campos se prueba igual) | Producto |

### Confirmaciones no bloqueantes (opcion por defecto adoptada; ratificar en LISTO)

| ID | Tema | Opcion por defecto adoptada en este spec | Fuente |
|---|---|---|---|
| `CONF-01` | El "detecta" de HU-16 b1 se satisface con **deteccion derivada en cada lectura** (sin job/cron) mientras las 3 superficies usen la misma fuente | Aceptar derivacion | abierto #5 de `HU-16-criterios-aceptacion.md` |
| `CONF-02` | `CONGELADO` permite ingreso -> **201** | Mantener **DEC-025** (acceso conservado); si Producto lo cambia, hay que enmendar DEC-025 explicitamente y la rama vuelve a 403 | `decisiones.md:33,45`; `HU30-AB-08` |
| `CONF-03` | Varios ingresos del mismo dia **en sedes distintas** | Permitir (la HU no lo restringe) | `HU30-AB-03` |
| `CONF-04` | Etiquetas UI del estado | Rotulos en espanol (`Activo`, `Vencido`, `Programado`, `Congelado`, `Sin vigencia`) mapeados desde el enum; la API siempre devuelve el enum | `HU25-AB-02` |
| `CONF-05` | Quien completa el perfil rapido | Se mantiene HU-05: `DUENO` y `RECEPCIONISTA` (la HU solo exige que el **dueno pueda**) | precedente HU-05 aceptado; `HU31-AB-04` |
| `CONF-06` | Persistencia de la hora de ingreso | String `HH:mm:ss` America/Bogota (consistente con las fechas string de `MembresiaGym`) | `HU30-AB-06` |

## Riesgos

| ID | Riesgo | Impacto | Mitigacion | Responsable |
|---|---|---|---|---|
| `INC03-R01` | `PEND-01` opcion A (bloquear login) choca con HU-02 ya **aceptada 4/4** (login solo valida cedula+PIN) | Regresion de criterios aceptados y de E2E existentes | Requiere enmienda explicita de HU-02/decision en `decisiones.md` antes de implementar; ponderar opcion B/C | Producto + Orquestador |
| `INC03-R02` | Duplicado de puntos HU-16 vs bloque 4 (regla 3 de la auditoria) | Contar dos veces el mismo "vencido en portal/recepcion" | Asignacion unica del criterio al cierre, en `auditoria-puntos-inc00.md`; este spec ya marca la acreditacion | Orquestador |
| `INC03-R03` | `PEND-03` opcion (b) (alertas con texto libre) implica modelo + endpoint + UI nuevos | Subida de alcance dentro de INC-03 | Si Producto elige (b), estimar y aprobar ampliacion antes del RED | Orquestador + Backend |
| `INC03-R04` | Corregir la fuente de estado de la ficha (`cliente.service.ts:144-149` sin pausas) puede regresar pruebas ya aceptadas de INC-00/INC-01/INC-02 | Regresion de 379/379 API | RED primero sobre la divergencia; no tocar `calcularEstado`, solo su llamada/select | Backend + QA |
| `INC03-R05` | Bloque 4 = 10 puntos **sin ponderar por HU** (`auditoria:120`) | Desacuerdo al repartir fracciones | Fijar el reparto con el orquestador antes de certificar | Orquestador |
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
| DEC-004 (servicios separados) | `PEND-02` (multi-servicio); `tipoServicio` en fixtures F8 |
| DEC-005 (America/Bogota) | `fecha`/`hora` de ingreso, `hoy` de toda evaluacion |
| DEC-006 (inclusivos) | Bordes `fechaFin`/`fechaInicio` en `VEN-01`, `POR-07`, `ING-11` |
| DEC-007 (renovar = periodo nuevo) | Transicion `VENCIDA -> ACTIVA` sin flag obsoleto (`VEN-02`) |
| DEC-012 / DEC-013 | Aislamiento SQLite y fixtures dinamicos |
| DEC-016 (fraccionable) | Reparto por bullet; este spec no declara puntos |
| DEC-017 (recepcion gestiona vigencias) | `POST .../congelar` etc. ya en INC-02; en INC-03 recepcion **lee** vigencias via consulta e ingreso con roles staff |
| DEC-025 (congelacion no bloquea acceso) | Rama `CONGELADO -> 201` en `ING-04`; INC-03 no implementa bloqueo por pausa (`CONF-02`) |
| DEC-021 / PEND-003 | Anamnesis **fuera** de este incremento |
