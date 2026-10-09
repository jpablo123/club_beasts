# Criterios de Aceptación - HU-16: Cambio de estado por vencimiento

> Generado por `acceptance-criteria-analyst` (Modo CREAR) el 2026-10-08. Prerequisito **G14** de
> `docs/producto/auditoria-puntos-inc00.md` ("sin criterios escritos no se puntua").
> Incremento previsto: **INC-03** (HU-16 + bloque 4; `avance.md` línea 127).
> Fuentes: `historias-usuario-gimnasio.md:266-279` (4 bullets), nota `mvp.md:58`
> ("HU-16 requiere que el vencimiento afecte la recepcion, el portal y el acceso al servicio;
> no basta con calcular una etiqueta visual" — citada como `mvp.md:52` en
> `auditoria-puntos-inc00.md`), gap **G7** y regla
> de no duplicado **3** de `auditoria-puntos-inc00.md`, DEC-004, DEC-005, DEC-006, DEC-016.
> Schemas: `HU-16-schemas.ts` (mismo directorio).

## Resumen

El sistema detecta el vencimiento de una vigencia (día posterior a `fechaFin`, con
`America/Bogota` y extremos inclusivos), expone el estado `VENCIDA` y lo propaga a las tres
superficies que exige `mvp.md:58` — **ficha del cliente, portal y recepción** — además de
**retirar el acceso** al servicio vencido. Una etiqueta visual aislada no cierra la HU.

## Trazabilidad bullet -> criterio (DEC-016: fraccionable, sin duplicar puntos)

| # | Bullet de HU-16 (`historias-usuario-gimnasio.md`) | ID criterio | ID en auditoría | ¿Cerrable por separado? | Estado del criterio |
|---|---|---|---|---|---|
| b1 | "El sistema detecta cuando una vigencia llega a su fecha final." | `HU16-C01` | G7 | Sí | Abierto (fórmula ya verificada en INC00-MEM-05; ver no-duplicado) |
| b2 | "El sistema cambia el estado del servicio a vencido." | `HU16-C02` | G7 | Sí | Abierto (API + badge de ficha existen; falta evidencia de spec propios) |
| b3 | "El estado se refleja en la ficha del cliente y en recepcion." + nota `mvp.md:58` (portal) | `HU16-C03` | G7 | Sí | **Parcial**: ficha ✅; portal ❌ (`portal/page.tsx:122` hardcodeado); recepción ❌ (HU-29 sin código) → depende de INC-03 |
| b4 | "El cliente deja de tener acceso al servicio vencido." | `HU16-C04` | G7 | Sí | **BLOQUEADO** — decisión de Producto (ver pregunta concreta) |

> El peso de HU-16 es **1 punto** (`auditoria-puntos-inc00.md` §2); la fracción se mide sobre
> estos 4 bullets. **Este documento no declara puntos**: solo habilita que el orquestador los
> cuente cuando exista spec + implementación + prueba + evidencia + revisión (DEC-016).

## Contrato previsto (borrador — se fija en el spec de INC-03)

| Superficie | Qué debe observarse | Estado hoy |
|---|---|---|
| API listado `GET /api/clientes/:clienteId/membresias-gym` | `estado: "VENCIDA"` cuando `hoy > fechaFin` | ✅ implementado (`membresia.service.ts:18-40` cálculo, `:251` con pausas) |
| API ficha `GET /api/clientes/:id` → `membresias[].estado` | `estado: "VENCIDA"` calculado en cada lectura | ✅ implementado (`cliente.service.ts:144-149`) |
| UI ficha del cliente | badge "Vencida" en la sección de membresías | ✅ implementado (`MembershipSection.tsx:55`) |
| **Portal del cliente** (`club-beasts-web/src/app/portal/page.tsx`) | estado real del servicio, no texto fijo | ❌ **hardcodea `"Activo"`** en `:122` |
| **Recepción** (HU-29, no existe) | estado `VENCIDA` visible al consultar al cliente; condiciona el ingreso (HU-30) | ❌ sin endpoint ni pantalla |
| **Acceso al servicio** | cliente sin servicio vigente no accede (ver C04) | ❌ `loginClient` (`auth.service.ts:14-28`) no valida vigencia |

