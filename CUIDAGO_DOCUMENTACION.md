# 📋 CuidaGo — Documentación Interna
> Última actualización: Junio 2026  
> Este documento reúne toda la lógica de negocio, políticas y reglas de la plataforma.

---

## 🏥 ¿Qué es CuidaGo?
Plataforma de servicios de enfermería domiciliaria que conecta pacientes con profesionales de la salud (enfermeros/as) para realizar prestaciones en el hogar como inyecciones, curaciones, sueros, controles y más.

---

## 💰 MODELO DE PAGOS

### Turno inmediato
- El paciente paga el total al confirmar el turno
- Mercado Pago aplica **captura diferida** — reserva el dinero sin cobrarlo
- Al finalizar el servicio (cuando paciente confirma) → MP libera con split:
  - **85%** → profesional
  - **15%** → CuidaGo
- Si se cancela antes → devolución total, sin cargo

### Turno reservado (a futuro)
- El paciente paga una **seña del 20%** al reservar → va a CuidaGo
- El **80% restante** se cobra automáticamente 30 minutos antes del turno
- Al finalizar → split del 80%:
  - **85%** → profesional (= 68% del total)
  - **15%** → CuidaGo (= 12% del total)
- **Resumen: CuidaGo recibe 20% seña + 12% del 80% = 32% del total**
- **Profesional recibe 68% del total**

### Cancelación por el PACIENTE
- Tanto turno inmediato como reservado → **penalidad del 20%** del total
- El 80% restante se devuelve
- La penalidad del 20% va a CuidaGo

### Cancelación por el PROFESIONAL
- La solicitud vuelve a estado `pendiente` para otro profesional disponible
- Se reofrece con la **misma tarifa, sin posibilidad de cambio**
- El paciente NO es notificado del cambio — solo recibe aviso cuando hay nuevo profesional asignado
- Si no aparece ningún profesional antes del turno → cancelación automática + devolución total de la seña al paciente

---

## 🚫 PENALIZACIONES A PROFESIONALES

### Regla de cancelaciones
- **2 cancelaciones de turnos reservados en la misma semana** → penalización automática
- El profesional queda bloqueado: no puede conectarse ni ver solicitudes

### Escala de penalizaciones
| Vez | Duración del bloqueo |
|-----|---------------------|
| 1ra | 12 horas |
| 2da | 24 horas |
| 3ra | 48 horas |
| 4ta+ | Revisión manual por CuidaGo |

### Notas
- El contador de cancelaciones se evalúa por semana calendario
- Una penalización anterior no suma si fue en otra semana
- CuidaGo puede levantar una penalización manualmente desde el panel admin
- Todas las penalizaciones y cancelaciones quedan registradas en Firestore

---

## ⭐ SISTEMA DE RESEÑAS

### Al finalizar cada servicio — el paciente califica al profesional:
- Estrellas del 1 al 5
- Comentario opcional (hasta 300 caracteres)
- La calificación actualiza el `promedioEstrellas` y `totalResenas` en el perfil del profesional
- Se muestra en la pantalla de explorar y en el perfil del profesional

### Encuesta de la app (una sola vez por usuario)
**Paciente responde:**
1. ¿Qué tan fácil fue pedir el servicio? ⭐
2. ¿El profesional llegó a tiempo? ⭐
3. ¿Cómo fue la atención recibida? ⭐
4. ¿Recomendarías CuidaGo? (Sí / No / Tal vez)
5. ¿Cómo calificás la app? ⭐

**Profesional responde:**
1. ¿La app es fácil de usar? ⭐
2. ¿La información del servicio fue clara? ⭐
3. ¿Cómo calificás el soporte de CuidaGo? ⭐
4. ¿Cómo te recibió el paciente en su domicilio? (Bien / Regular / Mal)
5. ¿Cómo calificás la app? ⭐

---

## 📅 SISTEMA DE AGENDA Y TURNOS

### Tipos de turno
- **Inmediato** — el paciente necesita atención ahora. El profesional online más cercano acepta.
- **Reservado** — el paciente elige fecha y hora (hasta 10 días adelante). Requiere pago de seña.

### Estados de una solicitud
| Estado | Descripción |
|--------|-------------|
| `pendiente` | Esperando que un profesional acepte |
| `aceptado` | Profesional aceptó, paciente debe pagar |
| `pagado` | Pago confirmado, esperando el turno |
| `en_curso` | Profesional en camino o en el domicilio |
| `completado` | Servicio finalizado y confirmado por ambos |
| `cancelado` | Cancelado por paciente o profesional |

