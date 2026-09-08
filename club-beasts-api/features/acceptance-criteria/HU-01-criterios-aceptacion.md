# Criterios de Aceptación - HU-01: Inicio de sesión del dueño y recepcionista

## Resumen
Inicio de sesión de usuario interno (DUENO / RECEPCIONISTA) con email y contraseña para acceder al sistema según el rol.

## Partición de Equivalencia
| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| email | Email con formato correcto y registrado | admin@club.com | Email no registrado o formato inválido | unknown@x.com, text |
| password | Contraseña válida para el email | 123456 | Contraseña incorrecta | incorrecta |

## Análisis de Valores Límite
| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| email | string | 1 | 254 | vacío | >254 |
| password | string | 1 | 128 | vacío | >128 |

## Tabla de Decisiones
### Acceso por credenciales
| email existe | password correcto | Acción |
|--------------|-------------------|--------|
| true | true | Login exitoso + JWT con id, email, nombre, rol |
| true | false | 401 Credenciales inválidas |
| false | * | 401 Credenciales inválidas |

## Cobertura de Ramas
### Ruta: POST /api/auth/login
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path | email + password válidos | 200 + token + user |
| 2 | email faltante | password enviado | 400 Email y contraseña requeridos |
| 3 | password faltante | email enviado | 400 Email y contraseña requeridos |
| 4 | email no registrado | email inexistente | 401 Credenciales inválidas |
| 5 | password incorrecto | email válido + password incorrecto | 401 Credenciales inválidas |

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Regex | Longitud | Valores Permitidos |
|-------|------|-----------|-------|----------|-------------------|
| email | string | sí | /^[^\s@]+@[^\s@]+\.[^\s@]+$/ | 1-254 | - |
| password | string | sí | - | 1-128 | - |

## Gaps vs código actual (líneas exactas)
- `src/routes/auth.ts:6-10` usa `request.body as` y solo verifica truthiness, sin formato de email ni longitud.
- `src/routes/auth.ts:8-10` retorna 400 genérico sin discriminar campo faltante.
- `src/services/auth.service.ts:4-11` no valida formato de email (confía en Prisma/UNIQUE).
