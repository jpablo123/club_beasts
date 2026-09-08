# Alcance Inicial - Club Beasts David Rozo (Software Web para Gimnasio)

Este documento define el alcance inicial del sistema Club Beasts David Rozo. El detalle funcional de referencia es el documento de Historias de Usuario (MVP Gimnasio).

## 1. Contexto

Desarrollo de un software a medida para el gimnasio Club Beasts David Rozo, con 2 sedes, en deporte y fitness de alto rendimiento.

El objetivo principal es centralizar la informacion que hoy esta dispersa en Excel y formularios, y convertirla en una experiencia ordenada para el dueno y para los clientes.

## 2. Tipo de producto

- Aplicacion web como producto principal.
- API interna para separar servicios y soportar crecimiento futuro.
- Solucion pensada solo para este gimnasio por ahora.
- Debe nacer preparada para 2 sedes y ser escalable.

## 3. Usuarios iniciales

- Dueno
- Recepcionista
- Cliente

Nota: el dueno tambien actua como la figura que administra planes, rutinas y seguimiento deportivo, por lo que no se define un rol separado de entrenador en esta primera etapa.

## 4. Prioridad del proyecto

La prioridad de la primera version es:

- Organizar la informacion actual del negocio.
- Construir una ficha unica del cliente.
- Gestion simple de planes, rutinas, vigencias y seguimiento desde el lado del dueno.
- Registro de la anamnesis deportiva del cliente.
- Portal del cliente solo lectura.
- Recepcion basica para validacion de ingreso.

La parte administrativa del gimnasio se considera importante, pero no es la prioridad principal de la primera version. Esta primera etapa debe ser construible en poco tiempo, completa en sus flujos principales y sin alcance enterprise.

## 5. Problemas principales a resolver

- Informacion dispersa entre Excel y formularios.
- Seguimiento manual y desordenado de planes de clientes.
- Poco control operativo del ingreso en recepcion.
- Falta de una vista centralizada por cliente y por sede.
- Dificultad para entregar al cliente una experiencia clara para consultar su plan activo.

## 6. Objetivo funcional de la primera version

Construir una plataforma web donde:

- El dueno pueda organizar y consultar la informacion de sus clientes.
- El dueno pueda asignar planes, rutinas, vigencias y contenido nutricional de forma simple.
- El cliente pueda visualizar su rutina, plan o induccion activa.
- Recepcion pueda validar el ingreso del cliente de forma basica.
- El sistema soporte clientes con planes personalizados y clientes con rutinas genericas.

La meta de esta version no es cubrir toda la administracion del gimnasio, sino resolver bien los flujos mas importantes de punta a punta.

## 7. Alcance funcional incluido

### 7.1. Modulo del dueno

- Crear, editar y consultar clientes.
- Asociar cliente a una sede.
- Ver informacion centralizada del cliente.
- Registrar y diligenciar la anamnesis deportiva del cliente.
- Controlar el acceso a los datos sensibles de la anamnesis.
- Crear y asignar rutinas genericas.
- Crear y asignar rutinas personalizadas.
- Crear y asignar planes nutricionales.
- Registrar y gestionar las vigencias de membresia gym, personalizado y nutricion.
- Congelar vigencias con fecha de inicio, fecha de fin y motivo.
- Gestionar los estados generales del cliente (nuevo, activo, suspendido, retirado, inactivo).
- Inactivar clientes sin borrado fisico, conservando historial y trazabilidad.
- Definir que plan esta activo.
- Consultar el historial basico de asignaciones e ingresos.
- Buscar clientes rapidamente por cedula o nombre.
- Filtrar clientes por sede y por estado.
- Ver conteos basicos de clientes activos e inactivos.

### 7.2. Modulo del cliente

- Iniciar sesion con cedula y PIN numerico de 4 digitos.
- Ver su informacion principal.
- Ver su rutina activa.
- Ver su plan nutricional activo.
- Ver si tiene una rutina de induccion o una rutina personalizada.
- Consultar su anamnesis en modo solo lectura.
- Consultar el contenido de forma clara y ordenada.
- En esta primera version el cliente solo visualiza.
- No se incluye por ahora registro de progreso, chat, fotos o metricas complejas.

