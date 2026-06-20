import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
// Sumamos arrayUnion a las importaciones
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { onAuthStateChanged } from 'firebase/auth'

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function AlertaProfesional() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const idSolicitud = searchParams.get('id')

  const [solicitud, setSolicitud] = useState(null)
  const [pacienteEdad, setPacienteEdad] = useState('Buscando...')
  const [pacienteFoto, setPacienteFoto] = useState('')
  const [distancia, setDistancia] = useState('Calculando...')
  const [pacienteBarrio, setPacienteBarrio] = useState('')
  const [cargando, setCargando] = useState(true)
  const [countdown, setCountdown] = useState(5 * 60) // 5 minutos exactos
  const [insumos, setInsumos] = useState('')
  const [complejidad, setComplejidad] = useState(0)
  const [modalExito, setModalExito] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [modalRechazo, setModalRechazo] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  useEffect(() => {
    if (!idSolicitud) return
    
    // Esperar a que Firebase Auth esté listo antes de cargar
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return
      cargarDatos()
    })

    const cargarDatos = async () => {
      try {
        const snap = await getDoc(doc(db, 'solicitudes', idSolicitud))
        if (!snap.exists()) { 
          navigate('/profesional/dashboard'); 
          return; 
        }
        
        const data = snap.data()
        setSolicitud(data)
        setPacienteFoto(data.pacienteFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.pacienteNombre || 'P')}&background=e2e8f0&color=64748b`)

        if (data.pacienteId) {
          try {
            const pacRef = await getDoc(doc(db, 'pacientes', data.pacienteId))
            if (pacRef.exists()) {
              const p = pacRef.data()
              if (p.barrio) setPacienteBarrio(p.barrio)
              if (p.edad) {
                setPacienteEdad(`${p.edad} años`)
              } else if (p.nacimiento || p.fechaNacimiento || p.fecha_nacimiento || p.birthDate) {
                const fecha = p.nacimiento || p.fechaNacimiento || p.fecha_nacimiento || p.birthDate
                const nac = new Date(fecha)
                if (!isNaN(nac)) {
                  const hoy = new Date()
                  let e = hoy.getFullYear() - nac.getFullYear()
                  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
                  setPacienteEdad(`${e} años`)
                } else {
                  setPacienteEdad('Edad no disponible')
                }
              } else {
                setPacienteEdad('No especificada')
              }
            } else {
              setPacienteEdad('Sin perfil')
            }
          } catch { setPacienteEdad('No disponible') }
        } else {
          setPacienteEdad('Sin datos')
        }

        setCargando(false)

        if (navigator.geolocation && data.direccion) {
          navigator.geolocation.getCurrentPosition(pos => {
            const dir = data.direccion.split(',')[0].trim()
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dir + ', Argentina')}&limit=1`)
              .then(r => r.json())
              .then(geo => {
                if (geo.length > 0) {
                  const dist = calcularDistancia(pos.coords.latitude, pos.coords.longitude, geo[0].lat, geo[0].lon)
                  setDistancia(dist.toFixed(1) + ' km')
                } else setDistancia('Oculta')
              }).catch(() => setDistancia('Oculta'))
          }, () => setDistancia('Sin acceso a GPS'), { timeout: 5000 })
        } else {
           setDistancia(data.direccion ? 'Calculando...' : 'Sin dir')
        }

      } catch (error) {
        console.error("Error cargando solicitud:", error)
        navigate('/profesional/dashboard')
      }
    }

    cargarDatos()
    return () => unsubAuth()
  // eslint-disable-next-line
  }, [idSolicitud])

  // Lógica del contador regresivo
  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000)
    return () => clearInterval(timer)
  }, [])

  // --- NUEVA LÓGICA: Auto-rechazo al llegar a cero ---
  useEffect(() => {
    if (countdown === 0 && !cargando && !enviando && !modalExito) {
      rechazarSolicitud('Tiempo agotado (sin respuesta)');
    }
  }, [countdown, cargando, enviando, modalExito]);

  const minutos = Math.floor(countdown / 60)
  const segundos = countdown % 60
  
  const baseNeta = solicitud?.pagoEnfermero || (solicitud?.totalPaciente || 0) * 0.82
  const costoMat = solicitud?.estadoMateriales === 'tengo' ? 0 : Number(insumos || 0)
  const gananciaNeta = Math.round(baseNeta + (baseNeta * (complejidad / 100)) + costoMat)
  const totalPacienteFinalCalculado = Math.round((solicitud?.totalPaciente || 0) + ((solicitud?.totalPaciente || 0) * (complejidad / 100)) + costoMat)

  // --- NUEVA FUNCIÓN: Rechazar la solicitud (pase de pelota) ---
  async function rechazarSolicitud(motivo) {
    if (enviando) return;
    setEnviando(true);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        // En vez de cancelar el turno, agregamos al enfermero a la lista negra
        await updateDoc(doc(db, 'solicitudes', idSolicitud), {
          enfermerosRechazados: arrayUnion(uid), 
          enfermeroId: 'cualquiera', // Lo liberamos de vuelta
          motivosRechazo: arrayUnion({ uid, motivo: motivo || 'No especificado', fecha: new Date().toISOString() })
        });
      }
      // Volvemos al inicio para que atienda al siguiente
      navigate('/profesional/dashboard');
    } catch (e) {
      console.error('Error al rechazar:', e);
      setEnviando(false);
    }
  }

  function confirmarRechazo() {
    if (!motivoRechazo) return;
    setModalRechazo(false);
    rechazarSolicitud(motivoRechazo);
  }

  async function aceptar() {
    if (enviando) return
    setEnviando(true)
    try {
      await updateDoc(doc(db, 'solicitudes', idSolicitud), {
        estado: 'aceptado',
        enfermeroId: auth.currentUser?.uid || '',
        costoExtraMateriales: costoMat,
        porcentajeComplejidad: complejidad,
        gananciaEnfermeroFinal: gananciaNeta,
        totalPacienteFinal: totalPacienteFinalCalculado 
      })
      setModalExito(true)
      setTimeout(() => navigate('/profesional/dashboard'), 2500)
    } catch { setEnviando(false) }
  }

  if (cargando) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1a535c', fontWeight: 800 }}>
      Cargando solicitud...
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0f172a',
      overflowY: 'auto', overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(26,83,92,0.7); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 15px rgba(26,83,92,0); }
          100% { transform: scale(0.95); }
        }
      `}</style>

      <div style={{
        maxWidth: '450px',
        margin: '0 auto',
        padding: '30px 16px 100px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>

        <div style={{ width: '60px', height: '60px', background: '#b71c1c', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '1.5rem', animation: 'pulse-ring 1.5s infinite', marginBottom: '12px' }}>
          <i className="fa-solid fa-bell"></i>
        </div>
        <h1 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px 0', textAlign: 'center' }}>¡Nueva Solicitud!</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', textAlign: 'center' }}>
          {solicitud?.tipo === 'reserva' ? `Para el: ${solicitud.fechaReserva} a las ${solicitud.horaReserva} hs` : 'Atención Inmediata'}
        </p>

        <div style={{ background: 'white', width: '100%', borderRadius: '24px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>

          <div style={{ background: countdown <= 60 ? '#fef2f2' : '#fef3c7', color: countdown <= 60 ? '#b71c1c' : '#b45309', padding: '10px 15px', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px', width: '100%', boxSizing: 'border-box', transition: '0.3s' }}>
            <i className="fa-solid fa-stopwatch"></i>
            Tiempo restante: {String(minutos).padStart(2,'0')}:{String(segundos).padStart(2,'0')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
            <img src={pacienteFoto} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Paciente</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{solicitud?.pacienteNombre}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{pacienteEdad}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ background: '#fef2f2', color: '#b71c1c', padding: '5px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-location-dot"></i> {distancia}
                  </span>
                  {pacienteBarrio && <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{pacienteBarrio}</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-kit-medical" style={{ color: '#1a535c' }}></i> Servicios Requeridos
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#1a535c', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.6 }}>
              {!(solicitud?.servicios?.length === 1 && solicitud?.servicios?.[0] === 'Prueba') && <li>Visita Base</li>}
              {solicitud?.servicios?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            {solicitud?.notas?.trim() && (
              <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '10px', color: '#475569' }}>
                "{solicitud.notas}"
              </div>
            )}
          </div>

          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-box-open" style={{ color: '#1a535c' }}></i> Materiales
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: solicitud?.estadoMateriales === 'tengo' ? '#1a535c' : '#b71c1c', marginBottom: '8px' }}>
              {solicitud?.estadoMateriales === 'tengo' ? 'El paciente CUENTA con todos los insumos.' : 'El paciente NO cuenta con insumos.'}
            </div>
            {solicitud?.insumos?.length > 0 && (
              <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', columns: 2, columnGap: '15px' }}>
                {solicitud.insumos.map((ins, i) => (
                  <div key={i} style={{ color: '#1a535c', fontWeight: 700, breakInside: 'avoid', marginBottom: '5px' }}>
                    • {ins.charAt(0).toUpperCase() + ins.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '2px solid #e2e8f0', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1a535c', textTransform: 'uppercase', textAlign: 'center', marginBottom: '15px', letterSpacing: '0.5px' }}>
              Ajuste de Presupuesto
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Base Sugerida:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>${Math.round(baseNeta).toLocaleString('es-AR')}</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px', color: solicitud?.estadoMateriales === 'tengo' ? '#94a3b8' : '#334155', textDecoration: solicitud?.estadoMateriales === 'tengo' ? 'line-through' : 'none' }}>
                Ajuste por materiales (Si aplica)
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-dollar-sign" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}></i>
                <input type="number" value={solicitud?.estadoMateriales === 'tengo' ? '' : insumos}
                  onChange={e => setInsumos(e.target.value)}
                  disabled={solicitud?.estadoMateriales === 'tengo'}
                  placeholder={solicitud?.estadoMateriales === 'tengo' ? 'No aplica' : '0'}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 11px 11px 30px', borderRadius: '8px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', fontWeight: 600, background: solicitud?.estadoMateriales === 'tengo' ? '#e2e8f0' : 'white', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Ajuste por complejidad (Máx 50%): <span style={{ color: '#b71c1c' }}>+{complejidad}%</span>
              </label>
              <input type="range" min="0" max="50" step="5" value={complejidad}
                onChange={e => setComplejidad(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#1a535c', height: '6px' }} />
            </div>

            <div style={{ background: '#e6f2f3', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '2px solid #1a535c' }}>
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Tu Ganancia Neta</div>
              <div style={{ fontSize: '1.8rem', color: '#047857', fontWeight: 800 }}>${Math.round(gananciaNeta).toLocaleString('es-AR')}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', boxSizing: 'border-box' }}>
            {/* --- El botón ahora abre el modal de confirmación --- */}
            <button onClick={() => setModalRechazo(true)} disabled={enviando}
              style={{ flex: 0.5, padding: '16px 5px', borderRadius: '14px', background: '#f1f5f9', border: 'none', color: '#64748b', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
              Rechazar
            </button>
            <button onClick={aceptar} disabled={enviando}
              style={{ flex: 1, padding: '16px 5px', borderRadius: '14px', background: '#1a535c', border: 'none', color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(26,83,92,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <i className="fa-solid fa-paper-plane"></i>
              {enviando ? 'ENVIANDO...' : 'ENVIAR OFERTA'}
            </button>
          </div>
        </div>
      </div>

      {modalRechazo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '340px', borderRadius: '24px', padding: '28px 22px', textAlign: 'center', boxSizing: 'border-box' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2.8rem', color: '#f59e0b', marginBottom: '12px', display: 'block' }}></i>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>¿Seguro que querés rechazar?</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '18px' }}>Contanos el motivo para poder mejorar las próximas ofertas.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', textAlign: 'left' }}>
              {[
                { id: 'dinero', label: 'El monto ofrecido es bajo' },
                { id: 'distancia', label: 'La distancia es muy larga' },
                { id: 'no_apto', label: 'No estoy apto para este servicio' },
                { id: 'otro', label: 'Otro motivo' }
              ].map(op => (
                <div key={op.id} onClick={() => setMotivoRechazo(op.label)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: `2px solid ${motivoRechazo === op.label ? '#b71c1c' : '#e2e8f0'}`, background: motivoRechazo === op.label ? '#fef2f2' : 'white', cursor: 'pointer', transition: '0.2s' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${motivoRechazo === op.label ? '#b71c1c' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {motivoRechazo === op.label && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#b71c1c' }}></div>}
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>{op.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setModalRechazo(false); setMotivoRechazo('') }}
                style={{ flex: 0.5, padding: '14px', borderRadius: '14px', border: '2px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
                Volver
              </button>
              <button onClick={confirmarRechazo} disabled={!motivoRechazo || enviando}
                style={{ flex: 1, padding: '14px', borderRadius: '14px', background: motivoRechazo ? '#b71c1c' : '#e2e8f0', color: motivoRechazo ? 'white' : '#94a3b8', border: 'none', fontWeight: 800, cursor: motivoRechazo ? 'pointer' : 'not-allowed', fontSize: '0.95rem' }}>
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExito && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ background: 'white', width: '85%', maxWidth: '320px', borderRadius: '25px', padding: '35px 20px', textAlign: 'center', boxSizing: 'border-box' }}>
            <i className="fa-solid fa-paper-plane" style={{ fontSize: '3.5rem', color: '#1a535c', marginBottom: '15px', display: 'block' }}></i>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>¡Oferta Enviada!</h2>
            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.4 }}>Tu oferta fue enviada exitosamente al paciente.<br/><br/><small>Redirigiendo al panel...</small></p>
          </div>
        </div>
      )}
    </div>
  )
}