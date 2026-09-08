# Criterios de Aceptación - HU-04: Creación de cliente básico

## Resumen
Creación de cliente con cédula, nombre completo, teléfono y sede principal. La cédula es única. Se asigna estado inicial NUEVO y se registra trazabilidad.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| cedula | 6-10 dígitos, única | 1234567890 | Duplicada, no numérica, fuera de rango | 1234567890, ABC, 123 |
| nombres | Solo letras, 1-100 | Juan Carlos | Vacío, números | "", Juan123 |
| apellidos | Solo letras, 1-100 | Pérez Gómez | Vacío, números | "", Perez1 |
| telefono | Móvil CO 3XXXXXXXXX | 3101234567 | No móvil, vacío | 2101234567, abc |
| email | Formato válido o vacío | a@b.com | Formato inválido | abc, @x.com |
| sedeId | UUID existente | uid-sede-1 | No existe | uid-xxx |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| cedula (dígitos) | num | 6 | 10 | 5 | 11 |
| nombres | string | 1 | 100 | 0 | 101 |
| apellidos | string | 1 | 100 | 0 | 101 |
| telefono | string | 10 | 10 | 9 | 11 |
| email | string | 0 | 254 | - | >254 |

## Tabla de Decisiones
### Creación de cliente
| cedula válida | cedula única | campos ok | sede existe | Acción |
|---------------|-------------|-----------|------------|--------|
| true | true | true | true | 201 cliente creado con estado NUEVO |
| true | false | * | * | 409 Ya existe un cliente con esa cédula |
| false | * | * | * | 400 Formato de cédula inválido |
| * | * | false | * | 400 Campos requeridos faltantes |
| * | * | true | false | Error (no controlado actualmente) |

## Transiciones de Estado
### Cliente
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| - (creación) | Creación | NUEVO | Sí |

## Cobertura de Ramas
### Ruta: POST /api/clientes
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | datos válidos completos | 201 cliente |
| 2 | cedula faltante | sin cedula | 400 Campos requeridos |
| 3 | nombres faltante | sin nombres | 400 Campos requeridos |
| 4 | apellidos faltante | sin apellidos | 400 Campos requeridos |
| 5 | telefono faltante | sin telefono | 400 Campos requeridos |
| 6 | sedeId faltante | sin sedeId | 400 Campos requeridos |
| 7 | cedula duplicada | cedula ya existente | 409 Ya existe un cliente con esa cédula |
| 8 | cedula inválida | "ABC" | 400 (falta validación formato) |
| 9 | telefono inválido | "2101234567" | 201 (falta validación formato) |
| 10 | email inválido | "abc" | 201 (falta validación formato) |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| cedula | string | sí | /^\d{6,10}$/ | 6-10 | numérico |
| nombres | string | sí | /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/ | 1-100 | solo letras |
| apellidos | string | sí | /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/ | 1-100 | solo letras |
| telefono | string | sí | /^3\d{9}$/ | 10 | móvil colombiano |
| email | string | no | /^[^\s@]+@[^\s@]+\.[^\s@]+$/ | 0-254 | formato email |
| sedeId | string | sí | - | 1-36 | UUID |
| observaciones | string | no | - | 0-500 | texto libre |

## Gaps vs código actual
- `src/routes/clientes.ts:38-39` solo verifica presencia, sin regex de cédula, teléfono, nombres ni apellidos.
- `src/routes/clientes.ts:43` permite `email` con formato inválido.
- `src/routes/clientes.ts:35` usa `as any`, sin schema de validación.
- `src/routes/clientes.ts` no valida que `sedeId` exista en tabla Sede.
- `src/services/cliente.service.ts:25-34` asigna pin por defecto "1234" (posible riesgo si no se cambia después).
