# Criterios de Aceptación - HU-14: Registro de servicio de nutrición

## Resumen

Registrar la vigencia del servicio de nutrición (fecha inicio/fin), derivar su estado (activo/vencido/congelado/no contratado), mostrarlo en la ficha del cliente y fijar la regla de dependencia: **el plan nutricional activo depende de la vigencia del servicio**.

**Decisiones aplicadas**: DEC-001 (roles), DEC-004 (servicios separados), DEC-005/006 (días completos America/Bogota, extremos inclusivos), DEC-007 (renovar crea periodo nuevo), DEC-008 (solapamientos rechazados, gaps permitidos), DEC-016 (fraccionable), **DEC-017** (DUENO y RECEPCIONISTA gestionan vigencias), **DEC-019** (el plan nutricional usa **plantilla simple**; aquí solo se expresa la **dependencia de vigencia**, sin implementar la estructura del plan).

**Enmiendas G14 (2026-10-20, decisión de Producto)**: **DEC-043** — literal de
congelación unificado a **`CONGELADO`** (antes `CONGELADA` en tablas/enum y
`CONGELADO` en prosa); **DEC-042** — la congelación **sí** alcanza a `NUTRICION`
(DEC-023 enmendada: `TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}`), por lo
que **C02b es factible en INC-05** (criterio `INC05-NUT-03`) y el bullet 2 de la HU
**no** se enmienda; **DEC-046 = (a)** — el `PATCH .../:servicioId` con concurrencia
optimista **sí** está en alcance; **DEC-047** — nueva regla del `PATCH`: mover solo
`fechaInicio` desplaza `fechaFin` por el mismo delta conservando la duración
inclusiva. *(La incompatibilidad #5 del spec de INC-05 no tenía frase contradictoria
aquí: el "Qué NO cubre" de HU14-C01 nunca mencionaba la concurrencia; se deja constancia
para trazabilidad.)*

**Alcance y notas**:
- Contrato aprobado (**P-06 resuelta por DEC-044**, 2026-10-20; ratificación técnica por `backend-developer` pendiente en INC-05): `POST/GET /clientes/:clienteId/servicios-nutricion`, `PATCH .../servicios-nutricion/:servicioId` (**incluido por DEC-046**, con regla **DEC-047**), espejo del contrato aceptado de membresías gym (`src/routes/membresia.ts`).
- `mvp.md:54`: HU-14 **no se acepta completa solo por registrar vigencias**; el bullet 4 (dependencia plan ↔ vigencia) se cierra cuando exista la asignación del plan (bloque 7). Fracción máxima alcanzable solo con vigencias: **3/4**.
- El estado CONGELADO **ya es factible en INC-05**: HU-15 está aceptada (INC-02) y
  **DEC-042** (2026-10-20) enmendó DEC-023 extendiendo la congelación a
  `NUTRICION`; el bullet 2 se cierra en partes (C02a / C02b), ambas en alcance
  *(enmienda 2026-10-20, DEC-042/DEC-043)*.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado | Puntuable INC-05 |
|---|-----------------|-----------|--------|------------------|
| 1 | El sistema permite registrar fecha de inicio y fecha fin del servicio de nutricion. | HU14-C01 | LISTO para RED | Sí |
| 2 | El sistema permite marcar el servicio como activo, vencido, congelado o no contratado. | HU14-C02a (activo/vencido/no contratado [+ prog. P-05]) + HU14-C02b (congelado) | C02a y C02b **LISTO para RED** *(2026-10-20: DEC-042/043)* | Sí; C02b = `INC05-NUT-03` incluido |
| 3 | La vigencia queda visible en la ficha del cliente. | HU14-C03 | LISTO para RED | Sí |
| 4 | El plan nutricional activo depende de la vigencia del servicio. | HU14-C04 | SPEC LISTO / **IMPLEMENTACIÓN DIFERIDA** (asignación de plan, DEC-019 bloque 7) | Cuando exista la asignación (`mvp.md:54`) |

## Detalle por criterio

