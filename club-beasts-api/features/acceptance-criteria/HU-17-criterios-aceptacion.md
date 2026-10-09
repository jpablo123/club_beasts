# Criterios de Aceptación - HU-17: Gestión de estados generales del cliente

## Resumen

Ciclo de vida del estado general del cliente (NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO): cada cambio deja motivo y actor, y nunca destruye el historial previo.

**Decisiones aplicadas**: DEC-001 (roles DUENO, RECEPCIONISTA, CLIENTE), DEC-020 (INACTIVO → reactivación), DEC-016 (fraccionable), más las reglas ya decididas de HU-05 (ACTIVO ↔ SUSPENDIDO; * → RETIRADO).

**Alcance anti-duplicado (auditoría G14)**: el bullet 1 (catálogo de estados) y el filtro por estado ya están pagados en HU-05 (cambio de estado aceptado, enum validado) y HU-06 (filtro + badge). `HU17-C01` queda como referencia trazable, **no puntuable en INC-04**. Lo distintivo y puntuable: **motivo del cambio** (C02), **conservación/visibilidad de historial** (C03) y **rechazo de transiciones inválidas** (C04).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado | Puntuable INC-04 |
|---|-----------------|-----------|--------|------------------|
| 1 | El sistema permite manejar estados generales como nuevo, activo, suspendido, retirado e inactivo. | HU17-C01 | REF (base aceptada en HU-05/HU-06) | No (duplicado) |
| 2 | El sistema registra motivo cuando el estado cambia. | HU17-C02a (persistir) + HU17-C02b (obligatorio) | C02a LISTO para RED; **C02b BLOQUEADO (P-01)** | Sí (C02a sí; C02b tras P-01) |
| 3 | El estado general no elimina el historial previo del cliente. | HU17-C03 | LISTO para RED | Sí |
| (derivado) | Transiciones inválidas rechazadas (expectativa de la auditoría G9) | HU17-C04 | **BLOQUEADO (P-04)** — la matriz de transiciones no está aprobada | Sí, tras P-04 |

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
- **Qué NO cubre**: exigir el motivo cuando falta (→ C02b/P-01), cambios de campos que no sean estado, UI del formulario.
- **Prueba esperada**: integración → "PATCH estado con motivo persiste motivo + actor + registro A→B en BD" (asertar respuesta **y** BD).

### HU17-C02b — El motivo es obligatorio en todo cambio de estado — **BLOQUEADO (P-01)**
- **Condición previa**: idéntica a C02a.
- **Disparo**: `PATCH /clientes/:id` con `estado` presente **sin** `motivo`.
- **Resultado esperado (lectura literal de la HU)**: 400 VALIDATION_ERROR "Motivo es requerido cuando cambia el estado"; el estado no cambia.
- **Estado**: **BLOQUEADO — P-01**. La HU dice "registra motivo cuando el estado cambia" (lectura literal: todo cambio). Implementarlo tal cual afecta evidencia ya aceptada y el runner actual (ver tabla de impacto en "Preguntas al producto"). Hasta que Producto confirme, C02a (persistir lo que llega) se puede cerrar y C02b no.
- **Qué NO cubre**: motivo opcional en ediciones sin cambio de estado, motivo en altas de cliente (estado inicial NUEVO, HU-04).
- **Prueba esperada (tras decisión)**: integración → "PATCH {estado} sin motivo → 400 y el estado no cambia" + actualización controlada de los tests afectados.

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

### HU17-C04 — Transiciones inválidas rechazadas — **BLOQUEADO (P-04)**
- **Condición previa**: cliente en estado A; actor DUENO/RECEPCIONISTA.
- **Disparo**: `PATCH /clientes/:id` con `estado` = B.
- **Resultado esperado**:
  - Transición permitida → 200 (con motivo, C02).
  - Transición no permitida → **409 con `{ error, code: "TRANSICION_INVALIDA" }`** (propuesto) y el estado no cambia.
  - Estado fuera del enum → 400 (REF, HU-05/HU-06).
  - Mismo estado que el actual → 200 no-op: no se registra un cambio nuevo (la HU solo habla de registrar motivo "cuando el estado cambia").
- **Matriz** (ver sección Transiciones): decididas = ACTIVO ↔ SUSPENDIDO, * → RETIRADO, * → INACTIVO, INACTIVO → ACTIVO (DEC-020); **pendiente de aprobación = todo lo que sale de RETIRADO y las salidas de NUEVO** → P-04.
- **Estado**: **BLOQUEADO — P-04**: no se puede probar "rechazo de transición inválida" sin una matriz aprobada.
- **Qué NO cubre**: permisos por transición (idénticos para todas), transiciones automáticas por vencimiento (HU-16), transiciones desde RETIRADO hacia ACTIVO por reingreso (decidir en P-04).
- **Prueba esperada (tras decisión)**: integración → "transición aprobada → 200", "transición rechazada → 409 TRANSICION_INVALIDA y estado sin cambio".

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| estado (target) | Enum de 5 valores con transición permitida | ACTIVO → SUSPENDIDO | Fuera de enum / transición no permitida | BLOQUEADO / RETIRADO → ACTIVO (según P-04) |
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
| cliente existe | rol válido | estado válido (enum) | transición permitida (P-04) | motivo presente | Acción |
|---|---|---|---|---|---|
| true | DUENO/RECEPCIONISTA | true | true | true | 200 + historial A→B con motivo y actor |
| true | DUENO/RECEPCIONISTA | true | true | false | 400 VALIDATION_ERROR (C02b, sujeto a P-01) |
| true | DUENO/RECEPCIONISTA | true | false | * | 409 TRANSICION_INVALIDA (C04, sujeto a P-04) |
| true | DUENO/RECEPCIONISTA | false | * | * | 400 Invalid enum value (REF HU-05/06) |
| true | CLIENTE | * | * | * | 403 AUTH_FORBIDDEN |
| false | * | * | * | * | 404 NOT_FOUND |