Errores esperados: las rutas de lectura responden **200**; `HU16-C04` define su propio código
(**BLOQUEADO**, candidato `401/403` con `code: "VIGENCIA_VENCIDA"` — se fija al resolver la
decisión). Sin job/cron obligatorio: el estado se **deriva en cada lectura** (mismo modelo que
`calcularEstado`), lo que importa es que las tres superficies consuman esa única fuente.

## Criterios (detalle)

### `HU16-C01` — Detecta cuando una vigencia llega a su fecha final

- **Condición pre**: vigencia con `fechaFin` persistida (incluye extensiones por congelación
  de HU-15); `hoy` = `getTodayBogota()` (`America/Bogota`).
- **Disparo**: lectura del estado en el día `fechaFin` y en el día posterior.
- **Resultado observable**:
  - `hoy == fechaFin` → la vigencia **sigue disponible** (extremo inclusivo, DEC-006).
  - `hoy == fechaFin + 1` (y todo día posterior) → la vigencia está **vencida**.
  - Si la `fechaFin` cambia (edición o congelación), la detección sigue la **nueva** fecha
    desde la siguiente lectura (no hay marca persistida obsoleta).
- **Errores esperados**: 200 en todas las lecturas; 404 solo si el cliente no existe.
- **Qué NO cubre**: portal/recepción/acceso (`HU16-C03/C04`); notificaciones de vencimiento
  (HU-32/HU-34); el job programado (no exigido: la detección es derivada).
- **No duplicado**: la **fórmula** de cálculo ya fue verificada y aceptada como
  `INC00-MEM-05` en INC-00 (31 tests de membresía); este criterio no la repuntúa. Lo nuevo y
  exigible aquí es (a) que cubra `fechaFin` **extendida** por congelación y (b) que sea la
  única fuente que consuman ficha, portal y recepción.
- **Estado**: abierto.

### `HU16-C02` — Cambia el estado del servicio a vencido

- **Condición pre**: `HU16-C01` detectó `hoy > fechaFin`.
- **Disparo**: cualquier lectura del estado (listado, ficha, respuesta de detalle).
- **Resultado observable**: el estado expuesto pasa a **`VENCIDA`** y la UI lo etiqueta
  "Vencida" (badge gris en `MembershipSection.tsx:55`); al extender `fechaFin` (edición o
  congelación) el estado vuelve a `ACTIVA`/`PROGRAMADA` en la siguiente lectura.
- **Errores esperados**: 200 con `estado` dentro del enum; sin 5xx.
- **Qué NO cubre**: estado `CONGELADO` (HU-15); estado general del cliente
  (`NUEVO/ACTIVO/SUSPENDIDO/...`, HU-17 — es otro campo, `cliente.estado`); portal/recepción.
- **Nota de vocabulario**: la HU dice "vencido"; el sistema usa el enum **`VENCIDA`**
  (coherente con `calcularEstado` y con la UI ya aceptada). Se adopta `VENCIDA`.
- **Estado**: abierto.

### `HU16-C03` — El estado se refleja en ficha, portal y recepción

- **Condición pre**: `HU16-C02` expone `VENCIDA` en la API.
- **Disparo**: consulta del cliente en cada superficie.
- **Resultado observable**:
  1. **Ficha del cliente** (`/clientes/[id]`): badge/estado `VENCIDA` visible → ya implementado
     y parcialmente asertado (INC01-FIC-02).
  2. **Portal del cliente** (`/portal`): muestra el estado **real** de su servicio
     (`VENCIDA` cuando corresponda), reemplazando el `"Activo"` hardcodeado de
     `club-beasts-web/src/app/portal/page.tsx:122`.
  3. **Recepción**: al consultar al cliente (HU-29) el estado `VENCIDA` es visible y
     condiciona la operación de ingreso (HU-30).
  - El bullet **no cierra** hasta que (2) y (3) existan: `mvp.md:58` manda que el vencimiento
    afecte recepción, portal y acceso; no basta la etiqueta de la ficha.
