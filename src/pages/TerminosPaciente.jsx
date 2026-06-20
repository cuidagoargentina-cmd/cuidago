import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TerminosPaciente() {
  const navigate = useNavigate()
  const [aceptado, setAceptado] = useState(false)

  function continuar() {
    if (!aceptado) return
    sessionStorage.setItem('terminosPacienteAceptados', 'true')
    navigate('/registro/paciente')
  }

  return (
    <div className="registro-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="encabezado-registro" style={{ marginBottom: '8px' }}>
        <img src="/logo.png" alt="Cuida Go" style={{ height: '52px', objectFit: 'contain', marginBottom: '8px' }} />
        <h2 style={{ fontSize: '1.3rem' }}>Términos, Condiciones y Política de Privacidad</h2>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Leé con atención antes de crear tu cuenta como usuario</p>
      </div>

      <div style={{
        height: '52vh', overflowY: 'auto', padding: '16px 18px',
        background: '#f8fafc', borderRadius: '14px',
        border: '1px solid #e2e8f0', fontSize: '0.82rem',
        color: '#374151', lineHeight: '1.75', marginBottom: '20px'
      }}>

        <h4 style={{ color: 'var(--verde-logo)', marginTop: 0 }}>1. Aceptación de los términos</h4>
        <p>Al crear una cuenta en Cuida Go como usuario/paciente, aceptás los presentes Términos y Condiciones y la Política de Privacidad. Si no estás de acuerdo, no podés utilizar la plataforma.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>2. Descripción del servicio</h4>
        <p>Cuida Go es una plataforma digital que conecta a usuarios que requieren atención de enfermería domiciliaria con profesionales de enfermería matriculados e independientes. Cuida Go actúa como intermediario tecnológico y <strong>no presta directamente servicios de salud</strong>. Los profesionales son trabajadores independientes y son responsables de la atención brindada.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>3. Verificación de identidad</h4>
        <p>Para garantizar la seguridad de todos los usuarios de la plataforma, realizamos una verificación de identidad mediante el escaneo de tu DNI y una selfie en tiempo real, a través del servicio Didit. Esta información es procesada de forma segura y encriptada, y se utiliza exclusivamente para validar tu identidad.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>4. Uso de datos personales y de salud</h4>
        <p>Los datos que cargás en Cuida Go — incluyendo nombre, DNI, domicilio, contacto de emergencia e información de salud — son utilizados exclusivamente para facilitar la prestación del servicio. <strong>Nunca vendemos ni compartimos tu información personal con terceros con fines comerciales.</strong> Tus datos de salud son tratados con el máximo nivel de confidencialidad.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>5. Geolocalización</h4>
        <p>La app utiliza tu ubicación en tiempo real para mostrarte profesionales disponibles cerca tuyo y permitir que el enfermero llegue a tu domicilio. Tu ubicación es visible para el profesional asignado únicamente durante el servicio activo. Si te desconectás o cerrás la app, se registra tu última ubicación conocida. Podés desactivar el GPS desde la configuración de tu dispositivo, aunque esto puede limitar funcionalidades de la app.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>6. Pagos y transferencias</h4>
        <p>Los pagos por los servicios se realizan a través de la plataforma de forma digital. Una vez confirmado el servicio, el pago se transfiere de manera instantánea al profesional. Cuida Go opera como intermediario del pago. En caso de cancelaciones, se aplicará la política de cancelación vigente.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>7. Responsabilidad del usuario</h4>
        <p>Como usuario, te comprometés a:</p>
        <ul>
          <li>Brindar información veraz y actualizada en tu perfil</li>
          <li>Tratar con respeto a los profesionales de la plataforma</li>
          <li>No compartir tu cuenta con terceros</li>
          <li>Comunicar cualquier incidencia a través de los canales de soporte de Cuida Go</li>
          <li>No contactar directamente al profesional por fuera de la plataforma para coordinar servicios</li>
        </ul>

        <h4 style={{ color: 'var(--verde-logo)' }}>8. Confidencialidad del profesional</h4>
        <p>Los profesionales de Cuida Go tienen prohibido compartir tus datos personales con terceros, contactarte por canales fuera de la plataforma o utilizar tu información para fines distintos a la prestación del servicio. Ante cualquier incumplimiento, podés reportarlo a <a href="mailto:soporte@cuida-go.com" style={{ color: 'var(--verde-logo)' }}>soporte@cuida-go.com</a>.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>9. Contacto de emergencia</h4>
        <p>El contacto de emergencia que registrás en tu perfil podrá ser notificado en caso de situaciones de riesgo durante la prestación del servicio, a criterio del profesional actuante.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>10. Modificaciones</h4>
        <p>Cuida Go se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados por correo electrónico y/o dentro de la aplicación.</p>

        <h4 style={{ color: 'var(--verde-logo)' }}>11. Política de Privacidad</h4>
        <p><strong>Datos que recopilamos:</strong> nombre, DNI, fecha de nacimiento, género, email, teléfono, domicilio, contacto de emergencia, ubicación GPS e imágenes del DNI.</p>
        <p><strong>Finalidad:</strong> verificar identidad, conectar con profesionales, gestionar pagos y mejorar el servicio.</p>
        <p><strong>Almacenamiento:</strong> tus datos se guardan en servidores seguros con encriptación. Las imágenes del DNI son utilizadas únicamente para la verificación y no se almacenan de forma indefinida.</p>
        <p><strong>Derechos:</strong> podés solicitar acceso, rectificación o eliminación de tus datos en cualquier momento escribiendo a <a href="mailto:soporte@cuida-go.com" style={{ color: 'var(--verde-logo)' }}>soporte@cuida-go.com</a>.</p>
        <p><strong>Cookies:</strong> la app puede usar cookies técnicas necesarias para el funcionamiento del servicio.</p>

        <p style={{ marginTop: '20px', fontSize: '0.75rem', color: '#94a3b8' }}>
          Última actualización: junio 2025 · Cuida Go — Buenos Aires, Argentina
        </p>
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '20px' }}>
        <input
          type="checkbox"
          checked={aceptado}
          onChange={e => setAceptado(e.target.checked)}
          style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--verde-logo)', flexShrink: 0 }}
        />
        <span style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.5' }}>
          Leí y acepto los <strong>Términos y Condiciones</strong> y la <strong>Política de Privacidad</strong> de Cuida Go, incluyendo el uso de mi ubicación GPS y la verificación de identidad.
        </span>
      </label>

      <button
        onClick={continuar}
        disabled={!aceptado}
        style={{
          width: '100%', padding: '16px', borderRadius: '14px',
          background: aceptado ? 'var(--verde-logo)' : '#e2e8f0',
          color: aceptado ? 'white' : '#94a3b8',
          border: 'none', fontSize: '1rem', fontWeight: 800,
          cursor: aceptado ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', transition: '0.2s',
          boxShadow: aceptado ? '0 8px 20px rgba(60,94,86,0.25)' : 'none'
        }}
      >
        Continuar al registro →
      </button>

      <div className="links-extra" style={{ marginTop: '16px' }}>
        <a onClick={() => navigate('/registro')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-arrow-left"></i> Volver
        </a>
      </div>
    </div>
  )
}
