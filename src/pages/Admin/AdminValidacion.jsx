import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'


function AvatarEnfermero({ enf, size = 52, fontSize = '1.1rem' }) {
  const foto = enf.foto || enf.fotoGoogle || enf.photoURL
  const iniciales = (enf.nombre || enf.primerNombre || '?')
    .split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
  const colores = ['#3c5e56','#4b6969','#2d6a5e','#1e4b3c','#5c7a72']
  const color = colores[(enf.nombre || '').length % colores.length]
  return (
    <div style={{ width: size+'px', height: size+'px', borderRadius: '50%', background: foto ? '#e6f2f3' : color, flexShrink: 0, overflow: 'hidden', border: '2px solid var(--verde-logo, #3c5e56)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {foto
        ? <img src={foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
        : null}
      <div style={{ display: foto ? 'none' : 'flex', width:'100%', height:'100%', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize }}>
        {iniciales}
      </div>
    </div>
  )
}

const ADMIN_USER = 'cuidagoargentina@gmail.com'
const ADMIN_PASS = 'florcha1992'

function formatFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function BadgeEstado({ estado }) {
  const cfg = {
    pendiente_verificacion: { bg: '#f1f5f9', color: '#475569',  label: '🕐 Sin verificar DNI' },
    pendiente_validacion:   { bg: '#fef3c7', color: '#92400e',  label: '⏳ Pendiente revisión' },
    activo:                 { bg: '#d1fae5', color: '#065f46',  label: '✅ Activo' },
    rechazado:              { bg: '#fee2e2', color: '#991b1b',  label: '❌ Rechazado' },
    suspendido:             { bg: '#fce7f3', color: '#9d174d',  label: '⛔ Suspendido' },
  }
  const c = cfg[estado] || { bg: '#f1f5f9', color: '#475569', label: estado || '—' }
  return (
    <span style={{ background: c.bg, color: c.color, padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700 }}>
      {c.label}
    </span>
  )
}

function BadgeDidit({ verificado }) {
  if (verificado) return (
    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
      🔍 Didit ✓
    </span>
  )
  return (
    <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
      🔍 Sin verificar
    </span>
  )
}

function LinkDoc({ url, label, emoji, colorBg, colorBorder, colorText }) {
  if (!url) return (
    <div style={{ background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', fontSize: '0.82rem', color: '#854d0e' }}>
      ⚠️ Sin {label}
    </div>
  )
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: colorBg, border: `1.5px solid ${colorBorder}`, borderRadius: '10px', padding: '10px 14px', textDecoration: 'none', marginBottom: '8px' }}>
      <span>{emoji}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colorText }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: colorText }}>↗</span>
    </a>
  )
}

