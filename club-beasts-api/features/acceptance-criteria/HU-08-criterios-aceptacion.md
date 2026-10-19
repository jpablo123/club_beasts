# Criterios de Aceptación - HU-08: Inactivación de clientes sin borrado físico

## Resumen

Inactivar un cliente en lugar de borrarlo: el estado pasa a `INACTIVO`, se conserva todo el historial, se registra quién hizo el cambio y por qué, y el cliente inactivo pierde el acceso (portal y servicios nuevos) hasta ser reactivado.

**Decisiones aplicadas**: DEC-001 (roles DUENO, RECEPCIONISTA, CLIENTE), DEC-002 (cédula identifica al cliente), DEC-020 (DUENO y RECEPCIONISTA pueden reactivar un cliente INACTIVO), DEC-016 (fraccionable: spec + implementación + prueba + evidencia + revisión), y de INC-04 (todas aprobadas 2026-10-14): **DEC-034** (login INACTIVO → 401 `AUTH_CLIENTE_INACTIVO`), **DEC-035** (`motivo` obligatorio en todo cambio), **DEC-036** (historial `ClienteEstadoCambio`), **DEC-037** (DUENO + RECEPCIONISTA), **DEC-039** (ingreso físico INACTIVO → 403 `INGRESO_NO_PERMITIDO`, criterio `INC04-CLI-07`), **DEC-040** (sesión JWT previa expira con TTL, sin revocación).

**Alcance anti-duplicado (auditoría G14)**: el bullet 1 ("cambiar el estado del cliente") ya está pagado en HU-05 (cambio de estado aceptado) y HU-06 (filtro por estado). Este documento solo aporta puntos por los bullets **distintivos**: conservación de historial (C02), motivo + actor (C03) y bloqueo de acceso + reactivación (C04/C05). `HU08-C01` queda como referencia trazable, **no puntuable en INC-04**.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado | Puntuable INC-04 |
|---|-----------------|-----------|--------|------------------|
| 1 | El sistema permite cambiar el estado del cliente a inactivo. | HU08-C01 | REF (base aceptada en HU-05/HU-06) | No (duplicado) |
| 2 | El sistema conserva su historial. | HU08-C02 | LISTO para RED | Sí |
| 3 | El sistema registra quien realizo el cambio y el motivo. | HU08-C03 | LISTO para RED | Sí |
| 4 | Un cliente inactivo no puede ingresar ni acceder a servicios activos nuevos sin ser reactivado. | HU08-C04 (bloqueo) + HU08-C05 (reactivación, DEC-020) | C04a LISTO (DEC-034); C04b LISTO (409 `CLIENTE_INACTIVO` decidido, `INC04-CLI-05`; ingreso físico INACTIVO → 403 DEC-039 = `INC04-CLI-07`); C04c LISTO (DEC-040); C05 LISTO | Sí |

## Detalle por criterio

### HU08-C01 — Cambiar el estado del cliente a inactivo (REF, no puntuable)
- **Condición previa**: cliente existente en estado X ≠ INACTIVO; actor autenticado con rol DUENO o RECEPCIONISTA (DEC-001).
- **Disparo**: `PATCH /clientes/:id` con `{ "estado": "INACTIVO", "motivo": "<texto>" }`.
- **Resultado observable**: 200; el estado `INACTIVO` persiste y se refleja en la ficha (`GET /clientes/:id`), en el listado y en el filtro `?estado=INACTIVO`.
- **HTTP / códigos**: 200 OK · 400 VALIDATION_ERROR (enum inválido: "Invalid enum value") · 404 NOT_FOUND · 403 AUTH_FORBIDDEN (rol CLIENTE).
- **Qué NO cubre**: motivo, actor e historial (→ HU08-C03), bloqueo de acceso (→ HU08-C04), borrado físico (→ HU08-C02).
- **Por qué REF**: el cambio de estado genérico ya fue aceptado en HU-05 (`INC00-CLI-02`, `tests/integration/clientes.test.ts:435-463`) y el filtro en HU-06 (`clientes.feature` C13). Contarlo de nuevo sería duplicación (auditoría, sección "anti-duplicado").
- **Prueba esperada**: la existente de HU-05; aquí no se exige prueba nueva.