- **Errores esperados**: 200 en las tres superficies; respuestas del portal/recepción deben
  usar el mismo `estado` del contrato (`HU-16-schemas.ts`), no textos libres.
- **Qué NO cubre**: el flujo de consulta por cédula en sí (HU-25/HU-29 cuentan su propio
  alcance: pantalla, búsqueda, paginación); el registro de ingreso (HU-30); la elipsis de
  historial (HU-32).
- **No duplicado (regla 3 de `auditoria-puntos-inc00.md:197`)**: el reflejo del vencimiento en
  **portal y recepción** se acredita **una sola vez**. Si INC-03 cierra este criterio primero,
  HU-25/HU-29 no vuelven a contar ese dato; y si se decidiera cerrarlo dentro de HU-25/HU-29,
  `HU16-C03` no suma. El orquestador asigna el criterio al bloque que cierre primero. La parte
  de **ficha** comparte evidencia con HU-12 b3/HU-07 (ya acreditadas) y no genera punto extra.
- **Estado**: parcial / dependiente de INC-03.

### `HU16-C04` — El cliente deja de tener acceso al servicio vencido

- **Condición pre**: cliente autenticado (o por autenticar) cuya(s) vigencia(s) están
  `VENCIDA(s)`; multi-servicio según DEC-004 (GYM / PERSONALIZADO / NUTRICION).
- **Disparo**: intento de acceso al servicio vencido (login del portal, ingreso en recepción
  o uso del servicio — a decidir).
- **Resultado observable**: el acceso al servicio vencido queda **denegado de forma
  observable y probada** (rechazo con código propio, o bloqueo equivalente en la superficie
  que Producto designe), distinto de "credenciales inválidas".
- **Errores esperados**: *(a definir con la decisión)* candidato `401`/`403` con
  `code: "VIGENCIA_VENCIDA"` y mensaje en español ("Su membresía se venció el YYYY-MM-DD…").
- **Qué NO cubre**: bloqueo por estado general `INACTIVO` del cliente (HU-08); reglas de
  ingreso por sede como flujo (HU-30 — aquí solo la denegación por vencimiento); notificaciones.
- **Estado**: **BLOQUEADO — decisión de Producto.** Pregunta concreta:

  > **P1 (HU16-C04)**: cuando una vigencia está `VENCIDA`, ¿qué se bloquea exactamente y en
  > qué punto? Opciones:
  > **(A)** `POST /auth/login-cliente` rechaza con `401/403` `VIGENCIA_VENCIDA` si el cliente
  > **no tiene ningún servicio vigente** (al menos uno de GYM/PERSONALIZADO/NUTRICION activo
  > según DEC-004);
  > **(B)** el login se mantiene (es identidad, PIN), pero el **portal** muestra el servicio
  > vencido sin acceso y **recepción/HU-30** rechaza el ingreso a la sede;
  > **(C)** mixta: login permitido, portal en modo solo-lectura con estado `VENCIDA`, ingreso
  > denegado en recepción.
  >
  > Y relacionada: **P2**: si un cliente tiene GYM vencido pero NUTRICION vigente, ¿puede
  > autenticarse y usar el servicio vigente? (Relevante para no bloquear por completo al
  > cliente multi-servicio.)
  >
  > Responsable: Producto + orquestador, al fijar el spec de INC-03 (puerta LISTO). Hasta
  > entonces **no se escriben tests RED de C04**; el resto de HU-16 puede avanzar.

## Partición de Equivalencia

