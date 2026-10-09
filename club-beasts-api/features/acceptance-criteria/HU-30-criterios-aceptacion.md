# Criterios de Aceptación - HU-30: Registro de ingreso del cliente

- Origen: `historias-usuario-gimnasio.md` §4.8 HU-30 (líneas 484-497).
- Incremento: INC-03 (`docs/producto/avance.md:127`).
- Paquete G14: 2026-10-08. Pendiente de spec en `docs/incrementos/INC-03/spec.md`.
- Estado de este documento: borrador de especificación (no cuenta puntos sin spec + implementación + prueba + evidencia + revisión, DEC-016).

## Resumen

Recepción registra el ingreso de un cliente a una sede y el sistema solo lo permite si la membresía gym está habilitada. Cada ingreso queda persistido con fecha, hora, sede y usuario que lo registró, y es visible en el historial del cliente. Hoy no existe entidad `Ingreso` ni ruta de ingreso (`docs/producto/auditoria-puntos-inc00.md:126`).

**Nota de rutas**: el backend no registra prefijo `/api` (`club-beasts-api/src/index.ts:23-25`); las rutas se llaman como `${API_URL}/recepcion/ingresos`.

**No duplicado con HU-16 (auditoría regla 3)**: el bullet de HU-16 "el cliente deja de tener acceso al servicio vencido" y su prueba "vigencia vencida → recepcion lo bloquea" (`auditoria-puntos-inc00.md:180`) se acreditan **una sola vez en HU-16**. Aquí se cubre el **contrato del ingreso**: la rama de rechazo existe en el endpoint y se especifica, pero la acreditación del efecto "vencido = sin acceso" queda en HU-16 (nunca en ambos).

## Mapa de bullets -> IDs de criterio

| Bullet de la HU (línea) | ID criterio | Nota |
|---|---|---|
| b1 - "El sistema permite registrar multiples ingresos por dia." (494) | `HU30-C02` | Sin límite por día |
| b2 - "Cada ingreso guarda fecha, hora, sede y usuario que lo registro." (495) | `HU30-C03` | Trazabilidad obligatoria |
| b3 - "El sistema permite registrar ingreso solo si la membresia gym esta habilitada." (496) | `HU30-C04` + `HU30-C11` | Efecto "vencido" acreditado en **HU-16**; aquí la rama del endpoint |
| b4 - "El ingreso queda visible en el historial del cliente." (497) | `HU30-C05` | El historial agregado es HU-32 |
| (transversal) alta de ingreso | `HU30-C01` | Happy path |
| (transversal) cédula inexistente | `HU30-C06` | |
| (transversal) cédula inválida | `HU30-C07` | DEC-002, regex HU-04 |
| (transversal) sede requerida/inexistente | `HU30-C08` | |
| (transversal) permisos | `HU30-C09` | DEC-001 |
| (transversal) estado general del cliente | `HU30-C10` | **BLOQUEADO** — ver HU30-AB-01 |
| (transversal) extremos inclusivos de la vigencia | `HU30-C11` | DEC-005 / DEC-006 |

## Criterios detallados

### HU30-C01 — Registro exitoso de ingreso (happy path)
- **Condición previa**: cliente existe, tiene vigencia gym `ACTIVA` o `CONGELADO` hoy
  (`America/Bogota`; ver corrección DEC-025 en `HU30-C04`), sede destino existe, token
  `DUENO`/`RECEPCIONISTA`.
- **Disparo**: `POST /recepcion/ingresos` con `{ "cedula": "1234567890", "sedeId": "uid-sede-1" }`.
- **Resultado observable**: HTTP **201** con el ingreso persistido: `{ id, clienteId, cedula, fecha (YYYY-MM-DD), hora (HH:mm:ss), sede.{id,nombre}, registradoPor.{id,nombre}, createdAt }`.
- **Códigos de error asociados**: 400 `VALIDATION_ERROR`, 403 `INGRESO_NO_PERMITIDO`, 404 `NOT_FOUND`, 401/403 auth.
- **NO cubre**: la consulta previa del cliente (HU-29); el historial agregado (HU-32); la asistencia a clases (no existe en alcance).