### HU08-C02 — Conservar el historial sin borrado físico
- **Condición previa**: cliente con datos personales completos, sede, al menos una membresía y al menos un cambio de estado previo registrado.
- **Disparo**: inactivar al cliente (`PATCH /clientes/:id` → `INACTIVO`) y luego consultarlo.
- **Resultado observable**:
  - `GET /clientes/:id` → 200 con **todos** los campos originales (cédula, nombres, apellidos, teléfono, sede, membresías, `createdAt`) y `estado: "INACTIVO"`.
  - La cédula sigue siendo única y localizable: `GET /clientes?search=<cedula>` → 200 y el cliente aparece.
  - El historial de cambios **acumula** (count no decreciente): los registros previos a la inactivación siguen presentes junto al nuevo.
  - No existe operación de borrado físico: `DELETE /clientes/:id` no está publicado (Fastify responde 404 por ruta inexistente).
- **HTTP / códigos**: 200 OK · 404 NOT_FOUND (id inexistente) · 404 en `DELETE` (ruta no implementada).
- **Qué NO cubre**: visibilidad del historial en la UI (HU-07/HU-32), notas internas y anamnesis (bloque 5), borrado lógico de otros módulos.
- **Prueba esperada**: integración `hu08-inactivacion.test.ts` → "inactivar cliente conserva datos y crece el historial" + "DELETE /clientes/:id responde 404".

### HU08-C03 — Registra quién realizó el cambio y el motivo
- **Condición previa**: cliente existente con estado ≠ INACTIVO; actor autenticado DUENO o RECEPCIONISTA.
- **Disparo**: `PATCH /clientes/:id` con `{ "estado": "INACTIVO", "motivo": "Mudanza de ciudad" }`.
- **Resultado observable**:
  - 200 con `{ id, estado: "INACTIVO", motivo, actualizadoPorId: <id actor>, updatedAt, ultimoCambio: { estadoAnterior, estadoNuevo, motivo, actor, createdAt } }`.
  - En BD, dentro de la **misma transacción** del update: se persiste el `motivo`, el `actualizadoPorId` = actor y un registro de historial (estado anterior → nuevo, motivo, actor, fecha).
  - `GET /clientes/:id` refleja el último motivo.
- **HTTP / códigos**:
  - 200 OK.
  - 400 VALIDATION_ERROR — "Motivo es requerido cuando cambia el estado" (ausente), "Motivo debe tener al menos 3 caracteres" (2 chars), "Motivo no puede exceder 200 caracteres" (201 chars), "Invalid enum value" (estado fuera de NUEVO/ACTIVO/SUSPENDIDO/RETIRADO/INACTIVO).
  - 404 NOT_FOUND — id inexistente.
  - 403 AUTH_FORBIDDEN — rol CLIENTE.
- **Qué NO cubre**: registro de motivo en cambios a estados distintos de INACTIVO (→ HU17-C02, DEC-035), captura del motivo en el formulario web, motivo en edición de datos que no sea estado.
- **Orden de validación requerido**: primero formato/enum, luego existencia del cliente, luego permiso de rol, luego motivo.
- **Prueba esperada**: integración → "PATCH INACTIVO con motivo persiste motivo + actor + historial" (asertar respuesta **y** BD), "PATCH INACTIVO sin motivo → 400", "límites de motivo 2/3/200/201".

### HU08-C04 — Cliente inactivo no ingresa ni accede a servicios nuevos
Tres ramas fraccionables:

