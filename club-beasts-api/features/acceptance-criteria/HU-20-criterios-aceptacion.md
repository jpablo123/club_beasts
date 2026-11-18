# Criterios de Aceptación - HU-20: Asignación de rutina activa

## Resumen

Permitir al DUENO asignar una **sola** rutina activa por cliente (genérica, de
inducción o personalizada), con la regla de vigencia del servicio personalizado
(HU-13 b4), visibilidad en el portal (HU-26) y trazabilidad del cambio (HU-21).

**Incremento**: INC-10-rutinas (bloque 6, 18 pts MVP). Criterios **RU-20..RU-28**
de esta HU (secuencia RU-01..RU-42 única del bloque).

**Decisiones aplicadas**:

- **HU-20 c1 + HU-21 c3**: una sola activa por cliente (supuesto §2). Regla de
  reemplazo propuesta: la asignación previa se **cierra** (`fechaFin` =
  `fechaInicio` de la nueva). RU-21 acredita la regla; RU-31 (HU-21) la cierra
  como historial — **sin doble cobro de puntos** (DEC-016): el punto del bullet
  se reparte al cierre por fracción de bullets cerrados.
- **HU-20 c3 + HU-13 b4 (`HU13-C04` / `INC05-PER-05`)**: rutina **personalizada
  solo activa con servicio personalizado vigente**. Estados y consistencia exacta
  -> **PEND-RUT-05** (rec (a): solo `ACTIVA` al momento del cambio).
- **HU-20 c4**: la visibilidad en el portal se acredita en HU-26 (RU-25 **REF**,
  DEC-016).
- **PEND-RUT-04 (rec (a))**: solo DUENO asigna (supuesto §2).
- Literal de rechazo `SIN_VIGENCIA_PERSONALIZADA` con mensaje exacto:
  "El cliente no tiene el servicio personalizado vigente: no se puede activar una
  rutina personalizada" (`MENSAJES_ASIGNACION`, `HU-20-schemas.ts`).

Códigos HTTP/endpoints: **PROPUESTA**.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El sistema permite asignar una sola rutina activa por cliente. | RU-20 (happy) + RU-21 (reemplazo) + RU-28 (misma rutina) | NO VERIFICADO |
| 2 | El sistema permite asignar rutinas genéricas, de inducción o personalizadas. | RU-22 (+ RU-23/RU-24 por tipo) | NO VERIFICADO |
| 3 | Si el cliente no tiene personalizado vigente, el sistema no marca una rutina personalizada como activa. | RU-23 | NO VERIFICADO |
| 4 | La rutina activa queda visible en el portal del cliente. | RU-25 (**REF** → RU-36..RU-38 de HU-26, sin punto doble DEC-016) | NO VERIFICADO |

Transversales: RU-24 (genéricas sin vigencia), RU-26 (cliente sin estado
activo), RU-27 (permisos).

## Detalle por criterio

### RU-20 — Asignación exitosa
- **Dado** un cliente existente, una rutina existente y un actor DUENO
  autenticado (PEND-RUT-04 (a)).
- **Cuando** envía `asignarRutinaSchema` (`clienteId`, `rutinaId`,
  `fechaInicio` opcional no futura).
- **Entonces** se crea el registro de asignación (201/200 PROPUESTA) con
  `fechaInicio` (hoy America/Bogota por defecto, precedente DEC-005/006),
  `fechaFin: null`, `estado: "ACTIVA"` y `actor` = usuario autenticado real; la
  rutina queda activa para ese cliente.
- **Qué NO cubre**: reemplazo (RU-21), vigencia (RU-23), portal (RU-25),
  historial como lista (RU-32).
- **Prueba esperada**: integración `hu20-asignacion.test.ts` → POST 201;
  GET de la asignación devuelve fechas/actor; la rutina aparece activa.

### RU-21 — Una sola rutina activa por cliente (reemplazo)
- **Dado** un cliente con una asignación ACTIVA (rutina X).
- **Cuando** se asigna una nueva rutina Y.
- **Entonces** la asignación de X se cierra con `fechaFin` = `fechaInicio` de Y
  (`estado: "CERRADA"`) y Y queda ACTIVA; tras la operación existe **exactamente
  una** asignación con `fechaFin = null` para el cliente. Nunca se activan dos.
- **Qué NO cubre**: el detalle del historial (RU-31/RU-32); este criterio
  acredita la regla de unicidad/reemplazo del bullet 1 (regla compartida con
  HU-21 c3, sin cobrarla dos veces al cierre).
- **Prueba esperada**: integración → "asignar X; asignar Y; X tiene fechaFin =
  inicio de Y; solo Y está ACTIVA; `maxUnaActivaPorCliente` true".

