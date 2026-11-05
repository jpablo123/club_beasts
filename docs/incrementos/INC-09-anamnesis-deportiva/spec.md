# INC-09 - Anamnesis deportiva (bloque 5)

Estado: **ESPECIFICADO** (2026-11-04). Puntos MVP potenciales: bloque 5 = **12** (HU-09/10/11/28, reparto por fraccion al cierre segun DEC-016) + fraccion de HU-07 b4 sin cobro doble. **Corte al 50%**: este bloque aporta el punto restante (49 + 1 = 50).

Decisiones aplicadas: **DEC-052 + Anexo** (23 campos exactos del formulario real, contrato cerrado), **DEC-055** (sensibles = {RH, Antecedentes Medicos, Antecedentes Familiares, Enfermedad relevante, Cual enfermedad} — ampliada +RH sobre la recomendacion del analista), **DEC-056** (campos 1-10 = copia snapshot pre-llenada desde Cliente), **DEC-057** (1 anamnesis por cliente; `fechaActualizacion` + `actualizadoPorId`), **DEC-058** (solo DUENO crea/edita), **DEC-059** (regex RH, limites numericos), DEC-021 (HU-07 no se cierra aqui), DEC-016 (sin doble cobro).

## Criterios de aceptacion

Criterios **AN-01..AN-33** generados por `acceptance-criteria-analyst` (2026-11-04) en `club-beasts-api/features/acceptance-criteria/`:

| Doc | Criterios | Cobertura |
|---|---|---|
| `HU-09-criterios-aceptacion.md` | AN-01..AN-12 | Registro 23 campos/4 secciones, asociacion al cliente, trazabilidad, obligatorios, enums, condicionales, formato, limites, multi-selects, contrato cerrado, actualizacion |
| `HU-10-criterios-aceptacion.md` | AN-13..AN-20 | DUENO 23/23; RECEPCIONISTA sin sensibles (filtro en API); separacion sensible/operativa; CLIENTE solo lectura propia; privacidad anamnesis ajena; sin edicion RECEP; 401 sin datos |
| `HU-11-criterios-aceptacion.md` | AN-21..AN-27 | Guardado incompleto, marca derivada PENDIENTE/COMPLETA, retomar, "lo presente se valida", degradacion, >=1 campo, sin perdida |
| `HU-28-criterios-aceptacion.md` | AN-28..AN-33 | Cliente consulta la suya, solo lectura (403 escritura), secciones S1-S4, jamas la ajena, SIN_REGISTRO, estado + ultima actualizacion sin datos de staff |

**Ajuste DEC-055 sobre los schemas del analista**: `HU-10-schemas.ts` implementa la recomendacion (a) con `rh` como OPERATIVA. DEC-055 (opción b) lo mueve a **SENSIBLE**: `CLASIFICACION_CAMPOS.rh = SENSIBLE` y `anamnesisRecepcionSchema` omite **5** campos (`rh`, `antecedentesMedicos`, `antecedentesFamiliares`, `enfermedadRelevante`, `cualEnfermedad`), no 4. La enmienda de los archivos de `features/acceptance-criteria/` se ejecuta con contrato propio (patron C4) durante el ciclo.

**Reconciliacion HU-11 vs obligatorios (DEC-052/Anexo)**: los `*` definen "anamnesis COMPLETA" (estado derivado), **no** impiden guardar incompleto (estado PENDIENTE); guardar incompleto != aceptar invalido (lo presente se valida siempre). Reconciliacion detallada en `HU-11-criterios-aceptacion.md`.

## Contrato API — **RATIFICADO 2026-11-04** (`backend-developer`: RATIFICA CON CORRECCIONES R1..R8, sin bloqueos)

