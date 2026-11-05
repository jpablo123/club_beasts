# Criterios de Aceptación - HU-09: Registro de anamnesis deportiva

## Resumen

Diligenciar la anamnesis deportiva del cliente con el formulario real
**"ANALISIS PRE ENTRENAMIENTO / ANAMNESIS DEPORTIVA"** (23 campos en 4 secciones,
contrato fijado por **Anexo DEC-052, 2026-11-04**), asociada al cliente correcto y
con trazabilidad de fecha de actualización + usuario responsable.

**Decisiones aplicadas**:

- **DEC-052 + Anexo (2026-11-04)**: los 23 campos son el contrato CERRADO — no se
  inventan ni se eliminan campos. El formulario termina en el campo 23
  ("Cuantas comidas al dia"). Campos compuestos modelados sin alterar el contrato:
  campo 6 = `fechaNacimiento` + `lugarNacimiento` (6a/6b); campo 18 =
  `enfermedadRelevante` + `cualEnfermedad` (18a/18b) → **25 propiedades**.
- **DEC-016 (anti doble cobro)**: los campos 1-10 se solapan con datos del Cliente
  (HU-04/HU-05 ya aceptados). Las reglas de formato replican los regex aceptados y
  este documento **no cobra punto nuevo por validar nombre/documento/teléfono/email
  otra vez**; la regla de no-duplicado de datos queda en **PEND-ANX-02**.
- **DEC-021 intacta**: HU-07 no se cierra con anamnesis mínima; la visibilidad de la
  anamnesis en la ficha (HU-07 b4) es solo contexto de visibilidad — el punto se
  reparte por DEC-016 al cierre. Este documento **no** cobra el punto de ficha.
- **HU-11 vs obligatorios (*)**: los `*` definen "anamnesis **completa**", NO
  impiden el guardado progresivo. Ver HU-11-criterios-aceptacion.md (reconciliación
  completa). En este documento, `registrarAnamnesisSchema` cubre el envío completo.
- Permisos y partición sensible/operativa → **HU-10-criterios-aceptacion.md**.
  Lectura portal del cliente → **HU-28-criterios-aceptacion.md**.

**Códigos HTTP y endpoints citados son PROPUESTA** (el contrato HTTP y el schema
Prisma se fijan en el spec de INC-09 por backend-developer/database-admin).

> **ENMIENDA C4 (patrón C4) — INC-09-anamnesis-deportiva, ciclo RED 2026-11-04**
> (contrato de enmienda del orquestador; cambios documentados, nunca edición
> silenciosa; refs. ratificación backend R1..R8 / DEC-055):
> **(1)** AN-05 y rama "ausente" de AN-07 re-escopados a **verificación a nivel
> de schema** (`registrarAnamnesisSchema`, unit) + comportamiento API vía
> AN-21/AN-22 (→ `PENDIENTE`); filas 3 y 5 de §"Cobertura de Ramas" pasan a
> `201/200 PENDIENTE` (R4 — la API acepta body parcial ≥1 campo, AN-26).
> **(2)** AN-12 documenta la semántica de merge del PATCH ratificado
> (ausente=conserva; `null`/`""`=vacía) (R3/C3a).
> **(3)** Encabezado de operación de registro/actualización: `POST|PUT` →
> `POST|PATCH` (R1).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El sistema permite registrar la información del formulario de análisis pre entrenamiento. | AN-01 (registro completo) + AN-05..AN-11 (validaciones) | NO VERIFICADO |
| 2 | El sistema agrupa la información en secciones claras para diligenciamiento. | AN-03 | NO VERIFICADO |
| 3 | La anamnesis queda asociada al cliente correcto. | AN-02 | NO VERIFICADO |
| 4 | El sistema guarda fecha de actualización y usuario responsable. | AN-04 (+ AN-12 al editar) | NO VERIFICADO |

## Detalle por criterio

### AN-01 — Registro completo del formulario (23 campos / 4 secciones)
- **Dado** un cliente existente y un actor DUENO autenticado (permiso: PEND-ANX-04 rec (a)).
- **Cuando** envía el formulario completo con los 23 campos válidos (25 propiedades,
  condicionales diligenciadas cuando aplican).
- **Entonces** el sistema registra la anamnesis completa: 201 (PROPUESTA) con el DTO
  de lectura de HU-10 (`anamnesisDuenoSchema`), estado derivado `COMPLETA` y los 25
  valores persistidos y recuperables en la consulta.
