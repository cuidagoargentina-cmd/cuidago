import { useState, useEffect } from 'react';
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

export default function MisDirecciones() {
  const [direcciones, setDirecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formulario, setFormulario] = useState({ nombre: '', calle: '', barrio: '', piso: '', depto: '', indicaciones: '' });
  const [guardando, setGuardando] = useState(false);
  const [inputDireccion, setInputDireccion] = useState('');
  const [resultadosOSM, setResultadosOSM] = useState([]);
  const [cargandoOSM, setCargandoOSM] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      const auth = getAuth();
      const db = getFirestore();
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "pacientes", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const lista = [];
          if (data.direccionRegistro) {
            lista.push({ nombre: "Mi Casa", calle: data.direccionRegistro, piso: "", depto: "", principal: true });
          }
          if (data.direcciones && data.direcciones.length > 0) {
            lista.push(...data.direcciones);
          }
          setDirecciones(lista);
        }
      }
      setCargando(false);
    };
    fetchDatos();
  }, []);

  const handleChange = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  let timeoutOSM;
  function buscarOSM(texto) {
    clearTimeout(timeoutOSM);
    if (texto.length < 4) { setResultadosOSM([]); return }
    setCargandoOSM(true);
    timeoutOSM = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(texto)}&format=json&addressdetails=1&countrycodes=ar&limit=5`);
        const datos = await res.json();
        setResultadosOSM(datos.map(l => ({
          display: `${l.address.road || ''} ${l.address.house_number || ''}, ${l.address.city || l.address.town || l.address.state || ''}`.trim().replace(/^,|,$/g, '').trim() || l.display_name,
          barrio: l.address.suburb || l.address.neighbourhood || ''
        })));
      } catch { setResultadosOSM([]) }
      setCargandoOSM(false);
    }, 800);
  }

  function seleccionarDireccionOSM(r) {
    setFormulario(f => ({ ...f, calle: r.display, barrio: r.barrio || f.barrio }));
    setInputDireccion(r.display);
    setResultadosOSM([]);
  }

  const guardarDireccion = async () => {
    if (!formulario.nombre || !formulario.calle) return alert("Completá el nombre y la dirección exacta");
    setGuardando(true);
    const auth = getAuth();
    const db = getFirestore();
    try {
      await updateDoc(doc(db, "pacientes", auth.currentUser.uid), {
        direcciones: arrayUnion(formulario)
      });
      setDirecciones([...direcciones, formulario]);
      setModalAbierto(false);
      setFormulario({ nombre: '', calle: '', barrio: '', piso: '', depto: '', indicaciones: '' });
      setInputDireccion('');
    } catch (error) {
      alert("Error al guardar la dirección");
    }
    setGuardando(false);
  };

  return (
    <>
      <div style={{ padding: '20px 20px 180px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ background: '#f1f5f9', borderLeft: '4px solid var(--verde-logo)', padding: '15px', borderRadius: '12px', display: 'flex', gap: '12px', marginBottom: '25px' }}>
            <i className="fa-solid fa-location-dot" style={{ color: 'var(--verde-logo)', fontSize: '1.2rem' }}></i>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--texto)' }}>Gestioná las direcciones donde necesitás recibir atención profesional en CuidaGo.</p>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--verde-logo)' }}></i></div>
        ) : direcciones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gris-texto)' }}>
            <i className="fa-solid fa-map-location-dot" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }}></i>
            <p style={{ fontWeight: 600 }}>Aún no tienes direcciones guardadas.</p>
          </div>
        ) : (
          direcciones.map((dir, i) => (
            <div key={i} style={{ background: dir.principal ? '#f0f7f8' : 'white', padding: '18px', borderRadius: '16px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: dir.principal ? '2px solid var(--verde-logo)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: dir.principal ? 'var(--verde-logo)' : '#f1f5f9', color: dir.principal ? 'white' : 'var(--gris-texto)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>{dir.nombre}</h4>
                    {dir.principal && <span style={{ background: 'var(--verde-logo)', color: 'white', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase' }}>Principal</span>}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--texto)', fontWeight: 600, margin: 0 }}>{dir.calle} {dir.piso && `Piso ${dir.piso}`} {dir.depto && `Depto ${dir.depto}`}</p>
                {dir.barrio && <p style={{ fontSize: '0.75rem', color: 'var(--gris-texto)', margin: '3px 0 0', fontWeight: 600 }}><i className="fa-solid fa-map" style={{ marginRight: '5px', color: 'var(--verde-logo)' }}></i>{dir.barrio}</p>}
                {dir.indicaciones && <p style={{ fontSize: '0.75rem', color: 'var(--rojo-logo)', margin: '5px 0 0 0', fontWeight: 600 }}><i className="fa-solid fa-bell"></i> {dir.indicaciones}</p>}
              </div>
            </div>
          ))
        )}

        <button onClick={() => setModalAbierto(true)} style={{ width: '100%', marginTop: '20px', padding: '18px', background: 'white', color: 'var(--gris-texto)', border: '2px dashed #cbd5e1', borderRadius: '20px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
          <i className="fa-solid fa-plus"></i> Agregar nueva dirección
        </button>
      </div>

      {/* MODAL BOTTOM SHEET */}
      <div onClick={() => setModalAbierto(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', zIndex: 4000, opacity: modalAbierto ? 1 : 0, pointerEvents: modalAbierto ? 'auto' : 'none', transition: '0.3s' }}></div>
      
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '30px 30px 0 0', padding: '25px 20px 40px', zIndex: 4001, transform: modalAbierto ? 'translateY(0)' : 'translateY(100%)', transition: '0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Nueva Dirección</h3>
            <button onClick={() => { setModalAbierto(false); setInputDireccion(''); setResultadosOSM([]) }} style={{ background: '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer' }}><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Nombre del lugar</label>
            <input type="text" name="nombre" value={formulario.nombre} onChange={handleChange} placeholder="Ej: Mi Casa, Trabajo..." style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '15px', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Dirección exacta</label>
            <input type="text" value={inputDireccion} autoComplete="off"
              onChange={e => { setInputDireccion(e.target.value); setFormulario(f => ({ ...f, calle: e.target.value })); buscarOSM(e.target.value) }}
              placeholder="Escribí calle y altura..." style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
            {cargandoOSM && <div style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--gris-texto)' }}><i className="fa-solid fa-spinner fa-spin"></i> Buscando direcciones...</div>}
            {resultadosOSM.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, border: '2px solid #e2e8f0', borderRadius: '12px', marginTop: '5px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                {resultadosOSM.map((r, i) => (
                  <div key={i} onClick={() => seleccionarDireccionOSM(r)}
                    style={{ padding: '12px 15px', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-location-dot" style={{ color: 'var(--gris-texto)' }}></i> {r.display}
                  </div>
                ))}
              </div>
            )}
        </div>
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Barrio</label>
            <input type="text" name="barrio" value={formulario.barrio} onChange={handleChange} placeholder="Ej: Palermo, Caballito..." style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Piso</label>
                <input type="text" name="piso" value={formulario.piso} onChange={handleChange} placeholder="Opcional" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Depto</label>
                <input type="text" name="depto" value={formulario.depto} onChange={handleChange} placeholder="Opcional" style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
            </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px' }}>Indicaciones</label>
            <input type="text" name="indicaciones" value={formulario.indicaciones} onChange={handleChange} placeholder="Ej: Tocar timbre fuerte..." style={{ width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>
        <button onClick={guardarDireccion} disabled={guardando} style={{ width: '100%', padding: '18px', background: 'var(--verde-logo)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar Dirección'}
        </button>
      </div>
    </>
  );
}