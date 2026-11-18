# Criterios de Aceptación - HU-21: Historial de cambios de rutina

## Resumen

Conservar el historial de rutinas asignadas al cliente: fecha de inicio y fin de
cada asignación, quién hizo el cambio, cierre de la rutina anterior al asignar
una nueva, e historial consultable en la ficha del cliente.

**Incremento**: INC-10-rutinas (bloque 6, 18 pts MVP). Criterios **RU-29..RU-35**
de esta HU (secuencia RU-01..RU-42 única del bloque).

**Decisiones aplicadas**:

- **Modelo**: tabla de asignaciones `RutinaAsignacion` (`fechaInicio`,
  `fechaFin` nullable, `actor`) — **PEND-RUT-06 (rec (a))** incluye
  `contenidoSnapshot` (copia del contenido al asignar; precedente **DEC-056**
  snapshot). Alternativas (b) referencia viva y (c) `RutinaVersion` ver PEND.
- **Estado derivado**: `estado = ACTIVA | CERRADA` según `fechaFin` (sin
  columna; patrón del estado derivado de HU-11/Anamnesis).
- **Trazabilidad**: `actor` = usuario autenticado real (precedentes
  `ClienteEstadoCambio.actorId` / `Anamnesis.actualizadoPorId`); visible solo a
  staff (HU-26 lo omite).
- **Sin doble cobro (DEC-016)**: el bullet "la rutina anterior deja de estar
  activa" es la misma regla de reemplazo acreditada en RU-21 (HU-20); aquí
  RU-31 acredita su **efecto en el historial** (cierre con `fechaFin` +
  transiciones). Los bullets "ficha muestra rutina activa e historial" de HU-07
  son contexto de visibilidad (puntos por reparto al cierre, no aquí).

Códigos HTTP/endpoints: **PROPUESTA**.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El sistema guarda fecha de inicio y fecha de fin de cada rutina asignada. | RU-29 | NO VERIFICADO |
| 2 | El sistema registra quién hizo el cambio. | RU-30 | NO VERIFICADO |
| 3 | La rutina anterior deja de estar activa cuando se asigna una nueva. | RU-31 (efecto en historial; regla compartida con RU-21) | NO VERIFICADO |
| 4 | El historial queda disponible en la ficha del cliente. | RU-32 (+ RU-34 acceso) | NO VERIFICADO |

Transversales: RU-33 (snapshot, PEND-RUT-06), RU-35 (invariante 1 activa).

## Detalle por criterio

### RU-29 — Fecha de inicio y de fin por asignación
- **Dado** cualquier asignación (activa o cerrada) del historial.
- **Cuando** se consulta el historial.
- **Entonces** cada registro tiene `fechaInicio` (siempre) y `fechaFin`
  (`null` en la activa; fecha de cierre en las cerradas). Ningún registro queda
  sin `fechaInicio`; ninguna asignación cerrada queda con `fechaFin = null`.
- **Prueba esperada**: integración → "tras crear 2 asignaciones sucesivas, el
  historial tiene: nueva con fechaFin null y previa con fechaFin = inicio de la
  nueva".

### RU-30 — Actor del cambio (trazabilidad)
- **Dado** un actor autenticado que asigna (o cierra vía reemplazo).
- **Cuando** la operación termina.
- **Entonces** el registro persiste `actor` = usuario autenticado real
  (`{ id, nombre }`; precedentes `ClienteEstadoCambio.actorId` /
  `Anamnesis.actualizadoPorId`) — nunca un valor libre del request (el schema
  rechaza `actor` en el body, strict). El actor es visible a staff en la ficha;
  el CLIENTE nunca lo ve (HU-26 omite `actor`).
- **Prueba esperada**: integración → "el actor del registro = usuario del token;
  body con `actor` -> 400; DTO del portal sin `actor`".

### RU-31 — Reemplazo: la rutina anterior deja de estar activa (efecto)
- **Dado** el cliente con la rutina X ACTIVA y una asignación nueva de Y.
- **Cuando** se completa la asignación de Y.
- **Entonces** X queda `CERRADA` (`fechaFin` = `fechaInicio` de Y,
  `cerrarAsignacionActiva`), Y `ACTIVA`; el historial conserva ambas en orden.
  Transiciones válidas/inválidas: ver tabla §Transiciones.
- **Qué NO cubre**: la regla de unicidad en sí (RU-21); este criterio acredita
  su efecto documentado en el historial (sin cobrar el mismo bullet dos veces).
- **Prueba esperada**: integración → "X antes ACTIVA; asignar Y; X CERRADA con
  la fecha exacta; el total de activas es 1".

### RU-32 — Historial disponible en la ficha del cliente
- **Dado** una ficha de cliente con ≥1 asignación.
- **Cuando** el staff consulta la sección de rutina/historial (HU-07 b5/b6 como
  contexto de visibilidad, sin punto propio aquí).
