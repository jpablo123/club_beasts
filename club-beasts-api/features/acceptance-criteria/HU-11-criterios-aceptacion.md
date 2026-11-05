# Criterios de Aceptación - HU-11: Guardado progresivo de anamnesis

## Resumen

Permitir guardar la anamnesis **aunque esté incompleta**, marcarla como
`PENDIENTE`/`COMPLETA`, y retomarla después sin perder información.

## Reconciliación HU-11 vs obligatorios (*) — regla propuesta (obligatoria de cubrir)

| Pregunta | Respuesta propuesta (Producto, coherente con DEC-052 + HU-11) |
|----------|---------------------------------------------------------------|
| ¿Los `*` impiden guardar incompleto? | **NO.** Guardar incompleto está permitido (HU-11 bullet 1). Los `*` NO son un impedimento de guardado. |
| ¿Qué definen entonces los `*`? | Definen **"anamnesis completa"**: con los 14 valores obligatorios + los condicionales aplicables (12 si 11=SI, 18b si 18a=SI) diligenciados, el estado es `COMPLETA`; si falta alguno, `PENDIENTE`. |
| ¿Un campo presente con formato inválido se guarda? | **NO.** "Guardar incompleto" ≠ "aceptar inválido": todo campo presente se valida por completo (formato, enums, límites, contradicciones SI/NO → 400 con mensaje específico). Solo las **ausencias** son toleradas. |
| ¿Quién marca pendiente/incompleta? | El sistema la marca **derivando** el estado en cada guardado (no es un campo que el usuario elija). |
| ¿Se degrada una anamnesis COMPLETA? | Sí (rec (a), AN-25): si una edición borra un obligatorio, el estado recalculado vuelve a `PENDIENTE`; el guardado no se bloquea. |

**Decisiones aplicadas**: DEC-052 + Anexo (23 campos, contrato cerrado), DEC-021
intacta, DEC-016 (sin doble cobro). Códigos HTTP/endpoints son **PROPUESTA** (el
contrato HTTP se fija en el spec de INC-09).

> **ENMIENDA C4 (patrón C4) — INC-09-anamnesis-deportiva, ciclo RED 2026-11-04**
> (contrato de enmienda del orquestador; cambios documentados, nunca edición
> silenciosa; refs. ratificación backend R1..R8 / DEC-055):
> **(1)** Semántica de merge del PATCH ratificado documentada en AN-23/AN-25:
> clave **ausente** = conserva el valor previo; clave presente con `null` o
> `""` = **vacía** el campo; clave presente con valor = valida y reemplaza
> (R3/C3a). **(2)** AN-26 explicitado como **guarda de body** del POST y del
> PATCH (`{}` o solo claves vacías `null`/`""` → 400; ≥1 campo diligenciado →
> válido) (R3/AN-26). **(3)** Encabezado de operación de guardado:
> `POST|PUT` → `POST|PATCH` (R1).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El sistema permite guardar la anamnesis incompleta. | AN-21 (+ AN-24: lo presente se valida) | NO VERIFICADO |
| 2 | El sistema marca la anamnesis como pendiente o incompleta. | AN-22 (marca derivada) | NO VERIFICADO |
| 3 | El dueno puede retomarla y completarla despues. | AN-23 (+ AN-27: retomar sin pérdida) | NO VERIFICADO |

Criterios de soporte del flujo: AN-25 (degradación), AN-26 (registro vacío).

## Detalle por criterio

### AN-21 — Guardar incompleto permitido
- **Dado** un DUENO con una anamnesis sin diligenciar (o a medio llenar).
- **Cuando** guarda con campos faltantes (incluidos obligatorios `*`).
- **Entonces** el guardado se acepta (201/200, PROPUESTA), los campos diligenciados
  persisten íntegros, los faltantes quedan sin diligenciar y el estado resultante es
  `PENDIENTE`. **Ninguna ausencia produce 400** (en `guardarParcialAnamnesisSchema`
  los campos son opcionales; `null`/`""`/omitido = sin diligenciar).
