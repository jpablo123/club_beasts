# Criterios de Aceptación - HU-29: Consulta de cliente por cédula en recepción

- Origen: `historias-usuario-gimnasio.md` §4.8 HU-29 (líneas 468-482).
- Incremento: INC-03 (`docs/producto/avance.md:127`).
- Paquete G14: 2026-10-08. Pendiente de spec en `docs/incrementos/INC-03/spec.md`.
- Estado de este documento: borrador de especificación (no cuenta puntos sin spec + implementación + prueba + evidencia + revisión, DEC-016).

## Resumen

Recepción consulta a un cliente por cédula y obtiene en una sola llamada todo lo necesario para decidir si puede ingresar: identidad, sede, foto (opcional), estado de acceso al gym, vencimiento, congelación, último ingreso y alertas operativas. Hoy no existe endpoint ni pantalla de consulta en recepción (`docs/producto/auditoria-puntos-inc00.md:125`: 11 rutas inventariadas, ninguna de recepción).

**Nota de rutas**: el backend no registra prefijo `/api` (`club-beasts-api/src/index.ts:23-25`); la ruta se llama como `${API_URL}/recepcion/consulta?cedula=...`.

**No duplicado con HU-16 (auditoría regla 3)**: los bullets de HU-16 ("el estado se refleja ... en recepcion" y "el cliente deja de tener acceso al servicio vencido") se acreditan **una sola vez en HU-16**. Aquí solo se cubre la **parte de consulta**: que recepción reciba y muestre el estado real devuelto por el backend.

## Mapa de bullets -> IDs de criterio

| Bullet de la HU (línea) | ID criterio | Nota |
|---|---|---|
| b1 - "La consulta muestra nombre completo, cedula, sede principal y foto opcional." (478) | `HU29-C01` | `foto` no existe como campo en `Cliente` → HU29-AB-02 |
| b2 - "La consulta muestra el estado de acceso al gym." (479) | `HU29-C02` | Efecto "vencido = sin acceso" → **HU-16** |
| b3 - "La consulta muestra fecha de vencimiento y congelacion si aplica." (480) | `HU29-C03` | Vencimiento → **HU-16**; congelación → INC-02 (HU-15) |
| b4 - "La consulta muestra el ultimo ingreso registrado." (481) | `HU29-C04` | Requiere el modelo `Ingreso` de HU-30 |
| b5 - "La consulta muestra alertas operativas no sensibles si existen." (482) | `HU29-C05` | **BLOQUEADO**: definición de "alerta operativa" es decisión de Producto |
| (transversal) validación de cédula | `HU29-C06` | DEC-002 + regex HU-04 |
| (transversal) cédula inexistente | `HU29-C07` | |
| (transversal) permisos de recepción | `HU29-C08` | DEC-001 |
| (transversal) unicidad de la cédula | `HU29-C09` | DEC-002, `Cliente.cedula @unique` (HU-04) |
| (transversal) no exposición de datos sensibles | `HU29-C10` | |

## Criterios detallados

### HU29-C01 — Identidad, sede y foto opcional
- **Condición previa**: cliente existe con `cedula` única (HU-04/DEC-002) y `sedeId` asignado.
- **Disparo**: `GET /recepcion/consulta?cedula=1234567890` con token `DUENO` o `RECEPCIONISTA`.
- **Resultado observable**: HTTP **200** con `nombreCompleto` (nombres + apellidos), `cedula`, `sede.{id,nombre}` y `foto` (`string | null`; hoy siempre `null` mientras no exista campo de foto).
- **Códigos de error asociados**: 400 `VALIDATION_ERROR` (formato), 404 `NOT_FOUND`, 401/403 (auth), 409 no aplica (la consulta no crea).
- **NO cubre**: edición de datos (HU-05); alta de cliente (HU-04/HU-31); carga de fotos (no existe funcionalidad).

