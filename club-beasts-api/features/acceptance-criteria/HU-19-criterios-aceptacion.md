# Criterios de Aceptación - HU-19: Creación de rutina personalizada estructurada

## Resumen

Permitir al DUENO crear una rutina **personalizada** completa y estructurada:
información general + diagnóstico (c1), estructura completa **macro-meso-micro**
(DEC-018, c2), sesiones -> ejercicios -> series con intensidades, descansos y
observaciones (c3), y tests, antropometría y análisis anatómico biomecánico en
**formato estructurado simple** (c4).

**Incremento**: INC-10-rutinas (bloque 6, 18 pts MVP). Criterios **RU-09..RU-19**
de esta HU (secuencia RU-01..RU-42 única del bloque).

**Decisiones aplicadas**:

- **DEC-018**: estructura completa macro-meso-micro SOLO aquí (macrociclo ->
  mesociclo -> microciclo -> sesión, anidada; sin referencias cruzadas).
- **PEND-RUT-01 (rec (a))**: campos fijos de información general + diagnóstico
  (ver PEND abajo; alternativas b/c).
- **PEND-RUT-02 (rec (a))**: tests/antropometría/análisis biomecánico como
  arreglos de registros tipados (enum de medidas/zonas + valor + fecha); el
  **alcance exacto** (medidas, zonas, unidades) queda como PEND.
- **DEC-057/DEC-016 (trazabilidad y anti doble cobro)**: cada rutina lleva
  `fechaActualizacion` + `actualizadoPorId` (precedente `Anamnesis`); este
  documento no cobra puntos de ficha (HU-07) ni asignación (HU-20/21).
- Los literales y el modelo de contenido viven en **`HU-19-schemas.ts`** (fuente
  única del bloque; HU-18/20/21/26 importan de ahí).
- Sin `.feature` Gherkin (guard exacto 220; escenarios en tablas; cableado ATDD
  en el RED de INC-10 por `test-engineer`).

Códigos HTTP/endpoints: **PROPUESTA** (los fija backend-developer en el spec).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | La rutina permite registrar información general y diagnóstico. | RU-10 (+ RU-09 registro completo) | NO VERIFICADO |
| 2 | La rutina permite registrar macrociclo, mesociclo y microciclo. | RU-11 (+ RU-12 coherencia) | NO VERIFICADO |
| 3 | La rutina permite registrar sesiones, ejercicios, series, intensidades, descansos y observaciones. | RU-13 | NO VERIFICADO |
| 4 | La rutina permite incluir tests, antropometría y análisis anatómico biomecánico en formato estructurado simple. | RU-14 | NO VERIFICADO |

Transversales (sin bullet propio): RU-09 (registro completo), RU-15
(completitud/ramas de error), RU-16 (trazabilidad), RU-17 (edición), RU-18
(permisos, REF RU-07), RU-19 (contrato cerrado/límites).

## Detalle por criterio

### RU-09 — Registro completo de la personalizada
- **Dado** un actor DUENO autenticado (PEND-RUT-04 (a)).
- **Cuando** envía `crearRutinaPersonalizadaSchema` completo: `nombre`,
  `informacionGeneral`, `diagnostico`, `macrociclos` (≥1, anidados hasta
  microciclo con sesiones) y opcionalmente `tests`/`antropometria`/
  `analisisBiomecanico`.
- **Entonces** el sistema registra la rutina (201 PROPUESTA) con
  `tipoRutina: "PERSONALIZADA"` y todos los valores persistidos y recuperables
  (`rutinaPersonalizadaDatosSchema`).
- **Qué NO cubre**: validaciones individuales (RU-10..RU-14, RU-19), edición
  (RU-17), asignación (HU-20), portal (HU-26).
- **Prueba esperada**: integración `hu19-rutina-personalizada.test.ts` → POST
  completo 201; GET devuelve el árbol con literales exactos.