- **Qué NO cubre**: validaciones individuales (AN-05..AN-10), edición (AN-12),
  guardado incompleto (HU-11), permisos (HU-10), portal (HU-28), ficha del cliente
  (HU-07 b4 — punto por DEC-016 al cierre).
- **Prueba esperada**: integración `hu09-anamnesis-registro.test.ts` → POST completo
  201, estado `COMPLETA`, GET devuelve los 25 valores con los literales exactos.

### AN-02 — Asociación al cliente correcto
- **Dado** dos clientes A y B.
- **Cuando** el DUENO registra la anamnesis de A.
- **Entonces** la anamnesis queda asociada al id de A (nunca a B): la consulta de A
  devuelve la anamnesis recién creada y la de B no cambia. Cliente inexistente →
  404 `NOT_FOUND` (PROPUESTA) y nada se persiste.
- **Prueba esperada**: integración → "registrar para A; GET de A la contiene; GET de
  B no la contiene; clienteId inexistente → 404".

### AN-03 — Agrupación en secciones claras (S1-S4)
- **Dado** la anamnesis registrada.
- **Cuando** se consulta o se presenta para diligenciar.
- **Entonces** la información está agrupada en las 4 secciones exactas del Anexo
  (`SECCIONES_ANAMNESIS` de HU-09-schemas.ts): **S1** Identificacion personal (11
  propiedades), **S2** Deporte (3), **S3** Emergencia y salud (6), **S4** Objetivos y
  estilo de vida (5). Ningún campo queda fuera de sección ni en sección distinta.
- **Prueba esperada**: unidad → "la unión de las secciones contiene exactamente las
  25 propiedades del contrato (sin sobras ni faltantes)".

### AN-04 — Trazabilidad: fecha de actualización + usuario responsable
- **Dado** un actor autenticado que guarda la anamnesis (creación o edición).
- **Cuando** el guardado termina.
- **Entonces** el sistema persiste `fechaActualizacion` (marca del guardado) y
  `actualizadoPorId` = id del actor autenticado (precedentes `ClienteEstadoCambio.actorId`
  / `pinResetPorId`: siempre el usuario real, nunca un valor libre del cliente). Los
  dos campos son visibles a staff en el DTO (`anamnesisDuenoSchema`).
- **Qué NO cubre**: historial de versiones (PEND-ANX-03 rec (a): solo última
  actualización), exposición del usuario responsable al CLIENTE (HU-28 lo omite).
- **Prueba esperada**: integración → "tras el guardado, `actualizadoPorId` = actor y
  `fechaActualizacion` ≥ la del guardado previo".

### AN-05 — Obligatorios (*) en el envío completo
- **Dado** un envío de registro completo (`registrarAnamnesisSchema`).
- **Cuando** falta cualquiera de los 14 valores obligatorios (*): nombre completo,
  número de documento, sexo, RH, edad, fecha de nacimiento, lugar de nacimiento,
  dirección, número de contacto, contacto de emergencia, EPS, enfermedad relevante
  (18a), objetivos y nivel de actividad.
- **Entonces** el schema `registrarAnamnesisSchema` **rechaza el envío completo**
  con mensaje específico POR CAMPO ("Edad es requerida", "EPS es requerida", … —
  `MENSAJES_REQUERIDO` en HU-09-schemas.ts).
- **ENMIENDA C4 (INC-09, 2026-11-04 — R4/R7)**: la verificación de este criterio
  pasa a **nivel de schema** (`registrarAnamnesisSchema`, prueba unitaria). El
  comportamiento de la API con faltantes es el guardado progresivo: body parcial
  válido (≥1 campo diligenciado) → **201/200 `PENDIENTE`** (AN-21/AN-22); solo
  AN-26 (body sin ningún campo diligenciado) responde 400. La API NO distingue
  "envío completo" vs "envío parcial": faltan obligatorios → `PENDIENTE`, nunca
  400 por ausencia (HU-11).
- **Nota de reconciliación**: los `*` definen completitud (estado `COMPLETA`),
  no un impedimento de guardado; el guardado progresivo con faltantes es válido y
  marca `PENDIENTE` (HU-11, AN-21/AN-22).
- **Prueba esperada**: unit (schema) → "registro completo sin campo X → error
  '…X es requerido(a)'" para los 14 obligatorios; integración → "POST sin campo
  X (≥1 diligenciado) → 201 PENDIENTE" (AN-21/AN-22).