### HU29-C02 — Estado de acceso al gym en recepción
- **Condición previa**: cliente con o sin vigencia gym; `fechaActual` en `America/Bogota` (DEC-005).
- **Disparo**: `GET /recepcion/consulta?cedula=...`.
- **Resultado observable**: HTTP **200** con `estadoAccesoGym ∈ {ACTIVA, VENCIDA, PROGRAMADA, CONGELADO, SIN_VIGENCIA}` calculado por el backend (`calcularEstado`, `membresia.service.ts:18-40`); la pantalla de recepción lo pinta tal cual.
- **Códigos de error asociados**: 400 / 404 / 401 / 403.
- **NO cubre**: la detección del vencimiento ni el bloqueo de ingreso/acceso → **HU-16** (regla 3 de no duplicado); el cálculo del estado `CONGELADO` (ya acreditado en **INC-02/HU-15**); la ficha administrativa (HU-07).

### HU29-C03 — Fecha de vencimiento y congelación si aplica
- **Condición previa**: con vigencia gym (vencimiento) o con congelación vigente (INC-02).
- **Disparo**: `GET /recepcion/consulta?cedula=...`.
- **Resultado observable**: HTTP **200** con `fechaVencimiento = fechaFin` (`YYYY-MM-DD`) de la vigencia gym vigente; `congelacion = {fechaInicio, fechaFin}` si hay rango vigente, `null` si no. Día exacto de vencimiento → sigue `ACTIVA` (DEC-006).
- **Códigos de error asociados**: 400 / 404 / 401 / 403.
- **NO cubre**: la propagación del vencido → **HU-16**; crear/editar congelaciones ni la extensión de `fechaFin` (HU-15); vigencias de personalizado/nutrición (DEC-004, HU-13/14).

### HU29-C04 — Último ingreso registrado
- **Condición previa**: existe al menos un registro en la entidad `Ingreso` (creada por HU-30) o no existe ninguno.
- **Disparo**: `GET /recepcion/consulta?cedula=...`.
- **Resultado observable**: HTTP **200** con `ultimoIngreso = {fecha, hora, sede.{id,nombre}}` del ingreso más reciente (orden por `fecha`/`hora` descendente), o `ultimoIngreso = null` si el cliente nunca ingresó.
- **Códigos de error asociados**: 400 / 404 / 401 / 403.
- **NO cubre**: registrar ingresos (HU-30); el historial completo de ingresos (HU-30 listado / HU-32 historial básico). **Dependencia interna**: mientras HU-30 no cree `Ingreso`, este criterio solo puede verificarse con `null` → fraccionable según DEC-016.

### HU29-C05 — Alertas operativas no sensibles (BLOQUEADO)
- **Condición previa**: definición de "alerta operativa" aprobada por Producto (ver HU29-AB-01).
- **Disparo**: `GET /recepcion/consulta?cedula=...`.
- **Resultado observable (provisional, requiere aprobación)**: HTTP **200** con `alertas: Array<{codigo, mensaje}>`; provisión mínima propuesta: `ESTADO_CLIENTE` cuando `estado ≠ ACTIVO` (SUSPENDIDO/RETIRADO/INACTIVO) y `MEMBRESIA_VENCIDA` cuando `estadoAccesoGym = VENCIDA`; `alertas = []` cuando no hay.
- **Códigos de error asociados**: 400 / 404 / 401 / 403.
- **NO cubre**: anamnesis, datos de salud, notas internas clínicas, PIN, email ni teléfono (ver HU29-C10).
- **Estado**: **BLOQUEADO** — no se implementa ni se puntúa hasta la respuesta de HU29-AB-01.

### HU29-C06 — Rechazo de cédula con formato inválido
- **Condición previa**: token de recepción válido.
- **Disparo**: `GET /recepcion/consulta?cedula=ABC` (o `123`, `12345678901`, vacío).
- **Resultado observable**: HTTP **400** con `{ error: "Cédula debe ser numérica de 6 a 10 dígitos", code: "VALIDATION_ERROR" }` (misma regex y mensaje que HU-04 / `src/schemas/common.schema.ts:3-6`).
- **NO cubre**: el registro/unicidad de la cédula (HU-04); el login del cliente con cédula (HU-02).

### HU29-C07 — Cédula inexistente
- **Condición previa**: cédula bien formada pero sin fila en `Cliente`.
- **Disparo**: `GET /recepcion/consulta?cedula=99999999`.
- **Resultado observable**: HTTP **404** con `{ error: "Cliente no encontrado", code: "NOT_FOUND" }`.
- **NO cubre**: altas ni fusiones de cliente.