### 7.3. Modulo de recepcion

- Buscar cliente por numero de cedula.
- Validar si el cliente existe.
- Ver estado basico para permitir ingreso.
- Registrar o marcar el ingreso de forma simple.
- Consultar a que sede pertenece.
- Crear y editar clientes basicos para no frenar la atencion.
- La recepcion no gestiona rutinas ni vigencias en esta version.

### 7.4. Soporte para multiples sedes

- El sistema debe contemplar 2 sedes desde el inicio.
- Cada cliente debe poder estar asociado correctamente.
- El dueno debe poder filtrar informacion por sede.
- La estructura debe permitir crecimiento futuro a mas sedes, sin construir logica compleja en esta primera version.

### 7.5. Ficha unica del cliente

- Pieza central del sistema.
- Reune en una sola vista: datos personales, sede, estado general, vigencias de servicios, plan activo, rutina activa, anamnesis, notas e historial basico.
- Esta ficha es la base sobre la que se apoyan los demas modulos.
- Si esta queda mal modelada, todo lo demas se desordena.

Campos minimos sugeridos:

- Numero de cedula (identificador principal).
- Nombres y apellidos.
- Telefono.
- Email opcional.
- Sede principal.
- Estado general (nuevo, activo, suspendido, retirado, inactivo).
- Vigencias de membresia gym, personalizado y nutricion.
- Rutina activa y plan nutricional activo.
- Observaciones y notas internas.
- Historial basico de asignaciones e ingresos.

### 7.6. Motor de planes, rutinas y vigencias

- Pieza central logica del negocio.
- Debe soportar rutina generica, rutina de induccion y rutina personalizada.
- Debe soportar tambien el plan nutricional.
- Los servicios se manejan por separado: membresia gym, personalizado y nutricion.
- Cada servicio tiene vigencia propia (activa, vencida, congelada o no contratada).
- Define que plan esta activo y cual queda visible para el cliente.
- Solo puede existir una rutina activa y un plan nutricional activo por cliente.
- La rutina personalizada solo se considera activa si el servicio personalizado esta vigente.
- El plan nutricional activo depende de la vigencia del servicio de nutricion.
- La congelacion pausa la vigencia y extiende automaticamente la fecha de vencimiento.
- Es la logica mas importante de la aplicacion.
- No debe depender de automatizaciones complejas en esta primera version.

## 8. Tipos de planes y servicios contemplados

Servicios con vigencia propia:

- Membresia gym (acceso a las instalaciones).
- Servicio personalizado (acceso a rutina personalizada).
- Servicio de nutricion (acceso a plan nutricional).

Tipos de rutina y plan:

- Rutina generica para clientes nuevos o de induccion.
- Rutina segun tipo de inscripcion.
- Rutina personalizada estructurada.
- Plan nutricional.
- Plan activo visible para el cliente.

## 9. Alcance tecnico inicial

- Aplicacion web.
- Arquitectura basada en API.
- Base de datos centralizada.
- Modelo de informacion pensado para crecer sin depender de Excel.
- Permisos por rol: dueno, recepcionista, cliente.

## 10. Fuera de alcance por ahora

- Contabilidad completa.
- Finanzas avanzadas.
- Reportes contables complejos.
- Facturacion avanzada.
- Modulo completo de mensualidades.
- Analitica avanzada de negocio.
- Dashboards complejos o KPIs avanzados.
- Registro detallado de progreso fisico por parte del cliente.
- Chat interno.
- Calendario avanzado.
- Automatizaciones complejas por tipo de inscripcion.
- Motor inteligente de asignacion automatica.
- Importacion compleja desde Excel.
- App movil nativa.
- Producto multiempresa o para vender a otros gimnasios.
- Calculo automatico de macros o calorias nutricionales.
- Auditoria avanzada o versionado completo de anamnesis.

