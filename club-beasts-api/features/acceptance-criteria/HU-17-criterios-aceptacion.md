# Criterios de Aceptación - HU-17: Gestión de estados generales del cliente

## Resumen

Ciclo de vida del estado general del cliente (NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO): cada cambio deja motivo y actor, y nunca destruye el historial previo.

**Decisiones aplicadas**: DEC-001 (roles DUENO, RECEPCIONISTA, CLIENTE), DEC-020 (INACTIVO → reactivación), DEC-016 (fraccionable), más las reglas ya decididas de HU-05 (ACTIVO ↔ SUSPENDIDO; * → RETIRADO), y de INC-04 (todas aprobadas 2026-10-14): **DEC-035** (`motivo` obligatorio en todo cambio de estado → C02b), **DEC-036** (historial en `ClienteEstadoCambio` → C02a/C03), **DEC-037** (DUENO + RECEPCIONISTA), **DEC-038** (matriz de transiciones; `RETIRADO` terminal → C04) y **DEC-041** (`motivo` visible solo a staff).

**Alcance anti-duplicado (auditoría G14)**: el bullet 1 (catálogo de estados) y el filtro por estado ya están pagados en HU-05 (cambio de estado aceptado, enum validado) y HU-06 (filtro + badge). `HU17-C01` queda como referencia trazable, **no puntuable en INC-04**. Lo distintivo y puntuable: **motivo del cambio** (C02), **conservación/visibilidad de historial** (C03) y **rechazo de transiciones inválidas** (C04).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado | Puntuable INC-04 |
|---|-----------------|-----------|--------|------------------|
| 1 | El sistema permite manejar estados generales como nuevo, activo, suspendido, retirado e inactivo. | HU17-C01 | REF (base aceptada en HU-05/HU-06) | No (duplicado) |
| 2 | El sistema registra motivo cuando el estado cambia. | HU17-C02a (persistir) + HU17-C02b (obligatorio) | C02a y C02b LISTO para RED (**DEC-035**: obligatorio en todo cambio) | Sí |
| 3 | El estado general no elimina el historial previo del cliente. | HU17-C03 | LISTO para RED | Sí |
| (derivado) | Transiciones inválidas rechazadas (expectativa de la auditoría G9) | HU17-C04 | LISTO para RED (**DEC-038**, matriz ratificada 2026-10-14) | Sí |

## Detalle por criterio

### HU17-C01 — Catálogo de estados generales (REF, no puntuable)
- **Condición previa**: rol DUENO o RECEPCIONISTA autenticado (DEC-001); cliente existente.
- **Disparo**: `PATCH /clientes/:id` con `estado` ∈ {NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO}; `GET /clientes?estado=<valor>`; `GET /clientes/:id`.
- **Resultado observable**: el enum acepta exactamente los 5 valores; el filtro devuelve solo ese estado; la ficha y la lista lo muestran.
- **HTTP / códigos**: 200 · 400 VALIDATION_ERROR ("Invalid enum value" para valores fuera del enum) · 404 NOT_FOUND · 403 AUTH_FORBIDDEN.
- **Qué NO cubre**: motivo (C02), historial (C03), reglas de transición (C04), permisos por transición (todos los roles ya cubiertos por la ruta).
- **Por qué REF**: enum y cambio aceptados en HU-05 (`INC00-CLI-02`), filtro aceptado en HU-06 (`clientes.feature` C13, e2e). Duplicarlo es prohibido por la auditoría.
- **Prueba esperada**: las ya existentes de HU-05/HU-06; ninguna nueva.

### HU17-C02a — El cambio de estado persiste motivo + actor + historial
- **Condición previa**: cliente con estado A; actor DUENO/RECEPCIONISTA.
- **Disparo**: `PATCH /clientes/:id` con `{ "estado": B, "motivo": "<texto>" }` donde B ≠ A.
- **Resultado observable**:
  - 200 con `{ id, estado: B, motivo, actualizadoPorId, updatedAt, ultimoCambio: { estadoAnterior: A, estadoNuevo: B, motivo, actor, createdAt } }`.
  - En BD, en la misma transacción: fila de historial con A → B, motivo, actor y fecha; `actualizadoPorId` = actor.
  - El motivo provisto queda recuperable vía ficha/historial (no se sobreescribe con el tiempo: C03).
