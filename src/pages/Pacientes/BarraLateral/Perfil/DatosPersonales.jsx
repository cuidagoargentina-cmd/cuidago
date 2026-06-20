import { useState, useEffect } from 'react';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

export default function DatosPersonales() {
  const [datos, setDatos] = useState({ nombre: '', dni: '', nacimiento: '', email: '', telefono: '' });
  const [originales, setOriginales] = useState({ email: '', telefono: '' });
  const [esGoogle, setEsGoogle] = useState(false);
  const [cargando, setCargando] = useState(true);
  
  const [modalSeguridad, setModalSeguridad] = useState(false);
  const [passVerif, setPassVerif] = useState('');
  const [estadoBoton, setEstadoBoton] = useState('GUARDAR CAMBIOS');

  useEffect(() => {
    const fetchDatos = async () => {
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;
      
      if (user) {
        const isG = user.providerData.some(p => p.providerId === 'google.com');
        setEsGoogle(isG);
        
        const docSnap = await getDoc(doc(db, "pacientes", user.uid));
        if (docSnap.exists()) {
          const d = docSnap.data();
          setDatos({ nombre: d.nombre || '', dni: d.dni || '', nacimiento: d.nacimiento || '', email: d.email || '', telefono: d.telefono || '' });
          setOriginales({ email: d.email || '', telefono: d.telefono || '' });
        }
      }
      setCargando(false);
    };
    fetchDatos();
  }, []);

  const handleChange = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

  const intentarGuardar = async (e) => {
    e.preventDefault();
    if (datos.email === originales.email && datos.telefono === originales.telefono) {
      alert("No detectamos cambios en tus datos.");
      return;
    }
    
    if (esGoogle) {
      setEstadoBoton('Guardando...');
      try {
        const auth = getAuth();
        const db = getFirestore();
        await updateDoc(doc(db, "pacientes", auth.currentUser.uid), { telefono: datos.telefono });
        setOriginales({ ...originales, telefono: datos.telefono });
        setEstadoBoton('¡Éxito!');
        setTimeout(() => setEstadoBoton('GUARDAR CAMBIOS'), 2000);
      } catch (error) {
        alert("Error al guardar.");
        setEstadoBoton('GUARDAR CAMBIOS');
      }
    } else {
      setModalSeguridad(true);
    }
  };

  const confirmarSeguridad = async () => {
    if (!passVerif) return alert("Ingresá la contraseña");
    setEstadoBoton('Verificando...');
    setModalSeguridad(false);
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, passVerif);
      
      await reauthenticateWithCredential(user, credential);
      
      if (datos.email !== originales.email) {
        await updateEmail(user, datos.email);
      }
      
      await updateDoc(doc(db, "pacientes", user.uid), { email: datos.email, telefono: datos.telefono });
      setOriginales({ email: datos.email, telefono: datos.telefono });
      setEstadoBoton('¡Éxito!');
      setTimeout(() => setEstadoBoton('GUARDAR CAMBIOS'), 2000);
      setPassVerif('');
    } catch (error) {
      console.error(error);
      alert("Contraseña incorrecta o error.");
      setEstadoBoton('GUARDAR CAMBIOS');
    }
  };

  if (cargando) return <div style={{textAlign:'center', padding:'40px'}}><i className="fa-solid fa-spinner fa-spin" style={{fontSize:'2rem', color:'var(--verde-logo)'}}></i></div>;

  return (
    <>
      {/* ACÁ ESTÁ EL PADDING DE 180px PARA EL SCROLL PERFECTO */}
      <div style={{ padding: '20px 20px 180px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'var(--blanco)', padding: '30px', borderRadius: '20px', boxShadow: 'var(--shadow-soft)', width: '100%', maxWidth: '800px' }}>
          
          <h3 style={{ color: 'var(--texto)', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #f8fafc', paddingBottom: '8px', marginBottom: '15px' }}>
            <i className="fa-solid fa-id-card" style={{ color: 'var(--verde-logo)', marginRight: '5px' }}></i> Datos de Identidad
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: 'var(--verde-logo)', fontSize: '0.85rem' }}>Nombre Completo</label>
            <div style={{ position: 'relative' }}>
              <input type="text" value={datos.nombre} disabled style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }} />
              <i className="fa-solid fa-lock" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }}></i>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: 'var(--verde-logo)', fontSize: '0.85rem' }}>DNI</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={datos.dni} disabled style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }} />
                </div>
            </div>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: 'var(--verde-logo)', fontSize: '0.85rem' }}>Nacimiento</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={datos.nacimiento} disabled style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }} />
                </div>
            </div>
          </div>

          <h3 style={{ color: 'var(--texto)', fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid #f8fafc', paddingBottom: '8px', marginBottom: '15px' }}>
            <i className="fa-solid fa-address-book" style={{ color: 'var(--verde-logo)', marginRight: '5px' }}></i> Datos de Contacto
          </h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: 'var(--verde-logo)', fontSize: '0.85rem' }}>
              {esGoogle ? 'Correo Electrónico (Vinculado a Google)' : 'Correo Electrónico'}
            </label>
            <div style={{ position: 'relative' }}>
              <input type="email" name="email" value={datos.email} onChange={handleChange} disabled={esGoogle} 
                     style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: esGoogle ? '#f8fafc' : 'white', color: esGoogle ? '#64748b' : 'var(--texto)' }} />
              {esGoogle && <i className="fa-brands fa-google" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#ea4335' }}></i>}
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: 'var(--verde-logo)', fontSize: '0.85rem' }}>Teléfono Móvil</label>
            <input type="tel" name="telefono" value={datos.telefono} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white' }} />
          </div>

          <button onClick={intentarGuardar} style={{ background: estadoBoton === '¡Éxito!' ? 'var(--verde-online)' : 'var(--verde-logo)', color: 'white', border: 'none', padding: '16px', width: '100%', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', transition: '0.3s' }}>
            {estadoBoton}
          </button>
        </div>
      </div>

      {/* Modal Seguridad */}
      <div style={{ display: modalSeguridad ? 'flex' : 'none', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', justifyContent: 'center', alignItems: 'center', zIndex: 4000 }}>
        <div style={{ background: 'white', width: '90%', maxWidth: '350px', borderRadius: '24px', padding: '30px 25px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: '#f0fdf4', color: 'var(--verde-online)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', margin: '0 auto 15px', border: '4px solid #dcfce7' }}><i className="fa-solid fa-shield-halved"></i></div>
          <h3 style={{ margin: '0 0 10px 0' }}>Confirmar Cambios</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--gris-texto)', marginBottom: '20px' }}>Ingresá tu contraseña para actualizar datos.</p>
          <input type="password" value={passVerif} onChange={e => setPassVerif(e.target.value)} placeholder="Tu contraseña actual" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '20px', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setModalSeguridad(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: 'var(--texto)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmarSeguridad} style={{ flex: 1, padding: '12px', background: 'var(--verde-logo)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Confirmar</button>
          </div>
        </div>
      </div>
    </>
  );
}