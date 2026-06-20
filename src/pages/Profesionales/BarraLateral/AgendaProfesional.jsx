import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore'
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
  const notifIdsRef = useRef(new Set())

  // Disponibilidad
  const [diasActivos, setDiasActivos] = useState([true, true, false, true, true, false, false])
  const [horario, setHorario] = useState({ desde: '08:00', hasta: '18:00' })

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    // Cargar disponibilidad guardada
    getDoc(doc(db, 'enfermeros', user.uid)).then(snap => {
      if (!snap.exists()) return
      const d = snap.data()
      if (d.disponibilidad) {
        if (d.disponibilidad.dias) setDiasActivos(d.disponibilidad.dias)
        if (d.disponibilidad.desde) setHorario({ desde: d.disponibilidad.desde, hasta: d.disponibilidad.hasta })
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

  async function guardarDisponibilidad() {
    const user = auth.currentUser
    if (!user) return
    setGuardandoDisp(true)
    try {
      await updateDoc(doc(db, 'enfermeros', user.uid), {
        disponibilidad: { dias: diasActivos, desde: horario.desde, hasta: horario.hasta }
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
  const pasadas = reservas.filter(r =>
    r.estado === 'completado' || r.estado === 'cancelado'
  )

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
            <div key={r.id} style={{ background: 'white', borderRadius: '20px', padding: '18px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(16,185,129,0.15)', borderLeft: '4px solid #10b981', border: '1.5px solid #bbf7d0', animation: 'fadeIn 0.3s ease' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: resto.color, background: `${resto.color}18`, padding: '4px 10px', borderRadius: '8px' }}>
                  ⏰ {resto.texto}
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

              {/* Dirección */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#b71c1c', fontSize: '0.85rem' }}></i>
                <span style={{ fontSize: '0.82rem', color: 'var(--gris-texto)', fontWeight: 600 }}>{r.direccion}</span>
              </div>

              {/* Ganancia */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gris-texto)' }}>Tu ganancia</span>
                <span style={{ fontWeight: 800, color: '#1a535c', fontSize: '1rem' }}>${(r.pagoEnfermero || 0).toLocaleString('es-AR')}</span>
              </div>

              {/* Botón ir al servicio el día del turno */}
              {resto.urgente && (
                <button onClick={() => navigate(`/profesional/servicio-activo?id=${r.id}`)}
                  style={{ width: '100%', padding: '14px', background: '#1a535c', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(26,83,92,0.3)' }}>
                  <i className="fa-solid fa-car" style={{ marginRight: '8px' }}></i> Iniciar camino al paciente
                </button>
              )}
            </div>
          )
        })
      )}

      {/* ── HISTORIAL ── */}
      {tab === 'pasadas' && (
        pasadas.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gris-texto)', padding: '30px 0', fontWeight: 700 }}>No hay turnos anteriores.</p>
        ) : pasadas.map((r) => {
          const est = colorEstado(r.estado)
          return (
            <div key={r.id} style={{ background: 'white', borderRadius: '18px', padding: '16px', marginBottom: '12px', border: '1px solid #f1f5f9', opacity: r.estado === 'cancelado' ? 0.7 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', textTransform: 'capitalize' }}>{formatFechaHora(r.fechaReserva, r.horaReserva)}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: est.bg, color: est.color }}>{est.texto}</span>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: 'var(--gris-texto)' }}>{r.pacienteNombre} · {r.servicios?.[0]}</p>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1a535c' }}>${(r.pagoEnfermero || 0).toLocaleString('es-AR')}</p>
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
              <span>🔔 Recibirás una notificación 10 min antes de tu horario para recordarte conectarte</span>
            </div>

            {/* Días */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              {DIAS_LETRAS.map((dia, i) => (
                <div key={i} onClick={() => {
                  const n = [...diasActivos]; n[i] = !n[i]; setDiasActivos(n)
                }} style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: '0.2s', border: `2px solid ${diasActivos[i] ? '#1a535c' : '#cbd5e1'}`, background: diasActivos[i] ? '#1a535c' : 'white', color: diasActivos[i] ? 'white' : '#94a3b8' }}>
                  {dia}
                </div>
              ))}
            </div>

            {/* Días activos label */}
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>
              Disponible: <strong>{DIAS_NOMBRES.filter((_, i) => diasActivos[i]).join(', ') || 'Ningún día'}</strong>
            </p>

            {/* Horarios */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              {[['desde','Desde'],['hasta','Hasta']].map(([key, label]) => (
                <div key={key} style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--gris-texto)', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase' }}>{label}</label>
                  <input type="time" value={horario[key]} onChange={e => setHorario(h => ({ ...h, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: 700, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontSize: '1rem' }} />
                </div>
              ))}
            </div>

            <button onClick={guardarDisponibilidad} disabled={guardandoDisp}
              style={{ width: '100%', padding: '15px', background: dispGuardada ? '#10b981' : '#1a535c', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: '0.3s', fontSize: '0.95rem' }}>
              {guardandoDisp ? 'Guardando...' : dispGuardada ? '✓ Guardado' : 'Guardar disponibilidad'}
            </button>
          </div>

          {/* Resumen visual */}
          <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '0.85rem', color: 'var(--texto)' }}>Tu disponibilidad actual</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DIAS_NOMBRES.map((nombre, i) => (
                <span key={i} style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, background: diasActivos[i] ? '#e6f2f3' : '#f1f5f9', color: diasActivos[i] ? '#1a535c' : '#94a3b8' }}>
                  {nombre} {diasActivos[i] ? `${horario.desde}-${horario.hasta}` : '✗'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
