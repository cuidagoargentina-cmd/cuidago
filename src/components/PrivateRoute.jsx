import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

/**
 * PrivateRoute - Protege rutas según autenticación y rol
 * 
 * @param {string} rolRequerido - 'paciente' o 'enfermero'
 * @param {ReactNode} children - Componente a renderizar si pasa la validación
 */
export default function PrivateRoute({ rolRequerido, children }) {
  const [verificando, setVerificando] = useState(true)
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(null)
  const [rolUsuario, setRolUsuario] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUsuarioAutenticado(false)
        setVerificando(false)
        return
      }

      setUsuarioAutenticado(true)

      try {
        // Verificar si es paciente
        const pacienteSnap = await getDoc(doc(db, 'pacientes', user.uid))
        if (pacienteSnap.exists()) {
          setRolUsuario('paciente')
          setVerificando(false)
          return
        }

        // Verificar si es enfermero
        const enfermeroSnap = await getDoc(doc(db, 'enfermeros', user.uid))
        if (enfermeroSnap.exists()) {
          setRolUsuario('enfermero')
          setVerificando(false)
          return
        }

        // Si llegó hasta acá, tiene cuenta pero no completó el registro
        setRolUsuario(null)
        setVerificando(false)
      } catch (error) {
        console.error('Error verificando rol:', error)
        setVerificando(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Mostrar loading mientras verifica
  if (verificando) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid var(--verde-logo)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: 'var(--gris-texto)', fontSize: '0.9rem' }}>
          Verificando sesión...
        </p>
      </div>
    )
  }

  // Si no está autenticado, redirigir a login
  if (!usuarioAutenticado) {
    return <Navigate to="/login" replace />
  }

  // Si no tiene rol (no completó registro), redirigir a elegir rol
  if (!rolUsuario) {
    return <Navigate to="/registro" replace />
  }

  // Si el rol no coincide, redirigir al dashboard correcto
  if (rolUsuario !== rolRequerido) {
    if (rolUsuario === 'paciente') {
      return <Navigate to="/paciente/explorar" replace />
    }
    if (rolUsuario === 'enfermero') {
      return <Navigate to="/profesional/dashboard" replace />
    }
  }

  // Todo OK: renderizar el componente
  return children
}