export default function AdminValidacion() {
  const [logueado, setLogueado]         = useState(false)
  const [usuario, setUsuario]           = useState('')
  const [password, setPassword]         = useState('')
  const [errorLogin, setErrorLogin]     = useState(false)
  const [enfermeros, setEnfermeros]     = useState([])
  const [cargando, setCargando]         = useState(false)
  const [filtro, setFiltro]             = useState('pendiente_validacion')
  const [seleccionado, setSeleccionado] = useState(null)
  const [guardando, setGuardando]       = useState(false)
  const [busqueda, setBusqueda]         = useState('')

  function login() {
    if (usuario.trim() === ADMIN_USER && password === ADMIN_PASS) {
      setLogueado(true); setErrorLogin(false); cargarEnfermeros()
    } else { setErrorLogin(true) }
  }

  async function cargarEnfermeros() {
    setCargando(true)
    try {
      const snap = await getDocs(collection(db, 'enfermeros'))
      const lista = []
      snap.forEach(d => lista.push({ uid: d.id, ...d.data() }))
      lista.sort((a, b) => new Date(b.fechaDeRegistro) - new Date(a.fechaDeRegistro))
      setEnfermeros(lista)
    } catch (e) { console.error(e) }
    setCargando(false)
  }

  async function cambiarEstado(uid, nuevoEstado) {
    setGuardando(true)
    try {
      await updateDoc(doc(db, 'enfermeros', uid), {
        estado: nuevoEstado,
        fechaActualizacionEstado: new Date().toISOString()
      })
      setEnfermeros(prev => prev.map(e => e.uid === uid ? { ...e, estado: nuevoEstado } : e))
      if (seleccionado?.uid === uid) setSeleccionado(prev => ({ ...prev, estado: nuevoEstado }))
    } catch (e) { console.error(e); alert('Error al actualizar. Intentá de nuevo.') }
    setGuardando(false)
  }

  const enferMerosFiltrados = enfermeros
    .filter(e => filtro === 'todos' ? true : (e.estado || 'pendiente_verificacion') === filtro)
    .filter(e => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return (e.nombre || '').toLowerCase().includes(q) ||
             (e.email || '').toLowerCase().includes(q) ||
             (e.matricula || '').toLowerCase().includes(q)
    })

  const counts = {
    pendiente_verificacion: enfermeros.filter(e => (e.estado || 'pendiente_verificacion') === 'pendiente_verificacion').length,
    pendiente_validacion:   enfermeros.filter(e => e.estado === 'pendiente_validacion').length,
    activo:                 enfermeros.filter(e => e.estado === 'activo').length,
    rechazado:              enfermeros.filter(e => e.estado === 'rechazado').length,
    todos:                  enfermeros.length,
  }

  if (!logueado) return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '28px', padding: '40px 32px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: '#1a535c', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem' }}>🩺</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Validación de Enfermeros</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>CuidaGo · Acceso restringido</p>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Usuario</label>
          <input value={usuario} onChange={e => setUsuario(e.target.value)} type="email" placeholder="correo@email.com"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: `1.5px solid ${errorLogin ? '#fca5a5' : '#e2e8f0'}`, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Contraseña</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: `1.5px solid ${errorLogin ? '#fca5a5' : '#e2e8f0'}`, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          {errorLogin && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#b71c1c', fontWeight: 600 }}>Usuario o contraseña incorrectos.</p>}
        </div>
        <button onClick={login} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#1a535c', color: 'white', border: 'none', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 25px rgba(26,83,92,0.3)' }}>
          Ingresar
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", minHeight: '100vh', background: '#f8fafc' }}>

      {/* HEADER */}
      <div style={{ background: '#1a535c', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>🩺</span>
          <div>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>Validación de Enfermeros</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', marginLeft: '10px' }}>CuidaGo Admin</span>
          </div>
        </div>
        <button onClick={() => setLogueado(false)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
          Cerrar sesión
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { key: 'pendiente_verificacion', label: 'Sin verificar DNI', color: '#475569', bg: '#f1f5f9', icon: '🕐' },
            { key: 'pendiente_validacion',   label: 'Para revisar',      color: '#92400e', bg: '#fef3c7', icon: '⏳' },
            { key: 'activo',                 label: 'Activos',           color: '#065f46', bg: '#d1fae5', icon: '✅' },
            { key: 'rechazado',              label: 'Rechazados',        color: '#991b1b', bg: '#fee2e2', icon: '❌' },
            { key: 'todos',                  label: 'Total',             color: '#1e40af', bg: '#dbeafe', icon: '👥' },
          ].map(s => (
            <div key={s.key} onClick={() => setFiltro(s.key)}
              style={{ background: filtro === s.key ? s.bg : 'white', border: `2px solid ${filtro === s.key ? s.color : '#e2e8f0'}`, borderRadius: '16px', padding: '18px 16px', cursor: 'pointer', transition: '0.2s' }}>
              <p style={{ margin: '0 0 6px', fontSize: '1.2rem' }}>{s.icon}</p>
              <p style={{ margin: '0 0 2px', fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{counts[s.key]}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* BUSCADOR */}
        <div style={{ marginBottom: '16px' }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍  Buscar por nombre, email o matrícula..."
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.92rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '1rem' }}>Cargando enfermeros...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: seleccionado ? '1fr 440px' : '1fr', gap: '20px', alignItems: 'start' }}>

            {/* LISTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {enferMerosFiltrados.length === 0 && (
                <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No hay enfermeros en esta categoría.
                </div>
              )}
              {enferMerosFiltrados.map(enf => (
                <div key={enf.uid}
                  onClick={() => setSeleccionado(seleccionado?.uid === enf.uid ? null : enf)}
                  style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', border: `2px solid ${seleccionado?.uid === enf.uid ? '#1a535c' : '#f1f5f9'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: '0.2s' }}>

                  <AvatarEnfermero enf={enf} size={52} fontSize="1.1rem" />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{enf.nombre || '—'}</span>
                      <BadgeEstado estado={enf.estado || 'pendiente_verificacion'} />
                      <BadgeDidit verificado={enf.identidadVerificada} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>📧 {enf.email || '—'}</span>
                      <span>🪪 Mat: {enf.matricula || '—'}</span>
                      <span>📅 {formatFecha(enf.fechaDeRegistro)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {(enf.estado !== 'activo') && (
                      <button onClick={() => cambiarEstado(enf.uid, 'activo')} disabled={guardando}
                        style={{ background: '#d1fae5', color: '#065f46', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        ✅ Aprobar
                      </button>
                    )}
                    {(enf.estado !== 'rechazado') && (
                      <button onClick={() => cambiarEstado(enf.uid, 'rechazado')} disabled={guardando}
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        ❌ Rechazar
                      </button>
                    )}
                    {enf.estado === 'rechazado' && (
                      <button onClick={() => cambiarEstado(enf.uid, 'pendiente_validacion')} disabled={guardando}
                        style={{ background: '#fef3c7', color: '#92400e', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        ↩ Pendiente
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* DETALLE */}
            {seleccionado && (
              <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '2px solid #1a535c', position: 'sticky', top: '80px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Detalle del profesional</h3>
                  <button onClick={() => setSeleccionado(null)}
                    style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <AvatarEnfermero enf={seleccionado} size={90} fontSize="2rem" style={{margin:'0 auto 10px'}} />
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{seleccionado.nombre}</p>
                  <BadgeEstado estado={seleccionado.estado || 'pendiente_verificacion'} />
                </div>

                {[
                  { label: 'Email',        val: seleccionado.email },
                  { label: 'Teléfono',     val: seleccionado.telefono },
                  { label: 'DNI',          val: seleccionado.dni },
                  { label: 'Nacimiento',   val: formatFecha(seleccionado.nacimiento) },
                  { label: 'Matrícula',    val: seleccionado.matricula },
                  { label: 'Especialidad', val: seleccionado.especialidadDestacada },
                  { label: 'Localidad',    val: seleccionado.localidad },
                  { label: 'Experiencia',  val: seleccionado.experienciaAnios ? `${seleccionado.experienciaAnios} años` : null },
                  { label: 'Registro',     val: formatFecha(seleccionado.fechaDeRegistro) },
                ].map(({ label, val }) => val ? (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{val}</span>
                  </div>
                ) : null)}

                {/* Verificación Didit */}
                <div style={{ background: seleccionado.identidadVerificada ? '#dbeafe' : '#f8fafc', borderRadius: '12px', padding: '12px 14px', margin: '14px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{seleccionado.identidadVerificada ? '🔍' : '⚠️'}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: seleccionado.identidadVerificada ? '#1e40af' : '#92400e' }}>
                      {seleccionado.identidadVerificada ? 'Identidad verificada por Didit' : 'Identidad no verificada'}
                    </p>
                    {seleccionado.fechaVerificacion && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>{formatFecha(seleccionado.fechaVerificacion)}</p>
                    )}
                  </div>
                </div>

                {/* Documentos */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Título Profesional</p>
                  <LinkDoc url={seleccionado.urlTituloFrente}   label="Título — Frente"  emoji="📄" colorBg="#f0fdf4" colorBorder="#86efac" colorText="#166534" />
                  <LinkDoc url={seleccionado.urlTituloDorso}    label="Título — Dorso"   emoji="📄" colorBg="#f0fdf4" colorBorder="#86efac" colorText="#166534" />

                  <p style={{ margin: '14px 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Constancia de Matrícula</p>
                  <LinkDoc url={seleccionado.urlMatriculaFoto}  label="Foto matrícula"   emoji="📋" colorBg="#eff6ff" colorBorder="#93c5fd" colorText="#1d4ed8" />
                  <LinkDoc url={seleccionado.urlMatriculaQR}    label="Código QR Mi Argentina" emoji="◼️" colorBg="#eff6ff" colorBorder="#93c5fd" colorText="#1d4ed8" />
                </div>

                {/* Botones de acción */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {seleccionado.estado !== 'activo' && (
                    <button onClick={() => cambiarEstado(seleccionado.uid, 'activo')} disabled={guardando}
                      style={{ flex: 1, background: '#1a535c', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {guardando ? '...' : '✅ Aprobar'}
                    </button>
                  )}
                  {seleccionado.estado !== 'rechazado' && (
                    <button onClick={() => cambiarEstado(seleccionado.uid, 'rechazado')} disabled={guardando}
                      style={{ flex: 1, background: '#fee2e2', color: '#991b1b', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {guardando ? '...' : '❌ Rechazar'}
                    </button>
                  )}
                  {seleccionado.estado === 'rechazado' && (
                    <button onClick={() => cambiarEstado(seleccionado.uid, 'pendiente_validacion')} disabled={guardando}
                      style={{ flex: 1, background: '#fef3c7', color: '#92400e', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ↩ Volver a pendiente
                    </button>
                  )}
                  {seleccionado.estado === 'activo' && (
                    <button onClick={() => cambiarEstado(seleccionado.uid, 'suspendido')} disabled={guardando}
                      style={{ flex: 1, background: '#fce7f3', color: '#9d174d', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ⛔ Suspender
                    </button>
                  )}
                </div>

                {seleccionado.biografia && (
                  <div style={{ marginTop: '14px', background: '#f8fafc', borderRadius: '10px', padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Biografía</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{seleccionado.biografia}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
