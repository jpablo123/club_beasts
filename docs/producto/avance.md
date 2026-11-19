# Avance del MVP

Fecha de corte: 2026-11-18 (cierre de INC-12; **91 de 100 certificados (91%)**).
Actualizacion 2026-11-18 (XI; +12 puntos certificados: 79 -> 91 de 100 (91%)): INC-12-nutricion ACEPTADO (bloque 7 completo: HU-22 4/4, HU-23 4/4, HU-24 2/2, HU-27 2/2; reparto en seccion 14 de auditoria-puntos-inc00.md). Revision code-reviewer ACEPTA CON HALLAZGOS NO BLOQUEANTES, 0 bloqueantes. Verificacion: tsc 0 api/web, vitest api 30/30 + web 5/5, build PASS. Residuales: frontend parcial (solo portal), E2E NAV-NUT NO VERIFICADO, as any, macros passthrough, web schema stub. Decisiones: DEC-075..082. Total actual: 91/100. Evidencia: docs/incrementos/INC-12-nutricion/evidencia.md.

Fecha de corte: 2026-11-18 (cierre de INC-10; **79 de 100 certificados (79%)** â€” corte del 50% ampliado).

Actualizacion 2026-11-18 (X; **sin cambio de puntos; sigue 79 de 100 certificados (79%)**): **`INC-11-ux-anamnesis` ACEPTADO** (0 puntos; UX no certifica puntos MVP; precedente INC-08). Cierra hallazgos de auditoria de UX/diseno: tipografia del sistema (`font-oswald` inexistente -> `font-display` en 5 encabezados, DEC-071) y UX del formulario de anamnesis (labels cortos + hint con instruccion completa del Anexo DEC-052, DEC-072; aviso "Informacion confidencial" en los 5 sensibles por presencia de clave, DEC-073; hint + validacion inline en condicionales #12/#18b, DEC-074; enmienda del criterio C3 de INC-09). Revision `code-reviewer` **ACEPTA**, 0 bloqueantes. Verificacion: tsc 0, vitest 9/9, build PASS, E2E 12/12 (cambio-pin-obligatorio 3/3, inc09-anamnesis-portal 5/5, inc09-anamnesis-staff 4/4). NAV-AN-07 intacto; sin cambios de API/permisos/modelos; navegacion NO APLICABLE justificada (sin rutas/links nuevos). Evidencia: `docs/incrementos/INC-11-ux-anamnesis/evidencia.md` (Â§3-Â§5). Decisiones: DEC-071..074 + Enmienda DEC-052 (labels/hints definitivos). **Total sigue 79/100.**

Actualizacion 2026-11-18 (IX; **+18 puntos certificados: 61 -> 79 de 100 (79%)**): **`INC-10-rutinas` ACEPTADO** â€” bloque 6 completo (HU-18 4/4 = 4, HU-19 5/5 = 5, HU-20 4/4 = 4, HU-21 3/3 = 3, HU-26 2/2 = 2; reparto en seccion 13 de `auditoria-puntos-inc00.md`; **HU-13 b4 cerrada +0** por split explicito INC10-R01 â€” peso 3 ya al maximo desde INC-05, fraccion HU-13 ahora 4/4). Revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (REV-01..REV-11; REV-01 cerrado con FIX-04 = editor a C4 por nodo y REV-05 con FIX-05 = PATCH re-valida contencion, ambos bajo decision de Producto 2026-11-15; REV-02/03/04/06/07/08/09/11 backlog). Pipeline completo 2026-11-05/18: ESPECIFICADO + LISTO (contratos R1-R8 y C1-C9 ratificados con correcciones; DEC-062..070 + Anexo DEC-052) -> RED (268 pruebas con base intacta; enmiendas C4/D1-D4 documentadas, 0 borrados) -> GREEN T6 (modelo + migracion **11/0 sin drift**) + T7 (API) + T8 (web) -> FIX-01..06 (FIX-03a UI, FIX-03b/03c viajes NAV, FIX-06 diagnostico entorno AUD-034) -> VERIFICADO **INC10-VER-FINAL** 2026-11-18 verde completa: API **1034/1034**, Gherkin **220/220**, web unit **401/401**, build PASS, tsc 0/0, migraciones **11/0**, E2E **213/213** (143 base + 70 NAV-RU), invert **143/143**, PIN **3/3** -> auditoria `ui-navigation-auditor` **NAV-RU-01..24: 24 plenos / 0 parciales / 0 fallidas** (re-ratificada 2026-11-18; AUD-01..10 y BLOQ-01/02 cerrados; residuo INFO INC10-NAV-AUD-11 en backlog) -> REVISADO -> ACEPTADO. Trazabilidad: seccion 13 de `auditoria-puntos-inc00.md` (no-duplicado: RU-05/18/25 REF sin punto propio, HU-07 b5/b6 anotados para su cierre sin puntos aqui, DEC-018 macro/meso/micro cobrado unicamente como HU-19 b2, fixes FIX-01..06 sin puntos). Evidencia: `docs/incrementos/INC-10-rutinas/evidencia.md` (Â§5b verificacion final, Â§5c R-FIX03B-01, Â§7 revision, Â§8 aceptado). Riesgos residuales: R-FIX03B-01 (entorno probablemente FC26, `turbopack.root` pendiente devops), concurrencia real solo Postgres, `bodyLimit` 5 MiB (INC10-R05), commit del working tree pendiente (gestion, no criterio).

Actualizacion 2026-11-05 (VIII; **+12 puntos certificados: 49 -> 61 de 100 (61%)**): **`INC-09-anamnesis-deportiva` ACEPTADO** â€” bloque 5 completo (HU-09 4/4 = 4, HU-10 4/4 = 4, HU-11 3/3 = 2, HU-28 3/3 = 2; reparto en seccion 12 de `auditoria-puntos-inc00.md`). Revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (7/7 checklist CONFORME; H-REV-02 resuelto por Producto con **DEC-061** = limite conocido AN-26 al vaciar un solo campo; H-REV-01 flaky de base INC-06 estabilizado por INC09-FIX-04). Pipeline completo 2026-11-04/05: LISTO (contratos API R1-R8 y web C1-C9 ratificados; DEC-052+Anexo de 23 campos, DEC-055 5 sensibles con RH, DEC-056a pre-llenado 1/2/9/10, DEC-057 1 por cliente, DEC-058 solo DUENO escribe, DEC-060 gate por servicio vigente) -> RED (250 pruebas: 104 API + 45 unit API verdes + 88 unit web + 13 E2E; 4 enmiendas C4) -> GREEN T8 (modelo `Anamnesis` 1:1, migracion **10/0** sin drift) + T9 (API **807/807**: whitelist DEC-055, merge R3/C3a, orden R7) + T10 (web: `/portal/anamnesis`, seccion ficha, editor 25 props; **E2E 135/135**) -> INC09-FIX-01 (fixture paridad `"Gana"`) -> INC09-FIX-02 (flaky `membresia.spec.ts` estabilizado, patron R-10) -> VERIFICADO bateria **x2 identica** (API 807/807 x2, Gherkin 220/220 x2, web 303/303 x2, E2E 135/135 x2; 16 logs `inc09-verificado-run{1,2}-*`) -> auditoria `ui-navigation-auditor` (NAV-AN-01..09 **VERIFICADO**; NAV-F-01..06 cerrados con viaje: guarda PIN sin fetch, teclado links, foco alertdialog NAV-F-03b, editabilidad, "Volver al portal", DOM DEC-041) -> REVISADO -> INC09-FIX-04 (flaky INC-06 `acceso-membresia.spec.ts` estabilizado) -> bateria final **143/143**. Trazabilidad: seccion 12 de `auditoria-puntos-inc00.md` (no-duplicado: campos 1-10 snapshot sin puntos de HU-04/05, HU-07 b4 sin puntos -> HU-07 sigue 3/6, DEC-060 sin bullet). Evidencia: `docs/incrementos/INC-09-anamnesis-deportiva/evidencia.md`.

Actualizacion 2026-10-30 (VII; **sin cambio de puntos; sigue 49 de 100 certificados**): **`INC-08-logout-recepcion-motivo-edicion` ACEPTADO** (0 puntos; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, 0 bloqueantes). Cierra **H-03** (logout propio en `/recepcion`, DEC-053) y **PEND-004/REV-01 INC-04** (UI envia `estado` solo cuando cambia, DEC-054). Pipeline completo el mismo dia: LISTO 6/6 (matriz navegacion 9 filas) -> RED (28 rojas + 6 pines, 0 enmiendas C4) -> GREEN (2 archivos: `recepcion/page.tsx` control "Salir", `clientes/[id]/page.tsx` diff `estado`) -> INC08-FIX-01 (fixture fila 7, enmienda documentada) -> VERIFICADO bateria x2 identica (API **658/658**, Gherkin **220/220 exit 0**, web **215/215**, build PASS, tsc 0/0, migraciones **9/0**, E2E **122/122**; 16 logs en `%TEMP%\opencode\inc08-verificado-run{1,2}-*`) -> auditoria `ui-navigation-auditor` (filas 1-9 **VERIFICADO** con evidencia ejecutada, **H-03 CERRADO**; H-INC08-01/02/03 cerrados por INC08-FIX-02 con viajes "Cancelar"/CLIENTE->`/recepcion`/Space RECEPCIONISTA; H-INC08-04 desmentido) -> REVISADO (spot-check propio 28/28 E2E + 11/11 unit; H-REV08-01 documental corregido por el orquestador; H-REV08-02/03 sugerencias backlog) -> ACEPTADO. Decision del orquestador: capa 2 del fallback "Volver a mi portal" **NO APLICABLE** como travesia literal (inalcanzable por navegador con middleware activo; unit fija el contrato). **0 puntos certificados** (no-duplicado; WORKFLOW-NAV no certifica puntos MVP). **DEC-052** (PEND-003): anamnesis con el formulario completo de analisis pre entrenamiento â€” **a la espera del formulario real del usuario**; el incremento de anamnesis (bloque 5, corte al 50%) queda **BLOQUEADO** hasta ese insumo.

Actualizacion 2026-10-29 (VI; **cierre; sin cambio de puntos; sigue 49 de 100 certificados**): **`INC-07-navegacion-login-pin` y `INC-06-acceso-sin-membresia-activa` ACEPTADOS** (0 puntos cada uno; revision `code-reviewer` **ACEPTA CON HALLAZGOS NO BLOQUEANTES**, W1 cerrado antes de aceptar). Pipeline completo el mismo dia en ambos: LISTO 4/4 -> RED -> GREEN -> VERIFICADO -> auditoria de navegacion -> REVISADO -> ACEPTADO. Bateria final: API **658/658**, Gherkin **220/220 exit 0** (guard 220), web **204/204**, build PASS, tsc 0/0, migraciones **9/0 sin drift**, E2E **94/94 x2 identicas** (57 base + 19 INC-07 + 12 INC-06 + 6 viajes de cierre H-01/H-02; logs persistidos en `%TEMP%\opencode\`). Navegacion: matrices revisadas fila a fila (INC-07 15 filas, INC-06 12 filas) con resultado persistido en las `evidencia.md` Â§5; sin enlaces rotos ni bucles; destinos DEC-050/DEC-051 verificados en navegador; decision D-01 del orquestador (evidencia ejecutada por QA con logs = evidencia valida; el auditor no tenia navegador propio y lo declara). Hallazgos: H-01a/b/c/d y H-02 cerrados con viajes nuevos (`inc07-dashboard-staff.spec.ts` + `inc06`); W1 cerrado (fixture NAV-04 con vigencia ACTIVA); W3/W4 cerrados; W2/H-07 (clase transitoria `portal.spec.ts:56`, test base aceptado) backlog con enmienda C4 recomendada; S1/S2 menores backlog; **H-03 escalado a Producto** (`/recepcion` staff sin control de logout propio; preexistente INC-03, fuera de alcance); H-05 opcional; H-06 (foco visible en links nuevos) backlog frontend. **0 puntos certificados** (regla de no duplicado verificada en revision; WORKFLOW-NAV no certifica puntos MVP).

Actualizacion 2026-10-29 (V; **sin cambio de puntos; sigue 49 de 100**): **VERIFICADO + auditorÃ­a de navegaciÃ³n de INC-07 e INC-06**. BaterÃ­a combinada: API **658/658**, Gherkin **220/220 x2**, web **204/204**, build PASS, tsc 0/0, migraciones **9/0**, E2E **88/88 x2** tras enmienda C4 de `portal.spec.ts` (3 viajes INC-03 reasignados a fixtures con membresÃ­a activa, conservando aserciones byte a byte) â€” **88/88 x2 idÃ©nticas**. AuditorÃ­a `ui-navigation-auditor`: matrices INC-07 (15 filas) e INC-06 (12 filas) revisadas fila a fila contra evidencia ejecutada de `test-engineer` (D-01: el auditor no disponÃ­a de navegador propio; la evidencia Playwright con logs es la ejecutada; decisiÃ³n del orquestador: **evidencia ejecutada por QA vÃ¡lida**, auditorÃ­a aporta contraste + resultado por fila). Sin enlaces rotos ni bucles; destinos DEC-050/DEC-051 confirmados. Hallazgos H-01..H-08: **H-01a/b/c/d y H-02 cerrados** por `test-engineer` con 6 viajes nuevos (`inc07-dashboard-staff.spec.ts` 4 + `inc06` 2: RECEPCIONISTA F2, logout CLIENTE portal completo, overflow escritorio) â€” E2E **94/94 x2** con logs persistidos; H-03 (`/recepcion` sin logout, preexistente INC-03) escalado a Producto; H-04 cerrado (artefactos persistidos); H-05 opcional; H-06 (foco) backlog; H-07 flake latente a vigilar en revisiÃ³n; H-08 documental (conteo de filas). Pendiente: **revisiÃ³n `code-reviewer`** (Ãºltima casilla de ACEPTADO). **0 puntos certificados** (DEC-011).

Actualizacion 2026-10-29 (IV; **sin cambio de puntos; sigue 49 de 100**): **GREEN de INC-06 completo (backend + web) y GREEN de INC-07 completo**. INC-06 backend: `resolverAccesoApp` (R1 solo vigencias, R2 fuente unica, R10 snapshot unico), `GET /portal/resumen` aditivo `sinMembresiaActiva` (R3), guard Gherkin 214->220; micro-fix de fixture RED (`apellidos` sin digitos, precedente INC-01) tras BLOQUEADO parcial; API **658/658** + Gherkin **220/220 exit 0**. INC-06 web: pantalla de aviso a pantalla completa con copy exacto DEC-051 (sin "suspension", `role="alert"` + heading, logout intacto), guardas PIN intactas; unit **204/204**; E2E INC-06 **12/12** tras micro-fix F3 (aserciones fieles a la matriz) + **enmienda C4 aplicada** a `acceso-vencimiento.spec.ts` viaje de vencimiento unico (`INC06-R12` cerrado: cambio `ACC-01` documentado, 15/15 verdes en conjunto). INC-07 GREEN: 29/29 del RED en verde (19 E2E INC-07 + base 57/57). **Carrera de navegacion** detectada y corregida en INC-06 web (viaje atras: popstate perdido antes de hidratacion -> `router.replace("/portal")` unico, sin bucle). Estado: ambos incrementos **IMPLEMENTADO**; pendiente VERIFICADO (bateria completa x2), auditoria de navegacion (`ui-navigation-auditor`, filas de matriz aun `NO VERIFICADO`) y revision (`code-reviewer`). **0 puntos certificados** (DEC-011).

Actualizacion 2026-10-29 (III; **sin cambio de puntos; sigue 49 de 100**): **GREEN de INC-07 ejecutado** por `frontend-developer` (contrato C1..C6): links "Volver al inicio" en `/login` y `/login-cliente` (href por sesion, DEC-050), link en rama `debeCambiarPin` y CTA **`<a href="/portal">` nativo** en `pinChangeSuccess` (C2, fuera de `<nav>`, C3); los **29 tests del RED pasaron a verde sin tocar tests** (10 unit + 19 E2E); base web 188/188 + E2E 57/57 intactas, tsc 0, build PASS, no-interferencia CONF-02/03 verificada. Faltan VERIFICADO (E2E x2), auditoria de navegacion (`ui-navigation-auditor`) y revision (`code-reviewer`) para INC-07. GREEN de INC-06 en curso.

Actualizacion 2026-10-29 (II; **sin cambio de puntos; sigue 49 de 100**): **RED ejecutado en INC-07 e INC-06** por `test-engineer` (contratos propios). **INC-07 RED**: 10 unit + 19 E2E nuevos en rojo (`inc07-navegacion-auth.test.tsx`, `inc07-navegacion-auth.spec.ts`), localizadores C4, 4 defectos de borradores corregidos; bases intactas (web 188/188, E2E 57/57, API 632/632, 9/0). **INC-06 RED**: 31 pruebas nuevas en rojo (API 26: 10 rojos + 16 regresion verdes; Gherkin 6 escenarios nuevos, guard 214 sin tocar; unit web 6; E2E 12: 11 rojos + 1 regresion verde); bases intactas con salvedad de los 29 rojos preexistentes de INC-07 no tocados. **Riesgo R5/`INC06-R12` confirmado en el RED**: `acceso-vencimiento.spec.ts:90-104` quedara en rojo tras el GREEN de INC-06 (cambio `ACC-01`, patron C4: enmienda con contrato propio, nunca edicion silenciosa). Ningun criterio VERIFICADO/ACEPTADO; **0 puntos certificados** (DEC-011). Siguiente: GREEN de INC-07 (`frontend-developer`) y GREEN de INC-06 (backend + frontend; secuencial: ambos tocan `portal/page.tsx`).

Actualizacion 2026-10-29 (**sin cambio de puntos; sigue 49 de 100 certificados**): **puertas LISTO de INC-06 e INC-07 cerradas 4/4 â€” ambos incrementos pasan a `LISTO`**. Producto aprobo la confirmacion unica de las recomendaciones: **DEC-050** (`INC07-PEND-01`, opcion (a): destino del link de regreso por rol y estado) y **DEC-051** (`INC06-PEND-01..04`, opcion (a) en las 4: copy sin "suspension", login intacto, aviso a pantalla completa en `/portal`, `PROGRAMADA` cuenta como sin acceso). El orquestador ratifico `INC07-CONF-01..03` (CON-01 enmendada: el CTA `NAV-04` es `<a href="/portal">` nativo porque `next/link` a la misma URL no remonta el componente) + `INC06-CONF-01..04`, las reglas de **no-duplicado (0 puntos cada uno)** y **aprobo las matrices de navegacion/aplicabilidad** (destinos esperados fijados; todas las filas en **`NO VERIFICADO`** hasta evidencia ejecutada en navegador; sub-filas de login autenticado `NO APLICABLE` por `middleware.ts:15-21`; app movil `No aplicable`). Contratos ratificados con correcciones incorporadas: **frontend `RATIFICA CON CORRECCIONES C1..C6`** (C1 destino fijado por pantalla; C2 CTA nativo NAV-04; C3 links fuera de `<nav>` para no romper `nav a[href="/"]` de `cambio-pin-obligatorio.spec.ts:58`; C4 localizadores `exact:true`+`href`+`toHaveCount(1)`; C5 posicion exacta; C6 tests a cargo del RED) y **backend `RATIFICA CON CORRECCIONES R1..R5`** (R1 **sustantiva**: `sinMembresiaActiva` solo sobre vigencias â€” el estado general no entra, evitando copy falso a SUSPENDIDO con GYM activa; R2 resolucion en `membresia.service.ts` reutilizando `resolverEstadoAcceso`; R3 respuesta con unico campo `sinMembresiaActiva` en 200; R4 orden portal `401->403 rol->404->resolucion->200`; R5 `acceso-vencimiento.spec.ts:90-104` es cambio `ACC-01`, no regresion, su expectativa se actualiza con contrato propio tipo C4). Nuevos riesgos registrados: `INC06-R09..R12`. **RED habilitado en ambos; ningun criterio IMPLEMENTADO/VERIFICADO/ACEPTADO; 0 puntos certificados** (DEC-011; WORKFLOW-NAV no certifica puntos MVP). Base intacta de arranque (INC-05 cerro el 2026-10-28): **API 632/632, Gherkin 214/214, web 188/188, E2E 57/57 x2, migraciones 9/0** (re-medir al arranque del RED y anotar en sus `evidencia.md`).

Actualizacion 2026-10-28 â€” **cierre de `INC-05-servicios-personalizado-nutricion` (ACEPTADO, revision `code-reviewer` ACEPTA CON HALLAZGOS NO BLOQUEANTES tras cerrar H-01)**: **+6 puntos certificados** (HU-13 3/3 = 3, HU-14 3/3 = 3; bloque 3 a **15/15**). **Total: 49 de 100 puntos certificados (49%)**. Pipeline completo: RED (2026-10-20, 84 API + 61 Gherkin + 2 web + 1 E2E rojos, bases intactas) -> modelo verificado (sin migracion, 9/0) -> GREEN backend (rutas `servicios-personalizado|nutricion`, filtros `tipoServicio` incompat. #1 + C1, DEC-042/043/046/047, `SERVICIO_*`) + GREEN web (`MembershipSection` etiquetado por tipo, `api.servicios`) -> C4 (3 tests + G14 HU-15 enmendados, 3 tests nuevos de rama 409) + fix REG-03 y step nutricion + guard **214** -> VERIFICADO: API **632/632** (536 base + 3 C4-409 + 87 INC-05 + 6 regresion H-01; 0 perdidas), Gherkin **214/214 exit 0**, web **188/188**, build PASS, migraciones **9/0**, E2E **57/57 x2 consecutivas** + repeat-each 30/30 -> estabilizacion de 2 flaky de base (patron R-10/f2968c5: `inc04-estados-cliente.spec.ts` anclado a respuesta real; `congelacion.spec.ts:331` enmendado con reload determinista y aserciones mas fuertes) -> revision **`NO ACEPTA`** por **H-01** (faltaba la regresion DEC-047 gym exigida por `INC05-R11`) -> H-01 **cerrado** con `dec047-parche-gym-regresion.test.ts` (6 tests: 3 ramas + ambas explicitas + optimista 409 + orden 400) + re-revision valida -> **ACEPTA CON HALLAZGOS NO BLOQUEANTES** (deuda menor H-02 401 sin token en archivos nuevos, H-03 `tipoServicio` String sin constraint). Evidencia: `docs/incrementos/INC-05-servicios-personalizado-nutricion/evidencia.md` (secciones 1-6, incluidas 4.9 y 5.6); trazabilidad: **seccion 11** de `docs/producto/auditoria-puntos-inc00.md` (no-duplicado: congelacion -> HU-15, vencimiento -> HU-16, guarda INACTIVO -> HU-08; PER-05/NUT-05 excluidos sin puntos; DEC-047 en gym sin puntos propios). Navegacion: **NO APLICABLE** (etiquetado en ficha, sin links ni rutas nuevas). Con INC-05 queda cerrado el **bloque 3 completo (15/15)** y la ruta al 50% sigue: 49 + 1 (anamnesis, bloque 5, segun DEC-021 y **PEND-003**) = 50.

Actualizacion 2026-10-20 (sin cambio de puntos; sigue **43 de 100 certificados**): **`INC-05` paso a `LISTO` y ejecuto su RED el mismo dia**. Decisiones del Producto: **DEC-042..046** (resuelven `INC05-PEND-01..05`; congelacion de nutricion incluida y **DEC-023 enmendada**), **DEC-047** (al mover `fechaInicio`, `fechaFin` se desplaza conservando la duracion inclusiva), **DEC-048** (bloqueo completo de acceso sin ninguna membresia activa; nueva, abre `INC-06`) y **DEC-049** (link de vuelta al dashboard en login/cambio de PIN; nueva, abre `INC-07`). `backend-developer` ratifico el contrato INC-05 (RATIFICA CON CORRECCIONES C1..C6); `INC05-CONF-01..06` + no-duplicado registrados; **puerta LISTO 13/13**. RED por `test-engineer`: 84 rojos API (nuevos hu13/hu14) + 61 escenarios Gherkin nuevos en rojo + 2 rojos web + 1 E2E rojo, **bases intactas** (API 536, Gherkin 153 base, web 183); evidencia en `docs/incrementos/INC-05-servicios-personalizado-nutricion/evidencia.md`. Paquetes nuevos: `INC-06-acceso-sin-membresia-activa` (ESPECIFICADO + BLOQUEADO, 4 PENDs, matriz de navegacion, **0 puntos**) e `INC-07-navegacion-login-pin` (ESPECIFICADO, matriz de navegacion, **0 puntos**). Ningun criterio de INC-05 esta todavia IMPLEMENTADO/VERIFICADO/ACEPTADO; **sin evidencia de cierre no se certifican puntos** (DEC-011).

Actualizacion 2026-10-19 â€” **cierre de `INC-04-estados-cliente` (ACEPTADO, revision `code-reviewer` ACEPTA CON HALLAZGOS NO BLOQUEANTES, 0 bloqueantes)**: **+2 puntos certificados** (HU-08 4/4 = 1, HU-17 3/3 = 1; bloque 2 a **14/15**). **Total: 43 de 100 puntos certificados (43%)**. Pipeline completo el mismo dia: puerta LISTO sincronizada -> RED (43 API + 18 Gherkin + 6 web en rojo, base intacta) -> GREEN (`c59179e`: matriz 5x5, modelo/migracion `ClienteEstadoCambio`, 401 `AUTH_CLIENTE_INACTIVO`, 409 `CLIENTE_INACTIVO`, 403 rama `INACTIVO`, UI con `motivo` + `role="alert"`) -> VERIFICADO (API **536/536**, Gherkin **153/153 exit 0**, web **183/183**, build PASS, tsc 0/0, migraciones **9/0 sin drift**, E2E **56/56 x2**) -> REVISADO. Evidencia: `docs/incrementos/INC-04-estados-cliente/evidencia.md` (secciones 1-7); trazabilidad: seccion 10 de `docs/producto/auditoria-puntos-inc00.md`. Decisiones del ciclo: DEC-034..041 + CONF-01..07 (2026-10-14) y notas del 2026-10-19 (CONF-03 enmendada por REV-03, campo `actorId` de DEC-036, nuevo **PEND-004** no bloqueante).

Commits del ciclo: `779d0ac` (docs + enmienda G14), `ce69334` (migracion `20261014213742`), `40388e5` (RED), `c59179e` (GREEN), `ad1d783` (verificacion), `f2968c5` (fix suelto autorizado: carrera `debeCambiarPin` en portal + selector del E2E `cambio-pin-obligatorio`, que paso a 3/3; **fuera de los puntos de INC-04**).

Hallazgos de la revision (no bloqueantes, backlog de REV-01..REV-12 de INC-04): REV-01/`PEND-004` (la UI staff envia `estado` en toda edicion, por lo que cualquier guardado de un campo suelto exige `motivo` â€” decision de Producto), REV-02/REV-08 (ubicacion del 400 de `motivo` fuera de Zod y eco del motivo viajero en no-op), REV-04/REV-05 (ventanas de concurrencia: guarda fuera de transaccion y lectura-then-write de la matriz), REV-06/REV-10/REV-12 (mensajes crudos, cobertura del JWT y reintentos de `update()`), REV-09/REV-11 (sugerencias). REV-03/REV-07 (deriva documental) **corregidos el 2026-10-19**.

Bloqueo resuelto en el ciclo: el E2E ajeno `club-beasts-web/tests/e2e/cambio-pin-obligatorio.spec.ts` (selector ambiguo + carrera real de persistencia de `debeCambiarPin`) quedo **corregido como fix suelto autorizado** por el Producto y commiteado en `f2968c5`; no aporta puntos a ningun incremento.

Ultima actualizacion de gestion: 2026-10-14 â€” **cierre de `INC-03-vencimiento-recepcion-portal` (ACEPTADO, revision `code-reviewer` sin hallazgos bloqueantes)**: +11 puntos certificados (HU-16 4/4 = 1 con el efecto vencido cobrado una sola vez; bloque 4 10/10 con reparto INC03-R05: HU-25 3 + HU-29 3 + HU-30 3 + HU-31 1). **Total: 41 de 100 puntos certificados (41%)**. Evidencia: API 471/471, Gherkin 126/126 x2 (guard 63->126), web 174/174, build PASS, E2E 47/47 x2, migraciones 8/0 sin drift, en `docs/incrementos/INC-03-vencimiento-recepcion-portal/evidencia.md`; trazabilidad en seccion 9 de `docs/producto/auditoria-puntos-inc00.md`. Decisiones del ciclo: DEC-026..DEC-033 + CONF-01..06 (registradas 2026-10-10); sin decisiones nuevas el dia del cierre.

Actualizacion 2026-10-10 (sin cambio de puntos; sigue **30 de 100 certificados**):

- **INC-03 en LISTO**: puerta de entrada cerrada el 2026-10-10. `INC03-PEND-01..08` resueltas
  por Producto (DEC-026..033: login intacto + denegacion en portal/ingreso, acceso al
  servicio vigente, alertas derivadas de estado, sin `Cliente.foto`, 403 a SUSPENDIDO/
  RETIRADO, sede default del recepcionista, campo `perfilPendiente`, limpieza al tener
  email). Contrato API ratificado por `backend-developer` (2026-10-10) y `CONF-01..06` +
  regla de no-duplicado (efecto vencimiento -> HU-16) registradas. RED y migracion
  `Ingreso` en ejecucion; sin puntos nuevos hasta evidencia + revision.
- Riesgos cerrados del INC-03: INC03-R01 (DEC-026 opcion B), INC03-R03 (DEC-028 opcion a),
  INC03-R05 (reparto asignado).

Actualizacion 2026-10-09 (sin cambio de puntos; sigue **30 de 100 certificados**):

- **INC-03 abierto**: `docs/incrementos/INC-03-vencimiento-recepcion-portal/` creado, estado **BLOQUEADO** con spec de 40 criterios (33 desbloqueados, 7 bloqueados) y contrato API. Falta resolver `INC03-PEND-01..08` (registradas en `decisiones.md`) y ratificar el contrato (`backend-developer`) para pasar a `LISTO`.
- **R-10 cerrado**: flake de `clientes.spec.ts` **reproducido a proposito** (RED: `--repeat-each=6` dio 5/6 fallos con los dos sintomas documentados) y corregido con guard + `expect.poll` determinista; 0 fallos en 50 ejecuciones post-fix. Verificacion global 2026-10-09 abajo.
- **INC02-R05 cerrado**: `role="alert"` en el mensaje de error de `CongelacionForm.tsx` con test RED; suite web sube de 147 a 148.
- Repo puesto en orden git: 3 commits (ignores, agentes, producto INC-00/01/02); antes todo el trabajo vivia solo en el worktree.

Esta medicion distingue tres estados:

- **Implementado:** existe codigo o pantalla.
- **Verificado:** hay pruebas/evidencia ejecutada para el comportamiento.
- **Aceptado:** cumple criterios, pruebas y revision sin hallazgos bloqueantes.

## Resumen ejecutivo

| Area | Implementado | Verificado | Aceptado |
|---|---|---|---|
| INC-00 - Estabilizacion fases 1 y 2 | Completo | Completo | **ACEPTADO (2026-10-06): 29/29 criterios, revision final sin bloqueantes** |
| INC-01 - Cierre de gaps G1-G4 (bloques 1-2) | Completo | Completo | **ACEPTADO (2026-10-07): 5/5 criterios, revision sin bloqueantes** |
| INC-02 - Congelacion de vigencias (HU-15 + HU-12 b2) | Completo | Completo | **ACEPTADO (2026-10-08): revision sin bloqueantes, +3.5 puntos** |
| INC-03 - Vencimiento, recepcion y portal (HU-16 + bloque 4) | Completo | Completo | **ACEPTADO (2026-10-14): 40/40 criterios, revision sin bloqueantes, +11 puntos** |
| INC-04 - Estados del cliente (HU-08 + HU-17) | Completo | Completo | **ACEPTADO (2026-10-19): 14/14 criterios (12 puntuable + 2 REF), revision sin bloqueantes, +2 puntos** |
| INC-05 - Vigencias personalizado/nutricion (HU-13 + HU-14) | Completo | Completo | **ACEPTADO (2026-10-28): 8/8 criterios puntuables verificados (2 EXCLUIDO por alcance DEC-018/019), revision ACEPTA CON HALLAZGOS NO BLOQUEANTES, +6 puntos** |
| INC-06 - Acceso sin membresia activa (DEC-048) | Completo | Completo | **ACEPTADO (2026-10-29): 7/7 criterios, revision ACEPTA CON HALLAZGOS NO BLOQUEANTES, 0 puntos (mejora de regla)** |
| INC-07 - Navegacion login/cambio PIN (DEC-049) | Completo | Completo | **ACEPTADO (2026-10-29): 6/6 criterios, revision ACEPTA CON HALLAZGOS NO BLOQUEANTES, 0 puntos (WORKFLOW-NAV)** |
| INC-08 - Logout /recepcion + motivo solo en cambio (DEC-053/054) | Completo | Completo | **ACEPTADO (2026-10-30): 10/10 criterios (6 NAV + 4 ED), revision ACEPTA CON HALLAZGOS NO BLOQUEANTES, 0 puntos (no-duplicado)** |
| INC-09 - Anamnesis deportiva (DEC-052/055/056a/057/058/060) | Completo | Completo | **ACEPTADO (2026-11-05): AN-01..AN-33 + NAV-AN-01..09, revision ACEPTA CON HALLAZGOS NO BLOQUEANTES (7/7 CONFORME), +12 puntos (bloque 5 completo)** |
| Fase 1 - Auth + clientes | Completo | Completo | Cerrado dentro de INC-00 (SEC-01..04, AUTH-01..07, CLI-01..05, QA-01..06) |
| Fase 2 - Sesion + membresia gym | Completo | Completo | Cerrado dentro de INC-00 (MEM-01..07) |
| MVP global | Parcial | Parcial | **49 de 100 puntos certificados (49%)** |

Nota sobre el porcentaje: INC-00, INC-01, INC-02 e INC-03 tienen **peso 0 como incrementos** en `docs/producto/mvp.md`; los puntos salen de la auditoria `docs/producto/auditoria-puntos-inc00.md` (26.5 base, secciones 1-6), su ampliacion seccion 7 (2026-10-07, INC-01: +3), la **seccion 8** (2026-10-08, INC-02: +3.5), la **seccion 9** (2026-10-14, INC-03: +11 con reparto INC03-R05) y la **seccion 10** (2026-10-19, INC-04: +2 con HU-08 4/4 y HU-17 3/3), que mapea HU <-> criterios <-> evidencia ejecutada (INC-00/01: API 252/252, web 118/118, Gherkin 63/63, E2E 25/25; INC-02: API 379/379, web 147/147, Gherkin 63/63, E2E 30/30; INC-03: API 471/471, web 174/174, Gherkin 126/126, E2E 47/47; INC-04: API 536/536, web 183/183, Gherkin 153/153, E2E 56/56) y reparte por fraccion los bullets de cada HU cerrados con especificacion, implementacion, prueba, evidencia y revision. La matriz de `docs/producto/mvp.md` quedo actualizada con el mismo desglose.

## Evidencia de verificacion INC-03 (2026-10-13/14)

## Evidencia de verificacion INC-03 (2026-10-13/14)

RED registrado 2026-10-13 (5 archivos API 86 rojos + 4 web 26 rojos + 63 escenarios Gherkin en rojo, base intacta). GREEN + verificacion final 2026-10-14:

| Comando | Resultado |
|---|---|
| `club-beasts-api`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-api`: `npx vitest run` | 26 archivos, **471/471** (base 379 + 92 nuevos) |
| `club-beasts-api`: `npm run test:gherkin` | **126/126**, exit 0, **x2 corridas** (guard actualizado 63->126) |
| `club-beasts-api`: `npx prisma migrate status` | 8 migraciones, 0 pendientes (incl. `20261013220244_add_ingresos_y_perfil_pendiente`, `20261013224545_add_user_sede`); sin drift |
| `club-beasts-web`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-web`: `npx vitest run` | 20 archivos, **174/174** (base 148 + 26 nuevos) |
| `club-beasts-web`: `npm run build` | PASS |
| `club-beasts-web`: `npx playwright test` | **47/47** (base 30 + 17 nuevos: recepcion 5, creacion-rapida 4, acceso-vencimiento 3, portal +5), **x2 corridas** |
| Revision `code-reviewer` | **ACEPTA, 0 bloqueantes**, REV-01..REV-05 (1 MEDIO, 3 BAJO, 1 SUGGERIMENTO) |

Detalle del ciclo RED/GREEN, gaps cerrados (GAP-RED-01..04) y dictamen: `docs/incrementos/INC-03-vencimiento-recepcion-portal/evidencia.md`.

## Evidencia de verificacion (2026-10-06, reproducida por revision)

| Comando | Resultado |
|---|---|
| `club-beasts-api`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-api`: `npx vitest run` | 16 archivos, **245/245** |
| `club-beasts-api`: `npm run test:gherkin` | **63/63**, exit 0 (guard anti-skip: exit 1 con alcance incompleto) |
| `club-beasts-api`: `npx prisma migrate status` | 5 migraciones, 0 pendientes; `migrate diff` sin drift |
| `club-beasts-web`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-web`: `npx vitest run` | 14 archivos, **118/118** |
| `club-beasts-web`: `npm run build` | PASS |
| `club-beasts-web`: `npx playwright test` | **22/22** (incluye E2E real de membresia y de expiracion de sesion) |

Detalle y ciclo RED/GREEN: `docs/incrementos/INC-00-estabilizacion-fases-1-2/evidencia.md`.

## Evidencia de verificacion INC-01 (2026-10-07)

| Comando | Resultado |
|---|---|
| `club-beasts-api`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-api`: `npx vitest run` | 17 archivos, **252/252** (base 245 + 7 nuevos de trazabilidad/ficha) |
| `club-beasts-api`: `npm run test:gherkin` | **63/63**, exit 0 (step C18 renombrado a lo que aserta) |
| `club-beasts-web`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-web`: `npx vitest run` | 14 archivos, **118/118** |
| `club-beasts-web`: `npm run build` | PASS |
| `club-beasts-web`: `npx playwright test` | **25/25** (corrida final; 22 base + 3 de `acceso-roles.spec.ts`) |
| Revision `code-reviewer` | **5/5 ACEPTA, 0 bloqueantes**, NB-01..NB-05 |

RED registrado: 3 tests fallando antes del GREEN (`expected undefined to be '<actorId>'` y `membresias` inexistente). Detalle: `docs/incrementos/INC-01-cierre-gaps-bloque-1-2/evidencia.md`.

Nota de estabilidad (R-09): la primera ejecucion de `npx vitest run` (web) del 2026-10-06 a las 22:01, corriendo en paralelo con la bateria de la API, fallo 1 de 118 tests sin que se capturara el nombre. Las 18 corridas siguientes (6 seguidas, 1 con carga paralela reproducida, 8 con `--reporter=json` y 3 bajo carga API vitest + tsc + gherkin) dieron **118/118**. No se dio por cerrado: queda el riesgo R-09 para QA.

## Evidencia de verificacion (2026-10-09, backlog R-10 + INC02-R05)

Ejecutada por el orquestador tras los cambios de test y a11y; sin cambios de logica de negocio.

| Comando | Resultado |
|---|---|
| `club-beasts-api`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-api`: `npx vitest run` | 21 archivos, **379/379** (base INC-02 intacta) |
| `club-beasts-api`: `npm run test:gherkin` | **63/63**, exit 0 |
| `club-beasts-web`: `npx tsc --noEmit` | 0 errores |
| `club-beasts-web`: `npx vitest run` | 16 archivos, **148/148** (147 base + 1 test a11y de INC02-R05) |
| `club-beasts-web`: `npm run build` | PASS |
| `club-beasts-web`: `npx playwright test` | **30/30** (1.9 min, exit 0) |

Ciclo RED/GREEN de R-10 (test-engineer): 3 corridas base 8/8 sin reproducir; RED forzada `npx playwright test tests/e2e/clientes.spec.ts:147 --repeat-each=6` -> **5 FAILED / 1 PASSED** (tabla vacia en pagina 2 y cedulas repetidas entre paginas); guard `toHaveCount(0)` solo -> 2/6 fallos (insuficiente); guard + `expect.poll` de contenido distinto a pagina 1 -> **0 fallos en 50 ejecuciones** (3x `--repeat-each=6` + 4 corridas del spec completo). Unico archivo tocado: `club-beasts-web/tests/e2e/clientes.spec.ts`.

Ciclo RED/GREEN de INC02-R05 (frontend-developer): test `el mensaje de error expone role='alert'` falla (`Unable to find role="alert"`) -> `role="alert"` anadido en `CongelacionForm.tsx:249` -> `npx vitest run tests/unit/congelacion-ui.test.tsx` **15/15**.

## Hallazgos que bloqueaban la aceptacion de fases 1 y 2

| ID | Hallazgo | Impacto | Estado (2026-10-06) |
|---|---|---|---|
| GAP-001 | Cliente autenticado podia consultar ficha ajena | Privacidad | **Cerrado** (SEC-01/02/03 aceptados) |
| GAP-002 | Reset de PIN sin trazabilidad de actor | Trazabilidad | **Cerrado** (SEC-04 aceptado: `pinResetPorId`/`pinResetAt` atomicos + prueba funcional) |
| GAP-003 | UI de clientes sin sede, paginacion ni limpieza de opcionales | Criterios CLI-02/03/05 | **Cerrado** (CLI-02/03/05 aceptados) |
| GAP-004 | Recuperacion de sesion no centralizada en el cliente HTTP | Seguridad y UX | **Cerrado** |
| GAP-005 | 401 concurrente o tardio fuera del contrato de fase 2 | Robustez de sesion | **Cerrado** (compuerta de trafico de sesion + cierre confirmado) |
| GAP-006 | Membresias con riesgo de concurrencia en solapamiento | Integridad de datos | **ABIERTO (R-01)**: SQLite no reproduce check-then-insert concurrente; falta constraint en Postgres |
| GAP-007 | PATCH de membresias permitia fecha vacia | Validacion | **Cerrado** (MEM-07 aceptado) |
| GAP-008 | Preset de 30 dias creaba 31 dias | Regla de negocio | **Cerrado** (MEM-06 aceptado: `fin = inicio + N - 1` + E2E) |
| GAP-009 | Sin E2E real de membresias ni de recuperacion de sesion | Evidencia | **Cerrado** (2 specs nuevos; el de sesion expuso y luego se corrigio un bug de cookie re-emitida) |
| GAP-010 | Tests con aserciones vacias o filtros sin datos | Confiabilidad | **Cerrado** (QA-01..QA-05 aceptados) |
| GAP-011 | Gherkin sin conectar como ATDD real | Proceso | **Cerrado** (QA-06 aceptado: 63/63 + guard) |
| GAP-012 | BD de pruebas sin aislar | Aislamiento | **Cerrado** |

## Riesgos residuales abiertos

| ID | Riesgo | Responsable |
|---|---|---|
| R-01 | Sin constraint de solapamiento a nivel de BD (GAP-006) | Backend + DBA |
| R-02 | Migraciones SQLite vs objetivo PostgreSQL | DevOps + DBA |
| R-03 | Determinismo de filtros/orden en Postgres | Backend |
| R-04 | Sin `setErrorHandler` global y un `parse` lanzado en `GET membresias` | Backend |
| R-06 | Sin ESLint/Prettier ni hooks git instalados | DevOps |
| R-07 | Compuerta de sesion con garantia mejor-esfuerza (timeouts 3 s / 10 s) | Frontend |
| R-08 | Sedes hardcodeadas en UI y secretos locales de E2E | Producto + Frontend |
| R-10 | Fallo flaky preexistente en `club-beasts-web/tests/e2e/clientes.spec.ts:147` (INC00-CLI-05) | test-engineer | **Cerrado (2026-10-09)**: reproducido a proposito (RED 5/6 con `--repeat-each=6`) y corregido con guard + `expect.poll` determinista; 0 fallos en 50 ejecuciones; ver evidencia arriba |
| R-11 | NB-02 de INC-01: el CLIENTE en su propia ficha ve `creadoPorId`/`actualizadoPorId` (ids de staff, sin nombre/email/hash). Contrato fijado en el spec de INC-01 y aceptado en revision; si Producto no lo quiere, excluirlos de la respuesta cuando el rol sea CLIENTE | Producto + Backend |
| INC02-R04 | Revision INC-02 (BAJO): sin escenario E2E para `PATCH .../congelacion` (editar pausa); cubierto con 35/35 integracion + 14 unit de UI. No exigido por el criterio (unit+integracion) | test-engineer (si Producto exige UI) |
| INC02-R05 | Revision INC-02 (BAJO, a11y): el mensaje de error de `CongelacionForm.tsx` no tiene `role="alert"` | frontend-developer | **Cerrado (2026-10-09)**: test RED + `role="alert"` en la linea 249; `congelacion-ui.test.tsx` 15/15 |
| R-09 | Un fallo intermitente sin capturar: la primera ejecucion de `npx vitest run` (web) del 2026-10-06 a las 22:01, bajo carga paralela (API vitest + tsc + gherkin), fallo 1 de 118 tests; no se registro el nombre. Las 18 corridas siguientes (incluida la reproduccion con carga paralela) dieron 118/118 | QA debe capturar con `--reporter=json` en CI antes de dar por cerrada la estabilidad de la suite |
| D2 | `features.test.ts` heredado duplica escenarios Gherkin | QA + Orquestador |
| REV-01 | Revision INC-03 (MEDIO): rama "DUENO sin sede -> 400 sedeId es requerido" (`recepcion.ts`) sin integration test propio | test-engineer |
| REV-02 | Revision INC-03 (BAJO): divergencia de fixtures â€” vitest siembra sede al DUENO; seed real/E2E solo al recepcionista | DBA + QA |
| REV-03 | Revision INC-03 (BAJO): `api.portal.resumen()` sin generico -> cast doble en `portal/page.tsx` | frontend-developer |
| REV-04 | Revision INC-03 (BAJO): titulo de test dice SUSPENDIDO pero la fixture usa RETIRADO (`recepcion-consulta.test.ts`) | test-engineer |
| REV-05 | Revision INC-03 (SUGGERIMENTO): phrasing de comentario en `acceso-vencimiento.spec.ts` | test-engineer |
| `REV-01 (INC-04)` | Revision INC-04 (MEDIO, 2026-10-19): la UI de edicion staff envia `estado` en todo guardado, por lo que cualquier edicion de un campo suelto (p. ej. telefono) exige `motivo`; contrato de API intacto (**PEND-004**) | Producto + frontend | **Cerrado (2026-10-30, INC-08)**: DEC-054 â€” la UI envia `estado` solo cuando cambia; edicion de campo suelto guarda 200 sin motivo; evidencia `docs/incrementos/INC-08-logout-recepcion-motivo-edicion/evidencia.md` |
| REV-02/REV-08 (INC-04) | El 400 de `motivo` vive en la ruta (no en Zod) y el servicio usa `motivo!`/`actorId!` (un llamador futuro podria recibir 500); en no-op la respuesta eco del motivo viajero diverge del GET | backend |
| REV-04/REV-05 (INC-04) | Concurrencia: guarda `CLIENTE_INACTIVO` fuera de la `$transaction` (TOCTOU) y lectura-then-write de la matriz de transiciones sin lock optimista | backend + DBA |
| REV-06/REV-10/REV-12 (INC-04) | Mensaje crudo en login para errores no-CredentialsSignin; ningun test aserta que el JWT/200 omitan `estado`; `update()` con reintentos fuera del `try` en el flujo de cambio de PIN | backend + frontend + QA |
| REV-09/REV-11 (INC-04, sugerencias) | `include: actor` innecesario en la ficha; ref `pinChangeInProgress` sin reset tras el exito (inerte hoy) | backend + frontend |

## Tabla de avance por bloque

| Bloque | Peso | Estado actual | Puntos aceptados |
|---|---:|---|---:|
| Identidad, sesiones y permisos | 10 | INC-00 + INC-01 aceptados. HU-01 4/4 (E2E `acceso-roles.spec.ts`), HU-02 4/4, HU-03 4/4 | **10** |
| Clientes, sedes, estados y ficha basica | 15 | INC-00 + INC-01 + INC-04 aceptados. HU-04 4/4 y HU-05 4/4 (trazabilidad asertada en respuesta y BD), HU-06 4/4, HU-07 3/6 (transversal; FIC-02 solo es base del bullet 4), HU-08 4/4 (INC-04), HU-17 3/3 (INC-04) | **14** |
| Vigencias de servicios y congelacion | 15 | INC-02 + INC-03 + INC-05 aceptados. HU-12 4/4, HU-15 4/4, HU-16 4/4 (vencimiento con efecto observable en portal/recepcion/acceso; efecto cobrado una sola vez), HU-13 3/3 e HU-14 3/3 (INC-05, 2026-10-28; b4 asignaciones excluida sin puntos) | **15** |
| Recepcion, ingresos y portal operativo | 10 | INC-03 aceptado (2026-10-14): HU-25 4/4, HU-29 5/5, HU-30 4/4, HU-31 3/3 (reparto INC03-R05: 3+3+3+1) | **10** |
| Anamnesis y privacidad | 12 | INC-09 aceptado (2026-11-05): HU-09 4/4 (registro 23 campos, trazabilidad), HU-10 4/4 (permisos por rol, 5 sensibles DEC-055 filtrados en API), HU-11 3/3 (guardado parcial, PENDIENTE/COMPLETA), HU-28 3/3 (portal solo lectura, DEC-060) | **12** |
| Rutinas, asignacion e historial | 18 | Pendiente | 0 |
| Nutricion, asignacion e historial | 12 | Pendiente | 0 |
| Historial, reportes y notificaciones | 8 | Pendiente | 0 |
| **Total aceptado certificado** | **100** | Auditoria `docs/producto/auditoria-puntos-inc00.md` + ampliaciones INC-01 (seccion 7), INC-02 (seccion 8), INC-03 (seccion 9), INC-04 (seccion 10), INC-05 (seccion 11) e INC-09 (seccion 12) | **61** |

## Siguiente accion concreta

Actualizacion 2026-11-05: **`INC-09` ACEPTADO (+12 puntos: 49 -> 61 de 100, 61%) â€” CORTE OBJETIVO DEL 50% SUPERADO**. La operacion diaria completa (bloques 1-5) esta certificada de punta a punta: identidad/roles, clientes/estados/ficha, vigencias/congelacion, recepcion/portal y anamnesis con privacidad. Siguiente horizonte natural (bloques 6-8, 38 puntos restantes + resto de HU-07):
1. **Bloque 6 â€” Rutinas, asignacion e historial (18 puntos, HU-18/19/20/21/26)**: estructura macro-meso-micro ya fijada por DEC-018; desbloquea tambien los bullets b4 de HU-13 (asignacion de rutina personalizada).
2. **Bloque 7 â€” Nutricion (12 puntos, HU-22/23/24/27)**: plantilla simple DEC-019; desbloquea b4 de HU-14.
3. **Bloque 8 â€” Historial/reportes/notificaciones (8 puntos, HU-32/33/34)** y cierre de HU-07 (vista unificada de ficha).

Backlog derivado (sin puntos, endurecimiento): H-REV-04 (validar elementos al deserializar multi-selects), H-REV-05 (carrera PATCH read-modify-write; escritor unico DEC-058 la limita), H-REV-07 (paridad espejo con no-strings), H-REV-08 (`aria-modal` vs foco sin trap en alertdialog â€” decision de accesibilidad), W2/H-07 (`portal.spec.ts:56`), H-06 (foco INC-07), S1/S2, R1 del review INC-08 (`loadCliente()` sin await), R3 (worker-crash Windows), R-01..R-04/R-06..R-09 globales. Decision de Producto pendiente: **ninguna bloqueante** (PEND-003 resuelta por DEC-052+Anexo; PEND-004/005 resueltas DEC-054/053; DEC-061 fija el limite AN-26).

Decisiones de Producto pendientes: **PEND-003** (resuelta en alcance por **DEC-052**, 2026-10-30: formulario completo; **a la espera del formulario real del usuario** â€” bloquea el incremento de anamnesis y el corte al 50%). Resueltas el 2026-10-30: **PEND-004 -> DEC-054** y **PEND-005 -> DEC-053** (ejecutadas en INC-08, ACEPTADO). Resueltas el 2026-10-29: `INC06-PEND-01..04` -> DEC-051 e `INC07-PEND-01` -> DEC-050.

Backlogs de revision abiertos: INC-04 REV-01..REV-12 (arriba; REV-03/REV-07 corregidos el 2026-10-19) e INC-03 REV-01..REV-05. Riesgos globales: R-01..R-04, R-06..R-09, R-11, INC02-R04, D2.

Actualizacion 2026-10-08 (cierre): **`INC-02-congelacion-hu-15` ACEPTADO** con el pipeline completo (RED 121/127, migracion `20261008184627`, GREEN API 379/379 + web 147/147, E2E 5/5 y bateria 30/30 x2, revision `code-reviewer` sin hallazgos bloqueantes). **+3.5 puntos certificados: 26.5 -> 30 de 100 (30%)**. Decisiones del ciclo: DEC-022 (reglas de rango), DEC-023 (GYM + PERSONALIZADO; NUTRICION fuera, riesgo HU-14 en INC-05), DEC-024 (descongelar/editar, 0 puntos), DEC-025 (sin bloqueo de acceso). Siguiente incremento natural: **`INC-03`** (HU-16 + bloque 4, +11).

Gaps priorizados que desbloquean mas puntos (detalle en `auditoria-puntos-inc00.md`):

| # | Gap | Puntos que desbloquea | Responsable | Estado |
|---:|---|---:|---|---|
| G1 | Sin test del guard de rol en UI | +1 (HU-01) | QA + Frontend | **Cerrado (INC-01, 2026-10-07)** |
| G2 | Trazabilidad de cliente escrita pero sin asertar | +2 (HU-04, HU-05) | Backend + QA | **Cerrado (INC-01, 2026-10-07)** |
| G3 | Step Gherkin enganoso de HU-07 | Higiene | QA + Analista | **Cerrado (INC-01, 2026-10-07)** |
| G4 | Ficha sin relacion `membresias` | Base de HU-07/bloques 3 y 5-7 | Backend | **Parcial (INC-01): `membresias` GYM expuesta y probada; faltan personalizado/nutricion, notas e historial** |
| G5 | Sin estado `CONGELADO` / HU-15 | +3.5 | Backend + DBA + Frontend | **Cerrado (INC-02, 2026-10-08)**: estado `CONGELADO`, congelar/descongelar/editar, UI y E2E; revision sin bloqueantes; +3.5 certificados |
| G6..G9 | HU-13/HU-14/HU-16/HU-08/HU-17 | +9 | Producto + Backend + Frontend | **G6, G7, G8 y G9 CERRADOS** (INC-03 2026-10-14: HU-16 4/4; INC-04 2026-10-19: HU-08 4/4 y HU-17 3/3; **INC-05 2026-10-28: HU-13 3/3 y HU-14 3/3**). Criterios G14 escritos, DEC-018/019/020/023 resueltas |

Ruta al corte del 50% fijada el 2026-10-08 y actualizada con el cierre de INC-05 (49 + 1 = 50; proyeccion, no avance aceptado):

| INC | Alcance | Puntos | Bloqueado por |
|---|---|---:|---|
| INC-02 | G5 congelacion (HU-15 + HU-12 b2) | +3.5 | **ACEPTADO (2026-10-08)** â€” cerrado |
| INC-03 | HU-16 (G7) + bloque 4 completo (HU-25/29/30/31) | +11 | **ACEPTADO (2026-10-14)** â€” cerrado |
| INC-04 | HU-08 + HU-17 | +2 | **ACEPTADO (2026-10-19)** â€” cerrado |
| INC-05 | HU-13 + HU-14 | +6 | **ACEPTADO (2026-10-28)** â€” cerrado |
| Incremento de anamnesis (bloque 5) | HU-07 b4 + punto minimo al corte | +1 (minimo) | Requiere resolver **PEND-003** (campos) al especificar, segun DEC-021 |

Nota DEC-021: HU-07 no se cierra con anamnesis minima; con INC-05 certificado el total va en **49**, y el punto restante al 50% se busca en el incremento de anamnesis (bloque 5), donde antes hay que resolver los campos de PEND-003.

Decisiones de producto pendientes: **PEND-003** (campos de anamnesis; ruta decidida en DEC-021, se resuelve al especificar el incremento de bloque 5), **PEND-004** (no bloqueante, REV-01). Resueltas 2026-10-29: **INC06-PEND-01..04 -> DEC-051** e **INC07-PEND-01 -> DEC-050**. Detalle en "Siguiente accion concreta".
