# INC-04 - Evidencia

Estado del incremento: **LISTO** (cabecera sincronizada 2026-10-19). La puerta de
entrada se cumplio el 2026-10-14 (`INC04-PEND-01..08` -> DEC-034..041, contrato
ratificado por `backend-developer`, `INC04-CONF-01..07` + regla de no-duplicado
registrados por el orquestador en `decisiones.md`), pero esta cabecera quedo
desincronizada al PLANTILLA. RED y GREEN **todavia sin ejecutar**: **ningun punto se
certifica hasta que las secciones 1-5 esten medidas y la seccion 6 no tenga
bloqueantes.**

Regla de cuenta (DEC-011/DEC-016): **sin evidencia de ejecucion no se certifica ningun
punto** ni se marca ningun criterio como verificado. **Base que permanece intacta al
cerrar** (medida en el cierre de INC-03, `docs/incrementos/INC-03-vencimiento-recepcion-portal/evidencia.md`):
API **471/471**, Gherkin **126/126**, web **174/174**, Playwright **47/47**, migraciones
**9/0 sin drift** (la 9ª, `20261014213742_add_cliente_estado_cambio`, ya aplicada y verificada por `database-admin` el 2026-10-19; ver 1.1). Ninguna base puede perder tests; los totales finales son la base mas
los tests nuevos.

## 1. Comandos de verificacion

| # | Fase | Directorio | Comando | Esperado | Resultado | Fecha |
|---:|---|---|---|---|---|---|
| 1 | GREEN | `club-beasts-api` | `npx tsc --noEmit` | exit 0, 0 errores | Sin ejecutar | - |
| 2 | GREEN | `club-beasts-api` | `npx vitest run` | base 471/471 intacta + tests nuevos en verde | Sin ejecutar | - |
| 3 | GREEN | `club-beasts-api` | `npm run test:gherkin` | base 126/126 + escenarios nuevos (guard actualizado en GREEN) | Sin ejecutar | - |
| 4 | Modelo | `club-beasts-api` | `npx prisma migrate status` | 0 pendientes, sin drift (base 8 migraciones) | Sin ejecutar | - |
| 5 | GREEN | `club-beasts-web` | `npx tsc --noEmit` | exit 0, 0 errores | Sin ejecutar | - |
| 6 | GREEN | `club-beasts-web` | `npx vitest run` | base 174/174 intacta + tests nuevos en verde | Sin ejecutar | - |
| 7 | Build | `club-beasts-web` | `npm run build` | PASS | Sin ejecutar | - |
| 8 | E2E | `club-beasts-web` | `npx playwright test --reporter=line` **x2 corridas consecutivas** | base 47/47 + nuevos, verde en ambas corridas | Sin ejecutar | - |
| 9 | Revision | - | revision `code-reviewer` | sin hallazgos bloqueantes | Sin ejecutar | - |

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

## 1.1 Verificacion de modelo previa al RED (2026-10-19, `database-admin`)

