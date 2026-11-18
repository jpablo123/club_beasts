# INC-11 - Evidencia

## 0. Especificacion (2026-11-18)

Spec, tareas y decisiones DEC-071..074 creadas. Estado inicial: ESPECIFICADO -> LISTO.

## 1. RED (test-engineer, 2026-11-18) — COMPLETO

- Tests en `club-beasts-web/tests/unit/ux-anamnesis-*.test.tsx` (UX-01..UX-04) en rojo inicial; enmiendas INC11-FIX-01..07 (pragmas jsdom, imports vitest, jest-dom inexistente removido, mock next/navigation, fixture poblado en ux03, labels/hints alineados a ETIQUETAS_CAMPOS/HINTS_CAMPOS, hint duplicado resuelto con getAllByText). Base 401/401 preservada; nuevos tests se suman por encima.

## 2. GREEN (frontend-developer, 2026-11-18) — IMPLEMENTADO

- UX-01: 5 ocurrencias `font-oswald` -> `font-display` (AnamnesisSection, AnamnesisVista, AnamnesisEditor, MembershipSection x2). 0 ocurrencias restantes.
- UX-02: hints de la Enmienda DEC-072 en `HINTS_CAMPOS` (25 campos) renderizados en AnamnesisEditor.
- UX-03: aviso "Informacion confidencial" por presencia de clave en los 5 sensibles (DEC-055), en editor y vista (render por clave, no por rol — NAV-AN-07 intacto).
- UX-04: hint + senalamiento inline en condicionales #12 y #18b; limpieza al pasar a NO (C3) conservada; guarda AN-26 (DEC-061) intacta.
- Archivos: `anamnesis-campos.ts`, `AnamnesisEditor.tsx`, `AnamnesisVista.tsx`, `MembershipSection.tsx`.

## 3. VERIFICADO (test-engineer, 2026-11-18) — VERDE COMPLETA

- tsc --noEmit: 0 errores (log `inc11-enmienda5-tsc.log`).
- vitest `ux-anamnesis`: 4 archivos / 9 tests, todos verdes (log `inc11-enmienda7-unit.log`).
- vitest `tests/unit` completo: base 401 + 9 nuevos verdes, sin regresiones (reportado en enmiendas).
- npm run build: PASS (log `inc11-enmienda7-build.log`).
- E2E: `npx playwright test` de anamnesis + pin = 12/12 passed, exit 0 (log `%TEMP%\opencode\inc11-final-pw.log`): cambio-pin-obligatorio 3/3, inc09-anamnesis-portal 5/5, inc09-anamnesis-staff 4/4 (NAV-AN-07 DUENO 23/23, RECEPCIONISTA 19/23, NAV-AN-08, NAV-F-04).

## 4. REVISADO (code-reviewer, 2026-11-18) — ACEPTA

- Dictamen: **ACEPTA**, 0 hallazgos bloqueantes y 0 no bloqueantes. Checklist 6/6 CONFORME.
- Verificaciones: UX-01 (0 `font-oswald`, 5 `font-display`), UX-02 (paridad 9/9), UX-03 (aviso por clave en editor:vista, 2 matches, no por rol), UX-04 (2/2), sin regresiones (tsc 0, vitest 9/9, build PASS, E2E 12/12), seguridad/privacidad/a11y OK, NAV-AN-07 intacto.

## 5. ACEPTADO (orquestador, 2026-11-18)

- **`INC-11-ux-anamnesis` ACEPTADO** (0 puntos MVP). Condiciones de salida cumplidas:
  1. Criterios UX-01..UX-04 verificados (RED 9 tests -> GREEN -> VERIFICADO).
  2. Compilacion: tsc 0, build PASS.
  3. E2E real: 12/12 (cambio-pin-obligatorio 3/3, inc09-anamnesis-portal 5/5, inc09-anamnesis-staff 4/4).
  4. Revision `code-reviewer` **ACEPTA**, 0 bloqueantes.
  5. Navegacion: NO APLICABLE justificado (sin rutas/links nuevos); regresion cubierta por E2E completo (PIN, NAV-AN-07, gates DEC-060).
  6. Sin puntos certificados (UX no certifica puntos MVP; precedente INC-08). DEC-071..074 registradas; Anexo DEC-052 enmendado (labels/hints).
- Riesgos residuales: ninguno bloqueante. Warning de workspace root (lockfiles multiples) informativo.