### HU29-C08 — Permisos de recepción (DEC-001)
- **Condición previa**: tokens de los tres roles.
- **Disparo**: consulta con (a) sin token, (b) token `CLIENTE`, (c) token `DUENO`, (d) token `RECEPCIONISTA`.
- **Resultado observable**: (a) **401** `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED`; (b) **403** `AUTH_FORBIDDEN` (un cliente no consulta cédulas desde recepción); (c)(d) **200/404** según exista.
- **NO cubre**: recuperación de sesión (HU-02/03); guards de menú (HU-01).

### HU29-C09 — Unicidad de la cédula (DEC-002)
- **Condición previa**: `Cliente.cedula` con restricción `@unique` creada en HU-04.
- **Disparo**: consulta por una cédula existente.
- **Resultado observable**: HTTP **200** con **exactamente un** objeto cliente en la respuesta (nunca un array ni coincidencias múltiples); el dominio garantiza que no puede haber dos clientes con la misma cédula.
- **NO cubre**: el 409 de creación duplicada (HU-04 `CLI-*`); búsquedas por nombre (HU-06).

### HU29-C10 — La consulta no expone datos sensibles
- **Condición previa**: cliente con email, teléfono, PIN y observaciones cargados.
- **Disparo**: `GET /recepcion/consulta?cedula=...`.
- **Resultado observable**: HTTP **200** y el cuerpo **no contiene** `pin`, hash, anamnesis, notas internas de salud ni campos clínicos; el contrato queda limitado a los campos de `HU-29-schemas.ts`.
- **NO cubre**: la ficha completa para DUENO (HU-07); el resto de campos de la ficha (HU-04/HU-05).

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| cedula (query) | 6-10 dígitos, existente | `1234567890` | 6-10 dígitos inexistente | `99999999` |
| cedula (query) | - | - | formato inválido | `ABC`, `123`, `""` |
| rol token | DUENO, RECEPCIONISTA | JWT staff | CLIENTE, sin token | JWT cliente, - |
| vigencia gym | ACTIVA / VENCIDA / PROGRAMADA / sin fila | 2026-10-01..2026-11-30 | - | - |
| congelación | vigente / ninguna (INC-02) | 2026-10-05..2026-10-12 | - | - |
| último ingreso | con registros / sin registros | ingreso de ayer | - | `ultimoIngreso: null` |
| alertas | con alertas / sin alertas | SUSPENDIDO | **clase indefinida** | → HU29-AB-01 (BLOQUEADO) |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| cedula (dígitos) | num | 6 (`123456`) | 10 (`1234567890`) | 5 (`12345`) → 400 | 11 (`12345678901`) → 400 |
| cedula vacía | string | `""` → 400 | - | - | - |
| consulta repetida (mismo día) | int | 1 | ∞ (sin caché que envejezca el estado) | - | - |
| hoy vs fechaFin | fecha | `hoy = fechaFin` → ACTIVA | - | `hoy = fechaFin + 1` → VENCIDA | - |

## Tabla de Decisiones
### Consulta por cédula
| Token válido | Rol | Cédula formato ok | Cédula existe | Acción |
|---|---|---|---|---|
| no | - | * | * | 401 `AUTH_TOKEN_*` |
| sí | CLIENTE | * | * | 403 `AUTH_FORBIDDEN` |
| sí | DUENO/RECEPCIONISTA | no | * | 400 `VALIDATION_ERROR` "Cédula debe ser numérica de 6 a 10 dígitos" |
| sí | DUENO/RECEPCIONISTA | sí | no | 404 `NOT_FOUND` "Cliente no encontrado" |
| sí | DUENO/RECEPCIONISTA | sí | sí | 200 con el contrato de `HU-29-schemas.ts` |

### Contenido de la respuesta (alertas — provisional, BLOQUEADO por HU29-AB-01)
| estado cliente | estadoAccesoGym | `alertas` propuesto |
|---|---|---|
| ACTIVO/NUEVO | ACTIVA | `[]` |
| SUSPENDIDO/RETIRADO/INACTIVO | cualquiera | `[{codigo:"ESTADO_CLIENTE",...}]` |
| cualquiera | VENCIDA | `[{codigo:"MEMBRESIA_VENCIDA",...}]` |

