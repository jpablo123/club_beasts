# INC-01 - Cierre de gaps G1-G4 (bloques 1 y 2)

## Estado

- Estado actual: **LISTO** (2026-10-07). Criterios observables, contrato API fijado, fixtures definidos.
- Padre: hueco dejado por `INC-00` (aceptado 2026-10-06) y por `docs/producto/auditoria-puntos-inc00.md` (seccion 4, G1-G4).
- Peso en `mvp.md`: 0 (como todo incremento de cierre); los puntos se certifican en la matriz solo con evidencia ejecutada y revision.

## Objetivo

Cerrar los gaps de evidencia y exposicion que hoy impiden sumar puntos ya implementados en los bloques 1 y 2, sin abrir alcance funcional nuevo.

## Alcance incluido

- G1: prueba E2E del guard de rol en UI (HU-01, bullet 3).
- G2: trazabilidad de cliente (`creadoPorId`/`actualizadoPorId`) asertada y expuesta por la API (HU-04 bullet 4, HU-05 bullet 3).
- G3: step Gherkin de la ficha renombrado a lo que realmente aserta (higiene de evidencia ATDD).
- G4: `GET /clientes/:id` incluye la relacion `membresias` (base del bullet 4 de HU-07).

## Fuera de alcance

- Vigencias de personalizado y nutricion, rutina, plan, anamnesis, notas e historial (HU-07 bullets 4-6 completos; bloques 3 y 5-7).
- Estado `CONGELADO` / HU-15.
- Cualquier cambio de permisos, middleware o regla de negocio distinta a la expuesta en este contrato.
- UI de reset de PIN (G10) y `motivo` de estado (HU-08/HU-17).

## Criterios de aceptacion

| ID | Criterio | Gap | HU |
|---|---|---|---|
| INC01-ROL-01 | Un E2E real verifica el guard de rol de la UI: un CLIENTE autenticado que navega a `/clientes` o `/dashboard` es redirigido a `/portal`, y un RECEPCIONISTA autenticado accede a `/clientes` y ve los modulos `Clientes` y `Dashboard`. Sin `isVisible()` condicional, sin `waitForTimeout`, sin aserciones vacias. | G1 | HU-01 c3 |
| INC01-TRZ-01 | `POST /clientes` persiste `creadoPorId` y `actualizadoPorId` con el id del actor autenticado, y la respuesta de la API los expone. Prueba de integracion aserta ambos en la respuesta y en BD; un cliente creado sin actor autenticado no puede producir un id inventado. | G2 | HU-04 c4 |
| INC01-TRZ-02 | `PATCH /clientes/:id` persiste `actualizadoPorId` con el id del actor y `updatedAt` mayor al valor previo, y la respuesta de la API los expone. Prueba de integracion aserta ambos; el campo `creadoPorId` no cambia con la edicion. | G2 | HU-05 c3 |
| INC01-FIC-01 | El step Gherkin de la ficha (escenario C18) se renombra a lo que aserta (`datos personales, sede y estado`) en `clientes.feature` y `clientes.steps.ts`; ningun step de ficha promete rutina o plan sin asertarlos. `npm run test:gherkin` queda en 63/63, exit 0, con el guard anti-skip en verde. | G3 | HU-07 (evidencia) |
| INC01-FIC-02 | `GET /clientes/:id` incluye `membresias: Array<{ id, fechaInicio, fechaFin, estado }>` con los periodos del cliente y `estado` calculado con la misma regla `America/Bogota`/inclusiva (`calcularEstado`). Prueba de integracion crea un periodo y aserta la lista en la ficha. El listado `GET /clientes` no incluye la relacion (costo). | G4 | HU-07 (base c4) |

Nota de conteo (DEC-016): INC01-FIC-02 **no** cierra el bullet 4 de HU-07 (exige las 3 vigencias) ni suma puntos por si solo; es base de los bloques 3 y 5-7. Los puntos certificables de este incremento son los de INC01-ROL-01 (+1 HU-01) e INC01-TRZ-01/02 (+2 HU-04/HU-05), solo despues de evidencia y revision.

## Contrato API (fijado antes del trabajo paralelo)

Respuestas de `POST /clientes`, `PATCH /clientes/:id` y `GET /clientes/:id` añaden:

```json
{
  "creadoPorId": "string | null",
  "actualizadoPorId": "string | null"
}
```

`GET /clientes/:id` añade ademas:

```json
{
  "membresias": [
    { "id": "string", "fechaInicio": "YYYY-MM-DD", "fechaFin": "YYYY-MM-DD", "estado": "PROGRAMADA | ACTIVA | VENCIDA" }
  ]
}
```

Reglas del contrato:

- Solo se exponen **ids** de usuarios internos (sin email ni nombre): no rompe SEC-03 y evita fuga de datos.
- `membresias` ordenado por `fechaInicio` descendente.
- `GET /clientes` (listado) no cambia su respuesta salvo los campos `creadoPorId`/`actualizadoPorId` compartidos del `selectCliente`.
- Tipos web: `club-beasts-web/src/app/clientes/[id]/page.tsx` y `src/types` pueden ampliarse, pero la UI no cambia de comportamiento en este incremento.

## Fixtures y datos de prueba

- API/E2E: SQLite aislada por ejecucion con seed deterministico (DEC-012/DEC-013).
- Staff: `admin@clubbeasts.com` / `admin123` (DUENO), `recep@clubbeasts.com` / `recep123` (RECEPCIONISTA).
- Cliente seed: cedula `1234567890`, PIN `1234`, estado ACTIVO.
- Clientes nuevos en pruebas: cedula/telefono unicos via `cedulaUnica()`/`telefonoUnico()` (`tests/e2e/e2e-helpers.ts`).

## Verificacion requerida

| Comando | Directorio | Criterio |
|---|---|---|
| `npx tsc --noEmit` | api y web | 0 errores |
| `npx vitest run` | api | verde, sin regresion (base 245) |
| `npm run test:gherkin` | api | 63/63 exit 0 (guard anti-skip) |
| `npx vitest run` | web | verde, sin regresion (base 118) |
| `npm run build` | web | PASS |
| `npx playwright test` | web | verde, incluye `acceso-roles.spec.ts` nuevo |

## Agentes responsables

| Area | Agente |
|---|---|
| Pruebas RED (G1, G2, G4) y step G3 | test-engineer |
| Exposicion de trazabilidad y relacion de ficha (GREEN) | backend-developer |
| Verificacion final | test-engineer |
| Revision | code-reviewer |
| Certificacion de puntos en matriz | Orquestador (solo con evidencia) |

## Fuera de este incremento (no tocar)

- `club-beasts-web/src/middleware.ts` (comportamiento ya implementado; solo se prueba).
- Prisma schema/migraciones (no se necesitan campos nuevos).
- `club-beasts-api/features/acceptance-criteria/*` (los docs ISTQB no cambian; solo el step text de C18 en feature/steps).
