# Criterios de Aceptación - HU-18: Creación de rutina genérica o de inducción

## Resumen

Permitir al DUENO crear rutinas **genéricas** o de **inducción** (tipo explícito),
con una estructura organizada para su consulta (secciones simples + sesiones ->
ejercicios -> series), reutilizables con varios clientes y activables para un
cliente mediante la asignación de HU-20.

**Incremento**: INC-10-rutinas (bloque 6 "Rutinas, asignación e historial",
18 pts MVP). Desbloqueado por DEC-018. Criterios **RU-01..RU-08** de esta HU
(secuencia RU-01..RU-42 única del bloque; ver mapeo en cada documento).

**Decisiones aplicadas**:

- **DEC-018**: la estructura completa macro-meso-micro es SOLO de la
  personalizada (HU-19). Aquí NO hay ciclos.
- **DEC-016 (anti doble cobro)**: la "activación para un cliente" (b4) es la
  asignación de HU-20; RU-05 es **REF** (sin punto propio aquí).
- **PEND-RUT-03 (rec (a))**: genéricas/inducción comparten el modelo
  `sesiones -> ejercicios -> series` de HU-19-schemas.ts (fuente única), sin
  ciclos. Ver PEND abajo.
- **PEND-RUT-04 (rec (a))**: solo DUENO crea/edita rutinas (supuesto §2 del
  historial de HU: "La recepción puede crear y editar clientes básicos, pero no
  gestiona rutinas").
- Sin `.feature` Gherkin: el guard Gherkin es **exacto 220**; los escenarios
  viven en las tablas de decisión de este documento y el cableado ATDD es tarea
  de `test-engineer` en el RED de INC-10 (con guard al alza, patrón INC-09).

Los códigos HTTP y endpoints citados son **PROPUESTA** (el contrato HTTP y el
schema Prisma los fija backend-developer/database-admin en el spec de INC-10).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El sistema permite definir si una rutina es genérica o de inducción. | RU-01 (+ RU-02 validaciones) | NO VERIFICADO |
| 2 | La rutina tiene una estructura organizada para su consulta. | RU-03 (+ RU-08 contrato cerrado) | NO VERIFICADO |
| 3 | La rutina puede reutilizarse con varios clientes. | RU-04 | NO VERIFICADO |
| 4 | La rutina puede ser activada para un cliente. | RU-05 (**REF** → RU-20/RU-22 de HU-20, sin punto doble DEC-016) | NO VERIFICADO |

## Detalle por criterio

### RU-01 — Creación con tipo explícito (genérica o inducción)
- **Dado** un actor DUENO autenticado (PEND-RUT-04 rec (a)).
- **Cuando** envía `crearRutinaBaseSchema` con `tipoRutina` = `GENERICA` o
  `INDUCCION`, `nombre` válido y al menos 1 sesión con su contenido.
- **Entonces** el sistema registra la rutina (201 PROPUESTA) con el tipo exacto
  enviado, recuperable en consulta con el DTO `rutinaBaseDatosSchema`.
- **Qué NO cubre**: personalizada (HU-19), asignación (HU-20), permisos (RU-07).
- **Prueba esperada**: integración `hu18-rutina-creacion.test.ts` → POST 201,
  GET devuelve `tipoRutina` exacto (`GENERICA` ≠ `INDUCCION`) y el contenido.

### RU-02 — Validación de campos de creación
- **Dado** un envío `crearRutinaBaseSchema`.
- **Cuando** falta `nombre`/`tipoRutina`/`sesiones`, o `nombre` está fuera de
  3..100, o `tipoRutina` no es `GENERICA|INDUCCION` (p. ej. `PERSONALIZADA`,
  `generica` en minúscula), o `nivelExperiencia` fuera de enum.
- **Entonces** 400 con mensaje específico por campo ("Nombre debe tener entre 3
  y 100 caracteres", "Tipo de rutina debe ser GENERICA o INDUCCION",
  "Debe registrar al menos 1 sesión", "Nivel de experiencia debe ser
  PRINCIPIANTE, INTERMEDIO o AVANZADO").
- **Prueba esperada**: unidad (schema) → cada tabla de valores límite y
  partición produce el mensaje exacto.

### RU-03 — Estructura organizada para consulta
- **Dado** una rutina creada.
- **Cuando** se consulta (listado o detalle).
- **Entonces** la información está agrupada en las secciones fijas
  `SECCIONES_RUTINA_BASE`: **B1** Informacion general (`nombre`, `tipoRutina`,
  `descripcion`, `objetivo`, `nivelExperiencia`) y **B2** Sesiones y ejercicios
  (`sesiones` -> `ejercicios` -> `series` con `repeticiones`, `intensidad`,
  `descansoSegundos`, `observaciones`). Ningún campo queda fuera de sección.
- **Qué NO cubre**: ciclos macro-meso-micro (NO aplican, DEC-018; solo HU-19).
- **Prueba esperada**: unidad → "la unión de B1+B2 cubre exactamente los campos
  del contrato"; integración → GET agrupa/entrega en ese orden.

### RU-04 — Reutilización con varios clientes
- **Dado** una rutina genérica/inducción y los clientes A, B y C.
- **Cuando** se asigna/activa la MISMA `rutinaId` para A, B y C (HU-20).
- **Entonces** existen 3 asignaciones activas independientes (una por cliente,
  mismo `rutinaId`); la rutina no se duplica ni se "consume"; editarla no rompe
  las asignaciones existentes.
- **Prueba esperada**: integración → "asignar r1 a A, B y C; cada cliente tiene
  su asignación ACTIVA con rutina r1; total de rutinas = 1".

### RU-05 — Activación para un cliente (REF, sin punto doble)
- **Dado** una rutina genérica/inducción.
- **Cuando** se desea activar para un cliente.
- **Entonces** la activación ocurre SOLO vía la asignación de HU-20
  (`POST .../asignaciones`, RU-20/RU-22): no existe "estado activo" propio de la
  rutina fuera de la asignación.
- **Qué NO cubre**: la regla de una-activa, vigencia y portal se acreditan en
  HU-20/HU-21/HU-26 (DEC-016; este criterio **REF no puntúa**).
- **Prueba esperada**: ninguna propia (referencia a la suite de HU-20).

### RU-06 — Edición de genérica/inducción (tipo inmutable)
- **Dado** una rutina creada.
- **Cuando** el DUENO envía `actualizarRutinaBaseSchema` (PATCH con semántica de
  sección: presente = reemplaza, ausente = conserva; patrón R3/C3a de INC-09).
- **Entonces** se actualizan los campos enviados y **`tipoRutina` no cambia**
  (no está en el contrato de update; si llega en el body -> 400 por strict).
  Tras editar, `fechaActualizacion`/`actualizadoPorId` se actualizan (RU-16).
- **Prueba esperada**: integración → "PATCH solo descripción; el tipo sigue
  siendo GENERICA; PATCH con tipoRutina en el body -> 400".

### RU-07 — Permisos de gestión
- **Dado** los roles DUENO, RECEPCIONISTA y CLIENTE.
- **Cuando** cualquiera distinto de DUENO intenta crear o editar una rutina
  (PEND-RUT-04 rec (a); supuesto §2 "la recepción ... no gestiona rutinas").
- **Entonces** 403 (PROPUESTA) y nada se persiste. DUENO sí crea/edita. El
  CLIENTE jamás accede a la gestión (solo su portal, HU-26).
- **Prueba esperada**: integración → matriz rol × operación: DUENO 201/200;
  RECEPCIONISTA 403; CLIENTE 403; sin token 401.

### RU-08 — Recurso inexistente y contrato cerrado
- **Dado** una operación sobre `rutinaId` inexistente o un body con campos
  desconocidos.
- **Cuando** se consulta/edita una rutina inexistente (-> 404 `NOT_FOUND`,
  PROPUESTA) o el body incluye campos fuera del contrato (-> 400, `.strict()`).
- **Entonces** el error es específico y nada se persiste.
- **Prueba esperada**: integración → "GET/PATCH rutinaId inexistente -> 404";
  unidad → "campo desconocido -> fallo de schema".

## Partición de Equivalencia

| Campo | Partición | Ejemplo | Válido/Inválido |
|-------|-----------|---------|-----------------|
| `tipoRutina` | Válida: GENERICA | `GENERICA` | Válido |
| `tipoRutina` | Válida: INDUCCION | `INDUCCION` | Válido |
| `tipoRutina` | Inválida: personalizada en este contrato | `PERSONALIZADA` | Inválido |
| `tipoRutina` | Inválida: casing/literal libre | `generica`, `BASE` | Inválido |
| `nombre` | Válida: 3..100 caracteres permitidos | `Rutina inicial` | Válido |
| `nombre` | Inválida: 2 caracteres | `ab` | Inválido |
| `nombre` | Inválida: 101 caracteres | `a`×101 | Inválido |
| `nombre` | Inválida: caracteres no permitidos | `Rutina@1` | Inválido |
| `descripcion`/`objetivo` | Válida: ausente/null/1..500 | `null` | Válido |
| `descripcion` | Inválida: 501 caracteres | `a`×501 | Inválido |
| `nivelExperiencia` | Válida: enum o ausente | `PRINCIPIANTE` | Válido |
| `nivelExperiencia` | Inválida: fuera de enum | `EXPERTO` | Inválido |
| `sesiones` | Válida: 1..30 sesiones con contenido | 1 sesión | Válido |
| `sesiones` | Inválida: 0 sesiones | `[]` | Inválido |
| `sesiones` | Inválida: 31 sesiones | 31 items | Inválido |
| `sesion.ejercicios` | Inválida: 0 ejercicios | `[]` | Inválido |
| `ejercicio.series` | Inválida: 0 series | `[]` | Inválido |
| body | Inválido: campo desconocido | `{ ..., extra: 1 }` | Inválido (strict) |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín-1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| `nombre` | string | 3 | 100 | 2 → 400 | 101 → 400 |
| `descripcion`/`objetivo`/`observaciones` | string opc. | 1 | 500 | 0 → 400 | 501 → 400 |
| `sesiones` | array | 1 | 30 | 0 → 400 | 31 → 400 |
| `sesion.ejercicios` | array | 1 | 30 | 0 → 400 | 31 → 400 |
| `ejercicio.series` | array | 1 | 30 | 0 → 400 | 31 → 400 |
| `serie.repeticiones` | string | 1 (`"1"`) | 7 (`"999-999"`) | `""` → 400 | 8 chars → 400 |
| `serie.descansoSegundos` | int | 0 | 3600 | -1 → 400 | 3601 → 400 |
| `serie.intensidad` | string | 1 | 50 | 0 → 400 | 51 → 400 |

## Tabla de Decisiones

### Creación de rutina genérica/inducción (RU-01/RU-02)

| tipoRutina válido | nombre válido | sesiones ≥ 1 | Resto del contenido válido | Acción |
|-------------------|---------------|--------------|---------------------------|--------|
| Sí | Sí | Sí | Sí | 201 creada (RU-01) |
| Sí | Sí | Sí | No | 400 mensaje por campo (RU-02) |
| Sí | Sí | No | — | 400 "Debe registrar al menos 1 sesión" |
| Sí | No | — | — | 400 "Nombre debe tener entre 3 y 100 caracteres" |
| No | — | — | — | 400 "Tipo de rutina debe ser GENERICA o INDUCCION" |
| Campo desconocido | — | — | — | 400 (strict, RU-08) |

### Rol × operación (RU-07, PEND-RUT-04 rec (a))

| DUENO | RECEPCIONISTA | CLIENTE | Operación | Acción |
|-------|---------------|---------|-----------|--------|
| Sí | — | — | crear/editar rutina | 201/200 |
| — | Sí | — | crear/editar rutina | 403 |
| — | — | Sí | crear/editar rutina | 403 |
| — | — | — | sin token | 401 |
| Sí | Sí | — | consultar (ficha/listado) | 200 (lectura staff) |

### Edición (RU-06)

| Sección presente en PATCH | tipoRutina en body | Acción |
|---------------------------|--------------------|--------|
| Sí | Ausente | Reemplaza la sección; conserva lo demás |
| Ausente | Ausente | Conserva (merge R3/C3a) |
| — | Presente | 400 (tipo inmutable, strict) |

## Cobertura de Ramas

### Ruta: POST /api/rutinas (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path genérica | body completo `GENERICA` | 201 + DTO |
| 2 | Happy path inducción | body completo `INDUCCION` | 201 + DTO |
| 3 | tipo inválido | `PERSONALIZADA`/`generica` | 400 "Tipo de rutina debe ser GENERICA o INDUCCION" |
| 4 | nombre faltante/corto/largo | `""`/`ab`/101 chars | 400 "Nombre debe tener entre 3 y 100 caracteres" |
| 5 | sesiones vacías | `sesiones: []` | 400 "Debe registrar al menos 1 sesión" |
| 6 | serie inválida | `repeticiones: "15-8"` | 400 "Repeticiones: el valor inicial no puede superar al final" |
| 7 | campo desconocido | `{ extra: 1 }` | 400 (strict) |
| 8 | rol no autorizado | RECEPCIONISTA/CLIENTE | 403 (RU-07) |
| 9 | sin token | — | 401 |

### Ruta: PATCH /api/rutinas/:rutinaId (PROPUESTA)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Update parcial | solo `descripcion` | 200, resto conservado |
| 2 | tipoRutina en body | `tipoRutina: "INDUCCION"` | 400 (inmutable) |
| 3 | rutina inexistente | `rutinaId` fantasma | 404 |
| 4 | rol no autorizado | RECEPCIONISTA | 403 |

## Reglas de Validación por Campo

| Campo | Tipo | Requerido | Regex / Rango | Longitud | Valores Permitidos |
|-------|------|-----------|---------------|----------|-------------------|
| `tipoRutina` | enum | Sí | — | — | `GENERICA`, `INDUCCION` |
| `nombre` | string | Sí | `/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#()-]+$/` | 3..100 | — |
| `descripcion` | string | No (nullish) | — | 1..500 | — |
| `objetivo` | string | No (nullish) | — | 1..500 | — |
| `nivelExperiencia` | enum | No (nullish) | — | — | `PRINCIPIANTE`, `INTERMEDIO`, `AVANZADO` |
| `sesiones[]` | array | Sí | — | 1..30 | `sesionSchema` (HU-19) |
| `sesion.nombre` | string | Sí | nombreItem | 3..120 | — |
| `sesion.dia` | enum | No | — | — | `lunes`..`domingo` |
| `sesion.objetivo` | string | No | — | 1..500 | — |
| `sesion.ejercicios[]` | array | Sí | — | 1..30 | `ejercicioSchema` (HU-19) |
| `ejercicio.nombre` | string | Sí | nombreItem | 3..120 | — |
| `ejercicio.grupoMuscular` | enum | No | — | — | `GRUPO_MUSCULAR` (11 literales) |
| `ejercicio.series[]` | array | Sí | — | 1..30 | `serieSchema` (HU-19) |
| `serie.repeticiones` | string | Sí | `/^\d{1,3}(-\d{1,3})?$/` + ini ≤ fin, 1..999 | 1..7 | — |
| `serie.intensidad` | string | Sí | — | 1..50 | — |
| `serie.descansoSegundos` | int | Sí | 0..3600 | — | — |
| `serie.observaciones` | string | No | — | 1..500 | — |

Fuente canónica: `HU-18-schemas.ts` + `HU-19-schemas.ts` (modelo compartido).

## Navegación propuesta (matriz criterio/pantalla/estado/entrada/salida/rol/prueba)

> Propuesta para la puerta LISTO del orquestador; **resultado inicial
> `NO VERIFICADO`** — la ejecución real la audita `ui-navigation-auditor` y la
> automatiza `test-engineer`. Aplica a la gestión de rutinas (pantallas staff).

| ID | Pantalla | Estado | Entrada | Salida | Rol | Prueba | Resultado | Evidencia |
|----|----------|--------|---------|--------|-----|--------|-----------|-----------|
| NAV-RU-01 | Listado de rutinas | Normal | Menú staff / URL directa con sesión | "Crear rutina" → formulario; detalle → vista | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-02 | Formulario crear rutina | Vacío | Listado → "Crear rutina" | Guardar → detalle/listado; **Cancelar** → listado sin guardar; **Volver** → listado | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-03 | Formulario crear rutina | Con datos sin guardar | Intento de salida (Volver/Cancelar/navegación) | Confirmación o salida sin persistir (patrón C5 INC-09) | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-04 | Formulario crear rutina | Recarga / URL directa / atrás | Recarga del navegador, botón Atrás | Estado coherente (form vacío o datos del navegador); sin bucles de redirect | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-RU-05 | Gestión de rutinas | Sesión expirada / rol no autorizado | RECEPCIONISTA/CLIENTE escriben URL directa de gestión | 403/redirect sin pantallas de edición; logout → login | DUENO | E2E | NO VERIFICADO | _pendiente_ |

Transversal (aplica a todas las filas): responsive móvil/escritorio, navegación
por teclado con foco visible, sin enlaces rotos ni bucles, guarda de PIN
obligatorio (precedente INC-07/INC-08 `cambio-pin-obligatorio`) intacta. **No
aplica** a este documento: pantallas del portal del cliente (HU-26) e historial
en ficha (HU-21, NAV-RU-15..17).

## PENDs de esta HU

### PEND-RUT-03 — Alcance de la estructura de la rutina genérica/inducción
- **Pregunta**: ¿las rutinas genéricas/inducción comparten el modelo
  `sesiones -> ejercicios -> series` de la personalizada (sin ciclos) o usan una
  estructura resumida?
- **Recomendación (a)**: comparten `sesionSchema`/`ejercicioSchema`/`serieSchema`
  (HU-19-schemas.ts) sin macro-meso-micro (DEC-018 reserva los ciclos para la
  personalizada) — ya implementada en `HU-18-schemas.ts`.
- **Alternativa (b)**: estructura resumida (nombre + descripción por secciones
  de texto, sin árbol de ejercicios) — más simple, menos consultable.
- **Alternativa (c)**: estructura completa idéntica a la personalizada
  (contradice la lectura de DEC-018; no recomendada).

### PEND-RUT-04 — Permisos de creación/edición de rutinas
- **Pregunta**: ¿quién crea/edita/asigna rutinas?
- **Recomendación (a)**: **solo DUENO** crea, edita y asigna (literal del
  supuesto §2 del historial de HU: "La recepción ... no gestiona rutinas"; las
  HU-18/19/20 dicen "Como dueno"). RECEPCIONISTA: solo lectura en ficha.
  CLIENTE: solo su portal (HU-26).
- **Alternativa (b)**: DUENO crea/edita; DUENO + RECEPCIONISTA asignan
  (coherente con DEC-017 "DUENO y RECEPCIONISTA gestionan vigencias").
- **Alternativa (c)**: DUENO + RECEPCIONISTA crean/editan/asignan.