### Dirección del paciente
- Para turnos reservados, la dirección del domicilio se muestra al profesional **30 minutos antes del turno**
- Junto con la dirección, se cobra el 80% restante automáticamente
- Ambos (paciente y profesional) reciben notificación 30 minutos antes

### Confirmación doble para finalizar
- El profesional cierra el turno desde su pantalla
- El paciente debe confirmar la finalización
- Solo cuando ambos confirman el turno pasa a `completado`
- Si el paciente no confirma, el turno no se cierra

---

## 🔔 NOTIFICACIONES

### Actualmente implementadas (requieren app abierta)
- 10 min antes del turno → profesional recibe alerta para salir
- 30 min antes del turno → ambos reciben aviso + se habilita la dirección
- Al ser reasignado un turno → paciente recibe aviso de nuevo profesional

### Pendientes (requieren Firebase Cloud Messaging — FCM)
- Push notifications cuando la app está cerrada
- Notificación de nueva solicitud disponible para profesionales
- Recordatorio de conectarse según disponibilidad configurada

---

## 📱 DISPONIBILIDAD DEL PROFESIONAL

- El profesional configura sus días y horarios habituales de trabajo
- Esta información **no es visible para los pacientes** — es un recordatorio personal
- Recibirá una notificación 10 min antes de su horario configurado para recordarle conectarse
- La disponibilidad se guarda en Firestore: `enfermeros/{uid}/disponibilidad`

---

## 🔐 PANEL DE ADMINISTRACIÓN

Acceso: `cuida-go.web.app/admin`  
Usuario: cuidagoargentina@gmail.com  

### Secciones disponibles
- **Resumen** — totales, facturación, top servicios
- **Usuarios** — pacientes y enfermeros, demografía, rangos de edad
- **Solicitudes** — estados, promedios de valor, historial
- **Enc. Pacientes** — resultados de encuestas de la app
- **Enc. Profesionales** — resultados de encuestas de la app
- **Reseñas** — todas las reseñas con comentarios y promedios
- **Penalizaciones** — activas, historial, opción de levantar manualmente

---

## ❓ PREGUNTAS FRECUENTES (BORRADOR)

### Para pacientes
**¿Cómo funciona CuidaGo?**
Pedís un servicio de enfermería, un profesional cercano acepta, pagás y el profesional va a tu domicilio.

**¿Qué pasa si cancelo mi turno?**
Se te cobra el 20% del total como penalidad. El 80% restante se devuelve.

**¿Puedo elegir al profesional?**
Sí, podés reservar con un profesional específico o dejar que el sistema asigne el más cercano disponible.

**¿La dirección de mi casa es segura?**
Tu dirección solo se comparte con el profesional asignado 30 minutos antes del turno.

**¿Qué pasa si el profesional cancela?**
Buscamos automáticamente un reemplazo con la misma tarifa. Si no encontramos uno, te devolvemos la seña.

### Para profesionales
**¿Cómo recibo mis pagos?**
A través de Mercado Pago. Necesitás conectar tu cuenta MP para recibir pagos automáticos.

**¿Cuánto cobra CuidaGo?**
En turnos inmediatos: 15% del total. En turnos reservados: tu ganancia es el 68% del total.

**¿Qué pasa si cancelo un turno reservado?**
Si cancelás 2 veces en la misma semana, tu cuenta queda bloqueada temporalmente (12hs la primera vez, 24hs la segunda, 48hs la tercera).

**¿Puedo configurar mis horarios?**
Sí, desde la sección "Disponibilidad" en tu agenda podés configurar tus días y horarios habituales.

---

## ⚖️ TÉRMINOS Y CONDICIONES (BORRADOR)

> *A completar con asesoramiento legal*

- CuidaGo actúa como plataforma intermediaria entre pacientes y profesionales independientes
- Los profesionales son trabajadores autónomos, no empleados de CuidaGo
- CuidaGo no se responsabiliza por errores médicos o negligencias profesionales
- Los profesionales deben contar con matrícula habilitante vigente
- El uso de la plataforma implica aceptación de estos términos

---

## 🛠️ PENDIENTES TÉCNICOS

- [ ] Integración completa con Mercado Pago Marketplace (captura diferida + split)
- [ ] Firebase Cloud Messaging para push notifications
- [ ] Cobro automático del 80% restante 30 min antes del turno
- [ ] Devolución automática de seña si no hay reemplazo
- [ ] Validación de matrícula de enfermeros al registrarse
- [ ] Sistema de soporte / chat con CuidaGo

---

*Documento de uso interno — CuidaGo Argentina 2026*
  
---

## 📜 TÉRMINOS Y CONDICIONES COMPLETOS