- **HTTP / códigos**: 200 OK · 400 VALIDATION_ERROR (motivo 0/2/201 chars, enum inválido) · 404 NOT_FOUND · 403 AUTH_FORBIDDEN.
- **Qué NO cubre**: exigir el motivo cuando falta (→ C02b, decidido en DEC-035), cambios de campos que no sean estado, UI del formulario.
- **Prueba esperada**: integración → "PATCH estado con motivo persiste motivo + actor + registro A→B en BD" (asertar respuesta **y** BD).

### HU17-C02b — El motivo es obligatorio en todo cambio de estado — LISTO (DEC-035)
- **Condición previa**: idéntica a C02a.
- **Disparo**: `PATCH /clientes/:id` con `estado` presente **sin** `motivo`.
- **Resultado esperado (lectura literal de la HU)**: 400 VALIDATION_ERROR "Motivo es requerido cuando cambia el estado"; el estado no cambia.
- **Estado**: **decidido — DEC-035** (`INC04-PEND-02`, opción (a), 2026-10-14): el `motivo` es obligatorio en **todo** cambio de estado (lectura literal de la HU). Los tests aceptados de HU-05/Gherkin/UI que no lo enviaban se **actualizan como cambio de contrato documentado** (RED antes que GREEN; ningún test se elimina). Criterio de INC-04: `INC04-EST-03`.
- **Qué NO cubre**: motivo opcional en ediciones sin cambio de estado, motivo en altas de cliente (estado inicial NUEVO, HU-04).
- **Prueba esperada**: integración → "PATCH {estado} sin motivo → 400 y el estado no cambia" + actualización controlada de los tests afectados (cambian los inputs, no las asertaciones de rechazo).

### HU17-C03 — El estado general no elimina el historial previo
- **Condición previa**: cliente con datos completos, al menos una membresía y ≥ 2 cambios de estado previos registrados.
- **Disparo**: aplicar un cambio de estado adicional (p. ej. ACTIVO → SUSPENDIDO) y consultar.
- **Resultado observable**:
  - `GET /clientes/:id` → 200 con todos los campos originales intactos (cédula, nombres, sede, vigencias, `createdAt`).
  - El historial contiene los ≥ 3 registros en orden cronológico (más reciente primero): count **crece**, nunca se reemplaza ni borra.
  - La búsqueda por cédula sigue localizando al cliente; el filtro por estado sigue funcionando sobre su estado actual.
  - No existe endpoint que elimine al cliente (DELETE no publicado).
- **HTTP / códigos**: 200 OK · 404 NOT_FOUND.
- **Qué NO cubre**: historial de ediciones de campos no-estado (HU-05), historial visible en UI (HU-07/HU-32), exportación de reportes (HU-33).
- **Prueba esperada**: integración → "tres cambios de estado consecutivos acumulan 3 registros y los datos base no cambian" + "DELETE /clientes/:id → 404".

### HU17-C04 — Transiciones inválidas rechazadas — LISTO (DEC-038)
- **Condición previa**: cliente en estado A; actor DUENO/RECEPCIONISTA (DEC-037).
- **Disparo**: `PATCH /clientes/:id` con `estado` = B.
- **Resultado esperado**:
  - Transición permitida por la matriz → 200 con `motivo` obligatorio (DEC-035) y registro A→B en historial.
  - Transición **fuera de la matriz** → **409 con `{ error: "Transición de estado no permitida", code: "TRANSICION_INVALIDA" }`** (mensaje fijado en el spec de INC-04) y el estado no cambia, sin escritura alguna.
  - Estado fuera del enum → 400 (REF, HU-05/HU-06).
  - Mismo estado que el actual (diagonal) → 200 **no-op**: no se registra un cambio nuevo (CONF-02; la HU solo habla de registrar motivo "cuando el estado cambia").
