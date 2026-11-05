# INC-08 - Tareas

Estado: REVISADO en curso (2026-10-30). Pipeline: RED -> GREEN -> VERIFICADO -> auditoria navegacion -> REVISADO -> ACEPTADO.

## RED - test-engineer

- [x] T1 Re-medir base (API 658, Gherkin 220, web 204, E2E 94) al arranque y registrar en `evidencia.md` — **T1 identica a la esperada** (evidencia §2).
- [x] T2 Unit RED `INC08-NAV-01..03` — `inc08-logout-recepcion.test.tsx` 4 rojas.
- [x] T3 Unit RED `INC08-ED-01..03` — `inc08-edicion-estado.test.tsx` 3 rojas + 3 pines.
- [x] T4 E2E RED filas 1-7 — `inc08-logout-recepcion.spec.ts` 17 rojas + 1 PIN.
- [x] T5 E2E RED filas 8-9 — `inc08-edicion-estado.spec.ts` 4 rojas + 2 PIN.
- [x] T6 Inventario de enmiendas C4 — **0 enmiendas** (A1-A9; condicionales A5/A6 resueltos sin romper builder).
- [x] T7 Calidad del rojo verificada — 2 clases de fallo, 0 errores de sintaxis/fixtures.

## GREEN - frontend-developer

- [x] T8 Control "Salir" en `/recepcion` — `recepcion/page.tsx:61-80` (`signOut({ callbackUrl: "/" })`, fuera de `<nav>`, solo staff).
- [x] T9 Payload de edicion: `estado` solo cuando cambio — `clientes/[id]/page.tsx:90-99`.
- [x] T10 RED en verde sin tocar aserciones — 214/214; **INC08-FIX-01** (fixture fila 7, enmienda documentada) cierra los 2 rojos residuales -> 118/118.

## VERIFICADO - test-engineer

- [x] T11 Bateria completa x2 identicas — 16 logs (API 658/658, Gherkin 220/220, web 214/214, E2E 118/118 x2, build PASS, migraciones 9/0).
- [x] T12 Logs persistidos en `%TEMP%\opencode\inc08-verificado-run{1,2}-*.log`.

## Navegacion

- [x] T13 `ui-navigation-auditor`: filas 1-9 VERIFICADO con evidencia ejecutada; **H-03 CERRADO**. Vacios H-INC08-01/02/03 cerrados por **INC08-FIX-02** (viajes "Cancelar" DUENO/RECEPCIONISTA, CLIENTE->`/recepcion`->`/portal`, Space RECEPCIONISTA; E2E 122/122). H-INC08-04 desmentido (bateria x2 completa). Capa 2 del fallback: NO APLICABLE justificado (decision del orquestador, evidencia §5b).

## REVISADO - code-reviewer

- [x] T14 Revision sin hallazgos bloqueantes — **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (2026-10-30; 0 bloqueantes; spot-check propio 28/28 E2E + 11/11 unit; H-REV08-01 cerrado por el orquestador; H-REV08-02/03 sugerencias backlog).

## Gestion - delivery-orchestrator

- [x] T15 `decisiones.md`: DEC-052/053/054 registradas (2026-10-30); PEND-004/005 resueltas; PEND-003 a la espera de insumo (formulario real).
- [x] T16 `avance.md` actualizado (2026-10-30): INC-08 ACEPTADO 0 puntos; H-03 y REV-01/PEND-004 cerrados en el backlog de riesgos; siguiente accion fijada (anamnesis bloqueada por formulario).