- **HU08-C04a — Bloqueo de acceso al portal**
  - **Condición previa**: cliente `INACTIVO` con PIN correcto registrado.
  - **Disparo**: `POST /auth/login-cliente` con `{ "cedula": "...", "pin": "1234" }`.
  - **Resultado observable**: 401 con `{ error: "La cuenta está inactiva. Contacte con recepción.", code: "AUTH_CLIENTE_INACTIVO" }` y **sin** `token`.
  - **Orden de chequeo obligatorio**: validar credenciales (cédula + PIN) **antes** de evaluar el estado → si el PIN es incorrecto la respuesta es el 401 genérico `AUTH_INVALID_CREDENTIALS` ("Cédula o PIN inválido"), sin revelar que la cuenta existe/está inactiva (evita enumeración de cédulas).
  - **HTTP / códigos**: 401 AUTH_CLIENTE_INACTIVO (inactivo + PIN ok) · 401 AUTH_INVALID_CREDENTIALS (PIN mal o cédula inexistente) · 400 VALIDATION_ERROR (formato).
  - **Qué NO cubre**: revocación de sesiones ya emitidas (→ HU08-C04c, decidido en DEC-040: sin revocación, expira por TTL), vigencia de membresía vencida en el login (HU-16), login del portal interno de usuarios (HU-01).
  - **Prueba esperada**: integración → "login cliente INACTIVO → 401 AUTH_CLIENTE_INACTIVO sin token", "login INACTIVO con PIN mal → 401 AUTH_INVALID_CREDENTIALS", "login ACTIVO → 200 (regresión HU-02)".

- **HU08-C04b — Sin servicios activos nuevos**
  - **Condición previa**: cliente `INACTIVO`.
  - **Disparo**: `POST /clientes/:clienteId/membresias-gym` (creación de vigencia nueva) u otra asignación futura de servicio.
  - **Resultado observable**: 409 con `{ error: "El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos.", code: "CLIENTE_INACTIVO" }`; no se crea ninguna fila.
  - **Gap G14 cerrado — ingreso físico (criterio `INC04-CLI-07`, DEC-039)**: `POST /recepcion/ingresos` con cliente `INACTIVO` → **403 `INGRESO_NO_PERMITIDO`** (mensaje `El cliente está INACTIVO y no puede registrar ingresos`), sin fila creada; la rama SUSPENDIDO/RETIRADO queda intacta del INC-03 (DEC-030, `INC03-ING-10`, no se re-cobra aquí).
  - **HTTP / códigos**: 409 CLIENTE_INACTIVO (decidido — `INC04-CLI-05`) · 403 INGRESO_NO_PERMITIDO (ingreso físico INACTIVO, DEC-039) · 404 NOT_FOUND (cliente) · 403 AUTH_FORBIDDEN (rol CLIENTE) · 201 si el cliente no está inactivo (regresión).
  - **Qué NO cubre**: servicios ya existentes del cliente (se conservan, ver C02), rutinas/planes futuros (aplicarán el mismo guard cuando existan: HU-13-C04/HU-14-C04), bloqueo de SUSPENDIDO/RETIRADO en el ingreso (ya pagado en INC-03, DEC-030).
  - **Prueba esperada**: integración → "POST membresías-gym con cliente INACTIVO → 409 CLIENTE_INACTIVO y count sin cambio" + "POST /recepcion/ingresos con cliente INACTIVO → 403 INGRESO_NO_PERMITIDO sin fila creada".

- **HU08-C04c — Sesión ya emitida antes de inactivar** — LISTO (DEC-040)
  - **Decidido — DEC-040** (`INC04-PEND-07`, opción (b), 2026-10-14): **no se revoca** la sesión JWT ya emitida al inactivar al cliente; expira con el TTL absoluto de 24 h (DEC-009). Los "servicios activos nuevos" del bullet b4 se refieren a asignaciones nuevas, no a lecturas de sesiones vivas.
  - **Criterio de INC-04**: `INC04-CLI-06` — prueba de **no-regresión** (sin cambio de código): la sesión abierta sigue funcionando hasta el TTL.

### HU08-C05 — Reactivación del cliente INACTIVO (DEC-020)
- **Condición previa**: cliente `INACTIVO`; actor DUENO o RECEPCIONISTA (DEC-020).
- **Disparo**: `PATCH /clientes/:id` con `{ "estado": "ACTIVO", "motivo": "Reactivación por regreso" }`.
- **Resultado observable**:
  - 200 con `estado: "ACTIVO"` y el motivo; historial registra `INACTIVO → ACTIVO` con actor y fecha (los registros anteriores se conservan).
  - El login del portal vuelve a responder 200 con token (HU08-C04a invertido).
  - Vuelve a permitirse crear servicios nuevos (HU08-C04b invertido).
