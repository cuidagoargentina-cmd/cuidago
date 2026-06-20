// functions/index.js

const functions  = require('firebase-functions/v1');
const { defineSecret } = require('firebase-functions/params');
const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db        = admin.firestore();
const messaging = admin.messaging();

const diditSecret = defineSecret('DIDIT_CONFIG');
const smtpSecret  = defineSecret('SMTP_CONFIG');

const DIDIT_FLOW_ID = 'c957f452-d5a7-4d42-9ee9-20084cb0b416';

// 🔑 Mercado Pago — credenciales de PRUEBA
// Cuando estés lista para producción, reemplazá por las credenciales de producción
const MP_ACCESS_TOKEN = 'APP_USR-1434992143770292-061215-e33f34e6af38b057e900e1f4f8f8aefa-3470155680';

// ── Header HTML compartido para todos los emails ──
const emailHeader = `
  <div style="background:#ffffff;text-align:center;padding:28px 20px 16px;">
    <img src="https://cuida-go.web.app/logo.png" alt="Cuida Go" style="height:70px;object-fit:contain;" />
    <p style="margin:8px 0 0;font-size:12px;font-weight:700;letter-spacing:2px;color:#3c5e56;text-transform:uppercase;">SALUD EN TU HOGAR</p>
    <div style="margin:16px auto 0;height:2px;width:60px;background:linear-gradient(90deg,#3c5e56,#b71c1c);border-radius:2px;"></div>
  </div>
`;

function crearTransporter(smtpConfig) {
  return nodemailer.createTransport({
    host:   smtpConfig.host,
    port:   smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth:   { user: smtpConfig.user, pass: smtpConfig.pass }
  });
}

// ═══════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════

exports.nuevaSolicitud = functions.region('southamerica-east1').firestore
  .document('solicitudes/{solicitudId}')
  .onCreate(async (snap, context) => {
    const solicitud   = snap.data();
    const solicitudId = context.params.solicitudId;
    if (solicitud.estado !== 'pendiente') return null;
    try {
      let tokensANotificar = [];
      if (solicitud.enfermeroId && solicitud.enfermeroId !== null) {
        const enfSnap = await db.collection('enfermeros').doc(solicitud.enfermeroId).get();
        if (enfSnap.exists) {
          const enf = enfSnap.data();
          if (enf.fcmToken) tokensANotificar.push({ token: enf.fcmToken });
        }
      } else {
        const enfSnapshot = await db.collection('enfermeros')
          .where('isOnline', '==', true)
          .where('estado', '==', 'activo')
          .get();
        enfSnapshot.forEach(doc => {
          const enf = doc.data();
          if (enf.fcmToken) tokensANotificar.push({ token: enf.fcmToken });
        });
      }
      if (tokensANotificar.length === 0) return null;
      const serviciosPrincipal = solicitud.servicios?.[0] || 'Atención domiciliaria';
      const titulo = '¡Nueva Solicitud en Cuida Go!';
      const cuerpo = `Paciente: ${solicitud.pacienteNombre}. Servicio: ${serviciosPrincipal}. ${solicitud.tipo === 'ahora' ? 'Atención inmediata.' : `Reserva: ${solicitud.fechaReserva} ${solicitud.horaReserva}hs.`}`;
      await Promise.all(tokensANotificar.map(async ({ token }) => {
        try {
          return await messaging.send({
            token,
            notification: { title: titulo, body: cuerpo },
            data: { solicitudId, tipo: solicitud.tipo || 'ahora', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            webpush: {
              notification: {
                title: titulo, body: cuerpo,
                icon:  'https://cuida-go.web.app/icon-192.png',
                badge: 'https://cuida-go.web.app/icon-192.png',
                vibrate: [500, 200, 500], requireInteraction: true,
                actions: [{ action: 'ver', title: 'Ver solicitud' }, { action: 'cerrar', title: 'Cerrar' }]
              },
              fcmOptions: { link: `https://cuida-go.web.app/profesional/alerta?id=${solicitudId}` }
            }
          });
        } catch (err) { console.error('Error notificación:', err.message); return null; }
      }));
      return null;
    } catch (error) { console.error('Error nuevaSolicitud:', error); return null; }
  });

exports.solicitudActualizada = functions.region('southamerica-east1').firestore
  .document('solicitudes/{solicitudId}')
  .onUpdate(async (change, context) => {
    const antes  = change.before.data();
    const despues = change.after.data();
    if (antes.estado === despues.estado) return null;
    if (despues.estado === 'aceptado' && antes.estado === 'pendiente') {
      try {
        const pacienteSnap = await db.collection('pacientes').doc(despues.pacienteId).get();
        if (!pacienteSnap.exists) return null;
        const paciente = pacienteSnap.data();
        if (!paciente.fcmToken) return null;
        await messaging.send({
          token: paciente.fcmToken,
          notification: { title: '¡Tu solicitud fue aceptada!', body: 'Un enfermero aceptó tu solicitud. Revisá la oferta y confirmala.' },
          webpush: {
            notification: { icon: 'https://cuida-go.web.app/icon-192.png', requireInteraction: true },
            fcmOptions: { link: 'https://cuida-go.web.app/paciente/turnos' }
          }
        });
      } catch (error) { console.error('Error notificando paciente:', error); }
    }
    return null;
  });

// ═══════════════════════════════════════
// EMAILS AUTOMÁTICOS
// ═══════════════════════════════════════

exports.emailBienvenida = functions
  .runWith({ secrets: [smtpSecret] })
  .firestore.document('enfermeros/{uid}')
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!data.email) return null;
    let smtpConfig;
    try { smtpConfig = JSON.parse(smtpSecret.value()); } catch { return null; }
    const transporter = crearTransporter(smtpConfig);
    const nombre = data.primerNombre || data.nombre?.split(' ')[0] || 'Profesional';
    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:#ffffff;text-align:center;padding:32px 20px 16px;">${emailHeader}</td></tr>
        <tr><td style="padding:32px 40px 24px;">
          <h1 style="font-size:26px;font-weight:800;color:#1e293b;margin:0 0 12px;">¡Bienvenido/a, ${nombre}!</h1>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">Tu registro en <strong>Cuida Go</strong> fue completado exitosamente.</p>
          <div style="background:#f0fdf4;border-left:4px solid #3c5e56;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-weight:800;color:#166534;font-size:14px;">📋 ¿Qué sigue ahora?</p>
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">Nuestro equipo está revisando tu documentación y matrícula profesional.<br>Este proceso puede demorar hasta <strong>48 horas hábiles</strong>.<br>Te notificaremos por este mismo correo cuando tu perfil esté activo.</p>
          </div>
          <div style="text-align:center;margin-top:32px;">
            <a href="https://cuida-go.web.app" style="display:inline-block;background:linear-gradient(135deg,#3c5e56,#2d4b3c);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:14px;font-size:15px;font-weight:800;">Abrir la app →</a>
          </div>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Si tenés alguna consulta escribinos a <a href="mailto:soporte@cuida-go.com" style="color:#3c5e56;">soporte@cuida-go.com</a><br>© 2025 Cuida Go — Salud en tu hogar</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    try {
      await transporter.sendMail({ from: '"Cuida Go" <noreply@cuida-go.com>', to: data.email, subject: '¡Bienvenido/a a Cuida Go! Tu registro fue completado', html });
    } catch (err) { console.error('Error enviando email bienvenida:', err.message); }
    return null;
  });

