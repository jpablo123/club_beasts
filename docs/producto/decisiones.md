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
| DEC-026 | Resuelve `INC03-PEND-01` (Producto, 2026-10-10, opcion B): cuando una vigencia esta `VENCIDA`, el **login no cambia** (sigue siendo identidad/cedula+PIN por HU-02 aceptada); el **portal** muestra el servicio vencido sin acceso y **recepcion rechaza el ingreso** con `403 INGRESO_NO_PERMITIDO`. Codigo propio `VIGENCIA_VENCIDA` (403, no 401, para no tratarlo como sesion vencida en el cliente HTTP) disponible para la respuesta del portal si la UI lo necesita | Aprobada (2026-10-10) | INC-03, HU-16 (`VEN-04`), contrato #2/#3/#7, HU-02 intacta |
| DEC-027 | Resuelve `INC03-PEND-02` (Producto, 2026-10-10, opcion a): un cliente con GYM `VENCIDA` y NUTRICION `ACTIVA` **puede autenticarse y usar el servicio vigente**; el portal muestra el estado **por servicio** (GYM `VENCIDA` + NUTRICION `ACTIVA`). Cualquier servicio vencido no bloquea a los demas (coherente con DEC-004) | Aprobada (2026-10-10) | INC-03, `VEN-04`, fixture F8, portal multi-servicio |
| DEC-028 | Resuelve `INC03-PEND-03` (Producto, 2026-10-10, opcion a): las **alertas operativas no sensibles** de recepcion se **derivan del estado** (`ESTADO_CLIENTE` cuando `estado != ACTIVO`; `MEMBRESIA_VENCIDA` cuando `estadoAccesoGym = VENCIDA`), sin texto libre, sin modelo ni endpoint nuevos. Exclusiones confirmadas: anamnesis, notas de salud, email, telefono, PIN | Aprobada (2026-10-10) | INC-03, `REC-05`, HU-29 b5 |
| DEC-029 | Resuelve `INC03-PEND-04` (Producto, 2026-10-10, opcion b): **no se crea `Cliente.foto`** en INC-03; el contrato de recepcion mantiene `foto: string \| null` con valor siempre `null` por ahora (campo opcional ausente). Si mas adelante se quiere poblar, se crea la columna en un incremento de perfil | Aprobada (2026-10-10) | INC-03, `REC-01`, modelo (sin columna foto) |
| DEC-030 | Resuelve `INC03-PEND-05` (Producto, 2026-10-10, opcion b): un cliente `SUSPENDIDO` o `RETIRADO` con membresia `ACTIVA` **no puede registrar ingreso**: `403 INGRESO_NO_PERMITIDO` (un cliente suspendido no entra al gimnasio aunque tenga membresia paga; coherente con la direccion de HU-17, que sigue en INC-04) | Aprobada (2026-10-10) | INC-03, `ING-10`, orden de errores #3 |
| DEC-031 | Resuelve `INC03-PEND-06` (Producto, 2026-10-10, opcion b): en la creacion rapida de recepcion, `sedeId` **no es obligatorio**: si se omite se usa **la sede del recepcionista** derivada del token; el minimo de campos pasa a 4 (`cedula`, `nombres`, `apellidos`, `telefono`). La sede efectiva se expone en la respuesta | Aprobada (2026-10-10) | INC-03, `RAP-01`, cuerpo #5 |
| DEC-032 | Resuelve `INC03-PEND-07` (Producto, 2026-10-10, opcion a): la marca de perfil por completar es un **campo nuevo `Cliente.perfilPendiente Boolean @default(false)`** (migracion de 1 columna), persistido y visible en lecturas posteriores | Aprobada (2026-10-10) | INC-03, `RAP-02`, modelo Prisma |
| DEC-033 | Resuelve `INC03-PEND-08` (Producto, 2026-10-10, opcion b): `perfilPendiente` se limpia (`false`) **cuando el cliente tiene `email`** (canal de contacto y notificaciones); un PATCH sin email no limpia la marca | Aprobada (2026-10-10) | INC-03, `RAP-03`, PATCH `/clientes/:id` |
| DEC-034 | Resuelve `INC04-PEND-01` (Producto, 2026-10-14, opcion a): un cliente `INACTIVO` **no puede autenticarse** en el portal; tras validar credenciales el login devuelve **401 `AUTH_CLIENTE_INACTIVO`** (codigo propio, anti-enumeracion); el cliente ve un mensaje de cuenta inactiva y debe contactar recepcion | Aprobada (2026-10-14) | INC-04, `INC04-CLI-04/08`, `auth.service.ts` |
| DEC-035 | Resuelve `INC04-PEND-02` (Producto, 2026-10-14, opcion a): el campo `motivo` es **obligatorio en todo cambio de estado** del cliente via PATCH (literal HU-17 b2); los tests aceptados de HU-05/Gherkin/UI que no lo envian se **actualizan como cambio de contrato documentado** (RED antes que GREEN; ningun test se elimina) | Aprobada (2026-10-14) | INC-04, `CLI-03`, `EST-03/06`, schema y tests HU-05 |
| DEC-036 | Resuelve `INC04-PEND-03` (Producto, 2026-10-14, opcion a): el historial de estados se persiste en el **modelo nuevo `ClienteEstadoCambio`** (clienteId, estadoAnterior, estadoNuevo, motivo, creadoPorId, createdAt; back-relations en `Cliente`/`User`); HU-17 exige historial acumulable observable | Aprobada (2026-10-14) | INC-04, `CLI-02/03`, `EST-02/04`, Prisma |
| DEC-037 | Resuelve `INC04-PEND-04` (Producto, 2026-10-14, opcion b): **`DUENO` y `RECEPCIONISTA`** pueden inactivar/suspender/retirar/reactivar clientes (coherente con DEC-020 y con HU-05 aceptado donde el RECEPCIONISTA ya edita; la opcion solo-DUENO regresaria HU-05) | Aprobada (2026-10-14) | INC-04, `CLI-03/08`, `EST-02`, permisos |
| DEC-038 | Resuelve `INC04-PEND-05` (Producto, 2026-10-14, opcion b): existe **matriz de transiciones validas**; `RETIRADO` es estado **terminal** (no se reactiva ni se cambia); cualquier transicion invalida devuelve **409 `TRANSICION_INVALIDA`** sin escribir | Aprobada (2026-10-14) | INC-04, `EST-05`, servicio de cliente |
| DEC-039 | Resuelve `INC04-PEND-06` (Producto, 2026-10-14, opcion a): un cliente `INACTIVO` **no puede registrar ingreso fisico**: `403 INGRESO_NO_PERMITIDO` en `POST /recepcion/ingresos` (coherente con DEC-030 para SUSPENDIDO/RETIRADO); regresion obligatoria del INC-03 | Aprobada (2026-10-14) | INC-04, `CLI-07`, `recepcion.ts` |
| DEC-040 | Resuelve `INC04-PEND-07` (Producto, 2026-10-14, opcion b): **no se revoca** la sesion JWT ya emitida al inactivar; expira con el TTL absoluto de 24h (DEC-009); los "servicios activos nuevos" de HU-08 b4 se refieren a asignaciones nuevas, no a lecturas de sesiones vivas | Aprobada (2026-10-14) | INC-04, `CLI-06`, auth |
| DEC-041 | Resuelve `INC04-PEND-08` (Producto, 2026-10-14, opcion a): el `motivo` del cambio de estado se expone **solo a roles staff** (DUENO/RECEPCIONISTA); el rol CLIENTE no lo ve en su ficha ni en `/portal/resumen` (puede ser informacion interna; coherente con R-11/SEC-03/REC-10) | Aprobada (2026-10-14) | INC-04, `CLI-03`, `EST-02`, exposicion |

