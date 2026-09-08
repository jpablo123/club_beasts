# Sprint 1 - Setup + Auth + Clientes (15%)

**Periodo**: 7-18 Sep 2026
**Estado**: ✅ Completado

## Objetivo
Frontend funcional con login, gestión de clientes y ficha única.

## Checklist

### Setup
- [x] Next.js 15 + TypeScript + Tailwind CSS
- [x] Estructura de directorios
- [x] API client para comunicar con el backend
- [x] Variables de entorno
- [x] NextAuth v5 configurado
- [x] Playwright configurado

### Páginas
- [x] Home page (/)
- [x] Login dueño/recepcionista (/login)
- [x] Login cliente (/login-cliente)
- [x] Dashboard del dueño (/dashboard)
- [x] Portal del cliente (/portal)
- [x] Lista de clientes (/clientes)
- [x] Nuevo cliente (/clientes/nuevo)
- [x] Ficha del cliente (/clientes/[id])

### Autenticación
- [x] NextAuth v5 con JWT
- [x] Middleware de protección de rutas
- [x] Login con redirección según rol
- [x] Logout funcional

### Tests
- [x] Tests e2e auth (5 tests)
- [x] Tests e2e clientes (3 tests)
- [x] Playwright con Chromium

## Pendiente para Fase 2
- [ ] Dashboard con métricas reales
- [ ] Módulo de rutinas
- [ ] Módulo de nutrición
- [ ] Gestión de vigencias
- [ ] Recepción y control de ingreso

## Notas
- API URL: http://localhost:3001
- Frontend URL: http://localhost:3000
- Build estático para páginas simples, dinámico para datos