- **Matriz**: **ratificada — DEC-038** (`INC04-PEND-05`, opción (b), 2026-10-14), ver sección "Transiciones de Estado": `RETIRADO` **terminal** (ninguna salida); diagonal = no-op; `INACTIVO → RETIRADO` **permitida** por la regla `* -> RETIRADO` (celda ratificada por el orquestador 2026-10-14); fuera de matriz → 409 `TRANSICION_INVALIDA`.
- **Estado**: **decidido — DEC-038**; criterio de INC-04: `INC04-EST-05`. El contrato importable es `HU-17-schemas.ts` (`transicionesAprobadas` + `clasificarTransicion`, enmendado 2026-10-14, en paridad celda a celda con la matriz de este documento).
- **Qué NO cubre**: permisos por transición (idénticos para todas, DEC-037), transiciones automáticas por vencimiento (HU-16), el estado destino de la reactivación (ya fijado en la matriz: `INACTIVO → ACTIVO`, DEC-020).
- **Prueba esperada**: integración → "transición permitida → 200 con historial", "transición fuera de matriz (p. ej. RETIRADO → ACTIVO) → 409 TRANSICION_INVALIDA y estado sin cambio", "diagonal → 200 no-op sin registro nuevo".

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| estado (target) | Enum de 5 valores con transición permitida | ACTIVO → SUSPENDIDO | Fuera de enum / transición no permitida | BLOQUEADO / RETIRADO → ACTIVO (fuera de matriz, DEC-038) |
| motivo | String 3-200 presente en cambio | "Falta de pago" | Ausente, <3, >200 | "", "No", 201 chars |
| rol actor | DUENO o RECEPCIONISTA | RECEPCIONISTA | CLIENTE / anónimo | CLIENTE |
| historial | ≥ N registros previos | 2 cambios previos | Historial vacío (cliente recién creado) | 0 cambios |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| motivo (longitud) | string | 3 | 200 | 2 (400) | 201 (400) |
| registros de historial tras 1 cambio | int | N | N+1 | — | — |
| estados del enum | int | 5 | 5 | 4 (valor faltante = bug) | 6 (valor extra = bug) |

## Tabla de Decisiones
### Cambio de estado con motivo
| cliente existe | rol válido | estado válido (enum) | transición permitida (DEC-038) | motivo presente | Acción |
|---|---|---|---|---|---|
| true | DUENO/RECEPCIONISTA | true | true | true | 200 + historial A→B con motivo y actor |
| true | DUENO/RECEPCIONISTA | true | true | false | 400 VALIDATION_ERROR (C02b, DEC-035) |
| true | DUENO/RECEPCIONISTA | true | false | * | 409 TRANSICION_INVALIDA (C04, DEC-038) |
| true | DUENO/RECEPCIONISTA | false | * | * | 400 Invalid enum value (REF HU-05/06) |
| true | CLIENTE | * | * | * | 403 AUTH_FORBIDDEN |
| false | * | * | * | * | 404 NOT_FOUND |

## Transiciones de Estado
### Cliente — matriz ratificada (DEC-038, criterio INC04-EST-05; ratificada por el orquestador 2026-10-14)
| Estado Actual \ Siguiente | NUEVO | ACTIVO | SUSPENDIDO | RETIRADO | INACTIVO |
|---|---|---|---|---|---|
| **NUEVO** | no-op (200) | sí | sí | sí | sí |
| **ACTIVO** | 409 | no-op (200) | sí (HU-05) | sí (* → RETIRADO, HU-05) | sí (HU-08) |
| **SUSPENDIDO** | 409 | sí (HU-05) | no-op (200) | sí (* → RETIRADO, HU-05) | sí (HU-08) |
| **RETIRADO** | 409 | 409 | 409 | no-op (200) | 409 |
| **INACTIVO** | 409 | sí (DEC-020) | 409 | sí (* → RETIRADO, ratificada 2026-10-14) | no-op (200) |

- "sí" = 200 con `motivo` obligatorio (DEC-035) y registro A→B en historial; "no-op" = 200 sin registro nuevo (mismo estado, diagonal, CONF-02); "409" = `{ error: "Transición de estado no permitida", code: "TRANSICION_INVALIDA" }` sin escritura.
- `RETIRADO` es **terminal**: ninguna transición sale de RETIRADO (DEC-038); la diagonal es siempre no-op; `INACTIVO → RETIRADO` es **permitida** por la regla `* -> RETIRADO` (celda ratificada por el orquestador 2026-10-14); cualquier celda fuera de esta matriz → 409 `TRANSICION_INVALIDA`.
- Espejo importable: `HU-17-schemas.ts` (`transicionesAprobadas` + `clasificarTransicion`, enmendado 2026-10-14) — paridad celda a celda verificada con esta tabla.

