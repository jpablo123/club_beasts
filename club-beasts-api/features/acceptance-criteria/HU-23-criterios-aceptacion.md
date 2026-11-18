# Criterios de Aceptación - HU-23: Asignación de plan nutricional activo

## Resumen

Permitir al DUENO asignar un **solo plan nutricional activo** por cliente, con gate
de vigencia del servicio de nutricion (solo si está ACTIVA), visibilidad en el
portal (HU-27) y trazabilidad del cambio (HU-24). Analogia directa con HU-20
(rutinas) y DEC-066/DEC-067/DEC-068.

**Incremento**: INC-12-nutricion. Criterios **NU-20..NU-28**.

**Decisiones aplicadas**:
- DEC-004/DEC-042: servicios separados; nutricion congelable.
- DEC-066 (analogia): gate de vigencia al momento del cambio; sin jobs/cron.
- DEC-067 (analogia): snapshot del contenido al asignar.
- DEC-068 (analogia): portal solo lectura.
- DEC-070 (analogia): literales/paths.
- PEND-NUT-05/06/07/08: bloqueantes para LISTO.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | Asignar un solo plan nutricional activo por cliente. | NU-20 (happy) + NU-21 (reemplazo) + NU-28 (mismo plan) | NO VERIFICADO |
| 2 | Plan solo activo si servicio de nutricion vigente. | NU-23 | NO VERIFICADO |
| 3 | Plan activo visible para el cliente. | NU-25 (REF → HU-27) | NO VERIFICADO |
| 4 | Si no hay nutricion activa, portal informa que no hay plan vigente. | NU-23 + NU-27 (lectura) | NO VERIFICADO |

Transversales: NU-22 (tipos/recursos), NU-24 (genéricos sin vigencia — no aplica, todo plan requiere vigencia nutricion), NU-26 (cliente sin estado activo), NU-27 (permisos).

## Detalle por criterio

### NU-20 — Asignación exitosa
- **Dado** un cliente existente, un plan existente y actor DUENO.
- **Cuando** envía `asignarPlanNutricionalSchema` (`clienteId`, `planId`, `fechaInicio` opcional no futura).
- **Entonces** se crea la asignación (201) con `fechaInicio` (hoy America/Bogota por defecto), `fechaFin: null`, `estado: "ACTIVA"`, `actor` = usuario autenticado real; snapshot del contenido (DEC-067).
- **Prueba esperada**: integración `hu23-asignacion.test.ts` → POST 201.

### NU-21 — Una sola plan activo por cliente (reemplazo)
- **Dado** un cliente con una asignación ACTIVA (plan X).
- **Cuando** se asigna un nuevo plan Y.
- **Entonces** X se cierra con `fechaFin` = `fechaInicio` de Y (`estado: "CERRADA"`); Y queda ACTIVA; tras la operación existe exactamente una asignación con `fechaFin = null`.
- **Prueba esperada**: integración → X tiene fechaFin = inicio de Y; solo Y ACTIVA.

### NU-22 — Recursos inexistentes
- **Dado** `clienteId`/`planId` inexistente.
- **Entonces** 404 `CLIENTE_NO_ENCONTRADO` / `PLAN_NO_ENCONTRADO`; nada se persiste.
- **Prueba esperada**: integración → 404 con cada código.

### NU-23 — Regla de vigencia: plan solo activo con nutricion vigente
- **Dado** un cliente y un plan nutricional.
- **Cuando** se intenta asignarlo con el servicio de nutricion en `NO_CONTRATADO`, `PROGRAMADA`, `CONGELADO` o `VENCIDA`.
- **Entonces** rechazo 409 `SIN_VIGENCIA_NUTRICION` con mensaje "El cliente no tiene el servicio de nutrición vigente: no se puede activar un plan nutricional"; nada se persiste. Con `ACTIVA` → permitido (NU-20).
- **Qué NO cubre**: si la vigencia vence DESPUÉS → PEND-NUT-05 (analogia DEC-066: asignación intacta, portal oculta).
- **Prueba esperada**: integración/tabla → 5 estados × asignación; unidad → `puedeActivarPlan`.

### NU-24 — (No aplica genéricos sin vigencia)
- **Nota**: a diferencia de rutinas, TODO plan nutricional requiere servicio de nutricion vigente (HU-22/HU-14). No hay planes "sin vigencia".

### NU-25 — Visibilidad en el portal (REF, sin punto doble)
- **Dado** una asignación activa creada.
- **Cuando** el cliente abre su portal.
- **Entonces** el plan queda expuesto según HU-27. Este criterio **REF no puntúa** (DEC-016).