### Confirmaciones de INC-03 ratificadas por el orquestador (2026-10-10)

Las `CONF-01..06` del spec de INC-03 (opciones por defecto adoptadas alli) quedan **ratificadas** al abrir la puerta LISTO: CONF-01 (deteccion derivada del vencimiento sin job/cron), CONF-02 (`CONGELADO` permite ingreso 201, coherente con DEC-025), CONF-03 (varios ingresos del mismo dia en sedes distintas permitidos), CONF-04 (etiquetas UI en espanol mapeadas desde el enum; la API devuelve el enum), CONF-05 (`DUENO` y `RECEPCIONISTA` completan el perfil rapido, precedente HU-05), CONF-06 (hora de ingreso como string `HH:mm:ss` America/Bogota).

### Confirmaciones de INC-04 ratificadas por el orquestador (2026-10-14)

Las `CONF-01..07` del spec de INC-04 (opciones por defecto adoptadas alli) quedan **ratificadas** al abrir la puerta LISTO: CONF-01 (la reactivacion deja el estado en `ACTIVO`, no en el anterior), CONF-02 (un PATCH sin cambio de estado es no-op y no escribe en el historial), CONF-03 (el orden de evaluacion del PATCH es: validacion Zod -> existencia -> matriz de transiciones -> motivo -> escritura atomica cliente+historial), CONF-04 (`motivo` longitud 3-200, trim, mensaje exacto en espanol), CONF-05 (el historial es observable via `ultimoCambio` en la respuesta del PATCH/GET y en la BD; **sin endpoint nuevo** de historial en este incremento; la UI visible del historial es de HU-07/HU-32), CONF-06 (la guarda de "servicios activos nuevos" vive en el servicio de cliente/membresia y se hereda a INC-05 sin crear rutas aqui), CONF-07 (un `motivo` sin `estado` en el cuerpo se ignora junto al cambio de estado, no genera 400 por esa sola razon).