## 11. Enfoque recomendado por fases

- Fase 1: autenticacion, roles, clientes, sedes y ficha unica del cliente.
- Fase 2: vigencias de membresia gym, personalizado y nutricion, con estados y congelacion.
- Fase 3: rutinas, planes nutricionales y asignacion de planes activos.
- Fase 4: anamnesis deportiva.
- Fase 5: portal del cliente, recepcion basica, historial y notificaciones.

### 11.1. Ruta de construccion de piezas criticas

Orden recomendado para ir armando la aplicacion:

1. Ficha unica del cliente.
2. Motor de planes, rutinas y vigencias.
3. Anamnesis deportiva.
4. Portal del cliente.
5. Panel del dueno.
6. Recepcion y control de ingreso.

## 12. Decisiones ya tomadas

- B2B interno para un gimnasio especifico (Club Beasts David Rozo).
- Software web.
- Uso de API.
- Desarrollo a medida.
- Industria: salud, deporte, fitness de alto rendimiento.
- Usuarios iniciales: dueno, recepcionista y cliente.
- Prioridad: seguimiento deportivo y organizacion de informacion.
- Cliente solo visualiza en la primera version.
- Debe soportar 2 sedes desde el inicio.
- La cedula es el identificador principal del cliente.
- El cliente inicia sesion con cedula y PIN numerico de 4 digitos.
- Los servicios se manejan por separado: membresia gym, personalizado y nutricion.
- Solo hay una rutina activa y un plan nutricional activo por cliente.
- La congelacion pausa la vigencia, cambia el estado y requiere fecha de inicio y fin.
- La anamnesis la diligencia principalmente el dueno.
- La recepcion crea y edita clientes basicos, pero no gestiona rutinas.
- El sistema enviara correos de vencimiento.
- La nutricion se registra manualmente, sin calculos automaticos de macros o calorias.

## 13. Definiciones pendientes

- Que campos exactos existen hoy en Excel y formularios.
- Que estructura tendra cada rutina.
- Que estructura tendra cada plan nutricional.
- Si un cliente puede cambiar de sede.
- Si en la siguiente etapa se incluye pagos y mensualidades.

Nota: la cedula como identificador, la definicion de cliente activo para recepcion, las vigencias por servicio, el historial y las fechas de vencimiento ya quedaron definidos en el documento de Historias de Usuario.

## 14. MVP recomendado

Funcionalidades nucleo sugeridas para una primera version completa, construible y no enterprise:

1. Autenticacion y roles basicos para dueno, recepcionista y cliente.
2. Ficha unica del cliente con datos minimos y estado general.
3. Gestion basica de 2 sedes con filtros por sede.
4. Vigencias de membresia gym, personalizado y nutricion, con estados y congelacion.
5. Registro de la anamnesis deportiva con control de datos sensibles.
6. Catalogo simple de rutinas.
7. Asignacion de rutinas genericas, de induccion o personalizadas.
8. Catalogo y asignacion de plan nutricional.
9. Portal del cliente solo lectura.
10. Recepcion con busqueda por cedula y registro simple de ingreso.
11. Historial minimo de asignaciones e ingresos.
12. Notificaciones de vencimiento por correo.

## 15. Ideas del producto

Estas ideas sirven como referencia conceptual del producto, pero no representan el alcance comprometido del MVP definido en la seccion anterior.

### 15.1. Club Beasts David Rozo

#### Problema

- La informacion del gimnasio esta dispersa entre Excel, formularios y procesos manuales.
- El dueno no tiene una vista clara de clientes, planes, sedes e ingresos operativos.

#### Solucion

- Plataforma web integral para centralizar la operacion del gimnasio en un solo sistema.
- API interna para conectar modulos y permitir crecimiento por etapas.

#### Funcionalidades

- Ficha unica del cliente.
- Motor de planes, rutinas y vigencias.
- Anamnesis deportiva.
- Portal del cliente.
- Panel del dueno.
- Recepcion y control de ingreso.
- Vista por sedes.
