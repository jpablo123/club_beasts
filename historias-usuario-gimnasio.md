# Historias de Usuario - MVP Gimnasio

## 1. Objetivo

Definir las historias de usuario del MVP del sistema web para el gimnasio, priorizando una primera version construible en poco tiempo, completa en sus flujos principales y sin alcance enterprise.

## 2. Supuestos de trabajo

Estas historias se redactan con los siguientes supuestos de trabajo, que podremos ajustar despues:

- La cedula es el identificador principal del cliente.
- El cliente inicia sesion con cedula y PIN numerico de 4 digitos.
- Existen 3 roles iniciales: dueno, recepcionista y cliente.
- El cliente puede ingresar a cualquier sede, pero tiene una sede principal registrada.
- Los servicios se manejan por separado: membresia gym, personalizado y nutricion.
- La recepcion puede crear y editar clientes basicos, pero no gestiona rutinas.
- La anamnesis la diligencia principalmente el dueno.
- El cliente visualiza su informacion, pero no registra progreso en esta version.
- Solo hay una rutina activa y un plan nutricional activo por cliente.
- La congelacion pausa la vigencia, cambia el estado y requiere fecha de inicio y fin.
- El sistema enviara correos de vencimiento.
- La nutricion se registra manualmente; el sistema no hace calculos automaticos de macros o calorias.

## 3. Prioridad

- Alta: indispensable para el MVP.
- Media: importante para que el flujo quede completo.
- Baja: util, pero puede esperar si el tiempo aprieta.

## 4. Historias por modulo

### 4.1. Autenticacion y acceso

#### HU-01. Inicio de sesion del dueno y recepcionista

- Como usuario interno
- Quiero iniciar sesion con mis credenciales
- Para acceder al sistema segun mi rol

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite iniciar sesion con usuario y contrasena.
- El sistema identifica si el usuario es dueno o recepcionista.
- El sistema muestra solo los modulos permitidos segun el rol.
- Si las credenciales son invalidas, el sistema informa el error.

#### HU-02. Inicio de sesion del cliente con cedula y PIN

- Como cliente
- Quiero iniciar sesion con mi cedula y un PIN de 4 digitos
- Para consultar mi informacion y mis planes activos

Prioridad: Alta

Criterios de aceptacion:

- El sistema solicita cedula y PIN de 4 digitos.
- El sistema valida que el cliente exista y tenga acceso creado.
- El cliente accede unicamente a su portal personal.
- Si el PIN es invalido, el sistema informa el error.

#### HU-03. Restablecimiento de PIN del cliente

- Como dueno o recepcionista
- Quiero restablecer el PIN del cliente
- Para ayudarle a recuperar el acceso

Prioridad: Media

Criterios de aceptacion:

- El dueno puede restablecer el PIN de cualquier cliente.
- La recepcion puede restablecer el PIN de cualquier cliente.
- El sistema registra quien realizo el cambio.
- El nuevo PIN queda guardado de forma segura.

### 4.2. Clientes y ficha unica

#### HU-04. Creacion de cliente basico

- Como dueno o recepcionista
- Quiero crear un cliente con informacion basica
- Para registrarlo rapidamente en el sistema

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite crear un cliente con cedula, nombre completo, telefono y sede principal.
- La cedula no puede repetirse.
- El sistema asigna un estado inicial al cliente.
- El sistema deja trazabilidad de quien creo el cliente.

#### HU-05. Edicion de cliente basico

- Como dueno o recepcionista
- Quiero editar la informacion basica de un cliente
- Para mantener sus datos actualizados

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite editar datos basicos del cliente.
- El sistema permite actualizar la sede principal.
- El sistema guarda fecha de actualizacion y usuario responsable.
- Los cambios quedan visibles en la ficha unica del cliente.

#### HU-06. Busqueda y filtros de clientes

- Como dueno o recepcionista
- Quiero buscar y filtrar clientes
- Para encontrarlos rapidamente en la operacion diaria

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite buscar por cedula y nombre.
- El sistema permite filtrar por sede principal.
- El sistema permite filtrar por estado general del cliente.
- La lista muestra resultados de forma clara y rapida.

#### HU-07. Ficha unica del cliente

- Como dueno
- Quiero ver toda la informacion relevante del cliente en una sola vista
- Para entender su estado y gestionarlo sin depender de Excel

Prioridad: Alta

Criterios de aceptacion:

