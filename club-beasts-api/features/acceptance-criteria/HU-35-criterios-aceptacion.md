# Criterios de Aceptación - HU-35: Cancelar vigencia de membresía

## Resumen
Permite a DUENO cancelar una vigencia de membresía asignada por error, marcándola como cancelada (no borrada) para auditoría, sin afectar otras vigencias.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| vigenciaId | UUID existente de vigencia activa | vig-001 | UUID inexistente | vig-999 |
| rol | DUENO | DUENO | ENTRENADOR/CLIENTE | ENTRENADOR |
| estado vigencia | ACTIVA | ACTIVA | ya CANCELADA | CANCELADA |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Valores Permitidos |
|-------|------|-----------|-------------------|
| vigenciaId | UUID | Sí | existe y activa |
| rol | enum | Sí | DUENO |

## Tabla de Decisiones
### Cancelar vigencia
| Rol DUENO | Vigencia activa | Confirmación | Acción |
|-----------|----------------|--------------|--------|
| Sí | Sí | Sí | Marca cancelada (audit) |
| Sí | Sí | No | No-op |
| Sí | No | - | 409 ya cancelada |
| No | - | - | 403 |

## Transiciones de Estado
### Vigencia
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| ACTIVA | cancelar | CANCELADA | Sí |
| CANCELADA | cancelar | CANCELADA | No (idempotente 409) |

## Cobertura de Ramas
### Ruta: POST /api/membresias/:id/cancelar-vigencia
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | DUENO cancela activa | vigencia activa + confirm | 200, estado CANCELADA, historial preservado |
| 2 | Rol no DUENO | ENTRENADOR | 403 |
| 3 | Vigencia ya cancelada | vigencia cancelada | 409 |
| 4 | Vigencia inexistente | id falso | 404 |
| 5 | Sin confirmación | confirm=false | 400/No-op |
| 6 | Otras vigencias intactas | cancelar una | otras siguen ACTIVA |

## Pendientes bloqueantes
- PEND-PULIDO-01: cancelar vs eliminar (recomendado: marcar CANCELADA, no borrar).