### HU14-C01 — Registrar fecha de inicio y fin
- **Condición previa**: cliente existente; actor autenticado DUENO o RECEPCIONISTA (DEC-017).
- **Disparo**: `POST /clientes/:clienteId/servicios-nutricion` con `{ "fechaInicio": "2026-11-01", "fechaFin": "2026-11-30" }`.
- **Resultado observable**:
  - 201 con el DTO de la vigencia: `{ id, clienteId, fechaInicio, fechaFin, estado, version: 1, creadoPor: {id,nombre}, actualizadoPor: {id,nombre}, createdAt, updatedAt }`.
  - En BD: `creadoPorId`/`actualizadoPorId` = actor; auditoría CREACIÓN versión 1 (patrón `INC00-MEM-04`).
  - **Renovación (DEC-007)**: POST con `fechaInicio` ≥ `fechaFinPrevio + 1` crea periodo nuevo sin sobrescribir los anteriores.
  - **Edición `PATCH .../:servicioId` (incluida por DEC-046 = (a), 2026-10-20)**: cuerpo
    `{ fechaInicio?, fechaFin?, version }` con concurrencia optimista (versión vieja →
    409 `SERVICIO_CONFLICTO`, fila 8). **Regla DEC-047 (2026-10-20)**: con **solo
    `fechaInicio`** en el cuerpo, `fechaFin` se mueve por el **mismo delta de días** y la
    duración inclusiva se conserva — plan de 30 días: inicio `2026-10-20` → fin
    `2026-11-18`; inicio al 21 → fin **`2026-11-19`**; inicio de vuelta al 20 → fin
    **`2026-11-18`**. La duración **solo** cambia si `fechaFin` viene explícito.
- **HTTP / códigos**:
  - 201 Created.
  - 400 VALIDATION_ERROR — "Fecha de inicio es requerida" / "Fecha fin es requerida", "Fecha ... debe ser una fecha válida (YYYY-MM-DD)", "Fecha fin no puede ser anterior a fecha de inicio".
  - 409 SERVICIO_SOLAPADA (código propuesto, P-06) — solape inclusive DEC-008.
  - 404 NOT_FOUND — cliente inexistente.
  - 403 AUTH_FORBIDDEN — rol CLIENTE.
  - 409 CLIENTE_INACTIVO — cliente INACTIVO (guard HU-08, HU08-C04b).
- **Qué NO cubre**: congelación (HU-15), vencimiento por job (HU-16), contenido del plan nutricional (DEC-019 bloque 7, HU-22/23), anamnesis/nutrición clínica.
- **Prueba esperada**: integración `hu14-servicio-nutricion.test.ts` → creación 201, validación de fechas, solape 409, renovación, 404/403/409 cliente inactivo.

### HU14-C02a — Estado: activo, vencido, no contratado (+ programada, P-05)
- **Condición previa**: cliente con 0 o N vigencias de nutrición; "hoy" en America/Bogota con extremos inclusivos (DEC-005/006).
- **Disparo**: `GET /clientes/:clienteId/servicios-nutricion` (o la ficha).
- **Resultado observable**:
  - `NO_CONTRATADO`: 0 vigencias.
  - `ACTIVA`: `fechaInicio ≤ hoy ≤ fechaFin` (día final con acceso).
  - `VENCIDA`: `hoy > fechaFin`.
  - `PROGRAMADA`: `hoy < fechaInicio` — propuesta por consistencia con gym (P-05; la HU no la nombra).
- **HTTP / códigos**: 200 + `fechaActual`; 404 si el cliente no existe.
- **Qué NO cubre**: CONGELADO (C02b, ahora en alcance: DEC-042/043), extensión de vencimiento por congelación (HU-15), transiciones automáticas (HU-16).
- **Prueba esperada**: integración con fechas fijas → NO_CONTRATADO / ACTIVA en el día final / VENCIDA al día siguiente / PROGRAMADA (literal DEC-043) futuro.

### HU14-C02b — Estado congelado — **factible en INC-05** *(enmienda 2026-10-20, DEC-042 + DEC-043)*
- **Resultado esperado**: `CONGELADO` durante el periodo de congelación definido por HU-15 (literal único por **DEC-043**: antes este documento escribía `CONGELADA`).
- **Estado**: **DEC-042** (2026-10-20) enmendó DEC-023 → `TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}`; nutrición **sí es congelable**, la guarda `CONGELACION_NO_PERMITIDA` ya no la rechaza y el estado se calcula con la misma fuente que gym. **C02b se cierra en INC-05** (criterio `INC05-NUT-03`). *(La versión anterior decía "no verificable… No se cierra en INC-05 salvo que HU-15 entre en alcance": enmienda 2026-10-20.)*
- **Qué NO cubre**: fechas/motivo de congelación y extensión automática (todo HU-15, ya aceptado; aquí solo se observa el estado).

