import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, deleteUser, reauthenticateWithPopup, GoogleAuthProvider, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const skeletonStyle = {
  background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: '8px',
}

export default function PerfilPaciente({ userData }) {
  const navigate = useNavigate();
  const cargando = !userData;
  const [modalVisible, setModalVisible] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [pedirPassword, setPedirPassword] = useState(false);
  const [password, setPassword] = useState('');

  const primerNombre = userData?.primerNombre || userData?.nombre?.split(' ')[0] || '';
  const fotoFallback = primerNombre
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(primerNombre)}&background=e6f2f3&color=1a535c&bold=true&size=100`
    : `https://ui-avatars.com/api/?name=U&background=e6f2f3&color=1a535c&bold=true&size=100`;
  const foto = userData?.foto || fotoFallback;

  const eliminarCuentaDefinitivo = async (user) => {
    const db = getFirestore();
    await deleteDoc(doc(db, 'pacientes', user.uid));
    await deleteUser(user);
    navigate('/login');
  };

  const handleEliminarCuenta = async () => {
    setEliminando(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      await eliminarCuentaDefinitivo(user);
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      if (error.code === 'auth/requires-recent-login') {
        const auth = getAuth();
        const user = auth.currentUser;
        const proveedores = user.providerData.map(p => p.providerId);
        try {
          if (proveedores.includes('google.com')) {
            await reauthenticateWithPopup(user, new GoogleAuthProvider());
            await eliminarCuentaDefinitivo(user);
          } else if (proveedores.includes('password')) {
            setEliminando(false);
            setPedirPassword(true);
            return;
          } else {
            alert('Por favor cerrá sesión, volvé a iniciar sesión y luego eliminá tu cuenta.');
          }
        } catch (reAuthError) {
          console.error('Error al reautenticar:', reAuthError);
          alert('No se pudo verificar tu identidad. Intentá cerrar sesión e iniciar sesión nuevamente.');
        }
      } else {
        alert('No se pudo eliminar la cuenta. Si el problema persiste, contactá a soporte.');
      }
      setEliminando(false);
      setModalVisible(false);
    }
  };

  const handleEliminarConPassword = async () => {
    if (!password) return;
    setEliminando(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await eliminarCuentaDefinitivo(user);
    } catch (error) {
      console.error('Error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        alert('Contraseña incorrecta. Intentá de nuevo.');
      } else {
        alert('No se pudo eliminar la cuenta. Intentá de nuevo.');
      }
      setEliminando(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {modalVisible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px 24px', maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '60px', height: '60px', background: '#fef2f2', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.6rem', color: '#b71c1c' }}>
              <i className="fa-solid fa-trash"></i>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--texto)' }}>¿Eliminás tu cuenta?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: 'var(--gris-texto)', lineHeight: 1.5 }}>
              Esta acción es permanente. Se borrarán todos tus datos y no podrás recuperar tu cuenta.
            </p>

            {pedirPassword && (
              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', marginBottom: '8px' }}>Ingresá tu contraseña para confirmar:</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleEliminarConPassword}
                  disabled={eliminando || !password}
                  style={{ width: '100%', padding: '14px', background: '#b71c1c', color: 'white', border: 'none', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '10px', opacity: eliminando ? 0.7 : 1 }}>
                  {eliminando ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
              </div>
            )}

            {!pedirPassword && (
              <button
                onClick={handleEliminarCuenta}
                disabled={eliminando}
                style={{ width: '100%', padding: '14px', background: '#b71c1c', color: 'white', border: 'none', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, cursor: eliminando ? 'not-allowed' : 'pointer', marginBottom: '10px', opacity: eliminando ? 0.7 : 1 }}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar cuenta'}
              </button>
            )}

            <button
              onClick={() => { setModalVisible(false); setPedirPassword(false); setPassword(''); }}
              disabled={eliminando}
              style={{ width: '100%', padding: '14px', background: '#f1f5f9', color: 'var(--texto)', border: 'none', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        <div style={{ background: 'var(--blanco)', borderRadius: '24px', padding: '30px 20px', textAlign: 'center', boxShadow: 'var(--shadow-soft)', marginBottom: '25px' }}>
          <div style={{ width: '100px', height: '100px', margin: '0 auto 15px', position: 'relative' }}>
            {cargando ? (
              <div style={{ ...skeletonStyle, width: '100px', height: '100px', borderRadius: '30px' }}></div>
            ) : (
              <img src={foto} onError={e => { e.target.src = fotoFallback }} alt="Perfil"
                style={{ width: '100%', height: '100%', borderRadius: '30px', objectFit: 'cover', border: '3px solid var(--blanco)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
            )}
            <button onClick={() => alert('Próximamente: Cambiar foto de perfil')}
              style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '32px', height: '32px', background: 'var(--verde-logo)', color: 'white', borderRadius: '10px', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer' }}>
              <i className="fa-solid fa-camera"></i>
            </button>
          </div>

          {cargando ? (
            <>
              <div style={{ ...skeletonStyle, width: '160px', height: '22px', margin: '0 auto 10px' }}></div>
              <div style={{ ...skeletonStyle, width: '80px', height: '14px', margin: '0 auto 15px' }}></div>
            </>
          ) : (
            <>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--texto)' }}>{userData?.nombre || ''}</h2>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--gris-texto)', fontWeight: 500 }}>Paciente</p>
            </>
          )}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
            <i className="fa-solid fa-circle-check"></i> Paciente Verificado
          </div>
        </div>

        <div style={{ background: 'var(--blanco)', borderRadius: '20px', padding: '5px 15px', boxShadow: 'var(--shadow-soft)', marginBottom: '16px' }}>
          {[
            { ruta: '/paciente/datos-personales', icon: 'fa-regular fa-user', label: 'Datos Personales', borde: true },
            { ruta: '/paciente/direcciones', icon: 'fa-solid fa-location-dot', label: 'Direcciones guardadas', borde: true },
            { ruta: '/paciente/pagos', icon: 'fa-solid fa-credit-card', label: 'Medios de Pago', borde: true },
            { ruta: '/paciente/emergencia', icon: 'fa-solid fa-phone', label: 'Teléfonos de Emergencia', borde: false },
          ].map(({ ruta, icon, label, borde }) => (
            <div key={ruta} onClick={() => navigate(ruta)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 5px', borderBottom: borde ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--verde-logo)', fontSize: '1.1rem' }}>
                  <i className={icon}></i>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)' }}>{label}</span>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1' }}></i>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--blanco)', borderRadius: '20px', padding: '5px 15px', boxShadow: 'var(--shadow-soft)' }}>
          <div onClick={() => setModalVisible(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 5px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef2f2', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#b71c1c', fontSize: '1.1rem' }}>
                <i className="fa-solid fa-trash"></i>
              </div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b71c1c' }}>Eliminar cuenta</span>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1' }}></i>
          </div>
        </div>

      </div>
    </>
  );
}
