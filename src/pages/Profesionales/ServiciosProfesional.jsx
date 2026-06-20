import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

export default function ServiciosProfesional() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('all');
  const [serviciosActivos, setServiciosActivos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const [fichaData, setFichaData] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;

    // Servicios activos (pagado o en_curso)
    const qActivos = query(
      collection(db, 'solicitudes'),
      where('enfermeroId', '==', uid),
    );

    const unsub = onSnapshot(qActivos, (snap) => {
      const activos = [];
      const hist = [];

      snap.forEach(d => {
        const data = { ...d.data(), _id: d.id };
        if (data.estado === 'pagado' || data.estado === 'en_curso') {
          activos.push(data);
        } else if (['completado', 'cancelado', 'rechazado'].includes(data.estado)) {
          hist.push(data);
        }
      });

      activos.sort((a, b) => (b.fechaCreacion?.toMillis?.() || 0) - (a.fechaCreacion?.toMillis?.() || 0));
      hist.sort((a, b) => (b.fechaCreacion?.toMillis?.() || 0) - (a.fechaCreacion?.toMillis?.() || 0));

      setServiciosActivos(activos);
      setHistorial(hist);
    });

    return () => unsub();
  }, []);

  const histFiltrado = historial.filter(s => {
    if (filtro === 'all') return true;
    if (filtro === 'completed') return s.estado === 'completado';
    if (filtro === 'canceled') return s.estado === 'cancelado';
    if (filtro === 'rejected') return s.estado === 'rechazado';
    return true;
  });

  const tabStyle = (t) => ({
    padding: '10px 18px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
    whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.3s',
    background: filtro === t ? 'var(--verde-logo)' : 'var(--blanco)',
    color: filtro === t ? 'white' : 'var(--gris-texto)',
    border: `1px solid ${filtro === t ? 'var(--verde-logo)' : '#e2e8f0'}`
  });

  const getBadgeStyle = (estado) => {
    const base = { fontSize: '0.65rem', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' };
    if (estado === 'completado') return { ...base, background: '#dcfce7', color: '#166534' };
    if (estado === 'cancelado') return { ...base, background: '#f1f5f9', color: '#475569' };
    if (estado === 'rechazado') return { ...base, background: '#fee2e2', color: '#b71c1c' };
    return base;
  };

  const getPriceStyle = (estado) => {
    if (estado === 'rechazado') return { color: 'var(--rojo-logo)' };
    if (estado === 'cancelado') return { color: 'var(--gris-texto)' };
    return { color: 'var(--verde-logo)' };
  };

  const formatFecha = (data) => {
    if (!data.fechaCreacion) return '--';
    const d = data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : new Date(data.fechaCreacion);
    const hoy = new Date();
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === hoy.toDateString()) return `Hoy, ${hora} hs`;
    if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora} hs`;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) + `, ${hora} hs`;
  };

  return (
    <div style={{ padding: '20px 20px 180px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* SERVICIOS ACTIVOS */}
      {serviciosActivos.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '15px', color: '#1a535c', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', background: '#1a535c', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
            Servicio Activo
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

          {serviciosActivos.map((data) => (
            <div key={data._id} style={{ background: '#0f172a', borderRadius: '20px', padding: '18px', marginBottom: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img
                  src={data.pacienteFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.pacienteNombre || 'P')}&background=334155&color=94a3b8`}
                  style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover' }} alt=""
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{data.pacienteNombre || 'Paciente'}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{data.servicios?.[0]}</p>
                </div>
                <span style={{
                  background: data.estado === 'en_curso' ? 'rgba(16,185,129,0.2)' : 'rgba(14,165,233,0.2)',
                  color: data.estado === 'en_curso' ? '#4ade80' : '#38bdf8',
                  padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800
                }}>
                  {data.estado === 'en_curso' ? 'En curso' : 'Pagado'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#b71c1c' }}></i>
                {data.direccion}
              </div>
              <button
                onClick={() => navigate(`/profesional/servicio-activo?id=${data._id}`)}
                style={{ width: '100%', background: '#1a535c', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-arrow-right"></i>
                {data.estado === 'en_curso' ? 'Continuar Servicio' : 'Ir al Servicio'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HISTORIAL — PESTAÑAS */}
      <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '15px', color: 'var(--texto)' }}>
        Historial de Servicios
      </div>

      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', scrollbarWidth: 'none' }}>
        <div style={tabStyle('all')} onClick={() => setFiltro('all')}>Todos</div>
        <div style={tabStyle('completed')} onClick={() => setFiltro('completed')}>Completados</div>
        <div style={tabStyle('canceled')} onClick={() => setFiltro('canceled')}>Cancelados</div>
        <div style={tabStyle('rejected')} onClick={() => setFiltro('rejected')}>Rechazados</div>
      </div>

      {histFiltrado.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gris-texto)', fontSize: '0.85rem' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', marginBottom: '10px', color: '#cbd5e1', display: 'block' }}></i>
          No hay servicios en esta categoría.
        </div>
      ) : (
        histFiltrado.map(sol => (
          <div key={sol._id} style={{
            background: 'var(--blanco)', borderRadius: '20px', padding: '18px',
            boxShadow: 'var(--shadow-soft)', marginBottom: '15px',
            borderLeft: `4px solid ${sol.estado === 'completado' ? 'var(--verde-online)' : sol.estado === 'rechazado' ? 'var(--rojo-logo)' : 'var(--gris-texto)'}`,
            opacity: sol.estado === 'cancelado' ? 0.85 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--texto)' }}>
                <i className="fa-regular fa-calendar"></i> {formatFecha(sol)}
              </div>
              <span style={getBadgeStyle(sol.estado)}>
                {sol.estado === 'completado' ? 'Completado' : sol.estado === 'cancelado' ? 'Cancelado' : 'Rechazado'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: sol.estado === 'completado' ? '15px' : '0' }}>
              <img
                src={sol.pacienteFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(sol.pacienteNombre || 'P')}&background=f1f5f9&color=1a535c`}
                alt="" style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--texto)' }}>{sol.pacienteNombre || 'Paciente'}</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--gris-texto)' }}>{sol.servicios?.[0]}</p>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '1.1rem', fontWeight: 800, ...getPriceStyle(sol.estado) }}>
                ${(sol.gananciaEnfermeroFinal || sol.gananciaEnfermero || 0).toLocaleString('es-AR')}
              </div>
            </div>

            {sol.estado === 'completado' && (
              <button
                onClick={() => { setFichaData(sol); setFichaAbierta(true); }}
                style={{ width: '100%', background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
                <i className="fa-solid fa-file-medical"></i> Ver Ficha Médica
              </button>
            )}
          </div>
        ))
      )}

      {/* BOTTOM SHEET FICHA */}
      <div onClick={() => setFichaAbierta(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 2000, opacity: fichaAbierta ? 1 : 0, pointerEvents: fichaAbierta ? 'auto' : 'none', transition: '0.3s' }} />

      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', maxHeight: '85vh', background: 'var(--fondo)', borderRadius: '30px 30px 0 0', zIndex: 2001, transform: fichaAbierta ? 'translateY(0)' : 'translateY(100%)', transition: '0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 15px', background: 'var(--blanco)', borderRadius: '30px 30px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '5px', background: '#e2e8f0', borderRadius: '5px' }} />
          <h3 style={{ margin: '10px 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--texto)' }}>Ficha Médica</h3>
          <button onClick={() => setFichaAbierta(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', color: 'var(--rojo-logo)', cursor: 'pointer', marginTop: '5px' }}>×</button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ background: 'var(--blanco)', borderRadius: '20px', padding: '18px', marginBottom: '15px', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--verde-logo)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <i className="fa-solid fa-clipboard-list" style={{ marginRight: '8px' }}></i> Resumen del Servicio
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--gris-texto)', fontWeight: 600 }}>Paciente</span>
              <span style={{ fontWeight: 800 }}>{fichaData?.pacienteNombre}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--gris-texto)', fontWeight: 600 }}>Servicio</span>
              <span style={{ fontWeight: 800 }}>{fichaData?.servicios?.[0]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--gris-texto)', fontWeight: 600 }}>Dirección</span>
              <span style={{ fontWeight: 800, textAlign: 'right', maxWidth: '60%' }}>{fichaData?.direccion}</span>
            </div>
          </div>
          {fichaData?.notas && (
            <div style={{ background: 'var(--blanco)', borderRadius: '20px', padding: '18px', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--verde-logo)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <i className="fa-solid fa-comment-dots" style={{ marginRight: '8px' }}></i> Indicaciones
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gris-texto)', lineHeight: 1.5, fontStyle: 'italic' }}>"{fichaData.notas}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