## Transiciones de Estado
### Cliente (matriz completa; **P-04 pendiente de aprobación**)
| Estado Actual \ Siguiente | NUEVO | ACTIVO | SUSPENDIDO | RETIRADO | INACTIVO |
|---|---|---|---|---|---|
| **NUEVO** | no-op (200) | propuesto: sí | propuesto: sí | sí (* → RETIRADO, HU-05) | sí (* → INACTIVO, HU-08) |
| **ACTIVO** | no (propuesto: rechazar) | no-op (200) | sí (HU-05) | sí (HU-05) | sí (HU-08) |
| **SUSPENDIDO** | no (propuesto: rechazar) | sí (HU-05) | no-op (200) | sí (HU-05) | sí (HU-08) |
| **RETIRADO** | **P-04** (propuesto: rechazar) | **P-04** (propuesto: rechazar) | **P-04** (propuesto: rechazar) | no-op (200) | **P-04** (propuesto: rechazar) |
| **INACTIVO** | no (propuesto: rechazar) | sí (DEC-020) | **P-04** (propuesto: rechazar) | **P-04** (propuesto: rechazar) | no-op (200) |

- "sí" = 200 con motivo; "no-op" = 200 sin registro nuevo; "rechazar" = 409 TRANSICION_INVALIDA (propuesto); **P-04** = requiere aprobación de Producto antes de implementar/probar.

## Cobertura de Ramas
### Ruta: PATCH /api/clientes/:id (cambio de estado)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | ACTIVO → SUSPENDIDO + motivo | 200 + historial A→B con actor |
| 2 | motivo ausente | { estado } solo | 400 (C02b, según P-01) |
| 3 | motivo 2 chars | motivo "No" | 400 "Motivo debe tener al menos 3 caracteres" |
| 4 | motivo 201 chars | motivo 201 `a` | 400 "Motivo no puede exceder 200 caracteres" |
| 5 | enum inválido | estado "BLOQUEADO" | 400 Invalid enum value |
| 6 | transición no permitida | según matriz P-04 | 409 TRANSICION_INVALIDA |
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
| motivo | string | según P-01 (literal: sí) | texto libre | 3-200 | libre |

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

  # HU17-C02b — SOLO si P-01 confirma obligatoriedad universal
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

  # HU17-C04 — SOLO si P-04 aprueba la matriz
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

> Nota para test-engineer: `[201 caracteres]` = literal de 201 caracteres. Los escenarios marcados "SOLO si P-01/P-04" no deben conectarse hasta que `docs/producto/decisiones.md` registre la decisión.

## Gaps vs código actual
| Gap | Evidencia | Criterio |
|-----|-----------|----------|
| Sin campo `motivo` en el modelo Cliente | `prisma/schema.prisma:35-58` | HU17-C02a/C02b |
| Sin tabla de historial de cambios de estado del cliente (solo `MembresiaGymCambio`) | `prisma/schema.prisma:78-93` | HU17-C02a, HU17-C03 |
| `updateClienteSchema` acepta `estado` sin `motivo` | `src/schemas/cliente.schema.ts:46` | HU17-C02b (P-01) |
| `updateCliente` no registra actor del cambio de estado ni motivo | `src/services/cliente.service.ts:111-126` | HU17-C02a |
| La respuesta del PATCH no expone motivo ni historial | `src/routes/clientes.ts:171-206`, `selectCliente` (`cliente.service.ts:25-43`) | HU17-C02a |
| No hay validación de transiciones (cualquier enum → cualquier enum) | `src/routes/clientes.ts:183-197` + `cliente.service.ts:111` | HU17-C04 (P-04) |
| No existe código `TRANSICION_INVALIDA` | grep `TRANSICION` = 0 en `src/` | HU17-C04 |

## Preguntas al producto
| ID | Pregunta | Impacto | Criterio |
|----|----------|---------|----------|
| **P-01** | ¿El `motivo` es **obligatorio en todo cambio de estado** (lectura literal de la HU) o solo en cambios críticos (INACTIVO, SUSPENDIDO, RETIRADO)? **Impacto de la opción literal**: rompe `tests/unit/cliente.schema.test.ts:150-155`, `tests/integration/clientes.test.ts:426/456`, `tests/integration/features.test.ts:339` (runner Gherkin 63/63) y exige añadir campo al formulario web (`club-beasts-web/src/lib/cliente-payload.ts:41` + sus tests unit). **Impacto de la opción restringida**: cero regresión; HU-08 (INACTIVO) queda cubierto igual. | Decide C02b y el RED de INC-04: hay que actualizar tests aceptados de HU-05 o no. | HU17-C02b |
| **P-04** | ¿Cuáles son exactamente las transiciones inválidas? Propuesta en la matriz: RETIRADO es terminal (RETIRADO → X rechazado con 409 `TRANSICION_INVALIDA`) y NUEVO solo sale hacia ACTIVO/SUSPENDIDO/RETIRADO/INACTIVO. Falta confirmar RETIRADO → ACTIVO (¿reingreso?) y RETIRADO → INACTIVO. | Sin matriz aprobada no existe "transición inválida" que probar (expectativa G9 de la auditoría). | HU17-C04 |
