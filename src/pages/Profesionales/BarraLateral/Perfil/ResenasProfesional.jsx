import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../../../../firebase/config'

export default function ResenasProfesional() {
  const [resenas, setResenas] = useState([])
  const [promedio, setPromedio] = useState(null)
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    try {
      // Intentar con currentUser directo primero
      let uid = auth.currentUser?.uid

      // Si no hay currentUser, esperar hasta 3 seg
      if (!uid) {
        uid = await new Promise((resolve) => {
          const unsub = auth.onAuthStateChanged(user => {
            unsub()
            resolve(user?.uid || null)
          })
          setTimeout(() => resolve(null), 3000)
        })
      }

      if (!uid) { setCargando(false); return }

      const q = query(
        collection(db, 'solicitudes'),
        where('enfermeroId', '==', uid),
        where('estado', '==', 'completado')
      )
      const snap = await getDocs(q)

      const lista = []
      snap.forEach(d => {
        const data = d.data()
        if (!data.resena?.estrellas) return
        lista.push({
          estrellas: data.resena.estrellas,
          comentario: data.resena.comentario || '',
          fecha: data.resena.fecha || data.fechaCompletado || null,
          pacienteNombre: data.pacienteNombre || 'Paciente',
          pacienteFoto: data.pacienteFoto || null,
        })
      })

      lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

      const prom = lista.length > 0
        ? lista.reduce((acc, r) => acc + r.estrellas, 0) / lista.length
        : null

      setResenas(lista)
      setTotal(lista.length)
      setPromedio(prom ? Math.round(prom * 10) / 10 : null)
    } catch(e) {
      console.error('Error cargando reseñas:', e)
    }
    setCargando(false)
  }

  function formatFecha(fechaStr) {
    if (!fechaStr) return ''
    const fecha = new Date(fechaStr)
    const diffDias = Math.floor((new Date() - fecha) / (1000 * 60 * 60 * 24))
    if (diffDias === 0) return 'Hoy'
    if (diffDias === 1) return 'Hace 1 día'
    if (diffDias < 7) return `Hace ${diffDias} días`
    if (diffDias < 14) return 'Hace 1 semana'
    if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semanas`
    return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  function renderEstrellas(n) {
    return [1,2,3,4,5].map(i => {
      const llena = i <= Math.floor(n)
      const media = !llena && i === Math.ceil(n) && n % 1 >= 0.5
      return (
        <i key={i}
          className={`fa-${media ? 'solid fa-star-half-stroke' : llena ? 'solid fa-star' : 'regular fa-star'}`}
          style={{ color: (llena || media) ? '#fbbf24' : 'rgba(255,255,255,0.3)', fontSize: '1.4rem' }}
        />
      )
    })
  }

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* PUNTUACIÓN GLOBAL */}
      <div style={{ background: '#1a535c', borderRadius: '24px', padding: '32px 20px', color: 'white', textAlign: 'center', marginBottom: '28px', boxShadow: '0 10px 25px rgba(26,83,92,0.25)' }}>
        {cargando ? (
          <div>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid white', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ opacity: 0.7, margin: 0, fontSize: '0.9rem' }}>Cargando reseñas...</p>
          </div>
        ) : promedio ? (
          <>
            <div style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-2px', margin: 0, lineHeight: 1 }}>
              {promedio.toFixed(1)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '14px 0 10px' }}>
              {renderEstrellas(promedio)}
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.85, margin: 0, fontWeight: 500 }}>
              Basado en {total} {total === 1 ? 'calificación' : 'calificaciones'}
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⭐</div>
            <p style={{ opacity: 0.9, margin: '0 0 6px', fontWeight: 700, fontSize: '1rem' }}>Todavía no tenés reseñas</p>
            <p style={{ opacity: 0.6, margin: 0, fontSize: '0.85rem' }}>Aparecerán acá cuando los pacientes te califiquen</p>
          </>
        )}
      </div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg) } }`}</style>

      {/* LISTA */}
      {!cargando && resenas.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '15px' }}>
            Últimos comentarios
          </h3>
          {resenas.map((r, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '20px', padding: '18px 20px', marginBottom: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={r.pacienteFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.pacienteNombre)}&background=e6f2f3&color=1a535c&bold=true`}
                    alt={r.pacienteNombre}
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=P&background=e6f2f3&color=1a535c` }}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{r.pacienteNombre}</h4>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(j => (
                        <i key={j}
                          className={`fa-${j <= r.estrellas ? 'solid' : 'regular'} fa-star`}
                          style={{ color: j <= r.estrellas ? '#fbbf24' : '#cbd5e1', fontSize: '0.78rem' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatFecha(r.fecha)}</span>
              </div>
              {r.comentario
                ? <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.6 }}>"{r.comentario}"</p>
                : <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', fontStyle: 'italic' }}>Sin comentario escrito.</p>
              }
            </div>
          ))}
        </>
      )}

      {!cargando && resenas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          <i className="fa-regular fa-star" style={{ fontSize: '2.5rem', marginBottom: '14px', display: 'block' }}></i>
          <p style={{ fontWeight: 700, margin: '0 0 6px', color: '#64748b' }}>Aún no hay reseñas</p>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Los pacientes podrán calificarte al finalizar cada servicio.</p>
        </div>
      )}
    </div>
  )
}
