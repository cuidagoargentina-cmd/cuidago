import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function BottomNavProfesional() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;

  const [badgeInicio, setBadgeInicio] = useState(0);
  const [badgeAgenda, setBadgeAgenda] = useState(0);
  const [badgeServicios, setBadgeServicios] = useState(0);
  const [badgeIngresos, setBadgeIngresos] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;

    // Badge INICIO: solo solicitudes inmediatas pendientes (tipo ahora o sin tipo)
    const qPendientes = query(
      collection(db, 'solicitudes'),
      where('estado', '==', 'pendiente')
    );
    const unsubPend = onSnapshot(qPendientes, (snap) => {
      let count = 0;
      snap.forEach(d => {
        const data = d.data();
        // Mismo filtro que el Dashboard "Solicitudes Activas"
        if (data.enfermerosRechazados && data.enfermerosRechazados.includes(uid)) return;
        if (data.enfermeroId && data.enfermeroId !== uid && data.enfermeroId !== 'cualquiera') return;
        count++;
      });
      setBadgeInicio(count);
    });

    // Badge SERVICIOS: pagado o en_curso
    const qServicios = query(
      collection(db, 'solicitudes'),
      where('enfermeroId', '==', uid),
      where('estado', 'in', ['pagado', 'en_curso'])
    );
    const unsubServ = onSnapshot(qServicios, (snap) => {
      // Solo los inmediatos (no reservas futuras)
      let count = 0
      snap.forEach(d => {
        const data = d.data()
        if (!data.tipo || data.tipo === 'ahora') count++
      })
      setBadgeServicios(count);
    });

    // Badge AGENDA: reservas futuras pagadas
    const qAgenda = query(
      collection(db, 'solicitudes'),
      where('enfermeroId', '==', uid),
      where('tipo', '==', 'reserva'),
      where('estado', '==', 'pagado')
    );
    const unsubAgenda = onSnapshot(qAgenda, (snap) => {
      setBadgeAgenda(snap.size);
    });

    // Badge INGRESOS: turnos completados después de la última vez que abrió Ingresos
    const qIngresos = query(
      collection(db, 'solicitudes'),
      where('enfermeroId', '==', uid),
      where('estado', '==', 'completado')
    );
    const unsubIngresos = onSnapshot(qIngresos, (snap) => {
      const ultimaVista = localStorage.getItem(`ingresos_visto_${uid}`)
      const fechaVista = ultimaVista ? new Date(ultimaVista) : new Date(0)
      let count = 0;
      snap.forEach(d => {
        const data = d.data();
        const fecha = data.fechaCompletado ? new Date(data.fechaCompletado) : null
        if (fecha && fecha > fechaVista) count++
      });
      setBadgeIngresos(count);
    });

    return () => { unsubPend(); unsubAgenda(); unsubServ(); unsubIngresos(); };
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

      {/* INICIO */}
      <div onClick={() => navigate('/profesional/dashboard')} style={navStyle('/profesional/dashboard')}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <i className="fa-solid fa-house" style={{ fontSize: '1.2rem' }}></i>
          <Badge count={badgeInicio} />
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Inicio</span>
      </div>

      {/* SERVICIOS */}
      <div onClick={() => navigate('/profesional/servicios')} style={navStyle('/profesional/servicios')}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <i className="fa-solid fa-bell" style={{ fontSize: '1.2rem' }}></i>
          <Badge count={badgeServicios} />
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Servicios</span>
      </div>

      {/* AGENDA */}
      <div onClick={() => navigate('/profesional/agenda')} style={navStyle('/profesional/agenda')}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <i className="fa-solid fa-calendar-day" style={{ fontSize: '1.2rem' }}></i>
          <Badge count={badgeAgenda} />
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Agenda</span>
      </div>

      {/* INGRESOS — badge cuando hay ganancia nueva */}
      <div onClick={() => navigate('/profesional/ingresos')} style={navStyle('/profesional/ingresos')}>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <i className="fa-solid fa-wallet" style={{ fontSize: '1.2rem' }}></i>
          <Badge count={badgeIngresos} />
        </div>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: '5px', textTransform: 'uppercase' }}>Ingresos</span>
      </div>

    </nav>
  );
}
