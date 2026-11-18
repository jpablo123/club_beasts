# INC-10 - Rutinas, asignacion e historial (bloque 6)

Estado: **ESPECIFICADO** (2026-11-05). Puntos MVP potenciales: bloque 6 = **18** (HU-18/19/20/21/26, reparto por fraccion al cierre DEC-016) + el bullet b4 de HU-13 (asignacion de rutina personalizada activa, bloque 3) que este incremento desbloquea.

Decisiones aplicadas: **DEC-018** (macro-meso-micro en personalizada), **DEC-062** (7 campos info/diagnostico), **DEC-063** (tests/antropo/biomecanico como registros tipados; enums 13 medidas/10 zonas/4 hallazgos en `HU-19-schemas.ts`), **DEC-064** (genericas/induccion: sesion->ejercicio->serie sin ciclos), **DEC-065** (solo DUENO escribe/asigna), **DEC-066** (regla de vigencia validada al cambio; ocultacion por exposicion, sin jobs), **DEC-067** (asignaciones con snapshot del contenido), **DEC-068** (cliente ve estructura completa), DEC-016 (no-duplicado), DEC-012/013 (fixtures).

## Criterios de aceptacion

Criterios **RU-01..RU-42** generados por `acceptance-criteria-analyst` (2026-11-05) en `club-beasts-api/features/acceptance-criteria/`:

| Doc | Criterios | Cobertura |
|---|---|---|
| `HU-18-criterios-aceptacion.md` | RU-01..RU-08 | Tipo explicito GENERICA/INDUCCION, estructura organizada B1/B2, reutilizable N clientes, activable (RU-05 REF->HU-20) |
| `HU-19-criterios-aceptacion.md` | RU-09..RU-19 | Info/diagnostico (DEC-062), arbol macro-meso-micro con contencion de fechas (DEC-018), sesion->ejercicio->serie, evaluaciones tipadas (DEC-063) |
| `HU-20-criterios-aceptacion.md` | RU-20..RU-28 | Una sola activa + reemplazo, tipos asignables, regla de vigencia (DEC-066), cliente inactivo 409, permisos (DEC-065) |
| `HU-21-criterios-aceptacion.md` | RU-29..RU-35 | fechas inicio/fin, actor real, cierre al reemplazar, historial en ficha staff, snapshot (DEC-067), invariante 0-1 activas |
| `HU-26-criterios-aceptacion.md` | RU-36..RU-42 | Self-only, version vigente (DEC-066 ocultacion), generica como fallback, solo lectura, SIN_RUTINA, secciones completas (DEC-068) |

Matriz de navegacion **NAV-RU-01..22** en los `.md` (filas `NO VERIFICADO`; el orquestador registra aplicabilidad en LISTO). Sin features Gherkin (guard exacto 220; escenarios en tablas de decision; cableado ATDD opcional en RED con guard al alza).

## Contrato API — **RATIFICADO 2026-11-05** (`backend-developer`: R1..R8; `frontend-developer` C5/C6 alineados; DEC-069/070)

| # | Endpoint | Rol | Respuesta / codigos |
|---|---|---|---|
| 1a | `POST /rutinas` (GENERICA/INDUCCION) | solo DUENO | 201 `rutinaBaseDatosSchema`; 400 Zod primer error `.strict()` |
| 1b | `POST /rutinas-personalizadas` | solo DUENO | 201 `rutinaPersonalizadaDatosSchema`; 400 incluye `validarContencionCiclos` (ejecutado en servicio, primer error) |
| 2 | `GET /rutinas?tipo=&nombre=` | DUENO/RECEPCIONISTA | 200 `{ rutinas: resumen[], total }` (filtros en searchParams) |
| 3 | `GET /rutinas/:rutinaId` | DUENO/RECEPCIONISTA | 200 detalle por tipo persistido (+ `actualizadoPor`); 404 `RUTINA_NO_ENCONTRADA` |
| 4 | `PATCH /rutinas/:rutinaId` | solo DUENO | 200 merge R3/C3a por secciones; `tipoRutina` inmutable; **solo afecta asignaciones futuras** (snapshot DEC-067) |
| 5 | `POST /clientes/:clienteId/rutinas/asignacion` | solo DUENO | 201 `rutinaAsignacionSchema` (actor + contenidoSnapshot); orden: 401 -> 403 -> 400 params -> 400 body -> 404 `CLIENTE_NO_ENCONTRADO` -> 404 `RUTINA_NO_ENCONTRADA` -> **409 `CLIENTE_INACTIVO`** (DEC-069) -> **409 `SIN_VIGENCIA_PERSONALIZADA`** (DEC-070) -> **409 `RUTINA_YA_ACTIVA`** -> **409 `ASIGNACION_CONFLICTO`** (concurrencia) -> 201 |
| 6 | `GET /clientes/:clienteId/rutinas/historial` | DUENO/RECEPCIONISTA | 200 `{ clienteId, asignaciones[] (actor + snapshot), total }` `fechaInicio` DESC |
| 7 | `GET /clientes/:clienteId/rutinas/activa` | DUENO/RECEPCIONISTA | 200 `{ clienteId, asignacion: dto|null, estado: "ACTIVA"\|"SIN_RUTINA"\|"OCULTA_POR_VIGENCIA" }` (DEC-066/DEC-070: ocultacion sin borrar) |
| 8 | `GET /portal/rutina` | CLIENTE (token) | 200 `rutinaPortalSchema` (contenido desde snapshot; `.strict()` sin `actor`) \| `{ mensaje: "No tienes una rutina activa" }`; 403 para staff |

