# INC-03 - Evidencia

Estado del incremento: **BLOQUEADO — plantilla de evidencia, sin ejecutar** (2026-10-09).
Este archivo es la **plantilla requerida** de INC-03: todavia no hay RED ni GREEN, porque la
puerta LISTO esta bloqueada por `INC03-PEND-01..08` (ver `spec.md`, seccion "Decisiones
pendientes"). Cada fila se llena con fecha y salida resumida en el momento en que se ejecute.

Regla de cuenta (DEC-011/DEC-016): **sin evidencia de ejecucion no se certifica ningun punto**
ni se marca ningun criterio como verificado. Base actual que debe permanecer intacta al
cerrar: API `379/379`, web `147/147`, Gherkin `63/63`, Playwright `30/30`
(`docs/incrementos/INC-02-congelacion-hu-15/evidencia.md`).

## 1. Comandos de verificacion (todos sin ejecutar)

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | RED/GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0, 0 errores | **Sin ejecutar** | - |
| 2 | RED/GREEN | `club-beasts-api` | `npx vitest run` | base 379/379 sin regresiones + tests nuevos en verde al final del GREEN (RED: fallos granulares solo en archivos nuevos) | **Sin ejecutar** | - |
| 3 | RED/GREEN | `club-beasts-api` | `npm run test:gherkin` | exit 0; base 63/63 + escenarios nuevos de INC-03 (guard anti-skip activo) | **Sin ejecutar** | - |
| 4 | Modelo | `club-beasts-api` | `npx prisma migrate status` | migraciones aplicadas, **0 pendientes**, sin drift (`migrate diff`) | **Sin ejecutar** | - |
| 5 | RED/GREEN | `club-beasts-web` | `npx tsc --noEmit` | exit 0, 0 errores | **Sin ejecutar** | - |
| 6 | RED/GREEN | `club-beasts-web` | `npx vitest run` | base 147/147 sin regresiones + tests nuevos de portal/recepcion | **Sin ejecutar** | - |
| 7 | Build | `club-beasts-web` | `npm run build` | PASS (exit 0) | **Sin ejecutar** | - |
| 8 | E2E | `club-beasts-web` | `npx playwright test` | base 30/30 + E2E nuevos de portal y recepcion; sin `skip` ni `only` | **Sin ejecutar** | - |
| 8b | E2E dirigido | `club-beasts-web` | `npx playwright test <spec nuevos>` | 100% de los specs nuevos de INC-03 | **Sin ejecutar** | - |
| 9 | Revision | - | revision `code-reviewer` (seguridad/permisos, DEC-005/006/017/025, no duplicado, calidad de pruebas) | **sin hallazgos bloqueantes** | **Sin ejecutar** | - |

Comandos reproducibles (uno por verificacion):

```bash
# 1) Typecheck API
cd club-beasts-api && npx tsc --noEmit

# 2) Suite unit/integracion API (RED/GREEN)
cd club-beasts-api && npx vitest run

# 3) Gherkin (ATDD)
cd club-beasts-api && npm run test:gherkin

# 4) Migraciones
cd club-beasts-api && npx prisma migrate status

# 5) Typecheck web
cd club-beasts-web && npx tsc --noEmit

# 6) Unit/component tests web
cd club-beasts-web && npx vitest run

# 7) Build de produccion web
cd club-beasts-web && npm run build

# 8) E2E completo (API E2E SQLite aislado + Next)
cd club-beasts-web && npx playwright test
```

## 2. Evidencia por criterio (sin ejecutar)

| Criterio(s) | Evidencia minima requerida | Estado |
|---|---|---|
| `INC03-VEN-01`, `INC03-VEN-02` | Integracion API: bordes `fechaFin`/`fechaFin+1` en listado y ficha; Gherkin | Sin ejecutar |
| `INC03-VEN-03` | Integracion API (portal + recepcion) + **E2E** de las 3 superficies + Gherkin | Sin ejecutar |
| `INC03-VEN-04` | Integracion API + **E2E** del bloqueo con codigo propio (**hasta resolver `PEND-01`/`PEND-02`: no se escribe el RED**) | **Bloqueado** |
| `INC03-VEN-05` | Integracion: mismo estado en ficha, listado, portal y recepcion (mismo fixture) | Sin ejecutar |
| `INC03-POR-01..04`, `INC03-POR-06`, `INC03-POR-07` | Integracion API + unit web del portal + **E2E** + Gherkin | Sin ejecutar |
| `INC03-POR-05` | Integracion 401/403/200 + unit del guard + E2E de rol | Sin ejecutar |
| `INC03-REC-01`, `INC03-REC-03` | Integracion API + unit de la pantalla + **E2E** + Gherkin (`REC-01` hasta `PEND-04`) | Sin ejecutar / bloqueado parcial |
| `INC03-REC-02`, `INC03-REC-04`, `INC03-REC-06..10` | Integracion API + unit de la pantalla + **E2E** + Gherkin | Sin ejecutar |
| `INC03-REC-05` | Integracion + unit + E2E + Gherkin (**hasta `PEND-03`: no se escribe**) | **Bloqueado** |
| `INC03-ING-01..09`, `INC03-ING-11` | Integracion API (todas las ramas de la tabla de decision) + unit del boton + **E2E** + Gherkin | Sin ejecutar |
| `INC03-ING-10` | Integracion (**hasta `PEND-05`: no se escribe**) | **Bloqueado** |
| `INC03-RAP-01`, `INC03-RAP-02`, `INC03-RAP-04..07` | Integracion API + unit del formulario + **E2E** + Gherkin (`RAP-01` hasta `PEND-06`, `RAP-02` hasta `PEND-07`) | Sin ejecutar / bloqueado |
| `INC03-RAP-03` | Integracion de `PATCH /clientes/:id` + unit de la marca (**limpieza de la marca hasta `PEND-08`**) | Bloqueado parcial |
| Todos | `tsc` API y web, `vitest` API y web, `build`, `migrate status`, revision `code-reviewer` | Sin ejecutar |

## 3. RED (a registrar en la tarea 12/13/14)

| Fecha | Archivo(s) nuevo(s) | Tests | Fallan | Pasan | Criterios | Notas |
|---|---|---|---|---|---|---|
| - | `club-beasts-api/tests/integration/recepcion-*.test.ts` | - | - | - | `REC-*`, `ING-*`, `RAP-*` | Sin ejecutar |
| - | `club-beasts-api/tests/integration/portal.test.ts` | - | - | - | `POR-*`, `VEN-03/05` | Sin ejecutar |
| - | `club-beasts-api/tests/integration/vencimiento.test.ts` | - | - | - | `VEN-01..05` (`VEN-04` si `PEND-01/02` resueltas) | Sin ejecutar |
| - | `club-beasts-web/tests/unit/portal-*.test.tsx` y `recepcion-*.test.tsx` | - | - | - | `POR-*`, `REC-*`, `ING-*`, `RAP-*` | Sin ejecutar |
| - | `club-beasts-api/features/vencimiento.feature`, `portal.feature`, `recepcion.feature` | - | - | - | todos | Sin ejecutar |
| - | **Total RED** | - | - | - | - | Sin ejecutar |

Exigencias del RED: registrar el conteo de fallos granular, confirmar que la **base
379/379 permanece verde**, y verificar con grep que las rutas nuevas no existen todavia
(mismo patron de INC-02). Cero cambios en `src/` durante el RED.

## 4. GREEN (a registrar en las tareas 16/17/18)

| Fecha | Archivo | Cambio | Criterios |
|---|---|---|---|
| - | `club-beasts-api/prisma/schema.prisma` + migracion | entidad `Ingreso`, `perfilPendiente` (+ `foto` si `PEND-04`) | `ING-*`, `RAP-01/02` |
| - | `club-beasts-api/src/routes/recepcion.ts` (nuevo) | consulta, ingresos (POST+GET), clientes-rapidos | `REC-*`, `ING-*`, `RAP-*` |
| - | `club-beasts-api/src/routes/portal.ts` (nuevo) | `/portal/resumen` | `POR-*` |
| - | `club-beasts-api/src/services/*` | fuente unica de estado, guardas de vigencia, servicio de ingresos | `VEN-*` |
| - | `club-beasts-api/src/routes/auth.ts` + `auth.service.ts` | **solo si `PEND-01` lo exige** | `VEN-04` |
| - | `club-beasts-web/src/app/portal/page.tsx` | datos reales; elimina el `"Activo"` hardcodeado (linea 122) | `VEN-03`, `POR-*` |
| - | `club-beasts-web/src/app/recepcion/*` (nuevo) | consulta, ingreso, alta rapida | `REC-*`, `ING-*`, `RAP-*` |
| - | **Totales GREEN** | API, web, Gherkin, build | todos |

## 5. Verificacion final y E2E (tarea 19)

| Spec E2E | Escenario | Criterios | Estado |
|---|---|---|---|
| `portal.spec.ts` (nuevo o extendido) | Cliente con vigencia activa/vencida/sin vigencia ve su estado real, vencimiento y congelacion | `VEN-03`, `POR-01..07` | Sin ejecutar |
| `recepcion.spec.ts` (nuevo) | Recepcionista consulta por cedula, ve estado/vencimiento/ultimo ingreso y registra ingreso | `VEN-03`, `REC-*`, `ING-*` | Sin ejecutar |
| `recepcion-creacion-rapida.spec.ts` (nuevo) | Alta rapida con minimo de datos, marca de perfil pendiente y completitud | `RAP-01..07` | Sin ejecutar |
| `acceso-vencimiento.spec.ts` (nuevo) | Bloqueo de acceso observable con codigo propio | `VEN-04` | **Bloqueado (`PEND-01`/`PEND-02`)** |
| Suite completa | 30 base + specs nuevos, 2 corridas consecutivas | todos | Sin ejecutar |

## 6. Revision (tarea 20)

| Fecha | Alcance | Revisor | Dictamen |
|---|---|---|---|
| - | Seguridad/autorizacion (DEC-001), reglas de fecha (DEC-005/006), DEC-017/025, no duplicado de puntos (regla 3), calidad de pruebas (sin aserciones vacias ni skips), alcance (fuera de alcance intacto) | `code-reviewer` | **Sin ejecutar** |

## 7. Cierre (tarea 21, orquestador)

| Artefacto | Cambio esperado | Estado |
|---|---|---|
| `docs/producto/avance.md` | +11 puntos **solo si** la revision no bloquea y hay evidencia completa | Sin ejecutar |
| `docs/producto/mvp.md` | Bloque 3 (HU-16) y bloque 4 (HU-25/29/30/31) actualizados por fraccion | Sin ejecutar |
| `docs/producto/auditoria-puntos-inc00.md` | Nueva seccion de trazabilidad INC-03 (HU <-> criterios <-> evidencia), incluido el reparto de no-duplicado HU-16 vs bloque 4 | Sin ejecutar |
| `docs/producto/decisiones.md` | `INC03-PEND-01..08` resueltos y `CONF-01..06` registrados | Sin ejecutar |