- La ficha muestra datos personales basicos.
- La ficha muestra sede principal.
- La ficha muestra estado general del cliente.
- La ficha muestra vigencias de membresia gym, personalizado y nutricion.
- La ficha muestra rutina activa y plan nutricional activo.
- La ficha muestra notas internas y un historial basico.

#### HU-08. Inactivacion de clientes sin borrado fisico

- Como dueno
- Quiero inactivar clientes en lugar de borrarlos
- Para conservar historial y trazabilidad

Prioridad: Media

Criterios de aceptacion:

- El sistema permite cambiar el estado del cliente a inactivo.
- El sistema conserva su historial.
- El sistema registra quien realizo el cambio y el motivo.
- Un cliente inactivo no puede ingresar ni acceder a servicios activos nuevos sin ser reactivado.

### 4.3. Anamnesis deportiva

#### HU-09. Registro de anamnesis deportiva

- Como dueno
- Quiero diligenciar la anamnesis deportiva del cliente
- Para centralizar su informacion personal, medica y deportiva

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite registrar la informacion del formulario de analisis pre entrenamiento.
- El sistema agrupa la informacion en secciones claras para diligenciamiento.
- La anamnesis queda asociada al cliente correcto.
- El sistema guarda fecha de actualizacion y usuario responsable.

#### HU-10. Control de acceso a datos sensibles de anamnesis

- Como dueno
- Quiero que solo yo pueda ver y editar los datos medicos sensibles
- Para proteger la informacion del cliente

Prioridad: Alta

Criterios de aceptacion:

- El dueno puede ver y editar la anamnesis completa.
- La recepcion no puede ver antecedentes medicos sensibles.
- El cliente puede visualizar su propia anamnesis en modo solo lectura.
- El sistema separa claramente la informacion sensible de la operativa.

#### HU-11. Guardado progresivo de anamnesis

- Como dueno
- Quiero guardar una anamnesis aunque no este completa
- Para terminarla despues sin perder informacion

Prioridad: Media

Criterios de aceptacion:

- El sistema permite guardar la anamnesis incompleta.
- El sistema marca la anamnesis como pendiente o incompleta.
- El dueno puede retomarla y completarla despues.

### 4.4. Membresias, vigencias y estados

#### HU-12. Registro de membresia gym

- Como dueno o recepcionista
- Quiero registrar la vigencia de la membresia del gimnasio
- Para controlar si el cliente puede ingresar a las instalaciones

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite registrar fecha de inicio y fecha fin de la membresia gym.
- El sistema muestra si la membresia esta activa, vencida o congelada.
- La vigencia queda visible en la ficha del cliente.
- El sistema registra quien creo o actualizo la vigencia.

#### HU-13. Registro de servicio personalizado

- Como dueno
- Quiero registrar la vigencia del servicio personalizado
- Para controlar si el cliente tiene acceso a una rutina personalizada activa

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite registrar fecha de inicio y fecha fin del servicio personalizado.
- El sistema permite marcar el servicio como activo, vencido, congelado o no contratado.
- La vigencia queda visible en la ficha del cliente.
- La rutina personalizada solo puede considerarse activa si el servicio personalizado esta vigente.

#### HU-14. Registro de servicio de nutricion

- Como dueno
- Quiero registrar la vigencia del servicio de nutricion
- Para controlar si el cliente tiene acceso a un plan nutricional activo

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite registrar fecha de inicio y fecha fin del servicio de nutricion.
- El sistema permite marcar el servicio como activo, vencido, congelado o no contratado.
- La vigencia queda visible en la ficha del cliente.
- El plan nutricional activo depende de la vigencia del servicio.

#### HU-15. Congelacion de vigencias

- Como dueno o recepcionista
- Quiero congelar una vigencia con fecha inicial y final
- Para pausar temporalmente el servicio del cliente

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite congelar membresia gym, personalizado o nutricion.
- La congelacion requiere fecha de inicio, fecha de fin y motivo.
- Durante la congelacion el estado cambia a congelado.
- La fecha de vencimiento se extiende automaticamente por el tiempo congelado.

#### HU-16. Cambio de estado por vencimiento

- Como sistema
- Quiero identificar cuando una vigencia vence
- Para reflejar correctamente el estado del servicio

Prioridad: Media

Criterios de aceptacion:

- El sistema detecta cuando una vigencia llega a su fecha final.
- El sistema cambia el estado del servicio a vencido.
- El estado se refleja en la ficha del cliente y en recepcion.
- El cliente deja de tener acceso al servicio vencido.

#### HU-17. Gestion de estados generales del cliente

- Como dueno o recepcionista
- Quiero gestionar estados generales del cliente
- Para reflejar situaciones operativas como nuevo, suspendido o retirado