### AN-06 — Enums exactos del Anexo (literales cerrados)
- **Dado** campos con valores cerrados: sexo (3), práctica de deporte (11),
  enfermedad relevante (18a), nivel de actividad (20), antecedentes médicos (16) y
  días que no puede entrenar (21).
- **Cuando** llega un literal fuera del set del Anexo DEC-052 (p. ej. sexo "M", nivel
  "activo", día "sabado", antecedente "asma") o con distinta capitalización/acentos
  (p. ej. "Miercoles" ≠ "miercoles").
- **Entonces** 400 con mensaje específico ("Sexo debe ser FEMENINO o MASCULINO",
  "Nivel de actividad debe ser una de las opciones permitidas",
  "Días que no puede entrenar contiene un valor no permitido",
  "Antecedentes médicos contiene un valor no permitido"). Los literales válidos son
  EXACTOS (sin normalizar): ver constantes `SEXO`, `SI_NO`, `NIVEL_ACTIVIDAD`,
  `ANTECEDENTES_MEDICOS`, `DIAS_NO_ENTRENAMIENTO`.
- **Prueba esperada**: unidad por enum → cada literal del Anexo pasa; cada variante
  inválida produce el mensaje exacto.

### AN-07 — Condicionales SI/NO (campos 12 y 18b)
- **Dado** las preguntas SI/NO del formulario (11 y 18a).
- **Cuando** (tabla de decisiones §"Condicionales" más abajo):
  - 11 = "SI" y falta 12 `cualDeporte` → **ENMIENDA C4 (INC-09, 2026-11-04 — R4)**:
    a nivel de schema (`registrarAnamnesisSchema`, envío completo) → error
    "Cual deporte es requerido cuando practica algún deporte"; en la API (body
    parcial, AN-21/AN-22) → permitido, marca `PENDIENTE` (201/200), nunca 400.
  - 11 = "NO" o ausente y llega 12 → 400 "Cual deporte no aplica cuando no practica
    algún deporte" (siempre, incluso en guardado parcial).
  - 18a = "SI" y falta 18b `cualEnfermedad` → misma regla enmendada: error de
    schema "Cual enfermedad es requerida cuando tiene enfermedad relevante" en el
    envío completo; `PENDIENTE` en la API (AN-21/AN-22).
  - 18a = "NO" o ausente y llega 18b → 400 "Cual enfermedad no aplica cuando no tiene
    enfermedad relevante".