| # | Endpoint | Rol | Respuesta / codigos |
|---|---|---|---|
| 1 | `GET /clientes/:clienteId/anamnesis` | DUENO / RECEPCIONISTA / CLIENTE (solo la propia) | 200 con payload **filtrado por rol**: DUENO = plana `anamnesisDuenoSchema` (25 props + `clienteId, estado, fechaActualizacion, actualizadoPorId`); RECEP = plana `anamnesisRecepcionSchema` (**20/25 props = 19/23 campos**: **sin las 5 de DEC-055** `rh, antecedentesMedicos, antecedentesFamiliares, enfermedadRelevante, cualEnfermedad` — ni valores ni claves) + metadatos staff; CLIENTE = **agrupada S1-S4** `anamnesisClienteSeccionesSchema` (25 valores propios + `clienteId, estado, fechaActualizacion`; **sin `actualizadoPorId`** — DEC-041). `SIN_REGISTRO` = **200** + `{ estado: "SIN_REGISTRO", mensaje }` (R2; mensaje fijado en el RED: "Aun no hay una anamnesis registrada para este cliente."), identico para los 3 roles |
| 1b | `GET /portal/anamnesis` | CLIENTE (token; sin id en URL — R2/C9) | 200 con `anamnesisClienteSeccionesSchema` o SIN_REGISTRO; imposible la "URL ajena" en el portal (refuerza NAV-AN-04) |
| 2 | `POST /clientes/:clienteId/anamnesis` | **solo DUENO** (DEC-058) | 201 registro unico (DEC-057); **409 ANAMNESIS_EXISTENTE** si ya existe (check explicito + fallback P2002, mismo cuerpo); body parcial valido (>=1 campo diligenciado, AN-26) o completo; estado derivado PENDIENTE/COMPLETA; responde con vista DUENO |
| 3 | `PATCH /clientes/:clienteId/anamnesis` | **solo DUENO** | 200 actualizacion; responde con vista DUENO. **Semantica de merge (R3/C3a)**: clave **ausente** = conserva; clave presente con `null` o `""` = **vacia** el campo; clave presente con valor = valida y reemplaza. Contradicciones SI/NO validadas sobre el **estado fusionado** (post-404 anamnesis) -> 400 si contradiccion; estado re-derivado (degradacion COMPLETA->PENDIENTE posible, AN-25); `fechaActualizacion` + `actualizadoPorId` |

- **Orden de errores por endpoint (R7, tabla determinista; primer paso que aplica responde; sin escritura en 4xx)**:
  - GET: 401 -> 403 rol (preHandler) -> 400 params -> **403 self-only** (CLIENTE ajeno, mensaje propio, ANTES de 404 para no revelar existencia — SEC-01/SEC-03) -> 404 cliente (solo staff) -> 200 (vista por rol | SIN_REGISTRO).
  - POST: 401/403 (`preHandler: authenticateRoles(["DUENO"])`) -> 400 params -> 400 body (Zod, **primer error** INC05-CONF-01) -> 404 cliente -> 409 ya existe -> 201.
  - PATCH: 401/403 -> 400 params -> 400 body (campos presentes + AN-26; primer error) -> 404 cliente -> **404 anamnesis** ("El cliente no tiene una anamnesis registrada"/`ANAMNESIS_NO_ENCONTRADA`) -> **400 consistencia SI/NO sobre estado fusionado** -> 200.
  - Literales: 404 cliente = "Cliente no encontrado"/`NOT_FOUND`; 400 = `VALIDATION_ERROR`.
- **Sin DELETE** (ninguna HU lo pide; DEC-057 registro unico sin ciclo de vida).
- **Estado derivado, no persistido** (R5 confirmado): se calcula en el servicio con `derivarEstadoAnamnesis`/`cumpleCompletitud` (HU-11-schemas); sin columna `estado` -> sin drift.
- **Validacion**: copia tipada en `src/schemas/anamnesis.schema.ts` (patron `portal.schema.ts`; `tsconfig rootDir: ./src` impide importar `features/`) con header "Equivalente en `src/`" y **anti-deriva**: los tests de integracion parsean respuestas y errores con los schemas **canonicos** de `features/acceptance-criteria/` (INC09-R01/R08). Serializacion por **whitelist explicita**, nunca `...registro` (defensa en profundidad DEC-055/INC09-R05).
- **Modelo Prisma (R6)**: `Anamnesis` 1:1 con `Cliente` (`@unique clienteId`); multi-selects (16, 21) como **String con JSON de string[]** (SQLite no soporta scalar lists; (de)serializacion solo en el servicio, Zod en ambos extremos — INC09-R09); fechas `YYYY-MM-DD` String (DEC-012); `fechaActualizacion DateTime @updatedAt` (ISO-8601), `actualizadoPorId` -> `User`, `createdAt`; sin columna `estado`; FK sin `onDelete` explicito (patron del repo). **1 migracion**: 9/0 -> **10/0**.
- **DEC-056a (C6 resuelto)**: el backend **no** auto-rellena campos; el pre-llenado de 1, 2, 9, 10 es del frontend (NAV-AN-08).
- **No-duplicado**: los campos 1-10 snapshot no suman puntos de HU-04/05 (DEC-056/DEC-016).

