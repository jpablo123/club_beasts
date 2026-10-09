# Decisiones de Producto y Tecnologia

Este registro evita que los agentes resuelvan la misma duda de formas distintas. Toda regla que afecte implementacion, pruebas o UX debe quedar aqui antes de cerrar un incremento.

## Decisiones vigentes

| ID | Decision | Estado | Impacto |
|---|---|---|---|
| DEC-001 | Roles iniciales: DUENO, RECEPCIONISTA y CLIENTE | Aprobada | Auth, permisos, UI y pruebas |
| DEC-002 | Cedula como identificador principal del cliente | Aprobada | Login cliente, busqueda y unicidad |
| DEC-003 | PIN cliente numerico de 4 digitos, almacenado hasheado | Aprobada | Auth cliente y reset de PIN |
| DEC-004 | Servicios separados: membresia gym, personalizado y nutricion | Aprobada | Vigencias, portal, recepcion y ficha |
| DEC-005 | Vigencias por dias completos en zona America/Bogota | Aprobada | Estados, vencimientos y pruebas de fecha |
| DEC-006 | Inicio y fin de vigencia son inclusivos | Aprobada | Calculo de duracion y acceso el dia final |
| DEC-007 | Renovar una vigencia crea un nuevo periodo; no sobrescribe anteriores | Aprobada | Historial y auditoria |
| DEC-008 | Solapamientos de periodos se rechazan; gaps son permitidos | Aprobada | Validacion de vigencias |
| DEC-009 | Token API con TTL absoluto de 24h, sin refresh transparente | Aprobada | NextAuth, recuperacion y mensajes |
| DEC-010 | Token vencido exige nuevo login y limpieza de datos privados | Aprobada | Frontend, UX y seguridad |
| DEC-011 | No contar avance sin evidencia de ejecucion | Aprobada | Gestion del 50% |
| DEC-012 | Pruebas automatizadas usan SQLite aislado por ejecucion mientras el MVP esta en fase local | Aprobada | Test isolation, fixtures y velocidad local |
| DEC-013 | INC-00 puede crear fixtures deterministas por suite con limpieza automatica | Aprobada | Pruebas RED de privacidad, membresias y Gherkin |
| DEC-014 | Alcance Gherkin de INC-00 lo define QA/analista segun criterios incluidos, priorizando auth/clientes y agregando membresias si ya hay escenarios reutilizables | Aprobada | ATDD sin bloquear por escenarios fuera de alcance |
| DEC-015 | Los mensajes de validacion de nombres/apellidos se alinean a los criterios HU-04 (`Nombres/Apellidos solo pueden contener letras y espacios`); se corrige el producto, nunca el feature | Aprobada | Validacion API, Gherkin C05 y criterios HU-04/HU-05 |
| DEC-016 | Para certificar puntos del MVP cuando un HU tiene criterios parciales, se reparte por fraccion de bullets cerrados (spec + implementacion + prueba + evidencia + revision) con trazabilidad en `docs/producto/auditoria-puntos-inc00.md`; sin ese desglose no se suma nada | Aprobada | Contabilidad de avance aceptado y matriz de `mvp.md` |
| DEC-017 | Resuelve PEND-002: recepcion mantiene gestion sobre vigencias, tal como quedo el acuerdo de fase 2 (`DUENO` y `recepcionista` autorizados en `src/routes/membresia.ts:82,92`) | Aprobada (2026-10-08) | HU-12, HU-15, permisos de API y UI de membresias |
| DEC-018 | Resuelve PEND-004: la rutina personalizada usa estructura completa macro-meso-micro | Aprobada (2026-10-08) | HU-13, bloque 6, schema Prisma y asignacion de rutinas |
| DEC-019 | Resuelve PEND-005: el plan nutricional usa plantilla simple | Aprobada (2026-10-08) | HU-14, bloque 7, schema Prisma y asignacion de planes |
| DEC-020 | Resuelve PEND-006: `DUENO` y `RECEPCIONISTA` pueden reactivar un cliente `INACTIVO` | Aprobada (2026-10-08) | HU-08, auth/UI de clientes |
| DEC-021 | Resuelve la ruta de PEND-003: no se fuerza una anamnesis minima para cerrar HU-07; el ultimo punto de HU-07 (o el punto equivalente del corte al 50%) se busca en el incremento de anamnesis (bloque 5) segun DEC-016. Los campos exactos de anamnesis se resuelven al especificar dicho incremento | Aprobada (2026-10-08) | HU-07, bloque 5, ruta al corte del 50% |
| DEC-022 | Reglas de rango de congelacion de HU-15. Confirmada por Producto: **no se congela una vigencia ya VENCIDA** (409). Delegadas por Producto al orquestador con criterio de operacion de gimnasio: (a) el rango de congelacion debe quedar **contenido** en la vigencia (si no, 409 `CONGELACION_NO_PERMITIDA`); (b) la **fecha fin** de la congelacion debe ser hoy o futura (no se congela solo tiempo ya consumido); el **inicio** puede ser retroactivo mientras el rango siga abierto; (c) la extension de `fechaFin` suma los dias del rango en dias completos inclusivos, zona `America/Bogota` (coherente con DEC-005/DEC-006) | Aprobada (2026-10-08) | INC-02, HU-15, API y UI de membresias |
| DEC-023 | Alcance de la congelacion de HU-15 (decision del Producto 2026-10-08): aplica a **membresia gym y servicio personalizado**; el **servicio de nutricion queda fuera de alcance** de congelacion. HU-15 b1 se cierra con este alcance enmendado (GYM + PERSONALIZADO); la congelacion de nutricion no se implementa ni se prueba en INC-02. Riesgo asumido: HU-14 b2 pide estado "congelado" para nutricion, por lo que al especificar INC-05 debera resolverse (permitir entonces la congelacion de nutricion o enmendar el bullet de HU-14) | Aprobada (2026-10-08) | INC-02, HU-15, HU-14, modelo y UI de vigencias |
| DEC-024 | El Producto pidio incluir en INC-02 la operacion de **descongelar** y **editar una congelacion** (cierre del abierto #7). Regla de dias (modelo de gimnasio): al descongelar, `fechaFin` se decrementa en los dias de la pausa que **faltaban por transcurrir** (`finRango - hoy + 1`, con minimo 0); los dias de pausa ya consumidos quedan descontados. Editar el rango recalcula la extension por diferencia (revertir el N anterior, aplicar el nuevo). Sin bullet propio en HU-15: **aporta 0 puntos** por DEC-016 (alcance de producto, igual que `HU15-C06` auditoria) | Aprobada (2026-10-08) | INC-02, contrato API, criterios HU-15, UI de membresias |
| DEC-025 | Durante la congelacion el cliente **conserva el acceso** al gimnasio y al portal (Producto, 2026-10-08; cierra el abierto #8). La congelacion es una pausa de vigencia, no una suspension: INC-02 no implementa bloqueo de acceso por congelacion. El bloqueo por vencimiento sigue siendo HU-16 (INC-03) y el bloqueo por estado INACTIVO es HU-08 (INC-04). Si luego el Producto quiere bloquear la entrada durante la pausa, hay que cambiar esta decision explicitamente | Aprobada (2026-10-08) | INC-02, HU-15, acceso y portal |

## Decisiones por resolver antes de seguir al 50%

Resueltas el 2026-10-08: PEND-002 -> DEC-017, PEND-004 -> DEC-018, PEND-005 -> DEC-019, PEND-006 -> DEC-020, ruta de PEND-003 -> DEC-021.

Bloque nuevo el 2026-10-09: `INC03-PEND-01..08`, formuladas en `docs/incrementos/INC-03-vencimiento-recepcion-portal/spec.md` (seccion "Decisiones pendientes"). Dejan `INC-03` en `BLOQUEADO`; al resolverse, el spec pasa a `LISTO` sin reescritura estructural. Texto completo y contexto de cada una en el spec.

| ID | Decision pendiente | Opciones | Responsable |
|---|---|---|---|
| PEND-003 | Campos exactos de anamnesis (ruta ya fijada en DEC-021; se resuelve al especificar el incremento de bloque 5) | Formulario minimo / formulario completo del gimnasio | Producto + Analista |
| INC03-PEND-01 | HU-16: que se bloquea exactamente cuando una vigencia esta `VENCIDA` y en que punto (login, portal o ingreso) | (A) rechazar login con `VIGENCIA_VENCIDA`; (B) login ok, portal sin acceso y recepcion rechaza ingreso; (C) mixta | Producto + Orquestador |
| INC03-PEND-02 | HU-16: cliente con GYM vencido y NUTRICION vigente puede autenticarse y usar el servicio vigente | (a) si, accede al vigente; (b) no, cualquier vencido bloquea; (c) regla por tipo de servicio | Producto |
| INC03-PEND-03 | HU-29: que es una "alerta operativa no sensible" y de donde sale | (a) derivada de estados; (b) texto libre de recepcion (sumaria modelo+endpoint); (c) ambos | Producto (+Backend si (b)) |
| INC03-PEND-04 | HU-29: se crea el campo `Cliente.foto` (URL) en INC-03 | (a) si, migracion; (b) no, `foto: null` siempre | Producto + database-admin |
| INC03-PEND-05 | HU-30: cliente `SUSPENDIDO`/`RETIRADO` con membresia activa puede registrar ingreso | (a) si, solo cuenta la membresia (literal HU-30); (b) no, `403 INGRESO_NO_PERMITIDO` | Producto |
| INC03-PEND-06 | HU-31: `sedeId` obligatorio en la creacion rapida o default de la sede del recepcionista | (a) obligatorio (minimo 5 campos); (b) default (minimo 4) | Producto + Backend |
| INC03-PEND-07 | HU-31: la marca "perfil pendiente" es campo nuevo o derivacion de datos faltantes | (a) campo `Cliente.perfilPendiente`; (b) derivacion sin columna | Producto + database-admin |
| INC03-PEND-08 | HU-31: que condicion limpia `perfilPendiente` | (a) cualquier PATCH del dueño; (b) tener email; (c) email + observaciones; (d) accion manual | Producto |

## Reglas de resolucion

- Si un documento historico contradice una decision aprobada aqui, prevalece este registro.
- Si una decision cambia, el orquestador debe listar criterios, tests y codigo afectados.
- Una decision pendiente puede bloquear un incremento cuando afecta datos, permisos o flujos principales.
