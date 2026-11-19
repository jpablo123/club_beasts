# INC-13 - Historial, reportes y notificaciones - Spec

Estado: **PROPUESTO** (2026-11-19). Abierto tras el cierre de INC-12 (91/100).

## Objetivo

Cerrar el bloque 8 del MVP (8 puntos): historial basico del cliente (rutinas + planes nutricionales + ingresos), conteos basicos por sede, y notificaciones de vencimiento por correo. Tambien cerrar HU-07 b5/b6 (+1 punto en bloque 2: rutina activa + historial en ficha, endpoints ya existen desde INC-10).

## Historias cubiertas

- **HU-32** Historial basico del cliente (Prioridad Alta) — 4 bullets: cambios de rutina, cambios de plan nutricional, ingresos registrados, fechas + usuario responsable.
- **HU-33** Conteos basicos por sede (Prioridad Media) — 4 bullets: clientes activos por sede, vencidos/congelados por sede, ingresos del dia por sede, reporte simple sin analitica avanzada.
- **HU-34** Notificaciones de vencimiento por correo (Prioridad Media) — 4 bullets: correo dias antes del vencimiento, aviso el dia del vencimiento, identifica el servicio, evita envios duplicados para la misma vigencia.

## Peso del bloque

8 puntos (mvp.md bloque 8). Reparto por DEC-016 a definir al cierre.

## Decisiones pendientes (PEND-HIS)

- **PEND-HIS-01** Alcance del historial: unificar los historiales existentes (rutinas INC-10, planes nutricion INC-12, ingresos INC-03) en una vista consolidada por cliente, o mantener endpoints separados y agregar un agregador.
- **PEND-HIS-02** Conteos: endpoint unico por sede (`GET /sedes/:id/conteos`) con clientes activos/vencidos/congelados + ingresos del dia, o reutilizar endpoints existentes.
- **PEND-HIS-03** Notificaciones: mecanismo de envio. DEC-048/DEC-066 prohíben jobs/cron para vigencia; pero HU-34 requiere envio "dias antes" y "el dia del vencimiento". Opciones: (a) endpoint on-demand disparado por DUENO (sin cron), (b) cron externo (requiere infra), (c) envio en el momento del login del cliente (lazy). Bloqueante de infraestructura.
- **PEND-HIS-04** Proveedor de correo: SMTP configurado, o servicio (SendGrid/Resend) — requiere variables de entorno y cuenta.
- **PEND-HIS-05** Deduplicacion: clave `(clienteId, servicioId, fechaVencimiento, tipoAviso)` para evitar envios duplicados.
- **PEND-HIS-06** Permisos: solo DUENO ve conteos/historial consolidado; CLIENTE solo su historial.

## Cierre de HU-07 b5/b6 (+1 punto)

Endpoints `/clientes/:id/rutinas/{activa,historial}` ya existen (INC-10 C9). Certificar +1 punto en bloque 2 al final de INC-13 (analogia INC10-R01), sin duplicar con bloque 6.

## No-goals

- No facturacion, caja, reportes financieros, analitica avanzada.
- No versionado completo de anamnesis (bloque 8 / HU-32 solo basico).
- No calculo automatico de macros.

## Navegacion

Aplicabilidad: SI (nuevas pantallas `/reportes` o seccion en dashboard, historial consolidado en ficha, portal notificaciones). Matriz NAV-HIS pendiente antes de LISTO.

## Puntos

8 (0 hasta evidencia + revision + aceptacion). Total tras cierre: 91 + 8 + 1 = 100.