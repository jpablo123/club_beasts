# Fase 2 — Recuperación de sesión + Membresía gym básica

> Nota de control: el incremento 15% → 20% queda pendiente de certificacion por criterios. Desde 2026-10-05 el avance aceptado del MVP se mide en `docs/producto/mvp.md` y `docs/producto/avance.md`. Las brechas de cierre de esta fase se gestionan en `docs/incrementos/INC-00-estabilizacion-fases-1-2/`.

## Objetivo del incremento
**15% → 20%** (pendiente de validación con ponderación acordada del MVP)

- Corregir la recuperación de sesión cuando vence el token de la API.
- Entregar membresías gym básicas: registro y consulta de períodos por cliente.
- Cerrar bloqueos de autorización y privacidad heredados.

## Decisiones de producto aprobadas

| Decisión | Acuerdo |
|---|---|
| Operadores de membresías | Dueño y recepción |
| Vigencia | Por días completos, zona America/Bogota |
| Inclusión de extremos | Día de inicio y día de fin incluidos |
| Período mínimo | Un día |
| Renovación | Nuevo período (conservar anteriores) |
| Solapamientos | Rechazados; gaps permitidos |
| Token API | TTL 24h absoluto, sin refresh |
| Recuperación | Nuevo login, no refresh transparente |

## Diagnóstico de sesión (token vencido)

### Problema
- El JWT de la API vence a las 24 horas.
- NextAuth conserva el token sin comprobar su caducidad.
- El cliente HTTP convierte el 401 en un error genérico.
- Las pantallas reaccionan de forma inconsistente: algunas ocultan el error, otras reemplazan el contenido completo.

### Causa raíz
Desacoplamiento entre la sesión de NextAuth (sin vencimiento explícito del token externo) y el JWT de la API (absoluto). No hay mecanismo de renovación del token.

### Solución
1. **Contrato de errores diferenciados:** `AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_MISSING`, `AUTH_TOKEN_INVALID`, `AUTH_INVALID_CREDENTIALS`, `AUTH_FORBIDDEN`.
2. **Campo `tokenExpiresAt`:** ambos logins devuelven el `exp` del JWT en segundos Unix.
3. **Callbacks jwt/session:** almacenar y exponer `apiTokenExpiresAt`; no renovar el JWT externo al renovar la sesión de NextAuth.
4. **Coordinador de recuperación:** cerrar sesión ante 401 de token vencido, limpiar datos privados, mostrar mensaje claro y dirigir al login correcto.
5. **Protección de rutas:** corregir el middleware para que las rutas públicas no sean todas las rutas.

### Mensaje de usuario
> Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar. Al regresar, revisa los datos antes de volver a guardar.

### Contrato mínimo API

```json
{
  "error": "Tu sesión venció por seguridad. Inicia sesión de nuevo para continuar.",
  "code": "AUTH_TOKEN_EXPIRED"
}
```

| Escenario | HTTP | Código |
|---|---|---|
| JWT vencido | 401 | AUTH_TOKEN_EXPIRED |
| Sin token | 401 | AUTH_TOKEN_MISSING |
| JWT inválido | 401 | AUTH_TOKEN_INVALID |
| Credenciales incorrectas (login) | 401 | AUTH_INVALID_CREDENTIALS |
| Sin permiso | 403 | AUTH_FORBIDDEN |

## Modelo de datos — Membresías

### MembresiaGym
| Campo | Tipo | Descripción |
|---|---|---|
| id | CUID | Identificador único |
| clienteId | FK → Cliente | Cliente dueño del período |
| fechaInicio | String (YYYY-MM-DD) | Inicio del período |
| fechaFin | String (YYYY-MM-DD) | Fin del período (inclusivo) |
| creadoPorId | FK → User | Quién creó el registro |
| actualizadoPorId | FK → User | Último editor |
| createdAt | DateTime | Instante de creación |
| updatedAt | DateTime | Instante de última modificación |
| version | Int | Control de concurrencia optimista |

### MembresiaGymCambio (Auditoría)
| Campo | Tipo | Descripción |
|---|---|---|
| id | CUID | Identificador único |
| membresiaId | FK → MembresiaGym | Período auditado |
| actorId | FK → User | Quién realizó la acción |
| accion | String | CREACION o EDICION |
| version | Int | Versión del cambio |
| fechaInicioAnterior | String? | Valor anterior (null en creación) |
| fechaFinAnterior | String? | Valor anterior (null en creación) |
| fechaInicioNueva | String | Valor nuevo |
| fechaFinNueva | String | Valor nuevo |
| createdAt | DateTime | Instante del cambio |

## Criterios de aceptación

### Sessión
1. Token vencido → 401 con código AUTH_TOKEN_EXPIRED → recuperación centralizada → login correcto → retorno a pantalla original.
2. Token ausente/inválido → 401 con código correspondiente → recuperación o error apropiado.
3. Credenciales incorrectas en login → 401 AUTH_INVALID_CREDENTIALS → error en formulario, sin logout general.
4. 403 → sesión conservada, mensaje de permiso insuficiente.
5. Error de red → sesión conservada, mensaje de indisponibilidad, opción de reintentar.
6. Un solo 401 produce una sola recuperación, incluso con múltiples peticiones simultáneas.
7. Un 401 tardío de una sesión anterior no cierra la sesión nueva.