### HU30-C02 — Múltiples ingresos por día
- **Condición previa**: cliente ya registró 1 (o n) ingresos hoy.
- **Disparo**: segundo y tercer `POST /recepcion/ingresos` en el mismo día calendario.
- **Resultado observable**: cada uno responde HTTP **201** y crea una fila nueva; no hay 409, límite ni deduplicación por día. También se permite registrar dos ingresos del mismo día en **sedes distintas** (la HU no lo restringe; ver HU30-AB-03).
- **NO cubre**: reportes de conteo por sede (HU-33); control de aforo/cupo (fuera de alcance).

### HU30-C03 — Trazabilidad completa del ingreso
- **Condición previa**: ingreso creado con token de un `RECEPCIONISTA` (o `DUENO`).
- **Disparo**: `POST /recepcion/ingresos` y luego lectura de la fila persistida.
- **Resultado observable**: la fila contiene `fecha` (día `America/Bogota`, DEC-005), `hora` (hora `America/Bogota`), `sedeId` (la del body) y `registradoPorId` = `request.user.id` del token; el listado los expone con nombre del usuario.
- **NO cubre**: edición o anulación de ingresos (no existe en la HU → HU30-AB-04); la auditoría de membresías (`MembresiaGymCambio`).

### HU30-C04 — Ingreso solo con membresía gym habilitada
- **Condición previa**: cliente con vigencia gym en uno de los estados posibles.
- **Disparo**: `POST /recepcion/ingresos` por cada estado.
- **Resultado observable**: `ACTIVA` o `CONGELADO` → **201**; `VENCIDA`, `PROGRAMADA` o
  sin vigencia → **403** con `{ error: <mensaje específico>, code: "INGRESO_NO_PERMITIDO" }`.
- **Corrección 2026-10-08 (DEC-025)**: la rama `CONGELADO` se alinea con la decisión
  **aprobada** DEC-025 — *"Durante la congelacion el cliente conserva el acceso al gimnasio
  y al portal ... la congelacion es una pausa de vigencia, no una suspension"* y
  *"si luego el Producto quiere bloquear la entrada durante la pausa, hay que cambiar esta
  decision explicitamente"* (`docs/producto/decisiones.md:33,46`; prevalece sobre este
  documento, `decisiones.md:45`). **Si Producto enmienda DEC-025, se revierte esta línea y
  la rama vuelve a 403** (ver `HU30-AB-08`).
- **Códigos de error asociados**: 403 `INGRESO_NO_PERMITIDO` (mensaje distinto por motivo:
  vencida / no iniciada / sin vigencia).
- **NO cubre**: la detección y propagación del vencimiento → **HU-16** (regla 3: esa acreditación no se repite aquí); crear/editar vigencias (HU-12); congelar (HU-15/INC-02); el bloqueo en el login del cliente (HU-16 "acceso").

### HU30-C05 — El ingreso queda visible en el historial del cliente
- **Condición previa**: al menos un ingreso registrado.
- **Disparo**: `GET /recepcion/ingresos?cedula=1234567890` (y opcional `&fecha=YYYY-MM-DD`).
- **Resultado observable**: HTTP **200** con `{ ingresos: [...], total }` ordenado por `fecha`/`hora` descendente; cada elemento con fecha, hora, sede y usuario; cliente sin ingresos → `{ ingresos: [], total: 0 }`.
- **NO cubre**: el historial básico agregado de cambios/rutinas/planes (HU-32); la ficha completa (HU-07).

### HU30-C06 — Cédula inexistente
- **Condición previa**: cédula bien formada sin fila `Cliente`.
- **Disparo**: `POST /recepcion/ingresos` con esa cédula.
- **Resultado observable**: HTTP **404** `{ error: "Cliente no encontrado", code: "NOT_FOUND" }`; **no** se crea ningún ingreso.
- **NO cubre**: crear el cliente (HU-31).

