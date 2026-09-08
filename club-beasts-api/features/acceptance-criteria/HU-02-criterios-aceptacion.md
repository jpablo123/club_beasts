# Criterios de Aceptación - HU-02: Inicio de sesión del cliente con cédula y PIN

## Resumen
Inicio de sesión de cliente con cédula colombiana y PIN de 4 dígitos para acceder a su portal personal.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| cedula | Numérica 6-10 dígitos, registrada | 1234567890 | No numérica, fuera de rango, no registrada | ABC, 123, 12345678901 |
| pin | 4 dígitos, coincide con el hash del cliente | 1234 | No 4 dígitos, incorrecto | 12, abcd, 9999 (si no coincide) |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| cedula (dígitos) | num | 6 | 10 | 5 | 11 |
| pin (dígitos) | num | 4 | 4 | 3 | 5 |

## Tabla de Decisiones
### Acceso de cliente
| cedula válida | cliente existe | pin correcto | Acción |
|---------------|---------------|--------------|--------|
| true | true | true | Login exitoso + JWT CLIENTE |
| true | true | false | 401 Cédula o PIN inválido |
| true | false | * | 401 Cédula o PIN inválido |
| false | * | * | 400 Formato de cédula inválido |

## Transiciones de Estado
No aplica (solo autenticación).

## Cobertura de Ramas
### Ruta: POST /api/auth/login-cliente
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | cedula válida + pin 4 dígitos correcto | 200 + token + cliente |
| 2 | cedula faltante | solo pin | 400 Cédula y PIN requeridos |
| 3 | pin faltante | solo cedula | 400 Cédula y PIN requeridos |
| 4 | pin no numérico de 4 | cedula + "12" | 400 PIN debe ser de 4 dígitos |
| 5 | pin largo | cedula + "12345" | 400 PIN debe ser de 4 dígitos |
| 6 | cliente inexistente | cedula válida no registrada + pin | 401 Cédula o PIN inválido |
| 7 | pin incorrecto | cedula válida + pin incorrecto | 401 Cédula o PIN inválido |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| cedula | string | sí | /^\d{6,10}$/ | 6-10 | solo dígitos |
| pin | string | sí | /^\d{4}$/ | 4 | solo 4 dígitos |

## Gaps vs código actual
- `src/routes/auth.ts:22` no valida formato de cédula (solo truthiness). Línea 24 solo verifica presencia.
- `src/routes/auth.ts:28` valida pin con regex correcta.
- `src/services/auth.service.ts:14-26` busca cliente por `cedula` usando `findUnique`, pero no valida formato; si el body trae string no numérico Prisma podría no encontrarlo y devolver 401 genérico.