## Transiciones de Estado
### Consulta (sin máquina de estados propia)
```
[consulta cedula] --400 formato invalido--> [sin lectura]
[consulta cedula] --404 no existe--> [sin lectura]
[consulta cedula] --200 existe--> [lectura de identidad + estado + vencimiento + congelacion + ultimo ingreso + alertas]
```
El estado expuesto (`estadoAccesoGym`) es el mismo calculado por HU-25/HU-16: `[PROGRAMADA] --hoy>=fechaInicio--> [ACTIVA] --hoy>fechaFin--> [VENCIDA]` con extremos inclusivos (DEC-006).

## Cobertura de Ramas
### Ruta: GET /recepcion/consulta
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | cédula existente, vigencia activa | 200 identidad + sede + `ACTIVA` + vencimiento + `congelacion:null` |
| 2 | Cédula inválida | `?cedula=ABC` | 400 `VALIDATION_ERROR` |
| 3 | Cédula de 5 dígitos | `?cedula=12345` | 400 `VALIDATION_ERROR` |
| 4 | Cédula de 11 dígitos | `?cedula=12345678901` | 400 `VALIDATION_ERROR` |
| 5 | Cédula inexistente | `?cedula=99999999` | 404 `NOT_FOUND` |
| 6 | Sin token | sin Authorization | 401 `AUTH_TOKEN_*` |
| 7 | Rol CLIENTE | token cliente | 403 `AUTH_FORBIDDEN` |
| 8 | Rol DUENO / RECEPCIONISTA | token staff, cédula válida | 200 |
| 9 | Sin vigencia gym | cliente sin `MembresiaGym` | 200 `SIN_VIGENCIA`, `fechaVencimiento:null` |
| 10 | Día del vencimiento | `hoy = fechaFin` | 200 `ACTIVA` (inclusivo) |
| 11 | Vencida | `hoy = fechaFin + 1` | 200 `VENCIDA` (el bloqueo de ingreso lo acredita HU-16/HU-30) |
| 12 | Con congelación vigente (INC-02) | rango 2026-10-05..2026-10-12 | 200 `CONGELADO` + rango — **habilitado: INC-02 aceptado 2026-10-08** |
| 13 | Último ingreso | 2 ingresos previos | 200 `ultimoIngreso` = el más reciente |
| 14 | Nunca ingresó | sin filas `Ingreso` | 200 `ultimoIngreso:null` |
| 15 | Sin alertas | cliente ACTIVO, vigente | 200 `alertas: []` — **BLOQUEADO por HU29-AB-01** |
| 16 | Sin datos sensibles | cliente con pin/email/teléfono | 200 sin `pin`, sin anamnesis, sin notas de salud |

## Reglas de Validación por Campo
### Query
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| cedula | string | sí | `/^\d{6,10}$/` | 6-10 | numérico (DEC-002, mismo `cedulaSchema` de HU-04) |

### Respuesta
| Campo | Tipo | Requerido | Regex / Valores | Longitud | Notas |
|-------|------|-----------|-----------------|----------|-------|
| id | string | sí | - | 1-36 | |
| nombreCompleto | string | sí | letras y espacios | 2-201 | nombres + apellidos |
| cedula | string | sí | `/^\d{6,10}$/` | 6-10 | |
| sede.id / sede.nombre | string | sí | - | 1-36 / 1-100 | |
| foto | string \| null | sí (nullable) | URL o `null` | - | hoy siempre `null` (HU29-AB-02) |
| estadoAccesoGym | enum | sí | `ACTIVA\|VENCIDA\|PROGRAMADA\|CONGELADO\|SIN_VIGENCIA` | - | calculado en backend |
| fechaVencimiento | string \| null | sí (nullable) | `/^\d{4}-\d{2}-\d{2}$/` | 10 | DEC-006 |
| congelacion | object \| null | sí (nullable) | fechas `YYYY-MM-DD` | - | INC-02 |
| ultimoIngreso | object \| null | sí (nullable) | fecha `YYYY-MM-DD`, hora `HH:mm(:ss)` | - | requiere HU-30 |
| alertas | array | sí | `{codigo, mensaje}` | 0..n | **BLOQUEADO** HU29-AB-01 |
| fechaActual | string | sí | `/^\d{4}-\d{2}-\d{2}$/` | 10 | `America/Bogota` |

