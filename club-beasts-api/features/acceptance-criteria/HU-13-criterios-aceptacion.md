# Criterios de Aceptación - HU-13: Registro de servicio personalizado

## Resumen

Registrar la vigencia del servicio de entrenamiento personalizado (fecha inicio/fin), derivar su estado (activo/vencido/congelado/no contratado), mostrarla en la ficha del cliente y fijar la regla de dependencia: **la rutina personalizada solo se considera activa si el servicio personalizado está vigente**.

**Decisiones aplicadas**: DEC-001 (roles), DEC-004 (servicios separados: gym, personalizado, nutrición), DEC-005/006 (días completos America/Bogota, extremos inclusivos), DEC-007 (renovar crea periodo nuevo), DEC-008 (solapamientos rechazados, gaps permitidos), DEC-016 (fraccionable), **DEC-017** (DUENO y RECEPCIONISTA gestionan vigencias — prevalece sobre el "Como dueno" narrativo de la HU), **DEC-018** (la rutina personalizada usará estructura macro-meso-micro; aquí solo se expresa la **dependencia de vigencia**, sin implementar la estructura de rutinas).

**Enmiendas G14 (2026-10-20, decisión de Producto)**: **DEC-043** — literal de estado
de congelación unificado a **`CONGELADO`** (antes `CONGELADA` en tablas/enum y
`CONGELADO` en prosa: inconsistencia interna corregida); **DEC-046 = (a)** — el
`PATCH .../:servicioId` con concurrencia optimista **sí** está en alcance de INC-05
(se corrigió la frase "Qué NO cubre" de HU13-C01); **DEC-047** — nueva regla de
negocio del `PATCH`: mover solo `fechaInicio` desplaza `fechaFin` por el mismo
delta conservando la duración inclusiva; **DEC-042** (vía INC-05) — HU-15 ya está
aceptada (INC-02) y la congelación alcanza a `PERSONALIZADO`, por lo que **C02b sí
es factible en INC-05** (nota de alcance actualizada).

**Alcance y notas**:
- Contrato aprobado (**P-06 resuelta por DEC-044**, 2026-10-20; ratificación técnica por `backend-developer` pendiente en INC-05): `POST/GET /clientes/:clienteId/servicios-personalizado`, `PATCH .../servicios-personalizado/:servicioId` (**incluido por DEC-046**, con regla **DEC-047**), espejo del contrato ya aceptado de membresías gym (`src/routes/membresia.ts`).
- `mvp.md:54`: HU-13 **no se acepta completa solo por registrar vigencias**; el bullet 4 (dependencia rutina ↔ vigencia) se cierra cuando exista la asignación de rutina (bloque 6). Fracción máxima alcanzable solo con vigencias: **3/4**.
- El estado CONGELADO **ya es factible en INC-05** (HU-15 aceptada en INC-02, 4/4,
  con `PERSONALIZADO` en su alcance; literal `CONGELADO` por DEC-043) → el bullet 2
  se cierra en partes (C02a / C02b), ambas en alcance de INC-05 *(enmienda
  2026-10-20, DEC-042/DEC-043)*.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado | Puntuable INC-05 |
|---|-----------------|-----------|--------|------------------|
| 1 | El sistema permite registrar fecha de inicio y fecha fin del servicio personalizado. | HU13-C01 | LISTO para RED | Sí |
| 2 | El sistema permite marcar el servicio como activo, vencido, congelado o no contratado. | HU13-C02a (activo/vencido/no contratado [+ prog. P-05]) + HU13-C02b (congelado) | C02a y C02b **LISTO para RED** *(2026-10-20: DEC-042/043)* | Sí; C02b verificable en INC-05 |
| 3 | La vigencia queda visible en la ficha del cliente. | HU13-C03 | LISTO para RED | Sí |
| 4 | La rutina personalizada solo puede considerarse activa si el servicio personalizado esta vigente. | HU13-C04 | SPEC LISTO / **IMPLEMENTACIÓN DIFERIDA** (asignación de rutina, DEC-018 bloque 6) | Cuando exista la asignación (`mvp.md:54`) |

## Detalle por criterio

