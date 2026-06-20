import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TerminosEnfermero() {
  const navigate = useNavigate()
  const [aceptaTerminos, setAceptaTerminos]     = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)
  const [seccion, setSeccion]                   = useState(null)

  const puedeRegistrarse = aceptaTerminos && aceptaPrivacidad

  if (seccion === 'terminos') {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: '600px', margin: '0 auto', padding: '24px 20px 60px' }}>
        <button onClick={() => setSeccion(null)}
          style={{ background: 'none', border: 'none', color: 'var(--verde-logo)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-arrow-left"></i> Volver
        </button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Términos y Condiciones de Uso</h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '28px' }}>Última actualización: Junio 2026</p>

        {[
          {
            titulo: '1. Sobre CuidaGo',
            texto: 'CuidaGo es una plataforma digital que conecta pacientes con profesionales de enfermería independientes para la prestación de servicios de salud domiciliaria. CuidaGo actúa exclusivamente como intermediario tecnológico y no es empleador de los profesionales registrados en la plataforma. Los profesionales son trabajadores autónomos que ofrecen sus servicios de manera independiente.'
          },
          {
            titulo: '2. Requisitos para registrarse como profesional',
            texto: 'Para operar en CuidaGo, el profesional debe: (a) poseer matrícula habilitante vigente como enfermero/a; (b) completar el proceso de verificación de identidad mediante escaneo de DNI y reconocimiento facial a través de Didit; (c) cargar documentación válida (título profesional y constancia de matrícula con código QR de Mi Argentina); (d) ser mayor de 18 años. CuidaGo se reserva el derecho de rechazar o suspender cuentas que no cumplan estos requisitos.'
          },
          {
            titulo: '3. Geolocalización y rastreo en tiempo real',
            texto: 'Al activar el estado "Conectado" en la app, el profesional autoriza expresamente que: (a) su ubicación GPS sea transmitida en tiempo real a la plataforma; (b) los pacientes con una solicitud activa puedan ver su ubicación en tiempo real; (c) la plataforma registre su última ubicación conocida, que permanecerá visible aunque el profesional se desconecte. El rastreo GPS se activa únicamente cuando el profesional está en estado "Conectado" y se detiene al desconectarse. La última ubicación registrada se conserva por razones operativas y de seguridad.'
          },
          {
            titulo: '4. Servicios y pagos',
            texto: 'El profesional fija libremente sus tarifas por servicio. Los pagos se procesan a través de Mercado Pago con transferencia inmediata al completarse el servicio. Para recibir pagos, el profesional debe vincular su cuenta de Mercado Pago activa en la plataforma. CuidaGo aplica una comisión por el uso de la plataforma.'
          },
          {
            titulo: '5. Confidencialidad y canal de comunicación',
            texto: 'Para garantizar la seguridad y calidad del servicio, toda comunicación entre profesionales y pacientes debe realizarse exclusivamente a través de los canales habilitados por CuidaGo. El profesional se compromete a no facilitar al paciente sus datos de contacto personal —como teléfono, email u otras vías de comunicación directa—, con el objetivo de preservar la privacidad de ambas partes y asegurar que cada servicio cuente con el respaldo y la protección que ofrece la plataforma. Asimismo, el profesional tiene prohibido solicitar, registrar o conservar datos personales del paciente fuera de la plataforma, compartirlos con terceros, o utilizarlos para fines distintos a la prestación del servicio contratado. El incumplimiento de esta cláusula puede resultar en la suspensión permanente de la cuenta.'
          },
          {
            titulo: '6. Cancelaciones y penalizaciones',
            texto: 'Si un profesional cancela 2 turnos reservados en la misma semana calendario, su cuenta será bloqueada temporalmente de forma automática: 12 horas la primera vez, 24 horas la segunda, 48 horas la tercera. A partir de la cuarta cancelación, la situación será revisada manualmente por el equipo de CuidaGo. Las cancelaciones de turnos inmediatos no generan penalización.'
          },
          {
            titulo: '7. Responsabilidad profesional',
            texto: 'El profesional es el único responsable de la calidad y seguridad de los servicios de salud que brinda. CuidaGo no asume responsabilidad por errores, negligencias o daños derivados de la prestación de servicios. El profesional debe contar con el equipamiento necesario y actuar conforme a la normativa vigente en materia de salud.'
          },
          {
            titulo: '8. Modificaciones y suspensión',
            texto: 'CuidaGo se reserva el derecho de modificar estos términos con previo aviso de 15 días. El uso continuado de la plataforma implica la aceptación de los nuevos términos. CuidaGo puede suspender o eliminar cuentas que infrinjan estos términos, con o sin previo aviso según la gravedad de la infracción.'
          }
        ].map(({ titulo, texto }) => (
          <div key={titulo} style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{titulo}</h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.7, margin: 0 }}>{texto}</p>
          </div>
        ))}
      </div>
    )
  }

  if (seccion === 'privacidad') {
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: '600px', margin: '0 auto', padding: '24px 20px 60px' }}>
        <button onClick={() => setSeccion(null)}
          style={{ background: 'none', border: 'none', color: 'var(--verde-logo)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-arrow-left"></i> Volver
        </button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Política de Privacidad</h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '28px' }}>Última actualización: Junio 2026</p>

        {[
          {
            titulo: '1. Datos que recopilamos',
            texto: 'Al registrarte como profesional en CuidaGo, recopilamos: nombre completo, DNI, fecha de nacimiento, domicilio, email, teléfono, número de matrícula, fotografía de perfil, título profesional (frente y dorso), constancia de matrícula (foto y código QR de Mi Argentina), datos biométricos de verificación (procesados por Didit), y datos de geolocalización GPS cuando el profesional está conectado.'
          },
          {
            titulo: '2. Verificación de identidad (Didit)',
            texto: 'Para verificar tu identidad utilizamos el servicio de Didit (verify.didit.me). Durante este proceso, Didit procesa el escaneo de tu DNI y una selfie con reconocimiento facial. Estos datos biométricos son procesados por Didit bajo sus propias políticas de privacidad y no son almacenados directamente por CuidaGo. CuidaGo únicamente recibe la confirmación de que la identidad fue verificada exitosamente.'
          },
          {
            titulo: '3. Uso de la geolocalización',
            texto: 'La ubicación GPS del profesional se utiliza exclusivamente para: (a) conectar con pacientes que necesitan atención en el área; (b) mostrar en tiempo real la ubicación al paciente durante un servicio activo; (c) registrar la última ubicación conocida para uso operativo. La ubicación NO se comparte con terceros ni se utiliza con fines publicitarios. El profesional puede detener el rastreo desconectándose de la plataforma.'
          },
          {
            titulo: '4. Documentación profesional',
            texto: 'Las imágenes del título profesional y constancia de matrícula se almacenan de forma segura en Firebase Storage (Google) con acceso restringido. Son utilizadas únicamente por el equipo de CuidaGo para validar las credenciales del profesional. No se comparten con pacientes ni con terceros.'
          },
          {
            titulo: '5. Datos de pagos',
            texto: 'Los pagos son procesados por Mercado Pago. CuidaGo no almacena datos de tarjetas de crédito ni información bancaria sensible. Los datos de transacciones se conservan para fines contables y de soporte.'
          },
          {
            titulo: '6. Compartir datos con terceros',
            texto: 'CuidaGo no vende ni cede datos personales a terceros con fines comerciales. Los datos pueden ser compartidos con: (a) Mercado Pago para procesar pagos; (b) Didit para verificación de identidad; (c) autoridades competentes si fuera requerido por ley.'
          },
          {
            titulo: '7. Tus derechos',
            texto: 'Tenés derecho a acceder, rectificar o eliminar tus datos personales en cualquier momento. Para ejercer estos derechos podés contactarnos a través de la sección de Ayuda de la app o escribirnos a cuidagoargentina@gmail.com. La eliminación de la cuenta implica la baja de todos los datos asociados.'
          },
          {
            titulo: '8. Seguridad',
            texto: 'Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos: autenticación con Firebase Auth, almacenamiento encriptado en Google Cloud y acceso restringido a la información sensible. En caso de una brecha de seguridad, notificaremos a los usuarios afectados dentro de las 72 horas.'
          },
          {
            titulo: '9. Retención de datos',
            texto: 'Los datos del profesional se conservan mientras la cuenta esté activa. Al eliminar la cuenta, los datos personales se eliminan en un plazo de 30 días, excepto aquellos que deban conservarse por obligaciones legales o contables.'
          }
        ].map(({ titulo, texto }) => (
          <div key={titulo} style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{titulo}</h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.7, margin: 0 }}>{texto}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: '500px', margin: '0 auto', padding: '24px 20px 60px', minHeight: '100vh' }}>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ width: '56px', height: '56px', background: 'var(--verde-logo)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 20px rgba(26,83,92,0.2)' }}>
          <i className="fa-solid fa-user-nurse" style={{ fontSize: '1.5rem', color: 'white' }}></i>
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Antes de registrarte</h1>
        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
          Leé y aceptá los términos para continuar con tu registro como profesional en CuidaGo.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {[
          { icon: 'fa-location-dot',       color: '#0284c7', bg: '#e0f2fe', titulo: 'Geolocalización en tiempo real', desc: 'Mientras estés conectado, tu ubicación GPS es visible para los pacientes con servicio activo. Al desconectarte, queda registrada tu última ubicación.' },
          { icon: 'fa-money-bill-transfer', color: '#16a34a', bg: '#dcfce7', titulo: 'Pagos instantáneos',             desc: 'Al completar cada servicio recibís el pago automáticamente en tu cuenta de Mercado Pago de forma inmediata.' },
          { icon: 'fa-shield-halved',       color: '#7c3aed', bg: '#ede9fe', titulo: 'Verificación de identidad',      desc: 'Tu DNI y datos biométricos son verificados por Didit de forma segura. CuidaGo no almacena tus datos biométricos.' },
          { icon: 'fa-bell',                color: '#d97706', bg: '#fef3c7', titulo: 'Notificaciones',                 desc: 'Necesitamos enviarte notificaciones para alertarte de nuevas solicitudes y turnos. Te pediremos permiso al iniciar la app.' },
        ].map(({ icon, color, bg, titulo, desc }) => (
          <div key={titulo} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color, fontSize: '1.1rem' }}>
              <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{titulo}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={aceptaTerminos} onChange={e => setAceptaTerminos(e.target.checked)}
            style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: 'var(--verde-logo)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
            Leí y acepto los{' '}
            <span onClick={e => { e.preventDefault(); setSeccion('terminos') }}
              style={{ color: 'var(--verde-logo)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
              Términos y Condiciones de Uso
            </span>
            {' '}de CuidaGo, incluyendo las políticas de geolocalización, pagos y cancelaciones.
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={aceptaPrivacidad} onChange={e => setAceptaPrivacidad(e.target.checked)}
            style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: 'var(--verde-logo)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
            Acepto la{' '}
            <span onClick={e => { e.preventDefault(); setSeccion('privacidad') }}
              style={{ color: 'var(--verde-logo)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
              Política de Privacidad
            </span>
            {' '}y autorizo el tratamiento de mis datos personales, incluyendo la geolocalización GPS mientras esté conectado/a.
          </span>
        </label>
      </div>

      <button
        onClick={() => { if (puedeRegistrarse) { sessionStorage.setItem('terminos_aceptados', '1'); navigate('/registro/enfermero'); } }}
        disabled={!puedeRegistrarse}
        style={{
          width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
          background: puedeRegistrarse ? 'var(--verde-logo)' : '#e2e8f0',
          color: puedeRegistrarse ? 'white' : '#94a3b8',
          fontSize: '1rem', fontWeight: 800, cursor: puedeRegistrarse ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', transition: '0.2s',
          boxShadow: puedeRegistrarse ? '0 8px 25px rgba(26,83,92,0.25)' : 'none'
        }}>
        Continuar con el registro →
      </button>

      <button onClick={() => navigate('/registro')}
        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', marginTop: '16px', fontFamily: 'inherit' }}>
        <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Volver
      </button>
    </div>
  )
}
