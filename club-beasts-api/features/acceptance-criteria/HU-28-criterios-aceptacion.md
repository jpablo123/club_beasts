# Criterios de Aceptación - HU-28: Visualización de anamnesis en modo lectura

## Resumen

El cliente consulta **su** anamnesis en modo **solo lectura**, organizada por las
secciones del formulario, sin posibilidad de editarla y sin acceso a la de otros
clientes (privacidad: precedentes SEC-01/SEC-03, GAP-001).

**Decisiones aplicadas**:

- **Solo lectura** (HU-28 bullets 1-2): no existe contrato de escritura para el rol
  CLIENTE — la omisión es deliberada (`HU-28-schemas.ts` exporta solo DTOs de
  lectura). Toda escritura con token CLIENTE → 403 (HU-10 AN-17).
- **Organizado por secciones** (HU-28 bullet 3): las 4 secciones exactas del Anexo
  DEC-052 (`SECCIONES_ANAMNESIS`, `anamnesisClienteSeccionesSchema`).
- El cliente ve **su anamnesis completa**, incluidos sus propios antecedentes
  sensibles (son datos suyos; HU-10 bullet 3 dice "su propia anamnesis"). La
  restricción sensible/operativa es para **staff** (HU-10), no para el titular.
- Sin `actualizadoPorId` en la vista del cliente (analogía **DEC-041**: información
  interna del staff no se expone al rol CLIENTE); sí `fechaActualizacion` y `estado`.
- Sin anamnesis registrada → respuesta clara `SIN_REGISTRO` con mensaje (patrón de
  HU-27 "mensaje claro si no existe plan activo") — propuesta de comportamiento
  observable para no dejar pantalla vacía.
- **PEND-ANX-01/03/04** (partición sensible, cardinalidad, quién edita) siguen
  abiertas: ver lista canónica en `HU-09-criterios-aceptacion.md`.

**Códigos HTTP/endpoints son PROPUESTA** (el contrato HTTP se fija en el spec de INC-09).

## Tabla de trazabilidad: bullet → criterio

| # | Bullet de la HU | ID criterio | Estado inicial |
|---|-----------------|-----------|----------------|
| 1 | El cliente puede consultar su anamnesis en modo solo lectura. | AN-28 | NO VERIFICADO |
| 2 | El cliente no puede editarla. | AN-29 | NO VERIFICADO |
| 3 | El contenido se presenta organizado por secciones. | AN-30 | NO VERIFICADO |

Criterios de soporte: AN-31 (anamnesis ajena), AN-32 (sin registro), AN-33
(estado/última actualización visibles).

## Detalle por criterio

### AN-28 — El cliente consulta su anamnesis
- **Dado** un CLIENTE autenticado con anamnesis registrada (propia).
- **Cuando** consulta su anamnesis desde el portal.
- **Entonces** 200 (PROPUESTA) con sus 25 valores (23 campos; lo no diligenciado
  viaja como `null`) + `estado` + `fechaActualizacion` (`anamnesisClienteSchema`).
- **Qué NO cubre**: la anamnesis de otros clientes (AN-31), edición (AN-29), ficha
  staff (HU-10), diseño visual del portal.
- **Prueba esperada**: e2e portal → "login cliente; abrir mi anamnesis; se muestran
  mis datos"; integración → "GET con token CLIENTE devuelve los valores guardados".

### AN-29 — Solo lectura (sin edición)
- **Dado** un CLIENTE autenticado.
- **Cuando** intenta editar (enviar cualquier cambio por cualquier ruta de escritura)
  o manipula la UI para habilitar controles.
- **Entonces** toda escritura responde 403 `AUTH_FORBIDDEN` (PROPUESTA) y la BD no
  cambia; la vista no presenta controles de edición (botones/guardar) y el contenido
  se muestra como texto informativo. **No existe** schema de entrada para CLIENTE en
  `HU-28-schemas.ts` (verificación: la API rechaza antes de validar).
- **Prueba esperada**: integración → "POST/PATCH con token CLIENTE → 403 y GET
  posterior idéntico"; e2e → "no hay botón de editar/guardar en la vista".

### AN-30 — Organizada por secciones
- **Dado** la anamnesis del cliente (con datos o parcial).
- **Cuando** se presenta en el portal.
- **Entonces** el contenido está agrupado en las 4 secciones exactas del formulario
  (`anamnesisClienteSeccionesSchema`): **S1** Identificacion personal, **S2** Deporte,
  **S3** Emergencia y salud, **S4** Objetivos y estilo de vida — cada campo en su
  sección del Anexo, sin campos huérfanos ni duplicados. Lo no diligenciado se
  muestra como vacío/"sin diligenciar" dentro de su sección, nunca ocultando la
  sección entera.
- **Prueba esperada**: integración → "la respuesta agrupada contiene las 25
  propiedades exactas repartidas 11/3/6/5"; e2e → "los 4 encabezados de sección se
  muestran en orden".

### AN-31 — Jamás la anamnesis de otro cliente
- **Dado** dos clientes A y B con anamnesis.
- **Cuando** A consulta (por id, cédula, URL directa, parámetro manipulado o recarga)
  la anamnesis de B.
- **Entonces** 403 `AUTH_FORBIDDEN` o 404 `NOT_FOUND` (PROPUESTA) y ningún dato de B
  en la respuesta (patrón aceptado SEC-01/SEC-03/GAP-001; ver matriz de navegación
  del bloque para URL directa/recarga/atrás). Una recarga de la vista propia sigue
  funcionando (la sesión del cliente no rompe su propia consulta).
- **Prueba esperada**: integración (precedente `clientes-privacy.test.ts`) → "A pide
  la de B → 403/404 sin datos"; e2e → "URL directa ajena → error, sin datos".

