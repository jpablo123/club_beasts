# INC-14 - Tareas

Estado: LISTO (2026-11-19; puerta LISTO cerrada: criterios PU-xx, DEC-089..091, ratificacion R1/R2, matriz NAV-PULIDO). Pipeline: ESPECIFICADO -> LISTO -> RED -> GREEN -> VERIFICADO -> REVISADO -> ACEPTADO.

## ESPECIFICADO - acceptance-criteria-analyst

- [ ] A1 `acceptance-criteria-analyst` (Modo CREAR): criterios ISTQB + Gherkin + schemas para HU-35, HU-36, HU-37.
- [ ] A2 Orquestador: resolver decisiones pendientes (cancelar vs eliminar, bulk assign, presets) como DEC-089..091.

## Ratificacion de contratos (paralelo, solo analisis)

- [ ] R1 `backend-developer`: ratifica contrato API.
- [ ] R2 `frontend-developer`: ratifica contrato web.
- [ ] R3 Orquestador: incorpora correcciones y cierra puerta LISTO.

## RED - test-engineer

- [ ] T1 Tests API en rojo.
- [ ] T2 Tests web unit en rojo.
- [ ] T3 E2E en rojo.

## GREEN - backend-developer + frontend-developer

- [ ] T4 Backend: endpoints cancelar vigencia, asignar bulk, presets.
- [ ] T5 Frontend: botones y formularios.
- [ ] T6 Tests del RED en verde.

## VERIFICADO / REVISADO / Gestion

- [ ] T7 `test-engineer`: bateria + logs.
- [ ] T8 `code-reviewer`: revision sin bloqueantes.
- [ ] T9 Orquestador: evidencia y cierre.
