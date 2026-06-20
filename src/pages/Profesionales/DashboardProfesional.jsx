import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion, getDoc, setDoc, increment } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

export default function DashboardProfesional({ estaOnline }) {
  const navigate = useNavigate();
  const uidRef = useRef(null);
  const processedRequestsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  const [solicitudes, setSolicitudes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [ganancias, setGanancias] = useState(0);
  const [completados, setCompletados] = useState(0);
  const [modalRechazarId, setModalRechazarId] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  
  // Estados para Rendimiento
  const [puntuacion, setPuntuacion] = useState(0);
  const [aceptacion, setAceptacion] = useState(100);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    uidRef.current = user.uid;
    
    cargarHistorial(user.uid);

    // Escuchar el perfil del enfermero SOLO para la Aceptación
    const unsubPerfil = onSnapshot(doc(db, 'enfermeros', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const aceptados = data.turnosAceptados || 0;
        const rechazados = data.turnosRechazados || 0;
        const totalSolicitudes = aceptados + rechazados;
        
        if (totalSolicitudes === 0) {
          setAceptacion(100); 
        } else {
          const porcentaje = Math.round((aceptados / totalSolicitudes) * 100);
          setAceptacion(porcentaje);
        }
      }
    });

    return () => {
      unsubPerfil();
    };
  }, []);

  useEffect(() => {
    if (estaOnline) {
      const unsub = cargarSolicitudes();
      return () => { if (unsub) unsub(); };
    } else {
      setSolicitudes([]);
    }
  }, [estaOnline]);

  function cargarSolicitudes() {
    const q = query(collection(db, 'solicitudes'), where('estado', '==', 'pendiente'));
    isInitialLoadRef.current = true;

    const unsub = onSnapshot(q, async (snapshot) => {
      const listaNueva = [];
      const uid = uidRef.current;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const id = change.doc.id;

          if (data.enfermerosRechazados && data.enfermerosRechazados.includes(uid)) return;
          if (data.enfermeroId && data.enfermeroId !== uid && data.enfermeroId !== 'cualquiera') return;

          if (!isInitialLoadRef.current && !processedRequestsRef.current.has(id) && !sessionStorage.getItem('alerta_visto_' + id)) {
            processedRequestsRef.current.add(id);
            sessionStorage.setItem('alerta_visto_' + id, 'true');

            if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification('¡Nueva Solicitud de CuidaGo!', {
                  body: `Paciente: ${data.pacienteNombre}. Servicio: ${data.servicios?.[0] || 'Atención'}.`,
                  icon: '/icon-192.png',
                  vibrate: [500, 200, 500, 200, 500]
                });
              });
            }
          }
        }
      });

      snapshot.forEach(d => {
        const data = d.data();
        if (data.enfermerosRechazados && data.enfermerosRechazados.includes(uid)) return;
        if (data.enfermeroId && data.enfermeroId !== uid && data.enfermeroId !== 'cualquiera') return;
        listaNueva.push({ id: d.id, ...data });
      });
      
      setSolicitudes(listaNueva);
      isInitialLoadRef.current = false;
    });

    return unsub;
  }

  function cargarHistorial(uid) {
    const q = query(collection(db, 'solicitudes'), where('enfermeroId', '==', uid));

    const unsub = onSnapshot(q, async (snapshot) => {
      let gananciasTotales = 0;
      let turnosCompletados = 0;
      let lista = [];
      
      // Variables para calcular el promedio de estrellas
      let totalEstrellas = 0;
      let cantidadResenas = 0;

      const docs = [];
      snapshot.forEach(d => docs.push({ id: d.id, data: d.data() }));
      docs.sort((a, b) => (b.data.fechaCreacion?.toMillis?.() || 0) - (a.data.fechaCreacion?.toMillis?.() || 0));

      docs.forEach(({ id, data }) => {
        // Cálculo de Puntuación si hay reseñas (Misma lógica que en ResenasProfesional.jsx)
        if (data.estado === 'completado' && data.resena?.estrellas) {
          totalEstrellas += data.resena.estrellas;
          cantidadResenas++;
        }

        if (data.estado === 'pendiente') return;

        if (data.estado === 'cancelado') {
          let fechaCanc = 0;
          if (data.fechaCancelacion) {
            fechaCanc = new Date(data.fechaCancelacion).getTime();
          } else if (data.fechaCreacion?.toMillis) {
            fechaCanc = data.fechaCreacion.toMillis();
          } else return;
          if ((Date.now() - fechaCanc) / (1000 * 60 * 60) > 24) return;
        }

        if (data.estado === 'completado') {
          turnosCompletados++;
          if (data.gananciaEnfermero) gananciasTotales += Number(data.gananciaEnfermero);
        }

        lista.push({ ...data, _id: id });
      });

      // Setear Puntuación Promedio
      const prom = cantidadResenas > 0 ? (totalEstrellas / cantidadResenas) : 0;
      setPuntuacion(prom);

      setHistorial(lista);
      setGanancias(gananciasTotales);
      setCompletados(turnosCompletados);
      
      const enfSnap2 = await getDoc(doc(db, 'enfermeros', uid))
      if (enfSnap2.exists()) {
        const penalizadoHasta = enfSnap2.data()?.penalizadoHasta
        if (penalizadoHasta && new Date(penalizadoHasta) > new Date()) {
          await setDoc(doc(db, 'enfermeros', uid), { isOnline: false }, { merge: true })
        }
      }
    });

    return unsub;
  }

  async function confirmarRechazo() {
    if (!modalRechazarId || !motivoRechazo) return;
    const uid = uidRef.current;
    try {
      await updateDoc(doc(db, 'solicitudes', modalRechazarId), {
        enfermerosRechazados: arrayUnion(uid),
        enfermeroId: 'cualquiera',
        motivosRechazo: arrayUnion({ uid, motivo: motivoRechazo, fecha: new Date().toISOString() })
      });
      
      // Sumamos el rechazo para afectar la Aceptación
      await updateDoc(doc(db, 'enfermeros', uid), {
        turnosRechazados: increment(1)
      });
      
    } catch (e) {
      console.error('Error rechazando:', e);
    }
    setSolicitudes(s => s.filter(x => x.id !== modalRechazarId));
    setModalRechazarId(null);
    setMotivoRechazo('');
  }

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      <style>{`
        @keyframes pulseBadge { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .turno-card-pending {
          background: var(--blanco); border-radius: 20px; padding: 18px; margin-bottom: 15px;
          box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.3); border-left: 4px solid #f59e0b;
          animation: slideIn 0.4s ease-out; transition: 0.3s;
        }
        .status-badge-pending {
          background: #fef3c7; color: #b45309; font-size: 0.7rem; padding: 4px 10px;
          border-radius: 8px; font-weight: 700; text-transform: uppercase; animation: pulseBadge 1.5s infinite;
        }
        .history-card {
          background: var(--blanco); border-radius: 24px; padding: 15px; margin-bottom: 12px;
          box-shadow: var(--shadow-soft); display: flex; align-items: center; gap: 12px; transition: 0.3s;
        }
        .history-card.cancelado, .history-card.rechazado {
          filter: grayscale(1); opacity: 0.7;
          border: 1px solid #cbd5e1;
        }
        .tag-status {
          font-size: 0.6rem; font-weight: 800; text-transform: uppercase; padding: 4px 8px;
          border-radius: 6px; margin-top: 4px; display: inline-block;
        }
      `}</style>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '10px 0 25px 0' }}>
        <div style={{ background: 'var(--blanco)', padding: '22px 15px', borderRadius: '24px', boxShadow: 'var(--shadow-soft)', textAlign: 'center', borderBottom: '4px solid var(--verde-logo)' }}>
          <i className="fa-solid fa-wallet" style={{ fontSize: '1.6rem', color: 'var(--rojo-logo)', marginBottom: '10px', display: 'block' }}></i>
          <span style={{ fontSize: '0.7rem', color: 'var(--gris-texto)', fontWeight: 700, textTransform: 'uppercase' }}>Ganancias</span>
          <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '5px' }}>${ganancias.toLocaleString('es-AR')}</strong>
        </div>
        <div style={{ background: 'var(--blanco)', padding: '22px 15px', borderRadius: '24px', boxShadow: 'var(--shadow-soft)', textAlign: 'center', borderBottom: '4px solid var(--verde-logo)' }}>
          <i className="fa-solid fa-calendar-check" style={{ fontSize: '1.6rem', color: 'var(--rojo-logo)', marginBottom: '10px', display: 'block' }}></i>
          <span style={{ fontSize: '0.7rem', color: 'var(--gris-texto)', fontWeight: 700, textTransform: 'uppercase' }}>Completados</span>
          <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '5px' }}>{completados} Turnos</strong>
        </div>
      </div>

      {/* PERFORMANCE */}
      <div style={{ background: 'var(--verde-logo)', color: 'white', padding: '20px', borderRadius: '28px', marginBottom: '30px', display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', marginBottom: '5px', display: 'block' }}>Puntuación</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            {puntuacion.toFixed(1)} <i className="fa-solid fa-star" style={{ color: '#fbbf24' }}></i>
          </div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', marginBottom: '5px', display: 'block' }}>Aceptación</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{aceptacion}%</div>
        </div>
      </div>

      {/* SOLICITUDES ACTIVAS */}
      <div style={{ fontSize: '0.95rem', fontWeight: 800, margin: '25px 0 15px' }}>Solicitudes Activas</div>

      {!estaOnline ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--rojo-logo)', fontSize: '0.85rem', fontWeight: 700 }}>
          Estás Offline. Conectate para recibir turnos.
        </div>
      ) : solicitudes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gris-texto)', fontSize: '0.85rem' }}>
          <i className="fa-solid fa-satellite-dish" style={{ fontSize: '2rem', marginBottom: '10px', color: '#cbd5e1', display: 'block' }}></i>
          Buscando solicitudes en tu zona...
        </div>
      ) : (
        solicitudes.map(sol => (
          <div key={sol.id} className="turno-card-pending">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--texto)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-regular fa-clock"></i>
                {sol.tipo === 'reserva' ? `${sol.fechaReserva} ${sol.horaReserva}` : 'Hoy, ahora mismo'}
              </div>
              <span className="status-badge-pending">Revisar Solicitud</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <img src={sol.pacienteFoto || `https://ui-avatars.com/api/?name=P&background=f1f5f9&color=1a535c`}
                style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover' }} alt="" />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{sol.pacienteNombre || 'Paciente'}</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 500 }}>{sol.servicios?.[0] || 'Atención Domiciliaria'}</p>
              </div>
              <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--verde-logo)', fontSize: '1.1rem' }}>
                {sol.pagoEnfermero ? `$${Number(sol.pagoEnfermero).toLocaleString('es-AR')}` : 'A cotizar'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setModalRechazarId(sol.id)}
                style={{ flex: 0.6, padding: '12px', borderRadius: '14px', border: '1px solid #fca5a5', background: 'transparent', color: 'var(--rojo-logo)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                <i className="fa-solid fa-xmark"></i> Rechazar
              </button>
              <button onClick={() => navigate(`/profesional/alerta?id=${sol.id}`)}
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#1a535c', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                <i className="fa-solid fa-reply"></i> Responder
              </button>
            </div>
          </div>
        ))
      )}

      {/* HISTORIAL RECIENTE */}
      <div style={{ fontSize: '0.95rem', fontWeight: 800, margin: '30px 0 15px' }}>Historial Reciente</div>

      {historial.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gris-texto)', fontSize: '0.85rem' }}>
          No hay actividad reciente en tu historial.
        </div>
      ) : (
        historial.map((data, i) => {
          let colorBorde = 'transparent';
          let tagHtml = null;

          if (data.estado === 'rechazado') {
            colorBorde = 'var(--rojo-logo)';
            tagHtml = <span className="tag-status" style={{ background: '#fee2e2', color: 'var(--rojo-logo)' }}>Rechazada</span>;
          } else if (data.estado === 'cancelado') {
            colorBorde = 'var(--rojo-logo)';
            tagHtml = <span className="tag-status" style={{ background: '#fee2e2', color: 'var(--rojo-logo)' }}>Cancelada</span>;
          } else if (data.estado === 'completado') {
            colorBorde = '#10b981';
            tagHtml = <span className="tag-status" style={{ background: '#dcfce7', color: '#166534' }}>Completada</span>;
          } else if (data.estado === 'pagado') {
            colorBorde = '#0284c7';
            tagHtml = <span className="tag-status" style={{ background: '#e0f2fe', color: '#0284c7' }}>Pagado / En Curso</span>;
          } else if (data.estado === 'aceptado') {
            colorBorde = '#0284c7';
            tagHtml = <span className="tag-status" style={{ background: '#e0f2fe', color: '#0369a1' }}>Presupuestado</span>;
          }

          const valorMostrar = data.gananciaEnfermeroFinal || data.gananciaEnfermero || null;

          return (
            <div key={i} className={`history-card ${['cancelado','rechazado'].includes(data.estado) ? 'cancelado' : ''}`}
              style={{ borderLeft: `5px solid ${colorBorde}` }}>
              <img src={data.pacienteFoto || `https://ui-avatars.com/api/?name=P&background=f1f5f9&color=1a535c`}
                style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} alt="" />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{data.pacienteNombre || 'Paciente'}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gris-texto)' }}>{data.servicios?.[0] || 'Atención Domiciliaria'}</p>
                {tagHtml}
              </div>
              <div style={{ fontWeight: 800, color: ['cancelado','rechazado'].includes(data.estado) ? 'var(--gris-texto)' : 'var(--verde-logo)', fontSize: '0.95rem' }}>
                {valorMostrar ? `$${Number(valorMostrar).toLocaleString('es-AR')}` : '---'}
              </div>
            </div>
          );
        })
      )}

      {/* MODAL DE RECHAZO */}
      {modalRechazarId && (
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', margin: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: 'var(--blanco)', width: '100%', maxWidth: '340px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '25px', padding: '25px', textAlign: 'center', boxSizing: 'border-box', margin: '0 auto' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2.8rem', color: '#f59e0b', marginBottom: '12px', display: 'block' }}></i>
            <h3 style={{ marginBottom: '6px' }}>¿Rechazar Solicitud?</h3>
            <p style={{ color: 'var(--gris-texto)', fontSize: '0.85rem', marginBottom: '16px' }}>Contanos el motivo para poder mejorar las próximas ofertas.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', textAlign: 'left' }}>
              {[
                { id: 'dinero', label: 'El monto ofrecido es bajo' },
                { id: 'distancia', label: 'La distancia es muy larga' },
                { id: 'no_apto', label: 'No estoy apto para este servicio' },
                { id: 'otro', label: 'Otro motivo' }
              ].map(op => (
                <div key={op.id} onClick={() => setMotivoRechazo(op.label)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: `2px solid ${motivoRechazo === op.label ? 'var(--rojo-logo)' : '#e2e8f0'}`, background: motivoRechazo === op.label ? '#fef2f2' : 'white', cursor: 'pointer', transition: '0.2s' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${motivoRechazo === op.label ? 'var(--rojo-logo)' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {motivoRechazo === op.label && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--rojo-logo)' }}></div>}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{op.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={confirmarRechazo} disabled={!motivoRechazo}
                style={{ background: motivoRechazo ? 'var(--rojo-logo)' : '#e2e8f0', color: motivoRechazo ? 'white' : '#94a3b8', padding: '15px', border: 'none', borderRadius: '15px', fontWeight: 800, cursor: motivoRechazo ? 'pointer' : 'not-allowed' }}>
                Sí, rechazar
              </button>
              <button onClick={() => { setModalRechazarId(null); setMotivoRechazo(''); }}
                style={{ background: '#f1f5f9', color: 'var(--texto)', padding: '15px', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>
                No, mantener
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}