## Cobertura de Ramas
### Ruta: PATCH /api/clientes/:id (cambio de estado)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | ACTIVO → SUSPENDIDO + motivo | 200 + historial A→B con actor |
| 2 | motivo ausente | { estado } solo | 400 (C02b, DEC-035) |
| 3 | motivo 2 chars | motivo "No" | 400 "Motivo debe tener al menos 3 caracteres" |
| 4 | motivo 201 chars | motivo 201 `a` | 400 "Motivo no puede exceder 200 caracteres" |
| 5 | enum inválido | estado "BLOQUEADO" | 400 Invalid enum value |
| 6 | transición no permitida | ej.: RETIRADO → ACTIVO (fuera de matriz) | 409 TRANSICION_INVALIDA |
| 7 | mismo estado | estado actual | 200 no-op sin registro nuevo |
| 8 | cliente inexistente | id "nonexistent-id" | 404 NOT_FOUND |
| 9 | rol CLIENTE | token CLIENTE | 403 AUTH_FORBIDDEN |
| 10 | historial acumulado | 3 cambios seguidos | count crece; datos base intactos (C03) |
| 11 | sin borrado | DELETE /clientes/:id | 404 (ruta inexistente) |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex / Regla | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| id | string | sí (params) | - | 1-36 | UUID/cuid |
| estado | string | sí (si se pretende cambiar) | - | - | NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO |
| motivo | string | sí (en todo cambio de estado, DEC-035) | texto libre | 3-200 | libre |

## Escenarios Gherkin (borrador — NO crear `.feature` todavía; los conecta test-engineer en RED)

```gherkin
Feature: Gestión de estados generales del cliente
  Como dueno o recepcionista
  Quiero gestionar estados generales del cliente
  Para reflejar situaciones operativas como nuevo, suspendido o retirado

  Background:
    Given soy un usuario autenticado como "DUENO"
    And existe un cliente con cédula "1234567890" en estado "ACTIVO"

  # HU17-C01 (REF) + HU17-C02a
  Scenario: Cambiar el estado del cliente registrando motivo y actor
    When envío PATCH "/clientes/{id}" con estado "SUSPENDIDO" y motivo "Falta de pago"
    Then el sistema retorna estado 200
    And la respuesta refleja estado "SUSPENDIDO" con motivo "Falta de pago"
    And el historial registra el cambio "ACTIVO" a "SUSPENDIDO" con el actor "DUENO"

  # HU17-C02a — validación por campo
  Scenario Outline: Rechazar motivo inválido en el cambio de estado
    When intento cambiar el estado del cliente a "SUSPENDIDO" con motivo "<motivo>"
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

  # HU17-C02b — DEC-035 (motivo obligatorio en todo cambio)
  Scenario: Cambiar estado sin motivo retorna 400
    When intento cambiar el estado del cliente a "SUSPENDIDO" sin motivo
    Then el sistema muestra error "Motivo es requerido cuando cambia el estado"
    And el estado del cliente sigue siendo "ACTIVO"

  # HU17-C01 — ramas de error
  Scenario: Estado fuera del enum es rechazado
    When intento cambiar el estado del cliente a "BLOQUEADO"
    Then el sistema muestra error "Invalid enum value"

  Scenario: El rol CLIENTE no puede cambiar estados
    Given soy un usuario autenticado como "CLIENTE"
    When intento cambiar el estado del cliente a "SUSPENDIDO" con motivo "Prueba"
    Then el sistema retorna estado 403

  Scenario: Cambiar estado de cliente inexistente retorna 404
    When envío PATCH "/clientes/nonexistent-id" con estado "SUSPENDIDO" y motivo "Prueba"
    Then el sistema retorna estado 404

  # HU17-C03 — conservación de historial
  Scenario: Los cambios de estado acumulan historial sin borrar nada
    Given el cliente tiene dos cambios de estado previos
    When cambio el estado del cliente a "RETIRADO" con motivo "Baja solicitada"
    Then la ficha del cliente responde 200 con sus datos originales
    And el historial contiene tres registros ordenados por fecha
    And la búsqueda por cédula sigue encontrando al cliente

  # HU17-C04 — matriz ratificada (DEC-038)
  Scenario: Transición aprobada se aplica
    Given el cliente está en estado "SUSPENDIDO"
    When cambio el estado del cliente a "ACTIVO" con motivo "Pago recibido"
    Then el sistema retorna estado 200

  Scenario: Transición inválida se rechaza sin cambiar el estado
    Given el cliente está en estado "RETIRADO"
    When intento cambiar el estado del cliente a "ACTIVO" con motivo "Reingreso"
    Then el sistema retorna estado 409 con código "TRANSICION_INVALIDA"
    And el estado del cliente sigue siendo "RETIRADO"
```

