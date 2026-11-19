# INC-13 - Historial, reportes y notificaciones - Spec

Estado: **LISTO** (2026-11-19; puerta LISTO cerrada: criterios HI-xx, DEC-083..088, ratificacion R1 con R1-R8, R2 con C1-C6, matriz NAV-HIS incluida). Abierto tras el cierre de INC-12 (91/100).

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

## Ratificacion de contratos (2026-11-19)

- **Backend (R1)**: RATIFICA CON CORRECCIONES R1-R8. R1: modelo `NotificacionEnvio` con clave unica (migracion). R2: `servicioId` = `MembresiaGym.id`. R3: path canonico `POST /notificaciones/vencimiento/enviar` (dryRun opcional). R4: proveedor configurable por env (`NOTIF_PROVIDER=stub|smtp|resend`), stub por defecto. R5: conteos con `fecha` query opcional (default hoy Bogota), validar `sedeId`. R6: historial con `tipo` enum, `limit` 1-100 default 20, `offset` >=0, respuesta `{ items, total }`. R7: orden de guardas 401->403->400->404->200; CLIENTE solo su propio historial sin actor. R8: actor nunca expuesto a CLIENTE. Riesgos: infraestructura de correo (stub permite tests), sin cron (on-demand solo).
- **Frontend (R2)**: RATIFICA CON CORRECCIONES C1-C6. C1: ruta dedicada `/reportes` (solo DUENO) con conteos + boton de disparo; dashboard solo card "Reportes". C2: componente `HistorialCliente` consolidado (rutinas+planes+ingresos) con tabs/filtros; CLIENTE ve su historial en portal sin actor (ruta `/portal/historial` o seccion). C3: CLIENTE no ve actor ni conteos; portal usa id propio de sesion. C4: `api.ts` metodos `historial`, `conteos`, `notificaciones.enviar`. C5: NAV-HIS matriz por rol. C6: POST on-demand solo DUENO; UI muestra resultado (enviados/deduplicados/errores), boton deshabilitado durante request.

## Matriz de navegacion (NAV-HIS) — por rol, estado NO VERIFICADO hasta E2E

| ID | Pantalla/estado | Rol | Entrada | Salida esperada | Prueba |
|---|---|---|---|---|---|
| NAV-HIS-01 | `/reportes` conteos por sede | DUENO | dashboard card "Reportes" | conteos activos/vencidos/congelados + ingresos del dia; disparo notificaciones | E2E |
| NAV-HIS-02 | disparo notificaciones | DUENO | boton "Enviar avisos" en /reportes | resultado (enviados/dedup/errores), boton deshabilitado durante request | E2E |
| NAV-HIS-03 | historial en ficha cliente | DUENO/RECEPCIONISTA | ficha cliente -> historial | solo lectura (RECEPCIONISTA), tabs por tipo, fechas+actor (staff) | E2E |
| NAV-HIS-04 | `/portal/historial` | CLIENTE | portal "Mi historial" | historial propio sin actor | E2E |
| NAV-HIS-05 | permisos conteos | RECEPCIONISTA/CLIENTE | intento /reportes | 403 | integracion |
| NAV-HIS-06 | permisos historial ajeno | CLIENTE | URL directa a otro cliente | 403/404 sin datos | integracion |
| NAV-HIS-07 | URL directa/reload/back | todos | URL directa, F5, atras | sin bucles, destino correcto | E2E |
| NAV-HIS-08 | movil/desktop/teclado | todos | viewport + tab | foco visible, operable | E2E |
| NAV-HIS-09 | sesion expirada | todos | token expirado | redirect a login sin fuga | E2E |

Todas las filas en estado **NO VERIFICADO** hasta evidencia ejecutada.

## Cierre de HU-07 b5/b6 (+1 punto)

Endpoints `/clientes/:id/rutinas/{activa,historial}` ya existen (INC-10 C9). Certificar +1 punto en bloque 2 al final de INC-13 (analogia INC10-R01), sin duplicar con bloque 6.

## No-goals

- No facturacion, caja, reportes financieros, analitica avanzada.
- No versionado completo de anamnesis (bloque 8 / HU-32 solo basico).
- No calculo automatico de macros.

## Navegacion

Aplicabilidad: SI (nuevas pantallas `/reportes` o seccion en dashboard, historial consolidado en ficha, portal notificaciones). Matriz NAV-HIS pendiente antes de LISTO.

## Puntos

8 (0 hasta evidencia + revision + aceptacion). Total tras cierre: 91 + 8 + 1 = 100.## Criterios HI-xx (resumen)

- HI-01 Historial consolidado por cliente (HU-32 C01-C06).
- HI-02 Conteos por sede (HU-33 C01-C05).
- HI-03 Notificaciones on-demand con dedup (HU-34 C01-C06).

## Contratos R1-R8 / C1-C9 (borrador para ratificacion backend/frontend)

- R1 GET /clientes/:clienteId/historial (staff o propio cliente).
- R2 GET /sedes/:sedeId/conteos.
- R3 POST /notificaciones/vencimiento/enviar (DUENO).
- R4 Dedup por (clienteId, servicioId, fechaVencimiento, tipoAviso).
- R5 Proveedor configurable (stub/smtp/resend).
- R6 Sin cron (DEC-048/066).
- R7 Solo DUENO dispara notificaciones y ve conteos.
- R8 CLIENTE ve su propio historial sin actor (DEC-041).
- C1-C9: paths, codigos de error, orden de guardas, paginacion, filtros (a ratificar).
