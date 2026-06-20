import { useState, useEffect } from 'react';
import { getMessaging, getToken } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { app, auth, db } from '../../../firebase/config'

const VAPID_KEY = 'BJJigDP29lw_7mPK0gaBIai9aMpo5jnFGcmht3yZNdyh680KsJzwpZLlq7vbNFtH_hjBj2FOSrfZwTRe6ctOHO8'

async function pedirPermisoNotificaciones() {
  try {
    if (!('Notification' in window)) return null
    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return null
    const messaging = getMessaging(app)
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (token && auth.currentUser) {
      await setDoc(doc(db, 'enfermeros', auth.currentUser.uid), { fcmToken: token }, { merge: true })
    }
    return token
  } catch (e) { console.error(e); return null }
}

export default function NotificacionesProfesional() {
  const [config, setConfig] = useState({
    gps: true, solicitudes: true, sonidoAlto: true, recordatorios: true, mensajes: true
  });
  const [permiso, setPermiso] = useState('default'); // default | granted | denied
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPermiso(Notification.permission);
  }, []);

  const toggleConfig = (id) => setConfig(prev => ({ ...prev, [id]: !prev[id] }));

  async function activarNotificaciones() {
    setCargando(true);
    try {
      const token = await pedirPermisoNotificaciones();
      setPermiso(token ? 'granted' : 'denied');
    } catch { setPermiso('denied'); }
    finally { setCargando(false); }
  }

  const cardStyle = { background: 'var(--blanco)', borderRadius: '20px', padding: '5px 15px', boxShadow: 'var(--shadow-soft)', marginBottom: '20px' };
  const itemStyle = (isLast) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 5px', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' });
  const iconStyle = { width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--verde-logo)', fontSize: '1.1rem', flexShrink: 0 };

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .switch-notif { position: relative; display: inline-block; width: 50px; height: 28px; flex-shrink: 0; }
        .switch-notif input { opacity: 0; width: 0; height: 0; }
        .slider-notif { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider-notif:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .switch-notif input:checked + .slider-notif { background-color: var(--verde-online); }
        .switch-notif input:checked + .slider-notif:before { transform: translateX(22px); }
        .switch-notif input.danger-switch:checked + .slider-notif { background-color: var(--rojo-logo); }
      `}</style>

      {/* Banner de estado de notificaciones */}
      {permiso === 'granted' ? (
        <div style={{ background: '#f0fdf4', border: '1.5px solid var(--verde-logo)', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-circle-check" style={{ color: 'var(--verde-logo)', fontSize: '1.2rem' }}></i>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>Notificaciones activadas</p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#166534' }}>Vas a recibir alertas de nuevas solicitudes aunque la app esté cerrada.</p>
          </div>
        </div>
      ) : permiso === 'denied' ? (
        <div style={{ background: '#fef3c7', border: '1.5px solid #d97706', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
            Notificaciones bloqueadas
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#92400e' }}>Habilitálas desde Configuración → Privacidad → Notificaciones del navegador.</p>
        </div>
      ) : (
        <div style={{ background: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.9rem', color: '#1d4ed8' }}>
            <i className="fa-solid fa-bell" style={{ marginRight: '8px' }}></i>
            Activá las notificaciones push
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#1d4ed8', lineHeight: 1.5 }}>Para recibir alertas de nuevas solicitudes aunque la app esté cerrada, necesitás activar las notificaciones.</p>
          <button onClick={activarNotificaciones} disabled={cargando}
            style={{ background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: cargando ? 0.7 : 1 }}>
            {cargando ? 'Activando...' : 'Activar notificaciones →'}
          </button>
        </div>
      )}

      <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', marginBottom: '20px', lineHeight: 1.5 }}>
        Administrá cómo la aplicación se comunica con vos y los permisos de ubicación en segundo plano.
      </p>

      <div style={cardStyle}>
        <div style={itemStyle(false)}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={iconStyle}><i className="fa-solid fa-satellite-dish"></i></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)' }}>Rastreo GPS en Segundo Plano</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>Recibí pedidos aunque la app esté cerrada.</p>
            </div>
          </div>
          <label className="switch-notif">
            <input type="checkbox" checked={config.gps} onChange={() => toggleConfig('gps')} />
            <span className="slider-notif"></span>
          </label>
        </div>

        <div style={itemStyle(false)}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={iconStyle}><i className="fa-regular fa-bell"></i></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)' }}>Nuevas Solicitudes</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>Alertas de pacientes cerca de tu zona.</p>
            </div>
          </div>
          <label className="switch-notif">
            <input type="checkbox" checked={config.solicitudes} onChange={() => toggleConfig('solicitudes')} />
            <span className="slider-notif"></span>
          </label>
        </div>

        <div style={itemStyle(true)}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ ...iconStyle, color: 'var(--rojo-logo)', background: '#fee2e2' }}><i className="fa-solid fa-volume-high"></i></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)' }}>Sonido de Emergencia Alto</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>Ignorar el modo silencio al recibir un pedido.</p>
            </div>
          </div>
          <label className="switch-notif">
            <input type="checkbox" className="danger-switch" checked={config.sonidoAlto} onChange={() => toggleConfig('sonidoAlto')} />
            <span className="slider-notif"></span>
          </label>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={itemStyle(false)}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={iconStyle}><i className="fa-regular fa-calendar-check"></i></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)' }}>Recordatorios de Agenda</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>Avisos 1 hora antes de cada turno.</p>
            </div>
          </div>
          <label className="switch-notif">
            <input type="checkbox" checked={config.recordatorios} onChange={() => toggleConfig('recordatorios')} />
            <span className="slider-notif"></span>
          </label>
        </div>

        <div style={itemStyle(true)}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={iconStyle}><i className="fa-regular fa-comment-dots"></i></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)' }}>Mensajes del Paciente</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>Alertas del chat interno.</p>
            </div>
          </div>
          <label className="switch-notif">
            <input type="checkbox" checked={config.mensajes} onChange={() => toggleConfig('mensajes')} />
            <span className="slider-notif"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