### HU13-C01 — Registrar fecha de inicio y fin
- **Condición previa**: cliente existente; actor autenticado DUENO o RECEPCIONISTA (DEC-017).
- **Disparo**: `POST /clientes/:clienteId/servicios-personalizado` con `{ "fechaInicio": "2026-11-01", "fechaFin": "2026-11-30" }`.
- **Resultado observable**:
  - 201 con el DTO de la vigencia: `{ id, clienteId, fechaInicio, fechaFin, estado, version: 1, creadoPor: {id,nombre}, actualizadoPor: {id,nombre}, createdAt, updatedAt }`.
  - En BD: `creadoPorId` y `actualizadoPorId` = actor; registro de auditoría CREACIÓN con version 1 (patrón `INC00-MEM-04`).
  - **Renovación (DEC-007)**: un POST posterior con `fechaInicio` ≥ `fechaFinPrevio + 1` crea un periodo **nuevo** sin sobrescribir los anteriores (GET devuelve ambos).
  - **Edición `PATCH .../:servicioId` (incluida por DEC-046 = (a), 2026-10-20)**: cuerpo
    `{ fechaInicio?, fechaFin?, version }` con concurrencia optimista (versión vieja →
    409 `SERVICIO_CONFLICTO`, fila 8). **Regla DEC-047 (2026-10-20)**: si el cuerpo trae
    **solo `fechaInicio`**, `fechaFin` se mueve automáticamente por el **mismo delta de
    días**, conservando la duración inclusiva exacta del plan — ejemplo con plan de 30
    días: inicio `2026-10-20` → fin `2026-11-18`; mover el inicio al 21 → fin
    **`2026-11-19`**; volver el inicio al 20 → fin **`2026-11-18`**. La duración **solo**
    cambia si `fechaFin` viene explícitamente en el cuerpo.
- **HTTP / códigos**:
  - 201 Created.
  - 400 VALIDATION_ERROR — "Fecha de inicio es requerida" / "Fecha fin es requerida" (vacías o ausentes), "Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)" (formato o día inexistente), "Fecha fin no puede ser anterior a fecha de inicio".
  - 409 SERVICIO_SOLAPADA (código propuesto; ver P-06) — "Las fechas se solapan con un período existente" (DEC-008, extremos inclusivos: `nuevoInicio <= finPrevio && inicioPrevio <= nuevoFin`).
  - 404 NOT_FOUND — cliente inexistente.
  - 403 AUTH_FORBIDDEN — rol CLIENTE.
  - 409 CLIENTE_INACTIVO — cliente INACTIVO (guard de HU-08, HU08-C04b).
- **Qué NO cubre**: congelación de la vigencia (operación HU-15, ya aceptada en INC-02 — aquí solo se observa su efecto en C02b), vencimiento automático por job (HU-16), estructura de la rutina (DEC-018/HU-19). **Sí cubre** la edición `PATCH` con control de concurrencia (rama 8) y la regla DEC-047 de duración inclusiva, ambos **en alcance de INC-05 por DEC-046/DEC-047** *(enmienda 2026-10-20: la versión anterior de esta frase decía "edición con control de concurrencia (ver rama 8)", contradiciendo la propia fila 8)*.
- **Prueba esperada**: integración `hu13-servicio-personalizado.test.ts` → creación 201, fechas límite, solape 409, renovación crea periodo nuevo, 404/403/409 cliente inactivo.

### HU13-C02a — Estado: activo, vencido, no contratado (+ programada, P-05)
- **Condición previa**: cliente con 0, 1 o N vigencias de personalizado; "hoy" calculado en America/Bogota (`getTodayBogota`) con extremos inclusivos (DEC-005/006).
- **Disparo**: `GET /clientes/:clienteId/servicios-personalizado` (o la ficha).
- **Resultado observable** (estado **calculado**, nunca persistido):
  - `NO_CONTRATADO`: cliente con 0 vigencias.
  - `ACTIVA`: `fechaInicio ≤ hoy ≤ fechaFin` (el día final sigue dando acceso, DEC-006).
  - `VENCIDA`: `hoy > fechaFin`.
  - `PROGRAMADA`: `hoy < fechaInicio` — **propuesta** por consistencia con `calcularEstado` de gym (ver P-05: la HU no la nombra).
- **HTTP / códigos**: 200 con `fechaActual` además de los estados; 404 si el cliente no existe.
- **Qué NO cubre**: CONGELADO (→ C02b, ahora también en alcance: DEC-042/043), extensión automática de la fecha fin por congelación (HU-15), cambio de estado persistido por job (HU-16).
- **Prueba esperada**: integración con fechas fijas → "sin vigencias → NO_CONTRATADO", "hoy == fechaFin → ACTIVA (inclusivo)", "hoy == fechaFin + 1 → VENCIDA", "hoy < fechaInicio → PROGRAMADA (literal fijado por DEC-043)".

