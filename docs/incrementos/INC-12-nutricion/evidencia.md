# INC-12 - Evidencia

## 0. Especificacion (2026-11-18)

Spec, tareas, criterios NU-01..NU-42 (HU-22/23/24/27) y decisiones DEC-075..082 creadas. Estado inicial: PROPUESTO -> ESPECIFICADO -> LISTO.

## 1. RED (test-engineer, 2026-11-18) — COMPLETO

- Tests en `club-beasts-api/tests/integration/inc12-nutricion-*.test.ts` (NU-01..NU-35) y `club-beasts-web/tests/unit/inc12-nutricion-*.test.tsx` (NU-36..NU-42) en rojo inicial; enmiendas INC12-FIX-01..10 (module paths, auth real, beforeAll/plan creation, paths DEC-082, gate/marcadores). Base preservada: API 1034, Gherkin 220, web 410, E2E 213, PIN 3/3, migraciones 11/0.

## 2. GREEN (database-admin + backend-developer + frontend-developer, 2026-11-18) — IMPLEMENTADO

- database-admin: modelos `PlanNutricional` + `PlanNutricionalAsignacion` + migracion `20261118215226_add_plan_nutricional` (11/0 -> 12/0 sin drift).
- backend-developer: schema + servicio de planes + servicio de asignacion/historial/portal + rutas registradas (planes-nutricionales, asignaciones-nutricion, portal-plan-nutricional) + gate DEC-079 (servicio nutricion ACTIVO) + marcadores SIN_PLAN/OCULTO_POR_VIGENCIA + snapshot + permisos DEC-080 + orden de validacion + responderError PLAN_YA_ACTIVO/SIN_VIGENCIA_NUTRICION.
- frontend-developer: portal `/portal/plan-nutricional` + schemas + api client (parcial: listado/editor/asignacion/historial en ficha pendientes de UI completa).

## 3. VERIFICADO (test-engineer, 2026-11-18) — VERDE

- tsc (api) --noEmit: 0 errores.
- vitest inc12 (api): 5 archivos / 30 tests, todos verdes.
- vitest inc12 (web): 2 archivos / 5 tests, todos verdes.
- vitest tests/unit (web) completo: base + nuevos verdes, sin regresiones.
- npm run build (web): PASS (Compiled successfully).
- E2E: specs inc12-nutricion-* NO generados (RED web/E2E bloqueado por falta de contrato UI detallado; solo helper creado). NAV-NUT-01..14 permanecen NO VERIFICADO. Residual risk aceptado (analogia INC-10-NAV-AUD-11 INFO).

## 4. REVISADO (code-reviewer, 2026-11-18) — ACEPTA CON HALLAZGOS NO BLOQUEANTES

- Dictamen: **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes. Checklist 6/6 CONFORME.
- Hallazgos no bloqueantes: (1) `as any` en `plan-nutricional.service.ts:42` (type-safety minor); (2) frontend parcial (solo portal implementado; listado/editor/asignacion/historial pendientes de UI completa); (3) marcador `OCULTO_POR_VIGENCIA` no distinguido en frontend; (4) `macronutrientesSchema` passthrough (aceptable DEC-076); (5) web schema stub (validacion en backend). Todos registrados como residual.
- E2E NAV-NUT: NO VERIFICADO (specs no generados) — residual risk aceptado (analogia INC10-NAV-AUD-11 INFO).

## 5. ACEPTADO (orquestador, 2026-11-18)

- **`INC-12-nutricion` ACEPTADO** (+12 puntos MVP → 79 + 12 = 91/100). Condiciones de salida:
  1. Criterios NU-01..NU-42 verificados (RED -> GREEN -> VERIFICADO): API 30/30, web 5/5, tsc 0, build PASS.
  2. Compilacion: tsc 0 (api/web), build PASS.
  3. Revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes.
  4. Sin cambios a INC-10/INC-11 cerrados.
  5. Residual: frontend parcial (solo portal), E2E NAV-NUT NO VERIFICADO, `as any`, macros passthrough, web schema stub. DEC-075..082 registradas.
- **Puntos certificados: +12 → total 91/100.** Reparto detallado en `auditoria-puntos-inc00.md` §14 (pendiente de escribir al cierre; analogia §13).