### HU14-C03 — La vigencia queda visible en la ficha del cliente
- **Condición previa**: cliente con ≥ 1 vigencia de nutrición.
- **Disparo**: `GET /clientes/:clienteId/servicios-nutricion` y `GET /clientes/:id` (ficha).
- **Resultado observable**:
  - Listado: 200 `{ servicios: [...], fechaActual }` con fechas, estado calculado y `creadoPor/actualizadoPor`.
  - Ficha: la vigencia de nutrición aparece con fechas y estado.
- **HTTP / códigos**: 200 · 404 NOT_FOUND · 403 AUTH_FORBIDDEN.
- **Qué NO cubre**: la vista unificada de los **tres** tipos de vigencia (bullet de HU-07), UI de la ficha, notas/historial.
- **Prueba esperada**: integración → "la vigencia creada aparece en el listado y en la ficha con el estado calculado".
- **Nota anti-duplicado**: el punto de HU-14 se verifica en el **listado propio** (`servicios-nutricion`); la superficie unificada de 3 tipos puntúa en HU-07.

### HU14-C04 — El plan nutricional activo depende de la vigencia (DEC-019)
- **Condición previa** (futura): cliente con vigencia de nutrición en estado X y con un plan nutricional asignado (plantilla simple, DEC-019).
- **Disparo**: consulta del plan del cliente (`GET /clientes/:id` → `planNutricionalActivo`, o el endpoint de asignación cuando exista).
- **Resultado observable**:
  - X = `ACTIVA` → `planNutricionalActivo` se expone.
  - X ∈ {`NO_CONTRATADO`, `VENCIDA`, `CONGELADO`} → `planNutricionalActivo` = `null` (la asignación subyacente no se borra).
- **Estado del criterio**: **SPEC listo / implementación diferida**. La plantilla simple del plan y su asignación llegan en el bloque 7 (DEC-019, HU-22/23). Este documento **solo expresa la dependencia**; no especifica la estructura del plan.
- **HTTP / códigos**: 200 con `planNutricionalActivo` condicionado (contrato de ficha, HU-07).
- **Qué NO cubre**: creación/editición del plan y su plantilla (HU-22), asignación (HU-23), historial de planes (HU-27).
- **Prueba esperada (cuando exista asignación)**: integración → "vigencia ACTIVA + plan asignado → plan no nulo", "vigencia VENCIDA + mismo plan → plan null".

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| clienteId | Existente | uid-123 | No existe | uid-xxx |
| fechaInicio | YYYY-MM-DD real, requerida | 2026-11-01 | Vacía, formato, día inexistente | "", "2026-13-01" |
| fechaFin | YYYY-MM-DD real ≥ fechaInicio | 2026-11-30 | Anterior al inicio | 2026-10-31 |
| periodo nuevo | Sin solape (gap ok) | finPrevio + 1 | Solape inclusive | inicio = finPrevio |
| rol | DUENO o RECEPCIONISTA (DEC-017) | DUENO | CLIENTE | CLIENTE |
| estado cliente | ≠ INACTIVO | ACTIVO | INACTIVO | 409 CLIENTE_INACTIVO |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| duración del periodo (días, inclusiva) | int | 1 (`inicio == fin`) | ilimitado | fin < inicio (400) | — |
| inicio nuevo vs finPrevio | fecha | `finPrevio + 1` (201) | — | `finPrevio` (409 solape) | — |
| fecha | string | "2026-01-01" | "9999-12-31" | "" (400) | "2026-02-30" (400) |
| version (PATCH) | int | 1 | N | 0 (400) | N+1 (409 SERVICIO_CONFLICTO) |

## Tabla de Decisiones