exports.emailAprobacion = functions
  .runWith({ secrets: [smtpSecret] })
  .firestore.document('enfermeros/{uid}')
  .onUpdate(async (change) => {
    const antes  = change.before.data();
    const despues = change.after.data();
    if (antes.estado === despues.estado || despues.estado !== 'activo') return null;
    if (!despues.email) return null;
    let smtpConfig;
    try { smtpConfig = JSON.parse(smtpSecret.value()); } catch { return null; }
    const transporter = crearTransporter(smtpConfig);
    const nombre = despues.primerNombre || despues.nombre?.split(' ')[0] || 'Profesional';
    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:#ffffff;text-align:center;padding:32px 20px 16px;">${emailHeader}</td></tr>
        <tr><td style="padding:32px 40px 24px;text-align:center;">
          <h1 style="font-size:26px;font-weight:800;color:#166534;margin:0 0 12px;">¡Tu perfil fue aprobado!</h1>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">Hola <strong>${nombre}</strong>, ya podés comenzar a recibir solicitudes en <strong>Cuida Go</strong>.</p>
          <a href="https://cuida-go.web.app" style="display:inline-block;background:linear-gradient(135deg,#3c5e56,#2d4b3c);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:14px;font-size:15px;font-weight:800;">Abrir la app →</a>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Consultas a <a href="mailto:soporte@cuida-go.com" style="color:#3c5e56;">soporte@cuida-go.com</a><br>© 2025 Cuida Go — Salud en tu hogar</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    try {
      await transporter.sendMail({ from: '"Cuida Go" <noreply@cuida-go.com>', to: despues.email, subject: '✅ ¡Tu perfil en Cuida Go fue aprobado!', html });
    } catch (err) { console.error('Error enviando email aprobación:', err.message); }
    return null;
  });

// ═══════════════════════════════════════
// DIDIT - Verificación de identidad KYC
// ═══════════════════════════════════════

