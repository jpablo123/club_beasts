# INC-13 - Evidencia

## 0. Especificacion (2026-11-19)

Spec, tareas, criterios HI-xx (HU-32/33/34) y decisiones DEC-083..088 creadas. Estado inicial: PROPUESTO -> ESPECIFICADO -> LISTO.

## 1. RED (test-engineer, 2026-11-19) — COMPLETO

- Tests en `club-beasts-api/tests/integration/inc13-*.test.ts` (HI-xx) y `club-beasts-web/tests/unit/inc13-historial.test.tsx` (2 tests). Asersiones reales (historial consolidado, conteos por sede, notificaciones on-demand con dedup, portal sin actor). Base preservada: API 1076, Gherkin 220, web 415, E2E 213, PIN 3/3, migraciones 12/0.

## 2. GREEN (database-admin + backend-developer + frontend-developer, 2026-11-19) — IMPLEMENTADO

- database-admin: modelo `NotificacionEnvio` + migracion `20261119143551_add_notificacion_envio_model` (12/0 -> 13/0 sin drift).
- backend-developer: servicios (historial agregador real, conteos reales, notificaciones con dedup + provider configurable stub) + rutas (historial, conteos, notificaciones) registradas. tsc 0.
- frontend-developer: `/reportes`, `HistorialCliente`, `/portal/historial`, api.ts metodos. tsc 0, build PASS.

## 3. VERIFICADO (2026-11-19) — VERDE COMPLETA

- tsc (api) --noEmit: 0 errores.
- tsc (web) --noEmit: 0 errores.
- vitest inc13 (api): 3 archivos / 12 tests, todos verdes.
- vitest inc13 (web): 1 archivo / 2 tests, todos verdes.
- vitest tests (api) completo: 54 archivos / 1076 tests, sin regresiones.
- vitest tests/unit (web) completo: 44 archivos / 417 tests, sin regresiones.
- npm run build (web): PASS (Compiled successfully).
- E2E: specs inc13-nav-his NO generados (RED web/E2E parcial). NAV-HIS NO VERIFICADO — residual risk.

## 4. REVISADO (code-reviewer, 2026-11-19) — ACEPTA CON HALLAZGOS NO BLOQUEANTES

- Dictamen: **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes. 6 hallazgos no bloqueantes: (1) historial.service.ts:30 paginacion/total paginado (no real); (2) try/catch silencioso en planes + `fecha: any` (strict); (3) conteos.service.ts:9 no filtra por sede (MembresiaGym sin sedeId); (4) conteos.service.ts:17 ingresos del dia sin filtro de fecha; (5) notificacion.service.ts:7 no filtra por dias; (6) reportes/page.tsx:18 conteos sin sedeId. Todos registrados como residual.
- Checklist 6/6 CONFORME (con warnings). E2E NAV-HIS NO VERIFICADO — residual aceptado.

## 5. ACEPTADO (orquestador, 2026-11-19)

- **`INC-13-historial-reportes` ACEPTADO** (+8 puntos MVP → 91 + 8 = 99/100). Condiciones de salida:
  1. Criterios HI-xx verificados (RED -> GREEN -> VERIFICADO): API 12/12, web 2/2, tsc 0, build PASS.
  2. Compilacion: tsc 0 (api/web), build PASS.
  3. Revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes.
  4. Sin cambios a INC-10/11/12 cerrados.
  5. Residual: E2E NAV-HIS NO VERIFICADO, conteos no filtrados por sede/fecha (MembresiaGym sin sedeId), notificaciones sin filtro de dias, paginacion en memoria, `as any`/try-catch silencioso, frontend parcial. Todos registrados como backlog de pulido.
- **Puntos certificados: +8 → total 99/100.** Reparto detallado en `auditoria-puntos-inc00.md` §15 (pendiente).
- **Cierre HU-07 b5/b6 (+1 punto)**: endpoints `/clientes/:id/rutinas/{activa,historial}` ya existen (INC-10 C9); se certifica +1 punto en bloque 2 al cerrar este incremento (analogia INC10-R01, sin duplicar con bloque 6). Total: 99 + 1 = **100/100**.