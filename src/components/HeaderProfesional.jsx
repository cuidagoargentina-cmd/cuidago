import { useLocation, useNavigate } from 'react-router-dom';

const skeletonStyle = {
  background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: '8px',
}

export default function HeaderProfesional({ setIsSidebarOpen, userData, estaOnline, cargandoUsuario }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tieneDatosCache = userData?.nombre && userData.nombre !== 'Profesional';
  const cargando = cargandoUsuario && !tieneDatosCache;

  const titulosPantallas = {
    '/profesional/servicios': 'Mis Servicios',
    '/profesional/agenda': 'Mi Agenda',
    '/profesional/ingresos': 'Mis Ingresos',
    '/profesional/perfil': 'Mi Perfil',
    '/profesional/datos-personales': 'Datos Personales',
    '/profesional/servicios-ofrezco': 'Servicios que Ofrezco',
    '/profesional/notificaciones': 'Notificaciones',
    '/profesional/ayuda': 'Centro de Ayuda',
    '/profesional/terminos': 'Términos y Condiciones',
    '/profesional/resenas': 'Mis Reseñas'
  };

  const currentPath = location.pathname;
  const esDashboard = currentPath === '/profesional/dashboard';

  const handleAtras = () => {
    const pantallasPrincipales = ['/profesional/perfil','/profesional/servicios','/profesional/agenda','/profesional/ingresos'];
    if (pantallasPrincipales.includes(currentPath)) navigate('/profesional/dashboard');
    else navigate('/profesional/perfil');
  };

  const primerNombre = userData?.primerNombre || userData?.nombre?.split(' ')[0] || '';
  const fotoFallback = primerNombre
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(primerNombre)}&background=e6f2f3&color=1a535c&bold=true`
    : null;
  const foto = userData?.foto || fotoFallback;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <header style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--blanco)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {esDashboard ? (
            <img src="/logo.png" alt="CuidaGo" style={{ height: '44px' }} />
          ) : (
            <>
              <button onClick={handleAtras} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '12px', fontSize: '1.1rem', color: 'var(--texto)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--texto)' }}>{titulosPantallas[currentPath] || 'CuidaGo'}</h1>
            </>
          )}
        </div>

        <div onClick={() => setIsSidebarOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <div style={{ textAlign: 'right' }}>
            {cargando ? (
              <>
                <div style={{ ...skeletonStyle, width: '90px', height: '14px', marginBottom: '5px', marginLeft: 'auto' }}></div>
                <div style={{ ...skeletonStyle, width: '50px', height: '10px', marginLeft: 'auto' }}></div>
              </>
            ) : (
              <>
                <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--texto)' }}>¡Hola, {primerNombre}!</h1>
                <div style={{ fontSize: '0.7rem', color: estaOnline ? 'var(--verde-online)' : 'var(--rojo-logo)', fontWeight: 700 }}>
                  {estaOnline ? 'Online' : 'Offline'}
                </div>
              </>
            )}
          </div>

          {cargando ? (
            <div style={{ ...skeletonStyle, width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0 }}></div>
          ) : (
            <img
              src={foto}
              alt="Perfil"
              onError={e => { e.target.src = fotoFallback }}
              style={{ width: '44px', height: '44px', borderRadius: '14px', objectFit: 'cover', border: '2px solid var(--blanco)', boxShadow: 'var(--shadow-soft)', flexShrink: 0 }}
            />
          )}

          <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.8rem', color: 'var(--gris-texto)' }}></i>
        </div>
      </header>
    </>
  );
}
