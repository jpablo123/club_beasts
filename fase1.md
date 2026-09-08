# Fase 1 - Setup + Auth + Clientes (15% de la app)

## Objetivo
Setup completo de ambos repos, autenticación para los 3 roles y gestión básica de clientes con ficha única.

## HU incluidas
| # | HU | Descripción | Prioridad |
|---|-----|-------------|-----------|
| 1 | Setup | Repos, tooling, Prisma, DB | - |
| 2 | HU-01 | Login dueño/recepcionista | Alta |
| 3 | HU-02 | Login cliente (cédula+PIN) | Alta |
| 4 | HU-03 | Restablecimiento de PIN | Media |
| 5 | HU-04 | Creación de cliente | Alta |
| 6 | HU-05 | Edición de cliente | Alta |
| 7 | HU-06 | Búsqueda y filtros | Alta |
| 8 | HU-07 | Ficha única básica | Alta |

## Modelos Prisma

### Sede
- id (cuid)
- nombre
- direccion (opcional)
- relacion: clientes[]

### User
- id (cuid)
- email (unique)
- contrasena (bcrypt hash)
- nombre
- rol (DUENO | RECEPCIONISTA)
- createdAt

### Cliente
- id (cuid)
- cedula (unique)
- nombres
- apellidos
- telefono
- email (opcional)
- sedeId → Sede
- pin (hash PIN 4 dígitos)
- estado (NUEVO | ACTIVO | SUSPENDIDO | RETIRADO | INACTIVO)
- observaciones (opcional)
- createdAt, updatedAt

## Orden de implementación

### Sprint 1.1 (Días 1-5)
1. Crear repo `club-beasts-api`
   - Init Fastify + TypeScript
   - Config Prisma + PostgreSQL local
   - Migración inicial
   - Plugin de auth (JWT)
   - Rutas: POST /auth/login (dueño/recepcionista), POST /auth/login-cliente
   - POST /auth/reset-pin
   - Tests unitarios de auth

2. Crear repo `club-beasts-web`
   - Init Next.js 15 + Tailwind
   - Config NextAuth v5
   - Pages: /login, /login-cliente
   - API client generado del backend
   - Tests e2e básicos de login

### Sprint 1.2 (Días 6-10)
3. CRUD Clientes (backend)
   - POST /clientes (crear)
   - PATCH /clientes/:id (editar)
   - GET /clientes (buscar + filtros por sede/estado)
   - GET /clientes/:id (ficha básica)
   - Tests de integración

4. CRUD Clientes (frontend)
   - Pages: /clientes, /clientes/nuevo, /clientes/:id
   - Componentes: ClientList, ClientForm, ClientSheet
   - Tests e2e

5. Features Gherkin
   - auth.feature
   - clientes.feature

## Criterios de salida
- [ ] Ambos repos funcionando
- [ ] Prisma schema con migraciones
- [ ] Login de los 3 roles
- [ ] CRUD clientes completo
- [ ] Búsqueda por cédula/nombre + filtros sede/estado
- [ ] Ficha única con datos básicos
- [ ] Tests unitarios e integración pasando
- [ ] 1+ test e2e con Playwright
- [ ] Features Gherkin escritos