- **HTTP / códigos**: 200 OK · 400 VALIDATION_ERROR (sin motivo o inválido) · 404 NOT_FOUND · 403 AUTH_FORBIDDEN (rol CLIENTE).
- **Qué NO cubre**: reactivación automática por pago, notificación al cliente, transiciones desde RETIRADO (→ HU17-C04, DEC-038: `RETIRADO` es terminal, 409 `TRANSICION_INVALIDA`), estado destino de la reactivación (ya fijado en la matriz DEC-038: `INACTIVO → ACTIVO`).
- **Prueba esperada**: integración → "RECEPCIONISTA reactiva INACTIVO → ACTIVO con motivo y historial" + "login tras reactivación → 200" + "DUENO reactiva → 200" + "CLIENTE → 403".

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| id (params) | UUID/cuid existente | uid-123 | No existe | uid-xxx |
| estado | Enum de 5 valores | INACTIVO | Fuera del enum | BLOQUEADO, inactivo |
| motivo | String 3-200 | "Mudanza de ciudad" | Vacío, <3, >200 | "", "No", 201 chars |
| rol actor | DUENO o RECEPCIONISTA | DUENO | CLIENTE / sin sesión | CLIENTE |
| cédula (login) | Registrada + estado INACTIVO + PIN ok | 1234567890 + 1234 | PIN incorrecto, no registrada | 1234567890 + 0000 |
| cliente objetivo | Estado ≠ INACTIVO (para inactivar) / = INACTIVO (para reactivar) | ACTIVO / INACTIVO | Transición fuera de matriz (409, DEC-038) | RETIRADO → INACTIVO (terminal) |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| motivo (longitud) | string | 3 | 200 | 2 (400) | 201 (400) |
| cédula (dígitos, login) | num | 6 | 10 | 5 (400) | 11 (400) |
| pin (dígitos) | num | 4 | 4 | 3 (400) | 5 (400) |
| número de registros de historial tras inactivar | int | N previo | N+1 | — | — |

## Tabla de Decisiones

### D1 — Inactivar cliente
| cliente existe | rol válido | estado objetivo | motivo ok | Acción |
|---|---|---|---|---|
| true | DUENO/RECEPCIONISTA | INACTIVO | true | 200 estado INACTIVO + motivo + actor persistidos |
| true | DUENO/RECEPCIONISTA | INACTIVO | false | 400 VALIDATION_ERROR (motivo) |
| true | DUENO/RECEPCIONISTA | fuera de enum | * | 400 VALIDATION_ERROR (enum) |
| true | CLIENTE | * | * | 403 AUTH_FORBIDDEN |
| false | * | * | * | 404 NOT_FOUND |

### D2 — Acceso del cliente (HU08-C04a)
| cliente existe | PIN correcto | estado | Acción |
|---|---|---|---|
| true | true | INACTIVO | 401 AUTH_CLIENTE_INACTIVO, sin token |
| true | true | NUEVO/ACTIVO/SUSPENDIDO/RETIRADO* | 200 token (HU-02) |
| true | false | INACTIVO | 401 AUTH_INVALID_CREDENTIALS (no revela estado) |
| false | * | * | 401 AUTH_INVALID_CREDENTIALS |

\* RETIRADO: el bloqueo de **login** del portal solo está decidido para INACTIVO (DEC-034); para RETIRADO el acceso del portal no se filtra hoy (gap conocido, fuera del alcance de HU-08). La **transición** RETIRADO → cualquier otra está decidida en HU17-C04 (DEC-038: terminal → 409), pero eso no bloquea el login por sí solo.

### D3 — Reactivación (DEC-020)
| estado actual | rol válido | motivo ok | Acción |
|---|---|---|---|
| INACTIVO | DUENO/RECEPCIONISTA | true | 200 → estado ACTIVO (matriz DEC-038; DEC-020) + historial |
| INACTIVO | DUENO/RECEPCIONISTA | false | 400 VALIDATION_ERROR |
| INACTIVO | CLIENTE | * | 403 AUTH_FORBIDDEN |
| ≠ INACTIVO | * | * | 200 si la transición es válida (HU17-C04) / 404 si no existe |

