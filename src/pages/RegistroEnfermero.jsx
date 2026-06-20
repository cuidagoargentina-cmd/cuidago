import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '../firebase/config'

const CATEGORIAS = [
  { id: 'generales', icon: 'fa-bed-pulse', titulo: 'Cuidados Generales y Adultos', items: ['Clínica Médica', 'Geriatría', 'Cuidados Paliativos', 'Rehabilitación y Fisiatría'] },
  { id: 'materno', icon: 'fa-baby', titulo: 'Materno-Infantil', items: ['Pediatría', 'Neonatología', 'Obstetricia', 'Lactancia Materna'] },
  { id: 'criticos', icon: 'fa-heart-pulse', titulo: 'Cuidados Críticos y Emergencias', items: ['Terapia Intensiva (UTI)', 'Emergentología', 'Unidad Coronaria'] },
  { id: 'tecnicas', icon: 'fa-syringe', titulo: 'Especialidades Técnicas', items: ['Oncología', 'Nefrología y Diálisis', 'Quirófano / Instrumentación', 'Salud Mental'] },
  { id: 'primaria', icon: 'fa-stethoscope', titulo: 'Atención Primaria y Otros', items: ['Enfermería Comunitaria', 'Gestión y Auditoría', 'Docencia e Investigación'] }
]

const MAX_FILE_SIZE = 5 * 1024 * 1024

function subirConProgreso(file, path, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => reject(err),
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    )
  })
}