### Membresías
1. Dueño y recepción registran un período de gym con fechas inicio/fin.
2. La ficha del cliente muestra el estado: sin membresía, programada, activa o vencida.
3. Dueño y recepción editan fechas de un período activo o futuro, conservando trazabilidad.
4. Renovación crea un nuevo período; los anteriores se conservan.
5. Solapamientos de fechas se rechazan con 409 MEMBRESIA_SOLAPADA.
6. Edición con versión desactualizada se rechaza con 409 MEMBRESIA_CONFLICTO.
7. Fechas inválidas o fin anterior a inicio se rechazan con 400.
8. Auditoría registra actor, acción, versiones y fechas anteriores/nuevas en cada operación.
9. Cliente autenticado no puede listar/crear/editar membresías ajenas (403).
10. Hash del PIN nunca aparece en respuestas de clientes o membresías.

## Backlog priorizado

| # | Tarea | Responsable | Estado |
|---|---|---|---|
| 1 | Crear fase2.md | acceptance-criteria-analyst | Completado |
| 2 | Actualizar esquema Prisma (MembresiaGym + Cambio) | database-admin | Completado |
| 3 | Generar migración aditiva | database-admin | Completado |
| 4 | Auth plugin: códigos de error diferenciados | backend-developer | Completado |
| 5 | Auth routes: tokenExpiresAt en login | backend-developer | Completado |
| 6 | Cliente routes: autorización por roles | backend-developer | Completado |
| 7 | Cliente service: excluir PIN de respuestas | backend-developer | Completado |
| 8 | Membresia schema: validaciones Zod | backend-developer | Completado |
| 9 | Membresia service: lógica de negocio | backend-developer | Completado |
| 10 | Membresia routes: endpoints API | backend-developer | Completado |
| 11 | Frontend types: extender JWT/Session | frontend-developer | Completado |
| 12 | Frontend auth: caducidad y errores | frontend-developer | Completado |
| 13 | Frontend api: clasificación de errores | frontend-developer | Completado |
| 14 | Frontend middleware: rutas reales | frontend-developer | Completado |
| 15 | Frontend providers: recuperación de sesión | frontend-developer | Completado |
| 16 | Frontend ficha: sección de membresías | frontend-developer | Completado |
| 17 | Tests unitarios: auth + membresías | test-engineer | Pendiente |
| 18 | Verificación: tsc + vitest + build | todos | Pendiente |

## Comandos de verificación (futuros)

| Comando | Qué valida |
|---|---|
| `npx prisma validate` | Schema Prisma válido |
| `npx tsc --noEmit` (API) | Compilación TypeScript backend |
| `npm run test:run` (API) | Tests unitarios e integración backend |
| `npx tsc --noEmit` (WEB) | Compilación TypeScript frontend |
| `npm run test:run` (WEB) | Tests unitarios frontend |
| `npm run build` (WEB) | Build de producción Next.js |

## Verificación ejecutada

| Comando | Resultado |
|---|---|
| `npx prisma validate` | ✅ Schema válido |
| `npx prisma generate` | ✅ Cliente Prisma generado |
| `npx tsc --noEmit` (API) | ✅ 0 errores |
| `npx vitest run tests/unit/` (API) | ✅ 129 tests pasaron |
| `npx tsc --noEmit` (WEB) | ✅ 0 errores |
| `npx vitest run tests/unit/` (WEB) | ✅ 26 tests pasaron |

**Total: 155 tests pasando, 0 errores de compilación.**

## Cierre de fase

### Completado
- [x] Documentación fase2.md
- [x] Modelo de datos MembresiaGym + Cambio
- [x] Migración aditiva
- [x] Contrato de errores de autenticación
- [x] TokenExpiresAt en login
- [x] Autorización por roles en API
- [x] Exclusión de PIN en respuestas
- [x] Validaciones Zod membresías
- [x] Servicio de membresías
- [x] Rutas API membresías
- [x] Recuperación de sesión frontend
- [x] Clasificación de errores frontend
- [x] Corrección de middleware
- [x] Sección de membresías en ficha
- [x] Tests unitarios backend (129)
- [x] Tests unitarios frontend (26)
- [x] Verificación de compilación completa

### Pendiente
- [ ] E2E con Playwright (requiere backend + frontend corriendo)
- [ ] Ponderación del MVP y cálculo real del porcentaje
- [ ] Aislamiento de BD de pruebas vs desarrollo

## Mejoras para el siguiente incremento

1. Aislar BD de pruebas de la BD de desarrollo.
2. Conectar Gherkin real a los comandos de test.
3. E2E con backend y frontend aislados.
4. Eliminar aserciones vacías y pasos opcionales en tests existentes.
5. Preparar despliegue con PostgreSQL y variables de entorno seguras.
