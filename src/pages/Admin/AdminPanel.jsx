import { useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'

const ADMIN_USER = 'cuidagoargentina@gmail.com'
const ADMIN_PASS = 'florcha1992'

const PREGUNTAS_PAC = {
  p1: '¿Qué tan fácil fue pedir el servicio?',
  p2: '¿El profesional llegó a tiempo?',
  p3: '¿Cómo fue la atención recibida?',
  p4: '¿Recomendarías CuidaGo?',
  p5: '¿Cómo calificás la app?',
}
const PREGUNTAS_PRO = {
  p1: '¿La app es fácil de usar?',
  p2: '¿La información del servicio fue clara?',
  p3: '¿Cómo calificás el soporte de CuidaGo?',
  p4: '¿Cómo te recibió el paciente?',
  p5: '¿Cómo calificás la app?',
}

const TABS = [
  { key: 'resumen',       label: '📊 Resumen'       },
  { key: 'usuarios',      label: '👥 Usuarios'       },
  { key: 'solicitudes',   label: '📋 Solicitudes'    },
  { key: 'enc_pacientes', label: '👤 Enc. Pacientes' },
  { key: 'enc_profesionales', label: '🩺 Enc. Profesionales' },
  { key: 'resenas',       label: '⭐ Reseñas'        },
  { key: 'cancelaciones',  label: '❌ Cancelaciones'   },
  { key: 'rechazos',       label: '🙅 Rechazos'        },
  { key: 'penalizaciones', label: '🚫 Penalizaciones'  },
  { key: 'emails',         label: '📧 Emails'          },
]

function Stat({ label, valor, sub, color }) {
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '18px 16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: color || '#0f172a', lineHeight: 1 }}>{valor ?? '--'}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{sub}</p>}
    </div>
  )
}

function BarraDistribucion({ opciones, total }) {
  return (
    <div>
      {Object.entries(opciones).sort((a,b)=>b[1]-a[1]).map(([op, count]) => (
        <div key={op} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ minWidth: '80px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{op}</span>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
            <div style={{ width: total ? `${(count/total)*100}%` : '0%', background: '#1a535c', height: '100%', borderRadius: '6px', transition: '0.5s' }} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', minWidth: '28px', textAlign: 'right' }}>{count}</span>
        </div>
      ))}
    </div>
  )
}

function Stars({ n }) {
  return <span>{[1,2,3,4,5].map(i=><span key={i} style={{color:i<=n?'#f59e0b':'#e2e8f0',fontSize:'0.9rem'}}>★</span>)}</span>
}

function promedioKey(lista, key) {
  const vals = lista.map(e=>Number(e[key])).filter(v=>v>0)
  if (!vals.length) return null
  return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)
}

function formatFecha(f) {
  if (!f) return ''
  return new Date(f).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'})
}

function calcularEdad(nacimiento) {
  if (!nacimiento) return null
  const hoy = new Date()
  const nac = new Date(nacimiento)
  if (isNaN(nac)) return null
  return hoy.getFullYear() - nac.getFullYear()
}

