import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'

const PRECIO_BASE = 20000

// ✅ LISTA EXACTA SACADA DEL HTML ORIGINAL
const SERVICIOS = [
  { categoria: '🧪 Prueba de Pago', icono: 'fa-vial', items: [
    { name: 'Prueba', desc: '(ítem de prueba para testear el flujo de pago)', precio: 10, insumos: [] }
  ]},
  { categoria: 'Medicación, Administración, Seguimiento', icono: 'fa-syringe', items: [
    { name: 'Vía oral', desc: '(medicación)', precio: 3000, insumos: ['medicación'] },
    { name: 'Vía intramuscular', desc: '(medicación, jeringa, aguja, guantes, algodón, alcohol)', precio: 10000, insumos: ['medicación', 'jeringa', 'aguja', 'guantes', 'algodón', 'alcohol'] },
    { name: 'Vía subcutánea', desc: '(medicación, jeringa, aguja, guantes, algodón, alcohol)', precio: 5000, insumos: ['medicación', 'jeringa', 'aguja', 'guantes', 'algodón', 'alcohol'] },
    { name: 'Vía intravenosa', desc: '(medicación, jeringa, aguja, guantes, algodón, alcohol, abbocath, solución fisiológica suero, solución fisiológica ampollas, guia de suero)', precio: 10000, insumos: ['medicación', 'jeringa', 'aguja', 'guantes', 'algodón', 'alcohol', 'abbocath', 'solución fisiológica suero', 'solución fisiológica ampollas', 'guia de suero'] },
    { name: 'Vía tópica', desc: '(medicación, guantes)', precio: 3000, insumos: ['medicación', 'guantes'] },
    { name: 'Vía oftálmica', desc: '(medicación, guantes, gasas, solución fisiológica)', precio: 3000, insumos: ['medicación', 'guantes', 'gasas', 'solución fisiológica'] },
    { name: 'Vía ótica', desc: '(medicación, guantes, algodón)', precio: 3000, insumos: ['medicación', 'guantes', 'algodón'] },
    { name: 'Preparación/educación/cálculo de dosis', desc: '', precio: 5000, insumos: [] },
    { name: 'Manejo de insulina y otro tipo de medicación', desc: '', precio: 10000, insumos: [] }
  ]},
  { categoria: 'Curaciones y Cuidado de Heridas', icono: 'fa-band-aid', items: [
    { name: 'Curacion simple', desc: '(guantes, alcohol, alcohol/vaselina, gasas, tijeras, cinta hipoalergénica, educación)', precio: 10000, insumos: ['guantes', 'alcohol', 'alcohol/vaselina', 'gasas', 'tijeras', 'cinta hipoalergénica', 'educación'] },
    { name: 'Curación compleja', desc: '(guantes, alcohol, vaselina, gasas, tijeras, cinta hipoalergénica, vendas, educación)', precio: 30000, insumos: ['guantes', 'alcohol', 'vaselina', 'gasas', 'tijeras', 'cinta hipoalergénica', 'vendas', 'educación'] },
    { name: 'Curación de ostomías', desc: '(algodón, gasas, guantes, bolsa de ostomía, solución jabonosa, cremas para ostomía)', precio: 20000, insumos: ['algodón', 'gasas', 'guantes', 'bolsa de ostomía', 'solución jabonosa', 'cremas para ostomía'] },
    { name: 'Curación de traqueotomía', desc: '(gasas, guantes estériles, cinta hipoalergénica, alcohol)', precio: 20000, insumos: ['gasas', 'guantes estériles', 'cinta hipoalergénica', 'alcohol'] },
    { name: 'Curación de acceso venoso central', desc: '(gasas, guantes estériles, cinta hipoalergénica, alcohol, solución fisiológica)', precio: 15000, insumos: ['gasas', 'guantes estériles', 'cinta hipoalergénica', 'alcohol', 'solución fisiológica'] },
    { name: 'Curación de úlceras por presión', desc: '(guantes, alcohol, vaselina, gasas, tijeras, cinta, vendas, azúcar)', precio: 25000, insumos: ['guantes', 'alcohol', 'vaselina', 'gasas', 'tijeras', 'cinta', 'vendas', 'azúcar'] },
    { name: 'Cuidado de heridas quirúrgicas', desc: '(guantes, alcohol, vaselina, gasas, tijeras, cinta)', precio: 10000, insumos: ['guantes', 'alcohol', 'vaselina', 'gasas', 'tijeras', 'cinta'] },
    { name: 'Retiro de puntos o grapas', desc: '(tijera, pinza, guantes, alcohol, gasas, cinta)', precio: 10000, insumos: ['tijera', 'pinza', 'guantes', 'alcohol', 'gasas', 'cinta'] }
  ]},
  { categoria: 'Control y Monitoreo', icono: 'fa-heart-pulse', items: [
    { name: 'Toma de signos vitales', desc: '(tensiómetro, termómetro, reloj)', precio: 5000, insumos: ['tensiómetro', 'termómetro', 'reloj'] },
    { name: 'Control de glucemia capilar', desc: '(aparato HGT, tiras reactivas, lancetas/agujas, guantes)', precio: 5000, insumos: ['aparato HGT', 'tiras reactivas', 'lancetas/agujas', 'guantes'] },
    { name: 'Evaluación del estado general', desc: '', precio: 3000, insumos: [] }
  ]},
  { categoria: 'Higiene y Confort', icono: 'fa-bed', items: [
    { name: 'Baño en cama', desc: '(sábanas, algodón o toallitas higiénicas, guantes, pañales en caso de necesitar, elementos de higiene personal)', precio: 35000, insumos: ['sábanas', 'algodón o toallitas higiénicas', 'guantes', 'pañales en caso de necesitar', 'elementos de higiene personal'] },
    { name: 'Baño en baño asistido con uso de pañal', desc: '(guantes, algodón, pañales)', precio: 30000, insumos: ['guantes', 'algodón', 'pañales'] },
    { name: 'Baño en baño asistido', desc: '(guantes, algodón)', precio: 30000, insumos: ['guantes', 'algodón'] },
    { name: 'Higiene y confort', desc: '', precio: 20000, insumos: [] },
    { name: 'Cambio de ropa de cama y personal', desc: '(ropa de cama y personal, guantes)', precio: 10000, insumos: ['ropa de cama y personal', 'guantes'] },
    { name: 'Movilización y cambios posturales', desc: '', precio: 10000, insumos: [] },
    { name: 'Prevención de escaras', desc: '', precio: 5000, insumos: [] }
  ]},
  { categoria: 'Procedimientos Técnicos', icono: 'fa-flask-vial', items: [
    { name: 'Colocación y manejo de sonda vesical', desc: '(sonda Foley, gasas, agua destilada, bolsa colectora, jeringas, guantes, guantes estériles, lidocaína en gel, pervinox)', precio: 15000, insumos: ['sonda Foley', 'gasas', 'agua destilada', 'bolsa colectora', 'jeringas', 'guantes', 'guantes estériles', 'lidocaína en gel', 'pervinox'] },
    { name: 'Colocación y manejo de sonda vesical para lavado vesical', desc: '(sonda Foley, gasas, agua destilada, bolsa colectora, jeringas, guantes, guantes estériles, lidocaína en gel, pervinox, agua destilada para lavado)', precio: 15000, insumos: ['sonda Foley', 'gasas', 'agua destilada', 'bolsa colectora', 'jeringas', 'guantes', 'guantes estériles', 'lidocaína en gel', 'pervinox', 'agua destilada para lavado'] },
    { name: 'Colocación y manejo de sonda nasogástrica', desc: '(sonda ej. K32, gasas, bolsa colectora, jeringas, guantes, estetoscopio lidocaína en gel, cinta hipoalergénica)', precio: 15000, insumos: ['sonda ej. K32', 'gasas', 'bolsa colectora', 'jeringas', 'guantes', 'estetoscopio lidocaína en gel', 'cinta hipoalergénica'] },
    { name: 'Canalización de vías periféricas', desc: '(guantes, abbocath, algodón, alcohol, cinta hipoalergénica, llave de 3 vías, tegaderm, prolongador)', precio: 20000, insumos: ['guantes', 'abbocath', 'algodón', 'alcohol', 'cinta hipoalergénica', 'llave de 3 vías', 'tegaderm', 'prolongador'] },
    { name: 'Canalización de vías periféricas e infusión', desc: '(guantes, abbocath, algodón, alcohol, cinta hipoalergénica, llave de 3 vías, tegaderm, guia de suero, suero y medicamento a indundir)', precio: 30000, insumos: ['guantes', 'abbocath', 'algodón', 'alcohol', 'cinta hipoalergénica', 'llave de 3 vías', 'tegaderm', 'guia de suero', 'suero y medicamento a indundir'] },
    { name: 'Aspiración de secreciones', desc: '(guantes estériles, solución fisiológica, lidocaína gel, panel de aspiración o aspirador portátil, cánula para aspirar ej. K30)', precio: 20000, insumos: ['guantes estériles', 'solución fisiológica', 'lidocaína gel', 'panel de aspiración o aspirador portátil', 'cánula para aspirar ej. K30'] }
  ]},
  { categoria: 'Cuidados Respiratorios', icono: 'fa-lungs', items: [
    { name: 'Administración de oxígeno', desc: '(cánula o máscara de oxígeno, tubuladura, oxígeno, guantes)', precio: 5000, insumos: ['cánula o máscara de oxígeno', 'tubuladura', 'oxígeno', 'guantes'] },
    { name: 'Manejo de dispositivos CPAP/BiPAP', desc: '(dispositivo, guantes estériles, gasas)', precio: 10000, insumos: ['dispositivo', 'guantes estériles', 'gasas'] },
    { name: 'Nebulizaciones', desc: '(nebulizador, guantes, solución fisiológica, solución medicamentosa para nebulización)', precio: 5000, insumos: ['nebulizador', 'guantes', 'solución fisiológica', 'solución medicamentosa para nebulización'] },
    { name: 'Ejercicios respiratorios', desc: '', precio: 3000, insumos: [] }
  ]},
  { categoria: 'Alimentación', icono: 'fa-utensils', items: [
    { name: 'Alimentación asistida', desc: '', precio: 3000, insumos: [] },
    { name: 'Nutrición enteral', desc: 'recambio de guía y alimentos, educación, programación', precio: 10000, insumos: [] },
    { name: 'Monitoreo y educación de bomba', desc: '', precio: 20000, insumos: [] }
  ]},
  { categoria: 'Cuidados y Acompañamientos', icono: 'fa-clock', items: [
    { name: 'Cuidado por hora', desc: '', precio: 15000, insumos: [] },
    { name: 'Cuidado por 8 hs', desc: '', precio: 110000, insumos: [] },
    { name: 'Cuidado por 12 hs', desc: '', precio: 160000, insumos: [] },
    { name: 'Cuidado programado', desc: '', precio: 15000, insumos: [] },
    { name: 'Acompañamiento por hora', desc: '', precio: 13000, insumos: [] },
    { name: 'Acompañamiento por 8 hs', desc: '', precio: 95000, insumos: [] },
    { name: 'Acompañamiento por 12 hs', desc: '', precio: 140000, insumos: [] },
    { name: 'Acompañamiento programado', desc: '', precio: 13000, insumos: [] }
  ]},
  { categoria: 'Educación y Asistencia', icono: 'fa-users', items: [
    { name: 'Educación sobre medicación', desc: '', precio: 3000, insumos: [] },
    { name: 'Prevención de complicaciones', desc: '', precio: 3000, insumos: [] },
    { name: 'Acompañamiento familiar', desc: '', precio: 3000, insumos: [] }
  ]},
  { categoria: 'Atención en Urgencias', icono: 'fa-truck-medical', items: [
    { name: 'Manejo inicial de emergencias', desc: '', precio: 25000, insumos: [] },
    { name: 'Activación de sistemas de emergencia', desc: '', precio: 5000, insumos: [] }
  ]}
]