- **Sin DELETE** en MVP (patron Anamnesis/DEC-057); sin prefijo `/api`; literales DEC-070. **Modelo Prisma (R3)**: `Rutina` con columnas JSON-string por seccion (DEC-012: String, nunca `Json`) + `RutinaAsignacion` (`fechaInicio`/`fechaFin` null=activa/`actorId`/`contenidoSnapshot String`/ **`activaClave String? @unique`** = arbitro portable 0-1 activas INC00-MEM-03 -> P2002 -> 409 `ASIGNACION_CONFLICTO`); FK Restrict; migracion **10/0 -> 11/0**.
- **Validacion (R4)**: copia `src/schemas/rutina.schema.ts` + anti-deriva por tests sobre el canonico (INC09-R08). **DEC-066 (R5)**: fuente unica `estadoVigenciaPersonalizada(clienteId)` (reutiliza `calcularEstado` INC-05; `CONGELADO` que cubre hoy no permite activar). **Snapshot (R6)**: captura en la misma transaccion de la asignacion; lecturas leen desde snapshot. **Concurrencia (R7)**: transaccion (INC00-MEM-02) + arbitro.
- **Limites exactos (C4)**: macrociclos 20 / mesociclos 20 por macro / microciclos 20 por meso / sesiones 30 por micro / ejercicios 30 por sesion / series 30 por ejercicio / evaluaciones 50 por seccion. **bodyLimit**: vigilar en GREEN (arbol maximo vs 1MiB de Fastify).

## Contrato frontend — **RATIFICADO 2026-11-05** (`frontend-developer`: C1..C9)

- **C1 — Middleware `/rutinas` staff-only** (DUENO/RECEPCIONISTA; CLIENTE -> `/portal`): unica capa de seguridad de ruta que faltaba. Rutas: `/rutinas` (listado), `/rutinas/nueva` (selector de tipo), `/rutinas/[id]` (detalle), `/rutinas/[id]/editar` (editor; RECEP -> redirect al detalle).
- **C2/C7 — Matriz NAV-RU re-escopada**: NAV-RU-05 desagregada por rol (RECEP lectura + redirect en edicion; CLIENTE middleware); NAV-RU-11..17 con RECEP de lectura; NAV-RU-02..04 familia base (personalizada en NAV-RU-07..10); NAV-RU-18 sin "logout" (transversal); NAV-RU-13 incluye `RUTINA_YA_ACTIVA`; filas nuevas NAV-RU-23 (listado vacio/filtros) y NAV-RU-24 (URL directa a rutina inexistente -> 404 con "Volver al listado").
- **C3 — Set de localizadores aprobado**: regiones `Rutinas`/`Rutina activa`/`Historial de rutinas`/`Mi rutina` (exact); botones `Crear rutina`, `Modificar rutina`, `Aplicar cambios`, `Descartar cambios` (alertdialog + banner + beforeunload, patron C5 INC-09), `Asignar rutina`, `Confirmar asignación`, `Agregar ...`, `Quitar serie`, `Ver versión asignada`, `Volver al listado|a la ficha|al portal`; labels `Inicio de la asignación` (NUNCA "Fecha de inicio"), `Notas ...` (NUNCA "Observaciones"), etc. **Invariantes**: 1 unico heading "Mi Rutina" en `/portal` (el acceso es link, no heading); badges `ACTIVA`/`CERRADA` en mayusculas (sin choque con los exactos base "Activo"/"Activa"). Prohibidos: `Editar`, `Guardar`, `Cancelar`, `Observaciones`, `Estado`, `Motivo`, `Fecha de inicio`, `Fecha de fin`, `Consultar`, `Ver ficha`, `Nombres`.
- **C4 — Editor del arbol (Corte A: completo con UX simple)**: acordeones por ciclo (`aria-expanded`, panel solo si expandido) + filas-tabla de series (repeticiones "8"/"8-12", intensidad, descanso seg, notas); un solo draft `useState` con helpers por ruta de indice; validacion espejo `src/lib/rutina-schemas.ts` (sin zod) + paridad con canonico; errores `role="alert"` + foco al primer error. Sin drag&drop ni libreria de ejercicios. Enmienda opcional B (wizard P1->P5) solo si Producto la pide (registrada antes de LISTO).
- **C5/C6 — Alineados con R1/DEC-070**: estado discriminado `SIN_RUTINA` vs `OCULTA_POR_VIGENCIA` (staff con indicador); literal `SIN_VIGENCIA_PERSONALIZADA`; path `/asignacion`.
- **C8 — `/portal/rutina`**: patron `/portal/anamnesis` (PIN -> `/portal`, sin bypass, sin `repararUrlDelPortal`) + **gate DEC-060 confirmado** (resumen antes de consultar; sinMembresiaActiva -> `/portal` sin datos); `SIN_RUTINA_MENSAJE` con `role="alert"`; entrada = link "Mi rutina activa" dentro de la card "Mi Rutina" existente. **C9**: ficha HU-07 b5/b6 se alimenta de `/clientes/:id/rutinas/{activa,historial}` (no del DTO de la ficha; anotar al cerrar HU-07).
- **Componentes/rutas** propuestos por R2 (ratificados): `app/rutinas/*`, `app/portal/rutina`, `components/rutinas/{RutinaListado,RutinaEditor,CicloAccordion,SesionEditor,SerieFilas,EvaluacionesEditor,RutinaVista,RutinaSection,AsignarRutinaForm,HistorialRutinas}`, `lib/rutina-schemas.ts`, `api.rutinas.*`/`api.asignaciones.*`/`api.portal.rutina`.