Prioridad: Media

Criterios de aceptacion:

- El sistema permite manejar estados generales como nuevo, activo, suspendido, retirado e inactivo.
- El sistema registra motivo cuando el estado cambia.
- El estado general no elimina el historial previo del cliente.

### 4.5. Rutinas

#### HU-18. Creacion de rutina generica o de induccion

- Como dueno
- Quiero crear rutinas genericas o de induccion
- Para asignar planes base a clientes nuevos o generales

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite definir si una rutina es generica o de induccion.
- La rutina tiene una estructura organizada para su consulta.
- La rutina puede reutilizarse con varios clientes.
- La rutina puede ser activada para un cliente.

#### HU-19. Creacion de rutina personalizada estructurada

- Como dueno
- Quiero crear una rutina personalizada completa y estructurada
- Para ofrecer un servicio premium y bien documentado

Prioridad: Alta

Criterios de aceptacion:

- La rutina permite registrar informacion general y diagnostico.
- La rutina permite registrar macrociclo, mesociclo y microciclo.
- La rutina permite registrar sesiones, ejercicios, series, intensidades, descansos y observaciones.
- La rutina permite incluir tests, antropometria y analisis anatomico biomecanico en formato estructurado simple.

#### HU-20. Asignacion de rutina activa

- Como dueno
- Quiero asignar una rutina activa a un cliente
- Para que el cliente vea exactamente la rutina que le corresponde

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite asignar una sola rutina activa por cliente.
- El sistema permite asignar rutinas genericas, de induccion o personalizadas.
- Si el cliente no tiene personalizado vigente, el sistema no marca una rutina personalizada como activa.
- La rutina activa queda visible en el portal del cliente.

#### HU-21. Historial de cambios de rutina

- Como dueno
- Quiero conservar el historial de rutinas asignadas
- Para consultar la evolucion del cliente

Prioridad: Media

Criterios de aceptacion:

- El sistema guarda fecha de inicio y fecha de fin de cada rutina asignada.
- El sistema registra quien hizo el cambio.
- La rutina anterior deja de estar activa cuando se asigna una nueva.
- El historial queda disponible en la ficha del cliente.

### 4.6. Nutricion

#### HU-22. Creacion de plan nutricional estructurado

- Como dueno
- Quiero registrar un plan nutricional detallado y estructurado
- Para entregar al cliente una pauta clara y profesional

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite registrar datos biometricos y objetivos caloricos.
- El sistema permite registrar distribucion de macronutrientes como informacion cargada manualmente.
- El sistema permite registrar tiempos de comida y detalle de alimentos.
- El sistema permite registrar recomendaciones y suplementacion.
- El sistema no calcula macros automaticamente en esta version.

#### HU-23. Asignacion de plan nutricional activo

- Como dueno
- Quiero asignar un plan nutricional activo a un cliente
- Para que pueda visualizarlo en su portal

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite asignar un solo plan nutricional activo por cliente.
- El plan solo puede quedar activo si el servicio de nutricion esta vigente.
- El plan nutricional activo queda visible para el cliente.
- Si el cliente no tiene nutricion activa, el portal informa que no hay plan vigente.

#### HU-24. Historial de planes nutricionales

- Como dueno
- Quiero conservar historial de planes nutricionales asignados
- Para saber cual ha sido el seguimiento nutricional del cliente

Prioridad: Media

Criterios de aceptacion:

- El sistema guarda fecha de inicio y fecha de fin de cada plan nutricional asignado.
- El sistema registra quien realizo el cambio.
- El plan anterior se cierra al activar uno nuevo.
- El historial queda visible en la ficha del cliente.

### 4.7. Portal del cliente

#### HU-25. Visualizacion de informacion general del cliente

- Como cliente
- Quiero ver mi informacion general en el portal
- Para saber mi estado actual dentro del gimnasio

Prioridad: Alta

Criterios de aceptacion:

- El portal muestra nombre, cedula y sede principal.
- El portal muestra estado de acceso al gym.
- El portal muestra fecha de vencimiento de la membresia.
- Si el cliente esta congelado, el portal muestra el rango de congelacion.

#### HU-26. Visualizacion de rutina activa

- Como cliente
- Quiero ver mi rutina activa
- Para consultar mi plan de entrenamiento cuando lo necesite

Prioridad: Alta

Criterios de aceptacion:

- El cliente visualiza solo su rutina activa.
- Si la rutina es personalizada, el sistema muestra la version personalizada vigente.
- Si no tiene personalizado vigente, el sistema puede mostrar una rutina generica o de induccion asignada.
- El cliente no puede editar el contenido.