export default function ContratarServicio() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const enfermeroId = searchParams.get('enf') || 'cualquiera'
  const enfermeroOnline = searchParams.get('online') === 'true'

  const [tipo, setTipo] = useState(enfermeroOnline ? 'ahora' : 'reserva')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [direccionElegida, setDireccionElegida] = useState('')
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const [mostrarBuscador, setMostrarBuscador] = useState(false)
  const [inputDireccion, setInputDireccion] = useState('')
  const [resultadosOSM, setResultadosOSM] = useState([])
  const [cargandoOSM, setCargandoOSM] = useState(false)
  const [direcciones, setDirecciones] = useState([])
  const serviciosPreload = searchParams.get('servicios')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState(() => {
    if (!serviciosPreload) return {}
    const nombres = serviciosPreload.split('|')
    const obj = {}
    nombres.forEach(n => { obj[n] = true })
    return obj
  })
  const [acordeonAbierto, setAcordeonAbierto] = useState(null)
  const [material, setMaterial] = useState(null)
  const [notas, setNotas] = useState('')
  const [modalResumen, setModalResumen] = useState(false)
  const [radar, setRadar] = useState(false)
  const [errorServicio, setErrorServicio] = useState(false)
  const [errorMaterial, setErrorMaterial] = useState(false)

  const hoy = new Date()
  const fechaMin = hoy.toISOString().split('T')[0]
  const fechaMaxDate = new Date(hoy)
  fechaMaxDate.setDate(fechaMaxDate.getDate() + 10) 
  const fechaMax = fechaMaxDate.toISOString().split('T')[0]

  useEffect(() => {
    window.scrollTo(0, 0)
    const container = document.querySelector('.content-scroll')
    if (container) container.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return
    getDoc(doc(db, 'pacientes', user.uid)).then(snap => {
      if (!snap.exists()) return
      const data = snap.data()
      const lista = []
      if (data.direccionRegistro) {
        lista.push({ nombre: 'Mi Casa', calle: data.direccionRegistro, piso: '', depto: '' })
      }
      if (data.direcciones && Array.isArray(data.direcciones)) {
        data.direcciones.forEach(d => { lista.push({ nombre: d.nombre || 'Otra', calle: d.calle || '', piso: d.piso || '', depto: d.depto || '' }) })
      }
      setDirecciones(lista)
      if (lista.length > 0) setDireccionElegida(formatearDireccion(lista[0]))
    })
  }, [])

  function formatearDireccion(d) {
    let txt = d.calle
    if (d.piso) txt += `, Piso ${d.piso}`
    if (d.depto) txt += `, Depto ${d.depto}`
    return txt
  }

  let timeoutOSM
  function buscarOSM(texto) {
    clearTimeout(timeoutOSM)
    if (texto.length < 4) { setResultadosOSM([]); return }
    setCargandoOSM(true)
    timeoutOSM = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto)}&format=json&addressdetails=1&countrycodes=ar&limit=5`)
        const datos = await res.json()
        setResultadosOSM(datos.map(l => ({
          display: `${l.address.road || ''} ${l.address.house_number || ''}, ${l.address.city || l.address.town || l.address.state || ''}`.trim().replace(/^,|,$/g, '').trim() || l.display_name
        })))
      } catch { setResultadosOSM([]) }
      setCargandoOSM(false)
    }, 800)
  }

  function seleccionarDireccion(d) {
    setDireccionElegida(formatearDireccion(d))
    setMostrarBuscador(false)
    setDropdownAbierto(false)
  }

  function toggleServicio(nombre) {
    setServiciosSeleccionados(prev => ({ ...prev, [nombre]: !prev[nombre] }))
  }

  function calcularResumen() {
    const seleccionados = SERVICIOS.flatMap(c => c.items).filter(i => serviciosSeleccionados[i.name])
    if (seleccionados.length === 0) { setErrorServicio(true); return }
    if (!material) { setErrorMaterial(true); return }
    if (tipo === 'reserva' && (!fecha || !hora)) {
      alert('Seleccioná fecha y hora para la reserva')
      return
    }
    setModalResumen(true)
  }

  const seleccionadosList = SERVICIOS.flatMap(c => c.items).filter(i => serviciosSeleccionados[i.name])
  const esSoloPrueba = seleccionadosList.length === 1 && seleccionadosList[0]?.name === 'Prueba'
  const costoTotal = esSoloPrueba ? 5000 : PRECIO_BASE + seleccionadosList.reduce((acc, i) => acc + i.precio, 0)
  const pagoEnfermero = costoTotal * 0.82
  const insumos = [...new Set(seleccionadosList.flatMap(i => i.insumos))]

  async function confirmarPedido() {
    setModalResumen(false)
    setRadar(true)
    const user = auth.currentUser
    const pin = String(Math.floor(1000 + Math.random() * 9000))
    await addDoc(collection(db, 'solicitudes'), {
      pacienteId: user.uid,
      pacienteNombre: user.displayName || 'Paciente',
      pacienteFoto: user.photoURL || '',
      estado: 'pendiente',
      tipo,
      fechaReserva: fecha,
      horaReserva: hora,
      direccion: direccionElegida,
      servicios: seleccionadosList.map(s => s.name),
      notas,
      estadoMateriales: material,
      totalPaciente: costoTotal,
      pagoEnfermero,
      insumos,
      enfermeroId: enfermeroId === 'cualquiera' ? null : enfermeroId,
      pin,
      fechaCreacion: serverTimestamp()
    })
    setTimeout(() => navigate('/paciente/turnos'), 4500)
  }

  function filtrarNotas(texto) {
    if (/\d[\d\s\-\(\)\.]{6,}\d/.test(texto)) return false
    if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(texto)) return false
    if (/(whatsapp|instagram|telegram|facebook|twitter|tiktok|@[\w]+)/i.test(texto)) return false
    if (/(mi\s*(cel|número|teléfono|telf|celular|wsp|whats)|llamame|escribime|contactame|te\s*llamo)/i.test(texto)) return false
    return true
  }

  return (
    <div style={{ padding: '20px', paddingBottom: '120px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {radar && (
        <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 3000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px' }}>
          <div style={{ width: '110px', height: '110px', background: '#e6f2f3', borderRadius: '50%', border: '2px solid var(--verde-logo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', animation: 'pulse 1.5s infinite' }}>
            <i className="fa-solid fa-user-nurse" style={{ fontSize: '2.8rem', color: 'var(--verde-logo)' }}></i>
          </div>
          <h2 style={{ fontWeight: 800, marginBottom: '10px' }}>{tipo === 'ahora' ? 'Solicitud enviada' : 'Enviando tu reserva...'}</h2>
          <p style={{ color: 'var(--gris-texto)', fontSize: '0.9rem', marginBottom: '20px' }}>{tipo === 'ahora' ? 'Tu solicitud fue enviada. Esperando confirmación del profesional.' : 'Tu solicitud de turno fue enviada al profesional.'}</p>
          {tipo === 'ahora' && (
            <div style={{ background: '#f0f9f4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 16px', maxWidth: '320px', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <i className="fa-solid fa-circle-info" style={{ color: '#1a535c', fontSize: '1rem', marginTop: '2px', flexShrink: 0 }}></i>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#1a535c', lineHeight: 1.5, fontWeight: 600 }}>
                  Si el profesional no responde o rechaza la solicitud, la app buscará automáticamente al profesional disponible más cercano para atenderte.
                </p>
              </div>
            </div>
          )}
          <style>{`@keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26,83,92,0.3); } 70% { transform: scale(1.08); box-shadow: 0 0 0 30px rgba(26,83,92,0); } 100% { transform: scale(1); }}`}</style>
        </div>
      )}

      {/* HEADER COMO EN EL PWA ORIGINAL */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--rojo-logo)', fontSize: '1.2rem', marginRight: '15px', cursor: 'pointer' }}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--texto)' }}>Configurar Atención</h2>
      </div>

      <main style={{ padding: '0' }}>

        {/* CUÁNDO */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--verde-logo)', marginBottom: '15px', textTransform: 'uppercase' }}>¿Cuándo lo necesitás?</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[{id:'ahora', icon:'fa-bolt', label:'Ahora mismo'}, {id:'reserva', icon:'fa-calendar-days', label:'Reservar fecha'}].map(op => {
              const bloqueado = op.id === 'ahora' && !enfermeroOnline
              function filtrarNotas(texto) {
    if (/\d[\d\s\-\(\)\.]{6,}\d/.test(texto)) return false
    if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(texto)) return false
    if (/(whatsapp|instagram|telegram|facebook|twitter|tiktok|@[\w]+)/i.test(texto)) return false
    if (/(mi\s*(cel|número|teléfono|telf|celular|wsp|whats)|llamame|escribime|contactame|te\s*llamo)/i.test(texto)) return false
    return true
  }

  return (
              <div key={op.id} onClick={() => !bloqueado && setTipo(op.id)} style={{ flex: 1, padding: '15px 5px', border: `2px solid ${bloqueado ? '#e2e8f0' : tipo === op.id ? 'var(--rojo-logo)' : '#e2e8f0'}`, borderRadius: '14px', textAlign: 'center', cursor: bloqueado ? 'not-allowed' : 'pointer', background: bloqueado ? '#f8fafc' : tipo === op.id ? '#fef2f2' : 'white', color: bloqueado ? '#cbd5e1' : tipo === op.id ? 'var(--rojo-logo)' : 'var(--gris-texto)', fontWeight: 800, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minHeight: '85px', justifyContent: 'center', transition: '0.3s', opacity: bloqueado ? 0.5 : 1, position: 'relative' }}>
                <i className={`fa-solid ${op.icon}`} style={{ fontSize: '1.3rem' }}></i>
                {op.label}
                {bloqueado && <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginTop: '-2px' }}>No disponible</span>}
              </div>
            )})}
          </div>
          
          {tipo === 'reserva' && (
            <div style={{ marginTop: '15px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--gris-texto)', marginBottom: '10px' }}>
                <i className="fa-solid fa-circle-info"></i> Podés reservar hasta 10 días por adelantado
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--verde-logo)', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>Fecha</label>
                  <input type="date" value={fecha} min={fechaMin} max={fechaMax} onChange={e => setFecha(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '14px 10px', border: '2px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--verde-logo)', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>Hora</label>
                  <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '14px 10px', border: '2px solid #e2e8f0', borderRadius: '12px', fontWeight: 600, fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DIRECCIÓN */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--verde-logo)', marginBottom: '15px', textTransform: 'uppercase' }}>¿Dónde te atendemos?</h3>
          <div style={{ border: '2px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'white' }} onClick={() => setDropdownAbierto(!dropdownAbierto)}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{direccionElegida || 'Seleccionar dirección...'}</span>
              <i className="fa-solid fa-chevron-down" style={{ color: 'var(--rojo-logo)', fontSize: '0.9rem', transform: dropdownAbierto ? 'rotate(180deg)' : 'none', transition: '0.3s' }}></i>
            </div>
            {dropdownAbierto && (
              <div style={{ borderTop: '1px solid #e2e8f0' }}>
                {direcciones.map((d, i) => (
                  <div key={i} onClick={() => seleccionarDireccion(d)}
                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>
                    <i className={`fa-solid ${i === 0 ? 'fa-house' : 'fa-location-dot'}`} style={{ color: 'var(--verde-logo)' }}></i>
                    {d.nombre} – {d.calle}
                  </div>
                ))}
                <div onClick={() => { setMostrarBuscador(true); setDropdownAbierto(false); setDireccionElegida('') }}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--verde-logo)' }}>
                  <i className="fa-solid fa-plus"></i> Cargar nueva dirección...
                </div>
              </div>
            )}
          </div>
          {mostrarBuscador && (
            <div style={{ marginTop: '10px', position: 'relative' }}>
              <input type="text" placeholder="Escribí tu dirección (calle y número)..." value={inputDireccion} autoFocus
                onChange={e => { setInputDireccion(e.target.value); setDireccionElegida(e.target.value); buscarOSM(e.target.value) }}
                style={{ width: '100%', padding: '14px', boxSizing: 'border-box', border: '2px solid var(--verde-logo)', borderRadius: '12px', fontWeight: 600, fontFamily: 'inherit', outline: 'none' }} />
              {cargandoOSM && <div style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--gris-texto)', textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin"></i> Buscando direcciones...</div>}
              {resultadosOSM.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, border: '2px solid #e2e8f0', borderRadius: '12px', marginTop: '5px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                  {resultadosOSM.map((r, i) => (
                    <div key={i} onClick={() => { setDireccionElegida(r.display); setInputDireccion(r.display); setResultadosOSM([]) }}
                      style={{ padding: '12px 15px', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: 'var(--gris-texto)' }}></i> {r.display}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SERVICIOS */}
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--verde-logo)', marginBottom: '10px', textTransform: 'uppercase' }}>Seleccioná los servicios</div>
        {SERVICIOS.map((cat, ci) => {
          const alguno = cat.items.some(i => serviciosSeleccionados[i.name])
          const abierto = acordeonAbierto === ci
          function filtrarNotas(texto) {
    if (/\d[\d\s\-\(\)\.]{6,}\d/.test(texto)) return false
    if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(texto)) return false
    if (/(whatsapp|instagram|telegram|facebook|twitter|tiktok|@[\w]+)/i.test(texto)) return false
    if (/(mi\s*(cel|número|teléfono|telf|celular|wsp|whats)|llamame|escribime|contactame|te\s*llamo)/i.test(texto)) return false
    return true
  }

  return (
            <div key={ci} style={{ background: alguno ? '#f0f7f8' : 'white', borderRadius: '16px', marginBottom: '12px', border: `2px solid ${alguno ? 'var(--verde-logo)' : '#e2e8f0'}`, overflow: 'hidden', transition: '0.3s' }}>
              <div onClick={() => setAcordeonAbierto(abierto ? null : ci)} style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: alguno ? 'var(--verde-logo)' : '#f1f5f9', color: alguno ? 'white' : 'var(--verde-logo)', fontSize: '1rem', flexShrink: 0 }}>
                  <i className={`fa-solid ${cat.icono}`}></i>
                </div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--verde-logo)', textTransform: 'uppercase', flex: 1 }}>{cat.categoria}</h3>
                {alguno && <i className="fa-solid fa-circle-check" style={{ color: 'var(--verde-logo)', fontSize: '1rem' }}></i>}
                <i className="fa-solid fa-chevron-down" style={{ color: 'var(--rojo-logo)', transition: '0.3s', transform: abierto ? 'rotate(180deg)' : 'none', fontSize: '0.9rem' }}></i>
              </div>
              {abierto && (
                <div style={{ padding: '0 20px 20px' }}>
                  {cat.items.map((item, ii) => (
                    <div key={ii} onClick={() => toggleServicio(item.name)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '15px 0', borderBottom: ii < cat.items.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                      <div style={{ flex: 1, paddingRight: '10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gris-texto)', marginTop: '3px', display: 'block', lineHeight: 1.3 }}>{item.desc}</span>
                      </div>
                      <input type="checkbox" checked={!!serviciosSeleccionados[item.name]} onChange={() => toggleServicio(item.name)} onClick={e => e.stopPropagation()} style={{ width: '22px', height: '22px', accentColor: 'var(--verde-logo)', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* MATERIALES */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--verde-logo)', marginBottom: '8px', textTransform: 'uppercase' }}>¿Contás con insumos?</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', lineHeight: 1.4, marginBottom: '15px' }}>Indicá si ya tenés los materiales necesarios o si el profesional debe traerlos.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[{id:'tengo', icon:'fa-box-open', label:'Tengo los insumos'}, {id:'necesito', icon:'fa-truck-medical', label:'Que los traiga el profesional'}].map(op => (
              <div key={op.id} onClick={() => setMaterial(op.id)} style={{ flex: 1, padding: '15px 5px', border: `2px solid ${material === op.id ? 'var(--rojo-logo)' : '#e2e8f0'}`, borderRadius: '14px', textAlign: 'center', cursor: 'pointer', background: material === op.id ? '#fef2f2' : 'white', color: material === op.id ? 'var(--rojo-logo)' : 'var(--gris-texto)', fontWeight: 800, fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minHeight: '85px', justifyContent: 'center', transition: '0.3s' }}>
                <i className={`fa-solid ${op.icon}`} style={{ fontSize: '1.3rem' }}></i>
                {op.label}
              </div>
            ))}
          </div>

          {material && insumos.length > 0 && (
            <div style={{ marginTop: '15px', background: '#f1f5f9', padding: '15px', borderRadius: '12px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--verde-logo)', marginBottom: '8px' }}>Insumos requeridos para esta atención:</p>
              <ul style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', paddingLeft: '20px', lineHeight: 1.5, margin: 0 }}>
                {insumos.map((ins, i) => (
                  <li key={i}>{ins.charAt(0).toUpperCase() + ins.slice(1)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* NOTAS */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--verde-logo)', marginBottom: '10px', textTransform: 'uppercase' }}>Notas adicionales</h3>
          <textarea value={notas} onChange={e => { if (filtrarNotas(e.target.value)) setNotas(e.target.value); else { setNotas(e.target.value.slice(0, -1)); alert('Por seguridad no podés ingresar datos de contacto en las indicaciones.') } }} placeholder="Ej: segundo piso sin ascensor, paciente adulto mayor, medicamento específico..." rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px', fontWeight: 500, fontFamily: 'inherit', outline: 'none', resize: 'none', fontSize: '0.9rem' }} />
        </div>

        {/* BOTÓN ENVIAR */}
        <button onClick={calcularResumen} style={{ width: '100%', background: 'var(--rojo-logo)', color: 'white', border: 'none', padding: '18px', borderRadius: '24px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', marginBottom: '40px' }}>
          {tipo === 'ahora' ? 'ENVIAR SOLICITUD' : 'RESERVAR TURNO'} 
        </button>

      </main>

      {/* MODALES ERROR */}
      {errorServicio && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={() => setErrorServicio(false)}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', textAlign: 'center', width: '85%', maxWidth: '320px' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '3rem', color: 'var(--amarillo-alerta)', marginBottom: '15px', display: 'block' }}></i>
            <h3 style={{ marginBottom: '10px' }}>Falta un servicio</h3>
            <p style={{ color: 'var(--gris-texto)', fontSize: '0.9rem', marginBottom: '20px' }}>Seleccioná al menos un servicio antes de continuar.</p>
            <button onClick={() => setErrorServicio(false)} style={{ background: 'var(--verde-logo)', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}>Entendido</button>
          </div>
        </div>
      )}

      {errorMaterial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={() => setErrorMaterial(false)}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', textAlign: 'center', width: '85%', maxWidth: '320px' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '3rem', color: 'var(--amarillo-alerta)', marginBottom: '15px', display: 'block' }}></i>
            <h3 style={{ marginBottom: '10px' }}>¿Contás con insumos?</h3>
            <p style={{ color: 'var(--gris-texto)', fontSize: '0.9rem', marginBottom: '20px' }}>Indicá si ya tenés los materiales o si el profesional debe traerlos.</p>
            <button onClick={() => setErrorMaterial(false)} style={{ background: 'var(--verde-logo)', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}>Entendido</button>
          </div>
        </div>
      )}

      {/* ✅ FIX: MODAL RESUMEN CON DISEÑO 2 PERO SIN PRECIO Y CON BOTÓN ROJO */}
      {modalResumen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '28px', padding: '25px', textAlign: 'center', maxHeight: '85vh', overflowY: 'auto' }}>
            
            {/* Ícono de portapapeles arriba */}
            <i className="fa-solid fa-clipboard-list" style={{ fontSize: '2.5rem', color: 'var(--verde-logo)', marginBottom: '15px', display: 'block' }}></i>
            
            <h3 style={{ marginBottom: '5px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--texto)' }}>Resumen de tu solicitud</h3>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', marginBottom: '20px' }}>
              {tipo === 'ahora' ? 'Atención inmediata' : `Reserva: ${fecha} a las ${hora}hs`} · {direccionElegida}
            </p>

            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
              <p style={{ color: 'var(--verde-logo)', fontWeight: 800, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                • Visita Domiciliaria Profesional
              </p>
              {seleccionadosList.map((s, i) => (
                <p key={i} style={{ marginBottom: '6px', color: 'var(--texto)', fontWeight: 500 }}>
                  • {s.name}
                </p>
              ))}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '15px', marginBottom: '25px', textAlign: 'left' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: material === 'tengo' ? 'var(--gris-texto)' : 'var(--verde-logo)', marginBottom: '8px' }}>
                <i className={`fa-solid ${material === 'tengo' ? 'fa-box-open' : 'fa-truck-medical'}`}></i> {material === 'tengo' ? 'Insumos (Contás con todo):' : 'Insumos (Lleva el profesional):'}
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {insumos.length > 0 ? insumos.map((ins, i) => (
                  <li key={i} style={{ fontSize: '0.8rem', color: 'var(--texto)', marginBottom: '3px' }}>
                    {ins.charAt(0).toUpperCase() + ins.slice(1)}
                  </li>
                )) : (
                  <li style={{ fontSize: '0.8rem', listStyle: 'none', fontStyle: 'italic', color: 'var(--gris-texto)' }}>
                    No se requieren insumos especiales.
                  </li>
                )}
              </ul>
            </div>

            {/* PRECIO REMOVIDO AQUÍ COMPLETAMENTE */}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setModalResumen(false)} 
                style={{ flex: 0.5, padding: '15px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer', color: 'var(--texto)' }}>
                Editar
              </button>
              
              {/* ✅ BOTÓN DE CONFIRMAR EN ROJO CON ÍCONO DE PAPELITO */}
              <button 
                onClick={confirmarPedido} 
                style={{ flex: 1, padding: '15px', borderRadius: '16px', background: 'var(--rojo-logo)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>
                <i className="fa-solid fa-paper-plane" style={{ marginRight: '5px' }}></i> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}