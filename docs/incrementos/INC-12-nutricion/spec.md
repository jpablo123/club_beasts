# INC-12 - Nutricion, asignacion e historial - Spec

Estado: **PROPUESTO** (2026-11-18). Abierto tras el cierre de INC-11 (79/100).

## Objetivo

Cerrar el bloque 7 del MVP (12 puntos): creacion de plan nutricional estructurado, asignacion activa con gate de vigencia del servicio de nutricion, historial de planes y visualizacion en el portal del cliente. Analogia directa con INC-10 (rutinas): reutilizar el patron asignacion/historial/snapshot/portal.

## Historias cubiertas

- **HU-22** Creacion de plan nutricional estructurado (Prioridad Alta) — 5 bullets.
- **HU-23** Asignacion de plan nutricional activo (Prioridad Alta) — 4 bullets.
- **HU-24** Historial de planes nutricionales (Prioridad Media) — 4 bullets.
- **HU-27** Visualizacion del plan nutricional activo en portal (Prioridad Alta) — 4 bullets.

Total: 17 bullets (analogia con INC-10's 16 + portal).

## Peso del bloque

12 puntos (mvp.md bloque 7). Reparto por DEC-016 a definir al cierre en `auditoria-puntos-inc00.md` §14 (analogia §13).

## Decisiones pendientes (PEND-NUT)

A resolver por Producto antes de LISTO (analogia PEND-RUT):

- **PEND-NUT-01** Estructura del plan: campos biometricos (peso, talla, % grasa, etc.) y objetivos caloricos — fijos o libres.
- **PEND-NUT-02** Macros: distribucion de macronutrientes como texto/numero manual (no se calculan automaticamente, HU-22 c5) — formato exacto.
- **PEND-NUT-03** Tiempos de comida: estructura (desayuno/almuerzo/... con alimentos y cantidades) — fija o libre.
- **PEND-NUT-04** Recomendaciones y suplementacion: texto libre o estructurado.
- **PEND-NUT-05** Gate de vigencia: solo servicio de nutricion en estado ACTIVA permite activar plan (analogia DEC-066); si vence despues, el plan queda intacto y el portal lo oculta (analogia INC05-PER-05).
- **PEND-NUT-06** Permisos: solo DUENO crea/edita/asigna (analogia DEC-065); RECEPCIONISTA solo lectura; CLIENTE solo lectura de la suya.
- **PEND-NUT-07** Portal: visualizacion completa solo lectura (analogia DEC-068); nunca actor.
- **PEND-NUT-08** Literales y paths del contrato (analogia DEC-070).

## Contrato API (a ratificar)

Analogia con INC-10:
- `POST /planes-nutricionales` (creacion estructurada)
- `GET /planes-nutricionales`, `GET /planes-nutricionales/:id`
- `PATCH /planes-nutricionales/:id` (edicion por secciones)
- `POST /clientes/:clienteId/planes-nutricionales/asignacion` (asignacion, invariante 0-1 activos, gate de vigencia)
- `GET /clientes/:clienteId/planes-nutricionales/activa`
- `GET /clientes/:clienteId/planes-nutricionales/historial`
- `GET /portal/plan-nutricional` (solo lectura, gate por servicio vigente)

## Modelo de datos (a definir por database-admin)

Analogia con INC-10: `PlanNutricional` + `PlanNutricionalAsignacion` (snapshot del contenido al asignar, fechas inicio/fin, actor). Migracion nueva.

## Navegacion

Aplicabilidad: **SI** (nuevas pantallas `/nutricion`, `/nutricion/nueva`, `/nutricion/:id`, `/nutricion/:id/editar`, `/portal/plan-nutricional`, seccion historial en ficha). Se requiere matriz NAV-NUT-01..NN por rol antes de LISTO (analogia NAV-RU).

## No-goals

- No calcular macros automaticamente (HU-22 c5).
- No historial versionado del plan (block 8 HU-32).
- No cambios a INC-10/INC-11 cerrados salvo endpoints de ficha ya existentes.

## Puntos

12 (0 hasta evidencia + revision + aceptacion).

## Cierre de HU-07 b5/b6

Los endpoints `/clientes/:id/rutinas/{activa,historial}` (INC-10 C9) ya existen; el cierre de HU-07 b5/b6 (rutina activa + historial en ficha) se acredita como **+1 punto en bloque 2** al final de INC-12 o en un incremento de cierre, sin duplicar con bloque 6 (INC10-R01 / INC10-R02).