export default function AdminPanel() {
  const [logueado, setLogueado] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [errorLogin, setErrorLogin] = useState(false)
  const [tab, setTab] = useState('resumen')
  const [cargando, setCargando] = useState(false)

  const [pacientes, setPacientes] = useState([])
  const [enfermeros, setEnfermeros] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [encPac, setEncPac] = useState([])
  const [encPro, setEncPro] = useState([])
  const [resenas, setResenas] = useState([])
  const [penalizaciones, setPenalizaciones] = useState([])
  const [cancelaciones, setCancelaciones] = useState([])
  const [cancelacionesPac, setCancelacionesPac] = useState([])
  const [verDetallePac, setVerDetallePac] = useState(false)
  const [verDetallePro, setVerDetallePro] = useState(false)

  function login() {
    if (usuario.trim() === ADMIN_USER && password === ADMIN_PASS) {
      setLogueado(true); setErrorLogin(false); cargarDatos()
    } else { setErrorLogin(true) }
  }

  async function cargarDatos() {
    setCargando(true)
    try {
      const [snapPac, snapEnf, snapSol, snapCan, snapPen, snapCanPac] = await Promise.all([
        getDocs(collection(db, 'pacientes')),
        getDocs(collection(db, 'enfermeros')),
        getDocs(collection(db, 'solicitudes')),
        getDocs(collection(db, 'cancelaciones_profesionales')),
        getDocs(collection(db, 'penalizaciones')),
        getDocs(collection(db, 'cancelaciones_pacientes')),
      ])

      const listaPac = [], listaEncPac = []
      snapPac.forEach(d => {
        const data = { uid: d.id, ...d.data() }
        listaPac.push(data)
        if (data.encuestaApp) listaEncPac.push({ uid: d.id, nombre: data.nombre || 'Paciente', ...data.encuestaApp })
      })

      const listaEnf = [], listaEncPro = []
      snapEnf.forEach(d => {
        const data = { uid: d.id, ...d.data() }
        listaEnf.push(data)
        if (data.encuestaApp) listaEncPro.push({ uid: d.id, nombre: data.nombre || 'Profesional', ...data.encuestaApp })
      })

      const listaSol = [], listaRes = []
      snapSol.forEach(d => {
        const data = { id: d.id, ...d.data() }
        listaSol.push(data)
        if (data.resena?.estrellas) listaRes.push({
          id: d.id,
          pacienteNombre: data.pacienteNombre || 'Paciente',
          estrellas: data.resena.estrellas,
          comentario: data.resena.comentario || '',
          fecha: data.resena.fecha || data.fechaCompletado || '',
        })
      })
      listaRes.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))

      setPacientes(listaPac); setEnfermeros(listaEnf)
      setSolicitudes(listaSol); setEncPac(listaEncPac)
      setEncPro(listaEncPro); setResenas(listaRes)

      const listaCan = []
      snapCan.forEach(d => listaCan.push({ id: d.id, ...d.data() }))
      listaCan.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))
      setCancelaciones(listaCan)

      const listaCanPac = []
      snapCanPac.forEach(d => listaCanPac.push({ id: d.id, ...d.data() }))
      listaCanPac.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))
      setCancelacionesPac(listaCanPac)

      const listaPen = []
      snapPen.forEach(d => listaPen.push({ id: d.id, ...d.data() }))
      listaPen.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))
      setPenalizaciones(listaPen)
    } catch(e) { console.error('Error:', e) }
    setCargando(false)
  }

  if (!logueado) return (
    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{background:'white',borderRadius:'28px',padding:'40px 32px',width:'100%',maxWidth:'380px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{width:'64px',height:'64px',background:'#1a535c',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'1.8rem'}}>🔐</div>
          <h2 style={{margin:'0 0 6px',fontSize:'1.3rem',fontWeight:800,color:'#0f172a'}}>Panel Admin</h2>
          <p style={{margin:0,color:'#64748b',fontSize:'0.88rem'}}>CuidaGo · Acceso restringido</p>
        </div>
        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontSize:'0.78rem',fontWeight:700,color:'#64748b',textTransform:'uppercase',marginBottom:'6px'}}>Usuario</label>
          <input value={usuario} onChange={e=>setUsuario(e.target.value)} type="email" placeholder="correo@email.com"
            style={{width:'100%',padding:'14px 16px',borderRadius:'14px',border:`1.5px solid ${errorLogin?'#fca5a5':'#e2e8f0'}`,fontSize:'0.95rem',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
        </div>
        <div style={{marginBottom:'24px'}}>
          <label style={{display:'block',fontSize:'0.78rem',fontWeight:700,color:'#64748b',textTransform:'uppercase',marginBottom:'6px'}}>Contraseña</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••"
            onKeyDown={e=>e.key==='Enter'&&login()}
            style={{width:'100%',padding:'14px 16px',borderRadius:'14px',border:`1.5px solid ${errorLogin?'#fca5a5':'#e2e8f0'}`,fontSize:'0.95rem',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
          {errorLogin&&<p style={{margin:'6px 0 0',fontSize:'0.8rem',color:'#b71c1c',fontWeight:600}}>Usuario o contraseña incorrectos.</p>}
        </div>
        <button onClick={login} style={{width:'100%',padding:'16px',borderRadius:'16px',background:'#1a535c',color:'white',border:'none',fontSize:'1rem',fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 8px 25px rgba(26,83,92,0.3)'}}>
          Ingresar
        </button>
      </div>
    </div>
  )

  const totalPac = pacientes.length
  const totalEnf = enfermeros.length
  const pacMasc = pacientes.filter(p=>p.sexo?.toLowerCase().includes('mas')||p.genero?.toLowerCase().includes('mas')||p.sexo==='M').length
  const pacFem = pacientes.filter(p=>p.sexo?.toLowerCase().includes('fem')||p.genero?.toLowerCase().includes('fem')||p.sexo==='F').length
  const enfMasc = enfermeros.filter(p=>p.sexo?.toLowerCase().includes('mas')||p.genero?.toLowerCase().includes('mas')||p.sexo==='M').length
  const enfFem = enfermeros.filter(p=>p.sexo?.toLowerCase().includes('fem')||p.genero?.toLowerCase().includes('fem')||p.sexo==='F').length
  const edadesPac = pacientes.map(p=>calcularEdad(p.nacimiento||p.fechaNacimiento)).filter(Boolean)
  const edadesEnf = enfermeros.map(e=>calcularEdad(e.nacimiento||e.fechaNacimiento)).filter(Boolean)
  const promEdadPac = edadesPac.length ? Math.round(edadesPac.reduce((a,b)=>a+b,0)/edadesPac.length) : null
  const promEdadEnf = edadesEnf.length ? Math.round(edadesEnf.reduce((a,b)=>a+b,0)/edadesEnf.length) : null
  const solCompletadas = solicitudes.filter(s=>s.estado==='completado').length
  const solCanceladas = solicitudes.filter(s=>s.estado==='cancelado').length
  const solRechazadas = solicitudes.filter(s=>s.estado==='rechazado').length
  const solPendientes = solicitudes.filter(s=>s.estado==='pendiente').length
  const solTotal = solicitudes.length
  const valoresSol = solicitudes.filter(s=>s.estado==='completado'&&s.totalPaciente).map(s=>Number(s.totalPaciente))
  const promValor = valoresSol.length ? Math.round(valoresSol.reduce((a,b)=>a+b,0)/valoresSol.length) : null
  const maxValor = valoresSol.length ? Math.max(...valoresSol) : null
  const minValor = valoresSol.length ? Math.min(...valoresSol) : null
  const facturacionTotal = valoresSol.reduce((a,b)=>a+b,0)
  const promResenas = resenas.length ? (resenas.reduce((a,b)=>a+b.estrellas,0)/resenas.length).toFixed(1) : null
  const servicioCount = {}
  solicitudes.forEach(s=>{ s.servicios?.forEach(sv=>{ servicioCount[sv]=(servicioCount[sv]||0)+1 }) })
  const topServicios = Object.entries(servicioCount).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const rangosEdad = (edades) => {
    const r = {'<20':0,'20-30':0,'31-40':0,'41-50':0,'51-60':0,'>60':0}
    edades.forEach(e=>{ if(e<20)r['<20']++; else if(e<=30)r['20-30']++; else if(e<=40)r['31-40']++; else if(e<=50)r['41-50']++; else if(e<=60)r['51-60']++; else r['>60']++ })
    return r
  }

  const listaRechazos = []
  solicitudes.forEach(s=>{
    s.motivosRechazo?.forEach(r=>{
      const enf = enfermeros.find(e=>e.uid===r.uid)
      listaRechazos.push({
        solicitudId: s.id,
        pacienteNombre: s.pacienteNombre || 'Paciente',
        servicio: s.servicios?.[0] || '',
        enfermeroNombre: enf?.nombre || r.uid?.slice(0,8) || 'Desconocido',
        motivo: r.motivo,
        fecha: r.fecha,
      })
    })
  })
  listaRechazos.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))
  const motivoCount = {}
  listaRechazos.forEach(r=>{ motivoCount[r.motivo]=(motivoCount[r.motivo]||0)+1 })

  function fechaRegistro(u) {
    return u.fechaCreacion?.toDate ? u.fechaCreacion.toDate().toISOString() : (u.fechaRegistro || u.createdAt || u.fechaCreacion || '')
  }
  const emailsPacientes = pacientes
    .filter(p=>p.email)
    .map(p=>({ nombre: p.nombre || 'Sin nombre', email: p.email, fecha: fechaRegistro(p) }))
    .sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))
  const emailsEnfermeros = enfermeros
    .filter(e=>e.email)
    .map(e=>({ nombre: e.nombre || 'Sin nombre', email: e.email, fecha: fechaRegistro(e) }))
    .sort((a,b)=>new Date(b.fecha)-new Date(a.fecha))

  function copiarEmails(lista) {
    const texto = lista.map(u=>u.email).join(', ')
    navigator.clipboard.writeText(texto)
    alert(`${lista.length} emails copiados al portapapeles`)
  }

  const CSS = `@keyframes spin{100%{transform:rotate(360deg)}} *{box-sizing:border-box} html,body{height:auto!important;overflow:auto!important;}`

  return (
    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",minHeight:'100vh',background:'#f8fafc',overflowY:'auto'}}>
      <style>{CSS}</style>
      <div style={{background:'#1a535c',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:100}}>
        <div>
          <h1 style={{margin:0,fontSize:'1rem',fontWeight:800,color:'white'}}>Panel Admin · CuidaGo</h1>
          <p style={{margin:0,fontSize:'0.72rem',color:'rgba(255,255,255,0.6)'}}>Estadísticas en tiempo real</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={cargarDatos} disabled={cargando} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'white',padding:'8px 12px',borderRadius:'10px',fontSize:'0.8rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🔄</button>
          <button onClick={()=>{setLogueado(false);setUsuario('');setPassword('')}} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'white',padding:'8px 14px',borderRadius:'10px',fontSize:'0.8rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Salir</button>
        </div>
      </div>

      <div style={{background:'white',borderBottom:'1px solid #f1f5f9',overflowX:'auto',whiteSpace:'nowrap',padding:'0 4px'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{display:'inline-block',padding:'14px 16px',border:'none',background:'transparent',fontWeight:700,fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit',color:tab===t.key?'#1a535c':'#94a3b8',borderBottom:`3px solid ${tab===t.key?'#1a535c':'transparent'}`,transition:'0.2s',whiteSpace:'nowrap'}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:'20px 16px 120px'}}>
        {cargando ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'#64748b'}}>
            <div style={{width:'36px',height:'36px',border:'3px solid #e2e8f0',borderTop:'3px solid #1a535c',borderRadius:'50%',margin:'0 auto 16px',animation:'spin 1s linear infinite'}}/>
            <p style={{fontWeight:700}}>Cargando datos...</p>
          </div>
        ) : (
          <>
            {tab==='resumen'&&(<div>
              <div style={{background:'#1a535c',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white'}}>
                <p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Resumen general</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginTop:'12px'}}>
                  {[['👥','Usuarios',totalPac+totalEnf],['📋','Solicitudes',solTotal],['⭐','Reseñas',resenas.length]].map(([ic,lb,val])=>(
                    <div key={lb} style={{textAlign:'center'}}><div style={{fontSize:'1.4rem'}}>{ic}</div><div style={{fontSize:'1.6rem',fontWeight:800}}>{val}</div><div style={{fontSize:'0.7rem',opacity:0.7}}>{lb}</div></div>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
                <Stat label="Pacientes" valor={totalPac} color="#1a535c"/>
                <Stat label="Enfermeros" valor={totalEnf} color="#1a535c"/>
                <Stat label="Completadas" valor={solCompletadas} color="#10b981"/>
                <Stat label="Canceladas" valor={solCanceladas} color="#b71c1c"/>
                <Stat label="Facturación total" valor={facturacionTotal?`$${facturacionTotal.toLocaleString('es-AR')}`:null} color="#0284c7"/>
                <Stat label="Ticket promedio" valor={promValor?`$${promValor.toLocaleString('es-AR')}`:null} color="#0284c7"/>
                <Stat label="Promedio reseñas" valor={promResenas?`${promResenas} ★`:null} color="#f59e0b"/>
                <Stat label="Enc. respondidas" valor={(encPac.length+encPro.length)} color="#7c3aed"/>
              </div>
            </div>)}

            {tab==='usuarios'&&(<div>
              <h3 style={{fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase',margin:'0 0 12px'}}>Pacientes</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
                <Stat label="Total pacientes" valor={totalPac} color="#1a535c"/>
                <Stat label="Edad promedio" valor={promEdadPac?`${promEdadPac} años`:null}/>
                <Stat label="Masculino" valor={pacMasc} sub={totalPac?`${Math.round(pacMasc/totalPac*100)}%`:null}/>
                <Stat label="Femenino" valor={pacFem} sub={totalPac?`${Math.round(pacFem/totalPac*100)}%`:null}/>
              </div>
              {edadesPac.length>0&&<div style={{background:'white',borderRadius:'16px',padding:'16px',border:'1px solid #f1f5f9',marginBottom:'20px'}}><BarraDistribucion opciones={rangosEdad(edadesPac)} total={edadesPac.length}/></div>}
              <h3 style={{fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase',margin:'0 0 12px'}}>Enfermeros</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
                <Stat label="Total enfermeros" valor={totalEnf} color="#1a535c"/>
                <Stat label="Edad promedio" valor={promEdadEnf?`${promEdadEnf} años`:null}/>
                <Stat label="Masculino" valor={enfMasc} sub={totalEnf?`${Math.round(enfMasc/totalEnf*100)}%`:null}/>
                <Stat label="Femenino" valor={enfFem} sub={totalEnf?`${Math.round(enfFem/totalEnf*100)}%`:null}/>
              </div>
              <h3 style={{fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase',margin:'0 0 12px'}}>Todos los pacientes</h3>
              {pacientes.map((p,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',padding:'12px 14px',border:'1px solid #f1f5f9',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><p style={{margin:0,fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{p.nombre||'Sin nombre'}</p><p style={{margin:0,fontSize:'0.75rem',color:'#94a3b8'}}>{p.email||''} {p.nacimiento?`· ${calcularEdad(p.nacimiento)} años`:''}</p></div>
                  <span style={{fontSize:'0.72rem',color:'#64748b',fontWeight:600}}>{p.sexo||''}</span>
                </div>
              ))}
              <h3 style={{fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase',margin:'16px 0 12px'}}>Todos los enfermeros</h3>
              {enfermeros.map((e,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',padding:'12px 14px',border:'1px solid #f1f5f9',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><p style={{margin:0,fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{e.nombre||'Sin nombre'}</p><p style={{margin:0,fontSize:'0.75rem',color:'#94a3b8'}}>{e.email||''} {e.matricula?`· MN ${e.matricula}`:''}</p></div>
                  <span style={{fontSize:'0.75rem',padding:'3px 8px',borderRadius:'8px',background:e.isOnline?'#dcfce7':'#f1f5f9',color:e.isOnline?'#166534':'#64748b',fontWeight:700}}>{e.isOnline?'Online':'Offline'}</span>
                </div>
              ))}
            </div>)}

            {tab==='solicitudes'&&(<div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
                <Stat label="Total" valor={solTotal}/>
                <Stat label="Completadas" valor={solCompletadas} color="#10b981"/>
                <Stat label="Canceladas" valor={solCanceladas} color="#b71c1c"/>
                <Stat label="Rechazadas" valor={solRechazadas} color="#f59e0b"/>
                <Stat label="Pendientes" valor={solPendientes} color="#0284c7"/>
                <Stat label="Ticket promedio" valor={promValor?`$${promValor.toLocaleString('es-AR')}`:null} color="#1a535c"/>
                <Stat label="Ticket máximo" valor={maxValor?`$${maxValor.toLocaleString('es-AR')}`:null}/>
                <Stat label="Ticket mínimo" valor={minValor?`$${minValor.toLocaleString('es-AR')}`:null}/>
              </div>
              <h3 style={{fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase',margin:'0 0 12px'}}>Últimas solicitudes</h3>
              {solicitudes.slice(0,20).map((s,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',padding:'12px 14px',border:'1px solid #f1f5f9',marginBottom:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{s.pacienteNombre||'Paciente'}</span>
                    <span style={{fontSize:'0.72rem',padding:'2px 8px',borderRadius:'6px',fontWeight:700,background:s.estado==='completado'?'#dcfce7':s.estado==='cancelado'?'#fee2e2':'#fef3c7',color:s.estado==='completado'?'#166534':s.estado==='cancelado'?'#b71c1c':'#b45309'}}>{s.estado}</span>
                  </div>
                  <p style={{margin:0,fontSize:'0.78rem',color:'#64748b'}}>{s.servicios?.[0]||''} {s.totalPaciente?`· $${Number(s.totalPaciente).toLocaleString('es-AR')}`:''}</p>
                </div>
              ))}
            </div>)}

            {tab==='enc_pacientes'&&(<div>
              <div style={{background:'#1a535c',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Encuestas pacientes</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{encPac.length}</p></div>
              </div>
              {['p1','p2','p3','p5'].map(k=>(<div key={k} style={{background:'white',borderRadius:'16px',padding:'16px',border:'1px solid #f1f5f9',marginBottom:'10px'}}>
                <p style={{margin:'0 0 8px',fontSize:'0.82rem',fontWeight:700,color:'#64748b'}}>{PREGUNTAS_PAC[k]}</p>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}><span style={{fontSize:'1.8rem',fontWeight:800,color:'#1a535c'}}>{promedioKey(encPac,k)||'--'}</span><span style={{color:'#f59e0b',fontSize:'1.2rem'}}>★</span></div>
              </div>))}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <h3 style={{margin:0,fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase'}}>Respuestas individuales</h3>
                <button onClick={()=>setVerDetallePac(v=>!v)} style={{fontSize:'0.78rem',fontWeight:700,color:'#1a535c',background:'#e6f2f3',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer'}}>{verDetallePac?'Ocultar':'Ver todas'}</button>
              </div>
              {verDetallePac&&encPac.map((e,i)=>(<div key={i} style={{background:'white',borderRadius:'14px',padding:'14px',border:'1px solid #f1f5f9',marginBottom:'8px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}><span style={{fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{e.nombre}</span><span style={{fontSize:'0.72rem',color:'#94a3b8'}}>{formatFecha(e.fecha)}</span></div>
                {['p1','p2','p3','p5'].map(k=>e[k]>0&&(<div key={k} style={{fontSize:'0.78rem',marginBottom:'4px'}}><span style={{color:'#64748b'}}>{PREGUNTAS_PAC[k].replace('¿','').replace('?','')}: </span><Stars n={e[k]}/></div>))}
              </div>))}
            </div>)}

            {tab==='enc_profesionales'&&(<div>
              <div style={{background:'#1a535c',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Encuestas profesionales</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{encPro.length}</p></div>
              </div>
              {['p1','p2','p3','p5'].map(k=>(<div key={k} style={{background:'white',borderRadius:'16px',padding:'16px',border:'1px solid #f1f5f9',marginBottom:'10px'}}>
                <p style={{margin:'0 0 8px',fontSize:'0.82rem',fontWeight:700,color:'#64748b'}}>{PREGUNTAS_PRO[k]}</p>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}><span style={{fontSize:'1.8rem',fontWeight:800,color:'#1a535c'}}>{promedioKey(encPro,k)||'--'}</span><span style={{color:'#f59e0b',fontSize:'1.2rem'}}>★</span></div>
              </div>))}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <h3 style={{margin:0,fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase'}}>Respuestas individuales</h3>
                <button onClick={()=>setVerDetallePro(v=>!v)} style={{fontSize:'0.78rem',fontWeight:700,color:'#1a535c',background:'#e6f2f3',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer'}}>{verDetallePro?'Ocultar':'Ver todas'}</button>
              </div>
              {verDetallePro&&encPro.map((e,i)=>(<div key={i} style={{background:'white',borderRadius:'14px',padding:'14px',border:'1px solid #f1f5f9',marginBottom:'8px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}><span style={{fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{e.nombre}</span><span style={{fontSize:'0.72rem',color:'#94a3b8'}}>{formatFecha(e.fecha)}</span></div>
                {['p1','p2','p3','p5'].map(k=>e[k]>0&&(<div key={k} style={{fontSize:'0.78rem',marginBottom:'4px'}}><span style={{color:'#64748b'}}>{PREGUNTAS_PRO[k].replace('¿','').replace('?','')}: </span><Stars n={e[k]}/></div>))}
              </div>))}
            </div>)}

            {tab==='resenas'&&(<div>
              <div style={{background:'#1a535c',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Total reseñas</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{resenas.length}</p></div>
                <div style={{textAlign:'right'}}><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Promedio</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{promResenas||'--'} ★</p></div>
              </div>
              {resenas.map((r,i)=>(<div key={i} style={{background:'white',borderRadius:'16px',padding:'14px 16px',border:'1px solid #f1f5f9',marginBottom:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}><span style={{fontWeight:800,fontSize:'0.9rem',color:'#0f172a'}}>{r.pacienteNombre}</span><span style={{fontSize:'0.75rem',color:'#94a3b8'}}>{formatFecha(r.fecha)}</span></div>
                <div style={{marginBottom:r.comentario?'8px':0}}><Stars n={r.estrellas}/></div>
                {r.comentario&&<p style={{margin:0,fontSize:'0.85rem',color:'#64748b',fontStyle:'italic'}}>"{r.comentario}"</p>}
              </div>))}
            </div>)}

            {tab==='cancelaciones'&&(<div>
              <div style={{background:'#b71c1c',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Cancelaciones profesionales</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{cancelaciones.length}</p></div>
                <div style={{textAlign:'right'}}><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Pacientes</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{cancelacionesPac.length}</p></div>
              </div>
              {cancelaciones.map((c,i)=>(<div key={i} style={{background:'white',borderRadius:'16px',padding:'14px 16px',border:'1px solid #fee2e2',marginBottom:'10px'}}>
                <p style={{margin:'0 0 4px',fontWeight:800,fontSize:'0.9rem',color:'#0f172a'}}>Prof: {c.enfermeroId?.slice(0,8)}...</p>
                <p style={{margin:0,fontSize:'0.82rem',color:'#64748b'}}>{c.motivo||'Sin motivo'} · {c.fecha?new Date(c.fecha).toLocaleDateString('es-AR'):''}</p>
              </div>))}
              <h3 style={{fontSize:'0.85rem',fontWeight:800,color:'#b71c1c',textTransform:'uppercase',margin:'16px 0 10px'}}>Por pacientes</h3>
              {cancelacionesPac.map((c,i)=>(<div key={i} style={{background:'white',borderRadius:'16px',padding:'14px 16px',border:'1px solid #fee2e2',marginBottom:'10px'}}>
                <p style={{margin:'0 0 4px',fontWeight:800,fontSize:'0.9rem',color:'#0f172a'}}>{c.pacienteNombre||'Paciente'}</p>
                <p style={{margin:0,fontSize:'0.82rem',color:'#64748b'}}>{c.motivo||'Sin motivo'} · {c.fecha?new Date(c.fecha).toLocaleDateString('es-AR'):''}</p>
              </div>))}
            </div>)}

            {tab==='penalizaciones'&&(<div>
              <div style={{background:'#0f172a',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Activas</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{penalizaciones.filter(p=>new Date(p.penalizadoHasta)>new Date()).length}</p></div>
                <div style={{textAlign:'right'}}><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Total</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{penalizaciones.length}</p></div>
              </div>
              {penalizaciones.map((p,i)=>{
                const activa=new Date(p.penalizadoHasta)>new Date()
                return <div key={i} style={{background:'white',borderRadius:'16px',padding:'14px 16px',border:`1px solid ${activa?'#fca5a5':'#f1f5f9'}`,marginBottom:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                    <span style={{fontWeight:800,fontSize:'0.9rem',color:'#0f172a'}}>Prof: {p.enfermeroId?.slice(0,8)}...</span>
                    <span style={{background:activa?'#fee2e2':'#f1f5f9',color:activa?'#b71c1c':'#94a3b8',padding:'3px 8px',borderRadius:'6px',fontSize:'0.72rem',fontWeight:800}}>{activa?'🔴 Activa':'✓ Vencida'}</span>
                  </div>
                  <p style={{margin:0,fontSize:'0.82rem',color:'#64748b'}}>Hasta: {p.penalizadoHasta?new Date(p.penalizadoHasta).toLocaleString('es-AR'):''}</p>
                </div>
              })}
            </div>)}
            {tab==='rechazos'&&(<div>
              <div style={{background:'#b45309',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Total rechazos</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{listaRechazos.length}</p></div>
              </div>
              {Object.keys(motivoCount).length>0&&(
                <div style={{background:'white',borderRadius:'16px',padding:'16px',border:'1px solid #f1f5f9',marginBottom:'20px'}}>
                  <h3 style={{margin:'0 0 12px',fontSize:'0.82rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase'}}>Motivos más frecuentes</h3>
                  <BarraDistribucion opciones={motivoCount} total={listaRechazos.length}/>
                </div>
              )}
              <h3 style={{fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase',margin:'0 0 12px'}}>Detalle de rechazos</h3>
              {listaRechazos.length===0&&<p style={{color:'#94a3b8',fontSize:'0.85rem'}}>Todavía no hay rechazos registrados.</p>}
              {listaRechazos.map((r,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',padding:'14px',border:'1px solid #f1f5f9',marginBottom:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                    <span style={{fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{r.enfermeroNombre}</span>
                    <span style={{fontSize:'0.72rem',color:'#94a3b8'}}>{r.fecha?new Date(r.fecha).toLocaleString('es-AR'):''}</span>
                  </div>
                  <p style={{margin:'0 0 4px',fontSize:'0.82rem',color:'#64748b'}}>Paciente: {r.pacienteNombre} {r.servicio?`· ${r.servicio}`:''}</p>
                  <span style={{display:'inline-block',background:'#fef3c7',color:'#b45309',padding:'4px 10px',borderRadius:'8px',fontSize:'0.78rem',fontWeight:700}}>{r.motivo}</span>
                </div>
              ))}
            </div>)}

            {tab==='emails'&&(<div>
              <div style={{background:'#1a535c',borderRadius:'20px',padding:'20px',marginBottom:'20px',color:'white',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Pacientes</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{emailsPacientes.length}</p></div>
                <div style={{textAlign:'right'}}><p style={{margin:'0 0 4px',fontSize:'0.72rem',opacity:0.7,textTransform:'uppercase'}}>Enfermeros</p><p style={{margin:0,fontSize:'2.2rem',fontWeight:800}}>{emailsEnfermeros.length}</p></div>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <h3 style={{margin:0,fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase'}}>Pacientes</h3>
                <button onClick={()=>copiarEmails(emailsPacientes)} style={{fontSize:'0.78rem',fontWeight:700,color:'#1a535c',background:'#e6f2f3',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer'}}>📋 Copiar mails</button>
              </div>
              {emailsPacientes.map((u,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',padding:'12px 14px',border:'1px solid #f1f5f9',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><p style={{margin:0,fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{u.nombre}</p><p style={{margin:0,fontSize:'0.78rem',color:'#64748b'}}>{u.email}</p></div>
                  <span style={{fontSize:'0.72rem',color:'#94a3b8',fontWeight:600,whiteSpace:'nowrap'}}>{u.fecha?formatFecha(u.fecha):''}</span>
                </div>
              ))}

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'20px 0 12px'}}>
                <h3 style={{margin:0,fontSize:'0.85rem',fontWeight:800,color:'#0f172a',textTransform:'uppercase'}}>Enfermeros</h3>
                <button onClick={()=>copiarEmails(emailsEnfermeros)} style={{fontSize:'0.78rem',fontWeight:700,color:'#1a535c',background:'#e6f2f3',border:'none',padding:'6px 12px',borderRadius:'8px',cursor:'pointer'}}>📋 Copiar mails</button>
              </div>
              {emailsEnfermeros.map((u,i)=>(
                <div key={i} style={{background:'white',borderRadius:'14px',padding:'12px 14px',border:'1px solid #f1f5f9',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><p style={{margin:0,fontWeight:800,fontSize:'0.88rem',color:'#0f172a'}}>{u.nombre}</p><p style={{margin:0,fontSize:'0.78rem',color:'#64748b'}}>{u.email}</p></div>
                  <span style={{fontSize:'0.72rem',color:'#94a3b8',fontWeight:600,whiteSpace:'nowrap'}}>{u.fecha?formatFecha(u.fecha):''}</span>
                </div>
              ))}
            </div>)}
          </>
        )}
      </div>
    </div>
  )
}
