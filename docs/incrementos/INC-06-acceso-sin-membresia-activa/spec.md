# INC-06 - Acceso completo bloqueado sin ninguna membresia activa (DEC-048)

## Estado

Estado actual: **ACEPTADO (2026-10-29)**. Pipeline completo: **PROPUESTO -> ESPECIFICADO + BLOQUEADO -> LISTO (4/4) -> RED (31 rojos) -> GREEN backend+web (API 658/658 + Gherkin 220/220 + web 204/204; micro-fix fixture + micro-fix F3) -> VERIFICADO (E2E 88/88 x2 + enmiendas C4 `acceso-vencimiento` y `portal.spec`) -> auditoria de navegacion (H-01b/c y H-02 cerrados con viajes nuevos; E2E 94/94 x2) -> REVISADO (`code-reviewer`: ACEPTA CON HALLAZGOS NO BLOQUEANTES) -> ACEPTADO**. Decisiones registradas: **DEC-051** (INC06-PEND-01..04 resueltas, opcion (a) en las 4) +
`INC06-CONF-01..04` + no-duplicado (**0 puntos**) + matriz de navegacion
aprobada + contrato backend **RATIFICA CON CORRECCIONES R1..R5** (incorporadas
a este spec). **El RED esta habilitado** para `test-engineer` (contrato propio
del orquestador).
Paquete abierto por `acceptance-criteria-analyst` bajo contrato del orquestador
tras la aprobacion de
**DEC-048** (Producto, 2026-10-20, `docs/producto/decisiones.md:56`).

Historial del pipeline: **PROPUESTO -> ESPECIFICADO + BLOQUEADO (2026-10-20)
-> ESPECIFICADO, LISTO 3/4 (2026-10-29) -> LISTO 4/4 (2026-10-29)**. El bloqueo
original fue de dos frentes, ambos cerrados el 2026-10-29:

1. **`INC06-PEND-01..04` sin resolver** (copy, superficie, login y
   `PROGRAMADA`) — **RESUELTAS 2026-10-29 (DEC-051, opcion (a) en las 4)**.