### 1. Sobre CuidaGo
CuidaGo es una plataforma digital que conecta pacientes con profesionales de enfermería independientes para la prestación de servicios de salud domiciliaria. CuidaGo actúa exclusivamente como intermediario tecnológico y no es empleador de los profesionales registrados. Los profesionales son trabajadores autónomos independientes.

### 2. Requisitos para registrarse como profesional
- Poseer matrícula habilitante vigente como enfermero/a
- Completar verificación de identidad mediante Didit (DNI + reconocimiento facial)
- Cargar título profesional (frente y dorso) y constancia de matrícula con QR de Mi Argentina
- Ser mayor de 18 años
- CuidaGo se reserva el derecho de rechazar o suspender cuentas que no cumplan estos requisitos

### 3. Geolocalización y rastreo en tiempo real
Al activar el estado "Conectado", el profesional autoriza expresamente:
- Su ubicación GPS sea transmitida en tiempo real a la plataforma
- Los pacientes con servicio activo puedan ver su ubicación en tiempo real
- La plataforma registre su última ubicación conocida, que permanece visible al desconectarse
El rastreo se activa solo cuando el profesional está "Conectado" y se detiene al desconectarse.

### 4. Servicios y tarifas
El profesional fija libremente sus tarifas. CuidaGo aplica una comisión por el uso de la plataforma. Los pagos se procesan a través de Mercado Pago con transferencia inmediata al completarse cada servicio.

### 5. Confidencialidad y protección de datos de pacientes
**El profesional tiene PROHIBIDO:**
- Solicitar, registrar o conservar datos personales del paciente (nombre completo, dirección, teléfono, DNI, historial médico) fuera de la plataforma
- Compartir datos del paciente con terceros bajo ninguna circunstancia
- Contactar al paciente por canales externos a CuidaGo para ofrecer servicios directos
- Utilizar información obtenida a través de la plataforma para fines distintos a la prestación del servicio contratado

El incumplimiento de esta cláusula puede resultar en la suspensión permanente de la cuenta y acciones legales.

### 6. Seguro de Mala Praxis
**Estado actual:** CuidaGo se encuentra en proceso de contratación de un seguro colectivo de responsabilidad civil profesional (mala praxis) para todos los profesionales registrados en la plataforma.

Hasta tanto se concrete dicha contratación, cada profesional es responsable de contar con su propio seguro de mala praxis vigente. Se recomienda contratar cobertura a través de **TPC Seguros** o **San Cristóbal Seguros**, compañías especializadas en responsabilidad civil para profesionales de enfermería.

Una vez contratado el seguro colectivo, todos los profesionales activos de CuidaGo quedarán automáticamente cubiertos y serán notificados por email.

### 7. Cancelaciones y penalizaciones
- 2 cancelaciones de turnos reservados en la misma semana → bloqueo automático
- Escala: 12hs (1ra vez), 24hs (2da), 48hs (3ra), revisión manual (4ta+)

### 8. Responsabilidad profesional
El profesional es el único responsable de la calidad y seguridad de los servicios de salud que brinda. CuidaGo no asume responsabilidad por errores, negligencias o daños derivados de la prestación.

---

## 🔒 POLÍTICA DE PRIVACIDAD COMPLETA

### 1. Datos que recopilamos
- Datos personales: nombre, DNI, fecha de nacimiento, domicilio, email, teléfono, matrícula
- Documentación: título profesional (frente/dorso), constancia de matrícula, QR Mi Argentina
- Datos biométricos: procesados por Didit (no almacenados por CuidaGo)
- Geolocalización GPS cuando el profesional está conectado

### 2. Verificación de identidad (Didit)
Los datos biométricos son procesados por Didit bajo sus propias políticas. CuidaGo solo recibe confirmación de verificación exitosa.

### 3. Uso de la geolocalización
- Conectar pacientes con profesionales cercanos
- Mostrar ubicación en tiempo real durante servicio activo
- Registrar última ubicación conocida para uso operativo
- NO se comparte con terceros ni se usa con fines publicitarios

### 4. Protección de datos de pacientes
CuidaGo aplica medidas estrictas para proteger los datos de los pacientes. Los profesionales no tienen acceso a datos personales del paciente más allá de lo necesario para prestar el servicio. Está expresamente prohibido el uso de esos datos fuera de la plataforma.

### 5. Datos de pagos
Procesados exclusivamente por Mercado Pago. CuidaGo no almacena datos bancarios ni de tarjetas.

### 6. Tus derechos
Podés acceder, rectificar o eliminar tus datos en cualquier momento contactando a cuidagoargentina@gmail.com.