| Campo / condición | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| fechaFin vs hoy | `hoy ≤ fechaFin` → no vencida | hoy `2026-03-31`, fin `2026-03-31` | `hoy > fechaFin` → vencida | hoy `2026-04-01`, fin `2026-03-31` |
| fechaFin en la fuente | Fecha real `YYYY-MM-DD` persistida | `2026-03-31` | Formato inválido (no debería existir; INC00-MEM-07) | `""`, `2026-02-30` |
| estado expuesto | Enum `PROGRAMADA/ACTIVA/VENCIDA/CONGELADO` | `VENCIDA` | Texto libre o hardcodeado | `"Activo"` fijo en el portal |
| superficie | Ficha, portal, recepción | portal con estado real | Superficie sin el dato | `portal/page.tsx:122` |
| vigencias del cliente | Todas vencidas / alguna vigente / sin vigencias | alguna vigente (DEC-004) | - | - |
| tipo de denegación de acceso | Código propio `VIGENCIA_VENCIDA` | 403 `VIGENCIA_VENCIDA` | Mezclar con credenciales | 401 `AUTH_INVALID_CREDENTIALS` |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| `hoy` vs `fechaFin` (día) | fecha | `hoy = fechaFin` → ACTIVA (inclusivo) | `hoy = fechaFin` → último día activo | `hoy = fechaFin − 1` → ACTIVA | `hoy = fechaFin + 1` → **VENCIDA** |
| días desde el vencimiento | num | 1 | ∞ | 0 → aún vigente | - |
| `fechaFin` extendida (HU-15) | fecha | extensión de 1 día | extensión de N días | - | vencimiento postergado: `hoy ≤ fechaFin'` sigue `ACTIVA` |
| superficies que reflejan el estado | num | 3 (ficha + portal + recepción) | 3 | 2 → `HU16-C03` no cierra | - |

## Tabla de Decisiones

### A. Detección del vencimiento (días completos, inclusivos, `America/Bogota`)

| `hoy < fechaInicio` | `fechaInicio ≤ hoy ≤ fechaFin` | `hoy > fechaFin` | Estado expuesto |
|---|---|---|---|
| true | * | * | PROGRAMADA |
| false | true | false | ACTIVA (día `fechaFin` incluido) |
| false | false | true | **VENCIDA** |

### B. Propagación y acceso (`mvp.md:58`)

| Ficha refleja `VENCIDA` | Portal refleja `VENCIDA` | Recepción refleja `VENCIDA` | Acceso denegado (C04) | Acción |
|---|---|---|---|---|
| true | true | true | true | `HU16-C01..C04` completos → HU-16 cerrable |
| true | false (hardcode `"Activo"`) | false | false | Hoy: solo C01/C02 evaluables; **HU-16 no se declara completa** |
| * | * | * | * (decisión P1/P2 sin resolver) | `HU16-C04` **BLOQUEADO**; HU-16 no completa |

## Transiciones de Estado

### Vigencia (estado derivado, sin evento de usuario)

```
[PROGRAMADA] --[hoy >= fechaInicio]--> [ACTIVA]
[ACTIVA]     --[hoy = fechaFin + 1 (Bogota)]--> [VENCIDA]
[VENCIDA]    --[edicion/renovacion lleva fechaFin >= hoy (DEC-007)]--> [ACTIVA o nuevo periodo]
[ACTIVA]     --[congelacion que cubre hoy (HU-15)]--> [CONGELADO]
[CONGELADO]  --[hoy > cFin]--> [ACTIVA con fechaFin extendida]
```

- Transiciones **inválidas / no existentes**: no hay evento manual "marcar como vencido"
  (es derivado); no hay transición `VENCIDA → CONGELADO` vía API (409 en HU-15, regla
  propuesta); `cliente.estado` (NUEVO/ACTIVO/...) **no** cambia por vencimiento (HU-17/HU-08).

## Cobertura de Ramas

### Rutas: `GET /api/clientes/:clienteId/membresias-gym`, `GET /api/clientes/:id`, `/portal`, recepción

| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Día final inclusivo | `hoy == fechaFin` | 200 estado `ACTIVA` |
| 2 | Día siguiente | `hoy == fechaFin + 1` | 200 estado `VENCIDA` en listado y ficha |
| 3 | Mucho después del fin | `hoy >> fechaFin` | 200 estado `VENCIDA` |
| 4 | Extensión por congelación | `fechaFin` extendida ≥ `hoy` | 200 estado `ACTIVA` (no vence antes de tiempo) |
| 5 | Edición que posterga el fin | PATCH `fechaFin` a futuro sobre `VENCIDA` | 200 estado `ACTIVA` (sin flag obsoleto) |
| 6 | Edición que adelanta el fin | PATCH `fechaFin` a ayer sobre `ACTIVA` | 200 estado `VENCIDA` |
| 7 | Ficha refleja vencimiento | cliente con vigencia vencida | ficha: badge "Vencida" |
| 8 | Portal refleja vencimiento | cliente con vigencia vencida | portal muestra `VENCIDA` (no `"Activo"`) — **INC-03** |
| 9 | Recepción refleja vencimiento | consulta por cédula en recepción | estado `VENCIDA` visible — **INC-03 / HU-29** |
| 10 | Acceso denegado | cliente con servicio vencido intenta acceder | denegación con código propio (C04) — **BLOQUEADO** |
| 11 | Multi-servicio (P2) | GYM vencido + NUTRICION vigente | según decisión Producto — **BLOQUEADO** |
| 12 | Cliente sin vigencias | sin ninguna vigencia | caso extremo de acceso: decidido en P1 — **BLOQUEADO** |
| 13 | Estado en otra superficie duplicado | mismos datos pintados en dos contadores | verificar no duplicado (regla 3) |
| 14 | Vigencia `CONGELADO` no se reporta vencida | `hoy ∈ rango congelado` con `fechaFin` pasada (fixture) | 200 estado `CONGELADO` (precedencia HU-15) |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regex / Regla | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| fechaInicio | string | sí (persistida) | `/^\d{4}-\d{2}-\d{2}$/` + calendario | 10 | fecha real |
| fechaFin | string | sí (persistida) | `/^\d{4}-\d{2}-\d{2}$/` + calendario | 10 | fecha real |
| estado | enum | sí (calculado) | derivado de `calcularEstado` | - | `PROGRAMADA`, `ACTIVA`, `VENCIDA`, `CONGELADO` |
| tipoServicio | enum | sí | - | - | `GYM`, `PERSONALIZADO`, `NUTRICION` |
| accesoPermitido / puedeIngresar | boolean | sí (portal/recepción) | - | - | `true` / `false` |
| code (denegación C04) | enum | sí | - | - | `VIGENCIA_VENCIDA` (candidato, P1 pendiente) |

## Escenarios Gherkin (borrador para `test-engineer`)

> **Borrador**: `test-engineer` los traslada a `features/*.feature` + `features/steps/*` en el
> RED. Este agente no crea ni modifica `.feature` (rompería el runner actual de 63/63).
> Los escenarios marcados `[BLOQUEADO]` **no** se escriben hasta resolver P1/P2.

