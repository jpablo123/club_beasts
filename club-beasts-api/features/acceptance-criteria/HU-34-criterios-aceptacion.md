# Criterios de Aceptación - HU-34: Notificaciones de vencimiento por correo

- Origen: `historias-usuario-gimnasio.md` §4.11 HU-34 (líneas 540-558).
- Incremento: INC-13.
- Decisiones que rigen: DEC-048/066 (sin jobs/cron para vigencia), DEC-005/006 (fechas), DEC-041 (nunca actor en portal).

## Resumen

Envia correo dias antes del vencimiento y el dia del vencimiento, identifica el servicio, evita envios duplicados para la misma vigencia. Propuesta pragmática (PEND-HIS-03/04): endpoint on-demand disparado por DUENO (sin cron) + proveedor configurable (stub/log en dev, SMTP/Resend en prod) con dedup por (clienteId, servicioId, fechaVencimiento, tipoAviso).

## Mapa de bullets -> IDs

| Bullet | ID |
|---|---|
| b1 correo dias antes | `HU34-C01` |
| b2 aviso el dia del vencimiento | `HU34-C02` |
| b3 identifica el servicio | `HU34-C03` |
| b4 evita duplicados misma vigencia | `HU34-C04` |
| (transversal) permisos | `HU34-C05` |
| (transversal) proveedor configurable | `HU34-C06` |

## Criterios detallados

### HU34-C01 — Correo dias antes del vencimiento
- **Condición previa**: servicio con fechaFin a N dias (configurable, default 3) en el futuro; cliente con email.
- **Disparo**: `POST /notificaciones/vencimiento/preview` o `POST /notificaciones/vencimiento/enviar` (on-demand, DUENO).
- **Resultado observable**: se genera un envio por cada servicio que vence en la ventana, con asunto/cuerpo identificando el servicio y la fecha.

### HU34-C02 — Aviso el dia del vencimiento
- **Resultado observable**: servicios con fechaFin = hoy generan aviso de tipo `DIA_VENCIMIENTO`.

### HU34-C03 — Identifica el servicio
- **Resultado observable**: el correo incluye tipo de servicio (GYM/PERSONALIZADO/NUTRICION), nombre del cliente y fecha de vencimiento.

### HU34-C04 — Deduplicacion
- **Condición previa**: ya existe un NotificacionEnvio con clave (clienteId, servicioId, fechaVencimiento, tipoAviso).
- **Disparo**: re-ejecutar el envio.
- **Resultado observable**: no se envia de nuevo; respuesta indica `omitidos: N` por dedup. Clave unica en BD.

### HU34-C05 — Permisos
- **Resultado observable**: solo DUENO dispara; RECEPCIONISTA/CLIENTE → 403; sin token → 401.

### HU34-C06 — Proveedor configurable
- **Resultado observable**: en dev (sin SMTP/Resend configurado) el proveedor es stub que registra en log y retorna ok; en prod usa SMTP/Resend segun env. Sin romper tests.

## PEND-HIS-03 / PEND-HIS-04
Mecanismo on-demand (sin cron) y proveedor de correo. Bloqueantes para LISTO. Propuesta (a) pragmática flaggeada como PEND-HIS para ratificacion.

## Reglas de Validación por Campo
| Campo | Tipo | Requerido | Valores |
|-------|------|-----------|---------|
| diasAntes | int | no | 1-30 (default 3) |
| tipoAviso | string | sí | DIAS_ANTES, DIA_VENCIMIENTO |
| proveedor | string | no | stub, smtp, resend (env-driven) |