## Transiciones de Estado
### Cliente (alcance HU-08; coherente con la matriz ratificada DEC-038 / HU17-C04)
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| NUEVO/ACTIVO/SUSPENDIDO | Inactivar (con motivo) | INACTIVO | Sí |
| RETIRADO | Inactivar (con motivo) | INACTIVO | **No — 409 TRANSICION_INVALIDA** (RETIRADO terminal, DEC-038) |
| INACTIVO | Reactivar (DEC-020, con motivo) | ACTIVO (matriz DEC-038) | Sí |
| INACTIVO | Inactivar de nuevo (sin cambio) | INACTIVO | No-op: 200 sin registro nuevo de cambio (diagonal) |
| * | Borrado físico | — | No existe endpoint (C02) |

## Cobertura de Ramas

### Ruta: PATCH /api/clientes/:id (cambio a INACTIVO)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | estado INACTIVO + motivo "Mudanza de ciudad" | 200, motivo+actor+historial en BD |
| 2 | motivo faltante | solo estado | 400 "Motivo es requerido cuando cambia el estado" |
| 3 | motivo corto | motivo "No" (2) | 400 "Motivo debe tener al menos 3 caracteres" |
| 4 | motivo largo | motivo 201 chars | 400 "Motivo no puede exceder 200 caracteres" |
| 5 | estado inválido | estado "BLOQUEADO" | 400 Invalid enum value |
| 6 | cliente inexistente | id "nonexistent-id" | 404 NOT_FOUND |
| 7 | rol CLIENTE | token cliente | 403 AUTH_FORBIDDEN |
| 8 | conservación | tras inactivar, GET ficha + búsqueda | 200 con datos íntegros e historial crecido |
| 9 | sin borrado | DELETE /clientes/:id | 404 (ruta inexistente) |

### Ruta: POST /api/auth/login-cliente (HU08-C04a)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | inactivo + PIN ok | cédula de cliente INACTIVO + PIN correcto | 401 AUTH_CLIENTE_INACTIVO, sin token |
| 2 | inactivo + PIN mal | misma cédula + PIN incorrecto | 401 AUTH_INVALID_CREDENTIALS |
| 3 | activo + PIN ok | cliente ACTIVO | 200 token (regresión HU-02) |
| 4 | formato inválido | cédula "abc" | 400 VALIDATION_ERROR |

### Ruta: POST /api/clientes/:clienteId/membresias-gym (HU08-C04b)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | cliente INACTIVO | fechas válidas | 409 CLIENTE_INACTIVO, sin fila creada |
| 2 | cliente ACTIVO (regresión) | fechas válidas | 201 (HU-12) |
| 3 | cliente inexistente | id inexistente | 404 NOT_FOUND |

### Ruta: POST /api/recepcion/ingresos (HU08-C04b, gap G14 → criterio INC04-CLI-07, DEC-039)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | cliente INACTIVO | ingreso con vigencia válida | 403 INGRESO_NO_PERMITIDO, sin fila creada |
| 2 | SUSPENDIDO / RETIRADO | — | 403 (DEC-030, INC-03; rama intacta, no se re-cobra) |
| 3 | cliente ACTIVO (regresión) | vigencia válida | 201 (INC-03) |

### Ruta: Reactivación (HU08-C05)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | REACTIVAR | INACTIVO → ACTIVO + motivo, rol RECEPCIONISTA | 200 + login vuelve a 200 |
| 2 | sin motivo | INACTIVO → ACTIVO sin motivo | 400 |
| 3 | rol CLIENTE | token cliente | 403 |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex / Regla | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| id | string | sí (params) | - | 1-36 | UUID/cuid |
| estado | string | sí (cambio) | - | - | NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO |
| motivo | string | sí (si cambia estado) | texto libre | 3-200 | libre |
| cedula | string | sí (login) | /^\d{6,10}$/ | 6-10 | numérico |
| pin | string | sí (login) | /^\d{4}$/ | 4 | 4 dígitos |