### D1 — Crear vigencia de nutrición
| cliente existe | cliente INACTIVO | rol válido | fechas válidas | sin solape | Acción |
|---|---|---|---|---|---|
| true | false | DUENO/RECEPCIONISTA | true | true | 201 vigencia creada + auditoría |
| true | false | DUENO/RECEPCIONISTA | true | false | 409 SERVICIO_SOLAPADA |
| true | false | DUENO/RECEPCIONISTA | false | * | 400 VALIDATION_ERROR |
| true | **true** | * | * | * | 409 CLIENTE_INACTIVO (HU08-C04b) |
| true | false | CLIENTE | * | * | 403 AUTH_FORBIDDEN |
| false | * | * | * | * | 404 NOT_FOUND |

### D2 — Estado calculado (HU14-C02a)
| vigencias | hoy vs rango | Estado |
|---|---|---|
| 0 | — | NO_CONTRATADO |
| ≥1 | hoy < fechaInicio | PROGRAMADA (P-05) |
| ≥1 | fechaInicio ≤ hoy ≤ fechaFin | ACTIVA |
| ≥1 | hoy > fechaFin | VENCIDA |
| ≥1 | periodo congelado (HU-15) | CONGELADO (C02b, en alcance INC-05 por DEC-042) |

### D3 — Dependencia plan ↔ vigencia (HU14-C04, spec futuro)
| vigencia ACTIVA | plan asignado (plantilla simple, DEC-019) | `planNutricionalActivo` |
|---|---|---|
| sí | sí | plan expuesto |
| no (NO_CONTRATADO/VENCIDA/CONGELADO) | sí | `null` |
| * | no | `null` |

## Transiciones de Estado
### Vigencia de servicio de nutrición (estado calculado, no persistido)
```
[NO_CONTRATADO] --crear vigencia con hoy dentro del rango--> [ACTIVA]
[NO_CONTRATADO] --crear vigencia futura--> [PROGRAMADA]
[PROGRAMADA]    --llega fechaInicio (DEC-005/006)--> [ACTIVA]
[ACTIVA]        --pasa fechaFin+1 día--> [VENCIDA]
[ACTIVA]        --inicia congelación (HU-15)--> [CONGELADO]
[CONGELADO]     --termina congelación (HU-15)--> [ACTIVA] (fechaFin extendida)
[VENCIDA]       --renovar (DEC-007: periodo nuevo)--> nueva fila [PROGRAMADA/ACTIVA]
```
Transiciones **inválidas**: `VENCIDA → ACTIVA` sin periodo nuevo (DEC-007 protege el histórico); `NO_CONTRATADO → VENCIDA`; escritura manual del estado vía API (no existe endpoint).

## Cobertura de Ramas
### Ruta: POST /api/clientes/:clienteId/servicios-nutricion
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | 2026-11-01 .. 2026-11-30 | 201, estado calculado, version 1, actor |
| 2 | Duración mínima | inicio == fin | 201 (día inclusivo) |
| 3 | fin < inicio | invertidas | 400 "Fecha fin no puede ser anterior a fecha de inicio" |
| 4 | fecha vacía | "" | 400 "Fecha ... es requerida" |
| 5 | fecha inválida | "2026-02-30" | 400 "Fecha ... debe ser una fecha válida (YYYY-MM-DD)" |
| 6 | solape inclusive | inicio = finPrevio | 409 SERVICIO_SOLAPADA |
| 7 | renovación (gap) | inicio = finPrevio + 1 | 201, periodo nuevo (DEC-007/008) |
| 8 | version vieja (PATCH) | version N-1 | 409 SERVICIO_CONFLICTO |
| 9 | cliente inexistente | id inexistente | 404 NOT_FOUND |
| 10 | rol CLIENTE | token CLIENTE | 403 AUTH_FORBIDDEN |
| 11 | cliente INACTIVO | cliente en INACTIVO | 409 CLIENTE_INACTIVO |

### Ruta: GET /api/clientes/:clienteId/servicios-nutricion
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | sin vigencias | cliente sin registros | 200 `servicios: []` (+ NO_CONTRATADO en ficha) |
| 2 | varias vigencias | 2 periodos | 200 ambos, ordenados desc |
| 3 | bordes de fecha | hoy = fin / fin+1 | ACTIVA / VENCIDA |
| 4 | cliente inexistente | id inexistente | 404 NOT_FOUND |

