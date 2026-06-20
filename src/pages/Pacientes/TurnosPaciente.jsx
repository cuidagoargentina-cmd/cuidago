import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

export default function TurnosPaciente() {
  const navigate = useNavigate();
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enfermeros, setEnfermeros] = useState({});
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [idCancelar, setIdCancelar] = useState(null);
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  
  // Estados para la pasarela de pago flotante
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState('');
  const [turnoAPagar, setTurnoAPagar] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'solicitudes'), where('pacienteId', '==', user.uid));
    const unsub = onSnapshot(q, async (snapshot) => {
      const lista = [];
      snapshot.forEach(d => lista.push({ id: d.id, ...d.data() }));
      lista.sort((a, b) => (b.fechaCreacion?.toMillis?.() || 0) - (a.fechaCreacion?.toMillis?.() || 0));
      setTurnos(lista);
      setCargando(false);

      const idsNuevos = [...new Set(
        lista.filter(t => t.enfermeroId && !enfermeros[t.enfermeroId]).map(t => t.enfermeroId)
      )];
      if (idsNuevos.length > 0) {
        const nuevos = {};
        await Promise.all(idsNuevos.map(async id => {
          try {
            const snap = await getDoc(doc(db, 'enfermeros', id));
            if (snap.exists()) nuevos[id] = snap.data();
          } catch {}
        }));
        setEnfermeros(prev => ({ ...prev, ...nuevos }));
      }
    });
    return () => unsub();
  }, []);

  async function confirmarCancelacion() {
    if (!idCancelar) return;
    try {
      await updateDoc(doc(db, 'solicitudes', idCancelar), {
        estado: 'cancelado',
        fechaCancelacion: new Date().toISOString()
      });
    } catch (e) { console.error(e); }
    setModalCancelarAbierto(false);
    setIdCancelar(null);
  }

  function abrirDetalle(turno) {
    setTurnoSeleccionado(turno);
    setSheetAbierto(true);
  }

  if (cargando) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gris-texto)', fontWeight: 800 }}>
      Cargando tus turnos...
    </div>
  );

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .section-title { font-size: 1.1rem; font-weight: 800; color: var(--texto); margin: 0 0 15px 0; }
        .turno-card { background: var(--blanco); border-radius: 20px; padding: 18px; margin-bottom: 15px; box-shadow: var(--shadow-soft); border-left: 4px solid transparent; transition: 0.3s; }
        .turno-card.cancelled { opacity: 0.65; border-left-color: var(--rojo-logo) !important; }
        .turno-card.pending { border-left-color: #f59e0b; }
        .turno-card.confirmed { border-left-color: #10b981; }
        .turno-card.paid { border-left-color: #0284c7; }
        .turno-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
        .turno-date { font-size: 0.85rem; font-weight: 800; color: var(--texto); display: flex; align-items: center; gap: 8px; }
        .status-badge { font-size: 0.7rem; padding: 4px 10px; border-radius: 8px; font-weight: 700; text-transform: uppercase; }
        .pro-info { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .pro-info img { width: 48px; height: 48px; border-radius: 14px; object-fit: cover; }
        .pro-info h4 { margin: 0; font-size: 1rem; font-weight: 700; }
        .pro-info p { margin: 2px 0 0; font-size: 0.8rem; color: var(--gris-texto); font-weight: 500; }
        .service-price { text-align: right; font-weight: 800; color: var(--verde-logo); font-size: 1.1rem; white-space: nowrap; }
        .btn-group { display: flex; gap: 8px; margin-top: 10px; }
        .btn { flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: 700; font-size: 0.82rem; cursor: pointer; text-align: center; transition: 0.2s; }
        .btn-outline { background: transparent; color: var(--rojo-logo); border: 1px solid #fca5a5; }
        .btn-detalle { background: #f8fafc; color: var(--texto); border: 1px solid #e2e8f0; }
        .btn-pagar { background: #1a535c; color: white; border: none; box-shadow: 0 4px 10px rgba(26,83,92,0.3); }
        .btn-cancelled-info { background: #f1f5f9; color: var(--gris-texto); cursor: default; width: 100%; padding: 12px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; text-align: center; }
        .waiting-msg { background: #fff9db; padding: 10px; border-radius: 10px; font-size: 0.75rem; color: #856404; display: flex; align-items: center; gap: 8px; margin-top: 12px; font-weight: 600; }
        .camino-msg { background: #e0f2fe; padding: 10px; border-radius: 10px; font-size: 0.75rem; color: #0369a1; display: flex; align-items: center; gap: 8px; margin-top: 12px; font-weight: 700; }
        .oferta-linea { font-size: 0.8rem; color: #065f46; font-weight: 700; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 7px 12px; border-radius: 8px; margin-top: 8px; display: flex; align-items: center; gap: 6px; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 2000; }
        .modal-card { background: var(--blanco); width: 85%; max-width: 340px; border-radius: 25px; padding: 25px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        .overlay-sheet { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.4); z-index: 5000; opacity: 0; pointer-events: none; transition: 0.3s; backdrop-filter: blur(4px); }
        .overlay-sheet.active { opacity: 1; pointer-events: auto; }
        .bottom-sheet { position: fixed; bottom: 0; left: 0; right: 0; background: var(--blanco); border-radius: 30px 30px 0 0; padding: 30px 25px 40px; z-index: 5001; transform: translateY(100%); transition: 0.4s cubic-bezier(0.2,0.8,0.2,1); box-shadow: 0 -10px 40px rgba(0,0,0,0.1); max-height: 85vh; overflow-y: auto; }
        .bottom-sheet.active { transform: translateY(0); }
        .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
        .sheet-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; }
        .sheet-row.total { font-size: 1.2rem; font-weight: 800; color: var(--verde-logo); border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 5px; }
      `}</style>

      <h3 className="section-title">Próximos Turnos</h3>

      {turnos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gris-texto)', background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
          <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2.5rem', marginBottom: '15px', color: '#cbd5e1', display: 'block' }}></i>
          <p style={{ fontWeight: 700, margin: 0 }}>Aún no tenés turnos solicitados.</p>
        </div>
      ) : (
        turnos.map((turno) => {
          const esPendiente = turno.estado === 'pendiente';
          const esCancelado = turno.estado === 'cancelado';
          const esAceptado = turno.estado === 'aceptado';
          const esPagado = turno.estado === 'pagado';
          const esEnCurso = turno.estado === 'en_curso';
          const huboReemplazo = turno.profesionalAnterior && turno.enfermeroId && turno.enfermeroId !== turno.profesionalAnterior;
          const esCompletado = turno.estado === 'completado';
          const profesionalCancelo = turno.profesionalCancelo === true;
          const requiereReembolso = turno.requiereReembolso === true;

          const enf = enfermeros[turno.enfermeroId] || null;
          const nombreProfesional = enf?.nombre || (turno.enfermeroId ? 'Cargando...' : 'Cuida Go');
          
          const fotoProfesional = enf?.foto
            ? enf.foto
            : turno.enfermeroId
              ? `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreProfesional)}&background=e6f2f3&color=1a535c&bold=true`
              : '/logo.png';

          const servicioPrincipal = turno.servicios?.[0] || 'Atención Domiciliaria';
          const fechaTexto = turno.tipo === 'reserva' ? `${turno.fechaReserva}, ${turno.horaReserva} hs` : 'Atención Inmediata';
          const totalFinal = turno.totalPacienteFinal || turno.totalPaciente || 0;

          let cardClass = 'pending';
          let badgeText = 'Pendiente';
          let badgeStyle = { background: '#fef3c7', color: '#b45309' };

          if (esAceptado) {
            cardClass = 'confirmed';
            badgeText = 'Oferta recibida';
            badgeStyle = { background: '#dcfce7', color: '#15803d' };
          } else if (esPagado) {
            cardClass = 'paid';
            badgeText = 'Confirmado';
            badgeStyle = { background: '#e0f2fe', color: '#0369a1' };
          } else if (esEnCurso) {
            cardClass = 'paid';
            badgeText = 'En curso';
            badgeStyle = { background: '#e0f2fe', color: '#0369a1' };
          } else if (esCompletado) {
            cardClass = 'confirmed';
            badgeText = 'Completado';
            badgeStyle = { background: '#dcfce7', color: '#15803d' };
          } else if (esCancelado) {
            cardClass = 'cancelled';
            badgeText = 'Cancelado';
            badgeStyle = { background: '#fee2e2', color: '#b71c1c' };
          }

          return (
            <div key={turno.id} className={`turno-card ${cardClass}`}>
              <div className="turno-header">
                <div className="turno-date">
                  <i className="fa-regular fa-clock"></i> {fechaTexto}
                </div>
                <span className="status-badge" style={badgeStyle}>{badgeText}</span>
              </div>

              <div className="pro-info">
                <img src={fotoProfesional} alt="Profesional"
                  style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: esPendiente ? 'contain' : 'cover', padding: esPendiente ? '6px' : '0', background: esPendiente ? '#e6f2f3' : 'transparent' }}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=P&background=e6f2f3&color=1a535c`; }} />
                <div style={{ flex: 1 }}>
                  <h4>{nombreProfesional}</h4>
                  <p>{servicioPrincipal}</p>
                </div>
                <div className="service-price">
                  {esPendiente
                    ? <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 800 }}><i className="fa-solid fa-clock-rotate-left"></i> A confirmar</span>
                    : !esCancelado ? `$${totalFinal.toLocaleString('es-AR')}` : '--'}
                </div>
              </div>

              {esAceptado && (
                <div className="oferta-linea">
                  <i className="fa-solid fa-file-invoice-dollar"></i>
                  Oferta del profesional: <strong>${totalFinal.toLocaleString('es-AR')}</strong>
                </div>
              )}

              <div className="btn-group">
                {!esCancelado && !esCompletado ? (
                  <>
                    {!esPagado && !esEnCurso && (
                      <button className="btn btn-outline" onClick={() => { setIdCancelar(turno.id); setModalCancelarAbierto(true); }}>
                        <i className="fa-solid fa-xmark"></i> Cancelar
                      </button>
                    )}
                    <button className="btn btn-detalle" onClick={() => abrirDetalle(turno)}>
                      <i className="fa-solid fa-file-lines"></i> Detalle
                    </button>
                    {esAceptado && (
                      <button 
                        className="btn btn-pagar" 
                        onClick={() => {
                          setTurnoAPagar(turno); 
                          setShowPaymentModal(true); 
                        }}
                      >
                        <i className="fa-solid fa-lock"></i> Pagar
                      </button>
                    )}
                    {(esPagado || esEnCurso) && (
                      <button className="btn btn-pagar" onClick={() => navigate(`/paciente/seguimiento?id=${turno.id}`)}>
                        <i className="fa-solid fa-location-dot"></i> Ver seguimiento
                      </button>
                    )}
                  </>
                ) : (
                  <div className="btn-cancelled-info">
                    <i className="fa-solid fa-ban"></i> {esCompletado ? 'Servicio completado' : 'Turno Cancelado'}
                  </div>
                )}
              </div>

              {esPendiente && profesionalCancelo && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '10px 12px', borderRadius: '10px', fontSize: '0.75rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 700 }}>
                  <i className="fa-solid fa-rotate"></i> El profesional anterior canceló. Buscando nuevo profesional...
                </div>
              )}
              {esCancelado && requiereReembolso && (
                <div style={{ background: '#ede9fe', border: '1px solid #c4b5fd', padding: '10px 12px', borderRadius: '10px', fontSize: '0.75rem', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 700 }}>
                  <i className="fa-solid fa-rotate-left"></i> Tu pago será reembolsado en 3-5 días hábiles.
                </div>
              )}
              {esPendiente && (
                <div className="waiting-msg">
                  <i className="fa-solid fa-hourglass-half"></i> Esperando respuesta del profesional...
                </div>
              )}
              {(esPagado || esEnCurso) && (
                <div className="camino-msg">
                  <i className="fa-solid fa-motorcycle"></i>
                  {esEnCurso ? 'El profesional está realizando el servicio.' : 'El profesional está en camino a tu domicilio.'}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* MODAL CANCELAR */}
      {modalCancelarAbierto && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ margin: '0 0 10px', fontWeight: 800 }}>¿Cancelar Turno?</h3>
            <p style={{ color: 'var(--gris-texto)', fontSize: '0.9rem', margin: 0 }}>Perderás tu reserva y el profesional será notificado.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button onClick={confirmarCancelacion}
                style={{ background: 'var(--rojo-logo)', color: 'white', padding: '15px', border: 'none', borderRadius: '15px', fontWeight: 800, cursor: 'pointer' }}>
                Sí, cancelar
              </button>
              <button onClick={() => setModalCancelarAbierto(false)}
                style={{ background: '#f1f5f9', color: 'var(--texto)', padding: '15px', border: 'none', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>
                No, mantener
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET DETALLE */}
      <div className={`overlay-sheet ${sheetAbierto ? 'active' : ''}`} onClick={() => setSheetAbierto(false)}></div>
      <div className={`bottom-sheet ${sheetAbierto ? 'active' : ''}`}>
        {turnoSeleccionado && (() => {
          const enf = enfermeros[turnoSeleccionado.enfermeroId] || null;
          const nombreEnf = enf?.nombre || 'Cuida Go';
          const fotoEnf = enf?.foto || '/logo.png';
          
          return (
            <>
              <div className="sheet-header">
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Detalle del Turno</h3>
                <button onClick={() => setSheetAbierto(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--gris-texto)', cursor: 'pointer' }}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                <img src={fotoEnf} style={{ width: '55px', height: '55px', borderRadius: '16px', objectFit: 'contain', background: '#e6f2f3', padding: '6px' }} alt="" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{nombreEnf}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--gris-texto)', fontWeight: 600 }}>{turnoSeleccionado.servicios?.[0]}</p>
                </div>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div className="sheet-row"><span style={{ color: 'var(--gris-texto)' }}>Fecha</span><strong>{turnoSeleccionado.tipo === 'reserva' ? `${turnoSeleccionado.fechaReserva}, ${turnoSeleccionado.horaReserva} hs` : 'Inmediata'}</strong></div>
                <div className="sheet-row"><span style={{ color: 'var(--gris-texto)' }}>Estado</span><strong style={{ textTransform: 'capitalize' }}>{turnoSeleccionado.estado}</strong></div>
                <div className="sheet-row" style={{ marginBottom: 0 }}><span style={{ color: 'var(--gris-texto)' }}>Dirección</span><strong style={{ textAlign: 'right', maxWidth: '60%' }}>{turnoSeleccionado.direccion}</strong></div>
              </div>
              
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>Servicios</h4>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: 'var(--verde-logo)', fontWeight: 700, lineHeight: 1.6, marginBottom: '20px' }}>
                • Visita Base<br/>
                {turnoSeleccionado.servicios?.map((s, i) => <span key={i}>• {s}<br/></span>)}
              </div>
              
              {/* DESGLOSE DINÁMICO */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>Desglose de Pago</h4>
              
              {turnoSeleccionado.estado === 'pendiente' ? (
                <div style={{ background: '#fff9db', padding: '15px', borderRadius: '12px', fontSize: '0.85rem', color: '#856404', fontWeight: 600 }}>
                  <i className="fa-solid fa-clock"></i> El profesional está evaluando tu solicitud. El precio final se detallará acá cuando recibas la oferta.
                </div>
              ) : (
                <>
                  {turnoSeleccionado.costoExtraMateriales > 0 && (
                    <div className="sheet-row">
                      <span style={{ color: 'var(--gris-texto)' }}>Insumos / Materiales</span>
                      <span style={{ color: 'var(--rojo-logo)', fontWeight: 700 }}>+${turnoSeleccionado.costoExtraMateriales.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                  
                  <div className="sheet-row">
                    <span style={{ color: 'var(--gris-texto)' }}>Tarifa Cuida Go</span>
                    <span style={{ color: '#0284c7', fontWeight: 700 }}>Incluida</span>
                  </div>
                  
                  <div className="sheet-row total">
                    <span>Total a Pagar</span>
                    <span>${(turnoSeleccionado.totalPacienteFinal || turnoSeleccionado.totalPaciente || 0).toLocaleString('es-AR')}</span>
                  </div>

                  {/* NUEVO BOTÓN DE PAGO AL FINAL DEL DETALLE */}
                  {turnoSeleccionado.estado === 'aceptado' && (
                    <button 
                      onClick={() => {
                        setSheetAbierto(false); 
                        setTurnoAPagar(turnoSeleccionado); 
                        setShowPaymentModal(true); 
                      }}
                      style={{
                        width: '100%',
                        marginTop: '25px',
                        padding: '16px',
                        backgroundColor: '#1a535c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(26,83,92,0.3)'
                      }}
                    >
                      <i className="fa-solid fa-lock" style={{ marginRight: '8px' }}></i> Pagar y Confirmar Turno
                    </button>
                  )}
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* --- CAJITA FLOTANTE DE PAGO --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
            
            <div style={{ padding: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#009EE3' }}>
              <span style={{ fontWeight: 'bold' }}>Pago seguro con Mercado Pago</span>
              <button onClick={() => { setShowPaymentModal(false); setPaymentGateway(''); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f9fafb' }}>
              
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ textAlign: 'center', marginBottom: '4px', fontWeight: '600', color: '#4b5563' }}>¿Cómo querés abonar el servicio?</p>
                  <p style={{ textAlign: 'center', marginBottom: '8px', fontWeight: '800', color: '#1a535c', fontSize: '1.1rem' }}>
                    ${(turnoAPagar?.totalPacienteFinal || turnoAPagar?.totalPaciente || 0).toLocaleString('es-AR')}
                  </p>
                  <button
                    onClick={async () => {
                      if (!turnoAPagar) return;
                      try {
                        const res = await fetch('https://southamerica-east1-cuida-go.cloudfunctions.net/crearPreferenciaMercadoPago', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            solicitudId: turnoAPagar.id,
                            monto: turnoAPagar.totalPacienteFinal || turnoAPagar.totalPaciente,
                            descripcion: (turnoAPagar.servicios || ['Servicio']).join(', '),
                            pacienteEmail: auth.currentUser?.email || 'paciente@cuida-go.com'
                          })
                        });
                        const data = await res.json();
                        if (data.init_point) {
                          window.location.href = data.init_point;
                        } else {
                          alert('Error al generar el pago. Intentá nuevamente.');
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Error de conexión. Intentá nuevamente.');
                      }
                    }}
                    style={{ width: '100%', backgroundColor: '#009EE3', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    <i className="fa-solid fa-lock" style={{ marginRight: '8px' }}></i>
                    Pagar con Mercado Pago
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}
      {/* --- FIN DE LA CAJITA DE PAGO --- */}
    </div>
  );
}