### NU-26 — Asignación a cliente sin estado activo
- **Dado** un cliente en estado `SUSPENDIDO`, `RETIRADO` o `INACTIVO`.
- **Cuando** se intenta asignarle un plan.
- **Entonces** 409 `CLIENTE_INACTIVO` "Cliente sin estado activo: no se le pueden asignar planes nutricionales" (analogia RU-26/DEC-069).
- **Prueba esperada**: integración → cliente SUSPENDIDO/RETIRADO/INACTIVO → 409.

### NU-27 — Permisos de asignación
- **Dado** los roles DUENO, RECEPCIONISTA y CLIENTE.
- **Cuando** cualquiera distinto de DUENO intenta asignar (PEND-NUT-06 rec (a)).
- **Entonces** 403; sin token 401. CLIENTE jamás asigna.
- **Prueba esperada**: integración → matriz rol × asignar.

### NU-28 — Reasignación del mismo plan ya activo
- **Dado** un cliente con el plan X ACTIVO.
- **Cuando** se intenta asignar la misma X otra vez.
- **Entonces** 409 `PLAN_YA_ACTIVO` "El plan ya está activo para este cliente" (no se crea un segundo registro ni se reinicia `fechaInicio`).
- **Prueba esperada**: integración → segundo intento 409.

## Partición de Equivalencia

| Campo / Entrada | Partición | Ejemplo | Válido/Inválido |
|-----------------|-----------|---------|-----------------|
| `clienteId` | Válida: id existente | `cl-1` | Válido |
| `clienteId` | Inválida: vacío / inexistente | `""` / `cl-999` | Inválido |
| `planId` | Válida: id existente | `pn-1` | Válido |
| `planId` | Inválida: vacío / inexistente | `""` / `pn-999` | Inválido |
| `fechaInicio` | Válida: ausente (hoy) o pasada/hoy | `2026-11-18` | Válido |
| `fechaInicio` | Inválida: futura / malformada | `2027-01-01`, `31/01/2026` | Inválido |
| body | Inválido: `fechaFin`/`estado`/`actor` o campo desconocido | `{ fechaFin }` | Inválido (strict) |
| estado del servicio nutricion | Válida: ACTIVA | `ACTIVA` | Válido |
| estado del servicio nutricion | Inválida: NO_CONTRATADO/PROGRAMADA/CONGELADO/VENCIDA | `VENCIDA` | Inválido (NU-23) |
| estado del cliente | Válida: NUEVO/ACTIVO | `ACTIVO` | Válido |
| estado del cliente | Inválida: SUSPENDIDO/RETIRADO/INACTIVO | `INACTIVO` | Inválido (NU-26) |
| rol | Válida: DUENO | — | Válido |
| rol | Inválida: RECEPCIONISTA/CLIENTE/sin token | — | Inválido (403/401) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| `clienteId` | string | 1 | — | `""` → 400 | — |
| `planId` | string | 1 | — | `""` → 400 | — |
| `fechaInicio` | fecha | hoy (o pasado) | hoy | ayer → válido | mañana → 400 |
| asignaciones ACTIVAS por cliente | int | 0 | 1 | — | 2 → imposible (NU-21) |

## Tabla de Decisiones

### Asignación (combinación de reglas)
| Cliente existe | Plan existe | Estado cliente activo | Vigencia nutricion | ¿Plan ya activo? | Acción |
|----------------|-------------|----------------------|-------------------|------------------|--------|
| Sí | Sí | Sí | ACTIVA | No | 201 asignación ACTIVA (NU-20) |
| Sí | Sí | Sí | NO_CONTRATADO/PROGRAMADA/CONGELADO/VENCIDA | — | 409 `SIN_VIGENCIA_NUTRICION` (NU-23) |
| Sí | Sí | Sí | ACTIVA | Sí (mismo plan) | 409 `PLAN_YA_ACTIVO` (NU-28) |
| Sí | Sí | Sí | ACTIVA | Hay otro activo | 201 + cierra el anterior (NU-21) |
| Sí | Sí | No | — | — | 409 `CLIENTE_INACTIVO` (NU-26) |
| Sí | No | — | — | — | 404 `PLAN_NO_ENCONTRADO` (NU-22) |
| No | — | — | — | — | 404 `CLIENTE_NO_ENCONTRADO` (NU-22) |
| Sí | Sí | Sí | — | — | 403/401 si rol ≠ DUENO (NU-27) |