### HU13-C02b — Estado congelado — **factible en INC-05** *(enmienda 2026-10-20, DEC-042 + DEC-043)*
- **Resultado esperado**: `CONGELADO` cuando la vigencia esté en periodo de congelación definido por HU-15 (literal único por **DEC-043**: antes este documento escribía `CONGELADA`).
- **Estado**: HU-15 **ya está aceptada** (INC-02, 4/4) con alcance `GYM + PERSONALIZADO` (DEC-023) y **DEC-042 enmendó DEC-023** (2026-10-20) dejando `TIPOS_CONGELABLES = {GYM, PERSONALIZADO, NUTRICION}`; el estado `CONGELADO` existe en la API desde INC-02. **C02b se cierra en INC-05** (criterio `INC05-PER-03`). *(La versión anterior decía "no verificable… No se cierra en INC-05 salvo que HU-15 entre en alcance": HU-15 ya está en alcance — enmienda 2026-10-20.)*
- **Qué NO cubre**: fechas de congelación, motivo de congelación, extensión del vencimiento (todo HU-15, ya aceptado; aquí solo se observa el estado).

### HU13-C03 — La vigencia queda visible en la ficha del cliente
- **Condición previa**: cliente con ≥ 1 vigencia de personalizado.
- **Disparo**: `GET /clientes/:clienteId/servicios-personalizado` y `GET /clientes/:id` (ficha).
- **Resultado observable**:
  - Listado: 200 `{ servicios: [...], fechaActual }` con fechas, estado calculado y `creadoPor/actualizadoPor` (quién creó/actualizó, coherente con HU-12).
  - Ficha: el cliente muestra su vigencia de personalizado (fechas + estado) sin necesidad de otra consulta.
- **HTTP / códigos**: 200 · 404 NOT_FOUND · 403 AUTH_FORBIDDEN.
- **Qué NO cubre**: la vista unificada de los **tres** tipos de vigencia en la ficha (bullet de HU-07, fuera de este documento para no duplicar), diseño/UI de la ficha, notas e historial.
- **Prueba esperada**: integración → "la vigencia creada aparece en el listado y en la ficha con el estado calculado".
- **Nota anti-duplicado**: el punto de HU-13 se verifica en el **listado propio** (`servicios-personalizado`) y, cuando HU-07 amplíe la ficha, también allí; la superficie unificada de 3 tipos puntúa en HU-07.

### HU13-C04 — La rutina personalizada solo está activa con servicio vigente (DEC-018)
- **Condición previa** (futura): cliente con vigencia de personalizado en estado X y con una rutina personalizada asignada.
- **Disparo**: consulta del estado de rutina del cliente (`GET /clientes/:id` → `rutinaActiva`, o el endpoint de asignación cuando exista).
- **Resultado observable**:
  - Si X = `ACTIVA` → `rutinaActiva` se expone como activa.
  - Si X ∈ {`NO_CONTRATADO`, `VENCIDA`, `CONGELADO`} → `rutinaActiva` se expone `null` (la rutina no cuenta como activa), sin borrar la asignación subyacente.
- **Estado del criterio**: **SPEC listo / implementación diferida**. La estructura de la rutina personalizada (macro-meso-micro) y su asignación llegan en el bloque 6 (DEC-018, HU-19/HU-20). Este documento **solo expresa la dependencia**; no implementa ni especifica bloques de rutina.
- **HTTP / códigos**: 200 con `rutinaActiva` condicionado (contrato de ficha, HU-07).
- **Qué NO cubre**: creación/estructura de rutinas (HU-18/HU-19), asignación (HU-20), historial de rutinas (HU-26), edición de la rutina (HU-21).
- **Prueba esperada (cuando exista asignación)**: integración → "vigencia ACTIVA + rutina asignada → rutinaActiva no nula", "vigencia VENCIDA + misma rutina → rutinaActiva null".

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| clienteId | Existente | uid-123 | No existe | uid-xxx |
| fechaInicio | YYYY-MM-DD real, requerida | 2026-11-01 | Vacía, formato, día inexistente | "", "2026-13-01", "01/11/2026" |
| fechaFin | YYYY-MM-DD real ≥ fechaInicio | 2026-11-30 | Anterior al inicio, vacía | 2026-10-31 con inicio 2026-11-01 |
| periodo nuevo | Sin solape con existentes (gap permitido) | inicio = finPrevio + 1 | Solape (inclusive) | inicio = finPrevio |
| rol | DUENO o RECEPCIONISTA (DEC-017) | RECEPCIONISTA | CLIENTE | CLIENTE |
| estado cliente | ≠ INACTIVO | ACTIVO | INACTIVO | INACTIVO → 409 CLIENTE_INACTIVO |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| duración del periodo (días, inclusiva) | int | 1 (`inicio == fin`) | ilimitado | — (fin < inicio → 400) | — |
| fechaInicio vs fechaFin | fecha | `inicio == fin` válido | `fin > inicio` | `fin = inicio - 1` (400) | — |
| inicio nuevo vs finPrevio | fecha | `inicio = finPrevio + 1` (201, gap ok) | — | `inicio = finPrevio` (409 solape, inclusive) | — |
| fecha | string | "2026-01-01" | "9999-12-31" | "" (400) | "2026-02-30" (400, día inexistente) |
| version (PATCH) | int | 1 | N | 0 (400) | N+1 (409 SERVICIO_CONFLICTO) |

