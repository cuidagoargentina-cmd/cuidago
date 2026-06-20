import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

export default function Login() {
  const navigate = useNavigate()
  const [metodo, setMetodo] = useState(null)
  const [telefono, setTelefono] = useState('')
  const [codigoSMS, setCodigoSMS] = useState('')
  const [mostrarCodigoSMS, setMostrarCodigoSMS] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mensajeReset, setMensajeReset] = useState('')

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setVh()
    window.addEventListener('resize', setVh)
    window.addEventListener('orientationchange', setVh)
    return () => {
      window.removeEventListener('resize', setVh)
      window.removeEventListener('orientationchange', setVh)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const pacienteDoc = await getDoc(doc(db, 'pacientes', user.uid))
          if (pacienteDoc.exists()) { navigate('/paciente/explorar', { replace: true }); return }
          const enfermeroDoc = await getDoc(doc(db, 'enfermeros', user.uid))
          if (enfermeroDoc.exists()) { navigate('/profesional/dashboard', { replace: true }); return }
          navigate('/registro', { replace: true })
        } catch (error) {
          console.error('Error verificando perfil:', error)
        }
      }
      setVerificandoSesion(false)
    })
    return () => unsubscribe()
  }, [navigate])

  async function handleGoogleLogin() {
    setCargando(true)
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      sessionStorage.setItem('googleNombre', user.displayName || '')
      sessionStorage.setItem('googleEmail', user.email || '')
      sessionStorage.setItem('googlePhoto', user.photoURL || '')
      const pacienteDoc = await getDoc(doc(db, 'pacientes', user.uid))
      if (pacienteDoc.exists()) { navigate('/paciente/explorar', { replace: true }); return }
      const enfermeroDoc = await getDoc(doc(db, 'enfermeros', user.uid))
      if (enfermeroDoc.exists()) { navigate('/profesional/dashboard', { replace: true }); return }
      navigate('/registro', { replace: true })
    } catch (error) {
      console.error('Error en Google login:', error)
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Ventana cerrada. Intentá de nuevo.')
      } else if (error.code !== 'auth/cancelled-popup-request') {
        setError('Error al iniciar sesión con Google')
      }
    } finally {
      setCargando(false)
    }
  }

  async function handlePhoneLogin() {
    setCargando(true)
    setError('')
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {}
        })
      }
      const phoneNumber = `+54${telefono.replace(/\D/g, '')}`
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
      setConfirmationResult(confirmation)
      setMostrarCodigoSMS(true)
    } catch (error) {
      console.error('Error enviando SMS:', error)
      setError('Error al enviar el código. Verificá el número e intentá de nuevo.')
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
    } finally {
      setCargando(false)
    }
  }

  async function verificarCodigoSMS() {
    setCargando(true)
    setError('')
    try {
      const result = await confirmationResult.confirm(codigoSMS)
      const user = result.user
      sessionStorage.setItem('phoneNumber', user.phoneNumber || '')
      const pacienteDoc = await getDoc(doc(db, 'pacientes', user.uid))
      if (pacienteDoc.exists()) { navigate('/paciente/explorar', { replace: true }); return }
      const enfermeroDoc = await getDoc(doc(db, 'enfermeros', user.uid))
      if (enfermeroDoc.exists()) { navigate('/profesional/dashboard', { replace: true }); return }
      navigate('/registro', { replace: true })
    } catch (error) {
      console.error('Error verificando código:', error)
      setError('Código incorrecto. Intentá de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Error en email login:', error)
      setError('Email o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  async function handleRecuperarPassword() {
    if (!email) { setError('Ingresá tu email primero'); return }
    setCargando(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setMensajeReset('Te enviamos un email para recuperar tu contraseña.')
    } catch (error) {
      setError('No encontramos ese email. Verificá que sea correcto.')
    } finally {
      setCargando(false)
    }
  }

  const contenedorStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    overflowY: 'auto', background: '#f8fafc',
  }
  const innerStyle = {
    minHeight: '100%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '20px', boxSizing: 'border-box',
  }
  const cardStyle = {
    background: 'white', borderRadius: '20px', padding: '36px 28px 28px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
    borderBottom: '5px solid var(--verde-logo)', width: '100%', maxWidth: '400px', boxSizing: 'border-box',
  }
  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', color: '#0f172a',
    background: 'white', boxSizing: 'border-box', marginBottom: '12px', outline: 'none',
  }
  const btnPrincipalStyle = {
    width: '100%', padding: '15px 16px', border: 'none', borderRadius: '12px',
    background: 'var(--verde-logo)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '10px', fontSize: '15px', fontWeight: 700,
    color: 'white', cursor: 'pointer', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const btnSocialStyle = {
    width: '100%', padding: '13px 16px', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', marginBottom: '10px', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const btnVolverStyle = {
    width: '100%', padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '12px',
    background: 'white', fontSize: '14px', fontWeight: 700, color: '#64748b',
    cursor: 'pointer', marginTop: '8px', fontFamily: 'inherit',
  }

  if (verificandoSesion) {
    return (
      <div style={contenedorStyle}>
        <div style={innerStyle}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--verde-logo)' }}></i>
        </div>
      </div>
    )
  }

  return (
    <div style={contenedorStyle}>
      <div style={innerStyle}>
        <div style={cardStyle}>

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img src="/logo.png" alt="CuidaGo" style={{ height: '70px', width: 'auto', mixBlendMode: 'multiply' }} />
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--verde-logo)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Salud en tu hogar
            </p>
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
            Bienvenido
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b', fontWeight: 500, textAlign: 'center' }}>
            Ingresá para gestionar tus servicios.
          </p>

          {!metodo && (
            <>
              <button style={{ ...btnSocialStyle, color: '#0f172a' }} onClick={handleGoogleLogin} disabled={cargando}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                Continuar con Google
              </button>

              <button style={{ ...btnSocialStyle, color: 'var(--verde-logo)', marginBottom: '16px' }} onClick={() => setMetodo('telefono')}>
                <i className="fa-solid fa-phone"></i> Usar mi Teléfono
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>o</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              </div>

              <button style={btnPrincipalStyle} onClick={() => setMetodo('email')}>
                <i className="fa-solid fa-envelope"></i> Iniciar Sesión con Email
              </button>
            </>
          )}

          {metodo === 'telefono' && !mostrarCodigoSMS && (
            <>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', textAlign: 'center' }}>
                Ingresá tu número sin el 0 y sin el 15
              </p>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <span style={{ padding: '12px 14px', background: '#f8fafc', color: '#475569', fontSize: '14px', fontWeight: 700, borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>🇦🇷 +54</span>
                <input type="tel" style={{ ...inputStyle, marginBottom: 0, border: 'none', borderRadius: 0 }} placeholder="Ej: 1165432100" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <div id="recaptcha-container"></div>
              <button style={btnPrincipalStyle} onClick={handlePhoneLogin} disabled={cargando || !telefono}>
                {cargando ? 'Enviando...' : <><i className="fa-solid fa-paper-plane"></i> Enviar código SMS</>}
              </button>
              <button style={btnVolverStyle} onClick={() => setMetodo(null)}>Volver</button>
            </>
          )}

          {metodo === 'telefono' && mostrarCodigoSMS && (
            <>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px', textAlign: 'center' }}>
                Ingresá el código de 6 dígitos que enviamos a <strong>+54 {telefono}</strong>
              </p>
              <input type="text" inputMode="numeric" maxLength={6} style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', letterSpacing: '8px', fontWeight: 700 }} placeholder="------" value={codigoSMS} onChange={(e) => setCodigoSMS(e.target.value)} />
              <button style={btnPrincipalStyle} onClick={verificarCodigoSMS} disabled={cargando || codigoSMS.length < 6}>
                {cargando ? 'Verificando...' : <><i className="fa-solid fa-check"></i> Verificar código</>}
              </button>
              <button style={btnVolverStyle} onClick={() => { setMostrarCodigoSMS(false); setCodigoSMS('') }}>
                <i className="fa-solid fa-rotate-left" style={{ marginRight: '6px' }}></i> Cambiar número
              </button>
            </>
          )}

          {metodo === 'email' && (
            <form onSubmit={handleEmailLogin}>
              <input type="email" style={inputStyle} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  style={{ ...inputStyle, marginBottom: 0, paddingRight: '44px' }}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', padding: 0 }}>
                  <i className={`fa-solid ${mostrarPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <button type="submit" style={btnPrincipalStyle} disabled={cargando}>
                {cargando ? 'Ingresando...' : 'Entrar'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>¿Olvidaste tu contraseña? </span>
                <button type="button" onClick={handleRecuperarPassword} style={{ fontSize: '12px', color: 'var(--verde-logo)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Recuperar
                </button>
              </div>
              {mensajeReset && <p style={{ color: '#10b981', fontSize: '12px', textAlign: 'center', marginTop: '10px', fontWeight: 600 }}>{mensajeReset}</p>}
              <button type="button" style={btnVolverStyle} onClick={() => setMetodo(null)}>Volver</button>
            </form>
          )}

          {error && <p style={{ color: '#b71c1c', fontSize: '12px', textAlign: 'center', marginTop: '12px', fontWeight: 600 }}>{error}</p>}

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
            ¿No tenés cuenta?{' '}
            <button onClick={() => navigate('/registro')} style={{ color: '#b71c1c', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
              Registrate aquí
            </button>
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            {[
              { icon: 'fa-shield-halved', label: 'Seguro' },
              { icon: 'fa-certificate', label: 'Verificado' },
              { icon: 'fa-heart', label: 'Cuidado' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '36px', height: '36px', background: '#e6f2f3', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${icon}`} style={{ fontSize: '16px', color: 'var(--verde-logo)' }}></i>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
