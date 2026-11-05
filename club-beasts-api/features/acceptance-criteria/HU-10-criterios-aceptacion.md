# Criterios de Aceptación - HU-10: Control de acceso a datos sensibles de anamnesis

## Resumen

Separar claramente la información **sensible** de la **operativa** de la anamnesis y
hacerla cumplir por rol: DUENO ve/edita la completa; RECEPCIONISTA no ve los
antecedentes médicos sensibles (ni siquiera en la respuesta de la API); CLIENTE solo
lectura de la suya (HU-28) y jamás la de otro cliente (precedentes SEC-01/SEC-03,
GAP-001).

**Decisiones aplicadas**:

- Permisos base **literales de HU-10**: DUENO ve/edita completa · RECEPCIONISTA no ve
  sensibles · CLIENTE solo lectura de la suya.
- **Partición sensible/operativa → DEC-055 (2026-11-04) RESUELVE PEND-ANX-01**
  (alternativa (b) ampliada, sobre la recomendación (a) del analista): sensible =
  **5 campos** — 4 `rh`, 16 `antecedentesMedicos`, 17 `antecedentesFamiliares`,
  18a/18b `enfermedadRelevante`/`cualEnfermedad` —; operativa = **20/25
  propiedades (19/23 campos)** (incluidos contacto de emergencia y EPS; `rh` ya
  no es operativa). La vista de RECEPCIONISTA (`anamnesisRecepcionSchema` con
  `.omit` de 5 claves) materializa DEC-055 en `HU-10-schemas.ts`.