## Tabla de Decisiones

### D1 — Crear vigencia de personalizado
| cliente existe | cliente INACTIVO | rol válido | fechas válidas | sin solape | Acción |
|---|---|---|---|---|---|
| true | false | DUENO/RECEPCIONISTA | true | true | 201 vigencia creada + auditoría |
| true | false | DUENO/RECEPCIONISTA | true | false | 409 SERVICIO_SOLAPADA (DEC-008) |
| true | false | DUENO/RECEPCIONISTA | false | * | 400 VALIDATION_ERROR |
| true | **true** | * | * | * | 409 CLIENTE_INACTIVO (HU08-C04b) |
| true | false | CLIENTE | * | * | 403 AUTH_FORBIDDEN |
| false | * | * | * | * | 404 NOT_FOUND |

### D2 — Estado calculado (HU13-C02a)
| vigencias | hoy vs rango | Estado |
|---|---|---|
| 0 | — | NO_CONTRATADO |
| ≥1 | hoy < fechaInicio | PROGRAMADA (P-05) |
| ≥1 | fechaInicio ≤ hoy ≤ fechaFin | ACTIVA |
| ≥1 | hoy > fechaFin | VENCIDA |
| ≥1 | en periodo congelado (HU-15) | CONGELADO (C02b, en alcance INC-05) |

### D3 — Dependencia rutina ↔ vigencia (HU13-C04, spec futuro)
| vigencia ACTIVA | rutina asignada | `rutinaActiva` |
|---|---|---|
| sí | sí | rutina activa expuesta |
| no (NO_CONTRATADO/VENCIDA/CONGELADO) | sí | `null` |
| * | no | `null` (independiente) |

## Transiciones de Estado
### Vigencia de servicio personalizado (estado calculado, no persistido)
```
[NO_CONTRATADO] --crear vigencia con hoy dentro del rango--> [ACTIVA]
[NO_CONTRATADO] --crear vigencia futura--> [PROGRAMADA]
[PROGRAMADA]    --llega fechaInicio (DEC-005/006)--> [ACTIVA]
[ACTIVA]        --pasa fechaFin+1 día--> [VENCIDA]
[ACTIVA]        --inicia congelación (HU-15)--> [CONGELADO]
[CONGELADO]     --termina congelación (HU-15)--> [ACTIVA] (fechaFin extendida)
[VENCIDA]       --renovar (DEC-007: periodo nuevo)--> nueva fila [PROGRAMADA/ACTIVA]
```
Transiciones **inválidas**: `VENCIDA → ACTIVA` sin crear periodo nuevo (no se reescribe el histórico, DEC-007); `NO_CONTRATADO → VENCIDA` (sin vigencia no hay estado calculado); alteración manual de un estado calculado vía API (no existe endpoint de escritura de estado).

