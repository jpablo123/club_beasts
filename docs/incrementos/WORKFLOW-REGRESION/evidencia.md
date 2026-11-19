# Evidencia WORKFLOW-REGRESION

## Base 2026-11-19

- Lectura de fuentes: mvp.md, avance.md, decisiones.md (reglas de preservacion precedentes DEC-035/037/039), historias y fases historicas.
- `git status --short`: cambios previos en API (schema, index, helpers INC12, nuevos archivos INC13), web (ficha, dashboard, api, nuevas pantallas y pruebas INC13) y documentos INC-13. Fuera de alcance; conservar sin editar/revertir.
- Inspeccion previa: orquestador permite modificar fuera del incremento para desbloquear criterios sin aclarar preservacion; QA/reviewer exigen evidencia del incremento pero no una puerta explicita de regresion anterior. DBA ya prohibe reset de datos compartidos sin aprobacion.
- No se ha ejecutado verificacion de producto. El registro vigente declara 91/100; este workflow aporta 0 y no recertifica ese valor.
- Riesgo: las instrucciones son controles de proceso, no garantizan ausencia absoluta de regresiones. Requieren pruebas ejecutadas y revision en cada incremento.

## Ejecucion

Reporte DevOps recibido (sesion ses_e0bb66fb1ffe1b4XRaAwqwh1zt):

- RED textual: faltaban regla comun aditiva, matriz/base antes LISTO, control explicito de sustituciones y puerta de regresion anterior.
- GREEN textual WR-01..06: reglas incorporadas en AGENTS.md y nueve agentes; 10 archivos, 33 inserciones y 2 sustituciones. Corregidas excepcion del orquestador y referencia a reset DBA (solo BD aislada desechable).
- `git status --short`: inspeccion antes/despues; actividad concurrente INC-13 detectada. No se afirma invariancia del worktree ajeno.
- `git diff -- AGENTS.md .opencode/agents`: revisado; solo instrucciones previstas.
- `git diff --stat -- AGENTS.md .opencode/agents`: 10 archivos, +33/-2.
- `git diff --check -- AGENTS.md .opencode/agents`: exit 0.
- Cobertura textual WR: 10/10 archivos. Comparacion Python por bytes contra `git show HEAD:<archivo>`: frontmatter 9/9 identicos. Chequeo PowerShell inicial produjo falso fallo de decodificacion, corregido con comparacion por bytes.
- `git diff --check` global: whitespace externo en `club-beasts-web/src/app/dashboard/page.tsx:78,94`. No corregido; fuera de alcance. No declarar diff global limpio.
- Sin suites producto; navegacion NO APLICABLE. 0 puntos.

Estado: RED -> IMPLEMENTADO -> VERIFICADO (configuracion textual). Revision independiente delegada a code-reviewer; aceptacion pendiente.

## Revision y cierre 2026-11-19

Revision independiente ses_e0bb4edd4ffe20Ghcd4SyY9rHn: WR-01..06 CONFORMES, sin bloqueantes tecnicos. Ejecuto `git diff --check -- AGENTS.md .opencode/agents` (exit 0), `git diff --stat -- AGENTS.md .opencode/agents` (10 archivos +33/-2), inspeccion completa del diff, comparacion Python por bytes del frontmatter (9/9 identicos), cobertura de referencias WR (10/10) y `git status --short` (trabajo concurrente ajeno).

Hallazgo documental: el reviewer leyo la version previa de spec/evidencia mientras el orquestador incorporaba el reporte DevOps. El reporte ya quedo incorporado en la seccion anterior; este cierre completa la actualizacion pendiente, conservando la secuencia historica. No quedan bloqueantes.

Estado final: VERIFICADO -> REVISADO -> ACEPTADO, exclusivamente reglas de configuracion. 0 puntos MVP; no recertifica producto ni incrementos historicos. Advertencias LF/CRLF no invalidan el diff-check acotado. Persisten los limites de proceso: las instrucciones no sustituyen pruebas y revision en futuros incrementos; no se afirma limpieza global del worktree.
