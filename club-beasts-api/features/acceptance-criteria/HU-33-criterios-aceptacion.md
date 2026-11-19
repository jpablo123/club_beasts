# Criterios de Aceptación - HU-33: Conteos basicos por sede

- Origen: `historias-usuario-gimnasio.md` §4.11 HU-33 (líneas 527-539).
- Incremento: INC-13.
- Decisiones que rigen: DEC-005/006 (fechas), DEC-048 (acceso sin membresia), DEC-065/080 (solo DUENO).

## Resumen

Reporte simple sin analitica avanzada: clientes activos por sede, vencidos/congelados por sede, ingresos del dia por sede. Solo DUENO. Reporte simple, sin dashboards analiticos ni facturacion.

## Mapa de bullets -> IDs

| Bullet | ID |
|---|---|
| b1 clientes activos por sede | `HU33-C01` |
| b2 vencidos/congelados por sede | `HU33-C02` |
| b3 ingresos del dia por sede | `HU33-C03` |
| b4 reporte simple sin analitica | `HU33-C04` |
| (transversal) permisos | `HU33-C05` |

## Criterios detallados

### HU33-C01 — Clientes activos por sede
- **Disparo**: `GET /sedes/:sedeId/conteos` (o endpoint agregador definido en PEND-HIS-02).
- **Resultado observable**: 200 con `clientesActivos` = count de clientes cuya sede es la indicada y tienen al menos un servicio con estado calculado ACTIVA o CONGELADO hoy (America/Bogota).

### HU33-C02 — Vencidos/congelados por sede
- **Resultado observable**: mismo response incluye `clientesVencidos` (ningun servicio vigente y al menos uno VENCIDA) y `clientesCongelados` (al menos un CONGELADO).

### HU33-C03 — Ingresos del dia por sede
- **Resultado observable**: `ingresosHoy` = count de Ingreso con sedeId = indicada y fecha = hoy (America/Bogota).

### HU33-C04 — Reporte simple
- **Resultado observable**: response solo contiene los 4 contadores + sede + fecha; sin graficas, sin tendencias, sin exportacion. HTTP 200.

### HU33-C05 — Permisos
- **Resultado observable**: DUENO → 200; RECEPCIONISTA → 403 (PEND-HIS-06); CLIENTE → 403; sin token → 401.

## PEND-HIS-02
Endpoint unico vs reutilizar endpoints existentes. Bloqueante para LISTO.

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Valores |
|-------|------|-----------|---------|
| sedeId | string | sí | id existente en Sede |
| fecha | string | no | YYYY-MM-DD (default hoy) |