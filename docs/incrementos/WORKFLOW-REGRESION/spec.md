# WORKFLOW-REGRESION - Proteccion de incrementos anteriores

Fecha: 2026-11-19. Tipo: reglas de entrega/configuracion; 0 puntos MVP.
Solicitud aprobada: el usuario pide aplicar las reglas de preservacion y adaptar los subagentes.

## Alcance y criterios

- WR-01: AGENTS.md establece incrementos aditivos por defecto: no eliminar, desactivar o degradar funcionalidades previas, validaciones, permisos, datos o recorridos para completar otro incremento. Se permite refactorizar preservando comportamiento.
- WR-02: el orquestador exige antes de LISTO una matriz de impacto con incremento/criterio anterior, comportamiento protegido, prueba, comando y resultado base. Todo contrato incluye preservacion, archivos autorizados y regresion. Desbloquear un criterio no autoriza romper otro.
- WR-03: especialistas bloquean incompatibilidades; sustituir comportamiento requiere aprobacion explicita del usuario y registro previo en decisiones y spec, con trazabilidad anterior/nuevo y pruebas de reemplazo. No se reescribe evidencia historica.
- WR-04: QA no elimina, omite ni debilita pruebas/expectativas para obtener verde. Cambios legitimos de fixtures/localizadores conservan cobertura y tienen justificacion y revision. Regresion afectada y flujos criticos compartidos se ejecutan antes y despues; fallos previos se distinguen de nuevos, nunca se ocultan; falta de evidencia impide aceptar.
- WR-05: reviewer bloquea regresiones y eliminaciones no aprobadas aunque lo nuevo pase. Backend/frontend preservan contratos y UX; DBA preserva datos/migraciones aplicadas; DevOps preserva verificaciones; analista identifica criterios previos; auditor cubre viajes previos afectados.
- WR-06: solo cambian AGENTS.md y los nueve archivos .opencode/agents/*.md previstos, ademas de documentos de este workflow mantenidos por el orquestador. Sin modificar producto, pruebas, permisos de herramientas ni configuraciones globales.

## Verificacion

Configuracion textual: contraste RED de instrucciones existentes, cobertura WR-01..06 despues, `git diff --check`, inspeccion de diff y revision independiente sin bloqueantes.
No aplica API, fixtures de BD ni navegacion de producto: no se cambian rutas, pantallas ni comportamiento de usuario; matriz de navegacion NO APLICABLE por este motivo.
No se ejecutan suites de producto ni se recertifican incrementos historicos por cambiar instrucciones.

## Estado

PROPUESTO -> ESPECIFICADO -> LISTO (alcance aprobado, criterios y verificacion definidos).
RED -> IMPLEMENTADO -> VERIFICADO por contraste textual y diff acotado (ver evidencia). Revision independiente y aceptacion pendientes.

Cierre 2026-11-19: REVISADO -> ACEPTADO. WR-01..06 conformes, sin bloqueantes; evidencia y reporte independiente registrados. Configuracion solamente, 0 puntos MVP.
