# Sprint 1 - Setup + Auth + Clientes (15%)

**Periodo**: 7-18 Sep 2026
**Estado**: ✅ Completado

## Objetivo
Setup completo del backend, autenticación para los 3 roles y gestión básica de clientes con ficha única.

## Checklist

### Backend (club-beasts-api)
- [x] Setup Fastify + TypeScript
- [x] Prisma schema con SQLite
- [x] Migración inicial
- [x] Plugin de autenticación (JWT)
- [x] Ruta POST /auth/login (dueño/recepcionista)
- [x] Ruta POST /auth/login-cliente (cédula+PIN)
- [x] Ruta POST /auth/reset-pin
- [x] CRUD de clientes (crear, editar, buscar, ficha)
- [x] Tests de integración (4 tests pasando ✓)
- [x] Features Gherkin (auth.feature, clientes.feature)
- [x] Seed con sedes y admin por defecto

### Frontend (club-beasts-web)
- [x] Setup Next.js 15 + Tailwind
- [x] NextAuth v5 configurado
- [x] Middleware de protección de rutas
- [x] Página de login (dueño/recepcionista)
- [x] Página de login cliente (cédula+PIN)
- [x] Dashboard del dueño
- [x] Portal del cliente
- [x] Lista de clientes con búsqueda y filtros
- [x] Formulario de nuevo cliente
- [x] Ficha única del cliente (ver/editar)
- [x] Build exitoso ✓

### Tests
- [x] Tests de integración backend (4 tests) ✓
- [x] Tests e2e auth (5 tests en auth.spec.ts)
- [x] Tests e2e clientes (3 tests en clientes.spec.ts)
- [x] Playwright configurado con Chromium

## Criterios de salida
- [x] Ambos repos funcionando
- [x] Prisma schema con migraciones
- [x] Login de los 3 roles
- [x] CRUD clientes completo
- [x] Búsqueda por cédula/nombre + filtros sede/estado
- [x] Ficha única con datos básicos
- [x] Tests unitarios e integración pasando
- [x] Tests e2e con Playwright
- [x] Features Gherkin escritos

## Notas
- SQLite para desarrollo, PostgreSQL para producción
- PIN por defecto: "1234" (hash bcrypt)
- Admin por defecto: admin@clubbeasts.com / admin123
- Sedes: "sede-1" (Principal), "sede-2" (Secundaria)
- NEXTAUTH_SECRET configurado en .env.local
