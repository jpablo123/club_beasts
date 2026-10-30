# INC-05 - Vigencias de servicio personalizado y nutricion (HU-13 + HU-14)

## Estado

Estado actual: **ACEPTADO (2026-10-28)**. Historial del pipeline completo:
**PROPUESTO -> ESPECIFICADO + BLOQUEADO (2026-10-20) -> decisiones del Producto
DEC-042..046 + DEC-047 (2026-10-20) -> enmiendas G14 (2026-10-20) -> contrato
RATIFICADO por `backend-developer` (C1..C6) -> `INC05-CONF-01..06` +
no-duplicado ratificados -> LISTO 13/13 (2026-10-20) -> RED (2026-10-20) -> GREEN
backend+web (2026-10-27) -> C4 + defectos RED (2026-10-27) -> VERIFICADO #17
(API 632/632, Gherkin 214/214, web 188/188, E2E 57/57 x2, migraciones 9/0) ->
REVISADO #18 (`NO ACEPTA` por H-01 -> cierre con regresion DEC-047 gym ->
**ACEPTA CON HALLAZGOS NO BLOQUEANTES**) -> ACEPTADO (2026-10-28)**.
Los **8 criterios puntuables** (`INC05-PER-01..04`, `INC05-NUT-01..04`) estan
**VERIFICADOS Y ACEPTADOS**; `PER-05`/`NUT-05` siguen `EXCLUIDO` por alcance
(DEC-018/019). **+6 puntos certificados** (HU-13 3 + HU-14 3; seccion 6 de
`evidencia.md` y seccion 11 de `auditoria-puntos-inc00.md`).

Salvedades vigentes al abrir LISTO (del contrato ratificado):

- **C1**: el filtro `tipoServicio` se agrega tambien a `congelarVigencia` y
  `editarCongelacion` (cambio sobre codigo aceptado) — en el GREEN con pruebas de
  regresion explicitas.
- **C4**: **3 tests aceptados** se enmiendan (nunca se borran) al aplicar DEC-042
  (`membresia-congelacion.test.ts:789-810`, `membresia-descongelacion.test.ts:712-722`,
  `membresia-editar-congelacion.test.ts:812-822`) y el **G14 de HU-15**
  (`HU-15-criterios-aceptacion.md`, `HU-15-schemas.ts`) se enmienda para reflejar los
  3 tipos congelables — salvedad autorizada en `INC05-CONF-06`
  (`decisiones.md`), ejecucion con contrato propio durante RED/GREEN.

Puertas que faltan para **LISTO** (gate unico) — **TODAS CERRADAS (2026-10-20)**:

1. [x] **`INC05-PEND-01..05` resueltas por Producto** y registradas en
   `docs/producto/decisiones.md` como **DEC-042..DEC-046** (2026-10-20; ver
   seccion "Decisiones pendientes -> Resueltas").
2. [x] **Contrato ratificado por `backend-developer`** (endpoints, cuerpos,
   mensajes exactos, orden de evaluacion, modelo de datos e incompatibilidades
   #1..#10 de la seccion "Contrato API propuesto") — **ratificada 2026-10-20 con
   correcciones C1..C6 (veredicto: RATIFICA CON CORRECCIONES), ver evidencia en el
   informe de ratificacion**.
3. [x] **`INC05-CONF-01..06` y la regla de no duplicado ratificadas por el
   orquestador** en `decisiones.md` (2026-10-20; seccion "Confirmaciones de INC-05
   ratificadas por el orquestador" + "Regla de no duplicado de puntos INC-05",
   con salvedad C4 autorizada en `CONF-06`).
4. [x] **Enmiendas G14 derivadas ejecutadas y commiteadas** en
   `HU-13-criterios-aceptacion.md` / `HU-14-criterios-aceptacion.md` /
   `HU-13-schemas.ts` / `HU-14-schemas.ts` — incompatibilidades **#2** (literal
   `CONGELADO`, DEC-043), **#4** (`C02b` factible, DEC-042/043) y **#5** (frase
   "Que NO cubre" del `PATCH`, DEC-046) + **DEC-047** incorporada. Ejecutadas el
   **2026-10-20** por `acceptance-criteria-analyst`.
5. [x] **`DEC-023` enmendada** (opcion elegida: `PEND-01 = (a)`) — hecha por el
   orquestador como **DEC-042** (2026-10-20): `TIPOS_CONGELABLES` =
   `{GYM, PERSONALIZADO, NUTRICION}`; el literal de HU-14 b2 **no** se enmienda.
6. El **RED** no arranca antes de que las casillas 2 y 3 esten cerradas
   (Definition of Ready: contrato y permisos definidos antes de escribir pruebas)
   — **casillas 2 y 3 cerradas (2026-10-20): el RED esta habilitado**.

## Objetivo

Cerrar la **HU-13** (servicio personalizado: gap **G6** de la auditoria) y la
**HU-14** (servicio de nutricion: mismo gap **G6**), sumando **hasta +6 puntos
MVP** (3 + 3 por `auditoria-puntos-inc00.md:114-115,159`; el **reparto exacto por
fraccion se confirma al cierre** en `docs/producto/auditoria-puntos-inc00.md` segun
**DEC-016**). Ruta al 50%: **43 certificados + INC-05 (+6) = 49**; el punto
restante se busca en anamnesis (bloque 5, `PEND-003`) segun **DEC-021**.

Ambas HU estan en **0/4 bullets** hoy (`auditoria-puntos-inc00.md:53-54`): no existe
modelo, ruta ni calculo de estado para `PERSONALIZADO`/`NUTRICION` (grep = 0 en
`src/`); la unica deuda tecnica abierta del bloque 3 ademas de estas es G6.

Notas de alcance obligatorias:

- `mvp.md:60-61`: **HU-13 y HU-14 no se aceptan completas solo por registrar
  vigencias**; sus bullets 4 (rutina personalizada activa / plan nutricional activo)
  se aceptan cuando existan las **asignaciones** correspondientes (bloques 6 y 7).
- **Fraccion maxima alcanzable en INC-05: 3/4 bullets por HU** (b4 excluido,
  exclusion explicita documentada en "Fuera de alcance").
- **DEC-018** (rutina macro-meso-micro) y **DEC-019** (plan con plantilla simple)
  ya estan aprobadas: la dependencia `b4` queda **expresada en spec** (criterios
  `HU13-C04`/`HU14-C04`) pero **no implementable** hasta que exista asignacion.

## Alcance incluido

- **HU-13 b1**: registro de `fechaInicio`/`fechaFin` del servicio personalizado
  (`INC05-PER-01`), espejo del contrato aceptado de membresias gym.
- **HU-13 b2**: estados **calculados** activo / vencido / congelado / no contratado
  (+ `PROGRAMADA`, literal fijado por **DEC-043**) — `INC05-PER-02` y `INC05-PER-03`.
- **HU-13 b3**: la vigencia queda visible en el listado propio y en la ficha del
  cliente (`INC05-PER-04`; superficie web = pintado minimo por `tipoServicio`,
  **DEC-045 = (b)**).
- **HU-14 b1/b2/b3**: mismo alcance para nutricion — `INC05-NUT-01`, `INC05-NUT-02`,
  `INC05-NUT-03` (**incluido**: DEC-042 extiende la congelacion a `NUTRICION`) y
  `INC05-NUT-04`.
- **`PATCH .../:servicioId` de ambos servicios** con concurrencia optimista
  (**DEC-046 = (a)**) como parte de `INC05-PER-01` / `INC05-NUT-01`, con la regla
  **DEC-047** (mover `fechaInicio` desplaza `fechaFin` conservando la duracion
  inclusiva).
- **Guarda heredada `409 CLIENTE_INACTIVO`** (HU-08 b4, `CONF-06` de INC-04) en los
  `POST` de ambos servicios, **antes** del solape; se **re-aplica** en las rutas
  nuevas pero **no se cobra de nuevo** (el bullet de HU-08 ya esta acreditado:
  `INC04-CLI-05`).
- **Reglas de vigencia heredadas**: dias completos `America/Bogota` con extremos
  inclusivos (**DEC-005/006**), renovar crea periodo nuevo (**DEC-007**),
  solapamiento rechazado y gaps permitidos (**DEC-008**).
- **Permisos**: `DUENO` y `RECEPCIONISTA` gestionan vigencias (**DEC-017**), con
  preHandler identico al de `src/routes/membresia.ts:127,137,185`.
- **Congelacion observable en los servicios nuevos**: `INC05-PER-03` se apoya en la
  congelacion **ya aceptada** de HU-15 (INC-02); `INC05-NUT-03` **esta incluido**
  porque **DEC-042** enmendo DEC-023 (`TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO,
  NUTRICION}`).
- **Modelo de datos**: propuesta de reutilizar `MembresiaGym` con `tipoServicio`
  (`prisma/schema.prisma:81`, comentario DEC-004) — seccion "Modelo de datos
  propuesto"; alternativa de modelos nuevos documentada.
- **UI** de la ficha: **API + pintado minimo** (etiquetado/filtrado por
  `tipoServicio`, **DEC-045 = (b)**; sin abrir la vista unificada de HU-07).
- Pruebas **TDD/ATDD** (RED/GREEN), Gherkin y evidencia reproducible.

## Fuera de alcance

- **HU-13 b4 y HU-14 b4 — EXCLUSION EXPLICITA** (no es criterio pospuesto
  informalmente): la dependencia "rutina personalizada activa solo con servicio
  vigente" (`HU13-C04`) y "plan nutricional activo depende de la vigencia"
  (`HU14-C04`) **no se pueden cerrar en INC-05** porque las asignaciones llegan en
  los **bloques 6 y 7** (DEC-018 / DEC-019; `mvp.md:60-61`, `auditoria:187-188`).
  Sus criterios `INC05-PER-05` / `INC05-NUT-05` quedan **`EXCLUIDO`** con spec
  escrito en los G14; solo se cierran en el incremento de rutinas / el de
  nutricion-asignacion. Si el Producto quisiera contarlos en INC-05, exige cambio
  explicito de alcance en `decisiones.md`.
- **Estructura de rutinas** (macro-meso-micro, HU-18..21/26) y **de planes**
  (plantilla simple, HU-22..24/27): fuera; aqui solo se expresa la dependencia.
- **Anamnesis** (HU-09/10/11/28, `PEND-003` / DEC-021).
- **Congelacion**: HU-15 ya esta **aceptada** (INC-02, 4/4) y **no se re-cobra**;
  aqui solo se consume para observar `CONGELADO`. La **ampliacion a NUTRICION** ya
  no es pendencia: **DEC-023 enmendada por DEC-042** (2026-10-20) la incluye en el
  alcance de congelacion.
- **HU-12 / HU-16 / portal / recepcion / ingresos** ya aceptados (INC-00/02/03):
  no se re-especifican ni se re-cobran; solo **regresion** de su base.
