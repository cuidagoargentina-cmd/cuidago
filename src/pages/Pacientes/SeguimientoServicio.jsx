import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../../firebase/config'

export default function SeguimientoServicio() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const idSolicitud = searchParams.get('id')

  const [solicitud, setSolicitud] = useState(null)
  const [enfermero, setEnfermero] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [sheetPin, setSheetPin] = useState(false)
  const [sheetCancelar, setSheetCancelar] = useState(false)
  const [sheetDetalle, setSheetDetalle] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const timerRef = useRef(null)
  const enfMarkerRef = useRef(null)
  const [etaMinutos, setEtaMinutos] = useState(null)
  const pacientePosRef = useRef(null)
  // Reseña al profesional
  const [mostrarReseña, setMostrarReseña] = useState(false)
  const [estrellas, setEstrellas] = useState(0)
  const [estrellasHover, setEstrellasHover] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviandoResena, setEnviandoResena] = useState(false)
  const [resenaEnviada, setResenaEnviada] = useState(false)
  // Encuesta de la app
  const [mostrarEncuestaApp, setMostrarEncuestaApp] = useState(false)
  const [pasoEncuesta, setPasoEncuesta] = useState(0)
  const [respEncuesta, setRespEncuesta] = useState({})
  const [enviandoEncuesta, setEnviandoEncuesta] = useState(false)
  const [encuestaFinalizada, setEncuestaFinalizada] = useState(false)
  const [confirmandoFin, setConfirmandoFin] = useState(false)
  const [sinProfesional, setSinProfesional] = useState(false)
  const [profesionalCancelo, setProfesionalCancelo] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [noLeidos, setNoLeidos] = useState(0)
  const ultimaLecturaRef = useRef(parseInt(localStorage.getItem(`chat_leido_pac_${idSolicitud}`) || '0'))
  const [textoMensaje, setTextoMensaje] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const chatBottomRef = useRef(null)

  // Badge — siempre escucha aunque el chat esté cerrado
  useEffect(() => {
    if (!idSolicitud) return
    try {
      const unsub = onSnapshot(collection(db, 'solicitudes', idSolicitud, 'chat'), snap => {
        if (!chatAbierto) {
          const msgs = snap.docs.map(d => d.data())
          const nuevos = msgs.filter(m =>
            m.remitente === 'profesional' &&
            (m.fecha?.toMillis?.() || (m.fecha?.seconds || 0) * 1000) > ultimaLecturaRef.current
          ).length
          setNoLeidos(nuevos)
        }
      }, err => console.error('Badge error:', err))
      return () => unsub()
    } catch(e) { console.error(e) }
  }, [idSolicitud])

  // Mensajes — solo cuando el chat está abierto
  useEffect(() => {
    if (!idSolicitud || !chatAbierto) return
    try {
      const unsub = onSnapshot(collection(db, 'solicitudes', idSolicitud, 'chat'), snap => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const fa = a.fecha?.toMillis?.() || (a.fecha?.seconds || 0) * 1000
            const fb = b.fecha?.toMillis?.() || (b.fecha?.seconds || 0) * 1000
            return fa - fb
          })
        setMensajes(msgs)
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }, err => console.error('Chat error:', err))
      return () => unsub()
    } catch(e) { console.error(e) }
  }, [idSolicitud, chatAbierto])

  function abrirChat() {
    const ahora = Date.now()
    ultimaLecturaRef.current = ahora
    localStorage.setItem(`chat_leido_pac_${idSolicitud}`, ahora.toString())
    setNoLeidos(0)
    setChatAbierto(true)
  }


  function filtrarMensaje(texto) {
    // Teléfonos: secuencia de 8+ dígitos seguidos
    if (/\d{8,}/.test(texto.replace(/[\s\-\(\)\.]/g, ''))) return null
    // Emails
    if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(texto)) return null
    // WhatsApp, Instagram, redes
    if (/(whatsapp|instagram|telegram|facebook|twitter|tiktok)/i.test(texto)) return null
    // Palabras clave de contacto directo
    if (/(llamame|escribime|contactame|mi\s*celular|mi\s*teléfono|mi\s*cel)/i.test(texto)) return null
    return texto
  }
  async function enviarMensaje() {
    if (!textoMensaje.trim() || !idSolicitud) return
    const textoFiltrado = filtrarMensaje(textoMensaje.trim())
    if (!textoFiltrado) {
      alert('Por seguridad no podés compartir datos de contacto en el chat.')
      return
    }
    setEnviandoMsg(true)
    try {
      await addDoc(collection(db, 'solicitudes', idSolicitud, 'chat'), {
        texto: textoFiltrado,
        remitente: 'paciente',
        remitenteNombre: auth.currentUser?.displayName || 'Paciente',
        fecha: serverTimestamp()
      })
      setTextoMensaje('')
    } catch (e) { console.error(e) }
    setEnviandoMsg(false)
  }

  // Obtener ubicación del paciente
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => { pacientePosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
      () => {}
    )
  }, [])

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  useEffect(() => {
    if (!idSolicitud) { navigate('/paciente/turnos'); return }
    const unsub = onSnapshot(doc(db, 'solicitudes', idSolicitud), async (snap) => {
      if (!snap.exists()) { navigate('/paciente/turnos'); return }
      const data = snap.data()
      setSolicitud(data)
      if (data.estado === 'cancelado') {
        if (data.sinProfesional) { setSinProfesional(true); return }
        navigate('/paciente/turnos'); return
      }
      if (data.estado === 'pendiente' && data.profesionalCancelo) {
        setProfesionalCancelo(true)
        return
      }
      if (data.estado === 'completado') { setMostrarReseña(true); return }
      if (data.enfermeroId) {
        try {
          const enfSnap = await getDoc(doc(db, 'enfermeros', data.enfermeroId))
          if (enfSnap.exists()) setEnfermero(enfSnap.data())
        } catch {}
      }
      setCargando(false)
    })
    return () => unsub()
  }, [idSolicitud])



  // Cronómetro cuando está en_curso
  useEffect(() => {
    if (solicitud?.estado === 'en_curso') {
      const inicio = solicitud.fechaInicio ? new Date(solicitud.fechaInicio).getTime() : Date.now()
      timerRef.current = setInterval(() => {
        setSegundos(Math.floor((Date.now() - inicio) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [solicitud?.estado, solicitud?.fechaInicio])

  // Mapa Leaflet (solo cuando está en camino)
  useEffect(() => {
    if (cargando || solicitud?.estado === 'en_curso' || !mapRef.current || mapInstanceRef.current) return
    const cssL = document.createElement('link'); cssL.rel = 'stylesheet'; cssL.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(cssL)
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    const solId = idSolicitud
    const enfId = solicitud?.enfermeroId
    s.onload = () => {
      const L = window.L; if (!mapRef.current || mapInstanceRef.current) return
      const fix = document.createElement('style')
      fix.textContent = '.leaflet-div-icon{background:transparent!important;border:none!important}'
      document.head.appendChild(fix)

      const mkHeart = () => L.divIcon({ className: '', html: `<img src="/heart-marker.png" style="width:44px;height:44px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35);display:block;" />`, iconSize:[44,44], iconAnchor:[22,22] })
      const mkPin   = () => L.divIcon({ className: '', html: `<img src="/icon-192.png" style="width:48px;height:48px;border-radius:50%;border:3px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.4);display:block;" />`, iconSize:[48,48], iconAnchor:[24,48] })

      // Centro inicial — Buenos Aires
      const map = L.map(mapRef.current, { zoomControl:false, attributionControl:false }).setView([-34.5960,-58.3880], 15)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map)
      mapInstanceRef.current = map

      let pacMarker = null
      let enfMarker = null

      // Agregar corazón del paciente cuando tenga GPS
      const addPaciente = (lat, lng) => {
        pacientePosRef.current = { lat, lng }
        if (pacMarker) { pacMarker.setLatLng([lat,lng]) }
        else { pacMarker = L.marker([lat,lng], { icon: mkHeart() }).addTo(map) }
        map.setView([lat,lng], 15)
        updateDoc(doc(db, 'solicitudes', solId), { pacienteLat: lat, pacienteLng: lng }).catch(()=>{})
      }

      // GPS real del paciente
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => addPaciente(p.coords.latitude, p.coords.longitude),
          () => addPaciente(-34.5960, -58.3880)
        )
      } else { addPaciente(-34.5960, -58.3880) }

      // Escuchar GPS del enfermero en tiempo real
      if (enfId) {
        onSnapshot(doc(db, 'enfermeros', enfId), (snap) => {
          if (!snap.exists()) return
          const { lat, lng } = snap.data()
          if (!lat || !lng) return
          const pos = [lat, lng]
          if (enfMarker) { enfMarker.setLatLng(pos) }
          else {
            enfMarker = L.marker(pos, { icon: mkPin() }).addTo(map)
            enfMarkerRef.current = enfMarker
          }
          // ETA real
          const pac = pacientePosRef.current
          if (pac) {
            const dist = haversine(lat, lng, pac.lat, pac.lng)
            setEtaMinutos(Math.max(1, Math.round(dist / 25 * 60)))
          }
        })
      }
    }
    document.head.appendChild(s)
  }, [cargando, solicitud?.estado])

  async function enviarResena() {
    if (estrellas === 0) return
    setEnviandoResena(true)
    try {
      const enfId = solicitud?.enfermeroId
      await updateDoc(doc(db, 'solicitudes', idSolicitud), {
        resena: { estrellas, comentario, fecha: new Date().toISOString() }
      })
      if (enfId) {
        const enfRef = doc(db, 'enfermeros', enfId)
        const enfSnap = await getDoc(enfRef)
        if (enfSnap.exists()) {
          const d = enfSnap.data()
          const total = (d.totalResenas || 0) + 1
          const promedio = (((d.promedioEstrellas || 0) * (total - 1)) + estrellas) / total
          await updateDoc(enfRef, { totalResenas: total, promedioEstrellas: Math.round(promedio * 10) / 10 })
        }
      }
      setResenaEnviada(true)
      setTimeout(() => {
        setMostrarReseña(false)
        setMostrarEncuestaApp(true)
      }, 1500)
    } catch(e) { console.error(e) }
    setEnviandoResena(false)
  }

  async function enviarEncuestaApp() {
    setEnviandoEncuesta(true)
    try {
      const uid = auth.currentUser?.uid
      if (uid) {
        await updateDoc(doc(db, 'pacientes', uid), {
          encuestaApp: { ...respEncuesta, fecha: new Date().toISOString(), tipo: 'paciente' },
          encuestaAppRespondida: true
        })
      }
      setEncuestaFinalizada(true)
      setTimeout(() => navigate('/paciente/turnos'), 2000)
    } catch(e) { console.error(e) }
    setEnviandoEncuesta(false)
  }

  async function confirmarFinalizacion() {
    setConfirmandoFin(true)
    try {
      await updateDoc(doc(db, 'solicitudes', idSolicitud), {
        estado: 'completado',
        fechaCompletado: new Date().toISOString()
      })
      // El onSnapshot detecta 'completado' y activa mostrarReseña
    } catch(e) { console.error(e) }
    setConfirmandoFin(false)
  }

  async function ejecutarCancelacion() {
    if (!motivoCancelacion || cancelando) return
    setCancelando(true)
    const uid = auth.currentUser?.uid
    try {
      const ahora = new Date().toISOString()
      const penalidad = Math.round((solicitud?.totalPaciente || 0) * 0.20)

      // 1. Actualizar solicitud como cancelada
      await updateDoc(doc(db, 'solicitudes', idSolicitud), {
        estado: 'cancelado',
        motivoCancelacion,
        fechaCancelacion: ahora,
        canceladoPor: 'paciente',
        penalidad,
      })

      // 2. Guardar registro de cancelación en colección para el admin
      await addDoc(collection(db, 'cancelaciones_pacientes'), {
        pacienteId: uid,
        pacienteNombre: solicitud?.pacienteNombre || 'Paciente',
        solicitudId: idSolicitud,
        motivo: motivoCancelacion,
        fecha: ahora,
        penalidad,
        totalOriginal: solicitud?.totalPaciente || 0,
        servicios: solicitud?.servicios || [],
      })

    } catch (e) { console.error(e) }
    setCancelando(false)
    navigate('/paciente/turnos')
  }

  const formatTimer = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const ss = s % 60
    const f = (n) => String(n).padStart(2, '0')
    return `${f(h)}:${f(m)}:${f(ss)}`
  }

  const ETIQUETAS = ['', 'Muy malo', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!']
  const PREGUNTAS_PAC = [
    { key: 'p1', tipo: 'estrellas', texto: '¿Qué tan fácil fue pedir el servicio?' },
    { key: 'p2', tipo: 'estrellas', texto: '¿El profesional llegó a tiempo?' },
    { key: 'p3', tipo: 'estrellas', texto: '¿Cómo fue la atención recibida?' },
    { key: 'p4', tipo: 'opciones', texto: '¿Recomendarías CuidaGo?', opciones: ['Sí', 'No', 'Tal vez'] },
    { key: 'p5', tipo: 'estrellas', texto: '¿Cómo calificás la app?' },
  ]

  // ── RESEÑA AL PROFESIONAL ──
  if (mostrarReseña) return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes scalePop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}} @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {resenaEnviada ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', animation: 'scalePop 0.5s cubic-bezier(0.17,0.89,0.32,1.27)' }}>
          <div style={{ width: '80px', height: '80px', background: '#1a535c', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: '2rem', color: 'white' }}>✓</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>¡Gracias!</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Preparando la siguiente pantalla...</p>
        </div>
      ) : (
        <>
          {/* Header teal */}
          <div style={{ background: '#1a535c', padding: '40px 24px 32px', textAlign: 'center', color: 'white' }}>
            <img
              src={enfermero?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(enfermero?.nombre || 'E')}&background=1a535c&color=white&bold=true`}
              style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)', marginBottom: '14px' }}
              alt=""
            />
            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Calificá al profesional</p>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{enfermero?.nombre || 'Tu profesional'}</h2>
          </div>

          <div style={{ flex: 1, padding: '32px 24px 40px', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.4s ease' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '24px', textAlign: 'center' }}>¿Cómo fue la atención?</p>

            {/* Estrellas grandes */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
              {[1,2,3,4,5].map(n => (
                <span key={n}
                  onMouseEnter={() => setEstrellasHover(n)}
                  onMouseLeave={() => setEstrellasHover(0)}
                  onClick={() => setEstrellas(n)}
                  style={{ fontSize: '2.8rem', cursor: 'pointer', transition: 'transform 0.15s', transform: (estrellasHover || estrellas) >= n ? 'scale(1.2)' : 'scale(1)', filter: (estrellasHover || estrellas) >= n ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                  ⭐
                </span>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#1a535c', minHeight: '20px', marginBottom: '28px' }}>
              {ETIQUETAS[estrellasHover || estrellas] || ''}
            </p>

            {/* Comentario */}
            <textarea
              value={comentario}
              onChange={e => { if (filtrarMensaje(e.target.value)) setComentario(e.target.value); else { setComentario(e.target.value.slice(0,-1)); alert('Por seguridad no podés ingresar datos de contacto en la reseña.') } }}
              placeholder="Contá tu experiencia (opcional)..."
              maxLength={300}
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '14px 16px', fontFamily: 'inherit', fontSize: '0.9rem', minHeight: '90px', outline: 'none', background: 'white', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, color: '#0f172a', marginBottom: '6px' }}
            />
            <p style={{ margin: '0 0 28px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>{comentario.length}/300</p>

            <button onClick={enviarResena} disabled={estrellas === 0 || enviandoResena}
              style={{ width: '100%', padding: '18px', borderRadius: '18px', background: estrellas > 0 ? '#1a535c' : '#e2e8f0', color: estrellas > 0 ? 'white' : '#94a3b8', border: 'none', fontSize: '1rem', fontWeight: 800, cursor: estrellas > 0 ? 'pointer' : 'default', transition: '0.3s', fontFamily: 'inherit', marginBottom: '12px', boxShadow: estrellas > 0 ? '0 8px 25px rgba(26,83,92,0.3)' : 'none' }}>
              {enviandoResena ? 'Enviando...' : 'Enviar reseña'}
            </button>
            <button onClick={() => { setMostrarReseña(false); setMostrarEncuestaApp(true) }}
              style={{ width: '100%', padding: '14px', borderRadius: '18px', background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Saltar
            </button>
          </div>
        </>
      )}
    </div>
  )

  // ── ENCUESTA DE LA APP (paso a paso) ──
  if (mostrarEncuestaApp) {
    const pregunta = PREGUNTAS_PAC[pasoEncuesta]
    const totalPasos = PREGUNTAS_PAC.length
    const respActual = respEncuesta[pregunta?.key]
    const puedeSiguiente = respActual !== undefined && respActual !== 0 && respActual !== ''

    if (encuestaFinalizada) return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', textAlign: 'center', padding: '40px 24px', animation: 'scalePop 0.5s cubic-bezier(0.17,0.89,0.32,1.27)' }}>
        <style>{`@keyframes scalePop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
        <div style={{ width: '80px', height: '80px', background: '#1a535c', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: '2.2rem', color: 'white' }}>🎉</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>¡Gracias por tu opinión!</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Nos ayuda a mejorar CuidaGo.</p>
      </div>
    )

    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header teal con progreso */}
        <div style={{ background: '#1a535c', padding: '36px 24px 28px', color: 'white', textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.72rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Contanos tu experiencia</p>
          <h2 style={{ margin: '0 0 20px', fontSize: '1.15rem', fontWeight: 800 }}>Encuesta CuidaGo</h2>
          {/* Barra de progreso */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {PREGUNTAS_PAC.map((_, i) => (
              <div key={i} style={{ height: '4px', flex: 1, maxWidth: '40px', borderRadius: '2px', background: i <= pasoEncuesta ? 'white' : 'rgba(255,255,255,0.25)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '0.78rem', opacity: 0.65, fontWeight: 600 }}>Pregunta {pasoEncuesta + 1} de {totalPasos}</p>
        </div>

        {/* Contenido */}
        <div key={pasoEncuesta} style={{ flex: 1, padding: '36px 24px 40px', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.35s ease' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '32px', textAlign: 'center', lineHeight: 1.4 }}>{pregunta.texto}</p>

          {pregunta.tipo === 'estrellas' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n}
                    onClick={() => setRespEncuesta(r => ({ ...r, [pregunta.key]: n }))}
                    style={{ fontSize: '2.8rem', cursor: 'pointer', transition: 'transform 0.15s', transform: (respActual || 0) >= n ? 'scale(1.2)' : 'scale(1)', filter: (respActual || 0) >= n ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                    ⭐
                  </span>
                ))}
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#1a535c', minHeight: '22px', marginBottom: '0' }}>
                {ETIQUETAS[respActual || 0] || ''}
              </p>
            </>
          )}

          {pregunta.tipo === 'opciones' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pregunta.opciones.map(op => (
                <button key={op}
                  onClick={() => setRespEncuesta(r => ({ ...r, [pregunta.key]: op }))}
                  style={{ padding: '18px', borderRadius: '18px', border: `2px solid ${respActual === op ? '#1a535c' : '#e2e8f0'}`, background: respActual === op ? '#e6f2f3' : 'white', color: respActual === op ? '#1a535c' : '#64748b', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: '0.2s', fontFamily: 'inherit', textAlign: 'center' }}>
                  {op}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
            <button
              onClick={() => {
                if (pasoEncuesta < totalPasos - 1) {
                  setPasoEncuesta(p => p + 1)
                } else {
                  enviarEncuestaApp()
                }
              }}
              disabled={!puedeSiguiente || enviandoEncuesta}
              style={{ width: '100%', padding: '18px', borderRadius: '18px', background: puedeSiguiente ? '#1a535c' : '#e2e8f0', color: puedeSiguiente ? 'white' : '#94a3b8', border: 'none', fontSize: '1rem', fontWeight: 800, cursor: puedeSiguiente ? 'pointer' : 'default', transition: '0.3s', fontFamily: 'inherit', marginBottom: '12px', boxShadow: puedeSiguiente ? '0 8px 25px rgba(26,83,92,0.3)' : 'none' }}>
              {enviandoEncuesta ? 'Enviando...' : pasoEncuesta < totalPasos - 1 ? 'Siguiente →' : 'Enviar encuesta'}
            </button>
            <button onClick={() => navigate('/paciente/turnos')}
              style={{ width: '100%', padding: '13px', borderRadius: '18px', background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Saltar encuesta
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cargando) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      Cargando seguimiento...
    </div>
  )

  const nombreEnf = enfermero?.nombre || 'Tu profesional'
  const fotoEnf = enfermero?.foto || null
  const esEnCurso = solicitud?.estado === 'en_curso'
  const telefonoEnf = enfermero?.telefono || null
  const total = solicitud?.totalPacienteFinal || solicitud?.totalPaciente || 0

  const motivosData = [
    { key: 'ya_no_necesito', label: 'Ya no necesito el servicio' },
    { key: 'demora', label: 'El profesional demora demasiado' },
    { key: 'alternativa', label: 'Conseguí otra alternativa' },
    { key: 'otro', label: 'Otro motivo' },
  ]

  // ══════════════════════════════════════════
  // PANTALLA: SERVICIO EN CURSO
  // ══════════════════════════════════════════
  if (esEnCurso) return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .overlay-sheet { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.5);z-index:5000;opacity:0;pointer-events:none;transition:0.3s;backdrop-filter:blur(4px); }
        .overlay-sheet.active { opacity:1;pointer-events:auto; }
        .bottom-sheet { position:fixed;bottom:0;left:0;right:0;background:white;border-radius:30px 30px 0 0;padding:30px 25px 45px;z-index:5001;transform:translateY(100%);transition:0.4s cubic-bezier(0.2,0.8,0.2,1);box-shadow:0 -10px 40px rgba(0,0,0,0.1);max-height:90vh;overflow-y:auto; }
        .bottom-sheet.active { transform:translateY(0); }
        .leaflet-div-icon-clean { background: transparent !important; border: none !important; }
        @keyframes heartbeat {
          0%   { transform: scale(1); }
          14%  { transform: scale(1.25); }
          28%  { transform: scale(1); }
          42%  { transform: scale(1.2); }
          70%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        .heart-marker { animation: heartbeat 1.4s ease-in-out infinite; display:block; }
      `}</style>

      {/* BANNER VERDE CON CRONÓMETRO */}
      <div style={{ background: '#1a535c', color: 'white', padding: '25px 20px 35px', textAlign: 'center', borderRadius: '0 0 35px 35px', boxShadow: '0 10px 20px rgba(26,83,92,0.15)', position: 'relative', zIndex: 90 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '15px' }}>
          <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
          Servicio en Curso
        </div>
        <div style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-2px', marginBottom: '8px', fontVariantNumeric: 'tabular-nums' }}>
          {formatTimer(segundos)}
        </div>
        <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, fontWeight: 600 }}>
          {nombreEnf} está realizando la atención
        </p>
      </div>

      <div style={{ padding: '25px 20px 140px' }}>

        {/* TARJETA PROFESIONAL */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #e2e8f0' }}>
            <img
              src={fotoEnf || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreEnf)}&background=e6f2f3&color=1a535c&bold=true`}
              style={{ width: '50px', height: '50px', borderRadius: '14px', objectFit: 'cover' }}
              alt="" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=P&background=e6f2f3&color=1a535c` }}
            />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{nombreEnf}</h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Enfermero/a Profesional</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => navigate('/paciente/mensajes')} style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', border: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <i className="fa-solid fa-message"></i>
              </button>
              <button onClick={() => telefonoEnf && (window.location.href = `tel:${telefonoEnf}`)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', border: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <i className="fa-solid fa-phone"></i>
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicio en ejecución:</p>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1a535c' }}>
              {solicitud?.servicios?.[0]}{solicitud?.servicios?.length > 1 ? ` + ${solicitud.servicios.length - 1} más` : ''}
            </span>
          </div>
          <button onClick={() => setSheetDetalle(true)} style={{ width: '100%', background: 'transparent', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '14px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-file-invoice-dollar"></i> Ver desglose del servicio
          </button>
        </div>

        {/* BOTONES SOS / SOPORTE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <button onClick={() => navigate('/paciente/ayuda')} style={{ padding: '18px', borderRadius: '20px', border: '1px solid #f1f5f9', background: 'white', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)' }}>
            <i className="fa-solid fa-headset" style={{ fontSize: '1.4rem', color: '#0284c7' }}></i>
            Soporte 24/7
          </button>
          <button onClick={() => { if (window.confirm('¿Activar alerta de emergencia? Se notificará a tus contactos y al equipo de CuidaGo.')) alert('Alerta enviada. Un operador se comunicará de inmediato.') }} style={{ padding: '18px', borderRadius: '20px', border: '1px solid #fee2e2', background: '#fef2f2', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.4rem' }}></i>
            Botón SOS
          </button>
        </div>

        {/* PAGO PROTEGIDO */}
        <div style={{ textAlign: 'center', padding: '18px', background: '#f0fdf4', borderRadius: '20px', border: '1px dashed #10b981', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', fontWeight: 700, lineHeight: 1.5 }}>
            <i className="fa-solid fa-shield-halved"></i> Tu pago de <strong>${total.toLocaleString('es-AR')}</strong> está resguardado por CuidaGo.<br/>Se liberará al profesional al finalizar.
          </p>
        </div>

      </div>

      {/* BOTÓN FIJO — FINALIZAR o CONFIRMAR */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 18px 28px', zIndex: 1500, pointerEvents: 'none' }}>
        {solicitud?.profesionalFinalizo ? (
          <button
            onClick={confirmarFinalizacion}
            disabled={confirmandoFin}
            style={{ pointerEvents: 'auto', width: '100%', padding: '20px', borderRadius: '20px', background: '#b71c1c', color: 'white', border: 'none', fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', boxShadow: '0 10px 25px rgba(183,28,28,0.4)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontFamily: 'inherit', animation: 'pulse 1.5s infinite' }}>
            <i className="fa-solid fa-circle-check"></i> {confirmandoFin ? 'Confirmando...' : 'El profesional terminó — Confirmar'}
          </button>
        ) : (
          <button
            onClick={() => setSheetCancelar(true)}
            style={{ pointerEvents: 'auto', width: '100%', padding: '20px', borderRadius: '20px', background: '#1a535c', color: 'white', border: 'none', fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', boxShadow: '0 10px 25px rgba(26,83,92,0.35)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontFamily: 'inherit' }}>
            <i className="fa-solid fa-flag-checkered"></i> Finalizar Servicio
          </button>
        )}
      </div>

      {/* SHEET DETALLE */}
      <div className={`overlay-sheet ${sheetDetalle ? 'active' : ''}`} onClick={() => setSheetDetalle(false)} />
      <div className={`bottom-sheet ${sheetDetalle ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Detalle del Servicio</h3>
          <button onClick={() => setSheetDetalle(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1a535c', lineHeight: 1.8, margin: '0 0 15px' }}>
          • Visita base del profesional<br/>
          {solicitud?.servicios?.map((s, i) => <span key={i}>• {s}<br/></span>)}
        </p>
        {solicitud?.costoExtraMateriales > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
            <span style={{ color: '#64748b' }}>Materiales</span>
            <span style={{ fontWeight: 700, color: '#b71c1c' }}>+${solicitud.costoExtraMateriales.toLocaleString('es-AR')}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
          <span style={{ color: '#64748b' }}>Tarifa CuidaGo</span>
          <span style={{ fontWeight: 700, color: '#0284c7' }}>Incluida</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#1a535c', borderTop: '1px dashed #cbd5e1', paddingTop: '15px', marginTop: '5px' }}>
          <span>Total</span>
          <span>${total.toLocaleString('es-AR')}</span>
        </div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════
  // PANTALLA: PROFESIONAL EN CAMINO (mapa)
  // ══════════════════════════════════════════
  const pin = solicitud?.pin || '····'

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .overlay-sheet { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.5);z-index:5000;opacity:0;pointer-events:none;transition:0.3s;backdrop-filter:blur(4px); }
        .overlay-sheet.active { opacity:1;pointer-events:auto; }
        .bottom-sheet { position:fixed;bottom:0;left:0;right:0;background:white;border-radius:30px 30px 0 0;padding:30px 25px 45px;z-index:5001;transform:translateY(100%);transition:0.4s cubic-bezier(0.2,0.8,0.2,1);box-shadow:0 -10px 40px rgba(0,0,0,0.1);max-height:90vh;overflow-y:auto; }
        .bottom-sheet.active { transform:translateY(0); }
        .leaflet-div-icon-clean { background: transparent !important; border: none !important; }
        @keyframes heartbeat {
          0%   { transform: scale(1); }
          14%  { transform: scale(1.25); }
          28%  { transform: scale(1); }
          42%  { transform: scale(1.2); }
          70%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        .heart-marker { animation: heartbeat 1.4s ease-in-out infinite; display:block; }
        .motivo-btn { display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;background:#f8fafc;border:2px solid #e2e8f0;padding:16px;border-radius:14px;margin-bottom:10px;font-weight:700;color:#0f172a;cursor:pointer;transition:0.2s;font-size:0.95rem;font-family:inherit; }
        .motivo-btn.active { border-color:#b71c1c;background:#fef2f2;color:#b71c1c; }
        .btn-accion { width:42px;height:42px;border-radius:12px;border:none;font-size:1.1rem;display:flex;justify-content:center;align-items:center;cursor:pointer;transition:0.2s; }
      `}</style>

      {/* MAPA */}
      <div style={{ height: '42vh', width: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', background: '#1a535c', color: 'white', padding: '8px 20px', borderRadius: '30px', fontWeight: 800, fontSize: '0.9rem', zIndex: 1000, boxShadow: '0 5px 15px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
          {etaMinutos ? <><i className="fa-solid fa-person-walking"></i> Llegando en {etaMinutos} min</> : <><i className="fa-solid fa-person-walking"></i> El profesional está en camino</>}
        </div>
        <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
      </div>

      {/* PANEL */}
      <div style={{ background: '#f8fafc', borderRadius: '28px 28px 0 0', marginTop: '-24px', padding: '22px 18px 140px', position: 'relative', zIndex: 10, boxShadow: '0 -8px 20px rgba(0,0,0,0.06)' }}>

        {/* TARJETA PROFESIONAL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #e2e8f0' }}>
          {/* Izquierda: foto + nombre + chat */}
          <img src={fotoEnf || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreEnf)}&background=e6f2f3&color=1a535c&bold=true`}
            style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }}
            alt="" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=P&background=e6f2f3&color=1a535c` }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreEnf}</p>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>Enfermero/a</p>
          </div>
          <button onClick={abrirChat}
            style={{ background: '#1a535c', color: 'white', border: 'none', borderRadius: '12px', padding: '8px 13px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', position: 'relative', flexShrink: 0 }}>
            <i className="fa-solid fa-message"></i> Chat
            {noLeidos > 0 && (
              <span style={{ position: 'absolute', top: '-7px', right: '-7px', background: '#b71c1c', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          {/* Derecha: solo cancelar */}
          <div style={{ flex: 1 }}></div>
          <button onClick={() => setSheetCancelar(true)}
            style={{ background: '#fef2f2', color: '#b71c1c', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '8px 13px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', flexShrink: 0 }}>
            <i className="fa-solid fa-xmark"></i> Cancelar
          </button>
        </div>

        {/* DETALLE */}
        <div style={{ background: 'white', padding: '18px', borderRadius: '20px', marginBottom: '18px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Detalle de tu solicitud</h4>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
            <div style={{ width: '42px', height: '42px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1a535c', fontSize: '1.1rem', flexShrink: 0 }}>
              <i className="fa-solid fa-kit-medical"></i>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Servicios requeridos</p>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1a535c', lineHeight: 1.7 }}>
                • Visita base del profesional<br/>
                {solicitud?.servicios?.map((s, i) => <span key={i}>• {s}<br/></span>)}
              </p>
            </div>
          </div>
          {solicitud?.notas && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1a535c', fontSize: '1.1rem', flexShrink: 0 }}>
                <i className="fa-solid fa-comment-dots"></i>
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Tus indicaciones</p>
                <p style={{ margin: 0, background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', fontStyle: 'italic', color: '#0f172a', border: '1px dashed #cbd5e1', fontWeight: 600, lineHeight: 1.4 }}>"{solicitud.notas}"</p>
              </div>
            </div>
          )}
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-location-dot" style={{ color: '#1a535c' }}></i>
            {solicitud?.direccion}
          </div>
        </div>
      </div>

      {/* BOTÓN FIJO — mostrar PIN */}
      <div style={{ position: 'fixed', bottom: '25px', left: '20px', right: '20px', zIndex: 1500 }}>
        <button onClick={() => setSheetPin(true)}
          style={{ width: '100%', height: '75px', borderRadius: '24px', background: '#1a535c', color: 'white', border: 'none', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontFamily: 'inherit', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <i className="fa-solid fa-house-chimney-medical"></i> Llegó el profesional
        </button>
      </div>

      {/* MODAL PROFESIONAL CANCELÓ - BUSCANDO OTRO */}
      {profesionalCancelo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(3px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: '#b45309' }}></i>
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>El profesional canceló</h3>
            <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
              Estamos buscando otro profesional disponible en tu zona para continuar con tu atención.<br/><br/>
              El precio de tu servicio no cambia.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: '#1a535c', fontSize: '1.2rem' }}></i>
              <span style={{ fontWeight: 700, color: '#1a535c', fontSize: '0.9rem' }}>Buscando profesional...</span>
            </div>
            <button onClick={() => navigate('/paciente/turnos')}
              style={{ width: '100%', padding: '16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver mis turnos
            </button>
          </div>
        </div>
      )}

      {/* MODAL SIN PROFESIONAL */}
      {sinProfesional && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(3px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
              <div style={{ width: '64px', height: '64px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#b71c1c' }}></i>
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Sin profesionales disponibles</h3>
              <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
                El profesional canceló el servicio y en este momento no hay otros enfermeros disponibles en tu zona.<br/><br/>
                Tu solicitud fue cancelada sin cargo.
              </p>
              <button onClick={() => navigate('/paciente/explorar')}
                style={{ width: '100%', padding: '16px', background: '#1a535c', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Volver al inicio
              </button>
            </div>
          </div>
        </>
      )}

      {/* CHAT MODAL */}
      {chatAbierto && (
        <>
          <div onClick={() => setChatAbierto(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 5000 }}></div>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '28px 28px 0 0', zIndex: 5001, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={fotoEnf || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreEnf)}&background=e6f2f3&color=1a535c&bold=true`}
                  style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} alt="" />
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{nombreEnf}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>En camino</p>
                </div>
              </div>
              <button onClick={() => setChatAbierto(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px' }}>
              {mensajes.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginTop: '20px' }}>
                  <i className="fa-solid fa-message" style={{ fontSize: '1.5rem', opacity: 0.3, display: 'block', marginBottom: '8px' }}></i>
                  Mandá un mensaje al profesional
                </div>
              )}
              {mensajes.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.remitente === 'paciente' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: m.remitente === 'paciente' ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: m.remitente === 'paciente' ? '#1a535c' : '#f1f5f9', color: m.remitente === 'paciente' ? 'white' : '#0f172a', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4 }}>
                    {m.texto}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef}></div>
            </div>
            <div style={{ padding: '12px 16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', flexShrink: 0 }}>
              <input value={textoMensaje} onChange={e => setTextoMensaje(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
                placeholder="Escribir mensaje..." type="text"
                style={{ flex: 1, padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #e2e8f0', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={enviarMensaje} disabled={enviandoMsg || !textoMensaje.trim()}
                style={{ background: '#1a535c', color: 'white', border: 'none', borderRadius: '14px', width: '46px', height: '46px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: !textoMensaje.trim() ? 0.5 : 1 }}>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </>
      )}

      {/* SHEET PIN */}
      <div className={`overlay-sheet ${sheetPin ? 'active' : ''}`} onClick={() => setSheetPin(false)} />
      <div className={`bottom-sheet ${sheetPin ? 'active' : ''}`} style={{ textAlign: 'center', paddingTop: '40px' }}>
        <button onClick={() => setSheetPin(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}>
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div style={{ background: '#e0f2fe', width: '65px', height: '65px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: '1.8rem', color: '#0284c7' }}>
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>Código de Seguridad</h3>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '25px', lineHeight: 1.5 }}>
          Díctale este PIN al enfermero al llegar<br/>para iniciar la atención de forma segura.
        </p>
        <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '24px', border: '2px dashed #cbd5e1', marginBottom: '30px' }}>
          <p style={{ fontSize: '3.8rem', fontWeight: 800, color: '#1a535c', letterSpacing: '15px', margin: 0 }}>{pin}</p>
        </div>
        <button onClick={() => { document.getElementById('sheet-pin-overlay')?.classList.remove('active'); document.getElementById('sheet-pin-content')?.classList.remove('active') }}
          style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#f1f5f9', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', color: '#0f172a', fontFamily: 'inherit' }}>
          Cerrar
        </button>
      </div>

      {/* SHEET CANCELAR */}
      <div className={`overlay-sheet ${sheetCancelar ? 'active' : ''}`} onClick={() => { setSheetCancelar(false); setMotivoCancelacion(null) }} />
      <div className={`bottom-sheet ${sheetCancelar ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#b71c1c', fontWeight: 800 }}>
            <i className="fa-solid fa-triangle-exclamation"></i> Cancelar Servicio
          </h3>
          <button onClick={() => { setSheetCancelar(false); setMotivoCancelacion(null) }} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
          Recordá que al cancelar un servicio en curso se te cobrará el <strong style={{ color: '#0f172a' }}>20% de la prestación total</strong> en concepto de gastos operativos.
        </p>
        {motivosData.map(m => (
          <button key={m.key} className={`motivo-btn ${motivoCancelacion === m.key ? 'active' : ''}`} onClick={() => setMotivoCancelacion(m.key)}>
            <span>{m.label}</span>
            {motivoCancelacion === m.key && <i className="fa-solid fa-circle-check"></i>}
          </button>
        ))}
        <button onClick={ejecutarCancelacion} disabled={!motivoCancelacion || cancelando}
          style={{ width: '100%', background: '#b71c1c', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', marginTop: '15px', cursor: motivoCancelacion ? 'pointer' : 'default', opacity: motivoCancelacion ? 1 : 0.5, transition: '0.3s', fontFamily: 'inherit' }}>
          {cancelando ? 'Cancelando...' : 'ACEPTAR RECARGO Y CANCELAR'}
        </button>
      </div>
    </div>
  )
}
