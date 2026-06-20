import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { app, auth, db } from '../firebase/config'

const VAPID_KEY = 'BJJigDP29lw_7mPK0gaBIai9aMpo5jnFGcmht3yZNdyh680KsJzwpZLlq7vbNFtH_hjBj2FOSrfZwTRe6ctOHO8'

async function pedirPermisoNotificaciones(coleccion) {
  try {
    if (!('Notification' in window)) return null
    if (!('serviceWorker' in navigator)) return null
    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return null
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    await navigator.serviceWorker.ready
    const { getMessaging, getToken } = await import('firebase/messaging')
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
    if (token && auth.currentUser) {
      await setDoc(doc(db, coleccion, auth.currentUser.uid), { fcmToken: token }, { merge: true })
    }
    return token
  } catch (e) { console.error('Error notificaciones:', e); return null }
}

export default function BienvenidaProfesional() {
  const navigate = useNavigate()
  const [paso, setPaso]               = useState(0)
  const [nombre, setNombre]           = useState('')
  const [notifEstado, setNotifEstado] = useState('idle')

  useEffect(() => {
    const user = auth.currentUser
    if (user) {
      getDoc(doc(db, 'enfermeros', user.uid)).then(snap => {
        if (snap.exists()) setNombre(snap.data().primerNombre || snap.data().nombre?.split(' ')[0] || '')
      })
    }
    // Splash 2.2 segundos (1 segundo más que antes)
    const t1 = setTimeout(() => setPaso(1), 2200)
    return () => clearTimeout(t1)
  }, [])

  async function pedirNotificaciones() {
    setNotifEstado('pedido')
    try {
      const token = await pedirPermisoNotificaciones('enfermeros')
      setNotifEstado(token ? 'aceptado' : 'rechazado')
    } catch { setNotifEstado('rechazado') }
  }

  function irAlDashboard() {
    navigate('/profesional/dashboard', { replace: true })
  }

  // ── Paso 0: Logo animado ──
  if (paso === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0 } 50% { transform: scale(1.05) } 70% { transform: scale(0.9) } 100% { transform: scale(1); opacity: 1 } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>
        <div style={{ animation: 'bounceIn 0.8s ease forwards', textAlign: 'center' }}>
          <img src="/logo.png" alt="Cuida Go" style={{ height: '140px', objectFit: 'contain' }} />
        </div>
        <p style={{ color: 'var(--verde-logo)', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', marginTop: '16px', animation: 'fadeInUp 0.5s ease 0.8s both' }}>
          SALUD EN TU HOGAR
        </p>
      </div>
    )
  }

  // ── Paso 1: Bienvenida ──
  if (paso === 1) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #f0fdf4 0%, #e6f2f3 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
        <style>{`
          @keyframes slideUp { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        `}</style>

        <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '32px' }}>
          <div style={{ width: '120px', height: '120px', background: 'var(--verde-logo)', borderRadius: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 20px 50px rgba(60,94,86,0.3)' }}>
            <i className="fa-solid fa-user-nurse" style={{ fontSize: '3rem', color: 'white' }}></i>
          </div>
        </div>

        <div style={{ animation: 'slideUp 0.6s ease 0.2s both' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.2 }}>
            ¡Bienvenido/a{nombre ? `, ${nombre}` : ''}!
          </h1>
          <div style={{ background: 'white', borderRadius: '18px', padding: '20px', marginBottom: '24px', maxWidth: '360px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', textAlign: 'left' }}>
            {[
              { icon: 'fa-circle-check', color: '#16a34a', bg: '#dcfce7', titulo: 'Registro completado', desc: 'Tu cuenta fue creada y tus documentos fueron recibidos correctamente.' },
              { icon: 'fa-clock', color: '#d97706', bg: '#fef3c7', titulo: 'Matrícula en revisión', desc: 'Nuestro equipo está verificando tu matrícula y documentación. Este proceso puede demorar hasta 48 horas hábiles.' },
              { icon: 'fa-envelope', color: '#0284c7', bg: '#e0f2fe', titulo: 'Te avisamos por email', desc: `Cuando tu perfil sea aprobado, te notificaremos a ${nombre ? 'tu correo registrado' : 'tu email'} y podrás empezar a recibir solicitudes.` },
            ].map(({ icon, color, bg, titulo, desc }) => (
              <div key={titulo} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color, fontSize: '1rem' }}>
                  <i className={`fa-solid ${icon}`}></i>
                </div>
                <div>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{titulo}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ animation: 'slideUp 0.6s ease 0.4s both', width: '100%', maxWidth: '360px' }}>
          <button onClick={() => setPaso(2)}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--verde-logo)', color: 'white', border: 'none', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 25px rgba(60,94,86,0.25)' }}>
            Continuar <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
          </button>
        </div>
      </div>
    )
  }

  // ── Paso 2: Notificaciones ──
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg, #f0fdf4 0%, #e6f2f3 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center' }}>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      <div style={{ animation: 'slideUp 0.5s ease both' }}>
        <div style={{ width: '100px', height: '100px', background: '#fef3c7', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 10px 30px rgba(245,158,11,0.2)' }}>
          <i className="fa-solid fa-bell" style={{ fontSize: '2.5rem', color: '#d97706' }}></i>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Activá las notificaciones</h2>
        <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.7, margin: '0 0 32px', maxWidth: '340px' }}>
          Para recibir alertas de <strong>nuevas solicitudes</strong>, recordatorios de turnos y avisos importantes, necesitamos tu permiso.
        </p>
        {notifEstado === 'aceptado' && (
          <div style={{ background: '#dcfce7', borderRadius: '14px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', fontSize: '1.2rem' }}></i>
            <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.9rem' }}>¡Notificaciones activadas!</span>
          </div>
        )}
        {notifEstado === 'rechazado' && (
          <div style={{ background: '#fef3c7', borderRadius: '14px', padding: '16px', marginBottom: '24px', fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
            Podés activarlas desde la configuración del navegador cuando quieras.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px' }}>
          {notifEstado !== 'aceptado' && (
            <button onClick={pedirNotificaciones} disabled={notifEstado === 'pedido'}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#d97706', color: 'white', border: 'none', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: notifEstado === 'pedido' ? 0.7 : 1 }}>
              <i className="fa-solid fa-bell" style={{ marginRight: '8px' }}></i>
              {notifEstado === 'pedido' ? 'Esperando permiso...' : 'Activar notificaciones'}
            </button>
          )}
          <button onClick={irAlDashboard}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', background: notifEstado === 'aceptado' ? 'var(--verde-logo)' : 'transparent', color: notifEstado === 'aceptado' ? 'white' : '#94a3b8', border: notifEstado === 'aceptado' ? 'none' : '1.5px solid #e2e8f0', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: notifEstado === 'aceptado' ? '0 8px 25px rgba(60,94,86,0.25)' : 'none' }}>
            {notifEstado === 'aceptado' ? 'Abrir la app →' : 'Ahora no, abrir la app'}
          </button>
        </div>
      </div>
    </div>
  )
}