## Escenarios Gherkin (borrador — NO crear `.feature` todavía; los conecta test-engineer en RED)

```gherkin
Feature: Inactivación de clientes sin borrado físico
  Como dueno
  Quiero inactivar clientes en lugar de borrarlos
  Para conservar historial y trazabilidad

  Background:
    Given soy un usuario autenticado como "DUENO"
    And existe un cliente con cédula "1234567890" en estado "ACTIVO"

  # HU08-C01 + HU08-C03
  Scenario: Inactivar cliente registrando motivo y actor
    When envío PATCH "/clientes/{id}" con estado "INACTIVO" y motivo "Mudanza de ciudad"
    Then el sistema retorna estado 200
    And la respuesta refleja estado "INACTIVO" con motivo "Mudanza de ciudad"
    And el historial del cliente registra el cambio "ACTIVO" a "INACTIVO" con el actor "DUENO"

  # HU08-C03 — validación por campo
  Scenario Outline: Rechazar motivo inválido al inactivar
    When intento inactivar el cliente con motivo "<motivo>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | motivo | mensaje |
      |  | Motivo es requerido cuando cambia el estado |
      | No | Motivo debe tener al menos 3 caracteres |
      | [201 caracteres] | Motivo no puede exceder 200 caracteres |

    # Nota de materialización (D4): la fila "requerido" se cumple OMITIENDO el
    # campo `motivo` en el body (superRefine solo con `estado` sin `motivo`);
    # un `""` literal enviado cae en "Motivo debe tener al menos 3 caracteres"
    # (coherente con HU-17-schemas.ts:59-64). No se cambia el Example.

  # HU08-C03 — ramas de error
  Scenario: Inactivar cliente inexistente retorna 404
    When envío PATCH "/clientes/nonexistent-id" con estado "INACTIVO" y motivo "Prueba"
    Then el sistema retorna estado 404

  Scenario: El rol CLIENTE no puede inactivar clientes
    Given soy un usuario autenticado como "CLIENTE"
    When intento inactivar el cliente con motivo "Prueba"
    Then el sistema retorna estado 403

  # HU08-C02 — conservación de historial
  Scenario: Inactivar un cliente conserva su historial completo
    Given el cliente tiene una membresía y un cambio de estado previo
    When inactivo el cliente con motivo "Cierre temporal"
    Then la ficha del cliente responde 200 con sus datos originales
    And la búsqueda por cédula sigue encontrando al cliente
    And el historial contiene los registros previos más el nuevo

  Scenario: No existe borrado físico de clientes
    When intento eliminar el cliente con DELETE "/clientes/{id}"
    Then el sistema retorna estado 404

  # HU08-C04a — bloqueo de acceso
  Scenario: Login de un cliente inactivo queda bloqueado
    Given existe un cliente inactivo con PIN "1234"
    When el cliente intenta login con cédula "1234567890" y PIN "1234"
    Then el sistema retorna estado 401 con código "AUTH_CLIENTE_INACTIVO"
    And la respuesta no incluye token

  Scenario: Login con PIN incorrecto no revela que la cuenta está inactiva
    Given existe un cliente inactivo con PIN "1234"
    When el cliente intenta login con cédula "1234567890" y PIN "9999"
    Then el sistema retorna estado 401 con código "AUTH_INVALID_CREDENTIALS"

  # HU08-C04b — sin servicios nuevos
  Scenario: No se puede crear una vigencia nueva para un cliente inactivo
    Given existe un cliente inactivo
    When creo una membresía gym con fechas válidas para ese cliente
    Then el sistema retorna estado 409 con código "CLIENTE_INACTIVO"
    And la membresía no queda creada

  # HU08-C05 — reactivación (DEC-020)
  Scenario: Recepcionista reactiva un cliente inactivo
    Given soy un usuario autenticado como "RECEPCIONISTA"
    And existe un cliente inactivo con motivo previo "Mudanza de ciudad"
    When envío PATCH "/clientes/{id}" con estado "ACTIVO" y motivo "Cliente reactivado"
    Then el sistema retorna estado 200 con estado "ACTIVO"
    And el historial registra el cambio "INACTIVO" a "ACTIVO"
    And el login del cliente vuelve a responder estado 200

  Scenario: Reactivar un cliente sin motivo retorna 400
    When intento cambiar el estado del cliente a "ACTIVO" sin motivo
    Then el sistema muestra error "Motivo es requerido cuando cambia el estado"
```

