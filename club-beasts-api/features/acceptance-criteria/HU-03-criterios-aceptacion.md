# Criterios de Aceptación - HU-03: Restablecimiento de PIN del cliente

## Resumen
Un usuario autenticado (DUENO o RECEPCIONISTA) puede restablecer el PIN de un cliente. Se registra quién realizó el cambio.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| clienteId | UUID existente en DB | uid-123 | No existe | uid-xxx |
| newPin | 4 dígitos | 5678 | No 4 dígitos | 12, abcd, 12345 |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| newPin (dígitos) | num | 4 | 4 | 3 | 5 |

## Tabla de Decisiones
### Restablecimiento de PIN
| autenticado | cliente existe | newPin válido | Acción |
|-------------|---------------|--------------|--------|
| true | true | true | 200 PIN actualizado correctamente |
| true | true | false | 400 PIN debe ser de 4 dígitos |
| true | false | * | 404 Cliente no encontrado (falta en ruta actual) |
| false | * | * | 401 No autenticado |

## Transiciones de Estado
No aplica (operación puntual).

## Cobertura de Ramas
### Ruta: POST /api/auth/reset-pin
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | clienteId válido + newPin 4 dígitos | 200 message OK |
| 2 | clienteId faltante | solo newPin | 400 clienteId y newPin requeridos |
| 3 | newPin faltante | solo clienteId | 400 clienteId y newPin requeridos |
| 4 | newPin inválido | clienteId + "12" | 400 PIN debe ser de 4 dígitos |
| 5 | cliente inexistente | clienteId inexistente + newPin | Error (actual: Prisma error sin catch) |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| clienteId | string | sí | - | 1-36 | UUID |
| newPin | string | sí | /^\d{4}$/ | 4 | 4 dígitos |

## Gaps vs código actual
- `src/routes/auth.ts:41-54` no valida autorización por rol (solo `authenticate`; cualquier usuario autenticado podría hacer reset). No registra quién hizo el cambio.
- `src/routes/auth.ts:52` llama `resetPin` sin validar existence del cliente; Prisma lanzará error no controlado si `clienteId` no existe (falta 404).
- `src/services/auth.service.ts:29-35` no registra trazabilidad (quién realizó el cambio).