- **HU-07**: la vista unificada de los tres tipos de vigencia en la ficha es de
  HU-07 (transversal); los criterios C03 se verifican en el **listado propio** y en
  la ficha existente, sin disenar la vista unificada.
- **HU-32 / reportes / notificaciones**; **HU-05/HU-06/HU-30/HU-08/HU-17** ya
  aceptados: no se re-cobran (seccion de no duplicado).
- Riesgos globales `R-01..R-11`, `D2`, `REV-01..REV-12` (backlog global).

## Bullets de origen (trazabilidad obligatoria)

**HU-13 — Registro de servicio personalizado** (`historias-usuario-gimnasio.md:221-234`):

| # | Bullet |
|---|---|
| b1 | El sistema permite registrar fecha de inicio y fecha fin del servicio personalizado. |
| b2 | El sistema permite marcar el servicio como activo, vencido, congelado o no contratado. |
| b3 | La vigencia queda visible en la ficha del cliente. |
| b4 | La rutina personalizada solo puede considerarse activa si el servicio personalizado esta vigente. |

**HU-14 — Registro de servicio de nutricion** (`historias-usuario-gimnasio.md:236-249`):

| # | Bullet |
|---|---|
| b1 | El sistema permite registrar fecha de inicio y fecha fin del servicio de nutricion. |
| b2 | El sistema permite marcar el servicio como activo, vencido, congelado o no contratado. |
| b3 | La vigencia queda visible en la ficha del cliente. |
| b4 | El plan nutricional activo depende de la vigencia del servicio. |

## Criterios de aceptacion

IDs estables `INC05-PER-nn` (HU-13) e `INC05-NUT-nn` (HU-14). El criterio ISTQB de
origen es el del archivo **G14** correspondiente
(`club-beasts-api/features/acceptance-criteria/HU-13-criterios-aceptacion.md` /
`HU-14-criterios-aceptacion.md`, creados 2026-10-08; **no se reescriben aqui, se
integran**). Leyenda de estado:

- `BLOQUEADO (INC05-PEND-XX)` = observable y comprobable, pero depende de una
  decision de Producto pendiente (afecta literal, contrato o alcance). **Ninguna
  fila queda en esta situacion desde 2026-10-20**: los 5 pendientes se resolvieron
  (DEC-042..046).
- `SPEC` = criterio decidido, sin decision abierta que lo frene (sigue **sin**
  estar `LISTO`/`ACEPTADO`: le faltan implementacion, prueba, evidencia y
  revision). **Es el estado de los 8 puntuables tras DEC-042..046.**
- `EXCLUIDO` = fuera de INC-05 con justificacion (no puntuable aqui).

| ID | HU (bullet) | Criterio origen | Que se observa y comprueba | Estado | Puntuable en INC-05 |
|---|---|---|---|---|---|
| `INC05-PER-01` | HU-13 b1 | `HU13-C01` | `POST /clientes/:clienteId/servicios-personalizado` con fechas validas -> **201** con DTO (version 1, `creadoPor`/`actualizadoPor` = actor) y fila de auditoria CREACION; 400 con los 5 mensajes de fechas; **409 `SERVICIO_SOLAPADA`** (solape inclusive, DEC-008; codes propios por **DEC-044**); renovacion con `inicio >= finPrevio + 1` -> 201 **periodo nuevo** sin sobrescribir (DEC-007); 404 cliente inexistente; 403 rol `CLIENTE`; **409 `CLIENTE_INACTIVO`** (guarda heredada `CONF-06`); rama 8: `PATCH` con `version` vieja -> 409 `SERVICIO_CONFLICTO` (**incluida por DEC-046 = (a)**); **sub-rama DEC-047**: en el `PATCH`, mover solo `fechaInicio` desplaza `fechaFin` por el mismo delta de dias y conserva la duracion inclusiva exacta (plan 30 dias: inicio 2026-10-20 -> fin 2026-11-18; inicio al 21 -> fin 2026-11-19; volver al 20 -> fin 2026-11-18); editar `fechaFin` explicitamente cambia la duracion | **SPEC** (decidido: DEC-044 paths/codigos, DEC-046 `PATCH`, DEC-047 regla de duracion) | Si |
| `INC05-PER-02` | HU-13 b2 | `HU13-C02a` | `GET /clientes/:clienteId/servicios-personalizado` -> 200 `{ servicios, fechaActual }` con estado **calculado** (nunca persistido): `NO_CONTRATADO` (0 filas), `ACTIVA` (`fechaInicio <= hoy <= fechaFin`, dia final inclusivo DEC-006), `VENCIDA` (`hoy > fechaFin`), `PROGRAMADA` (`hoy < fechaInicio`, literal fijado por **DEC-043**); 404 si el cliente no existe | **SPEC** (decidido: DEC-043 = `PROGRAMADA`) | Si |
| `INC05-PER-03` | HU-13 b2 | `HU13-C02b` | Con una pausa vigente creada por los endpoints de congelacion de INC-02, el estado calculado del servicio personalizado es **`CONGELADO`** (literal fijado por **DEC-043**, enmienda G14 ejecutada) y vuelve al calculo normal al terminar la pausa, con `fechaFin` ya extendida | **SPEC** (decidido: DEC-043 literal) | Si |
| `INC05-PER-04` | HU-13 b3 | `HU13-C03` | Listado propio: 200 con fechas, estado y `creadoPor/actualizadoPor` (404/403); **ficha** `GET /clientes/:id`: la vigencia de personalizado aparece con `tipoServicio` y `estado` sin otra consulta. Superficie web: **pintado minimo** en la ficha etiquetado por `tipoServicio` (**DEC-045 = (b)**) | **SPEC** (decidido: DEC-045 = (b)) | Si |
| `INC05-PER-05` | HU-13 b4 | `HU13-C04` | `rutinaActiva` solo se expone con vigencia `ACTIVA`; con `NO_CONTRATADO`/`VENCIDA`/`CONGELADO` -> `null` sin borrar la asignacion | **EXCLUIDO** (bloque 6, DEC-018; `mvp.md:60-61`) | **No** (0 en INC-05) |
| `INC05-NUT-01` | HU-14 b1 | `HU14-C01` | Espejo de `INC05-PER-01` sobre `POST /clientes/:clienteId/servicios-nutricion` (201, 400 fechas, 409 `SERVICIO_SOLAPADA`, renovacion, 404, 403, 409 `CLIENTE_INACTIVO`), `PATCH` con concurrencia optimista (**DEC-046**) y **sub-rama DEC-047** (mover `fechaInicio` desplaza `fechaFin` por el mismo delta conservando la duracion inclusiva) | **SPEC** (decidido: DEC-044, DEC-046, DEC-047) | Si |
| `INC05-NUT-02` | HU-14 b2 | `HU14-C02a` | Espejo de `INC05-PER-02` sobre `GET .../servicios-nutricion` | **SPEC** (decidido: DEC-043 = `PROGRAMADA`) | Si |
| `INC05-NUT-03` | HU-14 b2 | `HU14-C02b` | Estado `CONGELADO` en nutricion durante una pausa — **INCLUIDO**: **DEC-042** enmendo DEC-023 (`TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`) y **DEC-043** fijo el literal `CONGELADO` | **SPEC incluido** (decidido: DEC-042 + DEC-043) | **Si** |
| `INC05-NUT-04` | HU-14 b3 | `HU14-C03` | Espejo de `INC05-PER-04` sobre el listado propio y la ficha (pintado minimo por `tipoServicio`, **DEC-045 = (b)**) | **SPEC** (decidido: DEC-045 = (b)) | Si |
| `INC05-NUT-05` | HU-14 b4 | `HU14-C04` | `planNutricionalActivo` solo con vigencia `ACTIVA`; si no, `null` sin borrar la asignacion | **EXCLUIDO** (bloque 7, DEC-019; `mvp.md:60-61`) | **No** (0 en INC-05) |

> **Conteo**: **10 criterios** = 5 de HU-13 + 5 de HU-14. Desglose:
> **8 puntuables en INC-05** (`PER-01..04`, `NUT-01..04`) y **2 excluidos**
> (`PER-05`, `NUT-05` = bullet b4 de cada HU, fraccion maxima 3/4 por HU).
> De los 8 puntuables: **8 `SPEC` / 0 `BLOQUEADO`** tras resolver los pendientes
> (DEC-042..046, 2026-10-20); `NUT-03` quedo **incluido** (antes podia excluirlo
> `PEND-01 = (b)`, hoy descartado). Ninguno esta aun `LISTO`/`ACEPTADO`.
>
> El spec **no declara puntos**: DEC-016 y la auditoria de cierre certifican el
> reparto (hasta +6, a confirmar al cierre).

### Regla de no duplicado (`auditoria-puntos-inc00.md:72-82, 193-200`; patron INC-02/03/04)

- **Vigencia GYM, estados, vencimiento y congelacion de GYM ya estan pagados** en
  HU-12 (4/4), HU-15 (4/4) e HU-16 (4/4): `INC05-PER-03`/`NUT-03` **solo**
  verifican el estado `CONGELADO` **en los servicios nuevos**, no la congelacion en
  si (la operacion, editar y descongelar son de HU-15/INC-02).
- **Guarda `409 CLIENTE_INACTIVO`** ya esta acreditada en HU-08 (`INC04-CLI-05`,
  aceptado): en `PER-01`/`NUT-01` es **rama de error** de la ruta nueva, sin punto
  propio adicional.
- **La superficie unificada de los tres tipos de vigencia en la ficha** puntua en
  **HU-07**; aqui solo el listado propio + la ficha existente.
- **El filtro por estado de clientes, los ingresos, el portal y el login** ya estan
  acreditados (HU-05/06, HU-30, HU-16, HU-02/08): no se tocan ni se re-cobran.
- **b4 de cada HU**: excluido por `mvp.md:60-61` (no se cobra ni se pospone
  informalmente; solo un cambio explicito de alcance en `decisiones.md` podria
  contarlo, y no estaria sustentado hoy).
- **DEC-047 (duracion inclusiva constante al mover `fechaInicio`)**: el criterio
  **puntuable** es `INC05-PER-01` / `INC05-NUT-01` (HU-13/HU-14). Aplicar la misma
  regla al **`PATCH` de gym** es **regresion sobre codigo ya aceptado** (HU-12,
  INC-00): se prueba y se verifica, **sin cobrar puntos extra** (riesgo
  `INC05-R11`).

## Decisiones pendientes

Formuladas con el patron `INC03-PEND-*` / `INC04-PEND-*` (opciones concretas para
el Producto). Responsable por defecto: **Producto** (confirmacion unica de las
recomendaciones del orquestador).

