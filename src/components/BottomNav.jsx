import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;

  const [badgeTurnos, setBadgeTurnos] = useState(0);
  const [badgeAgenda, setBadgeAgenda] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Badge TURNOS: solicitudes con estado 'aceptado' esperando confirmación del paciente
    const qTurnos = query(
      collection(db, 'solicitudes'),
      where('pacienteId', '==', user.uid),
      where('estado', '==', 'aceptado')
    );
    const unsubTurnos = onSnapshot(qTurnos, (snap) => setBadgeTurnos(snap.size));

    // Badge AGENDA: reservas futuras pagadas
    const qAgenda = query(
      collection(db, 'solicitudes'),
      where('pacienteId', '==', user.uid),
      where('tipo', '==', 'reserva'),
      where('estado', '==', 'pagado')
    );
    const unsubAgenda = onSnapshot(qAgenda, (snap) => setBadgeAgenda(snap.size));

    return () => { unsubTurnos(); unsubAgenda(); };
  }, []);

  const Badge = ({ count }) => {
    if (!count) return null;
    return (
      <span style={{
        position: 'absolute', top: '-6px', right: '-8px',
        backgroundColor: 'var(--rojo-logo)', color: 'white',
        fontSize: '0.6rem', fontWeight: 800,
        width: '16px', height: '16px', borderRadius: '50%',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        border: '2px solid var(--verde-logo)'
      }}>
        {count > 9 ? '9+' : count}
      </span>
    );
  };

  const navStyle = (path) => ({
    color: isActive(path) ? 'white' : 'rgba(255,255,255,0.5)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    cursor: 'pointer', transition: '0.3s',
    transform: isActive(path) ? 'translateY(-3px)' : 'none'
  });

  return (
    <nav style={{ position: 'fixed', bottom: '25px', left: '20px', right: '20px', background: 'var(--verde-logo)', height: '75px', borderRadius: '24px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>

      <div onClick={() => navigate('/paciente/explorar')} style={navStyle('/paciente/explorar')}>
        <i className="fa-solid fa-house-medical" style={{ fontSize: '1.2rem' }}></i>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Inicio</span>
      </div>

      <div onClick={() => navigate('/paciente/turnos')} style={navStyle('/paciente/turnos')}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <i className="fa-solid fa-calendar-check" style={{ fontSize: '1.2rem' }}></i>
          <Badge count={badgeTurnos} />
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Turnos</span>
      </div>

      <div onClick={() => navigate('/paciente/agenda')} style={navStyle('/paciente/agenda')}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <i className="fa-solid fa-calendar-days" style={{ fontSize: '1.2rem' }}></i>
          <Badge count={badgeAgenda} />
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Agenda</span>
      </div>

      <div onClick={() => navigate('/paciente/historial')} style={navStyle('/paciente/historial')}>
        <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '1.2rem' }}></i>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Historial</span>
      </div>

    </nav>
  );
}
