import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'

export default function AgendaPaciente() {
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return
    const q = query(
      collection(db, 'solicitudes'),
      where('pacienteId', '==', user.uid),
      where('tipo', '==', 'reserva')
    )
    const unsub = onSnapshot(q, snap => {
      const lista = []
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }))
      lista.sort((a, b) => {
        const fa = new Date(`${a.fechaReserva}T${a.horaReserva}`)
        const fb = new Date(`${b.fechaReserva}T${b.horaReserva}`)
        return fa - fb
      })
      setReservas(lista)
      setCargando(false)
    })
    return () => unsub()
  }, [])

  async function cancelarReserva(id) {
    try {
      await updateDoc(doc(db, 'solicitudes', id), {
        estado: 'cancelado',
        fechaCancelacion: new Date().toISOString()
      })
    } catch(e) { console.error(e) }
  }

  function formatFechaHora(fecha, hora) {
    if (!fecha) return ''
    const d = new Date(`${fecha}T${hora || '00:00'}`)
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) + ` a las ${hora}hs`
  }

  function diasRestantes(fecha, hora) {
    const ahora = new Date()
    const turno = new Date(`${fecha}T${hora || '00:00'}`)
    const diff = turno - ahora
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (diff < 0) return { texto: 'Vencido', color: '#b71c1c', urgente: true }
    if (dias === 0 && hs < 2) return { texto: '¡Hoy! Menos de 2hs', color: '#b71c1c', urgente: true }
    if (dias === 0) return { texto: `Hoy a las ${hora}hs`, color: '#1a535c', urgente: true }
    if (dias === 1) return { texto: 'Mañana', color: '#1a535c', urgente: false }
    return { texto: `En ${dias} días`, color: '#64748b', urgente: false }
  }

  const ahora = new Date()
  const proximas = reservas.filter(r => {
    const t = new Date(`${r.fechaReserva}T${r.horaReserva || '00:00'}`)
    return (r.estado === 'pagado' || r.estado === 'en_curso') && t >= ahora
  })

  function colorEstado(estado) {
    if (estado === 'pagado') return { bg: '#dcfce7', color: '#166534', texto: 'Confirmado' }
    if (estado === 'cancelado') return { bg: '#fee2e2', color: '#b71c1c', texto: 'Cancelado' }
    if (estado === 'completado') return { bg: '#e0f2fe', color: '#0284c7', texto: 'Completado' }
    return { bg: '#fef3c7', color: '#b45309', texto: estado }
  }

  return (
    <div style={{ padding: '20px 20px 120px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 18px', color: 'var(--texto)' }}>Mi Agenda</h3>



      {cargando && <p style={{ textAlign: 'center', color: 'var(--gris-texto)', fontWeight: 700 }}>Cargando...</p>}

      {/* PRÓXIMAS */}
      {!cargando && (
        proximas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
            <i className="fa-solid fa-calendar-days" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '15px', display: 'block' }}></i>
            <p style={{ fontWeight: 700, color: 'var(--gris-texto)', margin: 0 }}>No tenés turnos reservados próximos.</p>
          </div>
        ) : proximas.map((r) => {
          const resto = diasRestantes(r.fechaReserva, r.horaReserva)
          const est = colorEstado(r.estado)
          return (
            <div key={r.id} style={{ background: 'white', borderRadius: '20px', padding: '18px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderLeft: '4px solid #10b981', animation: 'fadeIn 0.3s ease' }}>

              {/* Countdown + estado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: resto.color, background: `${resto.color}18`, padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-clock" style={{ color: '#1a535c' }}></i> {resto.texto}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', background: est.bg, color: est.color }}>
                  {est.texto}
                </span>
              </div>

              {/* Fecha y hora */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <i className="fa-solid fa-calendar-day" style={{ color: '#1a535c', fontSize: '0.9rem' }}></i>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--texto)', textTransform: 'capitalize' }}>
                  {formatFechaHora(r.fechaReserva, r.horaReserva)}
                </span>
              </div>

              {/* Servicios */}
              <div style={{ marginBottom: '12px' }}>
                {r.servicios?.slice(0, 2).map((s, j) => (
                  <span key={j} style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, background: '#e6f2f3', color: '#1a535c', padding: '3px 10px', borderRadius: '8px', marginRight: '6px', marginBottom: '4px' }}>{s}</span>
                ))}
                {r.servicios?.length > 2 && <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>+{r.servicios.length - 2} más</span>}
              </div>



              {/* Aviso de cobro */}
              <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <i className="fa-solid fa-circle-info" style={{ color: '#b45309', fontSize: '0.85rem', marginTop: '2px' }}></i>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#92400e', fontWeight: 600, lineHeight: 1.4 }}>
                  El monto total de <strong>${(r.totalPaciente || 0).toLocaleString('es-AR')}</strong> se cobrará 30 min antes del turno. Asegurate de tener fondos disponibles.
                </p>
              </div>

              {/* Precio */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 600 }}>Total del turno</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a535c' }}>${(r.totalPaciente || 0).toLocaleString('es-AR')}</span>
              </div>

              {/* Botón cancelar */}
              {r.estado === 'pagado' && (
                <div style={{ marginTop: '12px' }}>
                  <button onClick={() => { if(window.confirm('¿Cancelar este turno?')) cancelarReserva(r.id) }}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #fca5a5', background: 'white', color: '#b71c1c', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                    Cancelar turno
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}


    </div>
  )
}