## Cobertura de Ramas
### Ruta: POST /api/clientes/:clienteId/servicios-personalizado
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | 2026-11-01 .. 2026-11-30 | 201, estado calculado, version 1, actor registrado |
| 2 | Duración mínima | inicio == fin | 201, estado ACTIVA si hoy = ese día |
| 3 | fin < inicio | 2026-11-30 .. 2026-11-01 | 400 "Fecha fin no puede ser anterior a fecha de inicio" |
| 4 | fecha vacía | "" | 400 "Fecha ... es requerida" |
| 5 | fecha inválida | "2026-02-30" / "abc" | 400 "Fecha ... debe ser una fecha válida (YYYY-MM-DD)" |
| 6 | solape inclusive | inicio = finPrevio | 409 SERVICIO_SOLAPADA |
| 7 | renovación (gap) | inicio = finPrevio + 1 | 201, periodo nuevo junto al anterior (DEC-007/008) |
| 8 | edición con version vieja | version = N vieja | 409 SERVICIO_CONFLICTO (patrón MEM-03) |
| 9 | cliente inexistente | id inexistente | 404 NOT_FOUND |
| 10 | rol CLIENTE | token CLIENTE | 403 AUTH_FORBIDDEN |
| 11 | cliente INACTIVO | estado del cliente INACTIVO | 409 CLIENTE_INACTIVO (HU08-C04b) |

### Ruta: GET /api/clientes/:clienteId/servicios-personalizado
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | sin vigencias | cliente sin registros | 200 `servicios: []` + estado implícito NO_CONTRATADO en ficha |
| 2 | varias vigencias | 2 periodos (renovación) | 200 ambos, ordenados por fechaInicio desc |
| 3 | bordes de fecha | hoy = fin / fin+1 | ACTIVA / VENCIDA (inclusivos) |
| 4 | cliente inexistente | id inexistente | 404 NOT_FOUND |

### Ruta: PATCH /api/clientes/:clienteId/servicios-personalizado/:servicioId
*(en alcance por DEC-046 = (a); cobertura de la rama 8 y de DEC-047 — enmienda 2026-10-20)*
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Edición de fechas con `fechaFin` explícito | `{ fechaInicio, fechaFin, version }` válidos | 200, fechas actualizadas, versión +1; la duración es la pedida en el body |
| 2 | **DEC-047**: mover solo `fechaInicio` +1 día (plan de 30 días) | inicio `2026-10-20`→`2026-10-21`, sin `fechaFin` | 200, `fechaFin` pasa de `2026-11-18` a **`2026-11-19`** (duración inclusiva de 30 días intacta) |
| 3 | **DEC-047**: retroceder `fechaInicio` −1 día | inicio `2026-10-21`→`2026-10-20`, sin `fechaFin` | 200, `fechaFin` vuelve a **`2026-11-18`** |
| 4 | **DEC-047**: editar `fechaFin` explícitamente | `{ fechaFin: nueva, version }` | 200, la duración cambia según lo pedido en el body |
| 5 | versión vieja (rama 8) | `version` = N vieja | 409 `SERVICIO_CONFLICTO` |
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
Feature: Registro de servicio personalizado
  Como dueno
  Quiero registrar la vigencia del servicio personalizado
  Para controlar si el cliente tiene acceso a una rutina personalizada activa

  Background:
    Given soy un usuario autenticado como "DUENO"
    And existe un cliente con cédula "1234567890" en estado "ACTIVO"

  # HU13-C01
  Scenario: Registrar la vigencia del servicio personalizado
    When registro el servicio personalizado con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 201
    And la vigencia queda creada con version 1 y el actor responsable

  # HU13-C01 — recepcionista también gestiona (DEC-017)
  Scenario: Recepcionista registra una vigencia de personalizado
    Given soy un usuario autenticado como "RECEPCIONISTA"
    When registro el servicio personalizado con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 201

  # HU13-C01 — validación por campo
  Scenario Outline: Rechazar fechas inválidas al registrar el servicio
    When intento registrar el servicio personalizado con inicio "<inicio>" y fin "<fin>"
    Then el sistema muestra error "<mensaje>"

    Examples:
      | inicio | fin | mensaje |
      |  | 2026-11-30 | Fecha de inicio es requerida |
      | 2026-11-01 |  | Fecha fin es requerida |
      | 2026-11-30 | 2026-11-01 | Fecha fin no puede ser anterior a fecha de inicio |
      | 2026-02-30 | 2026-11-30 | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |
      | abc | 2026-11-30 | Fecha de inicio debe ser una fecha válida (YYYY-MM-DD) |

  # HU13-C01 — DEC-008 solape / DEC-007 renovación
  Scenario: Rechazar periodo solapado con uno existente
    Given el cliente tiene una vigencia de personalizado del "2026-11-01" al "2026-11-30"
    When registro una vigencia del "2026-11-30" al "2026-12-15"
    Then el sistema retorna estado 409 con código "SERVICIO_SOLAPADA"

  Scenario: Renovar crea un periodo nuevo sin sobrescribir el anterior
    Given el cliente tiene una vigencia de personalizado del "2026-11-01" al "2026-11-30"
    When registro una vigencia del "2026-12-01" al "2026-12-31"
    Then el sistema retorna estado 201
    And el listado muestra dos periodos

  # HU13-C02a — estados calculados
  Scenario: Estado sin vigencias contratadas
    Given el cliente no tiene vigencias de personalizado
    When consulto las vigencias del servicio personalizado
    Then el sistema retorna estado 200 con lista vacía
    And la ficha muestra el servicio como "NO_CONTRATADO"

  Scenario: La vigencia sigue activa en su día final
    Given el cliente tiene una vigencia de personalizado que termina hoy
    When consulto las vigencias del servicio personalizado
    Then el estado calculado es "ACTIVA"

  Scenario: La vigencia vence al día siguiente de su fecha fin
    Given el cliente tiene una vigencia de personalizado que terminó ayer
    When consulto las vigencias del servicio personalizado
    Then el estado calculado es "VENCIDA"

  # HU13-C03
  Scenario: La vigencia de personalizado es visible en la ficha
    Given el cliente tiene una vigencia de personalizado activa
    When consulto la ficha del cliente
    Then la ficha muestra la vigencia de personalizado con sus fechas y estado

  # HU13-C04 — dependencia (conectable cuando exista asignación de rutina, DEC-018)
  Scenario: La rutina personalizada solo está activa con servicio vigente
    Given el cliente tiene una rutina personalizada asignada
    And su servicio personalizado está vencido
    When consulto la rutina activa del cliente
    Then la ficha no muestra rutina activa

  # Ramas de error
  Scenario: Registrar vigencia para cliente inexistente retorna 404
    When registro el servicio personalizado para el cliente "nonexistent-id"
    Then el sistema retorna estado 404

  Scenario: El rol CLIENTE no puede registrar vigencias
    Given soy un usuario autenticado como "CLIENTE"
    When registro el servicio personalizado con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 403

  Scenario: No se registra vigencia para un cliente inactivo
    Given existe un cliente en estado "INACTIVO"
    When registro el servicio personalizado con inicio "2026-11-01" y fin "2026-11-30"
    Then el sistema retorna estado 409 con código "CLIENTE_INACTIVO"
