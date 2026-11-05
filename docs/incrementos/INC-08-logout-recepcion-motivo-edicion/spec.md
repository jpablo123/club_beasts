# INC-08 - Logout en /recepcion y motivo solo en cambio de estado

Estado: **ESPECIFICADO -> LISTO** (2026-10-30). Puntos MVP: **0** (no-duplicado; ver seccion "Regla de no duplicado").

Decisiones que lo desbloquean: **DEC-053** (resuelve `PEND-005`/hallazgo **H-03**) y **DEC-054** (resuelve `PEND-004`/hallazgo **REV-01** de INC-04). Ambas aprobadas por Producto 2026-10-30.

## Objetivo

Cerrar dos hallazgos de UX aceptados por Producto, sin cambiar contratos de API ni reglas de negocio ya aceptadas:

1. `/recepcion` (staff) gana un control de **logout propio** ("Salir") con el patron del Navbar.
2. La UI de edicion staff envia `estado` **solo cuando el usuario lo cambio**; editar un campo suelto deja de exigir `motivo`.

## Criterios de aceptacion

| ID | Criterio | Observabilidad | Puntos |
|---|---|---|---:|
| `INC08-NAV-01` | `/recepcion` con sesion staff viva muestra control **"Salir"** visible para DUENO y RECEPCIONISTA | E2E + unit | 0 |
| `INC08-NAV-02` | Clic en "Salir" cierra sesion (`signOut({ callbackUrl: "/" })`, patron Navbar) y aterriza en **`/`** (landing); `/recepcion` deja de ser accesible sin login | E2E | 0 |
| `INC08-NAV-03` | "Salir" es alcanzable por **teclado** (Tab hasta el control, foco visible, activacion con Enter/Space) | E2E + unit | 0 |
| `INC08-NAV-04` | Con sesion: URL directa y recarga de `/recepcion` persisten la pantalla y el control; sin sesion la guarda existente redirige a login (sin cambios) | E2E | 0 |
| `INC08-NAV-05` | "Salir" visible sin overflow horizontal en **movil 375px y escritorio 1280px** | E2E | 0 |
| `INC08-NAV-06` | Regresion: flujos de recepcion (consulta por cedula, registro de ingreso, creacion rapida) intactos con el nuevo control presente | E2E (base) | 0 |
| `INC08-ED-01` | Editar un **campo suelto** (p. ej. telefono) **sin tocar `estado`** guarda con **200 sin `motivo`** (PATCH sin `estado`) | unit (payload) + E2E | 0 |
| `INC08-ED-02` | Cuando el usuario **cambia `estado`**, el `motivo` **sigue siendo obligatorio** (DEC-035 intacta; 400 sin motivo; historial y matriz de transiciones sin cambios) | unit + E2E (regresion base INC-04) | 0 |
| `INC08-ED-03` | El request PATCH solo incluye `estado` cuando el usuario lo cambio (asercion del payload, no solo del resultado) | unit | 0 |
| `INC08-ED-04` | Regresion: historial de estados (`ClienteEstadoCambio`), matriz de transiciones, guardas `INACTIVO` y exposicion del motivo solo a staff intactos (suites base verdes) | base API + web | 0 |

## Contratos aplicables

- **DEC-053**: patron exacto del logout del Navbar (`signOut({ callbackUrl: "/" })`); label "Salir" consistente con el resto de la UI staff. El control va en la pantalla `/recepcion` (barra/header propio), sin romper los selectores existentes (`nav a[href="/"]` de `cambio-pin-obligatorio.spec.ts:58` no se toca).
- **DEC-054**: el contrato de API **no cambia** (un PATCH **sin** `estado` no exige `motivo` — CONF-03/CONF-07 de INC-04 ya ratificadas). Solo cambia el payload que la UI arma: `estado` se incluye **unicamente** si el valor seleccionado difiere del persistido. Si un test existente codifica el comportamiento pre-DEC-054 (motivo exigido en todo guardado), se **enmienda** con contrato propio documentado (patron C4: nunca edicion silenciosa), RED antes que GREEN.
- **PIN obligatorio intacto**: ninguna tarea relaja la guarda `debeCambiarPin` ni la autenticacion para facilitar pruebas.
- **No-duplicado (asignacion del orquestador, 2026-10-30)**: **0 puntos**. HU-05/HU-08/HU-17 y los flujos de recepcion ya estan cobrados; estos criterios cierran hallazgos de UX (H-03, REV-01) sobre flujos aceptados. WORKFLOW-NAV no certifica puntos MVP (DEC-011).

## Matriz de navegacion/aplicabilidad (APROBADA por el orquestador 2026-10-30)

Destinos esperados fijados por DEC-053 (`Salir` -> `/`). Resultado inicial **NO VERIFICADO** en toda fila hasta evidencia ejecutada; la evidencia solo cambia con auditoria ejecutada.