## Puerta LISTO — **CERRADA 2026-11-05**

- [x] Criterios observables (RU-01..RU-42 + NAV-RU-01..24 con prueba esperada).
- [x] Decisiones resueltas: DEC-018, DEC-062..068 (Producto) + **DEC-069/070** (precisiones de ratificacion).
- [x] Contratos API y frontend ratificados (R1..R8 + C1..C9 incorporados).
- [x] Datos de prueba: fixtures (rutinas base/personalizadas, cliente con/sin vigencia personalizada ACTIVA, cliente inactivo, doble asignacion).
- [x] Documentos spec/tareas/evidencia existentes.
- [x] Matriz NAV-RU-01..24 con destinos, re-escopos C2/C7 aplicados y no-aplicables justificados (logout transversal, app movil).

**Enmiendas C4 programadas**: ninguna pendiente (los schemas canonicos del analista ya reflejan las decisiones; la unificacion de literales DEC-070 esta en el canonico). Riesgos actualizados: INC10-R01..R06 + R2-01 (DOM del editor), R2-02 (interferencia 143 base), bodyLimit (R1#3).

## Base a preservar (re-medida al arranque del RED)

API **807/807** · Gherkin **220/220** (guard 220; si se anaden features, el guard sube) · web **303/303** · E2E **143/143** · tsc 0/0 · build PASS · migraciones **10/0** (este incremento **si** requiere migracion nueva: modelos `Rutina` + `RutinaAsignacion`).

## Riesgos

| ID | Riesgo | Mitigacion | Responsable |
|---|---|---|---|
| INC10-R01 | Doble cobro con HU-07 b5/b6 y con HU-13 | RU-05/18/25 REF sin punto; el b4 de HU-13 se acredita solo en el cierre con reparto explicito (DEC-016) | Orquestador |
| INC10-R02 | Invariante "una sola activa" bajo concurrencia | Cierre de la anterior en la misma escritura + test de doble asignacion (precedente INC00-MEM-03) | backend + QA |
| INC10-R03 | Snapshot vs edicion posterior de la rutina | DEC-067: snapshot al asignar; tests de que el historial no muta | backend + QA |
| INC10-R04 | Deriva schemas `features/` vs copia `src/` | Patron INC09-R08: tests parseando con el canonico | test-engineer |
| INC10-R05 | Profundidad del arbol (macro->serie): validacion de contencion de fechas y limites de arrays | `validarContencionCiclos` ya en schemas; tests de limites | backend |
| INC10-R06 | Exposicion de personalizada sin vigencia (DEC-066): consistencia entre endpoint staff y portal | Fuente unica de resolucion (servicio) + tests de ambos | backend + QA |
