import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function PagoExitoso() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const solicitudId = searchParams.get('id')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!solicitudId) { navigate('/paciente/turnos'); return }

    async function confirmarPago() {
      try {
        const snap = await getDoc(doc(db, 'solicitudes', solicitudId))
        if (snap.exists() && snap.data().estado !== 'pagado') {
          await updateDoc(doc(db, 'solicitudes', solicitudId), {
            estado: 'pagado',
            fechaPago: new Date().toISOString()
          })
        }
        setListo(true)
        setTimeout(() => navigate(`/paciente/seguimiento?id=${solicitudId}`), 2500)
      } catch (e) {
        console.error(e)
        navigate('/paciente/turnos')
      }
    }

    confirmarPago()
  }, [solicitudId])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '40px' }}>
      <style>{`
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0 } 50% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
      `}</style>
      <div style={{ width: '90px', height: '90px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bounceIn 0.6s ease' }}>
        <i className="fa-solid fa-circle-check" style={{ fontSize: '3rem', color: '#16a34a' }}></i>
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0, textAlign: 'center' }}>¡Pago confirmado!</h1>
      <p style={{ fontSize: '0.95rem', color: '#64748b', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
        Tu pago fue procesado correctamente.<br />El profesional ya fue notificado y está en camino.
      </p>
      {!listo && <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--verde-logo)' }}></i>}
    </div>
  )
}