- **PEND-ANX-04 (resuelta por DEC-058)**: solo DUENO crea/edita (literal "Como
  dueno" de HU-09/HU-11); además RECEPCIONISTA no podría diligenciar campos que
  no puede ver.
- **Defensa en profundidad**: el filtrado se hace en la **respuesta de la API**
  (`.omit` de campos sensibles para RECEPCIONISTA), no solo ocultando en UI.
- Privacidad del cliente: precedentes **SEC-01/SEC-03** (cliente jamás consulta ficha
  ajena: GAP-001 cerrado) y **DEC-041** (información interna staff no se expone al
  rol CLIENTE: aquí aplica al `actualizadoPorId`).
- Trazabilidad staff: `fechaActualizacion` + `actualizadoPorId` (HU-09 bullet 4).

> **ENMIENDA C4 (patrón C4) — INC-09-anamnesis-deportiva, ciclo RED 2026-11-04**
> (contrato de enmienda del orquestador; cambios documentados, nunca edición
> silenciosa; refs. ratificación backend R1..R8 / DEC-055):
> **(1)** Partición sensible/operativa: recomendación (a) (4 sensibles) →
> **DEC-055** (5 sensibles con `rh`); textos "4 sensibles" → "5 sensibles" y
> "21/23" → "20/25 propiedades (19/23 campos)" en todo el documento
> (INC09-R01). **(2)** Encabezado de operación de escritura: `POST|PUT` →
> `POST|PATCH` (R1: el contrato ratificado es PATCH, no PUT — misma corrección
> aplicada en HU-09/HU-11).

**Códigos HTTP y endpoints citados son PROPUESTA** (el contrato HTTP se fija en el
spec de INC-09). Los campos del formulario se definen en
`HU-09-criterios-aceptacion.md` (tabla canónica de 23 campos) — aquí no se repiten.

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El dueno puede ver y editar la anamnesis completa. | AN-13 (ver) + AN-14 (editar) | NO VERIFICADO |
| 2 | La recepcion no puede ver antecedentes medicos sensibles. | AN-15 | NO VERIFICADO |
| 3 | El cliente puede visualizar su propia anamnesis en modo solo lectura. | AN-17 (+ HU-28 AN-28..AN-33) | NO VERIFICADO |
| 4 | El sistema separa claramente la informacion sensible de la operativa. | AN-16 (mapa de clasificación) | NO VERIFICADO |

Criterios transversales de privacidad/seguridad del bloque: AN-18 (anamnesis ajena),
AN-19 (RECEPCIONISTA sin edición), AN-20 (sesión/rol no autenticado).

## Detalle por criterio

### AN-13 — DUENO ve la anamnesis completa
- **Dado** un DUENO autenticado y una anamnesis registrada (completa o pendiente).
- **Cuando** consulta la anamnesis de cualquier cliente.
- **Entonces** recibe los 25 valores de los 23 campos (incluidos los **5
  sensibles de DEC-055**: `rh`, `antecedentesMedicos`, `antecedentesFamiliares`,
  `enfermedadRelevante`, `cualEnfermedad`) + `estado` + `fechaActualizacion` +
  `actualizadoPorId` (`anamnesisDuenoSchema`).
- **Prueba esperada**: integración → "GET con token DUENO contiene los 5 campos
  sensibles con sus valores".

### AN-14 — DUENO edita la anamnesis completa
- **Dado** un DUENO autenticado.
- **Cuando** envía creación o edición de la anamnesis (cualquier campo, sensible u
  operativo).
- **Entonces** la operación se acepta (201/200, PROPUESTA) y la trazabilidad se
  registra a su nombre (AN-04 de HU-09). La edición de campos sensibles no requiere
  rol adicional ni segundo factor en MVP (fuera de alcance; ver riesgos).
- **Prueba esperada**: integración → "DUENO edita `antecedentesFamiliares`; GET lo
  refleja y `actualizadoPorId` = actor".

### AN-15 — RECEPCIONISTA NO ve antecedentes médicos sensibles
- **Dado** un RECEPCIONISTA autenticado y una anamnesis con campos sensibles
  diligenciados.
- **Cuando** consulta la anamnesis del cliente.
- **Entonces** la respuesta contiene la parte operativa (**20/25 propiedades =
  19/23 campos** + metadatos staff `clienteId, estado, fechaActualizacion,
  actualizadoPorId`) y **NO contiene** los **5 campos sensibles de DEC-055**
  (`rh`, `antecedentesMedicos`, `antecedentesFamiliares`, `enfermedadRelevante`,
  `cualEnfermedad`): ni valores ni claves viajan en el cuerpo
  (`anamnesisRecepcionSchema` con `.omit` de 5). Un intento de
  forzar la lectura completa (p. ej. parámetro `?completa=true` o endpoint de detalle
  sensible, si existiera) responde 403 `AUTH_FORBIDDEN` (PROPUESTA) — el filtrado no
  depende de la UI.
- **Qué NO cubre**: qué hace la UI con la ausencia (criterio de frontend), auditoría
  de intentos de acceso (fuera de MVP, ver riesgos).
- **Prueba esperada**: integración → "GET con token RECEPCIONISTA: `expect(body).not.
  toHaveProperty('antecedentesMedicos')` (idem los 4 restantes de DEC-055) y los
  operativos presentes"; y "el crudo de la respuesta (texto) no contiene el valor sensible".

### AN-16 — Separación explícita sensible/operativa
- **Dado** el contrato de 23 campos.
- **Cuando** se define la clasificación de cada campo.
- **Entonces** existe un mapa campo→clasificación **documentado y ejecutable**
  (`CLASIFICACION_CAMPOS` en HU-10-schemas.ts) con exactamente dos clases
  (SENSIBLE/OPERATIVA) que cubre los 25 campos; cada vista de rol se deriva de ese
  mapa (DUENO: todo; RECEPCIONISTA: operativa). Clasificación actual = **DEC-055
  (2026-11-04, PEND-ANX-01 resuelta)**: SENSIBLE = `rh` + 16/17/18a/18b (5
  propiedades), OPERATIVA = 20/25 propiedades (19/23 campos).
- **Prueba esperada**: unidad → "cada una de las 25 propiedades tiene clasificación;
  `anamnesisRecepcionSchema` excluye exactamente las 5 marcadas SENSIBLE".

### AN-17 — CLIENTE solo lectura de la suya
- **Dado** un CLIENTE autenticado.
- **Cuando** consulta su anamnesis (HU-28) o intenta escribir cualquier anamnesis.
- **Entonces** lectura concedida solo sobre su propia anamnesis (ver HU-28:
  AN-28..AN-33) y **toda** escritura rechazada con 403 `AUTH_FORBIDDEN` (PROPUESTA),
  aunque los datos enviados fueran válidos. La API no expone rutas de edición con
  permiso CLIENTE (HU28-AN-29).
- **Prueba esperada**: integración → "POST/PATCH con token CLIENTE → 403 y la BD no
  cambia".

### AN-18 — Privacidad: jamás la anamnesis de otro cliente
- **Dado** un CLIENTE autenticado (cliente A) y la anamnesis de otro cliente B.
- **Cuando** A consulta (por id, cédula, URL directa o cualquier parámetro) la
  anamnesis de B.
- **Entonces** 403 `AUTH_FORBIDDEN` o 404 `NOT_FOUND` (PROPUESTA; patrón aceptado de
  SEC-01/SEC-03/GAP-001) y **ningún dato de B** viaja en la respuesta. Lo mismo aplica
  a consultas staff sin sesión válida (AN-20).
- **Prueba esperada**: integración (precedente `clientes-privacy.test.ts`) → "cliente
  A pide la anamnesis de B → 403/404 sin datos"; e2e → "URL directa de la anamnesis
  de otro cliente en el portal → mensaje de error, sin datos".

### AN-19 — RECEPCIONISTA sin edición
- **Dado** un RECEPCIONISTA autenticado (bajo la rec (a) de **PEND-ANX-04**).
- **Cuando** intenta crear o editar una anamnesis.
- **Entonces** 403 `AUTH_FORBIDDEN` (PROPUESTA) y nada persiste. Si Producto aprueba
  (b)/(c) este criterio se reescribe con alcance nuevo (edición de operativos) — no
  se acepta a medias.
- **Prueba esperada**: integración → "POST con token RECEPCIONISTA → 403; GET
  posterior sin cambios".

### AN-20 — Sin sesión válida / rol no autorizado
- **Dado** una petición sin token, con token expirado o con rol no contemplado.
- **Cuando** consulta o escribe la anamnesis.
- **Entonces** 401 `AUTH_REQUIRED` (PROPUESTA; precedente `auth-session-expired.test.ts`)
  **sin ningún fragmento** de datos de la anamnesis en la respuesta (ni en headers ni
  en body de error).
- **Prueba esperada**: integración → "sin token → 401; token expirado → 401; body sin
  datos de anamnesis".

## Partición de Equivalencia

| Entrada | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|---------|-------------|---------|---------------|---------|
| rol + acción ver completa | DUENO | token DUENO → 23 campos | RECEPCIONISTA, CLIENTE | token RECEPCIONISTA → solo operativa |
| rol + acción editar | DUENO | token DUENO → 200/201 | RECEPCIONISTA, CLIENTE | token → 403 |
| cliente objetivo (CLIENTE) | anamnesis propia | A consulta la de A | anamnesis ajena | A consulta la de B → 403/404 |
| sesión | token vigente | Bearer válido | ausente/expirado | sin Authorization → 401 |
| campo sensible en respuesta RECEPCIONISTA | ausente (clave y valor) | body sin `antecedentesMedicos` | presente o enmascarado en claro | `antecedentesMedicos: []` presente → falla |

## Análisis de Valores Límite

Las fronteras de este HU son de **alcance de rol**, no numéricas (los límites de
campos están en HU-09 §Valores límite):

| Frontera | Caso | Resultado esperado |
|----------|------|--------------------|
| nº de campos sensibles visibles a RECEPCIONISTA | 0 (mín) = correcto | 5 ausentes |
| nº de campos sensibles visibles a DUENO | 5 (máx) = correcto | los 5 presentes |
| nº de anamnesis consultables por CLIENTE | 1 (la propia) | cualquier otra → 403/404 |
| nº de anamnesis editables por rol ≠ DUENO | 0 | cualquier intento → 403 |
| nº de anamnesis editables por DUENO | N (las de sus clientes) | cliente inexistente → 404 |

## Tabla de Decisiones

### Acceso por rol × recurso × acción (mapa de AN-13..AN-20)
| Rol | Recurso | Acción | Campos | Resultado |
|-----|---------|--------|--------|-----------|
| DUENO | anamnesis de cualquier cliente | leer | 23/23 | 200 completo |
| DUENO | anamnesis de cualquier cliente | crear/editar | 23/23 | 201/200 + trazabilidad |
| RECEPCIONISTA | anamnesis de cualquier cliente | leer | 19/23 campos = 20/25 props (sin los 5 sensibles de DEC-055) | 200 operativa |
| RECEPCIONISTA | anamnesis de cualquier cliente | crear/editar | — | 403 (rec (a) PEND-ANX-04) |
| CLIENTE | su anamnesis | leer | 23/23 propios | 200 (HU-28) |
| CLIENTE | su anamnesis | crear/editar | — | 403 |
| CLIENTE | anamnesis ajena | leer | — | 403/404 (SEC-01/SEC-03) |
| CLIENTE | anamnesis ajena | crear/editar | — | 403/404 |
| sin sesión / expirada | cualquier anamnesis | leer/escribir | — | 401 sin datos |

### Filtrado de campo sensible (DEC-055: 5 sensibles)
| Campo | DUENO | RECEPCIONISTA | CLIENTE (propia) | CLIENTE (ajena) |
|-------|-------|---------------|------------------|-----------------|
| 4 rh | ver+editar | **oculto** | ver (solo lectura) | 403/404 |
| 16 antecedentesMedicos | ver+editar | **oculto** | ver (solo lectura) | 403/404 |
| 17 antecedentesFamiliares | ver+editar | **oculto** | ver | 403/404 |
| 18a/18b enfermedadRelevante/cual | ver+editar | **oculto** | ver | 403/404 |
| 19 campos operativos (20 propiedades) | ver+editar | ver | ver | 403/404 |
| metadatos (`fechaActualizacion`) | ver | ver | ver (fecha) | 403/404 |
| metadatos (`actualizadoPorId`) | ver | ver | **oculto** (DEC-041) | 403/404 |

## Transiciones de Estado

No aplica al ciclo de vida de la anamnesis (ver HU-11) ni a estados de sesión en este
documento. **Justificación**: los criterios de HU-10 son de autorización estática por
rol (matriz de permisos), sin estados propios que transicionen; la expiración de
sesión ya está cubierta por el bloque AUTH aceptado (INC-00, `auth-session-expired.test.ts`).
Lo único observable en el tiempo es la trazabilidad de edición (AN-04 de HU-09).

## Cobertura de Ramas

### Operación: consulta de anamnesis (PROPUESTA `GET /clientes/:clienteId/anamnesis`)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | DUENO consulta | token DUENO | 200 con 23 campos + metadatos |
| 2 | RECEPCIONISTA consulta | token RECEPCIONISTA | 200 con 20/25 props (19/23 campos; sin los 5 sensibles de DEC-055) |
| 3 | CLIENTE consulta la propia | token CLIENTE, su id | 200 completo (HU-28) |
| 4 | CLIENTE consulta ajena | token CLIENTE, id ajeno | 403/404 sin datos |
| 5 | Sin sesión / expirada | sin token | 401 sin datos |
| 6 | Cliente inexistente | id fantasma | 404 |

### Operación: escritura de anamnesis (PROPUESTA `POST|PATCH /clientes/:clienteId/anamnesis`)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | DUENO escribe | token DUENO | 201/200 + trazabilidad |
| 2 | RECEPCIONISTA escribe | token RECEPCIONISTA | 403 (rec (a)) |
| 3 | CLIENTE escribe (la propia o ajena) | token CLIENTE | 403 |
| 4 | Sin sesión / expirada | sin token | 401 |

## Reglas de Validación por Campo

Este HU **no** agrega reglas de contenido (las 25 propiedades se validan con la tabla
canónica de `HU-09-criterios-aceptacion.md` §"Reglas de Validación por Campo"). Sus
reglas son de **visibilidad**:

| Campo | Clasificación (DEC-055) | DUENO | RECEPCIONISTA | CLIENTE |
|-------|--------------------------------------|-------|---------------|---------|
| 4 rh, 16, 17, 18a, 18b | SENSIBLE (5 propiedades) | ver+editar | no visible | ver (suya) |
| Resto (19 campos = 20 propiedades) | OPERATIVA | ver+editar | ver | ver (suya) |
| estado, fechaActualizacion | metadato | ver | ver | ver (suya) |
| actualizadoPorId | metadato staff | ver | ver | no visible |