> Nota para test-engineer: `[201 caracteres]` = literal de 201 caracteres. Los escenarios de C02b y C04 están **habilitados** (DEC-035 y DEC-038 aprobadas 2026-10-14); el contrato importable es `HU-17-schemas.ts` (enmendado 2026-10-14, en paridad con este documento).

## Gaps vs código actual
| Gap | Evidencia | Criterio |
|-----|-----------|----------|
| Sin campo `motivo` en el modelo Cliente | `prisma/schema.prisma:35-58` | HU17-C02a/C02b |
| Sin tabla de historial de cambios de estado del cliente (solo `MembresiaGymCambio`) | `prisma/schema.prisma:78-93` | HU17-C02a, HU17-C03 |
| `updateClienteSchema` acepta `estado` sin `motivo` | `src/schemas/cliente.schema.ts:46` | HU17-C02b (DEC-035) |
| `updateCliente` no registra actor del cambio de estado ni motivo | `src/services/cliente.service.ts:111-126` | HU17-C02a |
| La respuesta del PATCH no expone motivo ni historial | `src/routes/clientes.ts:171-206`, `selectCliente` (`cliente.service.ts:25-43`) | HU17-C02a |
| No hay validación de transiciones (cualquier enum → cualquier enum) | `src/routes/clientes.ts:183-197` + `cliente.service.ts:111` | HU17-C04 (DEC-038) |
| No existe código `TRANSICION_INVALIDA` | grep `TRANSICION` = 0 en `src/` | HU17-C04 |

## Preguntas al producto
> **Resueltas 2026-10-14** en `docs/producto/decisiones.md`: **P-01 → DEC-035** (motivo obligatorio en todo cambio, opción (a)) y **P-04 → DEC-038** (matriz 5x5, `RETIRADO` terminal, fuera de matriz → 409 `TRANSICION_INVALIDA`; celda `INACTIVO → RETIRADO` ratificada como permitida por el orquestador). La tabla queda como historial de la pregunta/opciones.

| ID | Pregunta | Impacto | Criterio |
|----|----------|---------|----------|
| **P-01 → DEC-035** | ~~¿El `motivo` es **obligatorio en todo cambio de estado** o solo en cambios críticos?~~ **Resuelta (opción (a))**: obligatorio en todo cambio. **Impacto controlado**: los tests aceptados de HU-05/Gherkin/UI que cambiaban estado sin motivo se actualizan como cambio de contrato documentado (`tests/unit/cliente.schema.test.ts:150-155`, `tests/integration/clientes.test.ts:426/456`, `tests/integration/features.test.ts:339`, web `cliente-payload.ts:41` + helpers E2E). | Decide C02b y el RED de INC-04: se actualizan (nunca se borran) los tests afectados. | HU17-C02b |
| **P-04 → DEC-038** | ~~¿Cuáles son exactamente las transiciones inválidas?~~ **Resuelta (opción (b))**: matriz 5x5 de la sección "Transiciones de Estado"; `RETIRADO` terminal (toda salida → 409); `NUEVO` sale hacia ACTIVO/SUSPENDIDO/RETIRADO/INACTIVO; diagonal no-op; **`INACTIVO → RETIRADO` permitida** por la regla `* -> RETIRADO` (ratificada por el orquestador 2026-10-14); fuera de matriz → 409 `TRANSICION_INVALIDA`. | Cerrada: existe "transición inválida" que probar (expectativa G9 de la auditoría); criterio `INC04-EST-05`. | HU17-C04 |