### HU30-C07 — Cédula con formato inválido
- **Condición previa**: token de recepción válido.
- **Disparo**: body con `cedula` = `ABC`, `12345`, `12345678901` o vacía.
- **Resultado observable**: HTTP **400** `{ error: "Cédula debe ser numérica de 6 a 10 dígitos", code: "VALIDATION_ERROR" }`; no se escribe nada.
- **NO cubre**: unicidad (HU-04) ni login (HU-02).

### HU30-C08 — sedeId requerido, mal formado o inexistente
- **Condición previa**: token de recepción válido.
- **Disparo**: (a) sin `sedeId`, (b) `sedeId` vacío o >36 chars, (c) `sedeId` UUID inexistente.
- **Resultado observable**: (a)(b) **400** `VALIDATION_ERROR` con mensaje de campo; (c) **400** `VALIDATION_ERROR` "La sede indicada no existe. Verifique el identificador enviado." (misma convención que `src/routes/clientes.ts:41-48`); no se escribe nada.
- **NO cubre**: gestión de sedes (HU-17/HU-33, fuera de este bloque).

### HU30-C09 — Permisos del registro de ingreso (DEC-001)
- **Condición previa**: tokens de los tres roles.
- **Disparo**: `POST /recepcion/ingresos` con (a) sin token, (b) rol `CLIENTE` (incluso con su propia cédula), (c) rol `DUENO`, (d) rol `RECEPCIONISTA`.
- **Resultado observable**: (a) **401** `AUTH_TOKEN_*`; (b) **403** `AUTH_FORBIDDEN` (un cliente no se registra su propio ingreso); (c)(d) **201/403/404** según reglas de negocio.
- **NO cubre**: recuperación de sesión (HU-02/03); guards de menú (HU-01).

### HU30-C10 — Estado general del cliente (BLOQUEADO)
- **Condición previa**: definición de Producto sobre estados generales (HU-17) aplicada al ingreso.
- **Disparo**: `POST /recepcion/ingresos` con cliente `SUSPENDIDO` o `RETIRADO` pero membresía gym `ACTIVA`.
- **Resultado observable (provisional)**: **201** — la HU solo condiciona por membresía gym.
- **Estado**: **BLOQUEADO** — ver HU30-AB-01; hasta la respuesta, este caso no se implementa ni se puntúa.

### HU30-C11 — Extremos inclusivos de la vigencia al decidir (DEC-005 / DEC-006)
- **Condición previa**: vigencia gym `2026-10-01` .. `2026-11-30`; fecha de prueba controlada.
- **Disparo**: `POST /recepcion/ingresos` con `hoy` = (1) `fechaInicio`, (2) `fechaFin`, (3) `fechaFin + 1`, (4) `fechaInicio - 1`.
- **Resultado observable**: (1) **201**, (2) **201** (día final incluido), (3) **403** `INGRESO_NO_PERMITIDO` (vencida), (4) **403** (programada).
- **NO cubre**: el algoritmo `calcularEstado` (MEM-01..07); la propagación a portal/recepción/acceso → **HU-16**.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| cedula | 6-10 dígitos existente | `1234567890` | Formato inválido / inexistente | `ABC`, `99999999` |
| sedeId | existente en `Sede` | `uid-sede-1` | Vacío / inexistente | `""`, `uid-xxx` |
| vigencia gym | ACTIVA o CONGELADO hoy | 2026-10-01..2026-11-30, hoy 2026-10-08 | VENCIDA / PROGRAMADA / sin fila | 2026-09-01..2026-10-01 |
| rol token | DUENO, RECEPCIONISTA | JWT staff | CLIENTE / sin token | JWT cliente |
| ingresos hoy | 0, 1, n | 3er ingreso del día | - | - |
| estado general cliente | ACTIVO/NUEVO | `ACTIVO` | SUSPENDIDO/RETIRADO | **clase indefinida** → HU30-AB-01 |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| ingresos por día | int | 1 | ∞ (sin límite) | 0 (aún no ingresó) | 2do/3er ingreso → 201 |
| cedula (dígitos) | num | 6 | 10 | 5 → 400 | 11 → 400 |
| hoy vs fechaFin (habilitado) | fecha | `hoy = fechaFin` → 201 | - | `hoy = fechaFin + 1` → 403 | - |
| hoy vs fechaInicio | fecha | `hoy = fechaInicio` → 201 | - | `hoy = fechaInicio - 1` → 403 | - |
| sedeId (longitud) | string | 1 | 36 | 0 (vacío) → 400 | 37 → 400 |