## Contrato frontend — **RATIFICADO 2026-11-04** (`frontend-developer`: RATIFICA CON CORRECCIONES C1..C9; C6 resuelta por DEC-056a; C3a resuelta = R3)

- **C1 — Ficha staff**: seccion "Anamnesis deportiva" inline tras `MembershipSection` (layout intacto). **Anti-interferencia 2 capas**: (a) el editor solo se **monta bajo demanda** (vista por defecto solo lectura con texto plano -> los localizadores base de la ficha nunca ven controles nuevos); (b) nombres accesibles sin substrings prohibidos (C7). Sin "Salir" duplicado ni links en `<nav>`.
- **C2 — Portal HU-28**: pagina nueva **`/portal/anamnesis`** (URL propia NAV-AN-03; `middleware.ts:31` la cubre sin cambios). Entrada: card/link "Mi anamnesis" en `/portal` (fuera de `<nav>`). **NO** porta el efecto `repararUrlDelPortal`; replica la guarda `debeCambiarPin` con redirect a `/portal` (PIN gate unica, sin bypass). **DEC-060**: gateada por servicio vigente — con `sinMembresiaActiva` el link no se pinta y la ruta deriva al aviso DEC-051.
- **C3 — Formulario DUENO**: un solo boton de guardado tolerante a parcial (HU-11) + badge `PENDIENTE/COMPLETA` del DTO. Tipos del Anexo (selects con literales exactos, RH select de 8, number 13..100 / 1..12, date, `input type="time"`, checkbox groups 16/21 con "Ninguno" exclusivo); condicionales 12/18b se limpian al cambiar la pregunta a NO (evita 400 AN-07); AN-26 con error "La anamnesis debe tener al menos un campo diligenciado". Validacion = **espejo** `src/lib/anamnesis-schemas.ts` (web no importa `features/`; test de paridad de literales/regex/mensajes — INC09-R06/C3-drift). **C3a**: el form envia `null` explicito en campos vaciados (R3: `null`=limpiar / ausente=mantener; habilita AN-25).
- **C4 — Vista RECEPCIONISTA**: render **por presencia de clave** (los 5 sensibles no existen en el DOM: sin placeholder ni "Restringido"); controles solo DUENO. Conteos corregidos: **19/23 campos (20/25 propiedades)**.
- **C5 — Cancelar/volver (NAV-AN-06)**: "Descartar cambios" con confirmacion inline accesible (`role="alertdialog"`: "Si, descartar" / "Seguir editando") + banner "Cambios sin guardar" mientras sucio + `beforeunload` (recarga/cierre). Limite documentado: soft-nav (links/atras App Router) cubierto por el banner; sin draft en storage (datos clinicos sensibles).
- **C6 — RESUELTA por DEC-056a**: pre-llenado solo 1, 2, 9, 10; 3-8 vacios editables; NAV-AN-08 re-escopada.
- **C7 — Localizadores (RED)**: scope `getByRole("region", { name: "Anamnesis deportiva", exact: true })`; `exact: true` + `toHaveCount(1|0)` siempre. **Substrings prohibidos** en nombres nuevos (derivados de los 122 E2E base): `Ingresar`, `Salir`, `Editar`, `Guardar`, `Crear Cliente`, `Ver ficha`, `Anterior`, `Siguiente`, `Cambiar PIN`, `Congelar`, `Descongelar`, `Aplicar congelacion`, `Confirmar descongelacion`, `Registrar ingreso`, `Consultar`, `Cerrar sesion`; labels que contengan `Estado`, `Motivo`, `Sede`, `Email`, `Nombres`, `Apellidos`, `Telefono`, `Cedula`, `Observaciones`, `Fecha de inicio`, `Fecha de fin`, `PIN` (unico cruce real: "Estado civil" -> neutralizado por C1-a + queries exact). Nombres propuestos: "Diligenciar anamnesis"/"Modificar anamnesis", "Aplicar cambios", "Descartar cambios", "Cambios sin guardar".
- **C8 — Responsive/foco**: grid `grid-cols-1 sm:grid-cols-2`, checkbox targets >=44px, `focus-visible:ring-2 focus-visible:ring-royal` en controles nuevos; E2E 375px/1280px sin overflow + Tab con foco visible.
- **C9 — Lectura portal**: `GET /portal/anamnesis` por token (R1 incorporado como endpoint 1b; la sesion CLIENTE no expone `clienteId`). NAV-AN-04 precisada: E2E = CLIENTE manipulando URL staff -> redirect sin datos; integracion = 403/404 sin datos.

