import { useState, useEffect } from 'react';
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function MediosPago() {
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formulario, setFormulario] = useState({ nro: '', titular: '', vencimiento: '', cvv: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "pacientes", user.uid));
        if (docSnap.exists()) {
          setPagos(docSnap.data().metodosPago || []);
        }
      }
      setCargando(false);
    };
    fetchDatos();
  }, []);

  const handleChange = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  const guardarPago = async () => {
    const numLimpio = formulario.nro.replace(/\s/g, '');
    if (numLimpio.length < 16) return alert("Número de tarjeta inválido");
    
    setGuardando(true);
    const nuevoPago = {
      tipo: numLimpio.startsWith('4') ? 'Visa' : 'Mastercard',
      ultimosCuatro: numLimpio.slice(-4),
      titular: formulario.titular
    };

    const auth = getAuth();
    const db = getFirestore();
    try {
      await updateDoc(doc(db, "pacientes", auth.currentUser.uid), {
        metodosPago: arrayUnion(nuevoPago)
      });
      setPagos([...pagos, nuevoPago]);
      setModalAbierto(false);
      setFormulario({ nro: '', titular: '', vencimiento: '', cvv: '' });
    } catch (error) {
      alert("Error al guardar la tarjeta");
    }
    setGuardando(false);
  };

  return (
    <>
      <div style={{ padding: '20px 20px 180px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a', padding: '15px', borderRadius: '12px', display: 'flex', gap: '12px', marginBottom: '25px', alignItems: 'center' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#16a34a', fontSize: '1.5rem' }}></i>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#14532d' }}>Tus pagos están protegidos. No almacenamos los códigos de seguridad.</p>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--verde-logo)' }}></i></div>
        ) : pagos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris-texto)' }}>
            <i className="fa-regular fa-credit-card" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }}></i>
            <p style={{ fontWeight: 600 }}>No tenés medios de pago. ¡Agregá uno!</p>
          </div>
        ) : (
          pagos.map((pago, i) => (
            <div key={i} style={{ background: i === 0 ? '#f0f7f8' : 'white', padding: '20px', borderRadius: '20px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: i === 0 ? '2px solid var(--verde-logo)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '50px', height: '32px', borderRadius: '6px', border: '1px solid #eee', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px' }}>
                {pago.tipo === 'Visa' ? <i className="fa-brands fa-cc-visa" style={{color: '#1a1f71', fontSize: '1.5rem'}}></i> : <i className="fa-brands fa-cc-mastercard" style={{color: '#eb001b', fontSize: '1.5rem'}}></i>}
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>{pago.tipo}</h4>
                    {i === 0 && <span style={{ background: 'var(--verde-logo)', color: 'white', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase' }}>Principal</span>}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', fontWeight: 600, margin: '2px 0 0 0' }}>•••• {pago.ultimosCuatro}</p>
              </div>
            </div>
          ))
        )}

        <button onClick={() => setModalAbierto(true)} style={{ width: '100%', marginTop: '20px', padding: '18px', background: 'white', color: 'var(--gris-texto)', border: '2px dashed #cbd5e1', borderRadius: '20px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
          <i className="fa-solid fa-plus"></i> Agregar nueva tarjeta
        </button>
      </div>

      {/* MODAL BOTTOM SHEET */}
      <div onClick={() => setModalAbierto(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 4000, opacity: modalAbierto ? 1 : 0, pointerEvents: modalAbierto ? 'auto' : 'none', transition: '0.3s' }}></div>
      
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '30px 30px 0 0', padding: '25px 20px 40px', zIndex: 4001, transform: modalAbierto ? 'translateY(0)' : 'translateY(100%)', transition: '0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Nueva Tarjeta</h3>
            <button onClick={() => setModalAbierto(false)} style={{ background: '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Número de Tarjeta</label>
            <input type="tel" name="nro" value={formulario.nro} onChange={handleChange} placeholder="0000 0000 0000 0000" maxLength="19" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Nombre del Titular</label>
            <input type="text" name="titular" value={formulario.titular} onChange={handleChange} placeholder="Como aparece en la tarjeta" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Vencimiento</label>
                <input type="text" name="vencimiento" value={formulario.vencimiento} onChange={handleChange} placeholder="MM/AA" maxLength="5" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>CVC / CVV</label>
                <input type="password" name="cvv" value={formulario.cvv} onChange={handleChange} placeholder="123" maxLength="4" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
            </div>
        </div>
        <button onClick={guardarPago} disabled={guardando} style={{ width: '100%', padding: '18px', background: 'var(--verde-logo)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>
            {guardando ? 'Validando...' : 'Agregar Tarjeta'}
        </button>
      </div>
    </>
  );
}