### Regla de vigencia por estado (PEND-NUT-05, analogia INC05-PER-05/DEC-066)
| Estado vigencia nutricion | ¿Asignar plan? | ¿Se muestra al cliente? (HU-27) |
|---------------------------|----------------|----------------------------------|
| `ACTIVA` | Sí | Sí |
| `NO_CONTRATADO` | No → `SIN_VIGENCIA_NUTRICION` | No (oculta, asignación intacta) |
| `PROGRAMADA` | No → `SIN_VIGENCIA_NUTRICION` | No |
| `CONGELADO` | No → `SIN_VIGENCIA_NUTRICION` | No |
| `VENCIDA` | No → `SIN_VIGENCIA_NUTRICION` | No |

## Transiciones de Estado

### Asignación de plan (entidad `PlanNutricionalAsignacion`)
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| (no existe) | asignar (NU-20) | ACTIVA (`fechaFin = null`) | Sí |
| ACTIVA | asignar OTRO plan (NU-21) | CERRADA (`fechaFin` = inicio nueva) | Sí |
| ACTIVA | reasignar el MISMO (NU-28) | ACTIVA (sin cambio; 409) | Sí (rechazada) |
| CERRADA | reasignar cualquier plan | nueva ACTIVA (registro nuevo) | Sí |
| CERRADA | "reactivar" registro cerrado | — | **No** (historial inmutable) |
| ACTIVA | editar contenido del plan | ACTIVA (sin cambio de asignación) | Sí |

## Cobertura de Ramas

### Ruta: POST /clientes/:clienteId/planes-nutricionales/asignacion (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy | cliente ACTIVO + nutricion ACTIVA | 201 ACTIVA |
| 2 | Nutricion sin vigencia ACTIVA | + VENCIDA | 409 `SIN_VIGENCIA_NUTRICION` |
| 3 | Reemplazo | ya hay otra activa | 201 + anterior CERRADA |
| 4 | Mismo plan activo | repetir | 409 `PLAN_YA_ACTIVO` |
| 5 | Cliente inexistente | id fantasma | 404 `CLIENTE_NO_ENCONTRADO` |
| 6 | Plan inexistente | id fantasma | 404 `PLAN_NO_ENCONTRADO` |
| 7 | Cliente sin estado activo | SUSPENDIDO | 409 `CLIENTE_INACTIVO` |
| 8 | fechaInicio futura | `2027-01-01` | 400 |
| 9 | `fechaFin` en el body | `{ fechaFin }` | 400 (strict) |
| 10 | rol no autorizado | RECEPCIONISTA/CLIENTE | 403 |
| 11 | sin token | — | 401 |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regex / Rango | Longitud | Notas |
|-------|------|-----------|---------------|----------|-------|
| `clienteId` | string | Sí | — | ≥1 | cliente existente |
| `planId` | string | Sí | — | ≥1 | plan existente |
| `fechaInicio` | fecha | No | `YYYY-MM-DD` válida, no futura | — | default hoy (America/Bogota) |
| `fechaFin` | — | — | — | — | **no se recibe** (la cierra el sistema) |
| `actor` | — | — | — | — | **no se recibe** (usuario autenticado) |

Fuente canónica: `HU-23-schemas.ts`.

## Navegación propuesta

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-NUT-11 | Ficha del cliente → sección plan nutricional | Sin plan activo | Listado de clientes → ficha | "Asignar plan" → selector/form; Volver → listado | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-12 | Asignar plan nutricional | Selector + confirmación | Ficha → Asignar plan | Confirmar → ficha con plan activo; Cancelar → ficha sin cambios | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-13 | Asignar plan nutricional | Rechazo (sin vigencia / cliente inactivo) | Confirmar con regla violada | Mensaje de error visible; sigue en el form; Volver/Cancelar → ficha | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-14 | Ficha del cliente | Recarga / URL directa / atrás | Recarga, URL directa, botón Atrás | Ficha coherente con la asignación persistida; sin bucles | DUENO | E2E | NO VERIFICADO | _pendiente_ |

Transversal: móvil/escritorio, teclado, sesión expirada → login, guarda PIN obligatorio intacta. No aplica: portal del cliente (HU-27).

## PENDs de esta HU

### PEND-NUT-05 — Consistencia de la regla de vigencia (analogia PEND-RUT-05)
- **Pregunta**: ¿qué pasa si la vigencia vence DESPUÉS de asignar el plan?
- **Recomendación (a)**: validación al momento del cambio — solo `ACTIVA` permite asignar; si vence después, la asignación queda intacta y el portal la oculta (patrón INC05-PER-05). Sin jobs/cron.

### PEND-NUT-06 — Permisos (analogia DEC-065)
- **Recomendación (a)**: solo DUENO crea/edita/asigna; RECEPCIONISTA solo lectura; CLIENTE solo lectura de la suya.