```gherkin
Feature: Cambio de estado por vencimiento (HU-16)
  Como sistema
  Quiero identificar cuando una vigencia vence
  Para reflejar correctamente el estado del servicio

  Background:
    Given soy un usuario autenticado como "RECEPCIONISTA"
    And existe un cliente "CLIENTE-1" con vigencia "GYM" del "2026-01-01" al "2026-03-31"

  # HU16-C01 — deteccion (borde inclusivo, DEC-006)
  Scenario: El dia de fecha fin la vigencia sigue activa
    Given hoy es "2026-03-31"
    When consulto las membresias del cliente "CLIENTE-1"
    Then la membresia tiene estado "ACTIVA"

  Scenario: Al dia siguiente de fecha fin la vigencia pasa a vencida
    Given hoy es "2026-04-01"
    When consulto las membresias del cliente "CLIENTE-1"
    Then la membresia tiene estado "VENCIDA"

  # HU16-C01 — la fecha fin extendida por congelacion posterga el vencimiento
  Scenario: La fecha fin extendida posterga el vencimiento
    Given la vigencia del cliente "CLIENTE-1" fue congelada 10 dias y su fecha fin es "2026-04-10"
    And hoy es "2026-04-05"
    When consulto las membresias del cliente "CLIENTE-1"
    Then la membresia tiene estado "ACTIVA"

  # HU16-C01/C02 — sin flag obsoleto
  Scenario: El estado se recalcula al editar la fecha fin
    Given hoy es "2026-04-01" y la vigencia del cliente "CLIENTE-1" tiene estado "VENCIDA"
    When edito la fecha fin de la vigencia a "2026-06-30"
    Then la respuesta tiene estado 200
    And la membresia tiene estado "ACTIVA"

  # HU16-C02 — el estado se expone en API y ficha
  Scenario: La ficha muestra el estado vencido con badge
    Given hoy es "2026-04-01"
    When abro la ficha del cliente "CLIENTE-1"
    Then la ficha muestra el badge "Vencida" en la seccion de membresias

  # HU16-C03 — propagacion a portal y recepcion (INC-03)
  Scenario: El portal muestra el estado real del servicio vencido
    Given el cliente "CLIENTE-1" tiene la vigencia "GYM" vencida
    And hoy es "2026-04-01"
    When el cliente "CLIENTE-1" abre su portal
    Then el portal muestra el estado "VENCIDA" para el servicio "GYM"
    And el portal no muestra el texto fijo "Activo"

  Scenario: Recepcion ve el estado vencido al consultar por cedula
    Given hoy es "2026-04-01"
    When consulto en recepcion al cliente "CLIENTE-1" por su cedula
    Then la recepcion muestra el servicio "GYM" con estado "VENCIDA"

  # HU16-C04 — acceso (BLOQUEADO: resolver P1/P2 antes de escribir este scenario)
  Scenario [BLOQUEADO]: El cliente sin servicios vigentes no accede al portal
    Given hoy es "2026-04-01"
    And el cliente "CLIENTE-1" no tiene ninguna vigencia vigente
    When el cliente "CLIENTE-1" intenta iniciar sesion en el portal con su PIN
    Then la respuesta tiene estado 401 con codigo "VIGENCIA_VENCIDA"
    And el mensaje informa la fecha de vencimiento

  Scenario [BLOQUEADO]: El cliente con un servicio vigente mantiene el acceso
    Given hoy es "2026-04-01"
    And el cliente "CLIENTE-1" tiene "GYM" vencido y "NUTRICION" vigente
    When el cliente "CLIENTE-1" intenta iniciar sesion en el portal con su PIN
    Then la respuesta tiene estado 200
    And el portal muestra "GYM" como "VENCIDA" y "NUTRICION" como "ACTIVA"

  # No duplicado — el mismo dato no se pinta dos veces
  Scenario: El estado vencido proviene de la misma fuente en todas las superficies
    Given hoy es "2026-04-01"
    When consulto la ficha, el portal y la recepcion del cliente "CLIENTE-1"
    Then las tres superficies muestran estado "VENCIDA" calculado por la misma regla
```

## Reglas de negocio aplicadas (trazabilidad)

| Regla | Dónde aplica |
|---|---|
| Nota `mvp.md:58` (vencimiento afecta recepción, portal y acceso; no basta etiqueta) | Condición de cierre de `HU16-C03` y `HU16-C04`; sin ellas HU-16 no se declara completa |
| DEC-005 (`America/Bogota`, días completos) | `HU16-C01` (`hoy` y detección) |
| DEC-006 (inicio y fin inclusivos) | `HU16-C01` (día `fechaFin` sigue activo) |
| DEC-004 (servicios separados) | `HU16-C04` P2 (multi-servicio) |
| DEC-007 (renovar crea periodo nuevo) | Transición `VENCIDA → ACTIVA/nuevo periodo` |
| DEC-016 (fraccionable) | Tabla de trazabilidad: 4 bullets = 4 criterios |
| Regla de no duplicado 3 (`auditoria-puntos-inc00.md:197`) | `HU16-C03`: portal/recepción se acreditan **una sola vez** frente a HU-25/HU-29 |
| Riesgo 2 (`auditoria-puntos-inc00.md:196`, ficha/estado) | `HU16-C02/C03`: la ficha no genera punto nuevo si ya está acreditada en HU-12/HU-07 |

## Gaps vs código actual (líneas exactas)