### AN-32 — Sin anamnesis registrada: mensaje claro
- **Dado** un CLIENTE autenticado sin anamnesis registrada.
- **Cuando** consulta su anamnesis.
- **Entonces** 200 (PROPUESTA) con `estado: "SIN_REGISTRO"` y un mensaje claro
  (`anamnesisSinRegistroSchema`, ej. "Aún no se ha registrado tu anamnesis") — nunca
  500, pantalla vacía ni un formulario editable (sigue siendo solo lectura).
- **Prueba esperada**: integración → "cliente sin anamnesis → SIN_REGISTRO + mensaje";
  e2e → "el portal muestra el mensaje".

### AN-33 — Estado y última actualización visibles
- **Dado** una anamnesis propia (PENDIENTE o COMPLETA).
- **Cuando** el cliente la consulta.
- **Entonces** ve el estado derivado (`PENDIENTE`/`COMPLETA`, HU-11) y la
  `fechaActualizacion`; NO ve `actualizadoPorId` (DEC-041: metadatos internos del
  staff no se exponen al rol CLIENTE). La marca `PENDIENTE` se presenta como
  información ("anamnesis pendiente de completar"), sin acciones para modificarla.
- **Prueba esperada**: integración → "respuesta sin `actualizadoPorId`, con `estado`
  y `fechaActualizacion`"; e2e → "la marca de estado se muestra".

## Partición de Equivalencia

| Entrada | Clase Válida | Ejemplo | Clase Inválida | Ejemplo |
|---------|-------------|---------|---------------|---------|
| cliente objetivo | la propia anamnesis | A consulta la de A | anamnesis ajena | A → la de B (403/404) |
| existencia de anamnesis | registrada (cualquier estado) | PENDIENTE propia | sin registrar | → SIN_REGISTRO + mensaje |
| acción | leer | GET propia | escribir | POST/PATCH → 403 |
| formato de presentación | agrupado S1-S4 | 4 secciones | plana u otra agrupación | falla AN-30 |
| campos expuestos | datos propios + estado + fecha | 25 + 3 | metadatos staff (`actualizadoPorId`) | presente → falla AN-33 |

## Análisis de Valores Límite

| Frontera | Mín | Máx | Mín−1 | Máx+1 |
|----------|-----|-----|-------|-------|
| anamnesis consultables por cliente | 1 (la propia) | 1 (la propia) | 0 → 403/404 (la ajena) | 2 → imposible (privacidad) |
| secciones mostradas | 4 (siempre, aun vacías) | 4 | 3 (falla AN-30) | 5 (falla AN-30) |
| acciones de escritura permitidas | 0 | 0 | — | 1 → 403 (AN-29) |
| campos sensibles propios visibles | 4 (son suyos) | 4 | 0 (falla: datos propios) | — |

## Tabla de Decisiones

### Resultado de la consulta del portal (rol CLIENTE)
| Anamnesis propia existe | Solicita la propia | Solicita ajena | Intenta escribir | Resultado |
|-------|-------|-------|-------|--------|
| sí (COMPLETA) | sí | — | — | 200 completa por secciones (AN-28/AN-30) |
| sí (PENDIENTE) | sí | — | — | 200 + marca PENDIENTE (AN-33) |
| no | sí | — | — | 200 SIN_REGISTRO + mensaje (AN-32) |
| cualquiera | — | sí | — | 403/404 sin datos (AN-31) |
| cualquiera | — | — | sí | 403, BD sin cambios (AN-29) |
| sesión inválida | cualquiera | cualquiera | cualquiera | 401 sin datos (HU-10 AN-20) |

## Transiciones de Estado

No aplica a la entidad (la máquina PENDIENTE→COMPLETA es de HU-11; el cliente solo
la **observa**, AN-33). **Justificación**: HU-28 es de solo lectura — ningún evento
del rol CLIENTE causa transición; toda transición requiere el rol DUENO
(PEND-ANX-04 rec (a)). La única "transición" observable del cliente es el cambio de
su vista tras un guardado del DUENO (misma sesión u otra).

## Cobertura de Ramas

### Operación: consulta portal (PROPUESTA `GET /portal/anamnesis` o equivalente)
| # | Escenario | Input | Resultado Esperado |
|---|-----------|-------|-------------------|
| 1 | Con anamnesis (COMPLETA) | token CLIENTE | 200 por secciones (AN-28/AN-30) |
| 2 | Con anamnesis (PENDIENTE) | token CLIENTE | 200 + estado PENDIENTE (AN-33) |
| 3 | Sin anamnesis | token CLIENTE | SIN_REGISTRO + mensaje (AN-32) |
| 4 | Anamnesis ajena | id de otro cliente | 403/404 sin datos (AN-31) |
| 5 | Escritura | POST/PATCH token CLIENTE | 403 sin cambios (AN-29) |
| 6 | Sin sesión / expirada | sin token | 401 sin datos (HU-10 AN-20) |

## Reglas de Validación por Campo

Sin reglas de entrada (no hay entrada del CLIENTE). Las reglas de contenido de los
23 campos son las de la tabla canónica de `HU-09-criterios-aceptacion.md`; aquí solo
aplican reglas de **exposición**:

| Elemento | Visible al CLIENTE | Nota |
|----------|--------------------|------|
| 23 campos propios (incl. sensibles) | sí | datos del titular (HU-10 bullet 3) |
| estado (PENDIENTE/COMPLETA) | sí | AN-33 |
| fechaActualizacion | sí | AN-33 |
| actualizadoPorId / datos de staff | **no** | DEC-041 |
| anamnesis de otros clientes | **no** | AN-31, SEC-01/SEC-03 |
