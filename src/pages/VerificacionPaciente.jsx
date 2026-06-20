import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'

export default function VerificacionPaciente() {
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/bienvenida-paciente', { replace: true })
      } else {
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
