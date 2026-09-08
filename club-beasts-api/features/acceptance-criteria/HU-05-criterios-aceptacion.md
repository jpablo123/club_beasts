# Criterios de Aceptación - HU-05: Edición de cliente básico

## Resumen
Edición de datos básicos del cliente (nombres, apellidos, teléfono, email, sedeId, estado, observaciones). Se registra fecha de actualización y usuario responsable.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| id | UUID existente | uid-123 | No existe | uid-xxx |
| nombres | Solo letras, 1-100 | María | Números | María123 |
| apellidos | Solo_letters, 1-100 | López | Vacío | "" |
| telefono | Móvil CO | 3101234567 | No móvil | 2101234567 |
| email | Formato válido o vacío | a@b.com | Formato inválido | abc |
| sedeId | UUID existente | uid-sede-1 | No existe | uid-xxx |
| estado | Enum válido | ACTIVO | No válido | BLOQUEADO |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| nombres | string | 1 | 100 | 0 | 101 |
| apellidos | string | 1 | 100 | 0 | 101 |
| telefono | string | 10 | 10 | 9 | 11 |
| email | string | 0 | 254 | - | >254 |

## Tabla de Decisiones
### Edición de cliente
| cliente existe | campos válidos | sede existe | Acción |
|---------------|---------------|------------|--------|
| true | true | true | 200 cliente actualizado |
| true | false | * | 400 Datos de entrada inválidos |
| true | true | false | Error (no controlado) |
| false | * | * | 404 Cliente no encontrado |

## Transiciones de Estado
### Cliente
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| NUEVO | Edición | NUEVO (sin cambio de estado explícito) | Sí |
| ACTIVO | Cambio estado | SUSPENDIDO | Sí |
| SUSPENDIDO | Cambio estado | ACTIVO | Sí |
| * | Cambio estado | RETIRADO | Sí |
| RETIRADO | Cambio estado | * | No (regla de negocio no definida) |

## Cobertura de Ramas
### Ruta: PATCH /api/clientes/:id
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | id válido + campos válidos | 200 cliente actualizado |
| 2 | cliente inexistente | id no existente | 404 Cliente no encontrado |
| 3 | nombres inválido | "María123" | 400 (falta validación) |
| 4 | telefono inválido | "2101234567" | 200 (falta validación) |
| 5 | email inválido | "abc" | 200 (falta validación) |
| 6 | sedeId inexistente | uid-xxx | Error (falta validación) |
| 7 | estado inválido | "BLOQUEADO" | 200 (falta validación enum) |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| id | string | sí (params) | - | 1-36 | UUID |
| nombres | string | no (parcial) | /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/ | 1-100 | solo letras |
| apellidos | string | no (parcial) | /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/ | 1-100 | solo letras |
| telefono | string | no (parcial) | /^3\d{9}$/ | 10 | móvil colombiano |
| email | string | no | /^[^\s@]+@[^\s@]+\.[^\s@]+$/ | 0-254 | formato email |
| sedeId | string | no (parcial) | - | 1-36 | UUID |
| estado | string | no | - | - | NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO |
| observaciones | string | no | - | 0-500 | texto libre |

## Gaps vs código actual
- `src/routes/clientes.ts:53-64` no valida campos del body, pas `any` directo al service.
- `src/routes/clientes.ts:62` no valida formato de teléfono, email, nombres, apellidos.
- `src/routes/clientes.ts` no valida que `sedeId` exista en tabla Sede.
- `src/routes/clientes.ts` no valida `estado` contra valores permitidos (NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO).
- `src/services/cliente.service.ts:37-41` ejecuta update directo sin validación.