## Escenarios Gherkin (borrador — los conecta `test-engineer` en el RED; NO crear `.feature` desde aquí)

```gherkin
Feature: Consulta de cliente por cedula en recepcion (HU-29)
  Como recepcionista
  Quiero consultar un cliente por su cedula
  Para validar rapidamente si puede ingresar

  Background:
    Given soy un usuario autenticado como RECEPCIONISTA

  # Happy path
  Scenario: La consulta devuelve identidad, sede y estado de acceso
    Given existe el cliente con cedula "1234567890" en la sede "Sede Norte"
    And la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-10-08"
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el cuerpo contiene nombre completo, cedula "1234567890" y sede "Sede Norte"
    And el campo "estadoAccesoGym" es "ACTIVA"
    And el campo "fechaVencimiento" es "2026-11-30"
    And el campo "foto" es nulo

  Scenario: El rol DUENO tambien puede consultar
    Given soy un usuario autenticado como DUENO
    And existe el cliente con cedula "1234567890"
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200

  # Validacion por campo (DEC-002 / regex HU-04)
  Scenario Outline: Rechazar cedula con formato invalido
    When consulto "GET /recepcion/consulta?cedula=<cedula>"
    Then la respuesta HTTP es 400
    And el cuerpo contiene codigo "VALIDATION_ERROR" y mensaje "Cédula debe ser numérica de 6 a 10 dígitos"

    Examples:
      | cedula |
      | ABC |
      | 12345 |
      | 12345678901 |
      |  |

  Scenario: Cedula inexistente responde 404
    When consulto "GET /recepcion/consulta?cedula=99999999"
    Then la respuesta HTTP es 404
    And el cuerpo contiene codigo "NOT_FOUND" y mensaje "Cliente no encontrado"

  # Valores limite de vigencia (DEC-005 / DEC-006)
  Scenario: Dia exacto del vencimiento sigue habilitado en recepcion
    Given existe el cliente con cedula "1234567890"
    And la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-11-30"
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "ACTIVA"

  Scenario: Un dia despues del vencimiento recepcion ve VENCIDA
    Given existe el cliente con cedula "1234567890"
    And la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-12-01"
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "VENCIDA"

  # Ultimo ingreso (depende del modelo Ingreso de HU-30)
  Scenario: La consulta muestra el ultimo ingreso registrado
    Given existe el cliente con cedula "1234567890"
    And el cliente registro un ingreso el "2026-10-07" a las "18:30" en la sede "Sede Norte"
    And el cliente registro un ingreso el "2026-10-08" a las "07:15" en la sede "Sede Norte"
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el campo "ultimoIngreso.fecha" es "2026-10-08"
    And el campo "ultimoIngreso.hora" es "07:15"

  Scenario: Cliente que nunca ingreso no tiene ultimo ingreso
    Given existe el cliente con cedula "1234567890" sin ingresos previos
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el campo "ultimoIngreso" es nulo

  # Permisos (DEC-001)
  Scenario: Sin token no se consulta
    Given no estoy autenticado
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 401

  Scenario: Un cliente autenticado no usa la consulta de recepcion
    Given soy un usuario autenticado como CLIENTE
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 403
    And el cuerpo contiene codigo "AUTH_FORBIDDEN"

  # Privacidad
  Scenario: La consulta no expone datos sensibles
    Given existe el cliente con cedula "1234567890" con pin, email y telefono cargados
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el cuerpo no contiene el campo "pin"
    And el cuerpo no contiene datos de anamnesis ni notas de salud

  # Habilitado: INC-02 (HU-15) aceptado 2026-10-08
  @inc-02-cerrado
  Scenario: Recepcion ve el rango de congelacion
    Given existe el cliente con cedula "1234567890"
    And la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And el cliente tiene una congelacion de "2026-10-05" a "2026-10-12"
    And la fecha actual en America/Bogota es "2026-10-08"
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el campo "estadoAccesoGym" es "CONGELADO"
    And el campo "congelacion.fechaInicio" es "2026-10-05"
    And el campo "congelacion.fechaFin" es "2026-10-12"

  # BLOQUEADO por HU29-AB-01: no escribir en RED hasta que Producto responda
  @bloqueado-producto
  Scenario: La consulta muestra alertas operativas no sensibles
    Given existe el cliente con cedula "1234567890" con estado "SUSPENDIDO"
    When consulto "GET /recepcion/consulta?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el campo "alertas" contiene el codigo "ESTADO_CLIENTE"
```