## Tabla de Decisiones
### Alta de ingreso
| Token válido | Rol | cedula ok | cliente existe | sedeId ok | vigencia gym | Acción |
|---|---|---|---|---|---|---|
| no | - | * | * | * | * | 401 `AUTH_TOKEN_*` |
| sí | CLIENTE | * | * | * | * | 403 `AUTH_FORBIDDEN` |
| sí | staff | no | * | * | * | 400 `VALIDATION_ERROR` (cédula) |
| sí | staff | sí | no | * | * | 404 `NOT_FOUND` |
| sí | staff | sí | sí | no | * | 400 `VALIDATION_ERROR` (sede) |
| sí | staff | sí | sí | sí | ACTIVA | **201 ingreso** |
| sí | staff | sí | sí | sí | VENCIDA | 403 `INGRESO_NO_PERMITIDO` (vencida) → efecto acreditado en **HU-16** |
| sí | staff | sí | sí | sí | PROGRAMADA | 403 `INGRESO_NO_PERMITIDO` (no iniciada) |
| sí | staff | sí | sí | sí | CONGELADO (INC-02) | **201 ingreso** (DEC-025: conserva acceso; ver `HU30-AB-08`) |
| sí | staff | sí | sí | sí | sin vigencia | 403 `INGRESO_NO_PERMITIDO` (sin vigencia) |

## Transiciones de Estado
### Ingreso (registro)
```
[no existe] --POST valido--> [REGISTRADO]     (sin estados posteriores: no hay edicion ni anulacion en alcance)
[no existe] --POST con membresia no habilitada--> [no existe] (403, sin escritura)
```
### Vigencia gym evaluada en el ingreso (misma máquina que HU-25/HU-16)
```
[PROGRAMADA] --hoy == fechaInicio--> [ACTIVA]
[ACTIVA]      --hoy == fechaFin (inclusivo)--> [ACTIVA]   (ultimo dia con ingreso permitido)
[ACTIVA]      --hoy == fechaFin + 1--> [VENCIDA]          (ingreso rechazado)
[ACTIVA]      --congelacion vigente (INC-02)--> [CONGELADO] (ingreso permitido, DEC-025)
```
Transiciones inválidas: `VENCIDA --> ACTIVA` sin nueva vigencia (DEC-007).

## Cobertura de Ramas
### Ruta: POST /recepcion/ingresos
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | cédula válida, vigencia ACTIVA, sede válida | 201 ingreso persistido con los 4 campos de trazabilidad |
| 2 | Segundo ingreso del día | repetir POST el mismo día | 201 fila nueva |
| 3 | Tercer ingreso / otra sede | repetir POST | 201 fila nueva |
| 4 | Cédula inválida | `cedula: "ABC"` | 400 `VALIDATION_ERROR` |
| 5 | Cédula inexistente | `cedula: "99999999"` | 404 `NOT_FOUND`, sin escritura |
| 6 | Sin `sedeId` | body sin sede | 400 `VALIDATION_ERROR` |
| 7 | `sedeId` inexistente | `sedeId: "uid-xxx"` | 400 `VALIDATION_ERROR` "La sede indicada no existe..." |
| 8 | Vigencia vencida | `hoy = fechaFin + 1` | 403 `INGRESO_NO_PERMITIDO` — **efecto acreditado en HU-16** |
| 9 | Vigencia programada | `hoy = fechaInicio - 1` | 403 `INGRESO_NO_PERMITIDO` |
| 10 | Día exacto de inicio | `hoy = fechaInicio` | 201 |
| 11 | Día exacto de fin | `hoy = fechaFin` | 201 (DEC-006) |
| 12 | Sin vigencia gym | cliente sin `MembresiaGym` | 403 `INGRESO_NO_PERMITIDO` |
| 13 | Congelado (INC-02) | congelación vigente | 201 (acceso conservado por DEC-025; ver `HU30-AB-08`) |
| 14 | Sin token | sin Authorization | 401 `AUTH_TOKEN_*` |
| 15 | Rol CLIENTE | token cliente | 403 `AUTH_FORBIDDEN` |
| 16 | Cliente SUSPENDIDO con vigencia activa | estado `SUSPENDIDO` | **BLOQUEADO** por HU30-AB-01 |
| 17 | Trazabilidad | lectura de la fila | `fecha`, `hora`, `sede`, `registradoPor` correctos (zona America/Bogota) |

