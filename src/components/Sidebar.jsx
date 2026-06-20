import { Link } from 'react-router-dom'

const skeletonStyle = {
  background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: '8px',
}

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, userData, cerrarSesion }) {
  const closeMenu = () => setIsSidebarOpen(false)
  const cargando = !userData

  const primerNombre = userData?.primerNombre || userData?.nombre?.split(' ')[0] || ''
  const fotoFallback = primerNombre
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(primerNombre)}&background=e6f2f3&color=1a535c&bold=true`
    : `https://ui-avatars.com/api/?name=U&background=e6f2f3&color=1a535c&bold=true`
  const foto = userData?.foto || fotoFallback

  async function compartirApp() {
    const datos = {
      title: 'Cuida Go',
      text: 'Te recomiendo Cuida Go: pedís enfermería a domicilio en minutos. ¡Probala!',
      url: 'https://cuida-go.web.app'
    }
    try {
      if (navigator.share) {
        await navigator.share(datos)
      } else {
        await navigator.clipboard.writeText(`${datos.text} ${datos.url}`)
        alert('Copiamos el link de Cuida Go. ¡Pegalo donde quieras compartirlo!')
      }
    } catch (e) {
      // El usuario canceló el share, no hacemos nada
    }
  }

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div onClick={closeMenu} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', zIndex: 1999, display: isSidebarOpen ? 'block' : 'none', backdropFilter: 'blur(2px)' }}></div>

      <nav style={{ position: 'fixed', top: 0, right: isSidebarOpen ? '0' : '-100%', width: '300px', height: '100%', background: 'var(--blanco)', zIndex: 2000, transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', padding: '30px 25px', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>

          {cargando ? (
            <div style={{ ...skeletonStyle, width: '55px', height: '55px', borderRadius: '16px', flexShrink: 0 }}></div>
          ) : (
            <img src={foto} onError={e => { e.target.src = fotoFallback }} alt="Perfil"
              style={{ width: '55px', height: '55px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flexShrink: 0 }} />
          )}

          <div>
            {cargando ? (
              <>
                <div style={{ ...skeletonStyle, width: '120px', height: '14px', marginBottom: '7px' }}></div>
                <div style={{ ...skeletonStyle, width: '80px', height: '11px' }}></div>
              </>
            ) : (
              <>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--texto)' }}>{userData?.nombre || ''}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--verde-logo)', fontWeight: 700 }}>
                  <i className="fa-solid fa-user"></i> Miembro CuidaGo
                </p>
              </>
            )}
          </div>

          <button onClick={closeMenu} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'transparent', border: 'none', fontSize: '1.2rem', color: '#cbd5e1', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Link to="/paciente/perfil" onClick={closeMenu} style={linkStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-solid fa-circle-user" style={{ color: 'var(--verde-logo)', width: '20px', textAlign: 'center' }}></i> Mi Perfil</span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#ccc' }}></i>
          </Link>
          <Link to="/paciente/ficha-medica" onClick={closeMenu} style={linkStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-solid fa-notes-medical" style={{ color: 'var(--verde-logo)', width: '20px', textAlign: 'center' }}></i> Mi Ficha Médica</span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#ccc' }}></i>
          </Link>
          <Link to="/paciente/notificaciones" onClick={closeMenu} style={linkStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-solid fa-bell" style={{ color: 'var(--verde-logo)', width: '20px', textAlign: 'center' }}></i> Notificaciones</span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#ccc' }}></i>
          </Link>

          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gris-texto)', textTransform: 'uppercase', marginBottom: '5px', letterSpacing: '0.5px', marginTop: '25px' }}>Soporte y Ayuda</div>

          <Link to="/paciente/ayuda" onClick={closeMenu} style={linkStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-regular fa-circle-question" style={{ color: 'var(--verde-logo)', width: '20px', textAlign: 'center' }}></i> Centro de Ayuda</span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#ccc' }}></i>
          </Link>
          <Link to="/paciente/terminos" onClick={closeMenu} style={linkStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-solid fa-file-contract" style={{ color: 'var(--verde-logo)', width: '20px', textAlign: 'center' }}></i> Términos y condiciones</span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#ccc' }}></i>
          </Link>
          <div onClick={compartirApp} style={{ ...linkStyle, cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-solid fa-share-nodes" style={{ color: 'var(--verde-logo)', width: '20px', textAlign: 'center' }}></i> Compartir a un amigo</span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#ccc' }}></i>
          </div>

          <div onClick={cerrarSesion} style={{ ...linkStyle, marginTop: '30px', color: 'var(--rojo-logo)', borderBottom: 'none', cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><i className="fa-solid fa-arrow-right-from-bracket" style={{ width: '20px', textAlign: 'center' }}></i> Cerrar Sesión</span>
          </div>
        </div>
      </nav>
    </>
  )
}

const linkStyle = {
  padding: '14px 0', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', color: 'var(--texto)', textDecoration: 'none',
  fontWeight: 700, fontSize: '0.95rem'
}
