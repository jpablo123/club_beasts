# Criterios de Aceptación - HU-32: Historial basico del cliente

- Origen: `historias-usuario-gimnasio.md` §4.11 HU-32 (líneas 515-526).
- Incremento: INC-13 (`docs/incrementos/INC-13-historial-reportes/spec.md`).
- Estado: borrador de especificación (no cuenta puntos sin spec + implementación + prueba + evidencia + revisión, DEC-016).
- Decisiones que rigen: DEC-041 (nunca actor en portal), DEC-057 (1 anamnesis por cliente), DEC-067 (snapshot al asignar rutina), DEC-082 (planes).

## Resumen

Consolida en una vista por cliente los cambios de rutina (INC-10), cambios de plan nutricional (INC-12) e ingresos registrados (INC-03), con fechas y usuario responsable. Solo staff (DUENO/RECEPCIONISTA) ve el consolidado; el cliente ve su propio historial. No crea versionado completo de anamnesis (fuera de alcance).

## Mapa de bullets -> IDs de criterio

| Bullet de la HU | ID criterio | Nota |
|---|---|---|
| b1 - cambios de rutina | `HU32-C01` | reutiliza historial INC-10 |
| b2 - cambios de plan nutricional | `HU32-C02` | reutiliza historial INC-12 |
| b3 - ingresos registrados | `HU32-C03` | reutiliza ingresos INC-03 |
| b4 - fechas + usuario responsable | `HU32-C04` | trazabilidad; nunca actor en portal (DEC-041) |
| (transversal) permisos | `HU32-C05` | DEC-065/DEC-080: solo DUENO ve consolidado staff |
| (transversal) paginacion/filtro | `HU32-C06` | opcional |

## Criterios detallados

### HU32-C01 — Cambios de rutina en el historial
- **Condición previa**: cliente con al menos una asignacion de rutina (INC-10).
- **Disparo**: `GET /clientes/:clienteId/historial?tipo=RUTINA`.
- **Resultado observable**: HTTP 200 con lista de `{ tipo: "RUTINA", fecha, actor: {id,nombre}, resumen }` ordenada desc; snapshot del contenido al asignar (DEC-067).
- **NO cubre**: creacion/edicion de rutinas (INC-10).

### HU32-C02 — Cambios de plan nutricional en el historial
- **Condición previa**: cliente con al menos una asignacion de plan (INC-12).
- **Disparo**: `GET /clientes/:clienteId/historial?tipo=PLAN_NUTRICIONAL`.
- **Resultado observable**: HTTP 200 con lista análoga a C01 con `tipo: "PLAN_NUTRICIONAL"`.

### HU32-C03 — Ingresos registrados en el historial
- **Condición previa**: cliente con al menos un ingreso (INC-03).
- **Disparo**: `GET /clientes/:clienteId/historial?tipo=INGRESO`.
- **Resultado observable**: HTTP 200 con lista `{ tipo: "INGRESO", fecha, hora, sede, registradoPor }`.

### HU32-C04 — Fechas + usuario responsable (trazabilidad)
- **Condición previa**: cualquier entrada del historial.
- **Disparo**: lectura.
- **Resultado observable**: cada entrada tiene `fecha` (YYYY-MM-DD America/Bogota), `createdAt` y `actor` (id+nombre) del usuario que realizo el cambio; el rol CLIENTE nunca ve `actor` (DEC-041).

### HU32-C05 — Permisos (DEC-065/DEC-080)
- **Condición previa**: tokens de los tres roles.
- **Disparo**: `GET /clientes/:clienteId/historial`.
- **Resultado observable**: DUENO/RECEPCIONISTA → 200; CLIENTE solo su propio historial (sin actor) → 200; otro cliente → 403; sin token → 401.

### HU32-C06 — Filtro y paginacion
- **Condición previa**: historial con >20 entradas.
- **Disparo**: `?tipo=...&limit=20&offset=0`.
- **Resultado observable**: 200 con `{ items, total }`, orden desc por fecha.

## PEND-HIS-01
Alcance consolidado vs endpoints separados. Bloqueante para LISTO.

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Valores Permitidos |
|-------|------|-----------|-------------------|
| tipo | string | no | RUTINA, PLAN_NUTRICIONAL, INGRESO, (omitido = todos) |
| limit | int | no | 1-100 (default 20) |
| offset | int | no | >=0 (default 0) |