### Ruta: GET /recepcion/ingresos
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Con ingresos | 2 ingresos previos | 200 lista ordenada desc por fecha/hora |
| 2 | Sin ingresos | cliente sin filas | 200 `ingresos: []`, `total: 0` |
| 3 | Filtro por fecha | `?fecha=2026-10-08` | 200 solo ese día |
| 4 | Cédula inválida | `?cedula=ABC` | 400 `VALIDATION_ERROR` |
| 5 | Sin permisos | token CLIENTE / sin token | 403 / 401 |

## Reglas de Validación por Campo
### Request POST /recepcion/ingresos
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| cedula | string | sí | `/^\d{6,10}$/` | 6-10 | numérico (DEC-002) |
| sedeId | string | sí | - | 1-36 | id existente en `Sede` |

### Query GET /recepcion/ingresos
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| cedula | string | sí | `/^\d{6,10}$/` | 6-10 | numérico |
| fecha | string | no | `/^\d{4}-\d{2}-\d{2}$/` | 10 | `YYYY-MM-DD` (America/Bogota) |

### Respuesta (ingreso)
| Campo | Tipo | Requerido | Regex / Valores | Longitud | Notas |
|-------|------|-----------|-----------------|----------|-------|
| id | string | sí | - | 1-36 | |
| clienteId | string | sí | - | 1-36 | |
| cedula | string | sí | `/^\d{6,10}$/` | 6-10 | |
| fecha | string | sí | `/^\d{4}-\d{2}-\d{2}$/` | 10 | America/Bogota (DEC-005) |
| hora | string | sí | `/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/` | 5-8 | America/Bogota |
| sede.id / sede.nombre | string | sí | - | 1-36 / 1-100 | |
| registradoPor.id / .nombre | string | sí | - | 1-36 / 1-100 | actor del token |
| createdAt | string | sí | ISO 8601 | - | |

## Escenarios Gherkin (borrador — los conecta `test-engineer` en el RED; NO crear `.feature` desde aquí)