- `club-beasts-web/src/app/portal/page.tsx:122` — estado **hardcodeado** `<p …>Activo</p>`:
  el portal ignora la vigencia (gap G7).
- `club-beasts-api/src/services/auth.service.ts:14-28` — `loginClient` solo valida
  cédula + PIN; **no consulta vigencia** (gap G7; base del criterio bloqueado C04).
- No existe recepción: sin endpoint ni pantalla de consulta por cédula
  (`auditoria-puntos-inc00.md:125`, 11 rutas inventariadas, HU-29 = 0).
- `src/services/membresia.service.ts:18-40` — `calcularEstado` existe y devuelve `VENCIDA`
  (implementado y verificado en INC-00 como `INC00-MEM-05`), pero no es consumido por portal
  ni por recepción.
- **Divergencia de fuentes en la ficha**: `cliente.service.ts:144-149` llama
  `calcularEstado(fechaInicio, fechaFin, hoy)` **sin el 4.º argumento** (rangos de pausa) y su
  select (`cliente.service.ts:52-58`) no trae `cambios` ni `tipoServicio`; el listado sí lo hace
  (`membresia.service.ts:251` con `pausasActivas`). Con una pausa que cubre hoy, la ficha reporta
  `ACTIVA` y el listado `CONGELADO` para la misma vigencia → incumple "una única fuente" de
  `HU16-C01/C03`. Sin prueba que lo detecte: `membresia-congelacion.test.ts:983-991` solo
  aserta `200` en la ficha y `CONGELADO` en el listado.
- `club-beasts-web/src/components/MembershipSection.tsx:55` (config `VENCIDA`) y `:473-484`
  (render del badge) — badge "Vencida" ya existe en la ficha; `:516,522` condicionan acciones a
  `m.estado !== "VENCIDA"` (verificar que no pinte dos veces el mismo dato al agregar
  portal/recepción). El badge consume el **listado** (`api.membresias.list`,
  `MembershipSection.tsx:161`), no `membresias[]` de la ficha.
- No existe HU-16-*.feature ni tests de propagación (solo unit de `calcularEstado` en
  `tests/unit/membresia-logic.test.ts:33-71` e integración `membresia-estado.test.ts:264-277`).

## Abiertos / decisiones pendientes

| # | Abierto | Impacto | Responsable | Cuándo |
|---|---|---|---|---|
| 1 | **P1**: qué bloquea exactamente el vencimiento (login / portal / ingreso en recepción) y con qué código — opciones A/B/C del criterio `HU16-C04` | `HU16-C04` **BLOQUEADO**; sin esto HU-16 no está completa | Producto + Orquestador | Puerta LISTO de INC-03 |
| 2 | **P2**: cliente con un servicio vencido y otro vigente (DEC-004): ¿acceso permitido al vigente? | `HU16-C04`, tests multi-servicio | Producto | Puerta LISTO de INC-03 |
| 3 | Acreditación única de portal/recepción: ¿el dato se cierra en HU-16 (C03) o en HU-25/HU-29? | Reparto de puntos (regla 3) | Orquestador | Al cerrar INC-03 |
| 4 | Cierre parcial: ¿se certifican `HU16-C01/C02` (verificables hoy con spec propio) antes de tener portal/recepción/acceso? DEC-016 lo permite; la nota `mvp.md:58` exige el conjunto para la HU completa | Fracción de HU-16 | Orquestador | Al revisar INC-03 |
| 5 | Detección: ¿se acepta derivación en lectura (sin job) como "detecta"? (criterio propuesto: sí, mientras las 3 superficies usen la misma fuente) | `HU16-C01` | Producto + Orquestador | Puerta LISTO de INC-03 |

**BLOQUEADO?** **Sí, parcial**: `HU16-C04` queda **BLOQUEADO** por falta de decisión de
Producto que afecta permisos y UX (P1/P2). Los criterios `HU16-C01`, `HU16-C02` y la parte de
ficha de `HU16-C03` no dependen de esa decisión y pueden pasar a RED/GREEN en INC-03.