### 7. Seguridad
Firebase Auth + Google Cloud encriptado + acceso restringido a información sensible.

### 8. Retención de datos
Datos conservados mientras la cuenta esté activa. Al eliminarla, se borran en 30 días (salvo obligaciones legales).

---

*Documento de uso interno — CuidaGo Argentina 2026*

---

## 📜 TÉRMINOS Y CONDICIONES DE USO

*Última actualización: Junio 2026*

### 1. Sobre CuidaGo
CuidaGo es una plataforma digital que conecta pacientes con profesionales de enfermería independientes para la prestación de servicios de salud domiciliaria. CuidaGo actúa exclusivamente como intermediario tecnológico y no es empleador de los profesionales registrados. Los profesionales son trabajadores autónomos independientes.

### 2. Requisitos para registrarse como profesional
- Poseer matrícula habilitante vigente como enfermero/a
- Completar verificación de identidad mediante Didit (DNI + reconocimiento facial)
- Cargar título profesional (frente y dorso) y constancia de matrícula con QR de Mi Argentina
- Ser mayor de 18 años
- CuidaGo se reserva el derecho de rechazar o suspender cuentas que no cumplan estos requisitos

### 3. Geolocalización y rastreo en tiempo real
Al activar "Conectado", el profesional autoriza expresamente:
- Su ubicación GPS sea transmitida en tiempo real a la plataforma
- Los pacientes con servicio activo puedan ver su ubicación en tiempo real
- La plataforma registre su última ubicación conocida, que permanece visible al desconectarse
El rastreo se activa solo cuando el profesional está "Conectado".

### 4. Servicios y pagos
El profesional fija libremente sus tarifas. Los pagos se procesan a través de Mercado Pago con transferencia inmediata al completarse el servicio. CuidaGo aplica una comisión por el uso de la plataforma.

### 5. Confidencialidad y canal de comunicación
Toda comunicación entre profesionales y pacientes debe realizarse exclusivamente a través de los canales habilitados por CuidaGo. El profesional se compromete a no facilitar al paciente sus datos de contacto personal —como teléfono, email u otras vías de comunicación directa—, con el objetivo de preservar la privacidad de ambas partes y asegurar que cada servicio cuente con el respaldo de la plataforma. Asimismo, el profesional tiene prohibido solicitar, registrar o conservar datos personales del paciente fuera de la plataforma, compartirlos con terceros, o utilizarlos para fines distintos a la prestación del servicio contratado. El incumplimiento puede resultar en la suspensión permanente de la cuenta.

### 6. Cancelaciones y penalizaciones
- 2 cancelaciones de turnos reservados en la misma semana → bloqueo automático
- Escala: 12hs (1ra vez), 24hs (2da), 48hs (3ra), revisión manual (4ta+)
- Las cancelaciones de turnos inmediatos no generan penalización

### 7. Responsabilidad profesional
El profesional es el único responsable de la calidad y seguridad de los servicios que brinda. CuidaGo no asume responsabilidad por errores, negligencias o daños derivados de la prestación.

### 8. Modificaciones y suspensión
CuidaGo se reserva el derecho de modificar estos términos con previo aviso de 15 días. CuidaGo puede suspender o eliminar cuentas que infrinjan estos términos.

---

## 🔒 POLÍTICA DE PRIVACIDAD

*Última actualización: Junio 2026*

### 1. Datos que recopilamos
Nombre completo, DNI, fecha de nacimiento, domicilio, email, teléfono, matrícula, título profesional (frente/dorso), constancia de matrícula, QR Mi Argentina, datos biométricos procesados por Didit, y geolocalización GPS cuando está conectado.

### 2. Verificación de identidad (Didit)
Los datos biométricos son procesados por Didit. CuidaGo solo recibe confirmación de verificación exitosa, sin almacenar datos biométricos.

### 3. Uso de la geolocalización
Conectar pacientes con profesionales, mostrar ubicación en tiempo real durante servicios activos, y registrar última ubicación para uso operativo. No se comparte con terceros ni se usa con fines publicitarios.

### 4. Documentación profesional
Almacenada en Firebase Storage con acceso restringido. Usada solo por el equipo CuidaGo para validar credenciales. No se comparte con pacientes ni terceros.

### 5. Datos de pagos
Procesados por Mercado Pago. CuidaGo no almacena datos bancarios ni de tarjetas.

### 6. Compartir datos con terceros
CuidaGo no vende datos personales. Pueden ser compartidos con Mercado Pago, Didit, y autoridades si la ley lo requiere.

### 7. Tus derechos
Podés acceder, rectificar o eliminar tus datos contactando a cuidagoargentina@gmail.com.

