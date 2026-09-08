# Criterios de Aceptación - HU-06: Búsqueda y filtros de clientes

## Resúsqueda
Búsqueda por cédula y nombre, filtros por sede y estado, paginación.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| search | Texto libre | "Juan" | - | - |
| sedeId | UUID existente | uid-sede-1 | No existe | uid-xxx |
| estado | Enum válido | ACTIVO | No válido | BLOQUEADO |
| page | Entero positivo | 1, 2 | 0, -1, no numérico | 0, abc |
| limit | Entero 1-100 | 10, 50 | 0, 200, no numérico | 0, 201 |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| page | int | 1 | ∞ | 0 | - |
| limit | int | 1 | 100 | 0 | 101 |

## Tabla de Decisiones
### Búsqueda
| search | sedeId | estado | Acción |
|--------|--------|--------|--------|
| presente | presente | presente | Filtra por los tres |
| presente | null | null | Filtra solo por search |
| null | presente | null | Filtra solo por sede |
| null | null | presente | Filtra solo por estado |
| null | null | null | Retorna todos (paginado) |

## Cobertura de Ramas
### Ruta: GET /api/clientes
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Sin filtros | GET /clientes | 200 lista paginada |
| 2 | search | ?search=Juan | 200 lista filtrada |
| 3 | sedeId | ?sedeId=uid | 200 lista por sede |
| 4 | estado | ?estado=ACTIVO | 200 lista por estado |
| 5 | page/limit | ?page=2&limit=10 | 200 segunda página |
| 6 | limit inválido | ?limit=0 | Error (no controlado) |
| 7 | limit excesivo | ?limit=201 | Error (no controlado) |
| 8 | page inválido | ?page=-1 | Error (no controlado) |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| search | string | no | - | 0-200 | texto libre |
| sedeId | string | no | - | 1-36 | UUID |
| estado | string | no | - | - | NUEVO, ACTIVO, SUSPENDIDO, RETIRADO, INACTIVO |
| page | int | no | - | ≥1 | entero positivo |
| limit | int | no | - | 1-100 | entero 1-100 |

## Gaps vs código actual
- `src/routes/clientes.ts:11-23` no valida `page` ni `limit` (puede recibir 0, negativos o NaN).
- `src/routes/clientes.ts:19-20` `parseInt` sin validación de NaN.
- `src/routes/clientes.ts` no valida `estado` contra enum.
- `src/routes/clientes.ts` no valida `sedeId` como UUID válido.
- `src/services/cliente.service.ts:58-59` `page` default 1, pero si se pasa 0 o negativo, `skip` será negativo.