### RU-22 — Tipos asignables y recursos inexistentes
- **Dado** rutinas de los tres tipos (genérica, inducción, personalizada).
- **Cuando** se asigna cualquiera de ellas (con las reglas de RU-23/RU-24) o se
  envía un `clienteId`/`rutinaId` inexistente.
- **Entonces** los tres tipos son asignables; cliente inexistente -> 404
  `CLIENTE_NO_ENCONTRADO`; rutina inexistente -> 404 `RUTINA_NO_ENCONTRADA`
  (PROPUESTA) y nada se persiste.
- **Prueba esperada**: integración → matriz tipo × resultado; 404 con cada
  código.

### RU-23 — Regla de vigencia: personalizada solo con personalizado vigente (b3)
- **Dado** un cliente y una rutina PERSONALIZADA (HU-13 b4 / `HU13-C04`).
- **Cuando** se intenta asignarla con el estado del servicio personalizado en
  `NO_CONTRATADO`, `PROGRAMADA`, `CONGELADO` o `VENCIDA` (o sin vigencias).
- **Entonces** el sistema **NO la marca activa**: rechazo 400/409 (PROPUESTA)
  `SIN_VIGENCIA_PERSONALIZADA` con mensaje "El cliente no tiene el servicio
  personalizado vigente: no se puede activar una rutina personalizada"; nada se
  persiste. Con estado `ACTIVA` -> permitida (RU-20).
- **Qué NO cubre**: qué pasa si la vigencia vence DESPUÉS de la asignación ->
  **PEND-RUT-05** (rec (a): validación al momento del cambio + ocultamiento en
  lectura INC05-PER-05; sin auto-cierre).
- **Prueba esperada**: integración/tabla → los 5 estados de la vigencia ×
  asignación personalizada; unidad → `puedeActivarRutina` para cada estado.

### RU-24 — Genéricas/inducción sin requisito de vigencia
- **Dado** un cliente SIN servicio personalizado vigente.
- **Cuando** se le asigna una rutina genérica o de inducción.
- **Entonces** la asignación procede con normalidad (la regla de vigencia aplica
  SOLO a personalizadas; HU-26 c3 confirma que el cliente puede ver
  genérica/inducción sin personalizado vigente).
- **Prueba esperada**: integración → "cliente con vigencia VENCIDA + rutina
  GENERICA -> 201".

### RU-25 — Visibilidad en el portal de la asignación (REF, sin punto doble)
- **Dado** una asignación activa creada.
- **Cuando** el cliente abre su portal.
- **Entonces** la rutina activa queda expuesta según las reglas de HU-26
  (RU-36..RU-38). Este criterio **REF no puntúa** (DEC-016: la visibilidad se
  acredita en HU-26).
- **Prueba esperada**: ninguna propia (referencia a la suite de HU-26).

### RU-26 — Asignación a cliente sin estado activo
- **Dado** un cliente en estado general `SUSPENDIDO`, `RETIRADO` o `INACTIVO`
  (HU-08/HU-17).
- **Cuando** se intenta asignarle una rutina.
- **Entonces** 409 `CLIENTE_INACTIVO` "Cliente sin estado activo: no se le
  pueden asignar rutinas" (recomendación; precedente `clienteInactivoResponseSchema`
  de HU-13 y HU-08 "no accede a servicios activos nuevos sin ser reactivado").
- **Prueba esperada**: integración → cliente SUSPENDIDO/RETIRADO/INACTIVO ->
  409 con el mensaje; cliente ACTIVO -> 201.
- **Nota**: si Producto decide permitir asignación a suspendidos (pausa corta),
  el criterio se elimina por cambio de alcance explícito.

### RU-27 — Permisos de asignación
- **Dado** los roles DUENO, RECEPCIONISTA y CLIENTE.
- **Cuando** cualquiera distinto de DUENO intenta asignar (PEND-RUT-04 (a)).
- **Entonces** 403 y nada se persiste; sin token -> 401. El CLIENTE jamás
  asigna (SEC-01/SEC-03).
- **Prueba esperada**: integración → matriz rol × asignar: DUENO 201;
  RECEPCIONISTA 403; CLIENTE 403; sin token 401.

### RU-28 — Reasignación de la misma rutina ya activa
- **Dado** un cliente con la rutina X ACTIVA.
- **Cuando** se intenta asignar la misma X otra vez.
- **Entonces** 409 `RUTINA_YA_ACTIVA` "La rutina ya está activa para este
  cliente" (no se crea un segundo registro ni se reinicia `fechaInicio`).
- **Prueba esperada**: integración → "asignar X dos veces -> segundo intento 409
  con el mensaje; solo 1 registro".

## Partición de Equivalencia