**Situacion actual (2026-10-20)**: **no quedan `INC05-PEND-*` abiertas** — las 5
se resolvieron el mismo dia (DEC-042..046, mapeo abajo) y las dos casillas que
despues frenaban el incremento (ratificacion de contrato + `INC05-CONF-01..06`)
cerraron tambien el 2026-10-20: el incremento esta **`LISTO`** y el RED habilitado.

### Resueltas (2026-10-20)

| Pendencia | Decision | Opcion elegida (recomendada) | Efecto en este spec |
|---|---|---|---|
| `INC05-PEND-01` | **DEC-042** | **(a)** congelacion extendida a `NUTRICION`; **DEC-023 enmendada** (`TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`) | `INC05-NUT-03` pasa a **SPEC incluido**; incompatibilidad **#10 cerrada**; el literal de HU-14 b2 **no** se enmienda |
| `INC05-PEND-02` | **DEC-043** | `PROGRAMADA` (futuro) + `CONGELADO` (pausa) | literales fijados en `PER-02/03` y `NUT-02/03`; **enmienda G14 #2 ejecutada** (enum + tablas + prosa de los 4 archivos) |
| `INC05-PEND-03` | **DEC-044** | **(a)** paths propuestos + codigos propios `SERVICIO_SOLAPADA` / `SERVICIO_CONFLICTO` | contrato de `PER-01`/`NUT-01` decidido (sigue **pendiente de ratificacion** tecnica por backend) |
| `INC05-PEND-04` | **DEC-045** | **(b)** API + pintado minimo en la ficha etiquetado/filtrado por `tipoServicio` (sin vista unificada HU-07) | alcance web de `PER-04`/`NUT-04` decidido; el RED/GREEN web **si** aplica |
| `INC05-PEND-05` | **DEC-046** | **(a)** `PATCH .../:servicioId` con concurrencia optimista (patron `INC00-MEM-03`) en ambos servicios | rama 8 **incluida** en `PER-01`/`NUT-01`; **enmienda G14 #5 ejecutada** (frase "Que NO cubre" corregida) |

Ademas, **DEC-047** (2026-10-20, regla nueva) obliga a que en un `PATCH` que
mueve solo `fechaInicio`, `fechaFin` se desplace por el mismo delta de dias
conservando la duracion inclusiva exacta; queda incorporada a `INC05-PER-01` /
`INC05-NUT-01`, a la cobertura de pruebas y a la tabla de riesgos (regresion
sobre el `PATCH` de gym, criterio puntuable solo en HU-13/14).

### Historial: preguntas originales (redactadas y resueltas el 2026-10-20)

Texto original conservado como precedente (patron INC-03/04: el expediente no se
borra; las opciones ya no estan abiertas — ver "Resueltas" arriba):