### Regla de no duplicado de puntos INC-04 (asignacion del orquestador, 2026-10-14)

Los puntos de HU-08 y HU-17 acreditan **solo sus bullets exclusivos**: inactivacion con `motivo`, bloqueo de login (DEC-034), guarda de ingreso (DEC-039), reactivacion reglada, transiciones y historial (`ClienteEstadoCambio`). El **estado y el filtro** de clientes ya estan acreditados en HU-05/HU-06 (INC-00/01); la **guarda de ingreso por SUSPENDIDO/RETIRADO** (DEC-030) ya esta acreditada en HU-30 (INC-03); el **efecto de vencimiento** en HU-16 (INC-03). Ningun bullet se cobra dos veces (DEC-016).

### Regla de no duplicado de puntos HU-16 vs bloque 4 (asignacion del orquestador, 2026-10-10)

El efecto "vencido = sin acceso / recepcion lo detecta" se acredita **una sola vez en HU-16** (1 punto, criterios `INC03-VEN-03`/`VEN-04`, incluida la rama `VENCIDA -> 403` de `INC03-ING-04`). El bloque 4 (10 puntos) acredita solo su contrato y su pintado (HU-25/29/30/31). El reparto por fraccion dentro del bloque 4 se fija en `docs/producto/auditoria-puntos-inc00.md` al cierre (INC03-R05).

## Decisiones por resolver antes de seguir al 50%

Resueltas el 2026-10-08: PEND-002 -> DEC-017, PEND-004 -> DEC-018, PEND-005 -> DEC-019, PEND-006 -> DEC-020, ruta de PEND-003 -> DEC-021.

Bloque nuevo el 2026-10-09: `INC03-PEND-01..08`, formuladas en `docs/incrementos/INC-03-vencimiento-recepcion-portal/spec.md` (seccion "Decisiones pendientes"). **Resueltas el 2026-10-10** por el Producto (confirmacion unica de las 8 recomendaciones del orquestador) y registradas como **DEC-026..DEC-033**; con ellas y la ratificacion de contrato, INC-03 paso a `LISTO`. Texto completo y contexto de cada una en el spec.

Bloque nuevo el 2026-10-14: `INC04-PEND-01..08`, formuladas en `docs/incrementos/INC-04-estados-cliente/spec.md`. **Resueltas el 2026-10-14** por el Producto (confirmacion unica de las 8 recomendaciones) y registradas como **DEC-034..DEC-041**; con ellas, la ratificacion de contrato y CONF-01..07, INC-04 puede pasar a `LISTO`.

| ID | Decision pendiente | Opciones | Responsable |
|---|---|---|---|
| PEND-003 | Campos exactos de anamnesis (ruta ya fijada en DEC-021; se resuelve al especificar el incremento de bloque 5) | Formulario minimo / formulario completo del gimnasio | Producto + Analista |

Las `INC03-PEND-01..08` quedan **fuera** por resueltas (DEC-026..033, 2026-10-10); las `INC04-PEND-01..08` quedan **fuera** por resueltas (DEC-034..041, 2026-10-14); el unico pendiente de producto antes del corte del 50% es **PEND-003** (anamnesis, bloque 5).

## Reglas de resolucion

- Si un documento historico contradice una decision aprobada aqui, prevalece este registro.
- Si una decision cambia, el orquestador debe listar criterios, tests y codigo afectados.
- Una decision pendiente puede bloquear un incremento cuando afecta datos, permisos o flujos principales.