### Ruta: PATCH /api/clientes/:clienteId/servicios-nutricion/:servicioId
*(en alcance por DEC-046 = (a); cobertura de la rama 8 y de DEC-047 — enmienda 2026-10-20)*
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Edición de fechas con `fechaFin` explícito | `{ fechaInicio, fechaFin, version }` válidos | 200, fechas actualizadas, versión +1; la duración es la pedida en el body |
| 2 | **DEC-047**: mover solo `fechaInicio` +1 día (plan de 30 días) | inicio `2026-10-20`→`2026-10-21`, sin `fechaFin` | 200, `fechaFin` pasa de `2026-11-18` a **`2026-11-19`** (duración inclusiva de 30 días intacta) |
| 3 | **DEC-047**: retroceder `fechaInicio` −1 día | inicio `2026-10-21`→`2026-10-20`, sin `fechaFin` | 200, `fechaFin` vuelve a **`2026-11-18`** |
| 4 | **DEC-047**: editar `fechaFin` explícitamente | `{ fechaFin: nueva, version }` | 200, la duración cambia según lo pedido en el body |
| 5 | versión vieja (rama 8) | `version` = N-1 | 409 `SERVICIO_CONFLICTO` |
| 6 | fechas inconsistentes | `fechaFin` < `fechaInicio` (ambas en el body) | 400 "Fecha fin no puede ser anterior a fecha de inicio" |
| 7 | solape tras mover el inicio | nuevo rango solapado con otro periodo del mismo tipo | 409 `SERVICIO_SOLAPADA` |
| 8 | servicio ajeno / inexistente | `servicioId` de otro cliente | 404 `NOT_FOUND` ("Servicio no encontrado") |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex / Regla | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| clienteId | string | sí (params) | - | 1-36 | UUID/cuid existente |
| servicioId | string | sí (PATCH params) | - | 1-36 | UUID/cuid del periodo |
| fechaInicio | string | sí (POST) | /^\d{4}-\d{2}-\d{2}$/ + calendario real | 10 | fecha válida |
| fechaFin | string | sí (POST) | ídem + ≥ fechaInicio | 10 | fecha válida |
| version | int | sí (PATCH) | entero positivo | ≥1 | N vigente |

## Escenarios Gherkin (borrador — NO crear `.feature` todavía; los conecta test-engineer en RED)

