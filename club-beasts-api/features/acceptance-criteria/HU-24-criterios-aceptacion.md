# Criterios de Aceptación - HU-24: Historial de planes nutricionales

## Resumen

Conservar el **historial** de planes nutricionales asignados (fecha inicio/fin,
actor, cierre del anterior al activar uno nuevo, visible en la ficha). Analogia
directa con HU-21 (rutinas) y DEC-067 (snapshot al asignar).

**Incremento**: INC-12-nutricion. Criterios **NU-29..NU-35**.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | Guardar fecha de inicio y fecha de fin de cada plan. | NU-29 (fechas) + NU-31 (cierre) | NO VERIFICADO |
| 2 | Registrar quien realizo el cambio. | NU-30 (actor) | NO VERIFICADO |
| 3 | El plan anterior se cierra al activar uno nuevo. | NU-31 (cierre) + NU-35 (inmutabilidad) | NO VERIFICADO |
| 4 | Historial visible en la ficha del cliente. | NU-32 (lectura staff) | NO VERIFICADO |

Transversales: NU-33 (snapshot del contenido), NU-34 (permisos de lectura), NU-35 (inmutabilidad).

## Detalle por criterio

### NU-29 — Fechas de inicio y fin por asignación
- **Dado** una asignación creada.
- **Cuando** se consulta el historial.
- **Entonces** cada registro tiene `fechaInicio` y `fechaFin` (null si activa).
- **Prueba esperada**: integración `hu24-historial.test.ts` → GET devuelve fechas.

### NU-30 — Actor registrado
- **Dado** una asignación creada por un DUENO.
- **Cuando** se consulta el historial.
- **Entonces** el registro incluye `actor` (id/nombre del usuario autenticado real; nunca se recibe en el body).
- **Prueba esperada**: integración → actor = usuario que asignó.

### NU-31 — Cierre del anterior al activar uno nuevo
- **Dado** un cliente con plan X ACTIVO.
- **Cuando** se asigna plan Y.
- **Entonces** X queda CERRADA con `fechaFin` = `fechaInicio` de Y; Y ACTIVA; existe exactamente una con `fechaFin = null`.
- **Prueba esperada**: integración → X fechaFin = inicio de Y.

### NU-32 — Historial visible en la ficha del cliente (staff)
- **Dado** un cliente con asignaciones.
- **Cuando** el DUENO/RECEPCIONISTA consulta la ficha.
- **Entonces** el historial de planes nutricionales (lista ordenada por fechaInicio desc) está disponible.
- **Prueba esperada**: integración → GET historial devuelve lista.

### NU-33 — Snapshot del contenido al asignar (DEC-067)
- **Dado** un plan asignado y luego editado.
- **Cuando** se consulta el historial.
- **Entonces** el registro conserva el contenido del plan tal como estaba al asignar (snapshot), no el contenido actual editado.
- **Prueba esperada**: integración → editar plan después de asignar; historial muestra contenido original.

### NU-34 — Permisos de lectura del historial
- **Dado** los roles DUENO, RECEPCIONISTA y CLIENTE.
- **Cuando** se consulta el historial en la ficha.
- **Entonces** DUENO y RECEPCIONISTA leen; CLIENTE no accede a la gestión (solo su portal HU-27).
- **Prueba esperada**: integración → matriz rol × lectura.

### NU-35 — Inmutabilidad del historial
- **Dado** una asignación CERRADA.
- **Cuando** se intenta "reactivar" o modificar fechas del registro cerrado.
- **Entonces** 409/400; el historial es inmutable (no se borra ni se reescribe).
- **Prueba esperada**: integración → intento de modificar registro cerrado → error.

## Partición de Equivalencia

| Entrada | Partición | Ejemplo | Válido/Inválido |
|---------|-----------|---------|-----------------|
| `clienteId` | Válida: id existente con historial | `cl-1` | Válido |
| `clienteId` | Inválida: inexistente | `cl-999` | Inválido (404) |
| rol | Válida: DUENO/RECEPCIONISTA | — | Válido |
| rol | Inválida: CLIENTE/sin token | — | Inválido (403/401) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| registros por cliente | int | 0 | N | — | — |
| `fechaFin` de cerrada | fecha | = inicio de la nueva | — | antes → inválido | — |

## Cobertura de Ramas

### Ruta: GET /clientes/:clienteId/planes-nutricionales/historial (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Historial con N registros | cliente con 2 asignaciones | 200 lista ordenada |
| 2 | Sin historial | cliente sin asignaciones | 200 lista vacía |
| 3 | Cliente inexistente | id fantasma | 404 |
| 4 | rol no autorizado | CLIENTE | 403 |
| 5 | sin token | — | 401 |

### Ruta: GET /clientes/:clienteId/planes-nutricionales/activa (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Plan activo | cliente con activa | 200 DTO con snapshot |
| 2 | Sin plan activo | cliente sin activa | 200/404 con marcador `SIN_PLAN` |
| 3 | Oculta por vigencia | nutricion no ACTIVA | 200 con marcador `OCULTA_POR_VIGENCIA` (staff) |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `fechaInicio` | fecha | Sí | por asignación |
| `fechaFin` | fecha | No (null si activa) | se setea al cerrar |
| `actor` | string (userId) | Sí | usuario autenticado real |
| `snapshot` | object | Sí | contenido del plan al asignar |

Fuente canónica: `HU-24-schemas.ts` + `HU-22-schemas.ts` (contenido) + `HU-23-schemas.ts` (asignación).

## Navegación propuesta

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-NUT-15 | Ficha del cliente → historial de planes | Normal | Ficha → "Historial de planes" | Lista ordenada; Volver → ficha | DUENO/RECEPCIONISTA | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-16 | Ficha del cliente → historial | Recarga / URL directa / atrás | Recarga, URL directa, botón Atrás | Historial coherente; sin bucles | DUENO/RECEPCIONISTA | E2E | NO VERIFICADO | _pendiente_ |
| NAV-NUT-17 | Ficha del cliente → historial | Sesión expirada / rol no autorizado | CLIENTE escribe URL directa | 403/redirect; logout → login | DUENO | E2E | NO VERIFICADO | _pendiente_ |

Transversal: móvil/escritorio, teclado, guarda PIN obligatorio intacta.

## PENDs de esta HU

### PEND-NUT-08 — Literales y paths (analogia DEC-070)
- **Recomendación (a)**: marcadores de lectura `SIN_PLAN` vs `OCULTA_POR_VIGENCIA` (staff con estado discriminado); path `POST /clientes/:clienteId/planes-nutricionales/asignacion`; `SIN_PLAN_MENSAJE` = "No tienes un plan nutricional activo" (portal).