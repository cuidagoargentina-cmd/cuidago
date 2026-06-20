import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'

const DIAS_LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function AgendaProfesional() {
  const navigate = useNavigate()
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('proximas')
  const [guardandoDisp, setGuardandoDisp] = useState(false)
  const [dispGuardada, setDispGuardada] = useState(false)
  const [cancelando, setCancelando] = useState(null)
  const notifIdsRef = useRef(new Set())

  // Disponibilidad
  // Cada día tiene: activo (bool) y franjas (array de {desde, hasta})
  const [diasConfig, setDiasConfig] = useState([
    { activo: true,  franjas: [{ desde: '08:00', hasta: '18:00' }] }, // Lunes
    { activo: true,  franjas: [{ desde: '08:00', hasta: '18:00' }] }, // Martes
    { activo: false, franjas: [{ desde: '08:00', hasta: '18:00' }] }, // Miércoles
    { activo: true,  franjas: [{ desde: '08:00', hasta: '18:00' }] }, // Jueves
    { activo: true,  franjas: [{ desde: '08:00', hasta: '18:00' }] }, // Viernes
    { activo: false, franjas: [{ desde: '08:00', hasta: '18:00' }] }, // Sábado
    { activo: false, franjas: [{ desde: '08:00', hasta: '18:00' }] }, // Domingo
  ])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    // Cargar disponibilidad guardada
    getDoc(doc(db, 'enfermeros', user.uid)).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      if (d.disponibilidad?.diasConfig) {
        // Migrar formato {desde,hasta} a {franjas:[...]} si hace falta
        const cfg = d.disponibilidad.diasConfig.map(dia => {
          if (dia.franjas) return dia
          return { activo: dia.activo, franjas: [{ desde: dia.desde || '08:00', hasta: dia.hasta || '18:00' }] }
        })
        setDiasConfig(cfg)
      } else if (d.disponibilidad?.dias) {
        const old = d.disponibilidad
        setDiasConfig(old.dias.map(activo => ({ activo, franjas: [{ desde: old.desde || '08:00', hasta: old.hasta || '18:00' }] })))
      }
    })

    // Escuchar reservas asignadas a este profesional
    const q = query(
      collection(db, 'solicitudes'),
      where('enfermeroId', '==', user.uid),
      where('tipo', '==', 'reserva')
    )
    const unsub = onSnapshot(q, snap => {
      const lista = []
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }))
      lista.sort((a, b) => {
        const fa = new Date(`${a.fechaReserva}T${a.horaReserva || '00:00'}`)
        const fb = new Date(`${b.fechaReserva}T${b.horaReserva || '00:00'}`)
        return fa - fb
      })
      setReservas(lista)
      setCargando(false)

      // Programar notificaciones 10 min antes
      lista.forEach(r => {
        if (r.estado !== 'pagado') return
        const turnoTime = new Date(`${r.fechaReserva}T${r.horaReserva || '00:00'}`).getTime()
        const alertTime = turnoTime - 10 * 60 * 1000
        const ahora = Date.now()
        const delay = alertTime - ahora

        if (delay > 0 && delay < 24 * 60 * 60 * 1000 && !notifIdsRef.current.has(r.id)) {
          notifIdsRef.current.add(r.id)
          setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('⏰ Turno en 10 minutos — CuidaGo', {
                body: `${r.pacienteNombre} · ${r.servicios?.[0]} · ${r.direccion}`,
                icon: '/icon-192.png'
              })
            }
          }, delay)
        }
      })
    })

    // Pedir permiso de notificaciones
    if (Notification.permission === 'default') Notification.requestPermission()

    return () => unsub()
  }, [])

  async function cancelarTurno(reservaId) {
    const user = auth.currentUser
    if (!user) return
    if (!window.confirm('¿Cancelar este turno? Esto puede generar una penalización si es tu segunda cancelación esta semana.')) return
    setCancelando(reservaId)
    try {
      const enfRef = doc(db, 'enfermeros', user.uid)
      const enfSnap = await getDoc(enfRef)
      const enfData = enfSnap.data() || {}

      // Contar cancelaciones esta semana
      const ahora = new Date()
      const inicioSemana = new Date(ahora)
      inicioSemana.setDate(ahora.getDate() - ahora.getDay())
      inicioSemana.setHours(0, 0, 0, 0)

      const cancelacionesSemana = (enfData.cancelacionesSemana || [])
        .filter(f => new Date(f) >= inicioSemana)

      const nuevasCancelaciones = [...cancelacionesSemana, ahora.toISOString()]

      // Calcular penalización
      let penalizadoHasta = enfData.penalizadoHasta || null
      let hsPenalizacion = 0

      if (nuevasCancelaciones.length >= 2) {
        // Calcular escala
        const vecesAntes = enfData.vecesPenalizado || 0
        if (vecesAntes === 0) hsPenalizacion = 12
        else if (vecesAntes === 1) hsPenalizacion = 24
        else hsPenalizacion = 48

        const hasta = new Date()
        hasta.setHours(hasta.getHours() + hsPenalizacion)
        penalizadoHasta = hasta.toISOString()

        await updateDoc(enfRef, {
          isOnline: false,
          penalizadoHasta,
          cancelacionesSemana: [],
          vecesPenalizado: vecesAntes + 1
        })

        alert(`Recibiste una penalización de ${hsPenalizacion} horas por 2 cancelaciones esta semana. No podrás conectarte hasta ${hasta.toLocaleString('es-AR')}.`)
      } else {
        await updateDoc(enfRef, {
          cancelacionesSemana: nuevasCancelaciones
        })
      }

      // Guardar en historial de penalizaciones
      if (hsPenalizacion > 0) {
        await addDoc(collection(db, 'penalizaciones'), {
          enfermeroId: user.uid,
          tipo: 'cancelacion_turno_reservado',
          horas: hsPenalizacion,
          reservaId,
          fecha: ahora.toISOString(),
          penalizadoHasta,
          semanaNumero: Math.ceil((ahora - new Date(ahora.getFullYear(), 0, 1)) / 604800000),
          anio: ahora.getFullYear()
        })
      }

      // Siempre guardar el evento de cancelación aunque no haya penalización
      await addDoc(collection(db, 'cancelaciones_profesionales'), {
        enfermeroId: user.uid,
        reservaId,
        fecha: ahora.toISOString(),
        cancelacionesEstaSemana: nuevasCancelaciones.length,
        penalizado: hsPenalizacion > 0
      })

      // Volver la solicitud a pendiente para otro profesional
      await updateDoc(doc(db, 'solicitudes', reservaId), {
        estado: 'pendiente',
        enfermeroId: null,
        profesionalAnterior: user.uid,
        profesionalCancelo: true,
        fechaCancelacionProfesional: ahora.toISOString()
      })

    } catch(e) { console.error(e) }
    setCancelando(null)
  }

  async function guardarDisponibilidad() {
    const user = auth.currentUser
    if (!user) return
    setGuardandoDisp(true)
    try {
      await updateDoc(doc(db, 'enfermeros', user.uid), {
        disponibilidad: { diasConfig }
      })
      setDispGuardada(true)
      setTimeout(() => setDispGuardada(false), 2500)
    } catch(e) { console.error(e) }
    setGuardandoDisp(false)
  }

  function formatFechaHora(fecha, hora) {
    if (!fecha) return ''
    const d = new Date(`${fecha}T${hora || '00:00'}`)
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) + ` · ${hora}hs`
  }

  function diasRestantes(fecha, hora) {
    const ahora = new Date()
    const turno = new Date(`${fecha}T${hora || '00:00'}`)
    const diff = turno - ahora
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (diff < 0) return { texto: 'Vencido', color: '#b71c1c' }
    if (dias === 0) return { texto: `Hoy · ${hora}hs`, color: '#1a535c', urgente: true }
    if (dias === 1) return { texto: 'Mañana', color: '#1a535c' }
    return { texto: `En ${dias} días`, color: '#64748b' }
  }

  function colorEstado(estado) {
    if (estado === 'pagado') return { bg: '#dcfce7', color: '#166534', texto: 'Confirmado' }
    if (estado === 'cancelado') return { bg: '#fee2e2', color: '#b71c1c', texto: 'Cancelado' }
    if (estado === 'completado') return { bg: '#e0f2fe', color: '#0284c7', texto: 'Completado' }
    return { bg: '#fef3c7', color: '#b45309', texto: estado }
  }

  const ahora = new Date()
  const proximas = reservas.filter(r => {
    const t = new Date(`${r.fechaReserva}T${r.horaReserva || '00:00'}`)
    return r.estado === 'pagado' && t >= ahora
  })

  return (
    <div style={{ padding: '20px 20px 120px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['proximas','Próximos'],['disponibilidad','Disponibilidad']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: '10px 6px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', background: tab === key ? '#1a535c' : '#f1f5f9', color: tab === key ? 'white' : '#64748b', transition: '0.2s' }}>
            {label}{key === 'proximas' && proximas.length > 0 ? ` (${proximas.length})` : ''}
          </button>
        ))}
      </div>

      {/* ── PRÓXIMOS ── */}
      {tab === 'proximas' && (
        cargando ? <p style={{ textAlign: 'center', color: 'var(--gris-texto)', fontWeight: 700 }}>Cargando...</p> :
        proximas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
            <i className="fa-solid fa-calendar-days" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '15px', display: 'block' }}></i>
            <p style={{ fontWeight: 700, color: 'var(--gris-texto)', margin: 0 }}>No tenés turnos reservados próximos.</p>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '8px 0 0' }}>Los turnos reservados por pacientes aparecerán acá.</p>
          </div>
        ) : proximas.map((r) => {
          const resto = diasRestantes(r.fechaReserva, r.horaReserva)
          const est = colorEstado(r.estado)
          return (
            <div key={r.id} style={{ background: 'white', borderRadius: '20px', padding: '18px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderLeft: '4px solid #10b981', animation: 'fadeIn 0.3s ease' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: resto.color, background: `${resto.color}18`, padding: '4px 10px', borderRadius: '8px' }}>
                  <i className="fa-solid fa-clock" style={{ color: '#1a535c', marginRight: '6px' }}></i>{resto.texto}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: est.bg, color: est.color }}>{est.texto}</span>
              </div>

              {/* Paciente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img
                  src={r.pacienteFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.pacienteNombre||'P')}&background=e6f2f3&color=1a535c&bold=true`}
                  style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }}
                  alt=""
                />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--texto)' }}>{r.pacienteNombre || 'Paciente'}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--gris-texto)' }}>
                    {r.servicios?.[0]}{r.servicios?.length > 1 ? ` +${r.servicios.length - 1}` : ''}
                  </p>
                </div>
              </div>

              {/* Fecha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className="fa-solid fa-calendar-day" style={{ color: '#1a535c', fontSize: '0.85rem' }}></i>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--texto)', textTransform: 'capitalize' }}>
                  {formatFechaHora(r.fechaReserva, r.horaReserva)}
                </span>
              </div>

              {/* Dirección — visible 30 min antes del turno */}
              {(() => {
                const turnoTime = new Date(`${r.fechaReserva}T${r.horaReserva || '00:00'}`).getTime()
                const ahora = Date.now()
                const minutos = (turnoTime - ahora) / 60000
                const visible = minutos <= 30
                return (
                  <div style={{ marginBottom: '14px' }}>
                    {visible ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-location-dot" style={{ color: '#b71c1c', fontSize: '0.85rem' }}></i>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gris-texto)', fontWeight: 600 }}>{r.direccion}</span>
                      </div>
                    ) : (
                      <div style={{ background: '#e6f2f3', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-location-dot" style={{ color: '#1a535c', fontSize: '0.85rem' }}></i>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, color: '#1a535c' }}>Dirección disponible 30 min antes del turno</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#1a535c', fontWeight: 600 }}>También te avisaremos cuando llegue ese momento</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Ganancia */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gris-texto)' }}>Tu ganancia</span>
                <span style={{ fontWeight: 800, color: '#1a535c', fontSize: '1rem' }}>${(r.pagoEnfermero || 0).toLocaleString('es-AR')}</span>
              </div>

              {/* Botón ir al servicio el día del turno */}
              {resto.urgente && (
                <button onClick={() => navigate(`/profesional/servicio-activo?id=${r.id}`)}
                  style={{ width: '100%', padding: '14px', background: '#1a535c', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(26,83,92,0.3)', marginBottom: '10px' }}>
                  <i className="fa-solid fa-car" style={{ marginRight: '8px' }}></i> Iniciar camino al paciente
                </button>
              )}
              {/* Botón cancelar turno */}
              <button onClick={() => cancelarTurno(r.id)} disabled={cancelando === r.id}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fca5a5', background: 'white', color: '#b71c1c', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', marginTop: '8px' }}>
                <i className="fa-solid fa-xmark" style={{ marginRight: '6px' }}></i>
                {cancelando === r.id ? 'Cancelando...' : 'No puedo asistir — Cancelar turno'}
              </button>
            </div>
          )
        })
      )}



      {/* ── DISPONIBILIDAD ── */}
      {tab === 'disponibilidad' && (
        <div>
          <div style={{ background: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--texto)' }}>Mis días disponibles</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', margin: '0 0 18px' }}>Configurá tus horarios habituales de trabajo. Recibirás una notificación recordándote conectarte cuando llegue ese momento.</p>

            <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <i className="fa-solid fa-bell"></i>
              <span>Recibirás una notificación 10 min antes de tu horario para recordarte conectarte</span>
            </div>

            {/* Lista de días con horario individual */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {DIAS_NOMBRES.map((nombre, i) => {
                const dia = diasConfig[i]
                const ROJO = '#b71c1c'
                return (
                  <div key={i} style={{ background: dia.activo ? '#f0f7f8' : '#f8fafc', borderRadius: '14px', padding: '12px 14px', border: `1.5px solid ${dia.activo ? '#1a535c' : '#e2e8f0'}`, transition: '0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {/* Toggle día */}
                      <div onClick={() => {
                        const n = [...diasConfig]; n[i] = { ...n[i], activo: !n[i].activo }; setDiasConfig(n)
                      }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700, fontSize: '0.8rem', border: `2px solid ${dia.activo ? ROJO : '#cbd5e1'}`, background: dia.activo ? ROJO : 'white', color: dia.activo ? 'white' : '#94a3b8', flexShrink: 0 }}>
                          {DIAS_LETRAS[i]}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dia.activo ? 'var(--texto)' : '#94a3b8' }}>{nombre}</span>
                      </div>
                      {!dia.activo && <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>No disponible</span>}
                    </div>

                    {/* Franjas horarias solo si está activo */}
                    {dia.activo && (
                      <div style={{ marginTop: '12px' }}>
                        {dia.franjas.map((franja, fIdx) => (
                          <div key={fIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--gris-texto)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>Desde</label>
                              <input type="time" value={franja.desde} onChange={e => {
                                const n = [...diasConfig]
                                n[i].franjas[fIdx] = { ...n[i].franjas[fIdx], desde: e.target.value }
                                setDiasConfig([...n])
                              }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontWeight: 700, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--gris-texto)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>Hasta</label>
                              <input type="time" value={franja.hasta} onChange={e => {
                                const n = [...diasConfig]
                                n[i].franjas[fIdx] = { ...n[i].franjas[fIdx], hasta: e.target.value }
                                setDiasConfig([...n])
                              }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontWeight: 700, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} />
                            </div>
                            {/* Botón eliminar franja (solo si hay más de una) */}
                            {dia.franjas.length > 1 && (
                              <button onClick={() => {
                                const n = [...diasConfig]
                                n[i].franjas = n[i].franjas.filter((_, idx) => idx !== fIdx)
                                setDiasConfig([...n])
                              }} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1.5px solid #fca5a5', background: 'white', color: '#b71c1c', cursor: 'pointer', flexShrink: 0, fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            )}
                          </div>
                        ))}
                        {/* Botón agregar franja */}
                        <button onClick={() => {
                          const n = [...diasConfig]
                          n[i].franjas = [...n[i].franjas, { desde: '08:00', hasta: '12:00' }]
                          setDiasConfig([...n])
                        }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px dashed #cbd5e1', background: 'transparent', color: '#1a535c', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', marginTop: '4px' }}>
                          <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Agregar otra franja horaria
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button onClick={guardarDisponibilidad} disabled={guardandoDisp}
              style={{ width: '100%', padding: '15px', background: dispGuardada ? '#10b981' : '#1a535c', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: '0.3s', fontSize: '0.95rem' }}>
              {guardandoDisp ? 'Guardando...' : dispGuardada ? '✓ Guardado' : 'Guardar disponibilidad'}
            </button>
          </div>

          {/* Resumen visual */}
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '0.85rem', color: 'var(--texto)' }}>Tu disponibilidad actual</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {DIAS_NOMBRES.map((nombre, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, background: diasConfig[i].activo ? '#e6f2f3' : 'transparent', color: diasConfig[i].activo ? '#1a535c' : '#cbd5e1' }}>
                  <span>{nombre}</span>
                  <span style={{ textAlign: 'right' }}>
                    {diasConfig[i].activo
                      ? diasConfig[i].franjas.map((f, k) => <div key={k}>{f.desde} - {f.hasta}</div>)
                      : 'Cerrado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