```gherkin
Feature: Registro de servicio de nutricion
  Como dueno
  Quiero registrar la vigencia del servicio de nutricion
  Para controlar si el cliente tiene acceso a un plan nutricional activo

  Background:
    Given soy un usuario autenticado como "DUENO"
    And existe un cliente con cédula "1234567890" en estado "ACTIVO"

  # HU14-C01
  Scenario: Registrar la vigencia del servicio de nutricion
    When registro el servicio de nutricion con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 201
    And la vigencia queda creada con version 1 y el actor responsable

  # HU14-C01 — recepcionista también gestiona (DEC-017)
  Scenario: Recepcionista registra una vigencia de nutricion
    Given soy un usuario autenticado como "RECEPCIONISTA"
    When registro el servicio de nutricion con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 201

  # HU14-C01 — validación por campo
  Scenario Outline: Rechazar fechas inválidas al registrar el servicio
    When intento registrar el servicio de nutricion con inicio "<inicio>" y fin "<fin>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | inicio | fin | mensaje |
      |  | 2026-11-30 | Fecha de inicio es requerida |
      | 2026-11-01 |  | Fecha fin es requerida |
      | 2026-11-30 | 2026-11-01 | Fecha fin no puede ser anterior a fecha de inicio |
      | 2026-02-30 | 2026-11-30 | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |
      | abc | 2026-11-30 | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |

  # HU14-C01 — DEC-008 solape / DEC-007 renovación
  Scenario: Rechazar periodo solapado con uno existente
    Given el cliente tiene una vigencia de nutricion del "2026-11-01" al "2026-11-30"
    When registro una vigencia de nutricion del "2026-11-30" al "2026-12-15"
    Then el sistema retorna estado 409 con código "SERVICIO_SOLAPADA"

  Scenario: Renovar crea un periodo nuevo sin sobrescribir el anterior
    Given el cliente tiene una vigencia de nutricion del "2026-11-01" al "2026-11-30"
    When registro una vigencia de nutricion del "2026-12-01" al "2026-12-31"
    Then el sistema retorna estado 201
    And el listado muestra dos periodos

  # HU14-C02a — estados calculados
  Scenario: Estado sin vigencias contratadas
    Given el cliente no tiene vigencias de nutricion
    When consulto las vigencias del servicio de nutricion
    Then el sistema retorna estado 200 con lista vacía
    And la ficha muestra el servicio como "NO_CONTRATADO"

  Scenario: La vigencia sigue activa en su día final
    Given el cliente tiene una vigencia de nutricion que termina hoy
    When consulto las vigencias del servicio de nutricion
    Then el estado calculado es "ACTIVA"

  Scenario: La vigencia vence al día siguiente de su fecha fin
    Given el cliente tiene una vigencia de nutricion que terminó ayer
    When consulto las vigencias del servicio de nutricion
    Then el estado calculado es "VENCIDA"

  # HU14-C03
  Scenario: La vigencia de nutricion es visible en la ficha
    Given el cliente tiene una vigencia de nutricion activa
    When consulto la ficha del cliente
    Then la ficha muestra la vigencia de nutricion con sus fechas y estado

  # HU14-C04 — dependencia (conectable cuando exista asignación de plan, DEC-019)
  Scenario: El plan nutricional activo depende de la vigencia del servicio
    Given el cliente tiene un plan nutricional asignado
    And su servicio de nutricion está vencido
    When consulto el plan nutricional del cliente
    Then la ficha no muestra plan nutricional activo

  # Ramas de error
  Scenario: Registrar vigencia para cliente inexistente retorna 404
    When registro el servicio de nutricion para el cliente "nonexistent-id"
    Then el sistema retorna estado 404

  Scenario: El rol CLIENTE no puede registrar vigencias
    Given soy un usuario autenticado como "CLIENTE"
    When registro el servicio de nutricion con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 403

  Scenario: No se registra vigencia para un cliente inactivo
    Given existe un cliente en estado "INACTIVO"
    When registro el servicio de nutricion con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 409 con código "CLIENTE_INACTIVO"
```

## Gaps vs código actual
| Gap | Evidencia | Criterio |
|-----|-----------|----------|
| No existe modelo de vigencia de nutrición (solo `MembresiaGym`) | `prisma/schema.prisma:60-76`; grep `NUTRICION` = 0 en `src/` | HU14-C01 |
| No existe ruta de servicios de nutrición | `src/routes/` solo `auth.ts`, `clientes.ts`, `membresia.ts` | HU14-C01 |
| No existe servicio ni cálculo de estado para nutrición | `src/services/` sin archivo equivalente | HU14-C02a |
| La ficha solo incluye `membresias` (GYM) | `src/services/cliente.service.ts:52-58` | HU14-C03 |
| No existe plan nutricional ni asignación (requisito previo de C04) | grep `planNutricional|PlanNutricional` = 0 en `src/` y `prisma/` | HU14-C04 (DEC-019 bloque 7) |
| El guard de cliente INACTIVO no existe en creación de servicios | `src/services/membresia.service.ts:154-208` | HU14-C01 (409 CLIENTE_INACTIVO) |

## Preguntas al producto
| ID | Pregunta | Impacto | Criterio |
|----|----------|---------|----------|
| **P-05** | **RESUELTA 2026-10-20 (DEC-043)**: periodo futuro = `PROGRAMADA`; congelación = `CONGELADO` (G14 enmendados de `CONGELADA`). Histórico: ¿estado para periodo futuro y literal `CONGELADO` vs `CONGELADA`? | Valores exactos a asertar en C02a/C02b. | HU14-C02a/C02b |
| **P-06** | **RESUELTA 2026-10-20 (DEC-044 = (a))**: paths/códigos propuestos aprobados (`POST/GET .../servicios-nutricion`, `PATCH .../:servicioId` con DEC-046/DEC-047, `SERVICIO_SOLAPADA`/`SERVICIO_CONFLICTO`); solo falta la ratificación técnica de `backend-developer`. | Fija el contrato API antes del RED de INC-05 (Definition of Ready). | HU14-C01 |