### 8. Seguridad
Firebase Auth + Google Cloud encriptado + acceso restringido.

### 9. Retención de datos
Datos conservados mientras la cuenta esté activa. Al eliminarla, se borran en 30 días (salvo obligaciones legales).

---

*Documento de uso interno — CuidaGo Argentina 2026*

---

## 👤 TÉRMINOS Y CONDICIONES — USUARIOS/PACIENTES

*Última actualización: Junio 2026*

### 1. Aceptación
Al crear una cuenta en Cuida Go como usuario/paciente, aceptás los presentes Términos y Condiciones y la Política de Privacidad. Si no estás de acuerdo, no podés utilizar la plataforma.

### 2. Descripción del servicio
Cuida Go es una plataforma digital que conecta usuarios que requieren atención de enfermería domiciliaria con profesionales matriculados e independientes. Cuida Go actúa como intermediario tecnológico y **no presta directamente servicios de salud**. Los profesionales son trabajadores independientes y son responsables de la atención brindada.

### 3. Verificación de identidad
Para garantizar la seguridad de todos los usuarios, realizamos una verificación de identidad mediante escaneo del DNI y selfie en tiempo real, a través del servicio Didit. Esta información es procesada de forma segura y encriptada, y se utiliza exclusivamente para validar la identidad del usuario.

### 4. Uso de datos personales y de salud
Los datos cargados en Cuida Go — nombre, DNI, domicilio, contacto de emergencia e información de salud — se utilizan exclusivamente para facilitar la prestación del servicio. **Nunca se venden ni se comparten con terceros con fines comerciales.** Los datos de salud son tratados con el máximo nivel de confidencialidad.

### 5. Geolocalización
La app utiliza la ubicación en tiempo real para mostrar profesionales disponibles y permitir que el enfermero llegue al domicilio. La ubicación es visible solo para el profesional asignado durante el servicio activo. Al desconectarse, se registra la última ubicación conocida. El GPS puede desactivarse desde la configuración del dispositivo, aunque puede limitar funcionalidades.

### 6. Pagos y transferencias
Los pagos se realizan de forma digital a través de la plataforma. Una vez confirmado el servicio, el pago se transfiere de manera instantánea al profesional. En caso de cancelaciones, se aplica la política de cancelación vigente.

### 7. Responsabilidad del usuario
El usuario se compromete a:
- Brindar información veraz y actualizada
- Tratar con respeto a los profesionales
- No compartir su cuenta con terceros
- Comunicar incidencias a través de los canales de soporte de Cuida Go
- No contactar al profesional por fuera de la plataforma para coordinar servicios

### 8. Confidencialidad del profesional
Los profesionales tienen prohibido compartir datos del paciente con terceros, contactarlos por canales fuera de la plataforma o usar su información para fines distintos al servicio. Ante incumplimientos, reportar a soporte@cuida-go.com.

### 9. Contacto de emergencia
El contacto de emergencia registrado en el perfil puede ser notificado en situaciones de riesgo durante el servicio, a criterio del profesional actuante.

### 10. Modificaciones
Cuida Go puede modificar estos términos en cualquier momento. Los cambios serán notificados por correo electrónico y/o dentro de la aplicación.

### 11. Política de Privacidad — Pacientes

**Datos que recopilamos:** nombre, DNI, fecha de nacimiento, género, email, teléfono, domicilio, contacto de emergencia, ubicación GPS e imágenes del DNI (frente y dorso).

**Finalidad:** verificar identidad, conectar con profesionales, gestionar pagos y mejorar el servicio.

**Verificación de identidad (Didit):** los datos biométricos son procesados por Didit. Cuida Go solo recibe confirmación de verificación exitosa, sin almacenar datos biométricos.

**Geolocalización:** usada para conectar pacientes con profesionales cercanos. No se comparte con terceros ni se usa con fines publicitarios.

**Almacenamiento:** datos guardados en servidores seguros con encriptación. Las imágenes del DNI se usan solo para la verificación.

**Datos de pagos:** procesados por Mercado Pago. Cuida Go no almacena datos bancarios ni de tarjetas.

**Compartir con terceros:** no se venden datos. Pueden compartirse con Mercado Pago, Didit y autoridades si la ley lo requiere.

**Derechos:** podés solicitar acceso, rectificación o eliminación de tus datos escribiendo a soporte@cuida-go.com.

**Retención:** datos conservados mientras la cuenta esté activa. Al eliminarla, se borran en 30 días salvo obligaciones legales.

---

*Documento de uso interno — Cuida Go Argentina 2026*