| Campo / Entrada | Partición | Ejemplo | Válido/Inválido |
|-----------------|-----------|---------|-----------------|
| `clienteId` | Válida: id existente | `cl-1` | Válido |
| `clienteId` | Inválida: vacío / inexistente | `""` / `cl-999` | Inválido |
| `rutinaId` | Válida: id existente | `ru-1` | Válido |
| `rutinaId` | Inválida: vacío / inexistente | `""` / `ru-999` | Inválido |
| `fechaInicio` | Válida: ausente (hoy) o pasada/hoy | `2026-11-04` | Válido |
| `fechaInicio` | Inválida: futura / malformada | `2027-01-01`, `31/01/2026` | Inválido |
| body | Inválido: `fechaFin`/`estado`/`actor` o campo desconocido | `{ fechaFin: ... }` | Inválido (strict) |
| tipo de rutina | Válida: GENERICA/INDUCCION (sin vigencia) | `GENERICA` | Válido |
| tipo de rutina | Válida: PERSONALIZADA con vigencia ACTIVA | `PERSONALIZADA` + `ACTIVA` | Válido |
| tipo de rutina | Inválida: PERSONALIZADA sin vigencia ACTIVA | + `VENCIDA` | Inválido (RU-23) |
| estado del cliente | Válida: NUEVO/ACTIVO | `ACTIVO` | Válido |
| estado del cliente | Inválida: SUSPENDIDO/RETIRADO/INACTIVO | `INACTIVO` | Inválido (RU-26) |
| rol | Válida: DUENO | — | Válido |
| rol | Inválida: RECEPCIONISTA/CLIENTE/sin token | — | Inválido (403/401) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| `clienteId` | string | 1 | — | `""` → 400 | — |
| `rutinaId` | string | 1 | — | `""` → 400 | — |
| `fechaInicio` | fecha | hoy (o pasado) | hoy | ayer → válido | mañana → 400 "Fecha de inicio no puede ser futura" |
| asignaciones ACTIVAS por cliente | int | 0 | 1 | — | 2 → imposible (RU-21/RU-35) |

## Tabla de Decisiones

### Asignación (combinación de reglas)

| Cliente existe | Rutina existe | Estado cliente activo | Tipo rutina | Vigencia personalizada | ¿Rutina ya activa? | Acción |
|----------------|---------------|----------------------|-------------|------------------------|--------------------|--------|
| Sí | Sí | Sí | GENERICA/INDUCCION | — | No | 201 asignación ACTIVA (RU-20/24) |
| Sí | Sí | Sí | PERSONALIZADA | ACTIVA | No | 201 asignación ACTIVA (RU-20/23) |
| Sí | Sí | Sí | PERSONALIZADA | NO_CONTRATADO/PROGRAMADA/CONGELADO/VENCIDA | — | 400/409 `SIN_VIGENCIA_PERSONALIZADA` (RU-23) |
| Sí | Sí | Sí | cualquiera | — | Sí (misma rutina) | 409 `RUTINA_YA_ACTIVA` (RU-28) |
| Sí | Sí | Sí | cualquiera distinta | — | Hay otra activa | 201 + cierra la anterior (RU-21) |
| Sí | Sí | No (SUSPENDIDO/RETIRADO/INACTIVO) | — | — | — | 409 `CLIENTE_INACTIVO` (RU-26) |
| Sí | No | — | — | — | — | 404 `RUTINA_NO_ENCONTRADA` (RU-22) |
| No | — | — | — | — | — | 404 `CLIENTE_NO_ENCONTRADO` (RU-22) |
| Sí | Sí | Sí | — | — | — | 403/401 si rol ≠ DUENO (RU-27) |

### Regla de vigencia por estado (PEND-RUT-05 rec (a); literal INC05-PER-05)

| Estado vigencia personalizado | ¿Asignar PERSONALIZADA? | ¿Se muestra al cliente? (HU-26) |
|-------------------------------|--------------------------|----------------------------------|
| `ACTIVA` | Sí | Sí |
| `NO_CONTRATADO` | No → `SIN_VIGENCIA_PERSONALIZADA` | No (oculta, asignación intacta) |
| `PROGRAMADA` | No → `SIN_VIGENCIA_PERSONALIZADA` | No |
| `CONGELADO` | No → `SIN_VIGENCIA_PERSONALIZADA` | No |
| `VENCIDA` | No → `SIN_VIGENCIA_PERSONALIZADA` | No |

## Transiciones de Estado

### Asignación de rutina (entidad `RutinaAsignacion`)
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| (no existe) | asignar (RU-20) | ACTIVA (`fechaFin = null`) | Sí |
| ACTIVA | asignar OTRA rutina (RU-21) | CERRADA (`fechaFin` = inicio nueva) | Sí |
| ACTIVA | reasignar la MISMA (RU-28) | ACTIVA (sin cambio; 409) | Sí (rechazada) |
| CERRADA | reasignar cualquier rutina | nueva ACTIVA (registro nuevo) | Sí |
| CERRADA | "reactivar" registro cerrado | — | **No** (el historial es inmutable) |
| ACTIVA | editar contenido de la rutina | ACTIVA (sin cambio de asignación) | Sí |