- **Entonces** se lista el historial completo (`historialRutinasSchema`) con:
  rutina (`id`, `nombre`, `tipoRutina`), `fechaInicio`, `fechaFin`, `estado`,
  `actor` y (PEND-RUT-06 (a)) `contenidoSnapshot`; orden PROPUESTO
  `fechaInicio` DESC (la activa arriba); el historial es **inmutable** por UI
  (sin edición ni borrado de registros; solo se agregan al asignar).
- **Prueba esperada**: integración → "GET historial: 2 registros en orden DESC
  con fechas/actor; intento de PUT/DELETE del historial -> 404/405 (sin ruta de
  escritura)".

### RU-33 — Contenido del historial (PEND-RUT-06 rec (a))
- **Dado** una asignación registrada y una edición posterior del contenido de la
  rutina.
- **Cuando** se consulta el historial (en cualquier momento).
- **Entonces** el registro de la asignación conserva el **contenido del momento
  de asignar** (`contenidoSnapshot`, precedente DEC-056): editar la rutina no
  altera lo que muestra el historial histórico. Con la alternativa (b)
  referencia viva este criterio se reduce a "el historial muestra el contenido
  actual de la rutina" (limitación documentada).
- **Prueba esperada**: integración → "asignar r1 con contenido A; editar r1 a
  contenido B; el historial del cliente sigue mostrando A (snapshot)".

### RU-34 — Acceso al historial (staff only)
- **Dado** los roles DUENO, RECEPCIONISTA y CLIENTE.
- **Cuando** se consulta el historial de un cliente.
- **Entonces** DUENO/RECEPCIONISTA (lectura staff) lo consultan; el CLIENTE
  solo ve SU rutina activa en el portal (HU-26) y jamás el historial ni datos de
  otros clientes (SEC-01/SEC-03/GAP-001): cliente consultando historial ajeno ->
  403/404 sin datos de B en la respuesta.
- **Prueba esperada**: integración → "CLIENTE GET historial -> 403/404; CLIENTE
  GET historial de otro cliente -> 403/404 sin datos; staff -> 200".

### RU-35 — Invariante: nunca dos activas
- **Dado** cualquier estado de la base.
- **Cuando** se consulta la lista de asignaciones de un cliente.
- **Entonces** `maxUnaActivaPorCliente` es siempre true (0 o 1 con
  `fechaFin = null`); la regla se verifica también en los cierres de RU-21/RU-31.
- **Prueba esperada**: unidad → `maxUnaActivaPorCliente` con 0/1/2 activas;
  integración → tras cualquier secuencia de asignaciones, exactamente 0 o 1
  activas.

## Partición de Equivalencia

| Campo / Entrada | Partición | Ejemplo | Válido/Inválido |
|-----------------|-----------|---------|-----------------|
| `fechaInicio` | Válida: presente en todo registro | `2026-11-01` | Válido |
| `fechaFin` | Válida: `null` en la activa | `null` | Válido |
| `fechaFin` | Válida: fecha de cierre en cerradas | `2026-11-05` | Válido |
| `fechaFin` | Inválida: null en 2 registros simultáneamente | 2 activas | Inválido (RU-35) |
| `actor` | Válida: usuario autenticado | `{ id: "u1", ... }` | Válido |
| `actor` | Inválida: libre en el body | `{ actor: {...} }` | Inválido (strict) |
| `contenidoSnapshot` | Válida: copia del contenido (a) o `null` (b) | árbol de la rutina | Válido |
| consulta | Válida: staff sobre cliente propio del sistema | DUENO → cliente A | Válido |
| consulta | Inválida: CLIENTE sobre historial | CLIENTE → historial | Inválido (RU-34) |
| edición | Inválida: editar/borrar un registro del historial | PUT/DELETE | Inválido (inmutable) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| asignaciones ACTIVAS por cliente | int | 0 | 1 | — | 2 → imposible (RU-35) |
| registros del historial | int | 0 | sin límite (paginación) | — | — |
| `fechaFin` de la previa | fecha | = `fechaInicio` de la nueva | — | anterior a la nueva → inconsistencia (prohibida) | — |

## Tabla de Decisiones

### Cierre de la asignación previa (RU-31)

| ¿Había activa previa? | Asignación nueva | Acción sobre la previa | Resultado |
|-----------------------|------------------|------------------------|-----------|
| No | Válida | — | Nueva ACTIVA |
| Sí (rutina X) | Rutina Y (distinta) | `fechaFin` = inicio de Y | X CERRADA + Y ACTIVA |
| Sí (rutina X) | Rutina X (misma) | — | 409 (RU-28); historial sin cambios |
| Sí | Rechazada (vigencia/estado/404) | — | Sin cambios |

### Visibilidad del historial (RU-32/RU-34)