exports.crearSesionDidit = functions
  .runWith({ secrets: [diditSecret] })
  .https.onRequest((req, res) => {
    const cors = require('cors')({ origin: true });
    cors(req, res, async () => {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
      const { referencia } = req.body;
      if (!referencia) return res.status(400).json({ error: 'Falta referencia' });
      try {
        const secretValue = diditSecret.value();
        let apiKey;
        try { const parsed = JSON.parse(secretValue); apiKey = parsed?.didit?.api_key || secretValue; } catch (e) { apiKey = secretValue; }
        if (!apiKey) throw new Error('API key no encontrada');
        const sessionResponse = await fetch('https://verification.didit.me/v3/session/', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'accept': 'application/json' },
          body: JSON.stringify({ workflow_id: DIDIT_FLOW_ID, vendor_data: referencia, redirect_url: 'https://cuida-go.web.app/verificacion?verified=1', callback: 'https://cuida-go.web.app/verificacion?verified=1' })
        });
        const sessionText = await sessionResponse.text();
        if (!sessionResponse.ok) throw new Error(`Error sesión Didit: ${sessionText}`);
        const sessionData = JSON.parse(sessionText);
        return res.status(200).json({ url: sessionData.url || sessionData.session_url, session_id: sessionData.session_id || sessionData.id });
      } catch (error) { console.error('Error crearSesionDidit:', error.message); return res.status(500).json({ error: error.message }); }
    });
  });

exports.webhookDidit = functions.https.onRequest((req, res) => {
  const cors = require('cors')({ origin: true });
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(200).send('OK');
    try {
      const { session_id, status, vendor_data } = req.body;
      if (status && status.toUpperCase() === 'APPROVED') {
        let snap = await db.collection('enfermeros').where('email', '==', vendor_data).limit(1).get();
        if (snap.empty) snap = await db.collection('enfermeros').where('telefono', '==', vendor_data).limit(1).get();
        if (!snap.empty) {
          await snap.docs[0].ref.update({ identidadVerificada: true, diditSessionId: session_id, fechaVerificacion: new Date().toISOString(), estado: 'pendiente_validacion' });
          return res.status(200).send('OK');
        }
        let snapP = await db.collection('pacientes').where('email', '==', vendor_data).limit(1).get();
        if (snapP.empty) snapP = await db.collection('pacientes').where('telefono', '==', vendor_data).limit(1).get();
        if (!snapP.empty) {
          await snapP.docs[0].ref.update({ identidadVerificada: true, diditSessionId: session_id, fechaVerificacion: new Date().toISOString() });
          return res.status(200).send('OK');
        }
      }
      return res.status(200).send('OK');
    } catch (error) { console.error('Error webhook Didit:', error); return res.status(500).send('Error interno'); }
  });
});

exports.crearSesionDiditPaciente = functions
  .runWith({ secrets: [diditSecret] })
  .https.onRequest((req, res) => {
    const cors = require('cors')({ origin: true });
    cors(req, res, async () => {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
      const { referencia } = req.body;
      if (!referencia) return res.status(400).json({ error: 'Falta referencia' });
      try {
        const secretValue = diditSecret.value();
        let apiKey;
        try { const parsed = JSON.parse(secretValue); apiKey = parsed?.didit?.api_key || secretValue; } catch (e) { apiKey = secretValue; }
        if (!apiKey) throw new Error('API key no encontrada');
        const sessionResponse = await fetch('https://verification.didit.me/v3/session/', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'accept': 'application/json' },
          body: JSON.stringify({ workflow_id: 'c957f452-d5a7-4d42-9ee9-20084cb0b416', vendor_data: referencia, redirect_url: 'https://cuida-go.web.app/verificacion?verified=1', callback: 'https://cuida-go.web.app/verificacion?verified=1' })
        });
        const sessionText = await sessionResponse.text();
        if (!sessionResponse.ok) throw new Error(`Error sesión Didit: ${sessionText}`);
        const sessionData = JSON.parse(sessionText);
        return res.status(200).json({ url: sessionData.url || sessionData.session_url, session_id: sessionData.session_id || sessionData.id });
      } catch (error) { console.error('Error crearSesionDiditPaciente:', error.message); return res.status(500).json({ error: error.message }); }
    });
  });

exports.webhookDiditPaciente = functions.https.onRequest((req, res) => {
  const cors = require('cors')({ origin: true });
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(200).send('OK');
    try {
      const { session_id, status, vendor_data } = req.body;
      if (status && status.toUpperCase() === 'APPROVED') {
        let snapshot = await db.collection('pacientes').where('email', '==', vendor_data).limit(1).get();
        if (snapshot.empty) snapshot = await db.collection('pacientes').where('telefono', '==', vendor_data).limit(1).get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({ identidadVerificada: true, diditSessionId: session_id, fechaVerificacion: new Date().toISOString() });
        }
      }
      return res.status(200).send('OK');
    } catch (error) { console.error('Error webhook Didit paciente:', error); return res.status(500).send('Error interno'); }
  });
});