- **Prueba esperada**: integración → "guardar solo S1 → 201, estado PENDIENTE, GET
  devuelve S1 completo y S2-S4 sin diligenciar".

### AN-22 — Marca derivada automática PENDIENTE/COMPLETA
- **Dado** cualquier guardado (completo, parcial o edición).
- **Cuando** el sistema calcula la marca.
- **Entonces** `COMPLETA` sii faltan 0 valores requeridos (14 obligatorios `*` +
  condicionales aplicables 12/18b); `PENDIENTE` si falta ≥1. La marca es **derivada
  y observable** en el DTO (`estado`), nunca un valor seleccionable a mano y nunca
  inconsistente con los datos guardados (`derivarEstadoAnamnesis`).
- **Prueba esperada**: unidad parametrizada → faltan 1 obligatorio → PENDIENTE;
  faltan 0 → COMPLETA; 11=SI sin 12 → PENDIENTE; 11=SI con 12 → COMPLETA (si no
  falta otro).

### AN-23 — Retomar y completar (PENDIENTE → COMPLETA)
- **Dado** una anamnesis `PENDIENTE` guardada previamente.
- **Cuando** el DUENO la retoma, diligencia los campos faltantes y guarda.
- **Entonces** los valores previos se conservan (nada se pierde), el estado pasa a
  `COMPLETA` y la trazabilidad se renueva (AN-04 de HU-09: fecha + usuario responsable).
- **ENMIENDA C4 (INC-09, 2026-11-04 — R3/C3a)**: el contrato de edición es
  **PATCH con semántica de merge** — clave ausente = conserva; `null`/`""` =
  vacía el campo; valor = valida y reemplaza. Solo se agregan/cambian los campos
  presentes en el body.
- **Prueba esperada**: integración → "guardar parcial; luego guardar completo; GET
  único con todos los valores y estado COMPLETA"; "clave ausente conserva el valor previo".

### AN-24 — Lo presente se valida (guardar incompleto ≠ aceptar inválido)
- **Dado** un guardado parcial con campos diligenciados.
- **Cuando** algún campo presente tiene formato/enum fuera del contrato, excede un
  límite, repite valores, combina "Ninguno" o contradice un SI/NO (p. ej. `cualDeporte`
  con `practicaDeporte` = "NO").
- **Entonces** 400 `VALIDATION_ERROR` con el mensaje específico del campo (tabla
  canónica de HU-09) **aunque falten otros campos**. La anamnesis no se guarda (o no
  se modifica si era una edición).
- **Prueba esperada**: integración → "parcial con `edad: 200` → 400; parcial con
  `edad` ausente → 201 PENDIENTE".

### AN-25 — Degradación COMPLETA → PENDIENTE (rec (a))
- **Dado** una anamnesis `COMPLETA`.
- **Cuando** el DUENO edita y deja sin diligenciar un obligatorio (o quita una
  condicional aplicable) y guarda.
- **Entonces** el guardado se acepta y el estado recalculado es `PENDIENTE`
  (rec (a): la marca sigue a los datos; alternativa (b) = rechazar con 400 exigiendo
  mantener completitud — solo si Producto la prefiere).
- **ENMIENDA C4 (INC-09, 2026-11-04 — R3/C3a)**: "dejar sin diligenciar" se expresa
  con la semántica de merge del PATCH — el body envía la clave con `null` o `""`
  (**vacía** el campo); clave ausente = conserva (no degrada). Es la única vía de
  borrado (sin DELETE).
- **Prueba esperada**: integración → "COMPLETA; PATCH `{eps: null}` (con ≥1 campo
  diligenciado en el body) → 200 estado PENDIENTE"; idem con `""`.

### AN-26 — Al menos un campo diligenciado
- **Dado** un intento de guardado sin ningún campo diligenciado.
- **Cuando** llega el objeto de campos vacío (todo `null`/omitido) o solo claves vacías.
- **Entonces** 400 "La anamnesis debe tener al menos un campo diligenciado" (PROPUESTA):
  un registro sin contenido no tiene nada que preservar. (Con 1 solo campo ya es
  válido → PENDIENTE.)
