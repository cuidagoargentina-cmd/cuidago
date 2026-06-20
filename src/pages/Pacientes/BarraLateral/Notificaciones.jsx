import { useState, useEffect } from 'react';
import { getMessaging, getToken } from 'firebase/messaging'
import { doc, setDoc, getDoc } from 'firebase/firestore'
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
      await setDoc(doc(db, 'pacientes', auth.currentUser.uid), { fcmToken: token }, { merge: true })
    }
    return token
  } catch (e) { console.error(e); return null }
}

export default function Notificaciones() {
  const [ajustes, setAjustes] = useState({
    estadoTurno: true, profesionalCamino: true,
    nuevosMensajes: true, promociones: false, recordatorios: true
  });
  const [permiso, setPermiso] = useState('default');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setPermiso(Notification.permission);
  }, []);

  const toggleAjuste = (key) => setAjustes({ ...ajustes, [key]: !ajustes[key] });

  async function activarNotificaciones() {
    setCargando(true);
    try {
      const token = await pedirPermisoNotificaciones();
      setPermiso(token ? 'granted' : 'denied');
    } catch { setPermiso('denied'); }
    finally { setCargando(false); }
  }

  const ToggleSwitch = ({ isChecked, onToggle }) => (
    <div onClick={onToggle} style={{ position: 'relative', width: '46px', height: '26px', flexShrink: 0, backgroundColor: isChecked ? 'var(--verde-online)' : '#cbd5e1', borderRadius: '34px', cursor: 'pointer', transition: '0.4s' }}>
      <div style={{ position: 'absolute', top: '3px', left: isChecked ? '23px' : '3px', width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', transition: '0.4s', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} />
    </div>
  );

  const groupTitleStyle = { fontSize: '0.85rem', fontWeight: 800, color: 'var(--gris-texto)', textTransform: 'uppercase', marginBottom: '15px', paddingLeft: '5px' };
  const cardStyle = { background: 'white', borderRadius: '20px', padding: '5px 15px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.04)', marginBottom: '30px' };
  const itemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 5px', borderBottom: '1px solid #f8fafc' };

  return (
    <div style={{ padding: '20px 20px 180px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Banner de estado */}
      {permiso === 'granted' ? (
        <div style={{ background: '#f0fdf4', border: '1.5px solid var(--verde-logo)', borderRadius: '14px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-circle-check" style={{ color: 'var(--verde-logo)', fontSize: '1.2rem' }}></i>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>Notificaciones activadas</p>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#166534' }}>Vas a recibir alertas cuando un profesional acepte tu solicitud.</p>
          </div>
        </div>
      ) : permiso === 'denied' ? (
        <div style={{ background: '#fef3c7', border: '1.5px solid #d97706', borderRadius: '14px', padding: '14px 16px', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>Notificaciones bloqueadas
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#92400e' }}>Habilitálas desde Configuración → Privacidad → Notificaciones del navegador.</p>
        </div>
      ) : (
        <div style={{ background: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: '14px', padding: '14px 16px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.9rem', color: '#1d4ed8' }}>
            <i className="fa-solid fa-bell" style={{ marginRight: '8px' }}></i>Activá las notificaciones push
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#1d4ed8', lineHeight: 1.5 }}>Para recibir alertas cuando un profesional acepte tu solicitud, necesitás activar las notificaciones.</p>
          <button onClick={activarNotificaciones} disabled={cargando}
            style={{ background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: cargando ? 0.7 : 1 }}>
            {cargando ? 'Activando...' : 'Activar notificaciones →'}
          </button>
        </div>
      )}

      <div>
        <h3 style={groupTitleStyle}>Actividad de Turnos</h3>
        <div style={cardStyle}>
          <div style={itemStyle}>
            <div style={{ flex: 1, paddingRight: '15px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px 0' }}>Estado del Turno</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 500, lineHeight: 1.3, margin: 0 }}>Avisarme cuando un profesional acepte o modifique mi solicitud.</p>
            </div>
            <ToggleSwitch isChecked={ajustes.estadoTurno} onToggle={() => toggleAjuste('estadoTurno')} />
          </div>
          <div style={{ ...itemStyle, borderBottom: 'none' }}>
            <div style={{ flex: 1, paddingRight: '15px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px 0' }}>Profesional en camino</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 500, lineHeight: 1.3, margin: 0 }}>Recibir una alerta cuando el profesional inicie el viaje a mi domicilio.</p>
            </div>
            <ToggleSwitch isChecked={ajustes.profesionalCamino} onToggle={() => toggleAjuste('profesionalCamino')} />
          </div>
        </div>
      </div>

      <div>
        <h3 style={groupTitleStyle}>Mensajería</h3>
        <div style={cardStyle}>
          <div style={{ ...itemStyle, borderBottom: 'none' }}>
            <div style={{ flex: 1, paddingRight: '15px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px 0' }}>Nuevos Mensajes</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 500, lineHeight: 1.3, margin: 0 }}>Notificarme cuando reciba un mensaje en el chat privado.</p>
            </div>
            <ToggleSwitch isChecked={ajustes.nuevosMensajes} onToggle={() => toggleAjuste('nuevosMensajes')} />
          </div>
        </div>
      </div>

      <div>
        <h3 style={groupTitleStyle}>Cuida Go News</h3>
        <div style={cardStyle}>
          <div style={itemStyle}>
            <div style={{ flex: 1, paddingRight: '15px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px 0' }}>Promociones y Descuentos</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 500, lineHeight: 1.3, margin: 0 }}>Recibir ofertas especiales y novedades de servicios.</p>
            </div>
            <ToggleSwitch isChecked={ajustes.promociones} onToggle={() => toggleAjuste('promociones')} />
          </div>
          <div style={{ ...itemStyle, borderBottom: 'none' }}>
            <div style={{ flex: 1, paddingRight: '15px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)', margin: '0 0 4px 0' }}>Recordatorios de Salud</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 500, lineHeight: 1.3, margin: 0 }}>Consejos semanales basados en mi ficha médica.</p>
            </div>
            <ToggleSwitch isChecked={ajustes.recordatorios} onToggle={() => toggleAjuste('recordatorios')} />
          </div>
        </div>
      </div>

    </div>
  );
}
