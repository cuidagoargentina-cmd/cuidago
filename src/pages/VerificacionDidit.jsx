import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

export default function VerificacionDidit() {
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login', { replace: true })
        return
      }
      try {
        // Detectar si es enfermero o paciente
        const snapEnf = await getDoc(doc(db, 'enfermeros', user.uid))
        if (snapEnf.exists()) {
          navigate('/bienvenida-profesional', { replace: true })
          return
        }
        const snapPac = await getDoc(doc(db, 'pacientes', user.uid))
        if (snapPac.exists()) {
          navigate('/bienvenida-paciente', { replace: true })
          return
        }
        // Si no encuentra ninguno, al login
        navigate('/login', { replace: true })
      } catch (err) {
        console.error('Error detectando perfil:', err)
        navigate('/login', { replace: true })
      }
    })
    return () => unsub()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
      <img src="/logo.png" alt="Cuida Go" style={{ height: '70px', objectFit: 'contain' }} />
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--verde-logo)' }}></i>
      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Cargando...</p>
    </div>
  )
}