- **ENMIENDA C4 (INC-09, 2026-11-04 — R3)**: AN-26 es **guarda de body** del POST y
  del PATCH (primer paso de validación del body tras el schema de tipos): `{}`
  o body con solo claves vacías (`null`/`""`) → 400 con el mensaje de este criterio;
  ≥1 campo diligenciado (con valor) → body válido. La guarda cuenta campos con
  valor, no claves presentes: un body de solo limpiezas (`null`/`""`) no se acepta.
- **Prueba esperada**: integración → "body `{}` → 400; body solo `null`/`""` → 400;
  body con 1 campo diligenciado → 201/200".

### AN-27 — Retomar sin pérdida (recuperación del estado de trabajo)
- **Dado** una anamnesis `PENDIENTE`.
- **Cuando** el DUENO la abre para retomarla.
- **Entonces** la consulta devuelve **todos** los valores ya guardados (con los
  literales exactos con que se diligenciaron), el estado `PENDIENTE`, la
  `fechaActualizacion` y el `actualizadoPorId` de quien guardó por última vez — la
  UI puede continuar desde ahí sin repetir trabajo.
- **Prueba esperada**: integración → "guardar parcial; GET devuelve exactamente lo
  guardado + metadatos".

## Partición de Equivalencia

| Entrada | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|---------|-------------|---------|---------------|---------|
| conjunto de campos en guardado parcial | 1..25 diligenciados válidos | solo S1 | 0 campos diligenciados | `{}` → 400 |
| campos ausentes | cualquier cantidad (0..N) | faltan 8 | — (ausencia nunca es error) | — |
| campo presente | válido por la tabla de HU-09 | `edad: 25` | formato/límite/enum inválido | `edad: 200` → 400 |
| contradicción SI/NO | condicional coherente | 11=SI + 12 | condicional huérfana | 11=NO + 12 → 400 |
| estado derivado | función de completitud | 0 faltantes → COMPLETA | marca manual en el body | `estado: "COMPLETA"` con faltantes → ignorada/400 (ver nota) |

> Nota: el `estado` **nunca viaja como entrada** que el usuario pueda fijar
> (`guardarParcialAnamnesisSchema` no lo incluye entre los 23 campos; el contrato
> cerrado de HU11-AN-11/HU-09-AN-11 rechazaría la clave en el objeto de campos).

## Análisis de Valores Límite

| Frontera | Mín | Máx | Mín−1 | Máx+1 |
|----------|-----|-----|-------|-------|
| campos diligenciados en guardado parcial | 1 (201 PENDIENTE) | 25 (todos) | 0 (`{}` → 400, AN-26) | — (26 = clave desconocida → 400) |
| obligatorios `*` faltantes para marca | 0 → COMPLETA | 14 → PENDIENTE | — | — (15 = campo inexistente → 400) |
| condicionales aplicables faltantes | 0 → COMPLETA | 2 → PENDIENTE | — | — |
| ediciones sucesivas sin pérdida | 1..N guardados | — | 0 (sin guardado no hay estado) | — |

## Tabla de Decisiones

### Marca derivada (AN-22) — combinaciones de completitud
| Faltan obligatorios (*) | Faltan condicionales aplicables | Contradicción SI/NO | Campo presente inválido | Resultado |
|-------|-------|-------|-------|--------|
| 0 | 0 | no | no | guardado OK → **COMPLETA** |
| ≥1 | cualquiera | no | no | guardado OK → **PENDIENTE** |
| 0 | ≥1 | no | no | guardado OK → **PENDIENTE** |
| cualquiera | cualquiera | sí | no | **400** (contradicción) |
| cualquiera | cualquiera | cualquiera | sí | **400** (mensaje del campo) |
| todos ausentes (0 campos) | — | — | — | **400** (AN-26) |