### Componentes propuestos (ratificados)
`src/app/portal/anamnesis/page.tsx` (nueva) · `src/components/anamnesis/{AnamnesisSection,AnamnesisVista,AnamnesisEditor,MultiSelectCheckboxes}.tsx` · `src/lib/{anamnesis-schemas,anamnesis-campos,anamnesis-prefill}.ts` · modificados: `clientes/[id]/page.tsx` (montar seccion), `api.ts` (`api.anamnesis.*`, `api.portal.anamnesis`), `portal/page.tsx` (card link).

## Matriz de navegacion/aplicabilidad (APROBADA por el orquestador 2026-11-04)

Basada en la propuesta del analista (§5 de su reporte). Destinos esperados fijados; resultado inicial **NO VERIFICADO** en toda fila hasta evidencia ejecutada.

| ID | Pantalla | Estado | Entrada | Salida esperada | Rol | Prueba | Resultado | Evidencia |
|---|---|---|---|---|---|---|---|---|
| NAV-AN-01 | `/portal/anamnesis` (C2) | con datos | link "Mi anamnesis" desde `/portal` | secciones S1-S4 visibles, solo lectura | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-AN-02 | `/portal/anamnesis` | SIN_REGISTRO | link | mensaje claro (200 + marcador R2), sin formulario editable | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-AN-03 | `/portal/anamnesis` | URL directa/recarga/atras | URL propia | recarga conserva vista; atras no expone datos ajenos | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |
| NAV-AN-04 | vista anamnesis ajena | URL manipulada | URL staff `/clientes/<id>` (portal sin id en URL — C9) | E2E: redirect de middleware a `/portal` sin datos; integracion: 403/404 sin datos (SEC-01/SEC-03) | CLIENTE | E2E + integracion | NO VERIFICADO | _pendiente_ |
| NAV-AN-05 | formulario anamnesis | sesion expirada | guardar (patron `resolveSessionExit("/login")`) | redirect login sin 500, PIN obligatorio intacto | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-AN-06 | formulario anamnesis | incompleta/sucia | "Descartar cambios" / volver | confirmacion explicita (`role="alertdialog"`: "Si, descartar"/"Seguir editando"); se conserva si se cancela; banner "Cambios sin guardar" mientras sucio (C5) | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-AN-07 | ficha anamnesis staff | 23/23 (DUENO) o 19/23 campos = 20/25 props (RECEP — C4) | acceso por rol | RECEPCIONISTA sin controles ni datos sensibles (5 claves DEC-055 ausentes en red y DOM) | DUENO/RECEPCIONISTA | E2E + API | NO VERIFICADO | _pendiente_ |
| NAV-AN-08 | formulario anamnesis | creacion con pre-llenado | nueva anamnesis | campos **1, 2, 9, 10** pre-llenados desde Cliente (DEC-056a), editables; 3-8 vacios editables | DUENO | E2E | NO VERIFICADO | _pendiente_ |
| NAV-AN-09 | `/portal/anamnesis` y link en `/portal` | `sinMembresiaActiva` (DEC-060) | link/URL directa | link no pintado; URL directa deriva al aviso DEC-051 (sin datos de anamnesis) | CLIENTE | E2E | NO VERIFICADO | _pendiente_ |