2. **Contrato sin ratificar** por `backend-developer` (seccion "Contrato API
   propuesto") — **RATIFICA CON CORRECCIONES R1..R5, incorporadas**.

Hoy **ningun criterio esta `IMPLEMENTADO` ni `ACEPTADO`**: los 7 criterios
estan `SPEC` (DEC-051 desbloqueo los 4 que estaban `BLOQUEADO`). Este documento
**no declara puntos** (DEC-016); el
reparto es **0** con argumento trazable en "Regla de no duplicado" (verificable
contra `docs/producto/mvp.md` y `docs/producto/auditoria-puntos-inc00.md`).

Puerta **LISTO** (gate unico) — **4 de 4 cerradas (2026-10-29)**:

1. [x] **`INC06-PEND-01..04` resueltas por Producto** y registradas en
   `docs/producto/decisiones.md` (**DEC-051**, 2026-10-29, confirmacion unica
   de las recomendaciones, opcion (a) en las 4).
2. [x] **Contrato ratificado por `backend-developer`** — **RATIFICA CON
   CORRECCIONES R1..R5** (2026-10-29), incorporadas a este spec (casilla
   cerrada).
3. [x] **`INC06-CONF-01..04` y la regla de no duplicado ratificadas por el
   orquestador** en `decisiones.md` (seccion "Ratificaciones del
   orquestador (2026-10-29)", **0 puntos**).
4. [x] **Matriz de navegacion/aplicabilidad** de este spec **aprobada** por el
   orquestador (destinos esperados fijados por DEC-051; resultado inicial de
   todas las filas aplicables `NO VERIFICADO`; app movil `No aplicable`
   justificado).

**Definition of Ready satisfecha (2026-10-29): el RED esta habilitado** para
`test-engineer` bajo contrato propio del orquestador.

## Objetivo

Implementar **DEC-048**: cuando un cliente **no tiene ninguna vigencia activa**
(todos sus servicios `VENCIDA`/`NO_CONTRATADO`, sin ninguna `CONGELADA`),
**pierde el acceso completo a la app y al gimnasio** y ve un aviso para
**activar su membresia**. Con al menos un servicio vigente o congelado, las
reglas vigentes quedan **intactas** (DEC-025/026/027).

**Impacto declarado**: es un **cambio/regresion sobre incrementos aceptados**
(HU-16/INC-03 en portal, recepcion e ingresos; portal HU-25/INC-03; posiblemente
login HU-02/INC-00 segun PEND-02). **Aporta 0 puntos MVP** (ver "Regla de no
duplicado"): es una **mejora de regla de negocio** aprobada por el Producto, sin
bullet de HU nuevo que la pague.

## Alcance incluido

- **Definicion operativa de "sin membresia activa"** sobre los **tres tipos de
  servicio** (GYM, PERSONALIZADO, NUTRICION; DEC-004/DEC-042): resolucion
  multi-servicio derivada del mismo `resolverEstadoAcceso`/`calcularEstado`
  (fuente unica, precedente VEN-05).
- **Portal del cliente** (`GET /portal/resumen`, `src/routes/portal.ts`): el
  estado de acceso de la app se calcula sobre **todas** las vigencias del
  cliente (hoy solo la ultima GYM, `portal.ts:40-48`) y, si no hay ninguna
  vigente/congelada, el frontend muestra el **aviso de activar membresia**
  (superficie exacta: `INC06-PEND-03`).
- **Recepcion e ingresos** (`src/routes/recepcion.ts`): **regresion
  verificada** de las guardas existentes (HU-30/DEC-030/DEC-039): con todos los
  servicios `VENCIDA`/`NO_CONTRATADO`, el ingreso sigue rechazado
  (`403 INGRESO_NO_PERMITIDO`, ramas `VENCIDA`/`PROGRAMADA`/`SIN_VIGENCIA`
  existentes); con GYM vigente o congelada, `201`.
- **Login** (`POST /auth/login-cliente`): **PEND-02** — la recomendacion es
  **sin cambio** (identidad separada de acceso, precedente DEC-026); solo si
  Producto decide lo contrario entra aqui.
- Pruebas **TDD/ATDD** (RED/GREEN), Gherkin donde aplique y evidencia
  reproducible; **E2E obligatorio** en los flujos criticos afectados (portal,
  ingreso, login — ver matriz de navegacion).

## Fuera de alcance

- **Login INACTIVO** (`401 AUTH_CLIENTE_INACTIVO`, DEC-034/HU-08): **distinto**
  — es estado del cliente, no vigencia. No se toca ni se re-cobra.
- **Bloqueo por SUSPENDIDO/RETIRADO/INACTIVO en ingreso** (DEC-030/DEC-039,
  HU-30/HU-08 aceptados): intacto; INC-06 solo convive con esa guarda
  (orden existente: estado general antes de vigencia, `recepcion.ts:232-268`).
- **Vencimiento con efecto por servicio** (HU-16/DEC-026/027 aceptados 4/4):
  no se re-especifican; solo **regresion**.
- **Congelacion** (HU-15/INC-02 aceptada) y su efecto de acceso (DEC-025):
  intactas; aqui **solo se consume** que `CONGELADO` conserva acceso.
- **App movil**: no existe en el MVP; los `INC06-PEND` de superficie se
  resuelven para web. Justificado como **no aplicable** en la matriz de
  navegacion.
- **Compra/activacion online de membresia**: no existe flujo de pago en el MVP;
  el aviso es informativo (CTA de contacto con recepcion, `INC06-PEND-01`).
- **Alertas nuevas de recepcion** (DEC-028 ya deriva `MEMBRESIA_VENCIDA` /
  `ESTADO_CLIENTE`): ver `INC06-CONF-02` (sin alerta nueva en este incremento).
- **HU-12/13/14/15/16/17/25/29/30/31, HU-05/06/08** ya aceptados: no se
  re-cobran (seccion de no duplicado); INC-05 (en curso) queda **intacto** —
  las rutas nuevas de INC-05 comparten `MembresiaGym` y el resolucion de acceso
  de INC-06 debe **reutilizar** su calculo por tipo, no duplicarlo.
- Riesgos globales `R-01..R-11`, `D2`, `REV-01..REV-12` (backlog global).

## Regla de negocio (reconciliacion fijada por DEC-048)

Definicion operativa adoptada en este spec (**fórmula corregida 2026-10-29,
ratificacion R1 de `backend-developer`**):

```text
tieneAccesoApp(vigencias) = EXISTE al menos un servicio (GYM|PERSONALIZADO|NUTRICION)
  cuyo estado CALCULADO es ACTIVA o CONGELADO

sinMembresiaActiva(cliente) = NO tieneAccesoApp(vigencias del cliente)
  (solo entran las VIGENCIAS; el estado general del cliente NO entra en este flag)
```

- **Correccion R1 (2026-10-29)**: la formula anterior incluia
  `y el estado GENERAL del cliente es ACTIVO`, lo que haria que un cliente
  **`SUSPENDIDO`/`RETIRADO` con GYM `ACTIVA`** viera `sinMembresiaActiva: true`
  y el copy falso "No tienes una membresia activa" (justamente la colision que
  DEC-051 PEND-01(a) quiere evitar). El estado general **sigue siendo guarda
  propia** de ingreso (`recepcion.ts:232-241`, DEC-030/039, intacta) y de
  login (DEC-034), **no** entra en el flag de membresia.

- `CONGELADO` **conserva** el acceso (**DEC-025 intacta**): la congelacion no
  cuenta como "sin membresia activa" mientras dure la pausa; el bloqueo aplica
  solo cuando **no hay ninguna vigente ni congelada**.
- Con al menos **un** servicio vigente: **intactas DEC-026/DEC-027** (acceso por
  servicio; login sin cambios; portal estado por servicio).
- `PROGRAMADA` (futuro) **no esta nombrada** en el literal de DEC-048
  ("todos sus servicios `VENCIDA`/`NO_CONTRATADO`"): resolucion delegada a
  **`INC06-PEND-04`** (recomendacion: cuenta como sin acceso, coherente con el
  `403` de ingreso `PROGRAMADA` ya aceptado, con copy que informe el inicio).
- El estado **general** del cliente (`SUSPENDIDO`/`RETIRADO`/`INACTIVO`)
  sigue teniendo sus propias guardas previas: INC-06 **no las reemplaza** ni se
  superpone (un cliente `SUSPENDIDO` ya no ingresa por DEC-030 aunque tenga
  membresia vigente).

## Criterios de aceptacion

IDs estables `INC06-ACC-nn`. Sin G14 previo propio (DEC-048 es requisito nuevo,
no HU): los criterios ISTQB de las HU afectadas (HU-16/25/30) **existen y no se
reescriben**; aqui se integran como **regresion**. Leyenda de estado:

- `BLOQUEADO (INC06-PEND-XX)` = observable y comprobable, pero depende de una
  decision de Producto pendiente.
- `SPEC` = criterio decidido sin decision abierta que lo frene (sigue **sin**
  estar `IMPLEMENTADO`/`LISTO`/`ACEPTADO`: le faltan implementacion, prueba,
  evidencia y revision).
- `REF` = regresion de criterio ya aceptado; se verifica y **no puntua**.

| ID | Origen | Que se observa y comprueba | Estado | Puntuable |
|---|---|---|---|---|
| `INC06-ACC-01` | DEC-048 (nuevo) | **Deteccion**: cliente `ACTIVO` sin ninguna vigencia `ACTIVA`/`CONGELADO` en GYM/PERSONALIZADO/NUTRICION (incluye 0 filas y todos `VENCIDA`) -> el portal responde con el bloque de acceso marcado `sinMembresiaActiva: true` (forma exacta: **DEC-051** PEND-03(a) pantalla completa + PEND-04(a) `PROGRAMADA` incluida) y la web muestra el aviso de activar membresia (copy **DEC-051** PEND-01(a)); con fechas relativas a `getTodayBogota()` (DEC-005) | **SPEC** (desbloqueado por DEC-051) | No (0; mejora de regla) |
| `INC06-ACC-02` | DEC-026/027 (REF) | **Regresion multi-servicio**: cliente con GYM `VENCIDA` + NUTRICION `ACTIVA` -> **no** hay bloqueo: login intacto, portal estado **por servicio**, sin aviso de activar membresia | **SPEC** | No (0; ya cobrado en HU-16/HU-25) |
| `INC06-ACC-03` | DEC-025 (REF) | **Congelacion conserva acceso**: cliente cuya **unica** vigencia esta `CONGELADO` (pausa vigente) -> **no** hay bloqueo (portal accesible, sin aviso); al terminar la pausa sin renovar -> el bloqueo entra al dia siguiente del fin efectivo | **SPEC** | No (0; ya cobrado en HU-15/HU-16) |
| `INC06-ACC-04` | HU-30/DEC-030/039 (REF) | **Regresion ingreso**: recepcion registra ingreso -> 201 con GYM `ACTIVA` o `CONGELADO`; 403 `INGRESO_NO_PERMITIDO` con GYM `VENCIDA`/`PROGRAMADA`/`SIN_VIGENCIA` (mensajes exactos existentes intactos, `recepcion.ts:250-268`); rama de estado general (`SUSPENDIDO`/`RETIRADO`/`INACTIVO`) intacta y **anterior** | **SPEC** | No (0; ya cobrado en HU-30/HU-08) |
| `INC06-ACC-05` | DEC-026 + PEND-02 | **Login**: con todos los servicios `VENCIDA`/`NO_CONTRATADO`, el login del cliente **funciona** (**DEC-051** PEND-02(a): identidad != acceso; DEC-034 sigue siendo unico bloqueo de login) y aterriza en el portal con el aviso | **SPEC** (desbloqueado por DEC-051) | No (0) |
| `INC06-ACC-06` | DEC-048 (copy) | **Aviso**: el literal mostrado comunica "sin membresia activa / activa tu membresia" **sin** usar la palabra "suspension" (**DEC-051** PEND-01(a): "No tienes una membresia activa" + CTA de contacto a recepcion); mensaje en espanol, `role="alert"` o equivalente accesible, visible en movil y escritorio | **SPEC** (desbloqueado por DEC-051) | No (0) |
| `INC06-ACC-07` | HU-25 (REF) | **Regresion portal con acceso**: cliente con al menos un servicio vigente/congelado -> el portal se pinta completo (identidad, estado, vencimiento, congelacion, rutina, plan) **sin** aviso; el flujo de cambio de PIN obligatorio no se ve afectado | **SPEC** | No (0; ya cobrado en HU-25) |

> **Conteo**: **7 criterios, todos `SPEC`** (las 4 filas `BLOQUEADO
> (INC06-PEND-XX)` quedaron desbloqueadas por **DEC-051**, 2026-10-29).
> **0 puntuables** (ver "Regla de no duplicado"): no existe bullet de HU en
> `mvp.md` que pague "bloqueo total sin membresia activa"; los efectos que
> toca ya estan acreditados (HU-16 4/4, HU-25 4/4, HU-30 4/4, HU-15 4/4,
> HU-08/HU-17). El spec **no declara puntos** (DEC-016).
>
> **E2E obligatorio**: `INC06-ACC-01` (portal + aviso), `INC06-ACC-04`
> (ingreso), `INC06-ACC-05` (login -> portal aviso) y `INC06-ACC-07`
> (portal con acceso, regresion) — flujos criticos existentes cuyo comportamiento
> **cambia**; ver matriz de navegacion.

### Regla de no duplicado (obligatoria; patron INC-02/03/04/05)

Verificada contra `docs/producto/mvp.md` (bloques 3 y 4) y
`docs/producto/auditoria-puntos-inc00.md` (secciones 8-10):

- **HU-16 4/4 ya acreditada** (INC-03, 1 punto, `INC03-VEN-03/VEN-04`): el
  efecto "vencido = sin acceso / recepcion lo detecta" **ya se cobro una sola
  vez** (regla del 2026-10-10 en `decisiones.md:91-93`). INC-06 **no** cobra
  ese efecto de nuevo: `INC06-ACC-02/03/04` son **regresion**.
- **HU-25 4/4 y HU-30 4/4 ya acreditadas** (INC-03, bloque 4): portal con
  estado real e ingresos con guardas — **no se re-cobran**.
- **HU-08 4/4 y HU-17 3/3 ya acreditadas** (INC-04): bloqueo de login por
  `INACTIVO` (DEC-034) y guarda de ingreso por estado (DEC-039) — **distintos**
  de la vigencia; **no se re-cobran**.
- **HU-12/HU-15 (INC-00/02)**: congelacion y vigencias GYM — intactas; solo se
  **consume** `CONGELADO` (DEC-025).
- **HU-02/HU-03 (login/sesiones, 10/10)**: si PEND-02 = (a) el login **no
  cambia**; si = (b) seria un cambio sobre HU-02 aceptada y **tampoco** sumaria
  puntos (mejora de regla, no bullet nuevo).
- **Sin bullet en `mvp.md`**: la matriz de bloques no tiene fila para "regla de
  negocio de acceso total"; `auditoria-puntos-inc00.md` no tiene seccion que lo
  cubra. **Conclusion: 0 puntos**, queda como mejora de regla de negocio
  aprobada (DEC-048). Cualquier intento de cobrar fraccion de HU-16/HU-08/HU-30
  aqui seria **duplicado** (DEC-016).

## Decisiones pendientes

Formuladas con el patron `INC03-PEND-*`/`INC05-PEND-*` (opciones concretas para
el Producto; responsable: **Producto**, confirmacion unica de las
recomendaciones del orquestador-analista). **RESUELTAS 2026-10-29:
`INC06-PEND-01..04` -> `DEC-051` (opcion (a) en las 4).**

| ID | Pregunta concreta a Producto | Opciones | **Recomendacion del analista** | Criterios afectados |
|---|---|---|---|---|
| `INC06-PEND-01` | **(riesgo de copy anticipado en DEC-048)**: el literal pedido es **"suspension activa"**, que **colisiona** con el estado `SUSPENDIDO` del cliente (HU-17/DEC-030: "un suspendido no entra aunque tenga membresia paga"). Un cliente bloqueado por falta de membresia NO esta suspendido; el mensaje puede inducir a error al cliente y al staff. ¿Cual es el copy del aviso y su CTA? | **(a)** aviso **"No tienes una membresia activa"** + subtexto **"Contacta recepcion para activar tu membresia y volver a acceder"** (sin la palabra "suspension"); **(b)** literal del Producto **"suspension activa"** (ej. "Tu membresia esta en suspension activa. Activala en recepcion") asumiendo la colision; **(c)** copy hibrido: "Acceso suspendido por falta de membresia activa" (usa "suspendido" pero lo califica) | **(a)**: es consistente con la terminologia de la app (`estadoAccesoGym`, `SIN_VIGENCIA`/`VENCIDA` no usan "suspension") y elimina la ambiguedad con `SUSPENDIDO` (HU-17/DEC-030), que es un concepto **del estado del cliente** gestionado por staff. Si el Producto insiste con "suspension activa", que sea decision explicita registrada (opcion (b)) y el equipo de frontend debera validar la confusion en copy de recepcion | `INC06-ACC-06`, `INC06-ACC-01` |
| `INC06-PEND-02` | **Superficie del bloqueo — login**: DEC-048 dice "pierde el acceso completo a la **app**". ¿El **login** del cliente queda bloqueado (como INACTIVO con DEC-034) o sigue funcionando y el bloqueo se ve en el portal? | **(a)** **login intacto** (identidad != acceso, precedente DEC-026: "el login no cambia" ante vencimiento); el cliente autenticado ve el aviso en `/portal`; **(b)** **login bloqueado** con codigo propio (nuevo `401 AUTH_SIN_MEMBRESIA` o similar, anti-enumeracion como DEC-034) y mensaje "contacta recepcion"; **(c)** login intacto pero solo se sirve el aviso en **todas** las rutas del portal y el resumen responde `403` | **(a)**: mantiene la separacion identidad/acceso ya ratificada en DEC-026/DEC-034 (solo `INACTIVO` bloquea login), evita un segundo bloqueo de credenciales que confundiria con DEC-034, y el aviso es igualmente visible en el primer pantallazo post-login. Con (b) habria que enmendar HU-02/DEC-026 y revisar el flujo de sesion expirada | `INC06-ACC-05`, `INC06-ACC-01` |
| `INC06-PEND-03` | **Superficie del aviso en el portal**: el "aviso para activar su membresia" reemplaza el contenido del portal o convive con el? | **(a)** **pantalla de aviso a pantalla completa** dentro de `/portal` ( Navbar + tarjeta central con el copy de PEND-01; sin tarjetas de estado/rutina/plan); **(b)** **banner** `role="alert"` arriba del portal existente (el contenido se ve igualmente); **(c)** ruta propia `/activar-membresia` a la que se redirige | **(a)**: DEC-048 dice "**pierde el acceso completo** a la app": un banner dejaria el portal funcional (contradice "acceso completo"); la pantalla completa es observable, testeable por E2E y no disenya rutas nuevas fuera del MVP. (c) agrega navegacion innecesaria | `INC06-ACC-01`, `INC06-ACC-06` |
| `INC06-PEND-04` | **`PROGRAMADA` no esta nombrada en DEC-048**: un cliente cuya **unica** vigencia es futura (`PROGRAMADA`, literal DEC-043) no tiene "ninguna vigencia activa", pero tampoco es `VENCIDA`/`NO_CONTRATADO` (literal). ¿Cuenta como "sin membresia activa"? | **(a)** **si**: `PROGRAMADA` cuenta como sin acceso (coherente con el `403` de ingreso `PROGRAMADA` ya aceptado en `recepcion.ts:256-261`); el aviso puede mencionar "tu membresia inicia el <fecha>"; **(b)** **no**: `PROGRAMADA` conserva acceso al portal hasta el inicio (no al gimnasio) | **(a)**: es la unica coherente con el comportamiento ya aceptado de recepcion (un PROGRAMADA no ingresa) y evita dos semantics de "acceso" para la misma vigencia; el copy puede informar la fecha de inicio sin abrir otra pantalla | `INC06-ACC-01` |

### Confirmaciones no bloqueantes (opciones por defecto adoptadas en este spec; ratificables)

| ID | Tema | Opcion por defecto adoptada | Fuente |
|---|---|---|---|
| `INC06-CONF-01` | Fuente unica de estado | La resolucion de acceso se deriva del **mismo** `calcularEstado`/`resolverEstadoAcceso` (`membresia.service.ts`) sobre los **3 tipos**; nunca estado persistido, nunca calculo duplicado en la web | precedente VEN-05 + incompat. #1 de INC-05 (filtro `tipoServicio`) |
| `INC06-CONF-02` | Alertas de recepcion | **Sin alerta nueva** en `GET /recepcion/consulta`: las derivadas existentes (`ESTADO_CLIENTE`, `MEMBRESIA_VENCIDA`, DEC-028) siguen cubriendo el caso; el ingreso ya rechaza con los 403 actuales | DEC-028 + `recepcion.ts:161-178` |
| `INC06-CONF-03` | Orden de guardas en ingreso | Intacto: estado general (`SUSPENDIDO`/`RETIRADO`/`INACTIVO`) **antes** de vigencia; INC-06 no agrega rama nueva de ingreso salvo que la ratificacion lo exija | `recepcion.ts:232-268`, DEC-030/039 |
| `INC06-CONF-04` | Base a preservar | Ningun test aceptado se elimina; base al arranque: API **536/536**, Gherkin **153/153** (guard `INC00_SCENARIO_COUNT = 153`), web **183/183**, E2E **56/56**, migraciones **9/0** (medidas al cierre de INC-04; si INC-05 cierra antes, medir de nuevo al arranque del RED) | DEC-011 + evidencia INC-04 |

## Contrato API propuesto — **RATIFICA CON CORRECCIONES R1..R5 (2026-10-29)**

> Redactado bajo las convenciones verificadas en `src/` (sin prefijo `/api`,
> error `{ error, code }`, fechas `America/Bogota`, selector de vigencia
> ratificado en INC-03). **Ratificado por `backend-developer` el 2026-10-29
> con correcciones R1..R5, ya incorporadas en este documento** (R1 formula del
> flag, R2 ubicacion/reutilizacion, R3 campo unico de respuesta, R4 orden del
> portal, R5 mapeo de evidencia del E2E de vencimiento -> riesgo `INC06-R12`).
> Ver seccion "Ratificacion de contratos y enmiendas" de `decisiones.md`.

### Resolucion de acceso (servicio)

Nueva logica en **`membresia.service.ts`** (**ratificado R2**: alli ya viven
`resolverEstadoAcceso`/`calcularEstado` y `servicio.service.ts` ya importa de
aqui, evitando ciclos) — **sin modelo ni migracion**:

```text
resolverAccesoApp(clienteId, hoy):
  traer TODAS las vigencias de los 3 tipos (where tipoServicio in [GYM, PERSONALIZADO, NUTRICION])
    incluyendo sus cambios (pausas)
  por fila: estado = resolverEstadoAcceso(fila, fila.cambios, hoy).estadoAccesoGym   # reutiliza, no duplica
  sinMembresiaActiva = !EXISTE fila con estado en { ACTIVA, CONGELADO }             # R1: solo vigencias
  return { sinMembresiaActiva }
```

`PROGRAMADA` cae sola en `sinMembresiaActiva: true` (`calcularEstado` no la
incluye en {ACTIVA, CONGELADO}) — coherente con DEC-051 PEND-04(a), sin rama
especial. Recomendacion no contractual (R10): un **solo `findMany`** de los 3
tipos con `cambios` para derivar el flag y el bloque GYM del mismo snapshot.

### Cambios por endpoint

| # | Endpoint | Cambio propuesto | Criterios | Contrato |
|---|---|---|---|---|
| 1 | `GET /portal/resumen` (`portal.ts:26-91`) | Aditivo: ademas del bloque GYM existente (intacto, DEC-026/027), evaluar `resolverAccesoApp` sobre los 3 tipos y responder **200** con **unico campo top-level `sinMembresiaActiva: boolean`** (**ratificado R3**: sin objeto `accesoApp` ni campos nuevos; los contratos zod existentes son no-estrictos y los tests asertan campos puntuales, aditividad verificada). **200 y no 403**: el portal es una pagina que debe pintar el aviso, no una llamada que la web tenga que manejar como error (con 403 habria que distinguirlo del `VIGENCIA_VENCIDA` 403 de DEC-026) | `INC06-ACC-01`, `ACC-02`, `ACC-03`, `ACC-07` | **Ratificado (R3)** |
| 2 | `POST /auth/login-cliente` (`auth.ts:36`) | **Sin cambio** si PEND-02 = (a) (recomendado); con (b), nuevo rechazo con codigo propio tras validar credenciales (patron DEC-034, anti-enumeracion) | `INC06-ACC-05` | Depende de PEND-02 |
| 3 | `POST/GET /recepcion/ingresos`, `GET /recepcion/consulta` | **Sin cambio** (`INC06-CONF-02/03`); solo regresion | `INC06-ACC-04` | Intacto |
| 4 | Web `/portal` (`portal/page.tsx`) | Si `sinMembresiaActiva` -> pantalla de aviso (PEND-03(a)) con copy de PEND-01; sin ella, pintado actual intacto | `INC06-ACC-01`, `ACC-06`, `ACC-07` | Depende de PEND-01/03 |

### Orden de evaluacion (**ratificado 2026-10-29, R4**)

- **Portal**: `401` sesion (preHandler CLIENTE intacto) -> `403
  AUTH_FORBIDDEN` (rol != CLIENTE, ya asertado en `portal.test.ts:387-394`) ->
  `404` cliente inexistente -> resolucion de acceso -> **200** (con o sin
  `sinMembresiaActiva`). Sin escritura.
- **Ingreso**: intacto y verificado (401/403 -> 400 params/body -> 404 cliente
  -> 400 sede -> **403 estado general antes de vigencia** (`recepcion.ts:232-241`)
  -> 403 vigencia `VENCIDA`/`PROGRAMADA`/`SIN_VIGENCIA` con mensajes exactos
  (`recepcion.ts:250-268`) -> 201). **Sin cambio** (R5 del contrato: el
  selector GYM-only `cargarVigenciaGym` es correcto por acceso por servicio
  DEC-026/027).
- **Login**: **sin cambio** (`auth.ts:36-73`; DEC-051 PEND-02(a)); la rama
  `INACTIVO` (`auth.ts:58-63`) **nunca** se toca.

## Fixtures y datos de prueba

Aislamiento: **DEC-012** (SQLite aislado) y **DEC-013** (fechas relativas).
Cedulas con prefijo por suite (precedente INC-03/04).

| # | Fixture | Creacion | Para que prueba |
|---|---|---|---|
| F1 | Cliente `ACTIVO` con **cero** filas de membresia (3 tipos) | API HU-04 | `sinMembresiaActiva: true` (SIN_VIGENCIA), aviso portal |
| F2 | Cliente `ACTIVO` con **solo GYM `VENCIDA`** (fin ayer) | `POST` + fechas relativas | bloqueo (todos `VENCIDA`), aviso, ingreso 403 rama VENCIDA |
| F3 | Cliente con GYM `VENCIDA` + NUTRICION `ACTIVA` | 2 `POST` mixtos | `INC06-ACC-02` (fixture F8 de INC-05): **sin** bloqueo, portal por servicio |
| F4 | Cliente cuya **unica** vigencia esta `CONGELADO` (pausa cubre hoy) | `POST` + `/congelar` | `INC06-ACC-03`: congelado conserva acceso |
| F5 | Vigencia `PROGRAMADA` como unica (inicio manana) | `POST` con fecha futura | `INC06-PEND-04`: rama PROGRAMADA |
| F6 | Cliente `SUSPENDIDO` con GYM `ACTIVA` | PATCH estado (DEC-035) | guarda previa intacta (403 ingreso por estado, no por INC-06) |
| F7 | Cliente con GYM `ACTIVA` (o `CONGELADO`) | `POST` | `INC06-ACC-04` 201 y `INC06-ACC-07` portal completo |
| F8 | Staff `DUENO`/`RECEPCIONISTA`; token `CLIENTE`; token vencido | seed existente | permisos y 401/403 intactos |

Supuestos: cada test crea sus fixtures y limpia al terminar (borrar
`MembresiaGymCambio` antes que `MembresiaGym`, precedente `world.ts`);
sin dependencia entre archivos; fechas relativas a hoy (Bogota).

## Evidencia requerida por criterio

| Criterio(s) | Integracion API (Vitest) | Unit/UI (Vitest web) | E2E (Playwright) | Gherkin |
|---|---|---|---|---|
| `ACC-01` | si (F1/F2/F5: `sinMembresiaActiva` true en 0 filas, todos VENCIDA, y rama PROGRAMADA segun PEND-04) | si (pantalla de aviso renderizada, copy exacto de PEND-01) | **si** (login -> portal aviso; ver matriz) | si (escenario nuevo si el literal queda fijo tras PEND-01) |
| `ACC-02` | si (F3: portal 200 sin bloqueo; estado por servicio) | no | **si** (regresion portal mixto) | si (fixture F8 de INC-05 reutilizable) |
| `ACC-03` | si (F4: congelado sin bloqueo; fin de pausa -> bloqueo al dia siguiente) | no | no | opcional |
| `ACC-04` | si (F2/F7: 403 mensajes exactos intactos + 201; F6 rama estado intacta) | no | **si** (recepcion ingreso, base `recepcion.spec.ts`) | si (guardas HU-30 ya tienen escenarios; verificar sin cambios) |
| `ACC-05` | si (si PEND-02 = (b): rama nueva; si = (a): regresion 200 + `debeCambiarPin` intacto) | si (mensaje del aviso post-login) | **si** (login -> portal aviso) | no |
| `ACC-06` | no | si (copy exacto + accesibilidad) | si (via `ACC-01`) | si (si el copy se fija aqui) |
| `ACC-07` | si (portal completo con acceso) | si (sin aviso presente) | **si** (regresion `portal.spec.ts` y `acceso-vencimiento.spec.ts`) | no |
| **Todos** | `npx tsc --noEmit` (0), `npx vitest run` (base intacta), `npm run test:gherkin` (guard intacto/actualizado en GREEN) | `npx tsc --noEmit`, `npx vitest run`, `npm run build` | `npx playwright test` **x2 corridas** | `npx prisma migrate status` (esperado 9/0 o mas, sin drift; **sin migracion nueva**) |
| **Revision** | `code-reviewer`: no duplicado (HU-16/25/30/08/15), fuente unica de estado, orden de guardas intacto, base certificada sin perdida, pruebas sin aserciones vacias | | | |

## Matriz de navegacion/aplicabilidad (obligatoria; DEC-048 afecta acceso)

> Para el `ui-navigation-auditor` y la puerta LISTO de navegacion. Resultado
> **inicial de todas las filas: `NO VERIFICADO`** (criterios escritos != recorridos
> ejecutados; ningun viaje se acepta sin evidencia ejecutada). Destinos
> **esperados** fijados aqui; los no aplicables se justifican.

| Criterio | Pantalla | Estado | Entrada | Salida esperada | Rol | Prueba | Resultado | Evidencia |
|---|---|---|---|---|---|---|---|---|
| `ACC-05`+`ACC-01` | `/login-cliente` -> `/portal` | sin membresia activa | URL directa + login con F2 | Aterriza en `/portal` y ve **aviso de activar membresia** (PEND-03(a)); sin acceso a tarjetas | CLIENTE | E2E nuevo `inc06-acceso-membresia.spec.ts` | NO VERIFICADO | _pendiente_ |
| `ACC-01` | `/portal` | sin membresia activa | **Recarga** del portal | El aviso **persiste** (dato del resumen, no estado de navegacion) | CLIENTE | E2E (mismo spec, paso de recarga) | NO VERIFICADO | _pendiente_ |
| `ACC-01` | `/portal` | sin membresia activa | **Atras** del navegador tras recarga | Sin bucle: `/portal` vuelve a pintar el aviso (200, no redirect en bucle) | CLIENTE | E2E (mismo spec) | NO VERIFICADO | _pendiente_ |
| `ACC-06` | `/portal` (aviso) | sin membresia activa | Carga en **movil** (viewport 375px) y **escritorio** | Copy completo visible sin scroll horizontal; CTA legible | CLIENTE | E2E (mismo spec, 2 viewports) | NO VERIFICADO | _pendiente_ |
| `ACC-06` | `/portal` (aviso) | sin membresia activa | Navegacion por **teclado** (Tab) | El aviso es legible por lector (estructura semantica); sin foco trampa | CLIENTE | unit/a11y + inspeccion del E2E | NO VERIFICADO | _pendiente_ |
| `ACC-07` | `/portal` | con al menos un vigente/congelado | URL directa + recarga + atras | Portal completo **sin** aviso; **mismos destinos que hoy** (regresion: sin cambio observable) | CLIENTE | E2E regresion `portal.spec.ts` | NO VERIFICADO | _pendiente_ |
| `ACC-05` | `/login-cliente` | sesion expirada -> login -> portal | Banner de sesion expirada (DEC-010) + F2 | Tras nuevo login, aterriza en `/portal` con aviso; **sin bucle** de recuperacion | CLIENTE | E2E nuevo (paso de sesion expirada) | NO VERIFICADO | _pendiente_ |
| `ACC-04` | `/recepcion` (consulta + ingreso) | cliente F2 en consulta e ingreso | Flujo recepcion (buscar cedula -> registrar ingreso) | Consulta muestra estado; ingreso **403** con mensaje existente (sin cambio de navegacion; el error se pinta en la zona actual) | DUENO / RECEPCIONISTA | E2E base `recepcion.spec.ts` + nuevo paso F2 | NO VERIFICADO | _pendiente_ |
| `ACC-02` | `/recepcion` + `/portal` | mixto F3 (GYM vencida + NUTRICION activa) | Flujo recepcion y portal | Ingreso **403** (GYM vencida) pero **portal sin aviso** (hay servicio vigente); destinos intactos | CLIENTE / staff | E2E nuevo | NO VERIFICADO | _pendiente_ |
| `ACC-04` | `/login` (staff) | cualquiera | URL directa `/login` | **Sin cambio**: staff no depende de vigencias (no aplicable el bloqueo a DUENO/RECEPCIONISTA) | DUENO / RECEPCIONISTA | regresion `auth.spec.ts` / `acceso-roles.spec.ts` | NO VERIFICADO (esperado: sin cambio) | _pendiente_ |
| - | App movil nativa | - | - | **No aplicable**: no existe app movil en el MVP (fuera de alcance) | - | - | No aplicable (justificado) | - |
| - | Landing `/` | anonimo | URL directa | **Sin cambio** (el bloqueo es del portal autenticado, no del sitio publico) | anonimo | E2E base | NO VERIFICADO (esperado: sin cambio) | _pendiente_ |

**Bucles/enlaces rotos evaluados**: el aviso no navega fuera del portal (CTA de
contacto, sin href de compra — no existe flujo de pago); el logout del portal
(`signOut -> /login-cliente`) queda intacto; la sesion expirada sigue el
camino DEC-010 sin competir con el aviso. **Criterios que cambian flujos
criticos y exigen E2E**: `ACC-01`, `ACC-04`, `ACC-05`, `ACC-07`.

## Riesgos

| ID | Riesgo | Impacto | Mitigacion | Responsable |
|---|---|---|---|---|
| `INC06-R01` | **Regresion sobre INC-03 aceptado**: el portal (`portal.ts`) y su E2E (`portal.spec.ts`, `acceso-vencimiento.spec.ts`) asertan el contrato actual de `estadoAccesoGym` | Romper la base web 183/183 o E2E 56/56 | Cambio **aditivo** del contrato (los campos actuales intactos); pruebas de regresion explicitas; guards en RED | Backend + QA |
| `INC06-R02` | **Regresion sobre recepcion/ingresos aceptados** (HU-30/HU-08): el orden estado-general -> vigencia es sensible | Ingresos erroneos o guardas saltadas | `INC06-CONF-03`: sin cambio de rama; `ACC-04` verifica mensajes exactos existentes | Backend + QA |
| `INC06-R03` | **Copy colisionante** ("suspension activa" vs estado `SUSPENDIDO`, HU-17/DEC-030) | Clientes/staff confunden bloqueo de membresia con suspension del cliente | `INC06-PEND-01` bloquea el criterio hasta decision explicita; recomendacion (a) sin la palabra "suspension" | Producto + Frontend |
| `INC06-R04` | **`PROGRAMADA` sin nombrar** en DEC-048 | Dos semantics de acceso para la misma vigencia (portal vs ingreso) | `INC06-PEND-04` bloquea hasta decidir; recomendacion (a) coherente con ingreso | Producto |
| `INC06-R05` | **Duplico de puntos**: HU-16/25/30/08/15 ya cobrados | Contar dos veces el efecto vencido/acceso (DEC-016) | Seccion "Regla de no duplicado" + auditoria de cierre; **0 puntos** declarados | Orquestador |
| `INC06-R06` | El calculo multi-servicio debe **compartir** la fuente unica con INC-05 (que agrega filas `PERSONALIZADO`/`NUTRICION`) | Bloqueos espurios o no detectados con clientes mixtos (F8) | `INC06-CONF-01`; fixture F3 reutiliza F8 de INC-05; ratificacion backend | Backend |
| `INC06-R07` | Incremento **0 puntos** sobre codigo aceptado puede generar expectativa de avance | Reporte de % inflado | El spec y `evidencia.md` declaran 0 puntos; el orquestador no certifica fraccion (DEC-016) | Orquestador |
| `INC06-R08` | **Login bloqueado** (si PEND-02 = (b)) romperia HU-02 aceptada y el flujo de sesion expirada/callbackUrl | Regresion de auth completa | Recomendacion (a); si se elige (b), contrato de auth con regresion explicita de `auth.spec.ts`, `sesion-vencida.spec.ts`, `inc04-login-cliente-inactivo.spec.ts` | Backend + QA |
| `INC06-R09` | **Copy falso**: si `sinMembresiaActiva` incluyera el estado general, un `SUSPENDIDO`/`RETIRADO` con GYM `ACTIVA` veria "No tienes una membresia activa" | Colision con DEC-051 PEND-01(a) y confusion con estado `SUSPENDIDO` | **Cerrado en la ratificacion R1 (2026-10-29)**: el flag solo considera vigencias; el estado general queda en sus guardas propias | Backend |
| `INC06-R10` | **Snapshot divergente**: dos lecturas (bloque GYM + flag) podrian divergir ante escritura concurrente | Payload inconsistente (cosmetico; la ruta es lectura) | Ratificado R2/R3: un solo `findMany` de los 3 tipos deriva ambos resultados | Backend |
| `INC06-R11` | **Copy con fecha de inicio**: DEC-051 PEND-04(a) permite mencionar "tu membresia inicia el <fecha>", pero la respuesta no expone `fechaInicio` | Fecha ausente en el copy o scope silencioso | Ratificado R3: booleano simple `sinMembresiaActiva`; exponer `fechaInicio` seria **scope change explicito** (decision del orquestador/Producto), nunca en silencio en GREEN | Orquestador + Backend |
| `INC06-R12` | **E2E aceptado con expectativa cambiada**: `acceso-vencimiento.spec.ts:90-104` aserta las tarjetas del portal para cliente con GYM vencida unica; bajo DEC-048 + PEND-03(a) ahora vera el aviso a pantalla completa | El RED reportaria una "base rota" que en realidad es contrato cambiado | **Registrado en la ratificacion R5 (2026-10-29)**: es cambio de comportamiento `ACC-01` (no regresion `ACC-07`); su expectativa se actualiza en el ciclo GREEN con **contrato propio del orquestador** (patron C4, nunca edicion silenciosa) | Orquestador + test-engineer |

## Trazabilidad de decisiones aprobadas aplicadas

| Decision | Aplicacion en INC-06 |
|---|---|
| DEC-048 (requisito) | Spec completo; `ACC-01/05/06` |
| DEC-025 (congelado conserva acceso) | `ACC-03`; definicion de "sin membresia activa" (excluye `CONGELADO`) |
| DEC-026 / DEC-027 (login intacto, acceso por servicio) | `ACC-02`, `ACC-05` (recomendacion PEND-02(a)), regresion portal |
| DEC-030 / DEC-039 (guardas de estado en ingreso) | `ACC-04` y `INC06-CONF-03` (orden intacto) |
| DEC-034 (`AUTH_CLIENTE_INACTIVO`) | Fuera de alcance explicito; unico bloqueo de login vigente si PEND-02 = (a) |
| DEC-004 / DEC-042 (3 tipos de servicio) | Resolucion multi-servicio (`ACC-01`) |
| DEC-005 / DEC-006 (Bogota, inclusivos) | Fechas de fixtures y calculo |
| DEC-028 (alertas derivadas) | `INC06-CONF-02` (sin alerta nueva) |
| DEC-011 / DEC-016 (evidencia, fraccion) | 0 puntos; plantilla de evidencia |
| DEC-012 / DEC-013 (aislamiento, fechas relativas) | Fixtures F1..F8 |

## Checklist de puerta LISTO

- [x] Spec con objetivo, alcance incluido/excluido y fuera de alcance explicito (este archivo).
- [x] Criterios `INC06-ACC-01..07` con trazabilidad y estados.
- [x] Regla de **no duplicado** con argumento trazable (**0 puntos**).
- [x] **`INC06-PEND-01..04` formuladas** con opciones y recomendaciones.
- [x] Contrato API **propuesto** (pendiente de ratificacion).
- [x] Fixtures + supuestos de aislamiento (DEC-012/DEC-013).
- [x] Plantilla de evidencia (`evidencia.md`) y backlog (`tareas.md`).
- [x] **Matriz de navegacion/aplicabilidad** incluida (resultado inicial `NO VERIFICADO`).
- [x] **`INC06-PEND-01..04` resueltas por Producto** y registradas en `docs/producto/decisiones.md`
  (**DEC-051**, 2026-10-29, opcion (a) en las 4).
- [x] Contrato ratificado por `backend-developer` (**RATIFICA CON CORRECCIONES
  R1..R5**, 2026-10-29, incorporadas al spec).
- [x] **`INC06-CONF-01..04` + no-duplicado ratificadas por el orquestador**
  (`decisiones.md`, 2026-10-29).
- [x] **Matriz de navegacion aprobada** por el orquestador (2026-10-29;
  destinos esperados por DEC-051, filas aplicables `NO VERIFICADO` hasta
  evidencia ejecutada).

**Puerta LISTO: 4/4 casillas de cierre (2026-10-29). El incremento paso a
`LISTO`** y completo el pipeline el mismo dia: RED -> GREEN backend+web ->
VERIFICADO (E2E 88/88 x2 + enmiendas C4) -> auditoria de navegacion
(H-01/H-02 cerrados; E2E 94/94 x2) -> REVISADO (ACEPTA CON HALLAZGOS NO
BLOQUEANTES) -> **ACEPTADO**. Certificacion: **0 puntos** (mejora de regla
DEC-048; regla de no duplicado) — solo registro del cierre en `avance.md`.

## Plan de ejecucion por agente

| Paso | Agente | Entrega | Criterios | Depende de |
|---:|---|---|---|---|
| 1 | acceptance-criteria-analyst | `spec.md`, `tareas.md`, `evidencia.md` (este paquete) | todos | - (hecho 2026-10-20) |
| 2 | Orquestador + Producto | Resolver `INC06-PEND-01..04` -> `decisiones.md` | `ACC-01`, `ACC-05`, `ACC-06` | paso 1 |
| 3 | backend-developer | Ratificar contrato (resolucion multi-servicio, forma de respuesta, orden, impacto login) | todos | paso 2 |
| 4 | Orquestador | Registrar `INC06-CONF-01..04` + no-duplicado + matriz de navegacion; puerta **LISTO** | - | pasos 2-3 |
| 5 | test-engineer | **RED**: integracion API (`inc06-acceso-sin-membresia.test.ts`), unit web (aviso), E2E (`inc06-acceso-membresia.spec.ts`), Gherkin si el copy queda fijo; sin tocar `src/` | `ACC-01..07` | paso 4 |
| 6 | backend-developer | **GREEN**: `resolverAccesoApp` (fuente unica), `GET /portal/resumen` aditivo, login solo si PEND-02 = (b) | `ACC-01..05`, `ACC-07` | paso 5 |
| 7 | frontend-developer | **GREEN** web: pantalla de aviso en `/portal` (PEND-03(a)) con copy PEND-01 | `ACC-01`, `ACC-06`, `ACC-07` | paso 6 |
| 8 | test-engineer | **VERIFICADO**: bateria completa con base intacta (536/153/183/56 o las medidas al arranque), registro en `evidencia.md` | todos | paso 7 |
| 9 | ui-navigation-auditor | Auditoria de la matriz de navegacion (viajes ejecutados, movil/escritorio/teclado, URL directa/recarga/atrás) | matriz | paso 8 |
| 10 | code-reviewer | **REVISADO**: no duplicado, fuente unica, orden de guardas, base sin perdida, pruebas sin aserciones vacias | todos | paso 9 |
| 11 | Orquestador | Certificacion: `avance.md`/`mvp.md`/`decisiones.md` (**0 puntos**; solo registra el cambio de regla) | todos | paso 10 |
