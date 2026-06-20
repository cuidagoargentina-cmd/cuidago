import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

export default function HistorialPaciente() {
  const navigate = useNavigate();
  const [filtroActivo, setFiltroActivo] = useState('Todos');
  const [historiales, setHistoriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enfermeros, setEnfermeros] = useState({});
  const [popupRepetir, setPopupRepetir] = useState(null); // guarda el hist seleccionado
  const [detalleServicio, setDetalleServicio] = useState(null); // detalle del servicio

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'solicitudes'), where('pacienteId', '==', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const lista = [];
      snap.forEach(d => {
        const data = d.data();
        // Solo historial: completados, cancelados o rechazados
        if (['completado', 'cancelado', 'rechazado'].includes(data.estado)) {
          lista.push({ id: d.id, ...data });
        }
      });
      // Ordenar por fecha más reciente
      lista.sort((a, b) => {
        const fa = new Date(a.fechaCompletado || a.fechaCancelacion || a.fechaCreacion?.toDate?.() || 0);
        const fb = new Date(b.fechaCompletado || b.fechaCancelacion || b.fechaCreacion?.toDate?.() || 0);
        return fb - fa;
      });
      setHistoriales(lista);
      setCargando(false);

      // Cargar datos de enfermeros
      const ids = [...new Set(lista.filter(t => t.enfermeroId && !enfermeros[t.enfermeroId]).map(t => t.enfermeroId))];
      if (ids.length > 0) {
        const nuevos = {};
        await Promise.all(ids.map(async id => {
          try {
            const s = await getDoc(doc(db, 'enfermeros', id));
            if (s.exists()) nuevos[id] = s.data();
          } catch {}
        }));
        setEnfermeros(prev => ({ ...prev, ...nuevos }));
      }
    });
    return () => unsub();
  }, []);

  function formatFecha(t) {
    const fecha = t.fechaCompletado || t.fechaCancelacion || (t.fechaCreacion?.toDate?.() ? t.fechaCreacion.toDate().toISOString() : null);
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' - ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
  }

  const historialesFiltrados = historiales.filter(h => {
    if (filtroActivo === 'Todos') return true;
    if (filtroActivo === 'Completados' && h.estado === 'completado') return true;
    if (filtroActivo === 'Cancelados' && (h.estado === 'cancelado' || h.estado === 'rechazado')) return true;
    return false;
  });

  function volverAPedir(hist) {
    setPopupRepetir(hist);
  }

  async function irAContratar(hist, mismosServicios) {
    let online = false;
    // Verificar si el profesional está online
    if (hist.enfermeroId) {
      try {
        const snap = await getDoc(doc(db, 'enfermeros', hist.enfermeroId));
        if (snap.exists() && snap.data().isOnline) online = true;
      } catch {}
    }

    const params = new URLSearchParams();
    if (hist.enfermeroId) params.set('enf', hist.enfermeroId);
    if (online) params.set('online', 'true');
    if (mismosServicios && hist.servicios?.length) {
      params.set('servicios', hist.servicios.join('|'));
    }
    setPopupRepetir(null);
    navigate(`/paciente/contratar-servicio?${params.toString()}`);
  }

  return (
    <div style={{ padding: '20px 20px 180px 20px' }}>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        {['Todos', 'Completados', 'Cancelados'].map(filtro => (
          <div key={filtro} onClick={() => setFiltroActivo(filtro)}
            style={{ padding: '10px 18px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', whiteSpace: 'nowrap', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.85rem', fontWeight: 700, transition: '0.2s', background: filtroActivo === filtro ? 'var(--verde-logo)' : 'var(--blanco)', color: filtroActivo === filtro ? 'white' : 'var(--gris-texto)', borderColor: filtroActivo === filtro ? 'var(--verde-logo)' : 'rgba(0,0,0,0.05)' }}>
            {filtro}
          </div>
        ))}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris-texto)', fontWeight: 700 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '10px', display: 'block' }}></i>
          Cargando historial...
        </div>
      ) : historialesFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--gris-texto)' }}>
          <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '2.5rem', marginBottom: '15px', opacity: 0.3, display: 'block' }}></i>
          <p style={{ fontWeight: 700, margin: 0 }}>No tenés servicios en tu historial todavía.</p>
        </div>
      ) : historialesFiltrados.map(hist => {
        const enf = enfermeros[hist.enfermeroId] || null;
        const nombre = enf?.nombre || hist.pacienteNombre || 'CuidaGo';
        const foto = enf?.foto || (hist.enfermeroId
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=e6f2f3&color=1a535c&bold=true`
          : '/logo.png');
        const esCancelado = hist.estado === 'cancelado' || hist.estado === 'rechazado';
        const servicio = hist.servicios?.[0] || 'Servicio';
        const precio = `$${(hist.totalPaciente || 0).toLocaleString('es-AR')}`;
        const estrellas = hist.resena?.estrellas || 0;

        return (
          <div key={hist.id} style={{ background: 'var(--blanco)', borderRadius: '22px', padding: '15px', marginBottom: '12px', boxShadow: 'var(--shadow-soft)', border: '1px solid rgba(0,0,0,0.02)', opacity: esCancelado ? 0.8 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--texto)', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-calendar-day" style={{ color: 'var(--gris-texto)' }}></i> {formatFecha(hist)}</div>
              <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase', background: !esCancelado ? '#dcfce7' : '#fee2e2', color: !esCancelado ? '#15803d' : '#b71c1c' }}>{hist.estado === 'completado' ? 'Completado' : hist.estado === 'rechazado' ? 'Rechazado' : 'Cancelado'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
              <img src={foto} alt={nombre} style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover', filter: esCancelado ? 'grayscale(1)' : 'none' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--texto)' }}>{nombre}</h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}><i className="fa-solid fa-staff-snake" style={{ color: 'var(--verde-logo)' }}></i> {servicio}</span>
                {esCancelado && <div style={{ fontSize: '0.75rem', color: 'var(--rojo-logo)', fontWeight: 700, marginTop: '4px' }}>{hist.estado === 'rechazado' ? 'Rechazado' : 'Cancelado'}</div>}
                {hist.estado === 'completado' && estrellas > 0 && (
                  <div style={{ color: '#fbbf24', fontSize: '0.75rem' }}>
                    {[1,2,3,4,5].map(j => <i key={j} className={`fa-${j <= estrellas ? 'solid' : 'regular'} fa-star`} style={{ color: j <= estrellas ? '#fbbf24' : '#cbd5e1' }}></i>)}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: esCancelado ? 'var(--gris-texto)' : 'var(--texto)', textDecoration: esCancelado ? 'line-through' : 'none' }}>{precio}</div>
            </div>

            {hist.estado === 'completado' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: 'transparent', color: 'var(--gris-texto)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => setDetalleServicio(hist)}><i className="fa-solid fa-file-lines"></i> Detalle</button>
                <button onClick={() => volverAPedir(hist)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: '#f1f5f9', color: 'var(--verde-logo)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-rotate-right"></i> Volver a pedir</button>
              </div>
            )}
          </div>
        );
      })}

      {/* Popup repetir servicios — centrado */}
      {popupRepetir && (
        <>
          <div onClick={() => setPopupRepetir(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', padding: '28px 22px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--texto)', textAlign: 'center' }}>Volver a pedir</h3>
              <p style={{ margin: '0 0 22px', fontSize: '0.88rem', color: 'var(--gris-texto)', textAlign: 'center' }}>
                ¿Querés pedir los mismos servicios con {enfermeros[popupRepetir.enfermeroId]?.nombre || 'este profesional'} u otros distintos?
              </p>
              <button onClick={() => irAContratar(popupRepetir, true)}
                style={{ width: '100%', padding: '15px', background: 'var(--verde-logo)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem', marginBottom: '10px' }}>
                <i className="fa-solid fa-rotate-right" style={{ marginRight: '8px' }}></i> Los mismos servicios
              </button>
              <button onClick={() => irAContratar(popupRepetir, false)}
                style={{ width: '100%', padding: '15px', background: '#f1f5f9', color: 'var(--verde-logo)', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem' }}>
                <i className="fa-solid fa-list-check" style={{ marginRight: '8px' }}></i> Elegir otros servicios
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal detalle del servicio — desde abajo */}
      {detalleServicio && (
        <>
          <div onClick={() => setDetalleServicio(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 5000 }}></div>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '28px 28px 0 0', padding: '0 22px 30px', zIndex: 5001, maxWidth: '480px', margin: '0 auto', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ position: 'sticky', top: 0, background: 'white', paddingTop: '14px', paddingBottom: '14px', zIndex: 10 }}>
              <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 16px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--texto)' }}>Detalle del servicio</h3>
                <button onClick={() => setDetalleServicio(null)} style={{ background: '#f1f5f9', border: 'none', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem' }}><i className="fa-solid fa-xmark"></i></button>
              </div>
            </div>

            {/* Estado y fecha */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gris-texto)' }}>{formatFecha(detalleServicio)}</span>
              <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase', background: '#dcfce7', color: '#15803d' }}>Completado</span>
            </div>

            {/* Profesional */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <img src={enfermeros[detalleServicio.enfermeroId]?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(enfermeros[detalleServicio.enfermeroId]?.nombre || 'CuidaGo')}&background=e6f2f3&color=1a535c&bold=true`}
                style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover' }} alt="" />
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--texto)' }}>{enfermeros[detalleServicio.enfermeroId]?.nombre || 'CuidaGo'}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--gris-texto)' }}>Profesional de enfermería</p>
              </div>
            </div>

            {/* Servicios realizados */}
            <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--gris-texto)', textTransform: 'uppercase' }}>Servicios realizados</p>
            <div style={{ marginBottom: '18px' }}>
              {detalleServicio.servicios?.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', marginBottom: '6px' }}>
                  <i className="fa-solid fa-staff-snake" style={{ color: 'var(--verde-logo)', fontSize: '0.85rem' }}></i>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--texto)' }}>{s}</span>
                </div>
              ))}
            </div>

            {/* Dirección */}
            {detalleServicio.direccion && (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--gris-texto)', textTransform: 'uppercase' }}>Dirección</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <i className="fa-solid fa-location-dot" style={{ color: 'var(--rojo-logo)', fontSize: '0.85rem' }}></i>
                  <span style={{ fontSize: '0.88rem', color: 'var(--texto)', fontWeight: 600 }}>{detalleServicio.direccion}</span>
                </div>
              </>
            )}

            {/* Reseña */}
            {detalleServicio.resena?.estrellas > 0 && (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--gris-texto)', textTransform: 'uppercase' }}>Tu reseña</p>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
                  <div style={{ marginBottom: detalleServicio.resena.comentario ? '6px' : 0 }}>
                    {[1,2,3,4,5].map(j => <i key={j} className={`fa-${j <= detalleServicio.resena.estrellas ? 'solid' : 'regular'} fa-star`} style={{ color: j <= detalleServicio.resena.estrellas ? '#fbbf24' : '#cbd5e1', fontSize: '0.85rem' }}></i>)}
                  </div>
                  {detalleServicio.resena.comentario && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gris-texto)', fontStyle: 'italic' }}>"{detalleServicio.resena.comentario}"</p>}
                </div>
              </>
            )}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #f1f5f9', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gris-texto)' }}>Total pagado</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--verde-logo)' }}>${(detalleServicio.totalPaciente || 0).toLocaleString('es-AR')}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