| ID | Pregunta concreta a Producto | Opciones | **Recomendacion del orquestador-analista** | Criterios afectados | **Resolucion** |
|---|---|---|---|---|---|
| `INC05-PEND-01` | **(riesgo abierto por DEC-023)**: HU-14 b2 pide estado **"congelado"** para nutricion, pero DEC-023 dejo el servicio de nutricion **fuera de alcance** de congelacion. ¿Que hacemos en INC-05? | **(a)** extender la congelacion a `NUTRICION` en INC-05 (enmendar el alcance de DEC-023 en `decisiones.md` y ampliar el servicio de congelacion ya aceptado); **(b)** enmendar el bullet 2 de HU-14 ("...activo, vencido o no contratado") y cerrar HU-14 sin estado `CONGELADO` | **(a)**: la guarda y el modelo de congelacion **ya existen y aceptan GYM + PERSONALIZADO** (HU-15 4/4); extenderla a `NUTRICION` **evita enmendar el literal de la HU** y deja la UI de congelacion homogenea (`CongelacionForm` opera sobre `/vigencias/:vigenciaId/congelar`, generico). **Impacto estimado de (a)**: si INC-05 comparte el modelo (propuesta de este spec), la extension es de **config + pruebas** — `TIPOS_CONGELABLES` (`membresia.service.ts:286-289`) pasa a `{ GYM, PERSONALIZADO, NUTRICION }` y `calcularEstado`/`pausasActivas` ya son genericos; si en cambio se crean **modelos nuevos** para nutricion, el impacto sube a **codigo**: habria que generalizar el lookup de `congelarVigencia`/`descongelarVigencia`/`editarCongelacion` (`membresiaGym.findUnique`) y el camino de la ruta. Con **(b)**: `NUT-03` pasa a `EXCLUIDO`, HU-14 cierra con bullet 2 enmendado (precedente: HU-15 b1 enmendado por DEC-023) y hay que enmendar `HU-14-criterios-aceptacion.md`, `HU-14-schemas.ts` y el literal de la HU. Ver incompatibilidad #10 si algo no cierra | `INC05-NUT-03` (y el literal de `INC05-PER-03` solo por PEND-02) | **Resuelta: DEC-042 = (a)** (2026-10-20) |
| `INC05-PEND-02` | **(P-05 heredado)**: (i) ¿cual es el literal del estado de un periodo **futuro**? (ii) ¿cual es el literal del estado **congelado**? | (i) **`PROGRAMADA`** (propuesta) vs omitir la distincion (futuro = `VENCIDA`? no aplica) vs literal distinto; (ii) **`CONGELADO`** (literal de la HU y del codigo) vs **`CONGELADA`** (literal del G14) | **(i) `PROGRAMADA`**: es exactamente lo que `calcularEstado` de gym ya devuelve (`membresia.service.ts:33-50`, `estadoAccesoGymSchema`), evita un segundo vocabulario y las fixtures de INC-03 ya la prueban. **(ii) `CONGELADO`**: es el literal de la HU ("activo, vencido, **congelado** o no contratado"), el valor del enum existente (`MembresiaDTO.estado`, `resolverEstadoAcceso`) y el del portal; adoptarlo exige **enmendar los G14** (`HU-13-schemas.ts`/`HU-14-schemas.ts` `z.enum([..., "CONGELADA", ...])` y los `.md`, que escriben `CONGELADA` en tablas y `CONGELADO` en prosa — inconsistencia interna detectada) | `INC05-PER-02`, `INC05-PER-03`, `INC05-NUT-02`, `INC05-NUT-03` | **Resuelta: DEC-043** = `PROGRAMADA` + `CONGELADO` (2026-10-20) |
| `INC05-PEND-03` | **(P-06 heredado)**: ¿se ratifican los paths y codigos propuestos? | **(a)** `POST/GET /clientes/:clienteId/servicios-personalizado` y `.../servicios-nutricion` + `PATCH .../:servicioId`, con codigos propios **`SERVICIO_SOLAPADA`** / **`SERVICIO_CONFLICTO`** (espejo de `membresia.ts`, mapa `RESPUESTAS_ERROR` nuevo); **(b)** reutilizar los paths/codigos `MEMBRESIA_*` existentes | **(a)**: coherente con **DEC-004** (servicios separados) y con el espejo ya aceptado de `membresia.ts`; los codigos `SERVICIO_*` desambiguan el recurso sin tocar el mapa de gym (hoy en `src/` solo existen `MEMBRESIA_SOLAPADA`/`MEMBRESIA_CONFLICTO`, `membresia.ts:37-46`), y el portal/recepcion ya distinguieron por `tipoServicio`. Con (b), `HU13-C01`/`HU14-C01` y sus `.feature` tendrian que enmendarse y el mensaje `Membresía no encontrado` filtraria un personalizado | `INC05-PER-01`, `INC05-NUT-01` | **Resuelta: DEC-044 = (a)** (2026-10-20) |
| `INC05-PEND-04` | **(detectado al integrar los G14)**: el bullet "La vigencia queda visible en la **ficha del cliente**" — ¿que superficie de UI cierra INC-05? (los G14 fijan como prueba esperada la **integracion**, pero la ficha web `clientes/[id]` renderiza `MembershipSection` que consume `GET .../membresias-gym`) | **(a)** solo API (ficha + listado; la vista unificada de 3 tipos queda para HU-07 y no se toca web); **(b)** API + pintado **minimo** en la ficha existente: etiquetar/filtrar las vigencias por `tipoServicio` en la seccion existente, **sin** crear la vista unificada de HU-07 | **(b)**: cierra el literal "visible en la ficha del cliente" de forma observable por el usuario y, sobre todo, **evita un defecto visible**: si la ruta `GET .../membresias-gym` devuelve filas `PERSONALIZADO`/`NUTRICION` sin filtrar (incompatibilidad #1), `MembershipSection.tsx:161-162,472` pintaria personalizados como si fueran membresias gym. Con (b) el alcance web queda acotado a **etiquetado/filtrado**, no a disenar HU-07 | `INC05-PER-04`, `INC05-NUT-04` | **Resuelta: DEC-045 = (b)** (2026-10-20) |
| `INC05-PEND-05` | **(detectado al integrar los G14: contradiccion interna)**: `HU13-C01`/`HU14-C01` declaran en "Que NO cubre" que **no** cubren "edicion con control de concurrencia (ver rama 8)", pero sus tablas de cobertura de ramas traen la fila 8 (`PATCH` con version vieja -> 409 `SERVICIO_CONFLICTO`), sus analisis de limites traen la fila `version (PATCH)` (min 1 / max N / N+1 -> 409) y P-06 incluye el `PATCH` en el contrato | **(a)** incluir `PATCH .../:servicioId` en INC-05 (edicion de fechas + concurrencia optimista, patron `INC00-MEM-03` aceptado en gym) como parte de `PER-01`/`NUT-01`; **(b)** dejar el `PATCH` fuera de INC-05 (solo `POST`/`GET`) y enmendar ambos G14 (quitar fila 8, frontera `version` y path del contrato) | **(a)**: los dos documentos G14, el contrato P-06 y las fronteras ya incluyen el `PATCH`; excluirlo dejaria un endpoint propuesto **sin pruebas** y forzaria doble enmienda de los dos `.md` y los dos `.ts`. Con (a) la rama 8 queda testeada en `PER-01`/`NUT-01` y se replica el comportamiento ya aceptado de gym (editar sin pisar el cambio ganador) | `INC05-PER-01`, `INC05-NUT-01` | **Resuelta: DEC-046 = (a)** (2026-10-20) |

### Confirmaciones no bloqueantes (opciones por defecto adoptadas en este spec; ratificables)

| ID | Tema | Opcion por defecto adoptada | Fuente |
|---|---|---|---|
| `INC05-CONF-01` | Orden de evaluacion de `POST`/`GET`/`PATCH` | 401/403 (preHandler) -> 400 params -> 400 body (Zod, **primer** error) -> 404 (cliente; y pertenencia en PATCH) -> 409 `CLIENTE_INACTIVO` -> 409 `SERVICIO_SOLAPADA` (en PATCH: 409 `SERVICIO_CONFLICTO` antes del solape) -> 201/200 | espejo `membresia.ts` + `INC04-CONF-03` |
| `INC05-CONF-02` | Guarda `CLIENTE_INACTIVO` | Solo en **POST** (es "servicio nuevo"); **no** en PATCH (editar no es asignar); **antes** del solape | `CONF-06` INC-04 + `HU08-C04b` |
| `INC05-CONF-03` | Estado calculado, nunca persistido; `fechaActual` en toda respuesta de listado | Si; no existe endpoint de escritura de estado | `HU13-C02a`/`HU14-C02a` + precedente INC-03 |
| `INC05-CONF-04` | Forma del DTO de respuesta | DTO existente de membresia (`MembresiaDTO`, con `tipoServicio` y `cambios`) **aditivo** sobre el G14; los schemas G14 validan el subconjunto (Zod ignora extras) | precedente INC-04 incompatibilidad #2 |
| `INC05-CONF-05` | Fechas de "hoy" y extremos | `getTodayBogota()` (`America/Bogota`), `fechaInicio <= hoy <= fechaFin` inclusivo; dia minimo `inicio == fin` | DEC-005/006 |
| `INC05-CONF-06` | Ningun test existente se elimina; la base certificada queda intacta | Base a preservar: API **536/536**, Gherkin **153/153** (guard `INC00_SCENARIO_COUNT = 153`), web **183/183**, E2E **56/56**, migraciones **9/0 sin drift** | DEC-011 + evidencia INC-04 |

## Contrato API propuesto

> **RATIFICADO CON CORRECCIONES POR `backend-developer` EL 2026-10-20**
> (veredicto: **RATIFICA CON CORRECCIONES**, ver "Correcciones de ratificacion"
> al final de esta seccion y el informe de ratificacion). Se ratifican endpoints,
> cuerpos, mensajes exactos, orden de evaluacion, modelo de datos e
> incompatibilidades #1..#10 con las correcciones **C1..C6**, marcadas
> **(correccion de ratificacion 2026-10-20)** donde corrigen detalle verificado.
> La casilla de puerta LISTO "Contrato ratificado por `backend-developer`" queda
> cumplida desde este informe; las `INC05-CONF-01..06` siguen siendo del
> orquestador y el incremento sigue `BLOQUEADO` hasta su casilla.
> Convenciones verificadas contra `src/`: **sin prefijo `/api`** (`src/index.ts`),
> error `{ error, code }` (`src/lib/errors.ts`), fechas `America/Bogota`
> (DEC-005/006), roles `DUENO`/`RECEPCIONISTA` via
> `authenticateRoles([...])` (`membresia.ts:127,137,185`, DEC-017). Los schemas G14
> de respuesta son `HU-13-schemas.ts` y `HU-14-schemas.ts` (existen y estan
> commiteados desde el cierre G14 2026-10-08); **`src/` no puede importar G14**
> (`rootDir: "./src"`): en `src/schemas/` se declaran equivalentes y los **tests**
> importan los G14 (precedente INC-03/04, `tests/integration/membresia-congelacion.test.ts:44`).

### Endpoints

| # | Metodo | Path | Roles permitidos | Exito | Schema (respuesta) | Criterios | Contrato |
|---|---|---|---|---|---|---|---|
| 1 | `POST` | `/clientes/:clienteId/servicios-personalizado` | `DUENO`, `RECEPCIONISTA` (DEC-017) | 201 | DTO de vigencia (`servicioPersonalizadoVigenciaSchema` G14 + campos aditivos `INC05-CONF-04`) | `INC05-PER-01` | **Ratificado 2026-10-20**: espejo de `POST /clientes/:clienteId/membresias-gym` (`membresia.ts:135-181`) |
| 2 | `GET` | `/clientes/:clienteId/servicios-personalizado` | `DUENO`, `RECEPCIONISTA` | 200 | `{ servicios: [...], fechaActual }` (`listarServicioPersonalizadoSchema`) | `INC05-PER-02`, `INC05-PER-04` | **Ratificado 2026-10-20**: espejo de `GET .../membresias-gym` (`membresia.ts:125-133`, `orderBy fechaInicio desc` via `membresia.service.ts:410`) **+ 2 correcciones de ratificacion**: (i) `where { clienteId, tipoServicio: "PERSONALIZADO" }` (incompat. #1); (ii) **404 `Cliente no encontrado`** si el cliente no existe (G14 `HU13-C02a`) — **divergencia deliberada** del espejo gym, que no chequea y devuelve `200 []` |
| 3 | `PATCH` | `/clientes/:clienteId/servicios-personalizado/:servicioId` | `DUENO`, `RECEPCIONISTA` | 200 | DTO de vigencia | `INC05-PER-01` (rama 8 + sub-rama DEC-047) | **Ratificado 2026-10-20**; **incluido por DEC-046 = (a)**: espejo de `PATCH .../membresias-gym/:membresiaId` (`membresia.ts:183-229`) + regla **DEC-047** con el **orden de reglas del cuerpo ratificado en "Detalle por endpoint"** (correccion C2: preserva `membresia-validacion.test.ts:198-240`, base 536) |
| 4 | `POST` | `/clientes/:clienteId/servicios-nutricion` | `DUENO`, `RECEPCIONISTA` | 201 | `servicioNutricionVigenciaSchema` G14 **+ campos aditivos `INC05-CONF-04`** (simetria con #1, correccion de ratificacion) | `INC05-NUT-01` | **Ratificado 2026-10-20** (espejo de #1) |
| 5 | `GET` | `/clientes/:clienteId/servicios-nutricion` | `DUENO`, `RECEPCIONISTA` | 200 | `{ servicios: [...], fechaActual }` (`listarServicioNutricionSchema`) | `INC05-NUT-02`, `INC05-NUT-04` | **Ratificado 2026-10-20** (espejo de #2 con sus **2 correcciones**: filtro `tipoServicio: "NUTRICION"` y 404 de cliente) |
| 6 | `PATCH` | `/clientes/:clienteId/servicios-nutricion/:servicioId` | `DUENO`, `RECEPCIONISTA` | 200 | DTO de vigencia | `INC05-NUT-01` (rama 8 + sub-rama DEC-047) | **Ratificado 2026-10-20**; **incluido por DEC-046 = (a)** (espejo de #3, con **DEC-047** y el **orden de reglas C2**) |
| 7 | `GET` | `/clientes/:id` (ficha existente, `routes/clientes.ts`) | staff; `CLIENTE` self-only | 200 | DTO ficha existente: la relacion `membresias` ya trae `tipoServicio` y `estado` por fila (`cliente.service.ts:93-99,373-375`) | `INC05-PER-04`, `INC05-NUT-04` | **Ratificado 2026-10-20**: aditivo sin cambio de contrato (los campos ya estan: `cliente.service.ts:93-99,373-375` traen `tipoServicio` y `estado` por fila); verificacion de las filas personalizado/nutricion con su `tipoServicio` en `INC05-PER-04`/`NUT-04` |
| 8 | UI | `/clientes/[id]` (`club-beasts-web/src/app/clientes/[id]/page.tsx:339` -> `MembershipSection.tsx`) | sesion staff | render | consume #2/#4/#7 | `INC05-PER-04`, `INC05-NUT-04` | **DEC-045 = (b)**: etiquetar/filtrar por `tipoServicio`; sin vista unificada HU-07 |
| 9 | (ya existente) | `POST/POST/PATCH /clientes/:clienteId/vigencias/:vigenciaId/{congelar,descongelar,congelacion}` (INC-02, `membresia.ts:253-379`) | `DUENO`, `RECEPCIONISTA` | 200 | DTO de vigencia | `INC05-PER-03` (siempre) y `INC05-NUT-03` (**incluido por DEC-042**) | **Ratificado 2026-10-20 con correccion C1**: `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}` (DEC-042) **no es el unico cambio**: las consultas de "otros periodos" de `congelarVigencia` (`membresia.service.ts:772-778`) y `editarCongelacion` (`:938-944`) **no filtran `tipoServicio`**, asi que con un cliente mixto (GYM solapado + PERSONALIZADO/NUTRICION) producen un `409 MEMBRESIA_SOLAPADA` espurio **(correccion de ratificacion 2026-10-20)**: hay que filtrar por tipo en ambas (regresion sobre codigo aceptado, ver "Correcciones de ratificacion" y pruebas de regresion); `NUT-03` se observa por este endpoint |

### Detalle por endpoint

- **#1/#4 `POST`**: identico a `membresia.ts:135-181` con tres diferencias de
  contrato: (i) el recurso es `servicios-personalizado` / `servicios-nutricion`;
  (ii) la fila se crea con **`tipoServicio` explicito** (`"PERSONALIZADO"` /
  `"NUTRICION"`, hoy `crearMembresia` crea con el default `"GYM"`,
  `membresia.service.ts:458-466`); (iii) el mapa de errores nuevo (`SERVICIO_*`,
  decidido por **DEC-044**). El **solape se evalua solo contra vigencias del mismo
  `tipoServicio`** (DEC-004: servicios separados) dentro de la misma transaccion
  (patron `INC00-MEM-02`). Auditoria `CREACION` version 1 via `registrarCambio`
  (patron `INC00-MEM-04`).
- **#2/#5 `GET`**: `{ servicios, fechaActual }` con `estado` calculado por
  `calcularEstado(fechaInicio, fechaFin, hoy, pausasActivas(cambios))` — la misma
  fuente unica que gym, portal y recepcion (precedente `VEN-05`), de modo que
  `CONGELADO` sale automatico cuando hay pausa vigente. **Correcciones de
  ratificacion 2026-10-20 (C6)**: (i) el `where` es
  `{ clienteId, tipoServicio: "PERSONALIZADO" | "NUTRICION" }` — el espejo
  `listarMembresias` (`membresia.service.ts:404-416`) **no filtra tipo** porque
  hasta ahora solo existian filas `GYM`; (ii) si el cliente no existe responde
  **404 `Cliente no encontrado`** (G14 `HU13-C02a`/`HU14-C02a`), **divergencia
  deliberada** del espejo gym (`membresia.ts:125-133` no chequea y devuelve
  `200 []`); (iii) la clave de respuesta es **`servicios`** (G14
  `listarServicio*Schema`), no `membresias`.
- **#3/#6 `PATCH`** (**incluido por DEC-046 = (a)**): cuerpo `{ fechaInicio?,
  fechaFin?, version }` (`updateServicioPersonalizadoSchema` /
  `updateServicioNutricionSchema` G14); pertenencia, version, orden de fechas y
  solape del **mismo tipo** verificados dentro de la transaccion (patron
  `INC00-MEM-03`); el arbitro de concurrencia es la restriccion unique
  `(membresiaId, version)` de la tabla de auditoria (`MembresiaGymCambio`,
  `P2002 -> SERVICIO_CONFLICTO`). **Regla de negocio DEC-047 (200, sin codigo de
  error nuevo)**: si el cuerpo trae **solo `fechaInicio`**, `fechaFin` se mueve
  automaticamente por el **mismo delta de dias**, conservando la duracion
  inclusiva exacta del plan (ej. plan de 30 dias: inicio `2026-10-20` -> fin
  `2026-11-18`; mover el inicio al 21 -> fin **`2026-11-19`**; volver al 20 ->
  fin **`2026-11-18`**). La duracion **solo** cambia si `fechaFin` viene
  explicitamente en el cuerpo. Si vienen las dos fechas, se validan tal cual
  (orden `fin >= inicio` y solape del mismo tipo). Esta regla **tambien aplica al
  `PATCH` de gym** (regresion sobre codigo aceptado — ver riesgo `INC05-R11`).
  **Correcciones de ratificacion 2026-10-20 (C2/C6)**: la **pertencia** se
  resuelve como `clienteId` **+ `tipoServicio`** (una fila de otro tipo ->
  `404 Servicio no encontrado`); el **orden de reglas del cuerpo** es el fijado en
  "Orden de evaluacion" (paso 4: fechas efectivas, con la validacion
  `inicioNuevo <= finPersistido -> 400` **antes** de desplazar `fechaFin`; la
  auditoria `EDICION` registra las fechas **efectivas**); **DEC-047 no se aplica**
  al `PATCH .../vigencias/:vigenciaId/congelacion` (`membresia.ts:338-380`), que
  conserva la formula `fechaFinTrasEdicion` de DEC-024
  (`membresia.service.ts:105-116`).
- **#7 ficha**: sin cambio de contrato; el criterio se verifica con que la fila
  nueva aparezca en `membresias` con `tipoServicio` distinto de `GYM` y `estado`
  calculado. **No** se agrega `historialEstados` ni campos nuevos.
- **#8 UI**: **DEC-045 = (b)**; `MembershipSection` pasa a etiquetar por
  `tipoServicio` (o a consumir #2/#4 segun decida `frontend-developer` dentro del
  contrato ratificado).

### Orden de evaluacion (deterministico; espejo de INC-04 `CONF-03`)

> El primer paso que aplica responde y se detiene; **sin escritura** en 400/401/403/404/409.

- **`POST` (#1/#4)**: `401/403` (preHandler `authenticateRoles`) -> `400` params
  (`clienteId`) -> `400` body (Zod, **primer** error) -> `404` (cliente) -> `409
  CLIENTE_INACTIVO` (**servicio**, antes del solape, `CONF-06`) -> `409
  SERVICIO_SOLAPADA` -> `201`.
- **`GET` (#2/#5)**: `401/403` -> `400` params -> `404` -> `200`.
- **`PATCH` (#3/#6)**: `401/403` -> `400` params (`clienteId`, `servicioId`) ->
  `400` body (Zod: fechas y `version`) -> `404` (cliente; luego pertenencia del
  servicio) -> `409 SERVICIO_CONFLICTO` (version) -> `409 SERVICIO_SOLAPADA`
  (nuevo rango solapado del mismo tipo) -> `200`. **Sin** guarda
  `CLIENTE_INACTIVO` (`CONF-02`). **Regla DEC-047: ratificada con orden fijado
  (correccion C2, 2026-10-20)** — el orden dentro del `200` es: (4) resolver
  fechas efectivas [(a) las dos explicitas -> manda lo explicito; (b) solo
  `fechaFin` -> manda y se valida contra el inicio persistido; (c) **solo
  `fechaInicio` -> `400 Fecha fin no puede ser anterior a fecha de inicio` si
  `nuevoInicio > fechaFin persistida` (paso ANTES del solape; preserva
  `membresia-validacion.test.ts:198-240`), si no -> desplazar `fechaFin` por
  `delta = nuevoInicio - inicioPersistido`; (d) ninguna -> sin cambio] -> (5)
  `409 SERVICIO_SOLAPADA` del mismo tipo sobre las fechas efectivas -> (6)
  escritura condicional `version + 1` + auditoria `EDICION` con las fechas
  **efectivas** -> `200`. Ningun paso de error nuevo: los 400 siguen siendo
  Zod/version y la condicion de orden de fechas de la tabla.
- **Congelacion (#9)**: **orden corregido por ratificacion (C3, 2026-10-20)** —
  el orden que fijaba INC-02/esta spec omitia pasos; el canon es el de G14
  (`HU-15-criterios-aceptacion.md:141-171`): `401/403` -> `400` params -> `400`
  body (Zod) -> regla post-Zod `fechaFin >= hoy` (**solo en congelar y editar,
  no en descongelar**) -> `404` -> `409 MEMBRESIA_CONFLICTO` (version) -> `409
  CONGELACION_NO_PERMITIDA` (tipo, fuera de `TIPOS_CONGELABLES`) -> `409
  MEMBRESIA_VENCIDA` -> (`409 CONGELACION_NO_PERMITIDA` rango / `409
  MEMBRESIA_SOLAPADA` / `409 CONGELACION_INEXISTENTE`) -> `200`.

### Errores (tabla consolidada; un `code` = un unico **status**)

> Mensajes marcados **(G14)** = literales de los schemas/criterios de HU-13/HU-14;
> **(src)** = textos exactos del codigo actual. Donde no hay fuente, el texto se
> **fija aqui** (patron INC-03/04) y lo ratifica `backend-developer`.

| Status | `code` | Condicion | Mensaje | Endpoint |
|---|---|---|---|---|
| 400 | `VALIDATION_ERROR` | `clienteId` ausente en params | `clienteId es requerido` (patron `membresia.schema.ts`) | #1-#6 |
| 400 | `VALIDATION_ERROR` | `fechaInicio` ausente/vacia | `Fecha de inicio es requerida` **(G14 = src)** | #1, #3, #4, #6 |
| 400 | `VALIDATION_ERROR` | `fechaFin` ausente/vacia | `Fecha fin es requerida` **(G14 = src)** | #1, #3, #4, #6 |
| 400 | `VALIDATION_ERROR` | dia inexistente o formato distinto de `YYYY-MM-DD` | `Fecha de inicio debe ser una fecha válida (YYYY-MM-DD)` / `Fecha fin debe ser una fecha válida (YYYY-MM-DD)` **(G14 = src)** | #1, #3, #4, #6 |
| 400 | `VALIDATION_ERROR` | `fechaFin < fechaInicio` **o** (solo `fechaInicio` en PATCH) `fechaInicio nueva > fechaFin persistida` **(correccion de ratificacion 2026-10-20, C2)** | `Fecha fin no puede ser anterior a fecha de inicio` **(G14 = src; patron `membresia.ts:204-209`)** | #1, #3, #4, #6 |
| 400 | `VALIDATION_ERROR` | `servicioId` ausente en params **(correccion de ratificacion 2026-10-20, C5)** | `servicioId es requerido` (patron `membresia.ts:204-209`, `membresiaId es requerido`) | #3, #6 |
| 400 | `VALIDATION_ERROR` | `version` ausente/0/no entero en PATCH | `Versión es requerida` / `Versión debe ser un entero` / `Versión debe ser positiva` **(G14)** | #3, #6 (**incluidos por DEC-046**) |
| 401 | `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` | sesion (preHandler) | literales existentes `src/plugins/auth.ts` | #1-#6, #9 |
| 403 | `AUTH_FORBIDDEN` | rol fuera de `DUENO`/`RECEPCIONISTA` (p. ej. `CLIENTE`) | `No tienes permisos para realizar esta acción.` (**src**) | #1-#6, #9 |
| 404 | `NOT_FOUND` | cliente inexistente | `Cliente no encontrado` (**src**, `membresia.ts`/`clientes.ts`) | #1-#6 |
| 404 | `NOT_FOUND` | servicio/pertenencia inexistente en PATCH | `Servicio no encontrado` (**fijado aqui**: patron `Membresía no encontrado` de `membresia.ts:32-36` sin el literal de gym) | #3, #6 |
| 409 | `CLIENTE_INACTIVO` | cliente `INACTIVO` en POST (servicio, antes del solape) | `El cliente está inactivo. Reactíveolo antes de asignar servicios nuevos.` **(G14, literal ya implementado en INC-04)** | #1, #4 |
| 409 | `SERVICIO_SOLAPADA` | solape inclusive con vigencia **del mismo tipo** (`nuevoInicio <= finPrevio && inicioPrevio <= nuevoFin`, DEC-008) | `Las fechas se solapan con un período existente` **(G14; texto = `MEMBRESIA_SOLAPADA` de `membresia.ts:42-46`, `code` nuevo ratificado en alcance por **DEC-044**) | #1, #3, #4, #6 |
| 409 | `SERVICIO_CONFLICTO` | `version` enviada != version vigente / P2002 de auditoria | `Los datos fueron modificados por otro usuario. Recargue e intente nuevamente.` **(texto = `MEMBRESIA_CONFLICTO` de `membresia.ts:37-41`, `code` nuevo ratificado en alcance por **DEC-044**; `PATCH` incluido por **DEC-046**) | #3, #6 |
| 409 | `CONGELACION_NO_PERMITIDA` | congelar un tipo fuera de `TIPOS_CONGELABLES` — con **DEC-042** (`{GYM, PERSONALIZADO, NUTRICION}`) **ya no aplica a `NUTRICION`**; se conserva como guarda generica existente de `src` | `La congelación no está permitida para este tipo de servicio` (**src**, ya implementado) | #9 |
| 409 | `MEMBRESIA_VENCIDA` / `CONGELACION_NO_PERMITIDA` (rango) / `CONGELACION_INEXISTENTE` | reglas INC-02 (DEC-022) | literales **src** intactos | #9 |

Notas:

- **Sin escritura** en ninguno de los 400/401/403/404/409 de esta tabla.
- **DEC-047 no agrega filas de error nuevas**: mover `fechaInicio` y desplazar
  `fechaFin` es comportamiento del **200** del `PATCH`; los 400 de fechas del
  `PATCH` son: orden de las dos fechas explicitas, `fechaInicio` unica > `fechaFin`
  persistida (condicion extendida, C2), formato/requeridas y `version`
  **(correccion de ratificacion 2026-10-20, C5)**.
- **Mapa de errores de las rutas nuevas**: `#1-#6` usan un mapa **propio**
  `SERVICIO_*` (espejo del `RESPUESTAS_ERROR` de `membresia.ts:28-88`, que **no
  se exporta y no se modifica** — DEC-044/046); `registrarCambio` de los servicios
  nuevos debe capturar `P2002 -> 409 SERVICIO_CONFLICTO` **antes** de
  `mapPrismaError` (patron `membresia.service.ts:397-399`) **(correccion de
  ratificacion 2026-10-20, C5)**.
- **`CLIENTE_INACTIVO` no aplica a PATCH** (`INC05-CONF-02`): editar fechas de una
  vigencia existente no es "asignar un servicio nuevo".
- **No duplicado**: el 409 `CLIENTE_INACTIVO` y los 400 de fechas ya estan
  **probados** en HU-12/INC-04; aqui se verifican **en las rutas nuevas** (ramas de
  error de `PER-01`/`NUT-01`) sin cobrar el punto de HU-08 ni el de HU-12.

### Modelo de datos propuesto (tarea `database-admin`, tras ratificacion)

**Opcion recomendada (configuracion, sin migracion)**: reutilizar el modelo
**`MembresiaGym`** con su columna ya existente
`tipoServicio String @default("GYM") // GYM | PERSONALIZADO | NUTRICION (DEC-004)`
(`prisma/schema.prisma:81`), creando filas con `tipoServicio = "PERSONALIZADO"` /
`"NUTRICION"`.

Motivos:

1. El propio schema ya anuncia los tres tipos (DEC-004); no hay columna nueva.
2. `calcularEstado`, `pausasActivas`, `toDTO`, `hasOverlap`, `registrarCambio` y la
   tabla de auditoria `MembresiaGymCambio` son **genericos** por fila.
3. Los endpoints de congelacion **ya existentes** (`/vigencias/:vigenciaId/...`)
   funcionan sobre la misma tabla: `INC05-PER-03` queda casi sin codigo nuevo y
   `INC05-NUT-03` (**incluido por DEC-042**) se reduce a `TIPOS_CONGELABLES` +
   el filtro de "otros periodos" que **hoy no existe** (correccion **C1**,
   `membresia.service.ts:772-778,938-944`).
4. **Cero migracion** (menos riesgo R-01/R-02 de SQLite vs PostgreSQL).

**Modelo RATIFICADO por `backend-developer` 2026-10-20** (punto 5 de la
ratificacion): se reutiliza `MembresiaGym` con `tipoServicio`; la alternativa de
modelos nuevos queda descartada tal como esta especificada.

**Alternativa descartada salvo veto de `backend-developer`/`database-admin`**:
modelos nuevos `ServicioPersonalizado` / `ServicioNutricion` — exige migracion
portable, **generalizar** `congelarVigencia`/`descongelarVigencia`/`editarCongelacion`
(hoy `membresiaGym.findUnique`), replicar `registrarCambio` y duplicar DTOs; con
`PEND-01` ya resuelta como **DEC-042 = (a)**, esta alternativa seguiria subiendo el
impacto de "config + pruebas" a "codigo" frente al modelo compartido.

**Sin restriccion nueva de solape a nivel de base**: el solape se resuelve en la
transaccion (como gym, `INC00-MEM-02`); `@@unique([membresiaId, version])` de
auditoria ya existe.

### Incompatibilidades con criterios/schemas G14 y con `src/`
> **Actualizacion 2026-10-20**: las incompatibilidades **#2, #4 y #5** (las que
> dependian de decision de Producto) quedaron **resueltas y enmiendadas** en los 4
> archivos G14 por `acceptance-criteria-analyst` (DEC-043, DEC-042/043, DEC-046);
> **#10** quedo **cerrada** por DEC-042. Las demas siguen abiertas para
> `backend-developer` / `test-engineer` (son de implementacion, no de decision).

| # | Incompatibilidad | Contrato final (fuente) | Cambio exigido |
|---|---|---|---|
| 1 | **Las rutas GYM existentes NO filtran `tipoServicio`**: `listarMembresias` (`membresia.service.ts:407-411`), la consulta de solape de `crearMembresia` (`:449-452`) y `editarMembresia` traen **todas** las filas del cliente; el portal y recepcion **si** filtran (`portal.ts:41`, `recepcion.ts:60,135`: `tipoServicio: "GYM"`, selector ratificado en INC-03). Si INC-05 escribe filas `PERSONALIZADO`/`NUTRICION`, `GET .../membresias-gym` devolveria tipos mezclados (y `MembershipSection.tsx:161` los pintaria como gym) y un solape cruzado entre tipos rechazaria creaciones validas | Filtrar `tipoServicio: "GYM"` en `listarMembresias`, en la consulta de solape de `crearMembresia` y en la pertenencia/consulta de `editarMembresia`; las rutas nuevas filtran su propio tipo | **`backend-developer` en la ratificacion** (cambio sobre codigo **aceptado**, comportamiento identico hoy porque todas las filas existentes son `GYM` por default); exige pruebas de **regresion** explicitas de HU-12/INC-00 y de INC-02/04. **Ampliacion por ratificacion (correccion C1, 2026-10-20)**: la incompatibilidad **no estaba completa** — `congelarVigencia` (`membresia.service.ts:772-778`) y `editarCongelacion` (`:938-944`) consultan "otros periodos" **sin filtro `tipoServicio`**, asi que con un cliente mixto (fixture **F8**) devuelven `409 MEMBRESIA_SOLAPADA` **espurio**; hay que filtrar por tipo en ambas. **Pruebas de regresion exigidas**: (a) congelar/editar con GYM solapado + `PERSONALIZADO`/`NUTRICION` sin 409 cruzado; (b) `PATCH` nuevo sobre fila de otro tipo -> `404`; (c) `GET` por tipo no contaminado con datos mixtos; (d) mantener verdes `membresia-validacion.test.ts:198-240` y `vencimiento.test.ts:352-381` bajo DEC-047 |
| 2 | G14 usa el literal **`CONGELADA`** en `HU-13-schemas.ts:118` / `HU-14-schemas.ts:118` y en sus tablas `.md`, pero el codigo y la prosa de los mismos `.md` usan **`CONGELADO`** (`MembresiaDTO.estado`, `calcularEstado`, `resolverEstadoAcceso`, `estadoAccesoGymSchema`) | Literal final = **DEC-043: `CONGELADO`** (2026-10-20) | **ENMENDA EJECUTADA 2026-10-20**: enum + tablas + prosa de los 4 archivos G14 (`CONGELADA` -> `CONGELADO`) |
| 3 | Los codigos `SERVICIO_SOLAPADA` / `SERVICIO_CONFLICTO` **no existen** en `src/` (solo `MEMBRESIA_SOLAPADA`/`MEMBRESIA_CONFLICTO`, `membresia.ts:37-46`) | **DEC-044 = (a)**: codigos propios (2026-10-20) | GREEN: mapa `RESPUESTAS_ERROR` en las rutas nuevas (o modulo compartido); RED aserta `code` exacto |
| 4 | `HU-13-criterios-aceptacion.md:12,56` y `HU-14-criterios-aceptacion.md:12,56` dicen que `C02b` "no se cierra en INC-05 salvo que HU-15 entre en alcance" y hablan de HU-15 "aun sin implementar" — **HU-15 esta aceptada** (INC-02, 4/4) y **DEC-042** hizo `NUTRICION` congelable | `INC05-PER-03` y `INC05-NUT-03` **ambos factibles** en INC-05 | **ENMENDA EJECUTADA 2026-10-20**: nota de alcance y fila de trazabilidad de `C02b` actualizadas en los dos `.md` (HU-13 y HU-14 factibles, DEC-042/DEC-043) |
| 5 | Contradiccion interna de ambos G14: "Que NO cubre ... edicion con control de concurrencia (**ver rama 8**)" vs fila 8 de cobertura de ramas + frontera `version (PATCH)` + path `PATCH` en P-06 | **DEC-046 = (a)**: incluir `PATCH` (2026-10-20) | **ENMENDA EJECUTADA 2026-10-20**: frase "Que NO cubre" corregida en `HU13-C01` para que no contradiga la rama 8 (el `PATCH` si esta en alcance); se anadio **DEC-047** como comportamiento del `PATCH` |
| 6 | El DTO del G14 no trae `tipoServicio` ni `cambios`; el DTO real (`MembresiaDTO`) **si** los trae | `INC05-CONF-04`: aditivo; los schemas G14 validan subconjunto (Zod ignora extras) | Sin accion de enmienda; el RED valida con G14 **y** aserta los campos extra |
| 7 | `src/` **no puede importar** los G14 (`rootDir: "./src"`) | Equivalentes en `src/schemas/` (nuevo `servicio.schema.ts` o parametrizacion del `membresia.schema.ts` existente) y los tests importan los G14 | `backend-developer` (GREEN) + `test-engineer` (RED importa G14, precedente INC-03/04) |
| 8 | **No existen `.feature` ni tests** de HU-13/HU-14; los `.feature` del G14 estan marcados "borrador — NO crear `.feature` todavia" | Los crea `test-engineer` en el RED (regla INC-02/03/04); guard `INC00_SCENARIO_COUNT = 153` se actualiza en GREEN | `test-engineer`; guard actualizado **solo** en GREEN (precedente GAP-RED-03) |
| 9 | La ficha (`selectFichaCliente.membresias`) **no filtra** por tipo (`cliente.service.ts:93-99`) — es deseable para `PER-04`/`NUT-04`, pero la web `MembershipSection` consume la **ruta** de membresias (ver #1), no ese campo | Ficha: expone todas las filas **con** `tipoServicio` (aditivo, ya esta); web: **DEC-045 = (b)** (pintado minimo etiquetado por tipo) | Ratificar en backend; UI por `frontend-developer` bajo DEC-045 |
| 10 | Si `PEND-01 = (a)`, el alcance de **DEC-023** cambia ("nutricion queda fuera") y esa decision ya esta **aprobada** en `decisiones.md` | **CERRADA 2026-10-20**: **DEC-023 enmendada por DEC-042** (el orquestador registro la enmienda) | **Sin accion pendiente**: la fila queda como historial; `INC05-NUT-03` esta **incluido**. **Salvedad por ratificacion (correccion C4, 2026-10-20)**: el impacto **no** es "config + pruebas" en el sentido de "sin tocar nada existente" — cambiar `TIPOS_CONGELABLES` (`membresia.service.ts:285-289`) **rompe 3 tests aceptados** que asertan `NUTRICION -> 409 CONGELACION_NO_PERMITIDA` (`membresia-congelacion.test.ts:789-810`, `membresia-descongelacion.test.ts:712-722`, `membresia-editar-congelacion.test.ts:812-822`) y G14 de HU-15 aun encodifica el alcance pre-DEC-042 (`HU-15-criterios-aceptacion.md:60,126,202-224,810,829,995`, `HU-15-schemas.ts:22,431-433`): en GREEN hay que **enmendar** (no borrar) esos 3 tests con autorizacion del orquestador y enmendar G14 de HU-15 (fuera del alcance de `backend-developer`); `INC05-CONF-06` necesita la salvedad "536 tests, **3 enmendados por DEC-042**"; la guarda `CONGELACION_NO_PERMITIDA` (tipo) queda **inalcanzable via API** y se conserva como guarda generica |

### Correcciones de ratificacion (2026-10-20, `backend-developer`)

Veredicto: **RATIFICA CON CORRECCIONES**. Correcciones aplicadas a esta seccion
del contrato (ninguna fuera de `spec.md`):

| # | Correccion | Evidencia | Dnde quedo reflejada |
|---|---|---|---|
| **C1** | Incompatibilidad #1 incompleta: `congelarVigencia` y `editarCongelacion` consultan "otros periodos" **sin filtro `tipoServicio`** -> `409 MEMBRESIA_SOLAPADA` espurio con clientes mixtos (F8) | `membresia.service.ts:772-778,938-944` | fila #9 de Endpoints, fila #1 de Incompatibilidades, motivo 3 del Modelo de datos; + pruebas de regresion (a)-(d) |
| **C2** | Orden de reglas del cuerpo del `PATCH` (DEC-047) fijado: Zod -> 404 pertenencia (`clienteId`+`tipoServicio`) -> 409 `SERVICIO_CONFLICTO` -> fechas efectivas (4 casos, con **validacion pre-desplazamiento** `inicioNuevo <= finPersistido` -> 400) -> 409 `SERVICIO_SOLAPADA` -> escritura `version+1` + auditoria con fechas **efectivas** -> 200; **no** aplica a `PATCH .../congelacion` (DEC-024) | `membresia.ts:183-229`; `membresia-validacion.test.ts:198-240` (400) y `vencimiento.test.ts:352-381` (200) fijan el orden; `membresia.service.ts:105-116,397-399` | Detalle #3/#6 y Orden de evaluacion `PATCH` |
| **C3** | Orden de evaluacion de la congelacion (#9) corregido al canon G14 (faltaban `MEMBRESIA_CONFLICTO` por version y `CONGELACION_NO_PERMITIDA` por tipo; la regla `fechaFin >= hoy` es solo de congelar/editar) | `HU-15-criterios-aceptacion.md:141-171` | Orden de evaluacion `Congelacion (#9)` |
| **C4** | DEC-042 **no** es "config + pruebas" sin tocar nada: `TIPOS_CONGELABLES` rompe 3 tests aceptados y G14 de HU-15 aun encodifica el alcance pre-DEC-042; `INC05-CONF-06` requiere salvedad | `membresia-congelacion.test.ts:789-810`, `membresia-descongelacion.test.ts:712-722`, `membresia-editar-congelacion.test.ts:812-822`; `HU-15-criterios-aceptacion.md:60,126,202-224,810,829,995`, `HU-15-schemas.ts:22,431-433` | fila #10 de Incompatibilidades |
| **C5** | Tabla de errores: fila nueva `400 VALIDATION_ERROR` por `servicioId` ausente; condicion de `fechaFin < fechaInicio` extendida al caso de `fechaInicio` unica; nota de "unicos 400" corregida; nota de mapa `SERVICIO_*` propio + `P2002 -> SERVICIO_CONFLICTO` antes de `mapPrismaError` | `membresia.ts:204-209` (patron params), `membresia.ts:28-88` (mapa no exportado), `membresia.service.ts:397-399` | tabla de Errores + Notas |
| **C6** | Divergencias deliberadas del espejo gym en `GET` y `PATCH`: filtro de tipo propio + **404 de cliente inexistente** (gym devuelve `200 []`); clave de respuesta **`servicios`**; pertenencia del `PATCH` incluye `tipoServicio` | `membresia.ts:125-133` (sin chequeo), `HU13-C02a`, `listarServicio*Schema` G14 | filas 2/5 de Endpoints y Detalle #2/#5 |

## Fixtures y datos de prueba

Aislamiento: **DEC-012** (SQLite aislado por ejecucion) y **DEC-013** (fechas
relativas a `getTodayBogota()`). Cedulas con prefijo por suite (precedente INC-03/04).

| # | Fixture | Creacion | Para que prueba |
|---|---|---|---|
| F1 | Cliente `ACTIVO` con **cero** vigencias de personalizado/nutricion | API HU-04 | `NO_CONTRATADO`, happy paths de `POST`, 200 lista vacia |
| F2 | Cliente `ACTIVO` con 1 vigencia `PERSONALIZADO` vigente (`hoy-10 .. hoy+10`) | `POST` nuevo | `ACTIVA`, dia final inclusivo, listado, ficha |
| F3 | Cliente con **2 periodos** de personalizado (renovacion, gap de 1 dia) | 2 `POST` consecutivos | DEC-007 (no sobrescribe), orden `fechaInicio desc`, conteo 2 |
| F4 | Vigencia que termina **ayer** / **hoy** / empieza **manana** (3 filas, tipos variados) | directa en BD o `POST` con fechas relativas | bordes `VENCIDA` / `ACTIVA` / `PROGRAMADA` (DEC-006) |
| F5 | Cliente `INACTIVO` con motivo previo (heredada INC-04 F2) | directa en BD | 409 `CLIENTE_INACTIVO` en `POST` de ambos servicios |
| F6 | Vigencia `PERSONALIZADO` con **pausa vigente** creada por `/congelar` (INC-02) | `POST .../vigencias/:id/congelar` | `INC05-PER-03` (`CONGELADO`) |
| F7 | Vigencia `NUTRICION` con pausa vigente (**incluida por DEC-042**) | idem sobre fila `NUTRICION` | `INC05-NUT-03` (`CONGELADO` en nutricion) |
| F8 | Cliente con vigencia `GYM` **y** `PERSONALIZADO`/`NUTRICION` simultaneas (solape entre tipos) | `POST` mixto | incompatibilidad #1: el solape es **por tipo**, la lista GYM no se contamina |
| F9 | Staff `DUENO` y `RECEPCIONISTA`; token `CLIENTE`; token vencido | seed existente | permisos y 401/403 de todas las rutas |
| F10 | Cliente inexistente + cuerpos invalidos (`""`, `2026-02-30`, `abc`, `fin < inicio`) | - | 404 y los 5 mensajes de 400 |

Supuestos: cada test crea sus fixtures y limpia al terminar (borrar
`MembresiaGymCambio` **antes** que `MembresiaGym`, precedente `world.ts` de INC-03);
sin dependencia entre archivos; fechas siempre relativas a hoy (Bogota); las
fixtures de personalizado/nutricion **no** deben alterar los conteos de las
suites GYM existentes (filtrado, incompatibilidad #1).

## Evidencia requerida por criterio

| Criterio(s) | Integracion API (Vitest) | Unit/UI (Vitest web) | E2E (Playwright) | Gherkin (`features/*.feature`) |
|---|---|---|---|---|
| `PER-01`, `NUT-01` | si (201, 5 mensajes 400, solape 409 por tipo, renovacion, 404, 403, 409 inactivo, rama 8 incluida por DEC-046, **sub-rama DEC-047**: mover `fechaInicio` +1 dia con plan de 30 dias -> `fechaFin` +1; retroceder el inicio -> `fechaFin` retrocede; editar `fechaFin` explicito -> la duracion cambia lo pedido) | no | no | si |
| `PER-02`, `NUT-02` | si (estados con fechas fijas: 0 filas, dia final, dia+1, futuro) | no | no | si |
| `PER-03` | si (`CONGELADO` con pausa + regreso al calculo normal) | no | no | si |
| `NUT-03` | si (espejo de `PER-03` sobre fila `NUTRICION`, incluido por DEC-042) | no | no | si |
| `PER-04`, `NUT-04` | si (listado propio + ficha con `tipoServicio`/`estado`) | **si** (DEC-045 = (b): etiquetado/filtrado por tipo) | **si** (DEC-045 = (b): ficha con 2 tipos en navegador) | si |
| `PER-05`, `NUT-05` (EXCLUIDOS) | no (fuera de INC-05) | no | no | no |
| **Todos** | `npx tsc --noEmit` (0), `npx vitest run` (base **536/536** intacta), `npm run test:gherkin` (base **153/153**, guard `153`) | `npx tsc --noEmit`, `npx vitest run` (base **183/183**), `npm run build` | `npx playwright test` (base **56/56**) | `npx prisma migrate status` (base **9/0 sin drift**; 9/0 si no hay migracion) |
| **Revision** | `code-reviewer`: permisos DEC-017, no duplicado (HU-12/15/16/08, `CONF-06`), filtro `tipoServicio` (incompat. #1), regresion de la base, pruebas sin aserciones vacias | | | |

## Riesgos

| ID | Riesgo | Impacto | Mitigacion | Responsable |
|---|---|---|---|---|
| `INC05-R01` | ~~`PEND-01 = (b)` excluye `NUT-03`~~ **CERRADO 2026-10-20 (DEC-042 = (a))** | `NUT-03` **incluido**; sin perdida de cobertura del bullet 2 de HU-14 y sin enmienda del literal | Enmienda de DEC-023 registrada por el orquestador (DEC-042); queda solo la verificacion en RED/GREEN | Producto (resuelto) + Backend |
| `INC05-R02` | El **filtrado por `tipoServicio`** (incompatibilidad #1) toca servicios **aceptados** (HU-12, INC-00/02) | Regresion de la base certificada 536/153/183/56 | Guards incondicionales en RED; pruebas de regresion explicitas de membresias/congelacion; bateria completa antes/despues del GREEN | Backend + QA |
| `INC05-R03` | Duplico de puntos: congelacion, vencimiento, guarda INACTIVO y vista de ficha ya cobrados | Contar dos veces el mismo efecto (DEC-016) | Seccion "Regla de no duplicado"; criterios REF/ramas marcados; auditoria de cierre | Orquestador |
| `INC05-R04` | Fraccion parcial: `b4` de ambas HU excluido (`NUT-03` **ya no** corre riesgo: DEC-042 lo incluyo) | Hasta +6 pero **con reparto menor** si se excluye un criterio | El spec **no declara puntos**; el reparto exacto se fija en `auditoria-puntos-inc00.md` al cierre | Orquestador |
| `INC05-R05` | ~~`PEND-03`/`PEND-05` abren contrato nuevo~~ **decisiones cerradas (DEC-044/046)** y ~~contrato sin ratificar~~ **ratificado 2026-10-20 (C1..C6)** | RED escrito sobre un contrato que cambia en la ratificacion | Cerrado: contrato ratificado **antes** del RED (precedente INC-03/04); vigila C1/C2 en el GREEN | Backend + Orquestador |
| `INC05-R06` | ~~`PEND-02` cambia literales de enum~~ **CERRADO 2026-10-20 (DEC-043)**: `PROGRAMADA` + `CONGELADO` | Los `.feature` asertarian un literal vencido | Enmienda de G14 **ejecutada** 2026-10-20 (incompat. #2); el RED aserta los literales ya fijados | acceptance-criteria-analyst (hecho) + QA |
| `INC05-R07` | Alcance amplio (2 HU, 10 criterios, 6 rutas nuevas) | Criterios a medias que parecen cerrados | Una sola pasada de PENDs, contrato ratificado como gate, tabla de criterios con estado por ID | Orquestador |
| `INC05-R08` | Guard Gherkin `INC00_SCENARIO_COUNT = 153` debe subir con los escenarios nuevos | `test:gherkin` fallaria en el cierre | Actualizar el guard **unicamente** en GREEN (precedente INC-03/04) | test-engineer |
| `INC05-R09` | ~~Si `PEND-04 = (a)` y aun asi se filtra la ruta GYM, la ficha web **no** mostrara los servicios nuevos~~ **CERRADO 2026-10-20 (DEC-045 = (b))** | Bullet 3 visible solo en API | DEC-045 fija pintado minimo etiquetado por `tipoServicio`; sin vista unificada HU-07 | Producto (resuelto) + Frontend |
| `INC05-R10` | Flaky heredados `R-09`/`REV-01` (follow-up UX de INC-04, `PEND-004`) siguen abiertos | Bateria inestable al cerrar | No se arrastran al RED; si bloquean, se reportan al orquestador | test-engineer |
| `INC05-R11` | **DEC-047 es regresion sobre codigo aceptado**: la regla "mover `fechaInicio` desplaza `fechaFin` conservando la duracion inclusiva" aplica tambien al **`PATCH` de vigencias de gym** (HU-12/INC-00, `membresia.ts:183-229`, criterio ya aceptado) | Cambiar el comportamiento del `PATCH` de gym romperia pruebas aceptadas de HU-12 o, si no se aplica alla, dejaria dos comportamientos distintos de edicion | Prueba de **regresion explicita** del `PATCH` de gym (mover inicio +1 -> fin +1; retroceder -> retrocede; editar `fechaFin` explicito -> cambia la duracion) **sin cobrar puntos extra**: el criterio puntuable es `INC05-PER-01`/`NUT-01` (HU-13/14); lo de gym entra en la seccion de no duplicado | Backend + QA |

## Trazabilidad de decisiones aprobadas aplicadas

| Decision | Aplicacion en INC-05 |
|---|---|
| DEC-001 (roles) | PreHandlers `DUENO`/`RECEPCIONISTA`; 403 `CLIENTE` |
| DEC-004 (servicios separados) | Filtro de solape **por tipo**; rutas propias; contraparte de `tipoServicio` en `schema.prisma:81` |
| DEC-005 / DEC-006 (Bogota, inclusivos) | `getTodayBogota`, dia final `ACTIVA`, duracion minima 1 dia |
| DEC-007 (renovar = periodo nuevo) | Cada `POST` crea fila; `GET` devuelve ambos |
| DEC-008 (solape rechazado, gaps ok) | `409 SERVICIO_SOLAPADA` inclusive; `inicio = finPrevio + 1` -> 201 |
| DEC-011 / DEC-016 (evidencia, fraccion) | Este spec no declara puntos; `evidencia.md` exige ejecucion por criterio |
| DEC-012 / DEC-013 (aislamiento, fechas relativas) | Fixtures F1..F10 |
| DEC-017 (gestion DUENO + RECEPCIONISTA) | Roles de los 6 endpoints |
| DEC-018 / DEC-019 (rutina macro-meso-micro / plan plantilla simple) | Solo la dependencia `b4` queda en spec; **exclusion** de `PER-05`/`NUT-05` |
| DEC-021 (`PEND-003` ruta anamnesis) | Anamnesis fuera de alcance; ruta al 50% intacta |
| DEC-022 (reglas de rango de congelacion) | Intactas en #9; aqui solo se observan |
| DEC-023 (alcance congelacion: GYM + PERSONALIZADO) | Habilita `INC05-PER-03`; **ENMENDADA 2026-10-20 por DEC-042** (`{GYM, PERSONALIZADO, NUTRICION}`) -> `INC05-NUT-03` **incluido** |
| DEC-025 (acceso conservado en congelacion) | No se toca acceso/portal |
| DEC-026 / DEC-027 / DEC-030 (vencimiento, multi-servicio, ingresos) | No se re-cobran; regresion de su base |
| `CONF-06` INC-04 (guarda en el servicio) | `409 CLIENTE_INACTIVO` heredada a los `POST` nuevos |
| **DEC-042** (congelacion en NUTRICION; DEC-023 enmendada) | `TIPOS_CONGELABLES` = `{GYM, PERSONALIZADO, NUTRICION}`; `INC05-NUT-03` **incluido**; incompatibilidad #10 cerrada |
| **DEC-043** (`PROGRAMADA` + `CONGELADO`) | Literales de enum fijados en `PER-02/03` y `NUT-02/03`; enmienda G14 #2 ejecutada |
| **DEC-044** (paths y codigos `SERVICIO_*`) | Contrato de `PER-01`/`NUT-01` decidido (ratificacion backend pendiente) |
| **DEC-045 = (b)** (pintado minimo en ficha) | Alcance web de `PER-04`/`NUT-04` = etiquetado/filtrado por `tipoServicio` |
| **DEC-046 = (a)** (`PATCH` con concurrencia optimista) | Rama 8 incluida en `PER-01`/`NUT-01`; enmienda G14 #5 ejecutada |
| **DEC-047** (duracion inclusiva al mover `fechaInicio`) | Sub-rama de `PER-01`/`NUT-01` (endpoints #3/#6) + regresion `INC05-R11` sobre el `PATCH` de gym |

## Checklist de puerta LISTO

- [x] Spec con objetivo, alcance incluido/excluido y fuera de alcance explicito (este archivo).
- [x] Criterios `INC05-PER-01..05` e `INC05-NUT-01..05` con trazabilidad bullet -> criterio ISTQB G14 (10/10).
- [x] Contrato API propuesto (endpoints, cuerpos, errores, orden de evaluacion, modelo) — **ratificado 2026-10-20** (C1..C6 aplicadas).
- [x] Fixtures + supuestos de aislamiento (DEC-012/DEC-013).
- [x] Plantilla de evidencia (`evidencia.md`) y backlog (`tareas.md`).
- [x] Criterios ISTQB de HU-13/HU-14 existentes y referenciados (G14 cerrado 2026-10-08).
- [x] Fuera de alcance confirmado (b4 de ambas HU, anamnesis/DEC-021, INC-03/04 cerrados, HU-07, HU-12/15/16 aceptados).
- [x] Regla de **no duplicado** definida en este spec.
- [x] **`INC05-PEND-01..05` resueltas por Producto** y registradas en
  `docs/producto/decisiones.md` como **DEC-042..DEC-046** (2026-10-20).
- [x] Contrato **ratificado por `backend-developer`** (endpoints, mensajes exactos,
  orden, modelo, incompatibilidades #1..#10) — **ratificada 2026-10-20 con
  correcciones C1..C6, ver evidencia en el informe**.
- [x] `INC05-CONF-01..06` y la regla de no duplicado **ratificadas por el
  orquestador** en `decisiones.md` (2026-10-20).
- [x] **Enmiendas G14** derivadas de los PEND ejecutadas y commiteadas
  (incompatibilidades #2, #4 y #5 + **DEC-047** incorporada; **2026-10-20** por
  `acceptance-criteria-analyst`).
- [x] `DEC-023` **enmendada** por el orquestador — **DEC-042** (2026-10-20); no
  hizo falta enmendar el literal de HU-14 b2.

**Puerta LISTO CUMPLIDA (2026-10-20): 13/13 casillas.** El incremento paso a
**`LISTO`** el **2026-10-20**: decisiones de Producto resueltas (DEC-042..047),
contrato ratificado por `backend-developer` (C1..C6) y `INC05-CONF-01..06` +
no-duplicado registrados por el orquestador. **El RED queda habilitado**
(tareas 11-13 de `tareas.md`). (El conteo anterior `5/10` era el nominal de la
version inicial del checklist.)

## Plan de ejecucion por agente

| Paso | Agente | Entrega | Criterios | Depende de |
|---:|---|---|---|---|
| 1 | acceptance-criteria-analyst | `spec.md`, `tareas.md`, `evidencia.md` (este paquete) | todos | - (hecho 2026-10-20) |
| 2 | Orquestador + Producto | Resolver `INC05-PEND-01..05` -> `decisiones.md` (**DEC-042..046**) | `PER-01..04`, `NUT-01..04` | paso 1 — **hecho 2026-10-20** |
| 3 | acceptance-criteria-analyst | Enmiendas G14 exigidas por los PEND (incompatibilidades #2/#4/#5) + incorporacion de **DEC-047** | `PER-03`, `NUT-02/03`, `PER-01`, `NUT-01` | paso 2 — **hecho 2026-10-20** |
| 4 | backend-developer | Ratificar contrato (endpoints, mensajes, orden, modelo, incompatibilidades #1..#10) en este spec | todos | paso 2 — **hecho 2026-10-20 (RATIFICA CON CORRECCIONES C1..C6)** |
| 5 | Orquestador | Registrar `INC05-CONF-01..06` + no-duplicado; puerta **LISTO** | - | pasos 2-4 — **hecho 2026-10-20 (LISTO 13/13)** |
| 6 | test-engineer | **RED**: integracion API (`hu13-servicio-personalizado.test.ts`, `hu14-servicio-nutricion.test.ts`), unit/E2E web (DEC-045 = (b): **si aplica**), escenarios Gherkin (sin tocar `src/`) | todos los puntuables | paso 5 |
| 7 | database-admin | Solo si el modelo compartido **no** se ratifica: migracion de modelos nuevos + limpieza de FKs; si se ratifica, verificar esquema sin cambios | `PER-01`, `NUT-01` | paso 5 |
| 8 | backend-developer | **GREEN**: rutas + servicios de personalizado/nutricion, filtro `tipoServicio` (incompat. #1), mapa `SERVICIO_*`, guardas heredadas, regla **DEC-047** en el `PATCH` (incluida regresion de gym, `INC05-R11`) | `PER-01..04`, `NUT-01..04` | pasos 6-7 |
| 9 | frontend-developer | **DEC-045 = (b)**: etiquetado/filtrado por `tipoServicio` en la ficha | `PER-04`, `NUT-04` | paso 8 |
| 10 | test-engineer | **VERIFICADO**: bateria completa (base intacta), guard de gherkin, registro en `evidencia.md` | todos | paso 9 |
| 11 | code-reviewer | **REVISADO**: permisos, no duplicado, filtro por tipo, regresion, calidad de pruebas | todos | paso 10 |
| 12 | Orquestador | Certificacion: `avance.md`, `mvp.md`, `auditoria-puntos-inc00.md` (hasta +6, reparto DEC-016) | todos | paso 11 |