## Contrato API propuesto (para `test-engineer` y `backend-developer`)

- **Endpoint**: `GET /recepcion/consulta?cedula=<cedula>` — `preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])]` (DEC-001, coherente con `src/routes/clientes.ts:77`).
- **Request**: query `cedula` requerida (schema en `HU-29-schemas.ts` → `consultaCedulaQuerySchema`).
- **Respuesta 200**: `consultaRecepcionResponseSchema`.
- **Errores**: 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`, 401 `AUTH_TOKEN_*`, 403 `AUTH_FORBIDDEN` (cuerpo `{ error, code }`).

## Decisiones abiertas / dependencias

| ID | Tema | Estado | Pregunta concreta |
|---|---|---|---|
| HU29-AB-01 | **Alertas operativas no sensibles** (b5) | **BLOQUEADO** | **Pregunta a Producto: ¿qué es una "alerta operativa" y de dónde sale?** Opciones: (a) derivada de estados (SUSPENDIDO/RETIRADO/INACTIVO + membresía vencida), (b) texto libre que la recepción registra por cliente, (c) ambos. ¿Y qué campos quedan explícitamente fuera (anamnesis, notas de salud, email, teléfono)? Sin respuesta: el bullet b5 no se implementa ni se puntúa (DEC-016). |
| HU29-AB-02 | **Foto opcional** (b1) | **BLOQUEADO (dato)** | **Pregunta a Producto + database-admin: ¿se crea el campo `Cliente.foto` (URL) en INC-03?** Si no, el contrato mantiene `foto: null` y el bullet se acredita solo como "campo opcional ausente". |
| HU29-AB-03 | Último ingreso (b4) | Dependencia interna | Requiere la entidad `Ingreso` de HU-30 dentro del mismo INC-03. ¿Se implementa HU-30 antes que HU-29 en el incremento, o HU29-C04 sale fraccionado después? |
| HU29-AB-04 | Congelación (b3) | **RESUELTO: INC-02 ACEPTADO (2026-10-08)** | El estado `CONGELADO` y el rango existen y están probados (DEC-022..025); el rango se lee de `MembresiaGymCambio` (sin modelo nuevo). Habilitado para INC-03. |
| HU29-AB-05 | No duplicado con HU-16 | Regla aplicada | El efecto "vencido → recepción lo detecta / sin acceso" se acredita en **HU-16** (`HU16-C03`/`HU16-C04`, que citan a HU-29 como superficie); HU-29 solo acredita la consulta y el pintado. Confirmar al cierre para no contar dos veces. |

## Gaps vs código actual
- No existe ruta de recepción: `club-beasts-api/src/routes/` solo tiene `auth.ts`, `clientes.ts`, `membresia.ts`.
- `club-beasts-api/prisma/schema.prisma` no tiene entidad `Ingreso` (HU29-C04) ni campo `foto`
  en `Cliente` (HU29-AB-02). **La congelación no requiere modelo nuevo**: el rango vive en
  `MembresiaGymCambio.congelacionInicio` / `congelacionFin` (`schema.prisma:79-99`) y ya está
  acreditada por INC-02 (HU29-AB-04 resuelto).
- No hay pantalla de consulta por cédula en `club-beasts-web` (búsqueda de clientes de HU-06 es otra cosa).
- `src/schemas/common.schema.ts:3-6` ya provee `cedulaSchema` reutilizable para HU29-C06.
