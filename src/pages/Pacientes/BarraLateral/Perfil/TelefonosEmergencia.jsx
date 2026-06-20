import { useState, useEffect } from 'react';
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function TelefonosEmergencia() {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formulario, setFormulario] = useState({ nombre: '', vinculo: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const auth = getAuth();
        const db = getFirestore();
        const user = auth.currentUser;
        
        if (user) {
          const docSnap = await getDoc(doc(db, "pacientes", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            let lista = [];
            
            // LÓGICA CORREGIDA: Si existe el array de contactos, lo usamos
            if (Array.isArray(data.contactosEmergencia) && data.contactosEmergencia.length > 0) {
              lista = [...data.contactosEmergencia];
            } 
            // Si el array NO existe, pero existe el texto viejo, lo adaptamos (Backward compatibility)
            else if (data.contactoEmergencia) {
              lista.push({ nombre: String(data.contactoEmergencia), vinculo: "Familiar / Referencia", telefono: "" });
            }
            
            setContactos(lista);
          }
        }
      } catch (error) {
        console.error("Error al cargar los contactos:", error);
      } finally {
        setCargando(false);
      }
    };
    fetchDatos();
  }, []);

  const handleChange = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  const guardarContacto = async () => {
    if (!formulario.nombre || !formulario.telefono) return alert("Completá el nombre y el teléfono");
    setGuardando(true);
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Guardamos el nuevo contacto en el array de Firebase
      await updateDoc(doc(db, "pacientes", auth.currentUser.uid), {
        contactosEmergencia: arrayUnion(formulario)
      });
      
      // Actualizamos la vista local
      setContactos([...contactos, formulario]);
      setModalAbierto(false);
      setFormulario({ nombre: '', vinculo: '', telefono: '' });
    } catch (error) {
      console.error(error);
      alert("Error al guardar el contacto");
    }
    setGuardando(false);
  };

  return (
    <>
      <div style={{ padding: '20px 20px 180px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '18px', borderRadius: '16px', display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--rojo-logo)', fontSize: '1.3rem', marginTop: '2px' }}></i>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#991b1b', lineHeight: 1.4 }}>En caso de urgencia, los profesionales o el equipo de soporte contactarán a estas personas.</p>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--verde-logo)' }}></i></div>
        ) : contactos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris-texto)' }}>
            <i className="fa-solid fa-address-book" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }}></i>
            <p style={{ fontWeight: 600 }}>No tenés contactos de emergencia. ¡Agregá uno!</p>
          </div>
        ) : (
          contactos.map((contacto, i) => {
            const nombreSeguro = contacto?.nombre || "Contacto Sin Nombre";
            const telefonoSeguro = contacto?.telefono || "";
            const vinculoSeguro = contacto?.vinculo || "Familiar";

            const inicial = String(nombreSeguro).charAt(0).toUpperCase();
            const telLimpio = String(telefonoSeguro).replace(/\D/g, '');
            const linkLlamada = telLimpio || String(nombreSeguro).replace(/\D/g, '');

            return (
              <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '20px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden', flex: 1 }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', color: 'var(--verde-logo)', fontWeight: 800, flexShrink: 0 }}>
                        {inicial}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <h4 style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: '1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{nombreSeguro}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gris-texto)', fontWeight: 600, textTransform: 'uppercase' }}>{vinculoSeguro} {telefonoSeguro && `• ${telefonoSeguro}`}</p>
                    </div>
                </div>
                {linkLlamada.length > 5 && (
                    <button onClick={() => window.location.href=`tel:${linkLlamada}`} style={{ width: '45px', height: '45px', borderRadius: '14px', background: '#dcfce7', color: '#166534', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.1rem', cursor: 'pointer', marginLeft: '10px', flexShrink: 0 }}>
                        <i className="fa-solid fa-phone"></i>
                    </button>
                )}
              </div>
            );
          })
        )}

        <button onClick={() => setModalAbierto(true)} style={{ width: '100%', marginTop: '25px', padding: '18px', background: 'white', color: 'var(--gris-texto)', border: '2px dashed #cbd5e1', borderRadius: '20px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
          <i className="fa-solid fa-plus"></i> Añadir nuevo contacto
        </button>
      </div>

      {/* MODAL BOTTOM SHEET */}
      <div onClick={() => setModalAbierto(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 4000, opacity: modalAbierto ? 1 : 0, pointerEvents: modalAbierto ? 'auto' : 'none', transition: '0.3s' }}></div>
      
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '30px 30px 0 0', padding: '25px 20px 40px', zIndex: 4001, transform: modalAbierto ? 'translateY(0)' : 'translateY(100%)', transition: '0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Nuevo Contacto</h3>
            <button onClick={() => setModalAbierto(false)} style={{ background: '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Nombre Completo</label>
            <input type="text" name="nombre" value={formulario.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Vínculo / Parentesco</label>
            <input type="text" name="vinculo" value={formulario.vinculo} onChange={handleChange} placeholder="Ej: Hijo, Pareja, Vecino..." style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Teléfono Móvil</label>
            <input type="tel" name="telefono" value={formulario.telefono} onChange={handleChange} placeholder="Ej: 11 2345 6789" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        
        <button onClick={guardarContacto} disabled={guardando} style={{ width: '100%', padding: '18px', background: 'var(--verde-logo)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar Contacto'}
        </button>
      </div>
    </>
  );
}