## Cobertura de Ramas

### Ruta: POST /api/clientes/:clienteId/asignaciones (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy genérica | cliente ACTIVO + GENERICA | 201 ACTIVA |
| 2 | Happy inducción | cliente ACTIVO + INDUCCION | 201 ACTIVA |
| 3 | Happy personalizada | + vigencia ACTIVA | 201 ACTIVA |
| 4 | Personalizada sin vigencia ACTIVA | + VENCIDA | 400/409 `SIN_VIGENCIA_PERSONALIZADA` |
| 5 | Reemplazo | ya hay otra activa | 201 + anterior CERRADA |
| 6 | Misma rutina activa | repetir | 409 `RUTINA_YA_ACTIVA` |
| 7 | Cliente inexistente | id fantasma | 404 `CLIENTE_NO_ENCONTRADO` |
| 8 | Rutina inexistente | id fantasma | 404 `RUTINA_NO_ENCONTRADA` |
| 9 | Cliente sin estado activo | SUSPENDIDO | 409 `CLIENTE_INACTIVO` |
| 10 | fechaInicio futura | `2027-01-01` | 400 "Fecha de inicio no puede ser futura" |
| 11 | `fechaFin` en el body | `{ fechaFin }` | 400 (strict) |
| 12 | rol no autorizado | RECEPCIONISTA/CLIENTE | 403 (RU-27) |
| 13 | sin token | — | 401 |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regex / Rango | Longitud | Notas |
|-------|------|-----------|---------------|----------|-------|
| `clienteId` | string | Sí | — | ≥1 | cliente existente |
| `rutinaId` | string | Sí | — | ≥1 | rutina existente (cualquier tipo) |
| `fechaInicio` | fecha | No | `YYYY-MM-DD` válida, no futura | — | default hoy (America/Bogota) |
| `fechaFin` | — | — | — | — | **no se recibe** (la cierra el sistema) |
| `actor` | — | — | — | — | **no se recibe** (usuario autenticado) |

Fuente canónica: `HU-20-schemas.ts` (`asignarRutinaSchema`,
`MENSAJES_ASIGNACION`, `puedeActivarRutina`, `esVisibleRutinaPersonalizada`).

## Navegación propuesta

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-RU-11 | Ficha del cliente → sección rutina | Sin rutina activa | Listado de clientes → ficha | "Asignar rutina" → selector/form; Volver → listado | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-12 | Asignar rutina | Selector + confirmación | Ficha → Asignar rutina | Confirmar → ficha con rutina activa; Cancelar → ficha sin cambios | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-13 | Asignar rutina | Rechazo (sin vigencia / cliente inactivo) | Confirmar con regla violada | Mensaje de error visible; sigue en el form; Volver/Cancelar → ficha | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-14 | Ficha del cliente | Recarga / URL directa / atrás | Recarga, URL directa de la ficha, botón Atrás | Ficha coherente con la asignación persistida; sin bucles | DUENO | E2E | NO VERIFICADO | _pendiente_ |

Transversal: móvil/escritorio, teclado con foco visible, sesión expirada ->
login, guarda PIN obligatorio intacta. No aplica: portal del cliente (HU-26).

## PENDs de esta HU

### PEND-RUT-05 — Consistencia de la regla de vigencia personalizada
- **Pregunta**: ¿qué estados de la vigencia permiten activar una rutina
  personalizada y qué pasa si la vigencia vence DESPUÉS de asignarla? ¿Se
  desactiva sola o la regla es solo validación al momento del cambio?
- **Recomendación (a)**: validación **al momento del cambio** — solo `ACTIVA`
  permite asignar/marcar activa una personalizada (tabla anterior) — + regla de
  **exposición** en lectura (literal INC05-PER-05/HU13-C04: con
  `NO_CONTRATADO`/`PROGRAMADA`/`CONGELADO`/`VENCIDA` la personalizada se oculta
  `null` SIN borrar la asignación). Consistente con HU-16 (el vencimiento tiene
  efecto en acceso/exposición, no borra datos) y con INC-05. Sin eventos ni
  jobs de auto-cierre.
- **Alternativa (b)**: auto-cierre por evento — al vencer la vigencia, la
  asignación se cierra (`fechaFin` = fecha de vencimiento) como parte del efecto
  de HU-16 (historial más "limpio"; requiere job/evento y decide qué pasa con la
  rutina visible ese día).
- **Alternativa (c)**: híbrida — se oculta en lectura (a) y se cierra
  automáticamente al vencer (b); más complejidad.
- **Relación con HU-16**: cualquiera de las opciones no cambia el efecto ya
  aceptado de vencimiento (acceso/portal); la decisión define solo el estado de
  la asignación de rutina.