| Fila | Criterio | Pantalla | Estado | Entrada | Salida esperada | Rol | Prueba | Resultado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `INC08-NAV-01` | `/recepcion` | sesion staff viva | URL directa | Pantalla accesible con "Salir" visible | DUENO / RECEPCIONISTA | E2E | NO VERIFICADO | _pendiente_ |
| 2 | `INC08-NAV-02` | `/recepcion` | sesion staff viva | clic "Salir" | **`/`** (landing) con sesion cerrada | DUENO / RECEPCIONISTA | E2E | NO VERIFICADO | _pendiente_ |
| 3 | `INC08-NAV-03` | `/recepcion` | sesion staff viva | teclado (Tab + Enter) | idem fila 2; foco visible en "Salir" | DUENO / RECEPCIONISTA | E2E + unit | NO VERIFICADO | _pendiente_ |
| 4 | `INC08-NAV-04` | `/recepcion` | sesion staff viva | recarga (reload) | Pantalla persiste con "Salir" | DUENO / RECEPCIONISTA | E2E | NO VERIFICADO | _pendiente_ |
| 5 | `INC08-NAV-04` | `/recepcion` | tras "Salir" | atras del navegador | No reabre sesion (guarda existente -> login) | DUENO / RECEPCIONISTA | E2E | NO VERIFICADO | _pendiente_ |
| 6 | `INC08-NAV-05` | `/recepcion` | sesion staff viva | movil 375px + escritorio 1280px | "Salir" visible sin overflow horizontal | DUENO / RECEPCIONISTA | E2E | NO VERIFICADO | _pendiente_ |
| 7 | `INC08-NAV-06` | `/recepcion` | flujos consulta/ingreso/creacion | flujo staff | Flujos intactos con el control presente | DUENO / RECEPCIONISTA | E2E (base) | NO VERIFICADO | _pendiente_ |
| 8 | `INC08-ED-01` | ficha/edicion de cliente staff | edicion campo suelto (sin `estado`) | guardado | 200 **sin** `motivo`; `estado` ausente del payload | DUENO / RECEPCIONISTA | unit + E2E | NO VERIFICADO | _pendiente_ |
| 9 | `INC08-ED-02` | ficha/edicion de cliente staff | cambio de `estado` | guardado | `motivo` obligatorio (400 sin el); transiciones/historial intactos | DUENO / RECEPCIONISTA | unit + E2E | NO VERIFICADO | _pendiente_ |

**Aplicabilidad**: web responsive (movil/escritorio/teclado: **aplica**, filas 3 y 5-6). App movil nativa: **No aplicable** (no existe app movil en el MVP, justificado igual que INC-06/INC-07). URL directa/recarga/atras: **aplica** (filas 1, 4, 5). Sub-fila de `/recepcion` sin sesion: **NO APLICABLE como viaje nuevo** (guarda preexistente ya verificada en INC-03/INC-06; la fila 5 cubre el atras tras logout).

## Base a preservar (re-medida al arranque del RED)

API **658/658** · Gherkin **220/220** (guard 220) · web **204/204** · E2E **94/94 x2** · tsc api/web 0 · build PASS · migraciones 9/0. Salvedad: los tests existentes que codifiquen el comportamiento pre-DEC-054 se enmiendan con contrato propio (documentados en `evidencia.md`); ningun test se elimina.

## Riesgos

| ID | Riesgo | Mitigacion | Responsable |
|---|---|---|---|
| `INC08-R01` | Tests INC-04/INC-05 que asertan "motivo exigido en todo guardado" quedarian en rojo tras DEC-054 | Enmienda con contrato propio (patron C4), RED antes que GREEN; inventario de afectados en el RED | test-engineer |
| `INC08-R02` | El nuevo control "Salir" podria interferir con selectores de specs base de recepcion | Localizadores endurecidos (`exact`, `getByRole`); correr base completa | test-engineer + frontend |
| `INC08-R03` | Cambio de payload podria exponer campos no previstos en el PATCH | Asercion explicita del payload (solo campos modificados) en unit | test-engineer |

## Puerta LISTO

- [x] Criterios observables y comprobables (unit + E2E por criterio).
- [x] Decisiones resueltas: DEC-053, DEC-054 (contrato API sin cambios).
- [x] Contrato definido: sin backend nuevo; payload UI y patron de logout fijados arriba.
- [x] Datos de prueba: sedes/roles existentes (fixtures base); cliente con `estado` persistido para edicion.
- [x] Documentos `spec.md`, `tareas.md`, `evidencia.md` existentes.
- [x] Matriz de navegacion aprobada con destinos esperados y no-aplicables justificados; filas en `NO VERIFICADO` hasta evidencia ejecutada.
