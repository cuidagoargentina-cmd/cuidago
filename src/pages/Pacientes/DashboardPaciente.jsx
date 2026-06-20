import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where, getDocs, doc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../../dashboard-paciente.css'

const PILLS = [
  { label: 'Todos', icon: 'fa-house-medical' },
  { label: 'Medicación', icon: 'fa-syringe' },
  { label: 'Curaciones', icon: 'fa-band-aid' },
  { label: 'Monitoreo', icon: 'fa-heart-pulse' },
  { label: 'Higiene', icon: 'fa-bed' },
  { label: 'Técnicos', icon: 'fa-flask-vial' },
  { label: 'Respiratorio', icon: 'fa-lungs' },
  { label: 'Alimentación', icon: 'fa-utensils' },
  { label: 'Acompañamiento', icon: 'fa-clock' },
  { label: 'Urgencias', icon: 'fa-truck-medical' }
]

const RADIO_KM = 10

function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function DashboardPaciente({ setGlobalSubtext }) {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const marcadoresRef = useRef({})
  const ubicacionRef = useRef(null)

  const [ubicacionPaciente, setUbicacionPaciente] = useState(null)
  const [todos, setTodos] = useState([])
  const [filtrados, setFiltrados] = useState([])
  const [pillActiva, setPillActiva] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [sheetAbierto, setSheetAbierto] = useState(false)
  const [enfermeroActivo, setEnfermeroActivo] = useState(null)
  const [resenasAbiertas, setResenasAbiertas] = useState(false)
  const [resenasData, setResenasData] = useState([])
  const [resenasPromedio, setResenasPromedio] = useState(null)
  const [cargandoResenas, setCargandoResenas] = useState(false)
  const [mapaListo, setMapaListo] = useState(false)


  // 1. OBTENER UBICACIÓN DEL PACIENTE
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          ubicacionRef.current = loc
          setUbicacionPaciente(loc)
          if (setGlobalSubtext) setGlobalSubtext('Buenos Aires')
        },
        () => {
          const loc = { lat: -34.6037, lng: -58.3816 }
          ubicacionRef.current = loc
          setUbicacionPaciente(loc)
        }
      )
    } else {
      const loc = { lat: -34.6037, lng: -58.3816 }
      ubicacionRef.current = loc
      setUbicacionPaciente(loc)
    }
  }, [])

  // 2. INICIALIZAR MAPA
  useEffect(() => {
    if (!ubicacionPaciente || mapInstance.current) return

    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
      .setView([ubicacionPaciente.lat, ubicacionPaciente.lng], 14)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map)

    // Puntito azul del paciente
    const userIcon = L.divIcon({
      html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>',
      iconSize: [22, 22], iconAnchor: [11, 11]
    })
    L.marker([ubicacionPaciente.lat, ubicacionPaciente.lng], { icon: userIcon }).addTo(map)

    mapInstance.current = map
    setMapaListo(true)

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [ubicacionPaciente])

  // 3. ESCUCHAR ENFERMEROS EN TIEMPO REAL
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'enfermeros'), (snapshot) => {
      const loc = ubicacionRef.current

      const lista = []
      snapshot.forEach(d => {
        const data = d.data()
        if (!data.lat || !data.lng) return

        let distanciaKm = null
        let eta = '--'

        if (loc) {
          distanciaKm = calcularDistancia(loc.lat, loc.lng, data.lat, data.lng)
          if (distanciaKm > RADIO_KM) return

          const mins = Math.round((distanciaKm / 30) * 60)
          eta = mins < 1 ? '1 min aprox.' : `${mins} min aprox.`
        }

        lista.push({
          id: d.id,
          nombre: data.nombre || 'Profesional',
          foto: data.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre || 'P')}&background=e6f2f3&color=1a535c`,
          especialidadDestacada: data.especialidadDestacada || '',
          especialidades: data.especialidades || [],
          biografia: data.biografia || '',
          matricula: data.matricula || '--',
          isOnline: data.isOnline === true,
          lat: data.lat,
          lng: data.lng,
          rating: data.promedioEstrellas || data.rating || '--',
          reviews: data.totalResenas || data.reviews || 0,
          promedioEstrellas: data.promedioEstrellas || null,
          totalResenas: data.totalResenas || 0,
          distanciaKm,
          eta,
          resenas: data.resenas || [],
          tags: (data.especialidades || []).filter(e => e !== data.especialidadDestacada).slice(0, 2),
          serviciosActivos: data.serviciosActivos || null
        })
      })

      lista.sort((a, b) => (a.distanciaKm || 999) - (b.distanciaKm || 999))
      setTodos(lista)
      setFiltrados(lista)
    })

    return () => unsub()
  }, [])

  // 4. ACTUALIZAR MARCADORES EN EL MAPA
  useEffect(() => {
    if (!mapaListo || !mapInstance.current) return

    const iconVerde = L.icon({ iconUrl: '/image_11.png', iconSize: [42, 42], iconAnchor: [21, 42] })
    const iconRojo  = L.icon({ iconUrl: '/image_10.png', iconSize: [42, 42], iconAnchor: [21, 42] })

    todos.forEach(enf => {
      const icon = enf.isOnline ? iconVerde : iconRojo
      const estadoText = enf.isOnline ? 'Disponible ahora' : 'No disponible'
      const estadoColor = enf.isOnline ? '#10b981' : '#b71c1c'

      const popupHTML = `
        <div style="font-family:inherit;min-width:200px;padding:4px;">
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
            <img src="${enf.foto}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(enf.nombre)}&background=e6f2f3&color=1a535c'">
            <div>
              <div style="font-weight:800;font-size:0.9rem;color:#1a535c;">${enf.nombre}</div>
              <div style="font-size:0.72rem;color:#64748b;font-weight:600;">${enf.especialidadDestacada}</div>
            </div>
          </div>
          <div style="color:${estadoColor};font-size:0.75rem;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:5px;">
            <i class="fa-solid fa-clock"></i> ${estadoText}
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.__abrirResenas__('${enf.id}')" style="flex:1;padding:8px;background:#fffbeb;color:#b45309;border:1px solid #fde68a;border-radius:10px;font-size:0.75rem;font-weight:800;cursor:pointer;">
              <i class="fa-solid fa-star"></i> ${enf.rating}
            </button>
            <button onclick="window.__abrirFicha__('${enf.id}')" style="flex:1;padding:8px;background:#1a535c;color:white;border:none;border-radius:10px;font-size:0.75rem;font-weight:800;cursor:pointer;">
              Ver perfil
            </button>
          </div>
        </div>
      `

      if (marcadoresRef.current[enf.id]) {
        const m = marcadoresRef.current[enf.id]
        const ll = m.getLatLng()
        if (ll.lat !== enf.lat || ll.lng !== enf.lng) m.setLatLng([enf.lat, enf.lng])
        m.setIcon(icon)
        m.setPopupContent(popupHTML)
      } else {
        const m = L.marker([enf.lat, enf.lng], { icon })
          .bindPopup(popupHTML, { className: 'custom-popup', closeButton: false, maxWidth: 240 })
          .addTo(mapInstance.current)
        marcadoresRef.current[enf.id] = m
      }
    })

    const idsActivos = todos.map(e => e.id)
    Object.keys(marcadoresRef.current).forEach(id => {
      if (!idsActivos.includes(id)) {
        mapInstance.current.removeLayer(marcadoresRef.current[id])
        delete marcadoresRef.current[id]
      }
    })
  }, [todos, mapaListo])

  // Exponer funciones al popup
  useEffect(() => {
    window.__abrirFicha__ = (id) => {
      const enf = todos.find(e => e.id === id)
      if (enf) { setEnfermeroActivo(enf); setSheetAbierto(true) }
    }
    window.__abrirResenas__ = (id) => {
      const enf = todos.find(e => e.id === id)
      if (enf) { setEnfermeroActivo(enf); setResenasAbiertas(true) }
    }
    return () => { delete window.__abrirFicha__; delete window.__abrirResenas__ }
  }, [todos])

  async function cargarResenas(enfId) {
    setCargandoResenas(true)
    setResenasAbiertas(true)
    setResenasData([])
    try {
      const q = query(
        collection(db, 'solicitudes'),
        where('enfermeroId', '==', enfId),
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
      const prom = lista.length > 0 ? lista.reduce((acc, r) => acc + r.estrellas, 0) / lista.length : null
      const promRedondeado = prom ? Math.round(prom * 10) / 10 : null
      setResenasData(lista)
      setResenasPromedio(promRedondeado)

      // Actualizar conteo real en Firestore y en el estado local
      try {
        const { doc: firestoreDoc, setDoc: firestoreSet } = await import('firebase/firestore')
        await firestoreSet(firestoreDoc(db, 'enfermeros', enfId), {
          totalResenas: lista.length,
          promedioEstrellas: promRedondeado || 0
        }, { merge: true })
      } catch(e) {}

      // Actualizar el enfermero en el estado local
      setTodos(prev => prev.map(e => e.id === enfId
        ? { ...e, totalResenas: lista.length, promedioEstrellas: promRedondeado || e.promedioEstrellas }
        : e
      ))
      setFiltrados(prev => prev.map(e => e.id === enfId
        ? { ...e, totalResenas: lista.length, promedioEstrellas: promRedondeado || e.promedioEstrellas }
        : e
      ))
    } catch(e) { console.error(e) }
    setCargandoResenas(false)
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

  const PILL_TO_SERVICIO = {
    'Medicación':     'medicamentos',
    'Curaciones':     'curaciones',
    'Monitoreo':      'monitoreo',
    'Higiene':        'higiene',
    'Técnicos':       'invasivos',
    'Respiratorio':   'respiratorios',
    'Alimentación':   'alimentacion',
    'Acompañamiento': 'acompanamiento',
    'Urgencias':      'urgencias',
  }

  function aplicarFiltros(pill, texto, lista) {
    let resultado = lista
    if (pill && pill !== 'Todos') {
      const keyServicio = PILL_TO_SERVICIO[pill]
      resultado = resultado.filter(e => {
        // Si tiene serviciosActivos definido, usar eso
        if (e.serviciosActivos && keyServicio) {
          return e.serviciosActivos[keyServicio] !== false
        }
        // Fallback: filtrar por especialidades
        return e.especialidades.some(esp => esp.toLowerCase().includes(pill.toLowerCase())) ||
          e.especialidadDestacada.toLowerCase().includes(pill.toLowerCase())
      })
    }
    if (texto && texto.trim()) {
      const t = texto.toLowerCase()
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(t) ||
        e.especialidadDestacada.toLowerCase().includes(t) ||
        e.especialidades.some(esp => esp.toLowerCase().includes(t)) ||
        e.tags?.some(tag => tag.toLowerCase().includes(t))
      )
    }
    return resultado
  }

  function activarPill(label) {
    setPillActiva(label)
    setFiltrados(aplicarFiltros(label, busqueda, todos))
  }

  function handleBusqueda(v) {
    setBusqueda(v)
    setFiltrados(aplicarFiltros(pillActiva, v, todos))
  }

  function irAContratar() {
    if (!enfermeroActivo) return
    sessionStorage.setItem('enfermeroSeleccionado', JSON.stringify({
      id: enfermeroActivo.id, nombre: enfermeroActivo.nombre,
      foto: enfermeroActivo.foto, isOnline: enfermeroActivo.isOnline
    }))
    navigate(`/paciente/contratar-servicio?enf=${enfermeroActivo.id}&online=${enfermeroActivo.isOnline}`)
  }

  return (
    <div style={{ padding: '20px 20px 120px 20px' }}>

      <div className="search-box">
        <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--gris-texto)' }}></i>
        <input type="text" placeholder="Profesional, servicio o dirección..." value={busqueda} onChange={e => handleBusqueda(e.target.value)} />
      </div>

      <div className="pills-container">
        {PILLS.map(pill => (
          <div key={pill.label} className={`pill ${pillActiva === pill.label ? 'active' : ''}`} onClick={() => activarPill(pill.label)}>
            <i className={`fa-solid ${pill.icon}`}></i>
            <span>{pill.label}</span>
          </div>
        ))}
      </div>

      <div id="map-v8" ref={mapRef}></div>

      <h3 className="section-title">Disponibles ahora</h3>

      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gris-texto)' }}>
          <i className="fa-solid fa-user-nurse" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
          <p style={{ fontWeight: 700 }}>No hay profesionales en tu zona</p>
        </div>
      )}

      {filtrados.map(enf => (
        <div key={enf.id} className="pro-card-v8" onClick={() => { setEnfermeroActivo(enf); setSheetAbierto(true) }}>
          <div className="img-wrapper">
            <img src={enf.foto} alt={enf.nombre} onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(enf.nombre)}&background=e6f2f3&color=1a535c` }} />
            <div className={`status-dot ${enf.isOnline ? 'dot-online' : 'dot-offline'}`}></div>
          </div>
          <div className="pro-details" style={{ flex: 1 }}>
            <h4>{enf.nombre}</h4>
            <p>{enf.biografia || enf.especialidadDestacada}</p>
            <span className="pro-rating"><i className="fa-solid fa-star"></i> {enf.promedioEstrellas ? enf.promedioEstrellas.toFixed(1) : '--'}{enf.totalResenas > 0 ? ` (${enf.totalResenas})` : ''}</span>
          </div>
          <div style={{ textAlign: 'right', minWidth: '55px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: enf.isOnline ? 'var(--verde-logo)' : 'var(--gris-texto)' }}>{enf.eta}</div>
          </div>
        </div>
      ))}

      <div className={`overlay-sheet ${sheetAbierto ? 'active' : ''}`} onClick={() => { setSheetAbierto(false); setResenasAbiertas(false) }}></div>

      <div className={`bottom-sheet ${sheetAbierto ? 'active' : ''}`}>
        {enfermeroActivo && (
          <>
            <div style={{ width: '50px', height: '5px', background: '#cbd5e1', borderRadius: '5px', margin: '0 auto 20px' }}></div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <img src={enfermeroActivo.foto} alt={enfermeroActivo.nombre}
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(enfermeroActivo.nombre)}&background=e6f2f3&color=1a535c` }}
                style={{ width: '75px', height: '75px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', color: 'var(--verde-logo)' }}>{enfermeroActivo.nombre}</h3>
                <div className={`status-pill-sheet ${enfermeroActivo.isOnline ? 'status-pill-online' : 'status-pill-offline'}`}>
                  {enfermeroActivo.isOnline ? 'DISPONIBLE AHORA' : 'NO DISPONIBLE'}
                </div>
                <button className="btn-resenas-mapa" onClick={() => cargarResenas(enfermeroActivo.id)}
                  style={{ marginTop: '8px', padding: '5px 10px', fontSize: '0.78rem' }}>
                  <i className="fa-solid fa-star"></i> {enfermeroActivo.promedioEstrellas ? enfermeroActivo.promedioEstrellas.toFixed(1) : '--'} · Ver reseñas
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--texto)', margin: '18px 0', lineHeight: 1.5, fontWeight: 500 }}>
              {enfermeroActivo.biografia || 'Profesional de enfermería.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {enfermeroActivo.especialidadDestacada && (
                <span className="tag tag-destacada">
                  <i className="fa-solid fa-star" style={{ fontSize: '0.65rem', marginRight: '4px' }}></i>
                  {enfermeroActivo.especialidadDestacada}
                </span>
              )}
              {enfermeroActivo.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '15px 20px', borderRadius: '18px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gris-texto)', marginBottom: '4px' }}>TIEMPO ESTIMADO DE LLEGADA</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--texto)' }}>{enfermeroActivo.eta}</strong>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gris-texto)', marginBottom: '4px' }}>MATRÍCULA</span>
                <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>MN {enfermeroActivo.matricula}</strong>
              </div>
            </div>

            <button className="btn-primary" onClick={irAContratar}
              style={{ background: enfermeroActivo.isOnline ? 'var(--verde-logo)' : 'var(--rojo-logo)' }}>
              {enfermeroActivo.isOnline ? 'Contratar Servicio' : 'Reservar Turno'} <i className="fa-solid fa-arrow-right"></i>
            </button>
          </>
        )}
      </div>

      <div className={`modal-resenas ${resenasAbiertas ? 'active' : ''}`} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', position: 'sticky', top: 0, background: 'white', paddingBottom: '10px', zIndex: 5 }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 800, color: 'var(--verde-logo)' }}>Reseñas</h3>
            {resenasPromedio && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                <span style={{ color: '#fbbf24', fontWeight: 800 }}>★ {resenasPromedio.toFixed(1)}</span>
                · {resenasData.length} {resenasData.length === 1 ? 'reseña' : 'reseñas'}
              </div>
            )}
          </div>
          <button onClick={() => { setResenasAbiertas(false); setResenasData([]) }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--gris-texto)' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {cargandoResenas ? (
          <p style={{ color: 'var(--gris-texto)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>Cargando reseñas...</p>
        ) : resenasData.length > 0 ? resenasData.map((r, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: '16px', padding: '14px 16px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={r.pacienteFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.pacienteNombre)}&background=e6f2f3&color=1a535c&bold=true`}
                  alt={r.pacienteNombre}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=P&background=e6f2f3&color=1a535c` }}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{r.pacienteNombre}</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(j => (
                      <i key={j} className={`fa-${j <= r.estrellas ? 'solid' : 'regular'} fa-star`}
                        style={{ color: j <= r.estrellas ? '#fbbf24' : '#cbd5e1', fontSize: '0.65rem' }} />
                    ))}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{formatFecha(r.fecha)}</span>
            </div>
            {r.comentario
              ? <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>"{r.comentario}"</p>
              : <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic' }}>Sin comentario escrito.</p>
            }
          </div>
        )) : (
          <p style={{ color: 'var(--gris-texto)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
            Este profesional aún no tiene reseñas.
          </p>
        )}
      </div>

    </div>
  )
}