export default function RegistroEnfermero() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '', dni: '', nacimiento: '', email: '', telefono: '', fotoGoogle: '',
    provincia: '', localidad: '', calle: '', numero: '', piso: '', codigoPostal: '',
    matricula: '', experiencia: '', bio: '', pass: '', confPass: ''
  })
  const [acordeonActivo, setAcordeonActivo]        = useState(null)
  const [especialidades, setEspecialidades]        = useState([])
  const [especialidadDestacada, setEspecDestacada] = useState('')
  const [mostrarPass, setMostrarPass]              = useState(false)
  const [mostrarConfPass, setMostrarConfPass]      = useState(false)
  const [esGoogle, setEsGoogle]                    = useState(false)
  const [cargando, setCargando]                    = useState(false)
  const [errorMsg, setErrorMsg]                    = useState('')
  const [dniDuplicado, setDniDuplicado]            = useState(false)
  const [verificandoDni, setVerificandoDni]        = useState(false)

  const [archivos, setArchivos] = useState({
    tituloFrente:   { file: null, progreso: 0, url: null },
    tituloDorso:    { file: null, progreso: 0, url: null },
    matriculaFoto:  { file: null, progreso: 0, url: null },
    matriculaQR:    { file: null, progreso: 0, url: null },
  })

  useEffect(() => {
    const nG = sessionStorage.getItem('googleNombre')
    const mG = sessionStorage.getItem('googleEmail')
    if (nG || mG) {
      const pG = sessionStorage.getItem('googlePhoto')
      setEsGoogle(true)
      setForm(f => ({ ...f, nombre: nG || f.nombre, email: mG || f.email, fotoGoogle: pG || '' }))
    }
  }, [])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  function setArchivo(key, file) {
    if (!file) return
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!tiposPermitidos.includes(file.type)) { alert('Formato no permitido. Usá JPG, PNG, WebP o PDF.'); return }
    if (file.size > MAX_FILE_SIZE) { alert('El archivo supera los 5 MB.'); return }
    setArchivos(prev => ({ ...prev, [key]: { file, progreso: 0, url: null } }))
  }

  function toggleAcordeon(id) { setAcordeonActivo(prev => prev === id ? null : id) }

  function toggleEspecialidad(val) {
    setEspecialidades(prev => {
      if (prev.includes(val)) {
        if (especialidadDestacada === val) setEspecDestacada('')
        return prev.filter(e => e !== val)
      }
      if (prev.length >= 3) { alert('Máximo 3 especialidades.'); return prev }
      return [...prev, val]
    })
  }

  async function dniYaRegistrado(dni) {
    const q = query(collection(db, 'enfermeros'), where('dni', '==', dni))
    const snap = await getDocs(q)
    return !snap.empty
  }

  async function handleSubmitForm(e) {
    e.preventDefault()
    setErrorMsg('')

    if (especialidades.length === 0) return setErrorMsg('Seleccioná al menos un área de especialidad.')
    if (!especialidadDestacada) return setErrorMsg('Seleccioná tu Especialidad Destacada.')
    if (!esGoogle && form.pass !== form.confPass) return setErrorMsg('Las contraseñas no coinciden.')
    if (!archivos.tituloFrente.file || !archivos.tituloDorso.file) return setErrorMsg('Subí frente y dorso del título profesional.')
    if (!archivos.matriculaFoto.file || !archivos.matriculaQR.file) return setErrorMsg('Subí la foto de la matrícula y el código QR de Mi Argentina.')

    setVerificandoDni(true)
    try {
      const yaExiste = await dniYaRegistrado(form.dni.trim())
      if (yaExiste) {
        setVerificandoDni(false)
        setDniDuplicado(true)
        return
      }
    } catch (e) {
      console.error('Error verificando DNI:', e)
    }
    setVerificandoDni(false)

    setCargando(true)
    try {
      // 1. Crear cuenta Firebase
      let user = auth.currentUser
      if (!esGoogle) {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.pass)
        user = cred.user
        await sendEmailVerification(user, { url: 'https://cuida-go.web.app/verificacion', handleCodeInApp: false })
      }
      if (!user) throw new Error('Sin sesión de usuario')
      const uid = user.uid

      // 2. Subir archivos con progreso visible
      const setProgreso = (key, pct) =>
        setArchivos(prev => ({ ...prev, [key]: { ...prev[key], progreso: pct } }))

      const [urlTituloFrente, urlTituloDorso, urlMatriculaFoto, urlMatriculaQR] = await Promise.all([
        subirConProgreso(archivos.tituloFrente.file,  `enfermeros/${uid}/titulo_frente`,   p => setProgreso('tituloFrente', p)),
        subirConProgreso(archivos.tituloDorso.file,   `enfermeros/${uid}/titulo_dorso`,    p => setProgreso('tituloDorso', p)),
        subirConProgreso(archivos.matriculaFoto.file, `enfermeros/${uid}/matricula_foto`,  p => setProgreso('matriculaFoto', p)),
        subirConProgreso(archivos.matriculaQR.file,   `enfermeros/${uid}/matricula_qr`,    p => setProgreso('matriculaQR', p)),
      ])

      // 3. Guardar en Firestore
      await setDoc(doc(db, 'enfermeros', uid), {
        nombre: form.nombre, primerNombre: form.nombre.split(' ')[0],
        foto: form.fotoGoogle || null,
        dni: form.dni, nacimiento: form.nacimiento, email: form.email, telefono: form.telefono,
        pais: 'Argentina', provincia: form.provincia, localidad: form.localidad,
        direccion: { calle: form.calle, numero: form.numero, piso: form.piso || null, codigoPostal: form.codigoPostal, localidad: form.localidad, provincia: form.provincia },
        matricula: form.matricula, experienciaAnios: form.experiencia,
        especialidades, especialidadDestacada, biografia: form.bio, perfil: 'enfermero',
        urlTituloFrente, urlTituloDorso, urlMatriculaFoto, urlMatriculaQR,
        documentosSubidos: true, identidadVerificada: false,
        estado: 'pendiente_verificacion', fechaDeRegistro: new Date().toISOString()
      })

      // 4. Crear sesión Didit
      const response = await fetch('https://us-central1-cuida-go.cloudfunctions.net/crearSesionDidit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencia: form.email })
      })
      if (!response.ok) throw new Error('No se pudo crear la sesión de verificación')
      const data = await response.json()
      if (!data.url) throw new Error('URL de verificación no disponible')

      sessionStorage.removeItem('googleNombre')
      sessionStorage.removeItem('googleEmail')
      window.location.href = data.url

    } catch (error) {
      console.error(error)
      setErrorMsg(error.code === 'auth/email-already-in-use'
        ? 'Este correo ya está registrado. Probá iniciar sesión.'
        : 'Error: ' + error.message)
      setCargando(false)
    }
  }

  // ── Componente caja de archivo con barra de progreso ──
  function FileUpload({ keyName, label, textoVacio, icono = 'fa-image', requerido = true }) {
    const { file, progreso } = archivos[keyName]
    const subiendo = cargando && file && progreso < 100
    const listo = cargando && progreso === 100

    return (
      <div className="input-group">
        <label className="text-label">
          {label} {requerido && <span style={{ color: 'var(--rojo-logo)' }}>*</span>}
        </label>
        <label className="file-upload-wrapper" style={{ position: 'relative', overflow: 'hidden', cursor: cargando ? 'default' : 'pointer' }}>
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp, application/pdf"
            onChange={e => setArchivo(keyName, e.target.files[0])}
            disabled={cargando}
          />
          <i className={`fa-solid ${listo ? 'fa-circle-check' : icono}`} style={{ color: listo ? 'var(--verde-logo)' : file ? 'var(--verde-logo)' : '' }}></i>
          <span className="file-upload-text" style={{ color: file ? 'var(--verde-logo)' : '' }}>
            {listo ? '¡Subido!' : subiendo ? `Subiendo... ${progreso}%` : file ? '¡Archivo cargado!' : textoVacio}
          </span>
          <span className="file-upload-subtext">
            {file ? file.name : 'JPG, PNG, WebP o PDF — máx. 5 MB'}
          </span>
          {/* Barra de progreso */}
          {subiendo && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, height: '4px',
              width: `${progreso}%`, background: 'var(--verde-logo)',
              transition: 'width 0.3s ease', borderRadius: '0 0 12px 12px'
            }} />
          )}
          {listo && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, height: '4px',
              width: '100%', background: 'var(--verde-logo)',
              borderRadius: '0 0 12px 12px'
            }} />
          )}
        </label>
      </div>
    )
  }

  return (
    <div className="registro-card">
      <div className="encabezado-registro">
        <i className="fa-solid fa-user-nurse"></i>
        <h2>Registro de Profesional</h2>
        <p>Completá tu perfil. Al final verificaremos tu identidad con DNI y selfie.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
        {[1,2,3].map((n, i) => (
          <>
            <div key={n} style={{ width: '32px', height: '32px', borderRadius: '50%', background: n === 1 ? 'var(--verde-logo)' : '#e0e0e0', color: n === 1 ? '#fff' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{n}</div>
            {i < 2 && <div style={{ width: '60px', height: '3px', background: '#e0e0e0', borderRadius: '2px' }}></div>}
          </>
        ))}
      </div>

      <form onSubmit={handleSubmitForm}>
        <div className="form-grid">

          <h3 className="section-title"><i className="fa-solid fa-id-card"></i> 1. Datos Personales</h3>
          <div className="input-group full-width">
            <label className="text-label">Nombre y Apellido Completo</label>
            <input type="text" name="nombre" placeholder="Ej: María García" value={form.nombre} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">DNI</label>
            <input type="text" name="dni" placeholder="Sin puntos" value={form.dni} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">Fecha de Nacimiento</label>
            <input type="date" name="nacimiento" value={form.nacimiento} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">Email</label>
            <input type="email" name="email" placeholder="tucorreo@ejemplo.com" value={form.email} onChange={handle} required disabled={esGoogle} />
          </div>
          <div className="input-group">
            <label className="text-label">Teléfono / WhatsApp</label>
            <input type="tel" name="telefono" placeholder="Ej: 1165432100" value={form.telefono} onChange={handle} required />
          </div>

          <h3 className="section-title"><i className="fa-solid fa-location-dot"></i> 2. Ubicación</h3>
          <div className="input-group">
            <label className="text-label">Provincia</label>
            <input type="text" name="provincia" placeholder="Ej: Buenos Aires" value={form.provincia} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">Localidad</label>
            <input type="text" name="localidad" placeholder="Ej: CABA" value={form.localidad} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">Calle</label>
            <input type="text" name="calle" placeholder="Ej: Av. Corrientes" value={form.calle} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">Número</label>
            <input type="text" name="numero" placeholder="Ej: 1234" value={form.numero} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">Piso / Depto <span style={{ color: '#666', fontSize: '0.8rem' }}>(opcional)</span></label>
            <input type="text" name="piso" placeholder="Ej: 3B" value={form.piso} onChange={handle} />
          </div>
          <div className="input-group">
            <label className="text-label">Código Postal</label>
            <input type="text" name="codigoPostal" placeholder="Ej: 1043" value={form.codigoPostal} onChange={handle} required />
          </div>

          <h3 className="section-title"><i className="fa-solid fa-user-doctor"></i> 3. Perfil Profesional</h3>
          <div className="input-group">
            <label className="text-label">Número de Matrícula</label>
            <input type="text" name="matricula" placeholder="Ej: MN 12345" value={form.matricula} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="text-label">Años de Experiencia</label>
            <input type="number" name="experiencia" min="0" placeholder="Ej: 5" value={form.experiencia} onChange={handle} required />
          </div>

          <div className="input-group full-width especialidades-container">
            <label className="text-label" style={{ fontSize: '1rem' }}>Áreas de Especialidad (Elegí hasta 3)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', margin: '0 0 10px 0' }}>Desplegá las categorías para elegir tus áreas.</p>
            <div className="seleccionadas-area">
              {especialidades.map(esp => (
                <span key={esp} className="spec-tag selected">{esp} <i className="fa-solid fa-check" style={{ marginLeft: '5px', fontSize: '0.7rem' }}></i></span>
              ))}
            </div>
            {CATEGORIAS.map(cat => (
              <div key={cat.id} className={`accordion-item ${acordeonActivo === cat.id ? 'active' : ''}`}>
                <div className="accordion-header" onClick={() => toggleAcordeon(cat.id)}>
                  <h4><i className={`fa-solid ${cat.icon}`}></i> {cat.titulo}</h4>
                  <i className="fa-solid fa-chevron-down"></i>
                </div>
                {acordeonActivo === cat.id && (
                  <div className="accordion-content">
                    <div className="especialidades-grid">
                      {cat.items.map(item => (
                        <div key={item} className={`spec-tag ${especialidades.includes(item) ? 'selected' : ''}`} onClick={() => toggleEspecialidad(item)}>{item}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {especialidades.length > 0 && (
            <div className="input-group full-width caja-destacada">
              <label className="text-label" style={{ color: '#166534' }}><i className="fa-solid fa-star"></i> Especialidad Destacada</label>
              <p style={{ fontSize: '0.75rem', color: '#166534', margin: '-3px 0 10px 0' }}>¿Cuál es tu punto más fuerte? Será la etiqueta principal en tu perfil.</p>
              <select value={especialidadDestacada} onChange={e => setEspecDestacada(e.target.value)} required>
                <option value="">Seleccioná tu especialidad principal...</option>
                {especialidades.map(esp => <option key={esp} value={esp}>{esp}</option>)}
              </select>
            </div>
          )}

          <div className="input-group full-width">
            <label className="text-label">Breve Biografía Profesional</label>
            <textarea name="bio" placeholder="Ej: Profesional con amplia trayectoria en geriatría y atención domiciliaria." value={form.bio} onChange={handle} required maxLength={250} />
            <span className="info-text"><i className="fa-solid fa-circle-info"></i> Visible para los pacientes. (Máximo 250 caracteres)</span>
          </div>

          <h3 className="section-title"><i className="fa-solid fa-file-medical"></i> 4. Documentación</h3>

          <div className="input-group full-width" style={{ background: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <i className="fa-solid fa-circle-info" style={{ color: '#2563eb', marginTop: '2px' }}></i>
            <div>
              <strong style={{ color: '#1d4ed8', fontSize: '0.9rem' }}>La verificación del DNI es automática</strong>
              <p style={{ color: '#1d4ed8', fontSize: '0.82rem', margin: '4px 0 0' }}>En el siguiente paso escaneás tu DNI y tomás una selfie con reconocimiento facial.</p>
            </div>
          </div>

          <div className="input-group full-width">
            <label className="text-label" style={{ fontSize: '1rem', marginBottom: '4px' }}>
              <i className="fa-solid fa-user-graduate" style={{ marginRight: '6px' }}></i>
              Título Profesional <span style={{ color: 'var(--rojo-logo)' }}>*</span>
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', margin: '0 0 10px 0' }}>Subí foto o escaneo del frente y dorso.</p>
          </div>
          <FileUpload keyName="tituloFrente" label="Frente" textoVacio="Subir frente" />
          <FileUpload keyName="tituloDorso" label="Dorso" textoVacio="Subir dorso" />

          <div className="input-group full-width">
            <label className="text-label" style={{ fontSize: '1rem', marginBottom: '4px' }}>
              <i className="fa-solid fa-file-medical" style={{ marginRight: '6px' }}></i>
              Constancia de Matrícula <span style={{ color: 'var(--rojo-logo)' }}>*</span>
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', margin: '0 0 10px 0' }}>Subí una foto de tu constancia y el código QR de Mi Argentina.</p>
          </div>
          <FileUpload keyName="matriculaFoto" label="Foto de la matrícula" textoVacio="Subir foto matrícula" />
          <FileUpload keyName="matriculaQR" label="Código QR de Mi Argentina" textoVacio="Subir código QR" icono="fa-qrcode" />

          {!esGoogle && (
            <>
              <h3 className="section-title"><i className="fa-solid fa-lock"></i> 5. Seguridad de la cuenta</h3>
              <div className="input-group pass-group">
                <label className="text-label">Creá tu Contraseña</label>
                <div className="password-wrapper">
                  <input type={mostrarPass ? 'text' : 'password'} name="pass" placeholder="Mínimo 8 caracteres" value={form.pass} onChange={handle} required />
                  <i className={`fa-regular ${mostrarPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`} onClick={() => setMostrarPass(!mostrarPass)}></i>
                </div>
              </div>
              <div className="input-group pass-group">
                <label className="text-label">Confirmá tu Contraseña</label>
                <div className="password-wrapper">
                  <input type={mostrarConfPass ? 'text' : 'password'} name="confPass" placeholder="Repetí tu contraseña" value={form.confPass} onChange={handle} required />
                  <i className={`fa-regular ${mostrarConfPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`} onClick={() => setMostrarConfPass(!mostrarConfPass)}></i>
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <p className="full-width" style={{ color: 'var(--rojo-logo)', textAlign: 'center', fontSize: '0.9rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
            </p>
          )}

          <button type="submit" className="btn-registrar full-width" disabled={cargando || verificandoDni}>
            {verificandoDni ? 'Verificando datos...' : cargando ? 'Subiendo documentos...' : 'Continuar a verificación de identidad →'}
          </button>

        </div>
      </form>

      <div className="links-extra">
        <a onClick={() => navigate('/registro')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-arrow-left"></i> Volver a elegir perfil
        </a>
      </div>

      {dniDuplicado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '380px', borderRadius: '24px', padding: '30px 25px', textAlign: 'center' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '3rem', color: 'var(--rojo-logo)', marginBottom: '16px', display: 'block' }}></i>
            <h3 style={{ marginBottom: '10px', color: '#0f172a' }}>Este DNI ya está registrado</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Ya existe una cuenta de Cuida Go asociada a este documento. No es posible crear una segunda cuenta con el mismo DNI.
              Si olvidaste tu contraseña o tenés un problema con tu cuenta, contactanos a <strong>soporte@cuida-go.com</strong>.
            </p>
            <button onClick={() => navigate('/login')}
              style={{ width: '100%', padding: '15px', borderRadius: '14px', background: 'var(--verde-logo)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', marginBottom: '10px' }}>
              Ir a Iniciar Sesión
            </button>
            <button onClick={() => setDniDuplicado(false)}
              style={{ width: '100%', padding: '15px', borderRadius: '14px', background: '#f1f5f9', color: '#334155', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
              Revisar mis datos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