// ═══════════════════════════════════════
// EMAIL BIENVENIDA PACIENTE
// ═══════════════════════════════════════

exports.emailBienvenidaPaciente = functions
  .runWith({ secrets: [smtpSecret] })
  .firestore.document('pacientes/{uid}')
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!data.email) return null;
    let smtpConfig;
    try { smtpConfig = JSON.parse(smtpSecret.value()); } catch { return null; }
    const transporter = crearTransporter(smtpConfig);
    const nombre = data.primerNombre || data.nombre?.split(' ')[0] || 'Usuario';
    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:#ffffff;text-align:center;padding:32px 20px 16px;">${emailHeader}</td></tr>
        <tr><td style="padding:32px 40px 24px;">
          <h1 style="font-size:26px;font-weight:800;color:#1e293b;margin:0 0 12px;">¡Bienvenido/a, ${nombre}!</h1>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">Tu cuenta en <strong>Cuida Go</strong> está activa. Ya podés buscar profesionales de enfermería disponibles cerca tuyo.</p>
          <div style="text-align:center;margin-top:32px;">
            <a href="https://cuida-go.web.app" style="display:inline-block;background:linear-gradient(135deg,#3c5e56,#2d4b3c);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:14px;font-size:15px;font-weight:800;">Abrir la app →</a>
          </div>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Consultas a <a href="mailto:soporte@cuida-go.com" style="color:#3c5e56;">soporte@cuida-go.com</a><br>© 2025 Cuida Go — Salud en tu hogar</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    try {
      await transporter.sendMail({ from: '"Cuida Go" <noreply@cuida-go.com>', to: data.email, subject: '¡Bienvenido/a a Cuida Go! Tu cuenta está lista', html });
    } catch (err) { console.error('Error enviando email bienvenida paciente:', err.message); }
    return null;
  });

// ═══════════════════════════════════════
// MERCADO PAGO — Crear Preferencia de Pago
// ═══════════════════════════════════════

exports.crearPreferenciaMercadoPago = functions
  .region('southamerica-east1')
  .https.onRequest((req, res) => {
    const cors = require('cors')({ origin: true });
    cors(req, res, async () => {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
      const { solicitudId, monto, descripcion, pacienteEmail } = req.body;
      if (!solicitudId || !monto) return res.status(400).json({ error: 'Faltan datos' });
      try {
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
          body: JSON.stringify({
            items: [{ title: descripcion || 'Servicio de enfermería - Cuida Go', quantity: 1, unit_price: Number(monto), currency_id: 'ARS' }],
            payer: { email: pacienteEmail || 'paciente@cuida-go.com' },
            back_urls: {
              success: `https://cuida-go.web.app/paciente/pago-exitoso?id=${solicitudId}`,
              failure: `https://cuida-go.web.app/paciente/turnos`,
              pending: `https://cuida-go.web.app/paciente/turnos`
            },
            auto_return: 'approved',
            external_reference: solicitudId,
            statement_descriptor: 'CUIDA GO',
            notification_url: 'https://southamerica-east1-cuida-go.cloudfunctions.net/webhookMercadoPago'
          })
        });
        const data = await response.json();
        if (!response.ok) { console.error('Error MP:', data); return res.status(500).json({ error: 'Error al crear preferencia', detalle: data }); }
        return res.status(200).json({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point, preference_id: data.id });
      } catch (error) { console.error('Error crearPreferenciaMercadoPago:', error); return res.status(500).json({ error: error.message }); }
    });
  });

// ═══════════════════════════════════════
// MERCADO PAGO — Webhook
// ═══════════════════════════════════════

exports.webhookMercadoPago = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    try {
      const { type, data } = req.body;
      if (type !== 'payment') return res.status(200).send('OK');
      const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const pago = await pagoRes.json();
      if (pago.status === 'approved') {
        const solicitudId = pago.external_reference;
        if (solicitudId) {
          await db.collection('solicitudes').doc(solicitudId).update({
            estado: 'pagado',
            fechaPago: new Date().toISOString(),
            mpPaymentId: String(data.id),
            mpStatus: pago.status
          });
          console.log(`Pago aprobado para solicitud ${solicitudId}`);
        }
      }
      return res.status(200).send('OK');
    } catch (error) { console.error('Error webhookMercadoPago:', error); return res.status(500).send('Error'); }
  });