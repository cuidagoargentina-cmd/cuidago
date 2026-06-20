import { useNavigate } from 'react-router-dom'

export default function Registro() {
  const navigate = useNavigate()

  return (
    <div className="contenedor-opciones">
      <h2>¿Cómo querés usar Cuida Go?</h2>

      <div className="tarjetas-roles">
        <div onClick={() => navigate('/registro/paciente/terminos')} className="tarjeta-rol">
          <i className="fa-solid fa-house-chimney-medical"></i>
          <h3>Soy Usuario</h3>
          <p>Busco profesionales de enfermería cerca de mi ubicación para atención a domicilio.</p>
        </div>

        <div onClick={() => navigate('/registro/enfermero/terminos')} className="tarjeta-rol">
          <i className="fa-solid fa-user-nurse"></i>
          <h3>Soy Enfermero/a</h3>
          <p>Quiero ofrecer mis servicios profesionales y recibir solicitudes de pacientes cercanos.</p>
        </div>
      </div>

      <a onClick={() => navigate('/login')} className="btn-volver" style={{ cursor: 'pointer' }}>
        <i className="fa-solid fa-arrow-left"></i> Volver al Inicio de Sesión
      </a>
    </div>
  )
}