```

## Gaps vs código actual
| Gap | Evidencia | Criterio |
|-----|-----------|----------|
| No existe modelo de vigencia de personalizado (solo `MembresiaGym`) | `prisma/schema.prisma:60-76`; grep `PERSONALIZADO` = 0 en `src/` | HU13-C01 |
| No existe ruta de servicios personalizado | `src/routes/` solo `auth.ts`, `clientes.ts`, `membresia.ts` | HU13-C01 |
| No existe servicio ni cálculo de estado para personalizado | `src/services/` sin archivo equivalente | HU13-C02a |
| La ficha solo incluye `membresias` (GYM) | `src/services/cliente.service.ts:52-58` (`selectFichaCliente`) | HU13-C03 |
| No existe asignación de rutina personalizada (requisito previo de C04) | grep `rutina|Rutina` = 0 en `src/` y `prisma/` | HU13-C04 (DEC-018 bloque 6) |
| El guard de cliente INACTIVO no existe en creación de servicios | `src/services/membresia.service.ts:154-208` (sin check de estado) | HU13-C01 (409 CLIENTE_INACTIVO) |

## Preguntas al producto
| ID | Pregunta | Impacto | Criterio |
|----|----------|---------|----------|
| **P-05** | **RESUELTA 2026-10-20 (DEC-043)**: estado de periodo futuro = `PROGRAMADA`; literal de congelación = `CONGELADO` (los G14 se enmendaron de `CONGELADA`). Queda como histórico la pregunta original: ¿cómo se nombra el estado de un periodo **futuro** en personalizado/nutrición? (la HU solo nombra activo/vencido/congelado/no contratado). | Define los valores exactos que deben asertar las pruebas de C02a/C02b. | HU13-C02a/C02b |
| **P-06** | **RESUELTA 2026-10-20 (DEC-044 = (a))**: se aprueban `POST/GET /clientes/:clienteId/servicios-personalizado`, `PATCH .../:servicioId` (este, con DEC-046/DEC-047) y códigos `SERVICIO_SOLAPADA` / `SERVICIO_CONFLICTO`. Queda pendiente solo la **ratificación técnica** por `backend-developer` en INC-05. | Fija el contrato API antes del RED de INC-05 (Definition of Ready). | HU13-C01 |