| Rol | Historial propio (ficha) | Historial de otro cliente | Actor visible |
|-----|--------------------------|---------------------------|---------------|
| DUENO | 200 | 200 (ficha de cualquier cliente) | Sí |
| RECEPCIONISTA | 200 (lectura) | 200 (lectura) | Sí |
| CLIENTE | No (solo su rutina activa en portal) | 403/404 (SEC-01/SEC-03) | No |

## Transiciones de Estado

### Asignación (registrada en el historial)
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| (no existe) | asignar | ACTIVA | Sí |
| ACTIVA | asignar otra rutina | CERRADA | Sí |
| ACTIVA | reasignar la misma | ACTIVA (409, sin cambio) | Rechazada |
| CERRADA | "reactivar" | — | **No** (registro inmutable) |
| CERRADA | editar/borrar por UI | — | **No** (inmutable; solo agregados) |

## Cobertura de Ramas

### Ruta: GET /api/clientes/:clienteId/rutinas/historial (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path staff | 2 asignaciones | 200 lista ordenada DESC con fechas/actor |
| 2 | Cliente sin asignaciones | 0 registros | 200 lista vacía, `total: 0` |
| 3 | Solo lectura | PUT/DELETE del registro | 404/405 (sin ruta de escritura) |
| 4 | CLIENTE autenticado | token CLIENTE | 403/404 (RU-34) |
| 5 | Cliente ajeno | CLIENTE sobre B | 403/404 sin datos (SEC-01/SEC-03) |
| 6 | sin token | — | 401 |
| 7 | snapshot tras edición | editar rutina asignada | el historial conserva el snapshot (RU-33) |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regla | Notas |
|-------|------|-----------|-------|-------|
| `id` | string | Sí | — | de la asignación |
| `clienteId` | string | Sí | — | |
| `rutina` | resumen | Sí | `{ id, nombre, tipoRutina, descripcion }` | referencia + snapshot |
| `fechaInicio` | fecha | Sí | `YYYY-MM-DD` | = inicio de la asignación |
| `fechaFin` | fecha \| null | Sí (nullable) | null ⟺ ACTIVA | = `fechaInicio` de la que la reemplazó |
| `estado` | enum derivado | Sí | `ACTIVA` \| `CERRADA` | derivado de `fechaFin` |
| `actor` | `{ id, nombre }` | Sí | usuario real | solo staff |
| `contenidoSnapshot` | árbol \| null | PEND-06 | copia al asignar | rec (a) |

Fuente canónica: `HU-21-schemas.ts` (`historialRutinasSchema`,
`cerrarAsignacionActiva`, `maxUnaActivaPorCliente`) + `rutinaAsignacionSchema`
en `HU-20-schemas.ts`.

## Navegación propuesta

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-RU-15 | Ficha del cliente → historial de rutinas | Con historial | Ficha → sección historial (scroll/colapsable) | Expandir registro → detalle (snapshot); Volver → ficha | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-16 | Ficha del cliente → historial | Vacío | Ficha → sección historial | Mensaje "sin historial"; Volver/navegación sin bucles | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-17 | Ficha del cliente → historial | Recarga / URL directa / atrás | Recarga, URL directa, botón Atrás | Estado coherente; historial ordenado igual tras recarga | DUENO | E2E | NO VERIFICADO | _pendiente_ |

No aplica: edición/cancelación (el historial no tiene operaciones de escritura
propia; la "cancelación" de una asignación es asignar otra). Portal del cliente:
NAV-RU-18..22 (HU-26). Sesión expirada y PIN obligatorio: reglas transversales
de NAV-RU-05.

## PENDs de esta HU

### PEND-RUT-06 — Cardinalidad/forma del historial y versionado del contenido
- **Pregunta**: ¿el historial es una tabla de asignaciones con
  fechaInicio/fechaFin/actor (o modelo tipo `ClienteEstadoCambio`)? Y si se
  edita la rutina, ¿el historial conserva el contenido del momento (snapshot) o
  la referencia viva?
- **Recomendación (a)**: **tabla de asignaciones** `RutinaAsignacion` (modelo
  ya propuesto en `HU-20-schemas.ts`) + **snapshot del contenido al asignar**
  (`contenidoSnapshot`, precedente DEC-056: documento histórico no mutable por
  ediciones posteriores; cumple el propósito HU-21 "consultar la evolución del
  cliente"). Costo: 1 columna JSON por asignación.
- **Alternativa (b)**: tabla de asignaciones con **referencia viva** (sin
  snapshot; `contenidoSnapshot: null`) — más simple; el historial mostraría el
  contenido ACTUAL de la rutina si se edita (limitación documentada).
- **Alternativa (c)**: **versionado explícito** (`RutinaVersion` inmutable +
  asignación apuntando a la versión) — lo más completo (reutilizable por el
  portal); complejidad alta para el MVP, recomendable si el bloque 7 necesita
  versiones.
