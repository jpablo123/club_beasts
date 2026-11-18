# INC-11 - UX anamnesis y tipografia - Spec

Estado: **ACEPTADO** (2026-11-18; revision `code-reviewer` **ACEPTA**, 0 bloqueantes; ver `evidencia.md` §3-§5). Pipeline: LISTO -> RED -> GREEN -> VERIFICADO -> REVISADO -> ACEPTADO. 0 puntos MVP (UX no certifica puntos; precedente INC-08).

## Objetivo

Cerrar dos hallazgos de auditoria de UX/diseno sobre el formulario de anamnesis y los encabezados de la app: (1) tipografia del sistema rota (`font-oswald` clase inexistente) y (2) UX de los campos del formulario (labels/hints, aviso de confidencialidad, condicionales). **0 puntos MVP** (mejora UX sin bullet propio; precedente INC-08 = 0 puntos; WORKFLOW-NAV/UX no certifica puntos).

## Decisiones que rigen

- **DEC-071**: `font-oswald` -> `font-display` en los 5 encabezados; 0 ocurrencias de `font-oswald` en `club-beasts-web/src`.
- **DEC-072** (D-PROD-01): labels cortos conservados + hint con la instruccion completa del Anexo DEC-052; Anexo DEC-052 enmendado con labels/hints definitivos.
- **DEC-073** (D-PROD-03): aviso discreto "Informacion confidencial" en los 5 campos sensibles de DEC-055 (4, 16, 17, 18a/18b), renderizado por presencia de clave (preserva NAV-AN-07); visible en editor y vista; sin cambios de API/permisos.
- **DEC-074** (D-PROD-04): hint visible + validacion inline de consistencia en los condicionales #12 (si 11=SI) y #18b (si 18a=SI); enmienda del criterio C3 de INC-09 (la limpieza al pasar a NO se conserva).

## Criterios de aceptacion

| ID | Criterio observable | Verificacion |
|---|---|---|
| UX-01 | 0 ocurrencias de `font-oswald` en `club-beasts-web/src`; los 5 encabezados (`AnamnesisSection.tsx:133`, `AnamnesisVista.tsx:60`, `AnamnesisEditor.tsx:295`, `MembershipSection.tsx:421,437`) usan `font-display` | grep + unit/E2E que asertan la clase en los encabezados |
| UX-02 | Cada campo del editor de anamnesis muestra label corto + hint con la instruccion del Anexo; el Anexo DEC-052 contiene los labels/hints definitivos | unit de paridad label/hint por campo vs Anexo enmendado |
| UX-03 | Los 5 campos sensibles (4, 16, 17, 18a, 18b) muestran el aviso "Informacion confidencial" en editor y vista, por presencia de clave; NAV-AN-07 intacto (recepcion sigue sin verlos; doble capa DOM+red) | unit (render por clave) + E2E de regresion de permisos INC-09 |
| UX-04 | #12 y #18b muestran hint de condicional; una contradiccion SI/NO se senala en linea antes del guardar; la limpieza al pasar a NO (C3) sigue funcionando | unit + E2E: 11=NO con 12 presente senalado; 11=SI muestra hint |

## Alcance

- Archivos: `club-beasts-web/src/components/anamnesis/{AnamnesisSection,AnamnesisVista,AnamnesisEditor}.tsx`, `club-beasts-web/src/components/MembershipSection.tsx` (solo tipografia), `club-beasts-web/src/lib/anamnesis-schemas.ts` (si hace falta para consistencia inline), `docs/producto/decisiones.md` (Anexo DEC-052 enmendado, por el orquestador), tests web.
- Sin backend, sin Prisma, sin rutas nuevas, sin cambios de permisos.

## No-goals

- No cambiar API, modelos ni permisos (DEC-055/058/060 intactos).
- No tocar INC-10 ni otros incrementos.
- No eliminar la limpieza de condicionales C3 ni la guarda AN-26 (DEC-061 intacta).
- No certificar puntos MVP.
- No re-renderizar por rol el aviso sensible (seria regresion NAV-AN-07).

## Riesgos

- `INC11-R01`: cambios de label/hint pueden romper selectores de E2E existentes -> enmiendas C4 documentadas si ocurren, nunca edicion silenciosa.
- `INC11-R02`: el hint agrega texto al DOM -> verificar que no rompa aserciones de conteo/visibilidad de INC-09.

## Navegacion

**NO APLICABLE justificado**: sin rutas, links, entradas, salidas ni destinos nuevos (solo contenido de componentes existentes). La matriz de navegacion no aplica; la regresion de navegacion se cubre con la bateria E2E completa (PIN, NAV-AN-07, gates DEC-060).
