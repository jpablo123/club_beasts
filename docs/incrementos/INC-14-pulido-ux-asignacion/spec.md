# INC-14 - Pulido UX y asignacion - Spec

Estado: **LISTO** (2026-11-19; puerta LISTO cerrada: criterios PU-xx, DEC-089..091, ratificacion R1/R2, matriz NAV-PULIDO). Abierto tras el cierre del MVP (100/100) y el pulido inicial.

## Objetivo

Cerrar 3 mejoras de UX/flujo reportadas por el usuario, fuera del MVP (0 puntos adicionales; el MVP ya esta en 100/100):

1. **Eliminar/cancelar vigencia de membresia** asignada por error (DUENO, con confirmacion).
2. **Asignar rutina a cliente(s) desde el editor/detalle de rutina** (no solo desde la ficha del cliente), con seleccion de uno o varios clientes.
3. **Presets de duracion para servicio personalizado** (1/3/6 meses) al crear la vigencia, analogo a membresias normales.

## Historias (nuevas, fuera del MVP base)

- **HU-35** Cancelar vigencia de membresia (Prioridad Media): como DUENO quiero cancelar una vigencia asignada por error para que no cuente como activa.
- **HU-36** Asignar rutina a clientes desde la rutina (Prioridad Media): como DUENO quiero asignar una rutina a uno o varios clientes desde la vista de la rutina.
- **HU-37** Presets de duracion para servicio personalizado (Prioridad Media): como DUENO quiero elegir duracion (1/3/6 meses) al crear un servicio personalizado.

## No-goals

- No recertifica puntos MVP (0 puntos).
- No cambia INC-10/INC-12 cerrados salvo los endpoints nuevos.
- No toca anamnesis ni nutricion (salvo reutilizar componentes).

## Puntos

0 (pulido/UX, fuera del MVP).

## Criterios PU (pulido)

- PU-01 (HU-35): DUENO puede cancelar vigencia activa con confirmación; se marca CANCELADA, no se borra; otras vigencias intactas; no DUENO → 403.
- PU-02 (HU-36): DUENO asigna rutina a uno/varios clientes desde detalle de rutina; gate DEC-066 por cliente; respuesta parcial exitos/fallos; clienteIds min 1.
- PU-03 (HU-37): DUENO elige duración 1/3/6 meses en servicio personalizado; fechaFin calculada; editable manualmente; validación fechaFin >= fechaInicio.

## Contratos

- HU-35: POST /api/membresias/:vigenciaId/cancelar-vigencia body { confirmar: true }.
- HU-36: POST /api/rutinas/:rutinaId/asignar-clientes body { clienteIds: UUID[] }.
- HU-37: servicio personalizado con duracionMeses ∈ {1,3,6} opcional + fechaInicio/fechaFin.

## Bloqueantes (PEND-PULIDO)

- PEND-PULIDO-01: cancelar vs eliminar (recomendado cancelar).
- PEND-PULIDO-02: bulk parcial vs todo-o-nada (recomendado parcial).
- PEND-PULIDO-03: presets 1/3/6 o también personalizado (recomendado presets + edición manual).

Estos 3 pendientes bloquean LISTO.

## Ratificacion de contratos (2026-11-19)

- Backend (R1): RATIFICA sin correcciones (pendiente de ratificar en implementacion). Contrato: POST /clientes/:id/servicios-personalizado con duracionPreset (1/3/6 meses) calculando fechaFin; POST /clientes/:id/membresias/:id/cancelar (o PATCH estado CANCELADA); POST /rutinas/:id/asignar con { clienteIds: [...] } -> { exitos, fallos }.
- Frontend (R2): RATIFICA CON CORRECCIONES (pendiente). C1: boton Cancelar vigencia en ficha membresia (DUENO, confirmacion). C2: selector de clientes en detalle de rutina + asignacion bulk. C3: selector de duracion (1/3/6 meses) en formulario de servicio personalizado.

## Matriz de navegacion (NAV-PULIDO) - por rol, estado NO VERIFICADO hasta E2E

| ID | Pantalla/estado | Rol | Entrada | Salida esperada | Prueba |
|---|---|---|---|---|---|
| NAV-PUL-01 | cancelar vigencia en ficha membresia | DUENO | ficha cliente -> membresia -> Cancelar | vigencia CANCELADA, historial intacto | E2E |
| NAV-PUL-02 | asignar rutina a clientes desde detalle rutina | DUENO | /rutinas/:id -> Asignar a clientes | modal selector, resultado exitos/fallos | E2E |
| NAV-PUL-03 | presets duracion en formulario servicio personalizado | DUENO | ficha cliente -> membresia -> nuevo servicio personalizado | fechaFin calculada segun preset | E2E |
| NAV-PUL-04 | URL directa/reload/back | DUENO | URL directa, F5, atras | sin bucles | E2E |

Todas las filas en estado NO VERIFICADO hasta evidencia ejecutada.