> Nota para test-engineer: `[201 caracteres]` debe materializarse en el step como un literal de 201 caracteres (`"a".repeat(201)` en el step definition o el string completo en el Examples).

## Gaps vs código actual
| Gap | Evidencia | Criterio |
|-----|-----------|----------|
| `loginClient` no filtra el estado: un INACTIVO ingresa hoy con PIN correcto | `src/services/auth.service.ts:14-28` (`findUnique` por cédula, sin condición de estado) | HU08-C04a |
| No existe código `AUTH_CLIENTE_INACTIVO` en la respuesta de login | `src/routes/auth.ts:36-59` solo devuelve `AUTH_INVALID_CREDENTIALS` | HU08-C04a |
| `crearMembresia` no valida el estado del cliente | `src/services/membresia.service.ts:154-208` | HU08-C04b |
| Sin campo `motivo` en el modelo Cliente | `prisma/schema.prisma:35-58` | HU08-C03 |
| Sin tabla de historial de cambios de estado del cliente | `prisma/schema.prisma` (solo existe `MembresiaGymCambio`, líneas 78-93) | HU08-C02/C03 |
| `updateClienteSchema` no conoce `motivo` | `src/schemas/cliente.schema.ts:34-56` | HU08-C03 |
| `updateCliente` escribe solo los campos del body; no registra actor del cambio de estado ni motivo | `src/services/cliente.service.ts:111-126` | HU08-C03 |
| La respuesta del PATCH no expone `motivo` ni `ultimoCambio` | `src/routes/clientes.ts:171-206` + `selectCliente` (`cliente.service.ts:25-43`) | HU08-C03 |
| No hay ruta DELETE de clientes (correcto: confirmarlo con prueba, no borrar nada) | `src/routes/clientes.ts` (GET/POST/PATCH únicamente) | HU08-C02 |

## Preguntas al producto
> **Resueltas 2026-10-14** en `docs/producto/decisiones.md`: **P-02 → DEC-040** (la sesión JWT previa no se revoca; expira con TTL 24 h) y **P-03 → DEC-037 + DEC-038** (DUENO y RECEPCIONISTA inactivan/reactivan; el estado destino de la reactivación queda fijado en la matriz ratificada como `INACTIVO → ACTIVO`). La tabla queda como historial de la pregunta/opciones.

| ID | Pregunta | Impacto | Criterio |
|----|----------|---------|----------|
| **P-02 → DEC-040** | ~~¿La sesión JWT ya emitida a un cliente que queda INACTIVO se revoca de inmediato o expira sola con el TTL de 24 h?~~ **Resuelta (opción (b))**: no se revoca; expira con el TTL absoluto de 24 h (DEC-009); criterio `INC04-CLI-06` (prueba de no-regresión). | Cerrada: HU08-C04c especificado; "no puede ingresar" queda cubierto en el login (DEC-034). | HU08-C04c |
| **P-03 → DEC-037 + DEC-038** | ~~¿A qué estado exacto lleva la reactivación DEC-020 y quién puede inactivar?~~ **Resuelta**: destino **ACTIVO** (matriz ratificada DEC-038: `INACTIVO → ACTIVO` permitida; `INACTIVO → SUSPENDIDO` → 409) y permisos **DUENO + RECEPCIONISTA** (DEC-037). | Cerrada: valor esperado y permisos fijados para la prueba de C05. | HU08-C05 |

## Nota de seguridad (resuelta en el criterio)
Para no revelar cuentas existentes, HU08-C04a exige verificar cédula+PIN **antes** que el estado: un atacante sin el PIN solo recibe `AUTH_INVALID_CREDENTIALS` genérico, igual que hoy (HU-02).
