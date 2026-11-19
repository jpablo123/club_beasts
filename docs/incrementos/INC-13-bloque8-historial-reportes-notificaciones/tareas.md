# INC-13 - Tareas

Estado: PROPUESTO (2026-11-19). Pipeline: ESPECIFICADO (analista) -> decisiones PEND -> ratificacion de contratos -> LISTO -> RED -> GREEN -> VERIFICADO -> auditoria navegacion -> REVISADO -> ACEPTADO.

## Especificacion

- [ ] S1 `acceptance-criteria-analyst` (Modo CREAR): criterios BL8-xx/H7-xx + schemas + matriz NAV-BL8 (en curso).
- [ ] S2 Orquestador: formulacion de PENDs -> decisiones del Producto (una tanda) -> `decisiones.md` (DEC-083..).
- [ ] S3 Orquestador: spec con contratos API/frontend + puerta LISTO.

## Ratificacion de contratos

- [ ] R1 `backend-developer`: ratifica contrato API (historial agregado, conteos por sede, notificaciones/registro de envios, saldo HU-07 en ficha).
- [ ] R2 `frontend-developer`: ratifica contrato web (secciones de ficha restantes, pagina de conteos, matriz NAV-BL8, C7).

## RED - test-engineer

- [ ] T1 Re-medir base (API/Gherkin/web/E2E/migraciones/tsc/build).
- [ ] T2 Tests API en rojo BL8-xx + H7-xx.
- [ ] T3 Tests web unit en rojo.
- [ ] T4 E2E en rojo NAV-BL8.
- [ ] T5 Gherkin opcional (guard al alza) + calidad del rojo.

## GREEN

- [ ] T6 `database-admin`: modelos/migracion si aplica (11/0 -> 12/0).
- [ ] T7 `backend-developer`: endpoints + logica.
- [ ] T8 `frontend-developer`: ficha restante + reportes + notificaciones.
- [ ] T9 Tests del RED en verde sin tocar aserciones.

## VERIFICADO / Navegacion / REVISADO / Gestion

- [ ] T10 `test-engineer`: bateria x2 identicas + logs.
- [ ] T11 `ui-navigation-auditor`: NAV-BL8 por rol.
- [ ] T12 `code-reviewer`: revision sin bloqueantes.
- [ ] T13 Orquestador: reparto §15 (bloque 8 + saldo HU-07) -> **100/100**; `avance.md`/`mvp.md`.
