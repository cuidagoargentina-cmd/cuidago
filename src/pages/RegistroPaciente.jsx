import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

export default function RegistroPaciente() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '', dni: '', nacimiento: '', genero: '',
    email: '', telefono: '', fotoGoogle: '',
    emergenciaNombre: '', emergenciaVinculo: '', emergenciaTelefono: '',
    pais: 'Argentina', provincia: '', ciudad: '', cp: '',
    calle: '', numero: '', barrio: '', piso: '', depto: '',
    pass: '', confPass: ''
  })

  const [mostrarPass, setMostrarPass]         = useState(false)
  const [mostrarConfPass, setMostrarConfPass] = useState(false)
  const [esGoogle, setEsGoogle]               = useState(false)
  const [cargando, setCargando]               = useState(false)
  const [errorMsg, setErrorMsg]               = useState('')
  const [dniDuplicado, setDniDuplicado]       = useState(false)
  const [verificandoDni, setVerificandoDni]   = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('terminosPacienteAceptados') !== 'true') {
      navigate('/registro/paciente/terminos', { replace: true })
      return
    }
    const nombreGoogle = sessionStorage.getItem('googleNombre')
    const mailGoogle   = sessionStorage.getItem('googleEmail')
    const fotoGoogle   = sessionStorage.getItem('googlePhoto') || ''
    if (nombreGoogle || mailGoogle) {
      setEsGoogle(true)
      setForm(f => ({ ...f, nombre: nombreGoogle || f.nombre, email: mailGoogle || f.email, fotoGoogle }))
    }
  }, [])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  async function dniYaRegistrado(dni) {
    const q = query(collection(db, 'pacientes'), where('dni', '==', dni))
    const snap = await getDocs(q)
    return !snap.empty
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    if (!esGoogle && form.pass !== form.confPass) return setErrorMsg('Las contraseñas no coinciden.')

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
      // 1. Crear cuenta
      let user = auth.currentUser
      if (!esGoogle) {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.pass)
        user = cred.user
      }
      if (!user) throw new Error('Sin sesión de usuario')

      // 2. Guardar en Firestore
      let dirArmada = `${form.calle} ${form.numero}`
      if (form.piso)  dirArmada += `, Piso ${form.piso}`
      if (form.depto) dirArmada += `, Depto ${form.depto}`

      await setDoc(doc(db, 'pacientes', user.uid), {
        nombre:           form.nombre,
        primerNombre:     form.nombre.split(' ')[0],
        dni:              form.dni,
        nacimiento:       form.nacimiento,
        genero:           form.genero,
        email:            form.email,
        telefono:         form.telefono,
        foto:             form.fotoGoogle || null,
        contactosEmergencia: [{
          nombre:   form.emergenciaNombre,
          vinculo:  form.emergenciaVinculo,
          telefono: form.emergenciaTelefono
        }],
        contactoEmergencia: `${form.emergenciaNombre} - ${form.emergenciaTelefono}`,
        pais:              form.pais,
        provincia:         form.provincia,
        localidad:         form.ciudad,
        codigoPostal:      form.cp,
        calle:             form.calle,
        numero:            form.numero,
        barrio:            form.barrio,
        pisoRegistro:      form.piso,
        deptoRegistro:     form.depto,
        direccionRegistro: dirArmada,
        identidadVerificada: false,
        perfil:              'paciente',
        fechaDeRegistro:     new Date().toISOString()
      })

      // 3. Crear sesión Didit y redirigir
      const res = await fetch('https://us-central1-cuida-go.cloudfunctions.net/crearSesionDiditPaciente', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ referencia: form.email || form.telefono, uid: user.uid })
      })

      if (!res.ok) throw new Error('No se pudo crear la sesión de verificación')
      const data = await res.json()
      if (!data.url) throw new Error('URL de verificación no disponible')

      sessionStorage.removeItem('googleNombre')
      sessionStorage.removeItem('googleEmail')
      sessionStorage.removeItem('googlePhoto')
      sessionStorage.removeItem('terminosPacienteAceptados')

      window.location.href = data.url

    } catch (error) {
      console.error('Error al registrar:', error)
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('Este correo ya está registrado. Probá iniciar sesión.')
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('La contraseña es muy débil. Usá al menos 6 caracteres.')
      } else {
        setErrorMsg('Hubo un error al guardar los datos. Intentá nuevamente.')
      }
      setCargando(false)
    }
  }

  return (
    <div className="registro-card">
      <div className="encabezado-registro">
        <i className="fa-solid fa-house-chimney-medical"></i>
        <h2>Perfil del Paciente</h2>
        <p>Completá tus datos para recibir la mejor atención a domicilio</p>
      </div>

      {/* Indicador de pasos */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--verde-logo)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>1</div>
        <div style={{ width: '60px', height: '3px', background: '#e0e0e0', borderRadius: '2px' }}></div>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e0e0', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>2</div>
        <div style={{ width: '60px', height: '3px', background: '#e0e0e0', borderRadius: '2px' }}></div>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e0e0', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>3</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">

          <h3 className="section-title"><i className="fa-solid fa-id-card"></i> Datos Personales</h3>

          <div className="input-group full-width">
            <label className="text-label">Nombre y Apellido Completo</label>
            <input type="text" name="nombre" placeholder="Ej: Juan Pérez"
              value={form.nombre} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">DNI / Documento</label>
            <input type="text" name="dni" placeholder="Sin puntos"
              value={form.dni} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">Fecha de Nacimiento</label>
            <input type="date" name="nacimiento" value={form.nacimiento} onChange={handle} required />
          </div>

          <div className="input-group full-width">
            <label className="text-label">Género (Opcional)</label>
            <select name="genero" value={form.genero} onChange={handle}>
              <option value="">Seleccionar...</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro / Prefiero no decirlo</option>
            </select>
          </div>

          <h3 className="section-title"><i className="fa-solid fa-address-book"></i> Datos de Contacto</h3>

          <div className="input-group">
            <label className="text-label">Correo Electrónico</label>
            <input type="email" name="email" placeholder="nombre@ejemplo.com"
              value={form.email} onChange={handle}
              readOnly={esGoogle} style={esGoogle ? { backgroundColor: '#e9ecef' } : {}} required />
          </div>

          <div className="input-group">
            <label className="text-label">Teléfono Móvil</label>
            <input type="tel" name="telefono" placeholder="Ej: 1165432100"
              value={form.telefono} onChange={handle} required />
          </div>

          <h3 className="section-title"><i className="fa-solid fa-notes-medical"></i> Contacto de Emergencia</h3>

          <div className="input-group full-width">
            <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 5px 0' }}>
              Persona a contactar en caso de urgencia durante una visita.
            </p>
          </div>

          <div className="input-group">
            <label className="text-label">Nombre del Contacto</label>
            <input type="text" name="emergenciaNombre" placeholder="Ej: María Pérez"
              value={form.emergenciaNombre} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">Vínculo / Parentesco</label>
            <input type="text" name="emergenciaVinculo" placeholder="Ej: Madre, Pareja..."
              value={form.emergenciaVinculo} onChange={handle} required />
          </div>

          <div className="input-group full-width">
            <label className="text-label">Teléfono de Emergencia</label>
            <input type="tel" name="emergenciaTelefono" placeholder="Ej: 1165432100"
              value={form.emergenciaTelefono} onChange={handle} required />
          </div>

          <h3 className="section-title"><i className="fa-solid fa-location-dot"></i> Ubicación y Domicilio</h3>

          <div className="input-group">
            <label className="text-label">País</label>
            <select name="pais" value={form.pais} onChange={handle} required>
              <option value="Argentina">Argentina</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Chile">Chile</option>
            </select>
          </div>

          <div className="input-group">
            <label className="text-label">Provincia</label>
            <input type="text" name="provincia" placeholder="Ej: Buenos Aires"
              value={form.provincia} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">Ciudad / Localidad</label>
            <input type="text" name="ciudad" list="lista-ciudades" placeholder="Ej: CABA"
              value={form.ciudad} onChange={handle} autoComplete="off" required />
            <datalist id="lista-ciudades">
              {['CABA','Morón','Ituzaingó','Castelar','San Justo','Ramos Mejía','Haedo','La Plata','Córdoba','Rosario','Mendoza'].map(c =>
                <option key={c} value={c} />
              )}
            </datalist>
          </div>

          <div className="input-group">
            <label className="text-label">Código Postal</label>
            <input type="text" name="cp" placeholder="Ej: 1000"
              value={form.cp} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">Calle</label>
            <input type="text" name="calle" placeholder="Ej: Av. Rivadavia"
              value={form.calle} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">Número</label>
            <input type="number" name="numero" placeholder="Ej: 4500"
              value={form.numero} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">Barrio</label>
            <input type="text" name="barrio" placeholder="Ej: Palermo"
              value={form.barrio} onChange={handle} required />
          </div>

          <div className="input-group">
            <label className="text-label">Piso <span style={{ color: '#666', fontSize: '0.8rem' }}>(opcional)</span></label>
            <input type="text" name="piso" placeholder="Ej: 3" value={form.piso} onChange={handle} />
          </div>

          <div className="input-group">
            <label className="text-label">Departamento <span style={{ color: '#666', fontSize: '0.8rem' }}>(opcional)</span></label>
            <input type="text" name="depto" placeholder="Ej: B" value={form.depto} onChange={handle} />
          </div>

          {!esGoogle && (
            <>
              <h3 className="section-title"><i className="fa-solid fa-lock"></i> Seguridad de la cuenta</h3>

              <div className="input-group pass-group">
                <label className="text-label">Contraseña</label>
                <div className="password-wrapper">
                  <input type={mostrarPass ? 'text' : 'password'} name="pass"
                    placeholder="Mínimo 8 caracteres" value={form.pass} onChange={handle} required />
                  <i className={`fa-regular ${mostrarPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                    onClick={() => setMostrarPass(!mostrarPass)}></i>
                </div>
              </div>

              <div className="input-group pass-group">
                <label className="text-label">Confirmar Contraseña</label>
                <div className="password-wrapper">
                  <input type={mostrarConfPass ? 'text' : 'password'} name="confPass"
                    placeholder="Repetí tu contraseña" value={form.confPass} onChange={handle} required />
                  <i className={`fa-regular ${mostrarConfPass ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                    onClick={() => setMostrarConfPass(!mostrarConfPass)}></i>
                </div>
              </div>
            </>
          )}

          {/* Aviso verificación Didit */}
          <div className="full-width" style={{ background: '#f0fdf4', border: '1.5px solid var(--verde-logo)', borderRadius: '14px', padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--verde-logo)', fontSize: '1.3rem', marginTop: '2px' }}></i>
            <div>
              <strong style={{ color: 'var(--verde-logo)', fontSize: '0.9rem' }}>Verificación de identidad</strong>
              <p style={{ color: '#374151', fontSize: '0.82rem', margin: '4px 0 0', lineHeight: 1.5 }}>
                En el siguiente paso escanearás tu DNI y tomarás una selfie de forma rápida y segura. No necesitás subir ninguna foto acá.
              </p>
            </div>
          </div>

          {errorMsg && (
            <p className="full-width" style={{ color: 'var(--rojo-logo)', textAlign: 'center', fontSize: '0.9rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
            </p>
          )}

          <button type="submit" className="btn-registrar full-width" disabled={cargando || verificandoDni}>
            {verificandoDni ? 'Verificando datos...' : cargando ? 'Conectando con verificación...' : 'Continuar a verificación de identidad →'}
          </button>

        </div>
      </form>

      <div className="links-extra">
        <a onClick={() => navigate('/registro')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-arrow-left"></i> Volver
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