**Aplicabilidad**: movil/escritorio/teclado **aplica** (formularios y vistas responsive, foco visible); URL directa/recarga/atras **aplica** (filas 3-4); cancelar/volver **aplica** (fila 6); logout/logout por rol **NO APLICABLE como viaje propio** (sin cambios sobre la navegacion aceptada de INC-07/INC-08; la sesion se maneja igual). App movil nativa: **No aplicable** (no existe en el MVP).

## Base a preservar (re-medida al arranque del RED)

API **658/658** · Gherkin **220/220** (guard 220 — si se añaden features Gherkin, el guard sube, nunca baja) · web **215/215** · E2E **122/122** · tsc 0/0 · build PASS · migraciones **9/0** (este incremento **si** requiere migracion Prisma nueva: modelo `Anamnesis` 1:1 con `Cliente`).

## Puerta LISTO — **CERRADA 2026-11-04**

- [x] Criterios observables y comprobables (AN-01..AN-33 con prueba esperada por criterio).
- [x] Decisiones resueltas: DEC-052+Anexo, DEC-055..059, **DEC-056a** (C6), **DEC-060** (C2).
- [x] Contrato API **ratificado** (R1..R8 incorporados) y frontend **ratificado** (C1..C9 incorporados; C3a=R3, C6=DEC-056a).
- [x] Datos de prueba: fixtures deterministas (clientes con servicios vigentes/vencidos para DEC-060; seed DUENO con sede).
- [x] Documentos `spec.md`, `tareas.md`, `evidencia.md` existentes.
- [x] Matriz de navegacion aprobada (NAV-AN-01..09) con destinos esperados, re-escopos C2/C4/C5/C6/C9 aplicados y no-aplicables justificados; filas en `NO VERIFICADO` hasta evidencia ejecutada.

**Enmiendas C4 programadas para el ciclo** (contrato propio, patron C4, nunca edicion silenciosa): (1) `HU-10-schemas.ts` + `HU-10-criterios-aceptacion.md` -> DEC-055 (5 sensibles con `rh`; RECEP 20/25 props; textos "4 sensibles"/"21/23" corregidos); (2) `HU-09-criterios-aceptacion.md` -> R4 (AN-05 y rama "ausente" de AN-07 a nivel schema/PENDIENTE; filas 3 y 5 de la tabla de operacion); (3) `HU-11-criterios-aceptacion.md` -> R3 (semantica merge: ausente=conserva, `null`/`""`=vacia; AN-26 guarda de body); (4) encabezados "POST|PUT" -> "POST|PATCH" en HU-09/HU-11 (R1).

## Riesgos (ampliados por ratificaciones)

| ID | Riesgo | Mitigacion | Responsable |
|---|---|---|---|
| INC09-R01 | Deriva entre schemas del analista y DEC-055 | Enmienda C4 (1); tests que fijen los 5 campos ocultos | test-engineer + backend |
| INC09-R02 | Doble cobro con HU-04/05 (campos 1-10) y HU-07 b4 | DEC-056/DEC-016; reparto en auditoria de cierre | Orquestador |
| INC09-R03 | Guardado parcial acepte invalidos | "Lo presente se valida siempre" (AN-23); tests de invalidos en parcial | backend + QA |
| INC09-R04 | Migracion con drift sobre 9/0 | `prisma migrate status` tras migracion (esperado 10/0) | database-admin |
| INC09-R05 | Filtro de sensibles solo en UI | Filtro en API + serializacion whitelist + tests de ausencia de claves | backend + QA |
| INC09-R06 | Frontend no expresa borrados (`null`) -> AN-25 inalcanzable | C3a/R3 en contratos; test de degradacion con body mixto | frontend + QA |
| INC09-R07 | Contradicciones SI/NO persistidas | Validacion sobre estado fusionado; tests especificos | backend |
| INC09-R08 | Deriva copia `src/schemas/anamnesis.schema.ts` | Tests que parsean con schemas canonicos de `features/`; header "Equivalente" | test-engineer |
| INC09-R09 | Corrupcion JSON de los 2 arrays | (De)serializacion solo en servicio, Zod en extremos, roundtrip en tests | backend |
| INC09-R10 | Interferencia con 122/122 E2E base (C7) | Montaje bajo demanda + substrings prohibidos + `exact`; base re-medida | frontend + QA |