```gherkin
Feature: Registro de ingreso del cliente en recepcion (HU-30)
  Como recepcionista
  Quiero registrar el ingreso del cliente a una sede
  Para llevar control de asistencia

  Background:
    Given soy un usuario autenticado como RECEPCIONISTA
    And existe la sede "Sede Norte" con id "uid-sede-norte"
    And existe el cliente con cedula "1234567890"

  # Happy path
  Scenario: Registrar un ingreso con membresia activa
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-10-08"
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201
    And el cuerpo contiene cedula "1234567890", fecha "2026-10-08", sede "Sede Norte"
    And el campo "registradoPor.id" es el id del usuario autenticado

  # b1: multiples ingresos por dia
  Scenario: Se permiten varios ingresos el mismo dia
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-10-08"
    And el cliente ya tiene un ingreso registrado hoy
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201
    And el listado de ingresos del dia tiene total 2

  # b2: trazabilidad
  Scenario: Cada ingreso guarda fecha, hora, sede y usuario
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201
    And la fila persistida tiene fecha, hora, sedeId y registradoPorId no nulos

  # b3: membresia habilitada (efecto "vencido" acreditado en HU-16)
  Scenario: Dia exacto del vencimiento aun permite ingresar
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-11-30"
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201

  Scenario: Un dia despues del vencimiento el ingreso se rechaza
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-12-01"
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 403
    And el cuerpo contiene codigo "INGRESO_NO_PERMITIDO"
    And no se creo ningun ingreso

  Scenario: Vigencia no iniciada rechaza el ingreso
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And la fecha actual en America/Bogota es "2026-09-30"
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 403
    And el cuerpo contiene codigo "INGRESO_NO_PERMITIDO"

  Scenario: Cliente sin membresia gym no puede ingresar
    Given el cliente no tiene membresia gym
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 403
    And el cuerpo contiene codigo "INGRESO_NO_PERMITIDO"

  # Validacion por campo
  Scenario Outline: Rechazar cedula invalida o sede inexistente
    When envio "POST /recepcion/ingresos" con cedula "<cedula>" y sedeId "<sedeId>"
    Then la respuesta HTTP es 400
    And el cuerpo contiene codigo "VALIDATION_ERROR"

    Examples:
      | cedula | sedeId |
      | ABC | uid-sede-norte |
      | 12345 | uid-sede-norte |
      | 12345678901 | uid-sede-norte |
      | 1234567890 |  |
      | 1234567890 | uid-xxx |

  Scenario: Cedula inexistente no crea ingreso
    When envio "POST /recepcion/ingresos" con cedula "99999999" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 404
    And el cuerpo contiene codigo "NOT_FOUND"
    And la cuenta de ingresos del cliente es 0

  # Permisos (DEC-001)
  Scenario: Sin token no se registra ingreso
    Given no estoy autenticado
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 401

  Scenario: Un cliente no se registra su propio ingreso
    Given soy un usuario autenticado como CLIENTE
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 403
    And el cuerpo contiene codigo "AUTH_FORBIDDEN"

  # b4: historial
  Scenario: El ingreso queda visible en el historial del cliente
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And se registro un ingreso del cliente el "2026-10-07" a las "18:30" en "Sede Norte"
    When consulto "GET /recepcion/ingresos?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el cuerpo contiene al menos 1 ingreso con fecha "2026-10-07", sede "Sede Norte" y usuario no nulo

  Scenario: Cliente sin ingresos devuelve historial vacio
    When consulto "GET /recepcion/ingresos?cedula=1234567890"
    Then la respuesta HTTP es 200
    And el campo "total" es 0

  # DEC-025 (aprobada 2026-10-08): durante la pausa el cliente conserva el acceso.
  # Si Producto enmienda DEC-025, este scenario vuelve a 403 INGRESO_NO_PERMITIDO.
  @dec-025
  Scenario: Cliente con membresia congelada puede ingresar
    Given la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    And el cliente tiene una congelacion de "2026-10-05" a "2026-10-12"
    And la fecha actual en America/Bogota es "2026-10-08"
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201

  # BLOQUEADO por HU30-AB-01: no escribir en RED hasta que Producto responda
  @bloqueado-producto
  Scenario: Cliente suspendido con vigencia activa
    Given el cliente tiene estado general "SUSPENDIDO"
    And la membresia gym del cliente va de "2026-10-01" a "2026-11-30"
    When envio "POST /recepcion/ingresos" con cedula "1234567890" y sedeId "uid-sede-norte"
    Then la respuesta HTTP es 201
```

## Contrato API propuesto (para `test-engineer` y `backend-developer`)

- **Alta**: `POST /recepcion/ingresos` — `preHandler: [fastify.authenticateRoles(["DUENO", "RECEPCIONISTA"])]` (DEC-001).
  - Request: `crearIngresoSchema` (`HU-30-schemas.ts`).
  - Respuesta: 201 `ingresoResponseSchema`.
- **Listado**: `GET /recepcion/ingresos?cedula=<cedula>[&fecha=YYYY-MM-DD]` — mismos roles.
  - Respuesta: 200 `ingresosListResponseSchema`.
- **Errores**: 400 `VALIDATION_ERROR`, 403 `INGRESO_NO_PERMITIDO` / `AUTH_FORBIDDEN`, 404 `NOT_FOUND`, 401 `AUTH_TOKEN_*` (cuerpo `{ error, code }`).
- **Modelo de datos requerido** (database-admin, fuera de los archivos de este paquete): entidad `Ingreso` con `clienteId`, `sedeId`, `registradoPorId`, `fecha` (string `YYYY-MM-DD`), `hora`, `createdAt`.