- **Entonces** cada rama produce exactamente lo indicado (nunca silencio ni 500).
  **ENMIENDA C4 (INC-09, 2026-11-04 — R4)**: las ramas de **ausencia** se verifican
  a nivel de schema y en la API derivan `PENDIENTE` (filas 3 y 5 de §"Cobertura de
  Ramas" actualizadas); las ramas de **contradicción** siguen siendo 400 en la API.
- **Prueba esperada**: unit (schema) para ramas de ausencia en envío completo;
  integración (ramas de contradicción × completo/parcial + ausencia → PENDIENTE).

### AN-08 — Formato por campo (regex de campos con formato conocido)
- **Dado** campos de formato conocido: documento (2), RH (4), fecha de nacimiento
  (6a), número de contacto (9), correo (10), hora de acostarse (22).
- **Cuando** llega un valor con formato inválido (tabla §"Reglas de validación por campo").
- **Entonces** 400 con mensaje específico del campo ("Número de documento debe ser
  numérico de 6 a 10 dígitos", "Número de contacto debe ser numérico de 7 a 10
  dígitos", "Correo electrónico tiene formato inválido", "Fecha de nacimiento debe ser
  una fecha válida (YYYY-MM-DD)", "Hora para acostarse debe tener formato HH:MM (24
  horas)", "RH debe ser un tipo de sangre válido (A+, A-, B+, B-, AB+, AB-, O+, O-)").
  NUNCA se acepta "cualquier string" en estos campos. `numeroDocumento` replica el
  regex aceptado de HU-04 (`/^\d{6,10}$/`); `numeroContacto` usa el general 7-10
  dígitos porque el formulario pide un "número de contacto" (puede ser de un
  familiar), no el móvil del cliente.
- **Prueba esperada**: unidad con valores límite de formato (ver §Valores límite).

### AN-09 — Valores límite (longitudes y numéricos)
- **Dado** campos con rango/longitud (tabla §"Análisis de valores límite").
- **Cuando** llega el valor mínimo aceptable o el máximo aceptable → 200/201; el
  mínimo − 1 o el máximo + 1 → 400 con el mensaje del rango.
- **Entonces** el comportamiento es el anterior para TODOS los campos con rango:
  edad 13..100, comidas 1..12, nombre 3..120, dirección 3..200, objetivos 5..1000, etc.
- **Prueba esperada**: unidad parametrizada por campo con Mín, Máx, Mín−1, Máx+1.

### AN-10 — Multi-selects (16 y 21)
- **Dado** los multi-select del formulario.
- **Cuando** llega `antecedentesMedicos` con "Ninguno" combinado con otros valores, o
  con valores repetidos; o `diasNoEntrenamiento` con valores repetidos.
- **Entonces** 400 ("Ninguno no se puede combinar con otros antecedentes médicos" /
  "…no puede tener valores repetidos"). Subconjuntos válidos (1 o más opciones sin
  "Ninguno", o ["Ninguno"] solo) y lista vacía/ausente son aceptados.
- **Prueba esperada**: unidad → ["Ninguno"] solo OK; ["Ninguno","fuma"] 400;
  ["fuma","fuma"] 400; ["lunes","miercoles"] OK; ["lunes","lunes"] 400.

### AN-11 — Contrato cerrado (sin campos inventados)
- **Dado** el contrato de 23 campos del Anexo DEC-052.
- **Cuando** el cuerpo contiene una clave desconocida (p. ej. `peso`, `estatura`,
  `clubAnterior`).
- **Entonces** 400 `VALIDATION_ERROR` ("Campos no permitidos en el formulario: …") y
  nada se persiste (`z.object().strict()` de `anamnesisCamposSchema`). Si el contrato
  HTTP final requiere metadatos (`clienteId`, `version`), viajan FUERA del objeto de
  campos (envoltura en el spec de INC-09).
- **Prueba esperada**: integración → "clave extra → 400; GET posterior no contiene la clave".

### AN-12 — Actualización de la anamnesis existente
- **Dado** una anamnesis ya registrada para un cliente (rec (a) PEND-ANX-03: una
  anamnesis por cliente, sin duplicados).
- **Cuando** el DUENO envía una nueva versión de campos.
- **Entonces** los campos se actualizan sin crear un segundo registro para el mismo
  cliente y la trazabilidad se renueva (`fechaActualizacion` y `actualizadoPorId` del
  actor que edita, AN-04).
- **ENMIENDA C4 (INC-09, 2026-11-04 — R3/C3a)**: el contrato de edición ratificado
  es **PATCH con semántica de merge**: clave **ausente** = conserva el valor
  previo; clave presente con `null` o `""` = **vacía** el campo (queda sin
  diligenciar); clave presente con valor = se valida y reemplaza. Ver detalle en
  `HU-11-criterios-aceptacion.md` (AN-23/AN-25/AN-26).
- **Prueba esperada**: integración → "editar un campo; GET refleja el cambio, la
  trazabilidad se actualiza y no existe un segundo registro para el cliente";
  "clave ausente conserva; `null`/`""` vacía".

## Partición de Equivalencia

| Campo | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|-------|-------------|---------|---------------|---------|
| 1 nombreCompleto | 3..120 letras/espacios | "Ana María Pérez" | Vacío, <3, >120, dígitos/símbolos | "Ana3", "" |
| 2 numeroDocumento | 6..10 dígitos | "1020304050" | No numérico, <6, >10, vacío | "CC1020", "12345" |
| 3 sexo | FEMENINO \| MASCULINO | "FEMENINO" | Otro literal, minúsculas | "M", "femenino" |
| 4 rh | Tipo de sangre (8 valores) | "O+" | Libre, números, vacío | "cero positivo", "X" |
| 5 edad | Entero 13..100 | 25 | Fuera de rango, decimal, string | 12, 101, 25.5 |
| 6a fechaNacimiento | YYYY-MM-DD real, no futura | "1998-04-12" | Formato, día inexistente, futura | "12/04/1998", "2030-01-01" |
| 6b lugarNacimiento | 2..100 texto permitido | "Bogotá D.C." | Vacío, <2, símbolos | "@@" |
| 7 estadoCivil | 1..50 letras/espacios (opcional) | "Soltero" | >50, dígitos | "casado2" |
| 8 direccionResidencia | 3..200 (letras, dígitos, # . , -) | "Calle 45 # 12-34" | Vacío, <3, símbolos no permitidos | "Calle @%" |
| 9 numeroContacto | 7..10 dígitos | "3001234567" | Con letras, <7, >10, vacío | "30012a4567" |
| 10 correoElectronico | email válido (opcional) | "ana@mail.com" | Sin @, sin dominio | "ana@mail", "ana-mail.com" |
| 11 practicaDeporte | SI \| NO (opcional) | "SI" | Otro literal | "Si", "tal vez" |
| 12 cualDeporte | 2..100, solo si 11=SI | "Fútbol" | Presente con 11=NO/ausente, vacío | "Fútbol" con 11=NO |
| 13 tiempoQuePractica | 1..100 (opcional) | "3 años" | >100, vacío explícito | cadena de 101 |
| 14 contactoEmergencia | 5..200 | "María Pérez 3001112233" | Vacío, <5, >200 | "Mar" |
| 15 eps | 2..100 | "Nueva EPS" | Vacío, <2, símbolos | "@" |
| 16 antecedentesMedicos | Subset de los 8 literales, sin repetidos, "Ninguno" exclusivo | ["Alergias","fuma"] | Literal inválido, repetidos, "Ninguno"+otros | ["asma"], ["Ninguno","fuma"] |
| 17 antecedentesFamiliares | 1..500 (opcional) | "Diabetes en abuelos" | >500 | cadena de 501 |
| 18a enfermedadRelevante | SI \| NO | "NO" | Otro literal | "no se" |
| 18b cualEnfermedad | 2..300, solo si 18a=SI | "Hipertensión" | Presente con 18a=NO/ausente | "Hipertensión" con 18a=NO |
| 19 objetivosEntrenamiento | 5..1000 | "Ganar masa muscular" | Vacío, <5, >1000 | "Ganar" (4) |
| 20 nivelActividad | 1 de los 4 literales exactos | "estoy bastante activo durante mi dia" | Paráfrasis u otro texto | "muy activo" |
| 21 diasNoEntrenamiento | Subset de lunes..viernes, sin repetidos | ["lunes","viernes"] | "sabado", repetidos | ["sabado"] |
| 22 horaAcostarse | HH:MM 24h (opcional) | "22:30" | >23:59, formato 12h | "10:30 pm" |
| 23 comidasPorDia | Entero 1..12 (opcional) | 3 | 0, 13, decimal | 0, 13 |
| contrato | Solo claves del Anexo | 25 propiedades | Clave desconocida | `peso` |
| clienteId (ruta) | Existente | id de A | Inexistente | id fantasma → 404 |

## Análisis de Valores Límite

| Campo | Tipo | Mín | Máx | Mín−1 | Máx+1 |
|-------|------|-----|-----|-------|-------|
| 1 nombreCompleto | texto | 3 ("Ana") | 120 | 2 (400) | 121 (400) |
| 2 numeroDocumento | texto | 6 dígitos | 10 dígitos | 5 (400) | 11 (400) |
| 5 edad | entero | 13 | 100 | 12 (400) | 101 (400) |
| 6b lugarNacimiento | texto | 2 | 100 | 1 (400) | 101 (400) |
| 7 estadoCivil | texto | 1 | 50 | 0=vacío→ausente OK | 51 (400) |
| 8 direccionResidencia | texto | 3 | 200 | 2 (400) | 201 (400) |
| 9 numeroContacto | texto | 7 dígitos | 10 dígitos | 6 (400) | 11 (400) |
| 10 correoElectronico | texto | formato | 254 | 255 (400) | — |
| 12 cualDeporte | texto | 2 | 100 | 1 (400) | 101 (400) |
| 13 tiempoQuePractica | texto | 1 | 100 | 0=vacío→ausente OK | 101 (400) |
| 14 contactoEmergencia | texto | 5 | 200 | 4 (400) | 201 (400) |
| 15 eps | texto | 2 | 100 | 1 (400) | 101 (400) |
| 16 antecedentesMedicos | array | 0 (ausente OK) | 8 literales | — | 9 (inválido literal) |
| 17 antecedentesFamiliares | texto | 1 | 500 | 0=vacío→ausente OK | 501 (400) |
| 18b cualEnfermedad | texto | 2 | 300 | 1 (400) | 301 (400) |
| 19 objetivosEntrenamiento | texto | 5 | 1000 | 4 (400) | 1001 (400) |
| 21 diasNoEntrenamiento | array | 0 (ausente OK) | 5 | — | 6 (inválido literal) |
| 22 horaAcostarse | hora | 00:00 | 23:59 | 24:00 (400) | — |
| 23 comidasPorDia | entero | 1 | 12 | 0 (400) | 13 (400) |

## Tabla de Decisiones

### Condicionales SI/NO (campos 12 y 18b)
| 11 practicaDeporte | 12 cualDeporte | 18a enfermedadRelevante | 18b cualEnfermedad | Acción |
|-------|-------|-------|-------|--------|
| SI | diligenciado | SI | diligenciado | Válido (completo si además faltan 0 obligatorios) |
| SI | ausente | cualquier | cualquier | Completo: 400 "Cual deporte es requerido cuando practica algún deporte"; Parcial: PENDIENTE |
| NO | diligenciado | cualquier | cualquier | 400 "Cual deporte no aplica cuando no practica algún deporte" |
| ausente | diligenciado | cualquier | cualquier | 400 (mismo mensaje: solo aplica si 11=SI) |
| NO/ausente | ausente | cualquier | cualquier | Válido (campo 12 no aplica) |
| cualquier | cualquier | SI | diligenciado | Válido |
| cualquier | cualquier | SI | ausente | Completo: 400 "Cual enfermedad es requerida cuando tiene enfermedad relevante"; Parcial: PENDIENTE |
| cualquier | cualquier | NO | diligenciado | 400 "Cual enfermedad no aplica cuando no tiene enfermedad relevante" |
| cualquier | cualquier | ausente | diligenciado | 400 (mismo mensaje: solo aplica si 18a=SI) |
| cualquier | cualquier | NO/ausente | ausente | Válido (18b no aplica) |

### Antecedentes médicos (campo 16)
| Contiene "Ninguno" | Nº de valores | Repetidos | Acción |
|-------|-------|-------|--------|
| no | 0..8 | no | Válido |
| no | ≥2 | sí | 400 "Antecedentes médicos no puede tener valores repetidos" |
| sí | 1 | no | Válido (["Ninguno"]) |
| sí | >1 | — | 400 "Ninguno no se puede combinar con otros antecedentes médicos" |

## Transiciones de Estado

La entidad anamnesis tiene ciclo de vida derivado (PENDIENTE → COMPLETA), pero la
máquina de estados pertenece a **HU-11** (guardado progresivo): ver
`HU-11-criterios-aceptacion.md` §"Transiciones de Estado". En HU-09 solo aplica la
transición inicial: **(sin registro) --[registrar completo]--> COMPLETA**.
Transiciones inválidas: registrar un segundo registro para el mismo cliente bajo la
rec (a) de PEND-ANX-03 (una anamnesis por cliente) → el sistema actualiza, no duplica.

## Cobertura de Ramas

### Operación: registro/actualización de anamnesis (PROPUESTA `POST|PATCH /clientes/:clienteId/anamnesis`)
> **ENMIENDA C4 (INC-09, 2026-11-04 — R1)**: encabezado `POST|PUT` → `POST|PATCH`
> (el contrato ratificado usa PATCH, no PUT). **R4**: filas 3 y 5 re-escopadas
> (ver AN-05/AN-07 enmendados).

| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Happy path completo | 23 campos válidos | 201/200, estado COMPLETA, trazabilidad (AN-01, AN-04) |
| 2 | Cliente inexistente | clienteId fantasma | 404, nada persistido (AN-02) |
| 3 | Falta 1 obligatorio | parcial sin edad (≥1 diligenciado) | 201/200 **PENDIENTE** (AN-21/AN-22); la rama 400 del envío completo se verifica a nivel de schema (`registrarAnamnesisSchema`, unit) — AN-05 |
| 4 | Enum inválido | sexo "M" | 400 (AN-06) |
| 5 | Condicionada ausente en completo | 11=SI sin 12 | 201/200 **PENDIENTE** (AN-21/AN-22); la rama 400 del envío completo se verifica a nivel de schema (unit) — AN-07 |
| 6 | Condicionada contradictoria | 11=NO con 12 | 400 (AN-07) |
| 7 | Formato inválido | documento "CC1" | 400 (AN-08) |
| 8 | Límite excedido | edad 101 | 400 (AN-09) |
| 9 | "Ninguno" combinado | ["Ninguno","fuma"] | 400 (AN-10) |
| 10 | Clave desconocida | `peso` | 400 (AN-11) |
| 11 | Edición de existente | campos nuevos | actualización + trazabilidad nueva (AN-12) |
| 12 | Rol sin permiso de edición | token RECEPCIONISTA/CLIENTE | 403 (HU-10, PEND-ANX-04) |

## Reglas de Validación por Campo

Los `*` marcan obligatorio del Anexo; "opcional" = puede quedar sin diligenciar
(`null`/omitido; `""` se normaliza a sin diligenciar). Estado inicial de todos los
criterios: **NO VERIFICADO**.

| # | Campo | Tipo | * | Regex / límites | Valores permitidos | Mensaje de error (resumen) |
|---|-------|------|---|-----------------|--------------------|---------------------------|
| 1 | nombreCompleto | texto | sí | `^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$`, 3..120 | — | "Nombre completo solo puede contener letras y espacios" |
| 2 | numeroDocumento | texto | sí | `^\d{6,10}$` | — | "Número de documento debe ser numérico de 6 a 10 dígitos" |
| 3 | sexo | enum | sí | — | FEMENINO, MASCULINO | "Sexo debe ser FEMENINO o MASCULINO" |
| 4 | rh | texto | sí | `^(A\|B\|AB\|O)[+-]$` (i) | 8 tipos de sangre | "RH debe ser un tipo de sangre válido (…)" (PEND-ANX-05) |
| 5 | edad | entero | sí | 13..100 | — | "Edad debe estar entre 13 y 100" |
| 6a | fechaNacimiento | fecha | sí | YYYY-MM-DD real, no futura | — | "Fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)" |
| 6b | lugarNacimiento | texto | sí | `^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$`, 2..100 | — | "Lugar de nacimiento contiene caracteres no permitidos" |
| 7 | estadoCivil | texto | no | letras/espacios, 1..50 | — | "Estado civil solo puede contener letras y espacios" |
| 8 | direccionResidencia | texto | sí | `^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#.,-]+$`, 3..200 | — | "Dirección de residencia contiene caracteres no permitidos" |
| 9 | numeroContacto | texto | sí | `^\d{7,10}$` | — | "Número de contacto debe ser numérico de 7 a 10 dígitos" |
| 10 | correoElectronico | email | no | `^[^\s@]+@[^\s@]+\.[^\s@]+$`, ≤254 | — | "Correo electrónico tiene formato inválido" |
| 11 | practicaDeporte | enum | no | — | SI, NO | "Practica algún deporte debe ser SI o NO" |
| 12 | cualDeporte | texto | cond. | 2..100, `^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.-]+$` | solo si 11=SI | "Cual deporte no aplica cuando no practica algún deporte" |
| 13 | tiempoQuePractica | texto | no | 1..100 | — | "Tiempo que practica debe tener entre 1 y 100 caracteres" |
| 14 | contactoEmergencia | texto | sí | 5..200 | — | "Contacto de emergencia debe tener entre 5 y 200 caracteres" |
| 15 | eps | texto | sí | 2..100 | — | "EPS debe tener entre 2 y 100 caracteres" |
| 16 | antecedentesMedicos | multi | no | subset sin repetidos | Alergias, Fracturas o desgarros, cirugias, medicamentos, ingiere alcohol, consume psicoactivos, fuma, Ninguno | "Ninguno no se puede combinar con otros antecedentes médicos" |
| 17 | antecedentesFamiliares | texto | no | 1..500 | — | "Antecedentes familiares debe tener entre 1 y 500 caracteres" |
| 18a | enfermedadRelevante | enum | sí | — | SI, NO | "Enfermedad relevante debe ser SI o NO" |
| 18b | cualEnfermedad | texto | cond. | 2..300 | solo si 18a=SI | "Cual enfermedad no aplica cuando no tiene enfermedad relevante" |
| 19 | objetivosEntrenamiento | texto largo | sí | 5..1000 | — | "Objetivos de entrenamiento debe tener entre 5 y 1000 caracteres" |
| 20 | nivelActividad | enum | sí | — | los 4 literales exactos del Anexo | "Nivel de actividad debe ser una de las opciones permitidas" |
| 21 | diasNoEntrenamiento | multi | no | subset sin repetidos | lunes, martes, miercoles, jueves, viernes | "Días que no puede entrenar contiene un valor no permitido" |
| 22 | horaAcostarse | hora | no | `^([01]\d\|2[0-3]):[0-5]\d$` | — | "Hora para acostarse debe tener formato HH:MM (24 horas)" |
| 23 | comidasPorDia | entero | no | 1..12 (PEND-ANX-06) | — | "Comidas al día debe estar entre 1 y 12" |

## Decisiones pendientes del bloque 5 (PEND-ANX-01..06 — lista canónica)

> Están **NO RESUELTAS** por Producto. Cada una con recomendación **(a)** (la que
> implementan los schemas de este bloque) y alternativas. Ninguna bloquea la
> escritura de los criterios, pero PEND-ANX-01/02/04 deben resolverse antes de
> dar por ACEPTADA la implementación.

### PEND-ANX-01 — Partición sensible/operativa de los 23 campos (HU-10)
- **(a) Recomendada**: sensible = **{16 antecedentesMedicos, 17 antecedentesFamiliares,
  18a enfermedadRelevante, 18b cualEnfermedad}** (los "antecedentes medicos
  sensibles" literales de HU-10). Operativa = los 21 restantes, incluidos 14 contacto
  de emergencia, 15 EPS y 4 RH (datos vitales para emergencias que recepción debe
  poder ver).
- **(b)** Sensible ampliado = {4 rh, 16, 17, 18a, 18b} (RH como dato de salud).
- **(c)** Sensible restringido = {16, 18b} (solo lo explícitamente médico-narrativo).
- **Impacto**: define qué ve RECEPCIONISTA (`anamnesisRecepcionSchema` ya implementa
  (a) con `.omit`). Si Producto elige (b)/(c) se ajusta el `.omit` y el mapa
  `CLASIFICACION_CAMPOS` (HU-10-schemas.ts).

### PEND-ANX-02 — No-duplicado: campos 1-10 vs Cliente (HU-04/HU-05)
- **(a) Recomendada**: la anamnesis **almacena sus propios valores** (copia snapshot
  de lo diligenciado en su fecha — un documento clínico debe reflejar lo que el
  cliente diligenció, aunque su ficha cambie después), con **pre-llenado** desde el
  Cliente al crear. Sin doble cobro de puntos (DEC-016): los criterios de formato de
  1-10 reutilizan las reglas ya aceptadas, no puntúan de nuevo.
- **(b)** Derivar 1-10 del Cliente (una sola fuente de verdad; se pierde el valor
  histórico del formulario y diverge del papel).
- **(c)** Híbrido: copia + bandera de divergencia con la ficha actual (aviso al dueno).
- **Impacto**: modelado de persistencia (spec INC-09) y pre-llenado de UI.

### PEND-ANX-03 — Cardinalidad y trazabilidad de la anamnesis
- **(a) Recomendada**: **una anamnesis por cliente** (actualización, no duplicado) con
  `fechaActualizacion` + `actualizadoPorId` (literal HU-09 bullet 4; precedentes
  `ClienteEstadoCambio.actorId` / `pinResetPorId`). Sin historial de versiones en MVP.
- **(b)** Historial versionado (tabla de cambios como `ClienteEstadoCambio`).
- **Impacto**: AN-12 y los criterios de actualización.

### PEND-ANX-04 — Quién diligencia/edita la anamnesis (HU-10 literal vs flujo de recepción)
- **(a) Recomendada**: **solo DUENO crea/edita** (literal "Como dueno" de HU-09/HU-11;
  RECEPCIONISTA no puede diligenciar campos que no puede ver). Recepcionista y cliente
  solo lectura (la que les corresponda).
- **(b)** RECEPCIONISTA edita solo los campos operativos (S1/S2/S4 + 14/15).
- **(c)** RECEPCIONISTA crea un borrador de secciones operativas y el DUENO completa S3.
- **Impacto**: AN-19 de HU-10 y el guard 403 de escritura por rol.

### PEND-ANX-05 — Literales de RH (campo 4)
- **(a) Recomendada (implementada)**: regex estricto `^(A|B|AB|O)[+-]$` con select de
  8 valores en UI (el campo es "formato conocido": 8 valores reales).
- **(b)** Texto libre moderado (letras/`+`/`-`, 1..20) si en recepción transcriben
  variantes como "O positivo".
- **Impacto**: `rhBase` en HU-09-schemas.ts.

### PEND-ANX-06 — Límites numéricos y de longitud propuestos
- **(a) Recomendada (implementada)**: edad 13..100; comidas 1..12; nombre 3..120;
  dirección 3..200; objetivos 5..1000; y el resto según la tabla de reglas por campo.
- **(b)** Ajustar rangos (p. ej. edad 14..90, comidas 1..10) según criterio de Producto.
- **Impacto**: `*_base` en HU-09-schemas.ts y las tablas de valores límite.