Ejecutada sobre los cambios Prisma ya presentes en el worktree (tarea #17, completada):

| Comando | Resultado |
|---|---|
| `npx prisma validate` | schema valido, exit 0 |
| `npx prisma migrate status` | **9 migraciones, 0 pendientes**, "Database schema is up to date!" |
| `npx prisma migrate diff` (migrations -> dev.db y schema -> dev.db) | ambos "empty migration" = **drift 0** |
| `npx prisma generate` | Prisma Client v6.19.3 regenerado |
| `npx tsx prisma/seed.ts` | OK (upserts idempotentes; sin riesgo FK RESTRICT) |
| `npx vitest run` | **471/471** intacta |

`migration.sql` = `schema.prisma` a nivel byte (CREATE TABLE + CREATE INDEX; portable
SQLite/PostgreSQL, DEC-012; FK RESTRICT/CASCADE como `Ingreso`/`MembresiaGymCambio`).
Modelo `ClienteEstadoCambio` conforme a DEC-036 (`motivo` NOT NULL = DEC-035;
`actorId` ratificado en el spec, incompatibilidad #15). La migracion **ya esta aplicada**
en `dev.db` (2026-10-14). Residual asignado al RED: `features/support/world.ts` debe
borrar `ClienteEstadoCambio` antes de `cliente.deleteMany` (FK RESTRICT); hoy inocuo
porque ningun step Gherkin escribe historial.

## 2. Evidencia por criterio (plantilla)

| Criterio | Evidencia minima requerida (spec INC-04) | Estado RED | Estado GREEN |
|---|---|---|---|
| `INC04-CLI-01` | REF: evidencia ya aceptada de HU-05/HU-06 (`clientes.test.ts:435`, `clientes.feature` C13); sin pruebas nuevas | n/a | n/a |
| `INC04-CLI-02` | Integracion: ficha 200 integra tras inactivar + busqueda por cedula + count de historial N -> N+1 + `DELETE /clientes/:id` 404; Gherkin | Sin registrar | Sin registrar |
| `INC04-CLI-03` | Integracion: 200 con `motivo` + `actualizadoPorId` + `ultimoCambio` asertados en respuesta **y** BD (misma transaccion); 400 x3 mensajes; 404; 403 `CLIENTE`; unit web del payload | Sin registrar | Sin registrar |
| `INC04-CLI-04` | Integracion: 401 `AUTH_CLIENTE_INACTIVO` sin token; PIN mal -> `AUTH_INVALID_CREDENTIALS`; ACTIVO -> 200 (regresion HU-02); unit web del mensaje; **E2E** de login bloqueado; Gherkin | Sin registrar | Sin registrar |
| `INC04-CLI-05` | Integracion: 409 `CLIENTE_INACTIVO` sin fila creada (count sin cambio); 201 regresion; 404; Gherkin | Sin registrar | Sin registrar |
| `INC04-CLI-06` | Integracion segun `PEND-07` (opcion (b): sin cambio; opcion (a): `GET /portal/resumen` -> 403 con sesion previa) | Sin registrar | Sin registrar |
| `INC04-CLI-07` | Integracion: 403 `INGRESO_NO_PERMITIDO` con `INACTIVO` + membresia activa, sin fila; regresion de `INC03-ING-10` (`SUSPENDIDO`/`RETIRADO`); Gherkin | Sin registrar | Sin registrar |
| `INC04-CLI-08` | Integracion: `DUENO` y `RECEPCIONISTA` reactivan -> 200 + historial; `CLIENTE` -> 403; sin motivo -> 400; login vuelve 200; membresia-gym vuelve 201; Gherkin | Sin registrar | Sin registrar |
| `INC04-EST-01` | REF: evidencia ya aceptada de HU-05/HU-06; sin pruebas nuevas | n/a | n/a |
| `INC04-EST-02` | Integracion: `A -> B` con motivo persiste fila de historial con actor y fecha en la misma transaccion; Gherkin | Sin registrar | Sin registrar |
| `INC04-EST-03` | Integracion: 400 `Motivo es requerido cuando cambia el estado` y estado sin cambio; unit web del error en formulario; Gherkin | Sin registrar | Sin registrar |
| `INC04-EST-04` | Integracion: 3 cambios -> 3 registros ordenados (mas reciente primero) + datos base intactos + busqueda/filtro operativos + `DELETE` 404; Gherkin | Sin registrar | Sin registrar |
| `INC04-EST-05` | Integracion: matriz aprobada (200 permitidas, 409 `TRANSICION_INVALIDA` sin cambio, no-op 200 sin registro nuevo); Gherkin | Sin registrar | Sin registrar |
| `INC04-EST-06` | Unit web: formulario envia `{ estado, motivo }`; muestra el 400 con `role="alert"`; **E2E**: cambio de estado con motivo en navegador | Sin registrar | Sin registrar |
| **Todos** | `tsc` API y web 0/0, `vitest` API y web sobre la base intacta, `build`, `migrate status`, revision `code-reviewer` | Sin ejecutar | Sin ejecutar |

## 3. RED (pendiente; registrar al ejecutarlo)

Exigencias del RED (patron INC-03): conteo granular por archivo; base **471/471**,
**126/126** y **174/174** permanecen verdes; grep confirma que no existen los symbols
nuevos (`AUTH_CLIENTE_INACTIVO`, `CLIENTE_INACTIVO`, `TRANSICION_INVALIDA`,
`ClienteEstadoCambio`); **cero cambios en `src/`** durante el RED; cambios en tests
aceptados solo si `PEND-02` = (a) y documentados en `evidencia.md` y `decisiones.md`.

| Fecha | Archivo(s) nuevo(s) | Tests | Fallan | Pasan | Criterios | Notas |
|---|---|---:|---:|---:|---|---|
| Sin registrar | | | | | | |

### Gaps abiertos por el RED (para el GREEN)

| # | Gap | Responsable | Bloquea |
|---|---|---|---|
| Sin registrar | | | |

## 4. GREEN (pendiente; registrar al consolidarlo)

| Fecha | Archivo | Cambio | Criterios |
|---|---|---|---|
| Sin registrar | | | |

### 4.1 Cierre de los gaps abiertos por el RED

| # | Gap | Cierre | Fecha |
|---|---|---|---|
| Sin registrar | | | |

### 4.2 Actualizaciones controladas de tests aceptados (solo si `PEND-02` = (a))

Registrar aqui cada test aceptado actualizado (archivo:linea, porque, y que el cambio de
contrato esta aprobado en `decisiones.md`); ningun test puede quedar eliminado.

| Test aceptado | Motivo del cambio | Decision que lo ampara |
|---|---|---|
| Sin registrar | | |

## 5. Verificacion final y E2E (pendiente)

| Spec E2E | Tests | Escenarios | Criterios | Estado (corrida 1 / corrida 2) |
|---|---:|---|---|---|
| Sin registrar | | | | |

Notas exigidas: sin `isVisible()` condicional, sin `waitForTimeout`, sin `skip`/`only`,
sin aserciones vacias; fechas relativas a `hoyBogota()`; 2 corridas consecutivas sin
flaky; base 47/47 intacta.

## 6. Revision (tarea 21, pendiente)

**Fecha**: - · **Revisor**: `code-reviewer` · **Base**: HEAD al abrir RED · **Dictamen**: -

### 6.1 Resultado por area del checklist

| Area del checklist | Resultado | Verificacion del revisor |
|---|---|---|
| Seguridad / DEC-001 | - | permisos de PATCH/membresias/ingreso; `CLIENTE` 403; ficha self-only con `PEND-08` |
| Privacidad | - | `motivo`/`ultimoCambio` no expuestos al rol `CLIENTE`; sin fuga de datos en el historial |
| No duplicado (HU-05/HU-06/DEC-030/HU-16) | - | sin puntos re-cobrados; criterios REF sin pruebas nuevas presentadas como nuevas |
| Regresion INC-03 / HU-02 / HU-05 | - | DEC-030 intacta; HU-02 intacta; HU-05 actualizado **solo** si `PEND-02`=(a) documentado |
| Coherencia de decisiones | - | `PEND-01..08` reflejadas en codigo; `CONF-01..07` aplicadas |
| Calidad de pruebas | - | sin `.only`/`.skip`/aserciones vacias; mensajes exactos con tildes; steps Gherkin con aserciones reales |
| Compilacion / suites | - | re-ejecucion de la seccion 1 |

### 6.2 Hallazgos

| ID | Severidad | Archivo:linea | Descripcion | Recomendacion |
|---|---|---|---|---|
| Sin registrar | | | | |

### 6.3 Dictamen

-

## 7. Cierre (tarea 22, orquestador) — pendiente

Solo con revision sin bloqueantes y evidencia completa. Fraccion real: **+2 max.** (HU-08:
1 si cierra 4/4; HU-17: 1 si cierra 3/3; los bullets de estado/filtro ya cobrados en
HU-05/HU-06 no se re-cobran).

| Artefacto | Cambio esperado | Estado |
|---|---|---|
| `docs/producto/avance.md` | Puntos certificados de INC-04 | Sin registrar |
| `docs/producto/mvp.md` | HU-08 y HU-17 por fraccion | Sin registrar |
| `docs/producto/auditoria-puntos-inc00.md` | Nueva seccion de trazabilidad INC-04 (HU <-> criterios <-> evidencia) | Sin registrar |
| `docs/producto/decisiones.md` | `INC04-PEND-01..08` resueltas (DEC-034..) + `INC04-CONF-01..07` + no-duplicado | Sin registrar |