## Decisiones abiertas / dependencias

| ID | Tema | Estado | Pregunta concreta |
|---|---|---|---|
| HU30-AB-01 | **Estado general del cliente en el ingreso** | **BLOQUEADO** | **Pregunta a Producto: ¿un cliente `SUSPENDIDO` o `RETIRADO` puede registrar ingreso si su membresía gym está `ACTIVA`?** Opciones: (a) sí, solo cuenta la membresía (lectura literal de HU-30), (b) no, se rechaza con 403 `INGRESO_NO_PERMITIDO` (coherente con HU-17). Afecta permisos y UX → no se puntúa sin respuesta. |
| HU30-AB-02 | No duplicado con HU-16 | Regla aplicada | La prueba E2E "vigencia vencida → recepcion lo bloquea" (`auditoria:180`) se acredita en **HU-16** (`HU16-C04`, que cita a HU-30 como flujo y se queda solo con la denegación por vencimiento). HU-30 acredita el alta de ingreso y sus ramas; la rama "vencida → 403" se especifica y prueba aquí pero **el punto no se cuenta en ambos**: el orquestador lo asigna al bloque que cierre primero. Ver también P1 de `HU-16-criterios-aceptacion.md`. |
| HU30-AB-03 | Varias sedes el mismo día | Abierto (alcance) | ¿Se permite que el mismo cliente ingrese a dos sedes distintas el mismo día? Provisional: sí, sin restricción (la HU no lo limita). Confirmar con Producto si debe existir control. |
| HU30-AB-04 | Anulación/edición de ingresos | Fuera de alcance | La HU no lo menciona: si Producto lo pide, es un criterio nuevo (no se agrega implícitamente). |
| HU30-AB-05 | Congelación e ingreso | **RESUELTO: INC-02 ACEPTADO (2026-10-08)** | El estado `CONGELADO` y el rango existen y están probados (INC-02). **Regla aplicada**: ingreso **permitido** (201) durante la pausa, por DEC-025; ver corrección en `HU30-C04`. |
| HU30-AB-08 | **`CONGELADO` en el ingreso vs DEC-025** | **BLOQUEADO (confirmación)** | Este documento quedó alineado a la decisión aprobada **DEC-025** (acceso conservado durante la pausa). **Pregunta única a Producto**: ¿se mantiene DEC-025 para la recepción (CONGELADO → **201**, estado actual de este criterio) o se enmienda DEC-025 para bloquear la entrada durante la pausa (CONGELADO → **403** `INGRESO_NO_PERMITIDO`)? Afecta permisos y UX → sin confirmación explícita no se escribe el RED de la rama CONGELADO. |
| HU30-AB-06 | Hora del ingreso | Definición técnica | ¿Se persiste hora local `America/Bogota` como string `HH:mm:ss` (recomendado, consistente con las fechas string de `MembresiaGym`) o timestamp UTC con conversión en lectura? Confirmar en el spec de INC-03. |
| HU30-AB-07 | Interacción con P1 de HU-16 | Dependencia de decisión | Si Producto, al responder **P1** de `HU-16-criterios-aceptacion.md` (¿qué se bloquea con `VENCIDA`?), eligiera una opción que excluya el ingreso en recepción, **HU30-C04 se ajustaría**. La lectura literal de HU-30 b3 ("solo si la membresia gym esta habilitada") y la opción (B) de P1 coinciden: rechazo 403 en ingreso. Confirmar en el spec de INC-03 antes del RED. |

## Gaps vs código actual
- No existe entidad `Ingreso` en `club-beasts-api/prisma/schema.prisma` (auditado: `Sede`, `User`, `Cliente`, `MembresiaGym`, `MembresiaGymCambio`).
- No existe ruta ni servicio de ingresos: `club-beasts-api/src/routes/` solo tiene `auth.ts`, `clientes.ts`, `membresia.ts`.
- `club-beasts-web` no tiene pantalla de registro de ingreso.
- La evaluación de "membresía habilitada" debe reutilizar `calcularEstado` (`membresia.service.ts:18-40`) para no duplicar lógica de fechas.