#### HU-27. Visualizacion del plan nutricional activo

- Como cliente
- Quiero ver mi plan nutricional activo
- Para consultar mis comidas y recomendaciones

Prioridad: Alta

Criterios de aceptacion:

- El cliente visualiza solo su plan nutricional activo.
- El portal muestra alimentos, cantidades y recomendaciones.
- Si no existe un plan activo, el portal muestra un mensaje claro.
- El cliente no puede editar el contenido.

#### HU-28. Visualizacion de anamnesis en modo lectura

- Como cliente
- Quiero consultar mi anamnesis
- Para revisar la informacion registrada sobre mi perfil deportivo y de salud

Prioridad: Media

Criterios de aceptacion:

- El cliente puede consultar su anamnesis en modo solo lectura.
- El cliente no puede editarla.
- El contenido se presenta organizado por secciones.

### 4.8. Recepcion y control de ingreso

#### HU-29. Consulta de cliente por cedula en recepcion

- Como recepcionista
- Quiero consultar un cliente por su cedula
- Para validar rapidamente si puede ingresar

Prioridad: Alta

Criterios de aceptacion:

- La consulta muestra nombre completo, cedula, sede principal y foto opcional.
- La consulta muestra el estado de acceso al gym.
- La consulta muestra fecha de vencimiento y congelacion si aplica.
- La consulta muestra el ultimo ingreso registrado.
- La consulta muestra alertas operativas no sensibles si existen.

#### HU-30. Registro de ingreso del cliente

- Como recepcionista
- Quiero registrar el ingreso del cliente a una sede
- Para llevar control de asistencia

Prioridad: Alta

Criterios de aceptacion:

- El sistema permite registrar multiples ingresos por dia.
- Cada ingreso guarda fecha, hora, sede y usuario que lo registro.
- El sistema permite registrar ingreso solo si la membresia gym esta habilitada.
- El ingreso queda visible en el historial del cliente.

#### HU-31. Creacion rapida de cliente desde recepcion

- Como recepcionista
- Quiero crear un cliente rapido con pocos datos
- Para no frenar la atencion cuando llegue una persona nueva

Prioridad: Media

Criterios de aceptacion:

- La recepcion puede crear un cliente con datos minimos.
- El sistema marca que el perfil requiere completarse despues.
- El dueno puede completar la informacion restante posteriormente.

### 4.9. Reportes basicos, historial y notificaciones

#### HU-32. Historial basico del cliente

- Como dueno
- Quiero ver el historial basico del cliente
- Para entender sus cambios recientes y su uso del sistema

Prioridad: Alta

Criterios de aceptacion:

- El historial incluye cambios de rutina.
- El historial incluye cambios de plan nutricional.
- El historial incluye ingresos registrados.
- El historial muestra fechas y usuario responsable cuando aplique.

#### HU-33. Conteos basicos por sede

- Como dueno
- Quiero ver conteos basicos por sede
- Para tener una vision operativa simple del negocio

Prioridad: Media

Criterios de aceptacion:

- El sistema muestra clientes activos por sede.
- El sistema muestra clientes vencidos o congelados por sede.
- El sistema muestra ingresos del dia por sede.
- El reporte es simple y no depende de analitica avanzada.

#### HU-34. Notificaciones de vencimiento por correo

- Como cliente
- Quiero recibir un aviso cuando mi servicio vaya a vencer
- Para tomar accion a tiempo

Prioridad: Media

Criterios de aceptacion:

- El sistema envia un correo dias antes del vencimiento.
- El sistema puede enviar un aviso el dia del vencimiento.
- El correo identifica el servicio que esta por vencer.
- El sistema evita envios duplicados innecesarios para la misma vigencia.

## 5. Historias que quedan fuera por ahora

- Facturacion completa.
- Caja o recaudo detallado.
- Reportes financieros avanzados.
- Registro de progreso por parte del cliente.
- Chat interno.
- App movil nativa.
- Calculo automatico de macros nutricionales.
- Automatizaciones complejas de asignacion.
- Auditoria avanzada o versionado completo de anamnesis.

## 6. Orden sugerido de construccion

1. Autenticacion y acceso.
2. Clientes, sedes y ficha unica.
3. Membresia gym, personalizado y nutricion.
4. Recepcion y control de ingreso.
5. Anamnesis deportiva.
6. Rutinas.
7. Nutricion.
8. Portal del cliente.
9. Historial y notificaciones.