### RU-10 — Información general + diagnóstico (b1, PEND-RUT-01 (a))
- **Dado** la sección `informacionGeneral` + `diagnostico`.
- **Cuando** se envían `objetivoGeneral` (10..1000), `nivelExperiencia`
  (enum) y `fechaEvaluacion` (fecha válida no futura) + `diagnostico` (5..2000)
  y los opcionales `restriccionesMedicas`/`lesionesPrevias`/
  `observacionesGenerales` (1..1000).
- **Entonces** el sistema persiste ambas secciones; cualquier campo requerido
  faltante/inválido -> 400 con mensaje específico ("Objetivo general debe tener
  entre 10 y 1000 caracteres", "Fecha de evaluación no puede ser futura", …).
- **Qué NO cubre**: los campos exactos son PEND-RUT-01 — con (b) o (c) este
  criterio se re-equipa al decidir.
- **Prueba esperada**: unidad (schema) → tabla de partición/límites de cada
  campo con mensaje exacto.

### RU-11 — Ciclos macro-meso-micro anidados (b2, DEC-018)
- **Dado** la sección `macrociclos`.
- **Cuando** se envía el árbol con al menos 1 macrociclo; cada macrociclo con
  ≥1 mesociclo; cada mesociclo con ≥1 microciclo; cada microciclo con ≥1 sesión.
- **Entonces** el sistema persiste el árbol completo; faltar un nivel ->
  400 con mensaje por nivel ("Debe registrar al menos un macrociclo", "Cada
  macrociclo debe tener al menos 1 mesociclo", "Cada mesociclo debe tener al
  menos 1 microciclo"). Cada ciclo tiene `nombre`, `fechaInicio`, `fechaFin`,
  `objetivo` y `observaciones`.
- **Qué NO cubre**: la contención de rangos (RU-12); ciclos en rutinas
  genéricas (NO aplican, DEC-018).
- **Prueba esperada**: integración → "árbol completo 201; vaciar un nivel ->
  400 con el mensaje exacto".

### RU-12 — Coherencia de fechas y contención de ciclos (b2)
- **Dado** ciclos con fechas.
- **Cuando** algún ciclo tiene `fechaFin < fechaInicio` (-> 400 "Fecha de fin no
  puede ser anterior a la fecha de inicio"), o un ciclo hijo sale del rango de su
  padre (`validarContencionCiclos`: mesociclo fuera del macrociclo o microciclo
  fuera del mesociclo -> 400 con mensaje "…debe estar contenido en el rango…").
- **Entonces** el sistema rechaza el envío con el mensaje específico.
- **Prueba esperada**: unidad → tabla de decisiones de fechas (§ abajo);
  integración → 400 por cada rama.
- **Nota**: la contención es recomendación de este contrato; si Producto la
  relaja, el criterio se reduce a `fechaInicio <= fechaFin` (registrado al
  decidir PEND-RUT-01 junto a los campos).

### RU-13 — Sesiones -> ejercicios -> series (b3)
- **Dado** el contenido de entrenamiento dentro de cada microciclo.
- **Cuando** se registran sesiones (nombre, día opcional, objetivo,
  observaciones) con ejercicios (nombre, grupo muscular opcional,
  observaciones) y cada ejercicio con ≥1 serie (`repeticiones` formato `8`/`8-12`
  con 1..999 y inicio ≤ fin, `intensidad` 1..50, `descansoSegundos` 0..3600,
  `observaciones`).
- **Entonces** el sistema persiste el árbol y lo consulta en orden; cada nivel
  sin al menos 1 hijo requerido -> 400 con mensaje específico.
- **Qué NO cubre**: orden explícito por campo (el orden es el del arreglo);
  librería de ejercicios (fuera de alcance; el nombre es texto).
- **Prueba esperada**: unidad → partición/límites de `repeticiones`,
  `intensidad`, `descansoSegundos`; integración → "árbol completo 201; serie
  inválida -> 400 con mensaje".

### RU-14 — Tests, antropometría y análisis biomecánico estructurados (b4, PEND-RUT-02 (a))
- **Dado** las secciones opcionales de evaluación.
- **Cuando** se incluyen `tests` (nombre, resultado, fecha, observaciones),
  `antropometria` (medida del enum `MEDIDA_ANTROPOMETRICA`, valor 0.1..500,
  unidad coherente con la medida, fecha) y `analisisBiomecanico` (zona del enum
  `ZONA_BIOMECANICA`, hallazgo `NORMAL|LEVE|MODERADO|SEVERO`, descripción, fecha).
- **Entonces** el sistema persiste los registros en **formato estructurado
  simple** (campos tipados por registro, no texto libre único); un literal fuera
  del enum -> 400 con mensaje ("Medida antropométrica contiene un valor no
  permitido", "Hallazgo debe ser NORMAL, LEVE, MODERADO o SEVERO"); unidad
  incoherente con la medida -> 400 ("Unidad debe ser 'kg' para la medida 'peso'").
- **Qué NO cubre**: el alcance exacto de medidas/zonas/unidades es PEND-RUT-02;
  cálculos automáticos (IMC, % grasa) NO aplican (precedente HU-22: sin
  cálculos automáticos en esta versión).
- **Prueba esperada**: unidad → cada enum acepta todos sus literales y rechaza
  variantes; integración → POST con 3 secciones -> 201 y GET las devuelve.

### RU-15 — Completitud mínima y ramas de error
- **Dado** un envío de creación.
- **Cuando** falta cualquiera de los bloques requeridos (`informacionGeneral`,
  `diagnostico`, `macrociclos`) o sus campos requeridos.
- **Entonces** 400 con mensaje específico POR CAMPO (nunca un 201 parcial: una
  personalizada "completa" se crea completa; el guardado progresivo NO aplica
  a esta HU — la progresividad de anamnesis era HU-11).
- **Prueba esperada**: unidad (schema) → "registro completo sin campo X -> error
  '…X es requerido(a)'" por cada requerido.
- **ENMIENDA si backend decide guardado parcial**: este criterio se re-escoparía
  como HU-11 (estado derivado); decisión registrada al ratificar el spec.

### RU-16 — Trazabilidad de la rutina
- **Dado** un guardado (creación o edición) por un actor autenticado.
- **Cuando** el guardado termina.
- **Entonces** se persisten `fechaActualizacion` (marca del guardado) y
  `actualizadoPorId` = id del actor autenticado real (precedentes
  `ClienteEstadoCambio.actorId` / `Anamnesis.actualizadoPorId`; nunca un valor
  libre del cliente). Ambos visibles a staff en el DTO (`actualizadoPor`).
- **Prueba esperada**: integración → "tras crear/editar, `actualizadoPorId` =
  actor y `fechaActualizacion` ≥ la anterior".

### RU-17 — Edición de la personalizada (reemplazo de secciones)
- **Dado** una personalizada creada.
- **Cuando** el DUENO envía `actualizarRutinaPersonalizadaSchema` (PATCH con
  semántica de sección: presente = reemplaza el árbol de esa sección; ausente =
  conserva; `tipoRutina` inmutable, strict).
- **Entonces** se actualiza lo enviado, se conserva lo ausente y se actualiza la
  trazabilidad (RU-16). Si PEND-RUT-06 queda en (a), las asignaciones históricas
  conservan su `contenidoSnapshot` sin cambios.
- **Prueba esperada**: integración → "PATCH solo `diagnostico`; macrociclos
  intactos; PATCH con `tipoRutina` -> 400".

### RU-18 — Permisos de gestión (REF → RU-07)
- **Dado** los roles DUENO / RECEPCIONISTA / CLIENTE.
- **Cuando** cualquiera distinto de DUENO intenta crear o editar una
  personalizada (PEND-RUT-04 (a)).
- **Entonces** 403 y nada se persiste (detalle de la matriz en RU-07,
  HU-18-criterios-aceptacion.md). Este criterio **REF no puntúa** (sin doble
  cobro con RU-07).
- **Prueba esperada**: la suite de RU-07 cubre la matriz; aquí solo se verifica
  el 403 específico del endpoint de personalizadas.

### RU-19 — Contrato cerrado y límites de arreglos
- **Dado** cualquier envío de la personalizada.
- **Cuando** llega un campo desconocido (-> 400, `.strict()`) o un arreglo excede
  su máximo (macrociclos > 20 -> "Puede registrar máximo 20 macrociclos";
  mesociclos > 20; microciclos > 20; sesiones/ejercicios/series > 30;
  tests/antropometria/analisisBiomecanico > 50).
- **Entonces** 400 con el mensaje específico del límite.
- **Prueba esperada**: unidad → cada máximo+1 produce su mensaje; campo
  desconocido falla.

## Partición de Equivalencia (campos de la HU)

| Campo | Partición | Ejemplo | Válido/Inválido |
|-------|-----------|---------|-----------------|
| `informacionGeneral.objetivoGeneral` | Válida 10..1000 | `Ganar masa muscular` | Válido |
| `informacionGeneral.objetivoGeneral` | Inválida 9 chars / 1001 / vacío | `Ganar masa` / `a`×1001 | Inválido |
| `informacionGeneral.nivelExperiencia` | Válida: enum | `INTERMEDIO` | Válido |
| `informacionGeneral.nivelExperiencia` | Inválida: libre | `EXPERTO`, `medio` | Inválido |
| `informacionGeneral.fechaEvaluacion` | Válida: fecha pasada/hoy | `2026-01-01` | Válido |
| `informacionGeneral.fechaEvaluacion` | Inválida: futura / no fecha | `2027-01-01`, `31/01/2026` | Inválido |
| `diagnostico.diagnostico` | Válida 5..2000 | `Buena postura general` | Válido |
| `diagnostico.diagnostico` | Inválida 4 chars | `Bien` | Inválido |
| `diagnostico.restriccionesMedicas` | Válida: null/ausente/1..1000 | `null` | Válido |
| `macrociclos[]` | Válida 1..20 | 1 macro | Válido |
| `macrociclos[]` | Inválida 0 / 21 | `[]` / 21 macros | Inválido |
| `mesociclos[]` / `microciclos[]` | Válida 1..20 cada nivel | 1 y 1 | Válido |
| `microciclo.sesiones[]` | Válida 1..30 | 1 sesión | Válido |
| `ejercicio.series[]` | Válida 1..30 | 1 serie | Válido |
| `serie.repeticiones` | Válida `8`, `8-12`, `999` | `8-12` | Válido |
| `serie.repeticiones` | Inválida `15-8`, `0`, `1000`, `abc`, `8-` | `15-8` | Inválido |
| `serie.descansoSegundos` | Válida 0..3600 | `90` | Válido |
| `serie.descansoSegundos` | Inválida -1 / 3601 / `90.5` | `3601` | Inválido |
| `tests[].nombre/resultado/fecha` | Válida: campos requeridos | `1RM sentadilla` | Válido |
| `antropometria[].medida` | Válida: enum | `peso` | Válido |
| `antropometria[].medida` | Inválida: libre | `grasa_total` | Inválido |
| `antropometria[].unidad` | Válida coherente: peso=kg, longitudes=cm, % | `peso` 75.5 `kg` | Válido |
| `antropometria[].unidad` | Inválida incoherente | `peso` con `cm` | Inválido |
| `analisisBiomecanico[].zona` | Válida: enum 10 zonas | `RODILLA` | Válido |
| `analisisBiomecanico[].hallazgo` | Válida: enum 4 grados | `LEVE` | Válido |
| body | Inválido: campo desconocido | `{ x: 1 }` | Inválido (strict) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| `objetivoGeneral` | string | 10 | 1000 | 9 → 400 | 1001 → 400 |
| `diagnostico.diagnostico` | string | 5 | 2000 | 4 → 400 | 2001 → 400 |
| `diagnostico.restriccionesMedicas`/`lesionesPrevias`/`observacionesGenerales` | string opc. | 1 | 1000 | 0 → 400 | 1001 → 400 |
| `macrociclos` | array | 1 | 20 | 0 → 400 | 21 → 400 |
| `mesociclos` (por macro) | array | 1 | 20 | 0 → 400 | 21 → 400 |
| `microciclos` (por meso) | array | 1 | 20 | 0 → 400 | 21 → 400 |
| `sesiones` (por micro) | array | 1 | 30 | 0 → 400 | 31 → 400 |
| `ejercicios` (por sesión) | array | 1 | 30 | 0 → 400 | 31 → 400 |
| `series` (por ejercicio) | array | 1 | 30 | 0 → 400 | 31 → 400 |
| `serie.repeticiones` | string | 1 (`"1"`) | 7 (`"999-999"`) | `""` → 400 | 8 chars → 400 |
| `serie.descansoSegundos` | int | 0 | 3600 | -1 → 400 | 3601 → 400 |
| `serie.intensidad` | string | 1 | 50 | 0 → 400 | 51 → 400 |
| `tests` | array | 0 | 50 | — | 51 → 400 |
| `antropometria` | array | 0 | 50 | — | 51 → 400 |
| `analisisBiomecanico` | array | 0 | 50 | — | 51 → 400 |
| `antropometria[].valor` | number | 0.1 | 500 | 0 → 400 | 500.1 → 400 |
| `nombre` (rutina) | string | 3 | 100 | 2 → 400 | 101 → 400 |
| `nombre` (ciclo/sesión/ejercicio/test) | string | 3 | 120 | 2 → 400 | 121 → 400 |
| `test.resultado` | string | 1 | 200 | 0 → 400 | 201 → 400 |

## Tabla de Decisiones

### Fechas y contención de ciclos (RU-12)

| fechaFin ≥ fechaInicio (todos los niveles) | Hijo contenido en rango padre | Acción |
|--------------------------------------------|-------------------------------|--------|
| Sí | Sí | 201 |
| Sí | No | 400 "…debe estar contenido en el rango…" |
| No | — | 400 "Fecha de fin no puede ser anterior a la fecha de inicio" |

### Completitud de la creación (RU-15)

| informacionGeneral | diagnostico | macrociclos ≥ 1 | Evaluaciones | Acción |
|--------------------|-------------|-----------------|--------------|--------|
| Completo | Completo | Sí | Opcionales válidas/ausentes | 201 |
| Faltante/inválido | — | — | — | 400 por campo |
| — | Faltante/inválido | — | — | 400 por campo |
| — | — | No | — | 400 "Debe registrar al menos un macrociclo" |
| — | — | Sí | Inválidas | 400 por registro inválido |

### Coherencia medida/unidad (RU-14, propuesta)

| Medida | Unidad recibida | Acción |
|--------|-----------------|--------|
| `peso`, `masaMuscular` | `kg` | ok |
| `porcentajeGrasa` | `%` | ok |
| longitudes/pliegues | `cm` | ok |
| cualquiera | distinta de la esperada | 400 "Unidad debe ser 'X' para la medida 'Y'" |

## Transiciones de Estado

### Rutina (entidad de contenido)
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| (no existe) | crear (RU-09/01) | CREADA | Sí |
| CREADA | editar (RU-17/06) | ACTUALIZADA (misma entidad, `fechaActualizacion` nueva) | Sí |
| CREADA/ACTUALIZADA | asignar (HU-20) | (sin cambio de estado propio; la activación es por asignación) | Sí |
| cualquiera | `tipoRutina` cambiar por edición | — | **No** (inmutable) |

> La rutina NO tiene estado "activa" propio: la activación vive en la asignación
> (HU-20/HU-21). Borrado de rutinas: **fuera de alcance** (sin bullet; el
> historial depende de la existencia de la rutina — PEND-RUT-06 (a) snapshot
> mitiga si Producto añade borrado más adelante).

## Cobertura de Ramas

### Ruta: POST /api/rutinas-personalizadas (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path completo | árbol completo + 3 evaluaciones | 201 + DTO |
| 2 | Sin informacionGeneral | falta bloque | 400 por campo requerido |
| 3 | Sin diagnostico | falta bloque | 400 "Diagnóstico es requerido" |
| 4 | macrociclos vacíos | `[]` | 400 "Debe registrar al menos un macrociclo" |
| 5 | mesociclo sin microciclos | `microciclos: []` | 400 "Cada mesociclo debe tener al menos 1 microciclo" |
| 6 | microciclo sin sesiones | `sesiones: []` | 400 "Cada microciclo debe tener al menos 1 sesión" |
| 7 | ejercicio sin series | `series: []` | 400 "Cada ejercicio debe tener al menos 1 serie" |
| 8 | fechaFin < fechaInicio | macro `2026-03-31..2026-01-01` | 400 "Fecha de fin no puede ser anterior a la fecha de inicio" |
| 9 | hijo fuera del rango padre | meso que empieza antes del macro | 400 contención |
| 10 | serie inválida | `repeticiones: "15-8"` | 400 mensaje de repeticiones |
| 11 | medida fuera de enum | `grasa_total` | 400 "Medida antropométrica contiene un valor no permitido" |
| 12 | unidad incoherente | `peso` con `cm` | 400 "Unidad debe ser 'kg'…" |
| 13 | fechaEvaluacion futura | `2027-01-01` | 400 "Fecha de evaluación no puede ser futura" |
| 14 | límite de arreglo excedido | 21 macrociclos | 400 "Puede registrar máximo 20 macrociclos" |
| 15 | campo desconocido | `{ extra: 1 }` | 400 (strict) |
| 16 | rol no autorizado | RECEPCIONISTA/CLIENTE | 403 (RU-18) |

### Ruta: PATCH /api/rutinas-personalizadas/:rutinaId (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Update parcial | solo `diagnostico` | 200, resto conservado |
| 2 | Reemplazo de sección | `macrociclos` nuevos | 200, árbol reemplazado |
| 3 | tipoRutina en body | `tipoRutina` | 400 (inmutable) |
| 4 | rutina inexistente | id fantasma | 404 |
| 5 | contenido inválido | sección con error | 400 por campo |

## Reglas de Validación por Campo (resumen; fuente `HU-19-schemas.ts`)

| Campo | Tipo | Requerido | Regex / Rango | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| `tipoRutina` | enum | Sí | — | — | `PERSONALIZADA` |
| `nombre` | string | Sí | `/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#()-]+$/` | 3..100 | — |
| `descripcion` | string | No (nullish) | — | 1..500 | — |
| `informacionGeneral.objetivoGeneral` | string | Sí | — | 10..1000 | — |
| `informacionGeneral.nivelExperiencia` | enum | Sí | — | — | `PRINCIPIANTE`, `INTERMEDIO`, `AVANZADO` |
| `informacionGeneral.fechaEvaluacion` | fecha | Sí | válida, no futura | — | `YYYY-MM-DD` |
| `diagnostico.diagnostico` | string | Sí | — | 5..2000 | — |
| `diagnostico.restriccionesMedicas` | string | No | — | 1..1000 | — |
| `diagnostico.lesionesPrevias` | string | No | — | 1..1000 | — |
| `diagnostico.observacionesGenerales` | string | No | — | 1..1000 | — |
| `macrociclos[].nombre` | string | Sí | nombreItem | 3..120 | — |
| `macrociclos[].fechaInicio`/`fechaFin` | fecha | Sí | válida; fin ≥ inicio; hijo ⊆ padre | — | `YYYY-MM-DD` |
| `macrociclos[].objetivo`/`observaciones` | string | No | — | 1..500 | — |
| `macrociclos[].mesociclos[]` | array | Sí | — | 1..20 | `mesocicloSchema` |
| `mesociclos[].microciclos[]` | array | Sí | — | 1..20 | `microcicloSchema` |
| `microciclos[].sesiones[]` | array | Sí | — | 1..30 | `sesionSchema` (HU-18/HU-19) |
| `tests[].nombre` | string | Sí | nombreItem | 3..120 | — |
| `tests[].resultado` | string | Sí | — | 1..200 | — |
| `tests[].fecha` | fecha | Sí | válida | — | `YYYY-MM-DD` |
| `antropometria[].medida` | enum | Sí | — | — | `MEDIDA_ANTROPOMETRICA` (13) |
| `antropometria[].valor` | number | Sí | 0.1..500 | — | — |
| `antropometria[].unidad` | enum | Sí | coherente con medida | — | `kg`, `cm`, `%`, `unidad` |
| `antropometria[].fecha` | fecha | Sí | válida | — | `YYYY-MM-DD` |
| `analisisBiomecanico[].zona` | enum | Sí | — | — | `ZONA_BIOMECANICA` (10) |
| `analisisBiomecanico[].hallazgo` | enum | Sí | — | — | `NORMAL`, `LEVE`, `MODERADO`, `SEVERO` |
| `analisisBiomecanico[].descripcion` | string | No | — | 1..500 | — |
| `analisisBiomecanico[].fecha` | fecha | Sí | válida | — | `YYYY-MM-DD` |

## Navegación propuesta

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-RU-06 | Detalle de rutina personalizada | Creada | Listado → detalle | Editar → formulario; Volver → listado | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-07 | Formulario personalizada (macro-meso-micro) | Con árbol parcial | Detalle → Editar | Guardar → detalle; Cancelar → detalle sin guardar | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-08 | Formulario personalizada | Con datos sin guardar | Salida por Volver/Cancelar/navegación | Confirmación o salida sin persistir (patrón C5) | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-09 | Formulario personalizada | Recarga / URL directa / atrás | Recarga, botón Atrás | Estado coherente; sin bucles de redirect | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-10 | Formulario personalizada | Teclado / móvil | Tabulación por árbol de ciclos | Foco visible en cada nivel; controles alcanzables; responsive | DUENO | E2E | NO VERIFICADO | _pendiente_ |

No aplica: pantallas del cliente (HU-26) — ver NAV-RU-18..22. Sesión expirada y
PIN obligatorio: mismas reglas transversales que NAV-RU-05.

## PENDs de esta HU

### PEND-RUT-01 — Campos exactos de información general + diagnóstico
- **Pregunta**: ¿cuáles campos exactos componen "información general" y
  "diagnóstico" (HU-19 c1)?
- **Recomendación (a)**: campos fijos ya modelados en `HU-19-schemas.ts` —
  `informacionGeneral` {`objetivoGeneral`, `nivelExperiencia`, `fechaEvaluacion`}
  + `diagnostico` {`diagnostico`, `restriccionesMedicas`, `lesionesPrevias`,
  `observacionesGenerales`} (7 campos; requeridos marcados en la tabla).
- **Alternativa (b)**: mínima — solo 2 textos libres (`informacionGeneral`,
  `diagnostico`) sin enums ni fechas (más simple, menos consultable).
- **Alternativa (c)**: vinculada a la anamnesis (DEC-052/DEC-056): copia
  snapshot de campos seleccionados de la anamnesis + campos propios (más rica;
  solapamiento con bloque 5 a gestionar por DEC-016).

### PEND-RUT-02 — Tests, antropometría y análisis biomecánico ("formato estructurado simple")
- **Pregunta**: ¿"estructurado simple" = enum de medidas, campos fijos o texto
  estructurado? ¿Cuál es el alcance exacto de medidas/zonas/unidades?
- **Recomendación (a)**: arreglos de registros tipados — `tests[]`
  {nombre, resultado, fecha}, `antropometria[]` {medida: enum 13, valor,
  unidad: kg/cm/%/unidad, fecha}, `analisisBiomecanico[]` {zona: enum 10,
  hallazgo: enum 4, descripción, fecha} — ya modelados en `HU-19-schemas.ts`.
  El alcance exacto de los enums lo fija Producto (los actuales son propuesta).
- **Alternativa (b)**: campos fijos planos (una columna nullable por medida) —
  simple, pero rígido y con muchas columnas.
- **Alternativa (c)**: texto estructurado (un textarea por bloque) — mínimo
  esfuerzo, pero no consultable/comparable (no recomendada).
