# INC-13 - Bloque 8: historial basico, conteos por sede y notificaciones (cierre del MVP)

Estado: **PROPUESTO** (2026-11-19). Puntos MVP potenciales: bloque 8 = **8** (HU-32/33/34, reparto por fraccion al cierre DEC-016) + **1 punto restante de HU-07** (saldo del bloque 1: ficha unica 3/6 -> 6/6). Con este incremento el proyecto llega a **100/100**.

## Alcance

- **HU-32** (Alta) Historial basico del cliente (DUENO): cambios de rutina, cambios de plan nutricional, ingresos registrados, fechas + usuario responsable cuando aplique.
- **HU-33** (Media) Conteos basicos por sede (DUENO): clientes activos, vencidos/congelados, ingresos del dia; reporte simple sin analitica avanzada.
- **HU-34** (Media) Notificaciones de vencimiento por correo (cliente): aviso dias antes + dia del vencimiento, identifica el servicio, sin duplicados por vigencia. **Unico alcance con infraestructura externa (correo)** — PENDs de canal/disparador/destinatarios/anti-duplicados.
- **HU-07 saldo** (1 punto): bullets pendientes de la ficha unica — b4 vigencias, b5 rutina activa + plan nutricional activo, b6 notas internas + historial basico — sin doble cobro con INC-10 (b5 rutina) ni INC-12 (plan) ni con HU-32 (historial).

## Criterios de aceptacion

Pendiente: `acceptance-criteria-analyst` (Modo CREAR) — criterios BL8-xx / H7-xx + matrices NAV-BL8-xx en `club-beasts-api/features/acceptance-criteria/`.

## Decisiones pendientes (PENDs del analista)

Pendiente: formulacion con recomendaciones (canal de correo, disparador, anti-duplicados, alcance de conteos, fuentes del historial, saldo HU-07, notas internas).

## Contrato API (PROPUESTO — a ratificar)

Pendiente tras decisiones del Producto.

## Contrato frontend (PROPUESTO — a ratificar)

Pendiente tras decisiones del Producto.

## Matriz de navegacion/aplicabilidad

Pendiente: NAV-BL8-xx registrada por el orquestador al cierre de la puerta LISTO.

## Base a preservar (re-medida al arranque del RED)

API **1034/1034** · Gherkin **220/220** (guard 220) · web **401/401** · E2E **213/213** (143 base + 70 NAV-RU) · tsc 0/0 · build PASS · migraciones **11/0**. *Confirmar medicion real en el RED (pueden existir ajustes posteriores a INC-12).*

## Riesgos

| ID | Riesgo | Mitigacion | Responsable |
|---|---|---|---|
| INC13-R01 | Infraestructura de correo inexistente en entorno de pruebas | Adaptador abstracto + log en dev/test (PEND-1); nunca depender de red en E2E | backend + QA |
| INC13-R02 | Doble cobro HU-07 vs HU-32/INC-10/INC-12 | REPARTO explicito en `auditoria-puntos-inc00.md` §15 con REF sin punto | Orquestador |
| INC13-R03 | Disparador de envios vs precedente "sin jobs" (DEC-066) | PEND honesto: notificacion SÍ requiere disparador; alternativas | Producto |
| INC13-R04 | Conteos con estados calculados (calcularEstado) — coste/consistencia | Fuente unica `calcularEstado` + fixtures con estados variados | backend + QA |
