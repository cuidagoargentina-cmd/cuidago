import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, getDocs, query, where, arrayUnion } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { onAuthStateChanged, getAuth } from 'firebase/auth'

export default function ServicioActivoProfesional() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const idSolicitud = searchParams.get('id')

  const [solicitud, setSolicitud] = useState(null)
  const [paciente, setPaciente] = useState(null)
  const [enfermero, setEnfermero] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [segundos, setSegundos] = useState(0)

  const [sheetCancelar, setSheetCancelar] = useState(false)
  const [sheetPin, setSheetPin] = useState(false)
  const [sheetFicha, setSheetFicha] = useState(false)
  const [sheetReporte, setSheetReporte] = useState(false)
  const [popupExito, setPopupExito] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [mostrarEncuestaApp, setMostrarEncuestaApp] = useState(false)
  const [pasoEncuesta, setPasoEncuesta] = useState(0)
  const [respEncuesta, setRespEncuesta] = useState({})
  const [enviandoEncuesta, setEnviandoEncuesta] = useState(false)
  const [encuestaFinalizada, setEncuestaFinalizada] = useState(false)

  const [presion, setPresion] = useState('')
  const [frecCardiaca, setFrecCardiaca] = useState('')
  const [saturacion, setSaturacion] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [evolucion, setEvolucion] = useState('')

  const [pinIngresado, setPinIngresado] = useState(['', '', '', ''])
  const [pinError, setPinError] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [noLeidos, setNoLeidos] = useState(0)
  const ultimaLecturaRef = useRef(parseInt(localStorage.getItem(`chat_leido_pro_${idSolicitud}`) || '0'))
  const [textoMensaje, setTextoMensaje] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const chatBottomRef = useRef(null)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const pinRefs = [useRef(), useRef(), useRef(), useRef()]
  const timerRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) getDoc(doc(db, 'enfermeros', user.uid)).then(s => { if (s.exists()) setEnfermero(s.data()) })
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!idSolicitud) { navigate('/profesional/dashboard'); return }
    const unsub = onSnapshot(doc(db, 'solicitudes', idSolicitud), async (snap) => {
      if (!snap.exists()) { navigate('/profesional/dashboard'); return }
      const data = snap.data()
      setSolicitud(data)
      if (data.estado === 'cancelado') { navigate('/profesional/dashboard'); return }
      if (data.pacienteId) {
        try { const s = await getDoc(doc(db, 'pacientes', data.pacienteId)); if (s.exists()) setPaciente(s.data()) } catch {}
      }
      setCargando(false)
    })
    return () => unsub()
  }, [idSolicitud])

  // Cronómetro — arranca apenas llega fechaInicio
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (solicitud?.estado === 'en_curso' && solicitud?.fechaInicio) {
      const inicio = new Date(solicitud.fechaInicio).getTime()
      const tick = () => setSegundos(Math.floor((Date.now() - inicio) / 1000))
      tick()
      timerRef.current = setInterval(tick, 1000)
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [solicitud?.estado, solicitud?.fechaInicio])

  useEffect(() => {
    if (cargando || !mapRef.current || mapInstanceRef.current) return
    const cssL = document.createElement('link'); cssL.rel = 'stylesheet'; cssL.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(cssL)
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    const solId = idSolicitud
    s.onload = () => {
      const L = window.L; if (!mapRef.current || mapInstanceRef.current) return
      const fix = document.createElement('style')
      fix.textContent = '.leaflet-div-icon{background:transparent!important;border:none!important}'
      document.head.appendChild(fix)

      const mkHeart = () => L.divIcon({ className: '', html: `<img src="/heart-marker.png" style="width:44px;height:44px;border-radius:50%;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35);display:block;" />`, iconSize:[44,44], iconAnchor:[22,22] })
      const mkSelf  = () => L.divIcon({ className: '', html: `<img src="/icon-192.png" style="width:48px;height:48px;border-radius:50%;border:3px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.4);display:block;" />`, iconSize:[48,48], iconAnchor:[24,48] })

      // Centro inicial — GPS real del profesional o fallback
      const initMap = (lat, lng) => {
        const map = L.map(mapRef.current, { zoomControl:false, attributionControl:false }).setView([lat,lng], 15)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map)
        mapInstanceRef.current = map

        // Marcador propio del profesional
        let selfMarker = L.marker([lat, lng], { icon: mkSelf() }).addTo(map)

        // Actualizar posición propia en tiempo real
        if (navigator.geolocation) {
          navigator.geolocation.watchPosition(p => {
            const pos = [p.coords.latitude, p.coords.longitude]
            selfMarker.setLatLng(pos)
          }, () => {}, { enableHighAccuracy: true })
        }

        let pacMarker = null

        // Escuchar coords del paciente en la solicitud
        onSnapshot(doc(db, 'solicitudes', solId), (snap) => {
          if (!snap.exists()) return
          const d = snap.data()
          const pLat = d.pacienteLat, pLng = d.pacienteLng
          if (!pLat || !pLng) return
          const pos = [pLat, pLng]
          if (pacMarker) {
            pacMarker.setLatLng(pos)
          } else {
            pacMarker = L.marker(pos, { icon: mkHeart() }).addTo(map)
            map.setView(pos, 15)
          }
        })
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => initMap(p.coords.latitude, p.coords.longitude),
          () => initMap(-34.5960, -58.3880)
        )
      } else { initMap(-34.5960, -58.3880) }
    }
    document.head.appendChild(s)
  }, [cargando, solicitud?.estado])

  async function iniciarServicio() {
    const pin = pinIngresado.join('')
    if (pin.length < 4) { setPinError(true); return }
    if (pin !== String(solicitud?.pin)) { setPinError(true); setPinIngresado(['','','','']); pinRefs[0].current?.focus(); return }
    setIniciando(true)
    try { await updateDoc(doc(db, 'solicitudes', idSolicitud), { estado: 'en_curso', fechaInicio: new Date().toISOString() }); setSheetPin(false) } catch(e) { console.error(e) }
    setIniciando(false)
  }

  async function cerrarTurno() {
    setProcesando(true); setSheetReporte(false)
    await new Promise(r => setTimeout(r, 1800))
    try {
      await updateDoc(doc(db, 'solicitudes', idSolicitud), {
        profesionalFinalizo: true,
        gananciaEnfermero: solicitud?.gananciaEnfermeroFinal || solicitud?.pagoEnfermero || 0,
        reporteMedico: { presion, frecCardiaca, saturacion, temperatura, evolucion }
      })
    } catch(e) { console.error(e) }
    setProcesando(false); setPopupExito(true)
  }

  async function enviarEncuestaApp() {
    setEnviandoEncuesta(true)
    try {
      const uid = auth.currentUser?.uid
      if (uid) {
        await updateDoc(doc(db, 'enfermeros', uid), {
          encuestaApp: { ...respEncuesta, fecha: new Date().toISOString(), tipo: 'profesional' },
          encuestaAppRespondida: true
        })
      }
      setEncuestaFinalizada(true)
      setTimeout(() => navigate('/profesional/dashboard'), 2000)
    } catch(e) { console.error(e) }
    setEnviandoEncuesta(false)
  }

  async function ejecutarCancelacion() {
    if (!motivoCancelacion || cancelando) return
    setCancelando(true)
    const uid = auth.currentUser?.uid
    try {
      // 1. Guardar registro de cancelación del profesional
      await addDoc(collection(db, 'cancelaciones_profesionales'), {
        enfermeroId: uid,
        solicitudId: idSolicitud,
        motivo: motivoCancelacion,
        fecha: new Date().toISOString(),
        tipo: 'cancelacion_en_servicio'
      })

      // 2. Buscar otro enfermero online disponible (no el mismo)
      const snapEnf = await getDocs(query(
        collection(db, 'enfermeros'),
        where('isOnline', '==', true)
      ))
      const candidatos = snapEnf.docs
        .filter(d => d.id !== uid)
        .map(d => ({ id: d.id, ...d.data() }))

      if (candidatos.length > 0) {
        // Hay otro profesional disponible → reasignar, pero excluir al que canceló
        await updateDoc(doc(db, 'solicitudes', idSolicitud), {
          estado: 'pendiente',
          enfermeroId: null,
          profesionalCancelo: true,
          profesionalAnterior: uid,
          motivoCancelacionProfesional: motivoCancelacion,
          fechaCancelacionProfesional: new Date().toISOString(),
          enfermerosRechazados: arrayUnion(uid),
          sinProfesional: false,
        })
      } else {
        // No hay nadie disponible → cancelar y avisar al paciente
        const snapSol = await getDoc(doc(db, 'solicitudes', idSolicitud))
        const dataSol = snapSol.data()
        const yaEstabaPagado = dataSol?.estado === 'pagado' || dataSol?.estado === 'en_curso' || !!dataSol?.fechaPago
        await updateDoc(doc(db, 'solicitudes', idSolicitud), {
          estado: 'cancelado',
          profesionalCancelo: true,
          profesionalAnterior: uid,
          motivoCancelacionProfesional: motivoCancelacion,
          fechaCancelacionProfesional: new Date().toISOString(),
          sinProfesional: true,
          motivoCancelacion: 'sin_profesional_disponible',
          fechaCancelacion: new Date().toISOString(),
          ...(yaEstabaPagado && { requiereReembolso: true }),
        })
      }
    } catch(e) { console.error(e) }
    setCancelando(false)
    navigate('/profesional/dashboard')
  }

  function handlePin(i, v) {
    if (!/^\d*$/.test(v)) return
    const n = [...pinIngresado]; n[i] = v.slice(-1); setPinIngresado(n); setPinError(false)
    if (v && i < 3) pinRefs[i+1].current?.focus()
  }

  // Badge — siempre escucha mensajes del paciente
  useEffect(() => {
    if (!idSolicitud) return
    try {
      const unsub = onSnapshot(collection(db, 'solicitudes', idSolicitud, 'chat'), snap => {
        const nuevos = snap.docs
          .map(d => d.data())
          .filter(m =>
            m.remitente === 'paciente' &&
            (m.fecha?.toMillis?.() || m.fecha?.seconds * 1000 || 0) > ultimaLecturaRef.current
          ).length
        setNoLeidos(nuevos)
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
            const fa = a.fecha?.toMillis?.() || a.fecha?.seconds * 1000 || 0
            const fb = b.fecha?.toMillis?.() || b.fecha?.seconds * 1000 || 0
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
    localStorage.setItem(`chat_leido_pro_${idSolicitud}`, ahora.toString())
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
        remitente: 'profesional',
        remitenteNombre: enfermero?.nombre || 'Profesional',
        fecha: serverTimestamp()
      })
      setTextoMensaje('')
    } catch(e) { console.error(e) }
    setEnviandoMsg(false)
  }

  const fmt = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60,p=n=>String(n).padStart(2,'0'); return `${p(h)}:${p(m)}:${p(ss)}` }

  const nombreEnf = enfermero?.primerNombre || enfermero?.nombre?.split(' ')[0] || 'Profesional'
  const fotoEnf = enfermero?.foto || null
  const nombrePac = paciente?.nombre || solicitud?.pacienteNombre || 'Paciente'
  const fotoPac = paciente?.foto || solicitud?.pacienteFoto || null
  const telPac = paciente?.telefono || null
  const ganancia = solicitud?.gananciaEnfermeroFinal || solicitud?.pagoEnfermero || 0

  const CSS = `
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    @keyframes breathe{0%{text-shadow:0 0 15px rgba(14,165,233,0.2)}100%{text-shadow:0 0 40px rgba(14,165,233,0.7)}}
    @keyframes spin{100%{transform:rotate(360deg)}}
    @keyframes scalePop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
    @keyframes slideUp{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}
    .ov{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:5000;opacity:0;pointer-events:none;transition:0.3s;backdrop-filter:blur(5px)}
    .ov.on{opacity:1;pointer-events:auto}
    .bs{position:fixed;bottom:0;left:0;right:0;background:white;border-radius:30px 30px 0 0;padding:28px 22px 45px;z-index:5001;transform:translateY(100%);transition:0.4s cubic-bezier(0.2,0.8,0.2,1);max-height:90vh;overflow-y:auto}
    .bs.on{transform:translateY(0)}
    .motivo{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;background:#f8fafc;border:2px solid #e2e8f0;padding:15px;border-radius:14px;margin-bottom:10px;font-weight:700;color:#0f172a;cursor:pointer;font-size:0.9rem;font-family:inherit;transition:0.2s}
    .motivo.sel{border-color:#b71c1c;background:#fef2f2;color:#b71c1c}
    .pf{width:55px;height:65px;border:2px solid #e2e8f0;border-radius:16px;text-align:center;font-size:1.8rem;font-weight:800;color:#1a535c;background:#f8fafc;outline:none;font-family:inherit;transition:0.3s}
    .pf:focus{border-color:#1a535c;background:white}
    .pf.err{border-color:#b71c1c;background:#fef2f2;color:#b71c1c}
    .vi{background:#f8fafc;border-radius:14px;padding:12px 15px;border:1px solid #cbd5e1}
    .vi label{display:block;font-size:0.65rem;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:6px}
    .vi input{width:100%;border:none;background:transparent;font-size:1.1rem;font-weight:800;color:#1a535c;outline:none;font-family:inherit}
  `

  const Header = ({ titulo, estado }) => (
    <header style={{padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0f172a',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <button onClick={()=>navigate('/profesional/servicios')} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',width:'40px',height:'40px',borderRadius:'12px',color:'white',fontSize:'1rem',cursor:'pointer',display:'flex',justifyContent:'center',alignItems:'center'}}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1 style={{margin:0,fontSize:'1rem',fontWeight:800,color:'white'}}>{titulo}</h1>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}>
        <div style={{textAlign:'right'}}>
          <p style={{margin:0,fontSize:'0.85rem',fontWeight:800,color:'white'}}>¡Hola, {nombreEnf}!</p>
          <div style={{fontSize:'0.65rem',fontWeight:800,color: estado === 'servicio' ? '#0ea5e9' : '#94a3b8'}}>
            {estado === 'servicio' ? 'En Servicio' : ''}
          </div>
        </div>
        {fotoEnf
          ? <img src={fotoEnf} style={{width:'38px',height:'38px',borderRadius:'11px',objectFit:'cover',border:`2px solid ${estado === 'servicio' ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`}} alt=""/>
          : <div style={{width:'38px',height:'38px',borderRadius:'11px',background:'rgba(255,255,255,0.08)',display:'flex',justifyContent:'center',alignItems:'center',fontWeight:800,color:'white'}}>{nombreEnf[0]}</div>
        }
      </div>
    </header>
  )

  const Popup = () => (
    <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(15,23,42,0.92)',backdropFilter:'blur(8px)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',padding:'30px'}}>
      <div style={{background:'white',borderRadius:'32px',padding:'40px 30px',width:'100%',maxWidth:'320px',textAlign:'center',boxShadow:'0 20px 40px rgba(0,0,0,0.3)'}}>
        {procesando ? (
          <>
            <div style={{width:'54px',height:'54px',border:'4px solid #f1f5f9',borderTop:'4px solid #1a535c',borderRadius:'50%',margin:'0 auto 25px',animation:'spin 1s linear infinite'}}/>
            <h3 style={{margin:'0 0 8px',fontWeight:800}}>Procesando cobro...</h3>
            <p style={{color:'#64748b',fontSize:'0.9rem',margin:0}}>Cerrando reporte médico.</p>
          </>
        ) : (
          <>
            <div style={{width:'75px',height:'75px',background:'#1a535c',borderRadius:'50%',display:'flex',justifyContent:'center',alignItems:'center',margin:'0 auto 20px',color:'white',fontSize:'2.5rem',animation:'scalePop 0.6s cubic-bezier(0.17,0.89,0.32,1.27)'}}>
              <i className="fa-solid fa-check"/>
            </div>
            <h3 style={{fontWeight:800,margin:'0 0 5px'}}>¡Turno Finalizado!</h3>
            <p style={{color:'#64748b',fontSize:'0.9rem',margin:'0 0 20px'}}>Excelente trabajo. Tu ganancia:</p>
            <div style={{background:'#f0fdf4',border:'2px solid #1a535c',borderRadius:'20px',padding:'20px',marginBottom:'25px',animation:'slideUp 0.5s ease 0.2s backwards'}}>
              <span style={{display:'block',fontSize:'0.75rem',fontWeight:800,color:'#64748b',textTransform:'uppercase',marginBottom:'5px'}}>Ganancia Neta</span>
              <div style={{fontSize:'2.8rem',fontWeight:800,color:'#1a535c',letterSpacing:'-1px'}}>${ganancia.toLocaleString('es-AR')}</div>
            </div>
            <button onClick={()=>{ setPopupExito(false); setMostrarEncuestaApp(true) }}
              style={{background:'#1a535c',color:'white',border:'none',padding:'18px',borderRadius:'18px',width:'100%',fontWeight:800,fontSize:'1rem',cursor:'pointer',fontFamily:'inherit'}}>
              SEGUIR CUIDANDO
            </button>
          </>
        )}
      </div>
    </div>
  )

  const SheetsCancelYFicha = () => (
    <>
      <div className={`ov ${sheetCancelar?'on':''}`} onClick={()=>{setSheetCancelar(false);setMotivoCancelacion(null)}}/>
      <div className={`bs ${sheetCancelar?'on':''}`}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',borderBottom:'1px solid #f1f5f9',paddingBottom:'15px'}}>
          <h3 style={{margin:0,fontSize:'1.2rem',color:'#b71c1c',fontWeight:800}}>Cancelar Servicio</h3>
          <button onClick={()=>{setSheetCancelar(false);setMotivoCancelacion(null)}} style={{background:'transparent',border:'none',color:'#64748b',fontSize:'1.5rem',cursor:'pointer'}}><i className="fa-solid fa-xmark"/></button>
        </div>
        {[{key:'emergencia',label:'Emergencia personal'},{key:'no_abre',label:'El paciente no abre'},{key:'condicion',label:'Condición fuera de mi alcance'},{key:'otro',label:'Otro motivo'}].map(m=>(
          <button key={m.key} className={`motivo ${motivoCancelacion===m.key?'sel':''}`} onClick={()=>setMotivoCancelacion(m.key)}>
            <span>{m.label}</span>{motivoCancelacion===m.key&&<i className="fa-solid fa-circle-check"/>}
          </button>
        ))}
        <button onClick={ejecutarCancelacion} disabled={!motivoCancelacion||cancelando}
          style={{width:'100%',background:'#b71c1c',color:'white',border:'none',padding:'18px',borderRadius:'16px',fontWeight:800,fontSize:'1rem',marginTop:'15px',cursor:motivoCancelacion?'pointer':'default',opacity:motivoCancelacion?1:0.5,fontFamily:'inherit'}}>
          {cancelando?'Cancelando...':'Confirmar Cancelación'}
        </button>
      </div>
      <div className={`ov ${sheetFicha?'on':''}`} onClick={()=>setSheetFicha(false)}/>
      <div className={`bs ${sheetFicha?'on':''}`}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',borderBottom:'1px solid #f1f5f9',paddingBottom:'15px'}}>
          <h3 style={{margin:0,fontSize:'1.1rem',fontWeight:800,color:'#1a535c'}}>Ficha Médica</h3>
          <button onClick={()=>setSheetFicha(false)} style={{background:'none',border:'none',fontSize:'1.5rem',color:'#64748b',cursor:'pointer'}}><i className="fa-solid fa-xmark"/></button>
        </div>
        {paciente ? (
          <div>
            {[
              ['Paciente', paciente.nombre || nombrePac],
              ['DNI', paciente.dni],
              ['Fecha de nac.', paciente.nacimiento],
              ['Grupo Sanguíneo', paciente.grupoSanguineo],
              ['Servicio', solicitud?.servicios?.[0]],
              ['Dirección', solicitud?.direccion],
              ['Obra Social', paciente.obraSocial],
              ['Tel. Prepaga', paciente.telPrepaga],
              ['Contacto emergencia', paciente.contactoEmergencia],
            ].map(([k,v])=>v&&(
              <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:'10px',fontSize:'0.88rem',borderBottom:'1px solid #f8fafc',paddingBottom:'10px'}}>
                <span style={{color:'#64748b',fontWeight:600,flexShrink:0,marginRight:'10px'}}>{k}</span>
                <span style={{fontWeight:800,color:'#0f172a',textAlign:'right'}}>{v}</span>
              </div>
            ))}
            {paciente.alergias&&<div style={{marginTop:'5px',padding:'12px',background:'#fef2f2',borderRadius:'12px',fontSize:'0.85rem',color:'#b71c1c',fontWeight:800,marginBottom:'10px'}}>
              <i className="fa-solid fa-triangle-exclamation"/> Alergias: {paciente.alergias}
            </div>}
            {paciente.enfermedades&&<div style={{padding:'12px',background:'#fefce8',borderRadius:'12px',fontSize:'0.85rem',color:'#854d0e',fontWeight:700}}>
              <i className="fa-solid fa-stethoscope"/> {paciente.enfermedades}
            </div>}
            {!paciente.alergias&&!paciente.enfermedades&&!paciente.obraSocial&&
              <p style={{color:'#64748b',fontSize:'0.85rem',textAlign:'center',marginTop:'5px'}}>Sin datos médicos adicionales cargados.</p>
            }
          </div>
        ) : <p style={{color:'#64748b',textAlign:'center'}}>Sin ficha médica.</p>}
      </div>
      <div className={`ov ${sheetPin?'on':''}`} onClick={()=>{setSheetPin(false);setPinIngresado(['','','','']);setPinError(false)}}/>
      <div className={`bs ${sheetPin?'on':''}`} style={{textAlign:'center'}}>
        <button onClick={()=>{setSheetPin(false);setPinIngresado(['','','','']);setPinError(false)}} style={{position:'absolute',top:'20px',right:'20px',background:'none',border:'none',fontSize:'1.5rem',color:'#64748b',cursor:'pointer'}}><i className="fa-solid fa-xmark"/></button>
        <div style={{background:'#e0f2fe',width:'60px',height:'60px',borderRadius:'50%',display:'flex',justifyContent:'center',alignItems:'center',margin:'10px auto 18px',fontSize:'1.6rem',color:'#0284c7'}}>
          <i className="fa-solid fa-shield-halved"/>
        </div>
        <h3 style={{fontSize:'1.2rem',fontWeight:800,color:'#0f172a',marginBottom:'8px'}}>Ingresá el PIN del Paciente</h3>
        <p style={{color:'#64748b',fontSize:'0.9rem',marginBottom:'25px',lineHeight:1.5}}>Pedile al paciente su código<br/>para iniciar la atención.</p>
        <div style={{display:'flex',justifyContent:'center',gap:'12px',marginBottom:'20px'}}>
          {[0,1,2,3].map(i=>(
            <input key={i} ref={pinRefs[i]} type="tel" inputMode="numeric" maxLength={1}
              value={pinIngresado[i]} onChange={e=>handlePin(i,e.target.value)}
              onKeyDown={e=>{if(e.key==='Backspace'&&!pinIngresado[i]&&i>0)pinRefs[i-1].current?.focus()}}
              className={`pf ${pinError?'err':''}`}/>
          ))}
        </div>
        {pinError&&<p style={{color:'#b71c1c',fontSize:'0.85rem',fontWeight:700,marginBottom:'15px'}}>PIN incorrecto. Verificá con el paciente.</p>}
        <button onClick={iniciarServicio} disabled={iniciando}
          style={{width:'100%',padding:'16px',borderRadius:'16px',background:'#1a535c',color:'white',border:'none',fontWeight:800,fontSize:'1rem',cursor:'pointer',fontFamily:'inherit',opacity:iniciando?0.7:1}}>
          {iniciando?'Verificando...':'Confirmar e Iniciar'}
        </button>
      </div>
    </>
  )

  // Constantes encuesta — definidas aquí para estar disponibles antes de cualquier return
  const ETIQUETAS_PRO = ['', 'Muy malo', 'Regular', 'Bueno', 'Muy bueno', '¡Excelente!']
  const PREGUNTAS_PRO = [
    { key: 'p1', tipo: 'estrellas', texto: '¿La app es fácil de usar?' },
    { key: 'p2', tipo: 'estrellas', texto: '¿La información del servicio fue clara?' },
    { key: 'p3', tipo: 'estrellas', texto: '¿Cómo calificás el soporte de CuidaGo?' },
    { key: 'p4', tipo: 'opciones', texto: '¿Cómo te recibió el paciente en su domicilio?', opciones: ['Bien', 'Regular', 'Mal'] },
    { key: 'p5', tipo: 'estrellas', texto: '¿Cómo calificás la app?' },
  ]

  // ══════════════════════════
  // PANTALLA ENCUESTA APP
  // ══════════════════════════
  if (mostrarEncuestaApp) {
    const pregunta = PREGUNTAS_PRO[pasoEncuesta]
    const totalPasos = PREGUNTAS_PRO.length
    const respActual = respEncuesta[pregunta?.key]
    const puedeSiguiente = respActual !== undefined && respActual !== 0 && respActual !== ''

    if (encuestaFinalizada) return (
      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#0f172a',textAlign:'center',padding:'40px 24px'}}>
        <style>{`@keyframes scalePop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
        <div style={{width:'80px',height:'80px',background:'#1a535c',borderRadius:'50%',display:'flex',justifyContent:'center',alignItems:'center',margin:'0 auto 20px',fontSize:'2.2rem',color:'white',animation:'scalePop 0.5s cubic-bezier(0.17,0.89,0.32,1.27)'}}>🎉</div>
        <h2 style={{fontSize:'1.4rem',fontWeight:800,color:'white',margin:'0 0 10px'}}>¡Gracias por tu opinión!</h2>
        <p style={{color:'#94a3b8',fontSize:'0.9rem'}}>Nos ayuda a mejorar CuidaGo.</p>
      </div>
    )

    return (
      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",background:'#0f172a',minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{background:'#1a535c',padding:'36px 24px 28px',color:'white',textAlign:'center'}}>
          <p style={{margin:'0 0 6px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase',letterSpacing:'1px',fontWeight:600}}>Contanos tu experiencia</p>
          <h2 style={{margin:'0 0 20px',fontSize:'1.15rem',fontWeight:800}}>Encuesta CuidaGo</h2>
          <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
            {PREGUNTAS_PRO.map((_,i) => (
              <div key={i} style={{height:'4px',flex:1,maxWidth:'40px',borderRadius:'2px',background:i<=pasoEncuesta?'white':'rgba(255,255,255,0.25)',transition:'background 0.3s'}}/>
            ))}
          </div>
          <p style={{margin:'10px 0 0',fontSize:'0.78rem',opacity:0.65,fontWeight:600}}>Pregunta {pasoEncuesta+1} de {totalPasos}</p>
        </div>
        <div key={pasoEncuesta} style={{flex:1,padding:'36px 24px 40px',display:'flex',flexDirection:'column',animation:'fadeIn 0.35s ease'}}>
          <p style={{fontSize:'1.1rem',fontWeight:800,color:'white',marginBottom:'32px',textAlign:'center',lineHeight:1.4}}>{pregunta.texto}</p>
          {pregunta.tipo === 'estrellas' && (
            <>
              <div style={{display:'flex',justifyContent:'center',gap:'12px',marginBottom:'12px'}}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} onClick={() => setRespEncuesta(r => ({...r,[pregunta.key]:n}))}
                    style={{fontSize:'2.8rem',cursor:'pointer',transition:'transform 0.15s',transform:(respActual||0)>=n?'scale(1.2)':'scale(1)',filter:(respActual||0)>=n?'none':'grayscale(1) opacity(0.3)'}}>⭐</span>
                ))}
              </div>
              <p style={{textAlign:'center',fontSize:'0.9rem',fontWeight:700,color:'#10b981',minHeight:'22px'}}>{ETIQUETAS_PRO[respActual||0]||''}</p>
            </>
          )}
          {pregunta.tipo === 'opciones' && (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {pregunta.opciones.map(op => (
                <button key={op} onClick={() => setRespEncuesta(r => ({...r,[pregunta.key]:op}))}
                  style={{padding:'18px',borderRadius:'18px',border:`2px solid ${respActual===op?'#1a535c':'rgba(255,255,255,0.1)'}`,background:respActual===op?'#1a535c':'rgba(255,255,255,0.05)',color:respActual===op?'white':'#94a3b8',fontWeight:800,fontSize:'1rem',cursor:'pointer',transition:'0.2s',fontFamily:'inherit',textAlign:'center'}}>
                  {op}
                </button>
              ))}
            </div>
          )}
          <div style={{marginTop:'auto',paddingTop:'40px'}}>
            <button onClick={() => { if(pasoEncuesta<totalPasos-1) setPasoEncuesta(p=>p+1); else enviarEncuestaApp() }}
              disabled={!puedeSiguiente||enviandoEncuesta}
              style={{width:'100%',padding:'18px',borderRadius:'18px',background:puedeSiguiente?'#1a535c':'rgba(255,255,255,0.08)',color:puedeSiguiente?'white':'#475569',border:'none',fontSize:'1rem',fontWeight:800,cursor:puedeSiguiente?'pointer':'default',transition:'0.3s',fontFamily:'inherit',marginBottom:'12px',boxShadow:puedeSiguiente?'0 8px 25px rgba(26,83,92,0.4)':'none'}}>
              {enviandoEncuesta?'Enviando...':pasoEncuesta<totalPasos-1?'Siguiente →':'Enviar encuesta'}
            </button>
            <button onClick={()=>navigate('/profesional/dashboard')}
              style={{width:'100%',padding:'13px',borderRadius:'18px',background:'transparent',color:'#475569',border:'none',fontSize:'0.85rem',cursor:'pointer',fontFamily:'inherit'}}>
              Saltar encuesta
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cargando) return <div style={{background:'#0f172a',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#1a535c',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Cargando...</div>

  const esEnCurso = solicitud?.estado === 'en_curso'

  // ══════════════════════════
  // PANTALLA EN CURSO
  // ══════════════════════════
  if (esEnCurso) return (
    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",background:'#0f172a',height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{CSS}</style>
      {(procesando||popupExito)&&<Popup/>}

      <Header titulo="Servicio en Curso" estado="servicio"/>

      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',paddingBottom:'110px'}}>

        {/* CRONÓMETRO */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'30px 20px 25px'}}>
          <div style={{background:'rgba(14,165,233,0.12)',color:'#0ea5e9',padding:'7px 16px',borderRadius:'20px',fontWeight:800,fontSize:'0.75rem',textTransform:'uppercase',marginBottom:'18px',display:'flex',alignItems:'center',gap:'8px',border:'1px solid rgba(14,165,233,0.2)',letterSpacing:'1px'}}>
            <div style={{width:'8px',height:'8px',background:'#0ea5e9',borderRadius:'50%',animation:'pulse 1.5s infinite'}}/>
            Trabajo en Curso
          </div>
          <div style={{fontSize:'5rem',fontWeight:800,color:'#0ea5e9',letterSpacing:'-3px',lineHeight:1,fontVariantNumeric:'tabular-nums',animation:'breathe 3s ease-in-out infinite alternate'}}>
            {fmt(segundos)}
          </div>
        </div>

        {/* TARJETA PACIENTE */}
        <div style={{margin:'0 20px 15px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <img src={fotoPac||`https://ui-avatars.com/api/?name=${encodeURIComponent(nombrePac)}&background=334155&color=94a3b8&bold=true`}
              style={{width:'50px',height:'50px',borderRadius:'14px',objectFit:'cover'}} alt=""
              onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=P&background=334155&color=94a3b8`}}/>
            <div>
              <h3 style={{margin:0,fontSize:'1rem',fontWeight:800,color:'white'}}>{nombrePac}</h3>
              <p style={{margin:'3px 0 0',color:'#94a3b8',fontSize:'0.8rem',fontWeight:600}}>Paciente Activo</p>
            </div>
          </div>
          <button onClick={()=>setSheetFicha(true)} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'white',padding:'10px 14px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
            <i className="fa-solid fa-file-medical"/> Ficha
          </button>
        </div>

        {/* TAREAS */}
        <div style={{margin:'0 20px',background:'white',padding:'20px',borderRadius:'22px'}}>
          <h4 style={{margin:'0 0 16px',fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'2px solid #f1f5f9',paddingBottom:'12px'}}>Tareas de la Sesión</h4>
          <p style={{margin:0,fontSize:'0.9rem',fontWeight:800,color:'#1a535c',lineHeight:1.8}}>
            • Visita base del profesional<br/>
            {solicitud?.servicios?.map((s,i)=><span key={i}>• {s}<br/></span>)}
          </p>
          {solicitud?.notas&&<div style={{marginTop:'12px',padding:'12px',background:'#f8fafc',borderRadius:'12px',fontSize:'0.85rem',color:'#0f172a',fontStyle:'italic',border:'1px dashed #cbd5e1',fontWeight:600,lineHeight:1.4}}>"{solicitud.notas}"</div>}
          <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid #f1f5f9',fontSize:'0.82rem',color:'#64748b',display:'flex',alignItems:'center',gap:'8px'}}>
            <i className="fa-solid fa-location-dot" style={{color:'#b71c1c'}}/>{solicitud?.direccion}
          </div>
        </div>
      </div>

      {/* BOTÓN FIJO */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'14px 20px 28px',background:'linear-gradient(to top,#0f172a 70%,transparent)',zIndex:2000,pointerEvents:'none'}}>
        <button onClick={()=>setSheetReporte(true)}
          style={{pointerEvents:'auto',width:'100%',height:'62px',background:'#1a535c',color:'white',border:'none',borderRadius:'20px',fontSize:'1rem',fontWeight:800,textTransform:'uppercase',display:'flex',justifyContent:'center',alignItems:'center',gap:'12px',boxShadow:'0 8px 25px rgba(26,83,92,0.4)',cursor:'pointer',fontFamily:'inherit'}}>
          <i className="fa-solid fa-check-double"/> FINALIZAR SERVICIO
        </button>
      </div>

      {/* SHEET REPORTE */}
      <div className={`ov ${sheetReporte?'on':''}`} onClick={()=>setSheetReporte(false)}/>
      <div className={`bs ${sheetReporte?'on':''}`} style={{background:'#f8fafc'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',borderBottom:'2px solid #f1f5f9',paddingBottom:'15px'}}>
          <h3 style={{margin:0,fontSize:'1.1rem',fontWeight:800,color:'#1a535c',textTransform:'uppercase'}}>Reporte Médico Final</h3>
          <button onClick={()=>setSheetReporte(false)} style={{background:'#f1f5f9',width:'36px',height:'36px',borderRadius:'50%',border:'none',color:'#64748b',fontSize:'1.2rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><i className="fa-solid fa-xmark"/></button>
        </div>
        <div style={{background:'white',padding:'18px',borderRadius:'18px',marginBottom:'14px',border:'1px solid #e2e8f0'}}>
          <span style={{display:'block',fontSize:'0.7rem',fontWeight:800,color:'#1a535c',textTransform:'uppercase',marginBottom:'12px'}}>Signos Vitales (Opcional)</span>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div className="vi"><label>Presión (mmHg)</label><input value={presion} onChange={e=>setPresion(e.target.value)} placeholder="120/80"/></div>
            <div className="vi"><label>Frec. Cardíaca</label><input type="number" value={frecCardiaca} onChange={e=>setFrecCardiaca(e.target.value)} placeholder="72"/></div>
            <div className="vi"><label>Saturación (%)</label><input type="number" value={saturacion} onChange={e=>setSaturacion(e.target.value)} placeholder="98"/></div>
            <div className="vi"><label>Temperatura (°C)</label><input type="number" step="0.1" value={temperatura} onChange={e=>setTemperatura(e.target.value)} placeholder="36.5"/></div>
          </div>
        </div>
        <div style={{background:'white',padding:'18px',borderRadius:'18px',marginBottom:'18px',border:'1px solid #e2e8f0'}}>
          <span style={{display:'block',fontSize:'0.7rem',fontWeight:800,color:'#1a535c',textTransform:'uppercase',marginBottom:'12px'}}>Evolución del Paciente</span>
          <textarea value={evolucion} onChange={e=>setEvolucion(e.target.value)}
            placeholder="Describe el procedimiento y estado del paciente al finalizar..."
            style={{width:'100%',border:'1px solid #cbd5e1',borderRadius:'14px',padding:'14px',fontFamily:'inherit',fontSize:'0.9rem',minHeight:'110px',outline:'none',background:'#f8fafc',resize:'none',boxSizing:'border-box',lineHeight:1.5}}/>
        </div>
        <button onClick={cerrarTurno}
          style={{background:'#1a535c',color:'white',border:'none',padding:'18px',borderRadius:'18px',width:'100%',fontWeight:800,fontSize:'1rem',cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase',boxShadow:'0 8px 20px rgba(26,83,92,0.3)'}}>
          CERRAR TURNO Y COBRAR
        </button>
      </div>

      <SheetsCancelYFicha/>
    </div>
  )

  // ══════════════════════════
  // PANTALLA EN CAMINO
  // ══════════════════════════
  return (
    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",background:'#0f172a',height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <style>{CSS}</style>

      <Header titulo="En Camino" estado="camino"/>

      {/* MAPA */}
      <div style={{height:'240px',width:'100%',position:'relative',flexShrink:0}}>
        <div style={{position:'absolute',top:'12px',left:'50%',transform:'translateX(-50%)',background:'#1a535c',color:'white',padding:'8px 16px',borderRadius:'30px',fontWeight:800,fontSize:'0.85rem',zIndex:1000,display:'flex',alignItems:'center',gap:'8px',whiteSpace:'nowrap',boxShadow:'0 5px 15px rgba(0,0,0,0.3)'}}>
          <i className="fa-solid fa-car"/> En camino al domicilio
        </div>
        <div ref={mapRef} style={{height:'100%',width:'100%',zIndex:1}}/>
      </div>

      {/* PANEL SCROLLABLE */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',background:'#0f172a',paddingBottom:'110px'}}>

        {/* PACIENTE */}
        <div style={{margin:'18px 20px 0',display:'flex',alignItems:'center',gap:'10px',paddingBottom:'15px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          <img src={fotoPac||`https://ui-avatars.com/api/?name=${encodeURIComponent(nombrePac)}&background=334155&color=94a3b8&bold=true`}
            style={{width:'48px',height:'48px',borderRadius:'14px',objectFit:'cover',flexShrink:0}} alt=""
            onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=P&background=334155&color=94a3b8`}}/>
          <div style={{minWidth:0}}>
            <h3 style={{margin:0,fontSize:'0.95rem',fontWeight:800,color:'white',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombrePac}</h3>
            <p style={{margin:'2px 0 0',color:'#94a3b8',fontSize:'0.78rem',fontWeight:600}}>Paciente</p>
          </div>
          <button onClick={abrirChat}
            style={{background:'#1a535c',color:'white',border:'none',borderRadius:'12px',padding:'8px 13px',fontWeight:800,fontSize:'0.82rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontFamily:'inherit',position:'relative',flexShrink:0}}>
            <i className="fa-solid fa-message"/> Chat
            {noLeidos > 0 && (
              <span style={{position:'absolute',top:'-7px',right:'-7px',background:'#b71c1c',color:'white',borderRadius:'50%',width:'18px',height:'18px',fontSize:'0.65rem',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #0f172a'}}>
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <div style={{flex:1}}></div>
          <button onClick={()=>setSheetCancelar(true)}
            style={{background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'12px',padding:'8px 13px',fontWeight:800,fontSize:'0.82rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontFamily:'inherit',flexShrink:0}}>
            <i className="fa-solid fa-xmark"/> Cancelar
          </button>
        </div>

        {/* DIRECCIÓN */}
        <div style={{margin:'15px 20px',background:'white',padding:'14px 16px',borderRadius:'16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
            <i className="fa-solid fa-location-dot" style={{color:'#b71c1c',fontSize:'1.2rem'}}/>
            <div>
              <p style={{margin:0,fontSize:'0.95rem',fontWeight:800,color:'#0f172a'}}>{solicitud?.direccion?.replace(/(,\s*Depto\s+\S+)(,\s*Depto\s+\S+)+/i, '$1')}</p>
              <span style={{fontSize:'0.8rem',color:'#64748b'}}>Domicilio del paciente</span>
            </div>
          </div>
          <button style={{background:'#e0f2fe',color:'#0284c7',width:'40px',height:'40px',borderRadius:'12px',border:'none',cursor:'pointer',display:'flex',justifyContent:'center',alignItems:'center'}}
            onClick={()=>solicitud?.direccion&&window.open(`https://maps.google.com/?q=${encodeURIComponent(solicitud.direccion)}`)}>
            <i className="fa-solid fa-map"/>
          </button>
        </div>

        {/* DETALLE */}
        <div style={{margin:'0 20px',background:'white',padding:'18px',borderRadius:'18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',borderBottom:'1px solid #f1f5f9',paddingBottom:'12px'}}>
            <h4 style={{margin:0,fontSize:'0.95rem',fontWeight:800,color:'#0f172a'}}>Detalle del Servicio</h4>
            <button onClick={()=>setSheetFicha(true)} style={{background:'#e0f2fe',color:'#0284c7',border:'none',padding:'9px 14px',borderRadius:'12px',fontSize:'0.8rem',fontWeight:800,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
              <i className="fa-solid fa-notes-medical"/> Ver Ficha Médica
            </button>
          </div>
          <p style={{margin:0,fontSize:'0.9rem',fontWeight:800,color:'#1a535c',lineHeight:1.7}}>
            • Visita base del profesional<br/>
            {solicitud?.servicios?.map((s,i)=><span key={i}>• {s}<br/></span>)}
          </p>
          {solicitud?.notas&&<p style={{margin:'12px 0 0',background:'#f8fafc',padding:'10px 12px',borderRadius:'10px',fontSize:'0.85rem',fontStyle:'italic',color:'#0f172a',border:'1px dashed #cbd5e1',fontWeight:600,lineHeight:1.4}}>"{solicitud.notas}"</p>}
          {solicitud?.insumos?.length>0&&(
            <div style={{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid #f1f5f9'}}>
              <p style={{margin:'0 0 8px',fontSize:'0.72rem',fontWeight:800,color:'#64748b',textTransform:'uppercase'}}>
                Insumos — {solicitud?.estadoMateriales==='tengo'?<span style={{color:'#1a535c'}}>el paciente los tiene</span>:<span style={{color:'#b71c1c'}}>debés traerlos vos</span>}
              </p>
              <ul style={{margin:0,padding:'10px 10px 10px 30px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'12px',columnCount:2}}>
                {solicitud.insumos.map((ins,i)=><li key={i} style={{fontSize:'0.8rem',color:'#1a535c',fontWeight:700,marginBottom:'4px'}}>{ins}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* BOTÓN FIJO */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'14px 20px 28px',zIndex:2000,pointerEvents:'none'}}>
        <button onClick={()=>setSheetPin(true)}
          style={{pointerEvents:'auto',width:'100%',height:'62px',background:'#1a535c',color:'white',border:'none',borderRadius:'20px',fontSize:'1rem',fontWeight:800,textTransform:'uppercase',display:'flex',justifyContent:'center',alignItems:'center',gap:'12px',boxShadow:'0 8px 25px rgba(26,83,92,0.4)',cursor:'pointer',fontFamily:'inherit'}}>
          <i className="fa-solid fa-house-chimney-medical"/> LLEGUÉ — INICIAR SERVICIO
        </button>
      </div>

      <SheetsCancelYFicha/>
      {/* CHAT MODAL */}
      {chatAbierto && (
        <>
          <div onClick={()=>setChatAbierto(false)} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.6)',backdropFilter:'blur(2px)',zIndex:5000}}></div>
          <div style={{position:'fixed',bottom:0,left:0,right:0,background:'white',borderRadius:'28px 28px 0 0',zIndex:5001,maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px 12px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <img src={fotoPac||`https://ui-avatars.com/api/?name=${encodeURIComponent(nombrePac)}&background=e6f2f3&color=1a535c&bold=true`}
                  style={{width:'36px',height:'36px',borderRadius:'10px',objectFit:'cover'}} alt=""/>
                <div>
                  <p style={{margin:0,fontWeight:800,fontSize:'0.9rem',color:'#0f172a'}}>{nombrePac}</p>
                  <p style={{margin:0,fontSize:'0.72rem',color:'#10b981',fontWeight:700}}>Paciente</p>
                </div>
              </div>
              <button onClick={()=>setChatAbierto(false)} style={{background:'#f1f5f9',border:'none',width:'32px',height:'32px',borderRadius:'50%',cursor:'pointer',fontSize:'0.9rem'}}>
                <i className="fa-solid fa-xmark"/>
              </button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 18px',display:'flex',flexDirection:'column',gap:'10px',minHeight:'200px'}}>
              {mensajes.length === 0 && (
                <div style={{textAlign:'center',color:'#94a3b8',fontSize:'0.85rem',fontWeight:600,marginTop:'20px'}}>
                  <i className="fa-solid fa-message" style={{fontSize:'1.5rem',opacity:0.3,display:'block',marginBottom:'8px'}}></i>
                  Mandá un mensaje al paciente
                </div>
              )}
              {mensajes.map(m => (
                <div key={m.id} style={{display:'flex',justifyContent:m.remitente==='profesional'?'flex-end':'flex-start'}}>
                  <div style={{maxWidth:'75%',padding:'10px 14px',borderRadius:m.remitente==='profesional'?'14px 4px 14px 14px':'4px 14px 14px 14px',background:m.remitente==='profesional'?'#1a535c':'#f1f5f9',color:m.remitente==='profesional'?'white':'#0f172a',fontSize:'0.9rem',fontWeight:600,lineHeight:1.4}}>
                    {m.texto}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef}></div>
            </div>
            <div style={{padding:'12px 16px 28px',borderTop:'1px solid #f1f5f9',display:'flex',gap:'10px',flexShrink:0}}>
              <input value={textoMensaje} onChange={e=>setTextoMensaje(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&enviarMensaje()}
                placeholder="Escribir mensaje..." type="text"
                style={{flex:1,padding:'12px 14px',borderRadius:'14px',border:'1.5px solid #e2e8f0',fontFamily:'inherit',fontWeight:600,fontSize:'0.9rem',outline:'none',boxSizing:'border-box'}}/>
              <button onClick={enviarMensaje} disabled={enviandoMsg||!textoMensaje.trim()}
                style={{background:'#1a535c',color:'white',border:'none',borderRadius:'14px',width:'46px',height:'46px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:!textoMensaje.trim()?0.5:1}}>
                <i className="fa-solid fa-paper-plane"/>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
