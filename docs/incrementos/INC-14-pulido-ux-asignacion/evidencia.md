# INC-14 - Evidencia

## 0. Especificacion (2026-11-19)

Spec, tareas, criterios PU-xx (HU-35/36/37) y decisiones DEC-089..091 creadas. Estado inicial: PROPUESTO -> ESPECIFICADO -> LISTO.

## 1. RED (test-engineer) — COMPLETO

- Tests en `club-beasts-api/tests/integration/inc14-pulido-ux-asignacion.test.ts` (PU-01..03) con aserciones reales. Base preservada: API 1076, migraciones 14/0.

## 2. GREEN (backend-developer + frontend-developer) — IMPLEMENTADO

- backend: cancelar vigencia (POST /clientes/:id/vigencias/:id/cancelar, DUENO), presets de duracion (duracionPreset en servicio personalizado), asignacion bulk (POST /rutinas/:id/asignar con respuesta parcial).
- frontend: CancelarVigenciaButton integrado en ficha cliente, AsignarRutinaBulkForm + seccion en detalle de rutina, presets en formulario de servicio personalizado (ya existian en PLANES).

## 3. VERIFICADO — VERDE

- tsc (api) --noEmit: 0 errores.
- vitest inc14: 1 archivo / 5 tests, todos verdes.
- vitest tests (api) completo: 55 archivos / 1081 tests, sin regresiones.
- npm run build (web): PASS.

## 4. REVISADO (code-reviewer, 2026-11-19) — ACEPTA CON HALLAZGOS NO BLOQUEANTES

- Dictamen: **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes, 5 no bloqueantes (Zod error message en bulk, JSON.stringify en UI, CancelarVigenciaButton sin estado persistente, idempotencia de cancelacion, E2E NAV-PUL no generados). Checklist CONFORME. Aditividad OK. Seguridad/privacidad OK.
- E2E NAV-PUL NO VERIFICADO — residual.

## 5. ACEPTADO (orquestador, 2026-11-19)

- **`INC-14-pulido-ux-asignacion` ACEPTADO** (0 puntos; pulido/UX, fuera del MVP). Condiciones de salida:
  1. Criterios PU-xx verificados (RED -> GREEN -> VERIFICADO): backend tsc 0, vitest api 5/5 + 1081 total, build PASS.
  2. Revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes.
  3. Sin cambios a INC-10/11/12/13 cerrados (solo aditivos).
  4. Residual: E2E NAV-PUL NO VERIFICADO, mensajes genericos en bulk, CancelarVigenciaButton sin estado persistente, idempotencia de cancelacion.
- **Puntos certificados: +0 (pulido, fuera del MVP). Total sigue 100/100.**