### Degradación (AN-25)
| Estado previo | Edición | Resultado (rec (a)) |
|---------------|---------|---------------------|
| COMPLETA | completa (0 faltantes) | COMPLETA |
| COMPLETA | borra 1 obligatorio | PENDIENTE |
| PENDIENTE | agrega lo faltante | COMPLETA (AN-23) |
| PENDIENTE | sigue incompleta | PENDIENTE |

## Transiciones de Estado

### Entidad: Anamnesis (estado derivado, un registro por cliente — PEND-ANX-03 rec (a))
| Estado Actual | Evento | Estado Siguiente | Válido |
|--------------|--------|-----------------|--------|
| (sin registro) | guardar con ≥1 campo y ≥1 requerido faltante | PENDIENTE | ✅ AN-21 |
| (sin registro) | registrar completo (0 faltantes) | COMPLETA | ✅ AN-01/AN-22 |
| (sin registro) | guardar sin ningún campo | — (sin registro) | ❌ 400 AN-26 |
| PENDIENTE | retomar + completar requeridos | COMPLETA | ✅ AN-23 |
| PENDIENTE | guardar segu incompleta | PENDIENTE | ✅ AN-21 |
| PENDIENTE | guardar con campo inválido/contradicción | PENDIENTE (sin cambio) | ❌ 400 AN-24 |
| COMPLETA | editar sin borrar requeridos | COMPLETA | ✅ AN-22 |
| COMPLETA | editar borrando ≥1 requerido | PENDIENTE | ✅ AN-25 (rec (a)) |
| cualquiera | segunda anamnesis para el mismo cliente | — | ❌ actualiza, no duplica (PEND-ANX-03) |

```
(sin registro) --[guardar con faltantes]--> PENDIENTE --[completar requeridos]--> COMPLETA
(sin registro) --[registrar completo]---------------------> COMPLETA
COMPLETA --[edición borra requerido]--> PENDIENTE
```

## Cobertura de Ramas

### Operación: guardado progresivo (PROPUESTA `POST|PATCH /clientes/:clienteId/anamnesis`)
> **ENMIENDA C4 (INC-09, 2026-11-04 — R1)**: encabezado `POST|PUT` → `POST|PATCH`
> (el contrato ratificado usa PATCH, no PUT).
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Guardado parcial feliz | 1..N campos válidos | 201/200 PENDIENTE (AN-21) |
| 2 | Registro completo | 0 faltantes | COMPLETA (AN-22) |
| 3 | Retomar y completar | 2º guardado completo | COMPLETA, sin pérdida (AN-23) |
| 4 | Campo presente inválido en parcial | `edad: 200` | 400 (AN-24) |
| 5 | Contradicción SI/NO en parcial | 11=NO + 12 | 400 (AN-24) |
| 6 | Degradación | COMPLETA − obligatorio | PENDIENTE (AN-25) |
| 7 | Objeto vacío | `{}` | 400 (AN-26) |
| 8 | Recuperación | GET de PENDIENTE | valores + metadatos (AN-27) |
| 9 | Rol sin edición | token RECEPCIONISTA/CLIENTE | 403 (HU-10 AN-19) |

## Reglas de Validación por Campo

No hay reglas nuevas por campo: los 23 campos usan la tabla canónica de
`HU-09-criterios-aceptacion.md` §"Reglas de Validación por Campo", aplicada solo a
los campos **presentes**. Las reglas propias de este HU son de conjunto: ≥1 campo
diligenciado (AN-26), consistencia SI/NO (AN-24) y derivación de estado (AN-22).

## Decisiones pendientes que afectan a este HU

- **PEND-ANX-03** (cardinalidad/trazabilidad, rec (a) = una anamnesis por cliente +
  última actualización): define si AN-23 crea o actualiza. Detalle en
  `HU-09-criterios-aceptacion.md` §"Decisiones pendientes del bloque 5".
- **PEND-ANX-04** (quién edita, rec (a) = solo DUENO): define el rol de AN-21/AN-23.
- **PEND-ANX-06** (límites): no cambia la semántica del guardado progresivo.
