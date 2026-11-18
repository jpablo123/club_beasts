# INC-11 - Tareas

Estado: **LISTO** (2026-11-18; puerta L1 cerrada). Pipeline: LISTO -> RED -> GREEN -> VERIFICADO -> REVISADO -> ACEPTADO.

## Puerta LISTO

- [x] L1 Orquestador: criterios UX-01..04 observables, decisiones DEC-071..074 registradas, alcance/no-goals/riesgos fijados, matriz navegacon NO APLICABLE justificada. **CERRADO 2026-11-18**.

## RED - test-engineer

- [ ] T1 Unit: grep/statico `font-oswald` = 0 (o test de clase), paridad label/hint vs Anexo, aviso por clave en 5 sensibles, hint + inline en #12/#18b.
- [ ] T2 E2E: regresion selectores de INC-09 (editor/vista) + NAV-AN-07 intacto.

## GREEN - frontend-developer

- [ ] T3 Tipografia: 5 ocurrencias `font-oswald` -> `font-display`.
- [ ] T4 Form UX: hints DEC-072, aviso confidencial DEC-073, condicionales DEC-074.

## VERIFICADO / REVISADO / Gestion

- [ ] T5 `test-engineer`: bateria completa (web unit + E2E + build + tsc) con logs.
- [ ] T6 `code-reviewer`: revision sin bloqueantes.
- [ ] T7 Orquestador: Anexo DEC-052 enmendado, evidencia y cierre.
