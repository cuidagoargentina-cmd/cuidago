import { useState, useEffect } from 'react';
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

export default function FichaMedica() {
  const [formulario, setFormulario] = useState({
    nombre: '', dni: '', nacimiento: '',
    grupoSanguineo: '', alergias: '', enfermedades: '',
    contactoEmergencia: '', obraSocial: '', nroSocio: '', telPrepaga: ''
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

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
            setFormulario({
              nombre: data.nombre || '',
              dni: data.dni || '',
              nacimiento: data.nacimiento || '',
              grupoSanguineo: data.grupoSanguineo || '',
              alergias: data.alergias || '',
              enfermedades: data.enfermedades || '',
              contactoEmergencia: data.contactoEmergencia || '',
              obraSocial: data.obraSocial || '',
              nroSocio: data.nroSocio || '',
              telPrepaga: data.telPrepaga || ''
            });
          }
        }
      } catch (error) {
        console.error("Error al cargar la ficha:", error);
      } finally {
        setCargando(false);
      }
    };
    fetchDatos();
  }, []);

  const handleChange = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  const guardarFicha = async () => {
    setGuardando(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      await updateDoc(doc(db, "pacientes", auth.currentUser.uid), {
        grupoSanguineo: formulario.grupoSanguineo,
        alergias: formulario.alergias,
        enfermedades: formulario.enfermedades,
        contactoEmergencia: formulario.contactoEmergencia,
        obraSocial: formulario.obraSocial,
        nroSocio: formulario.nroSocio,
        telPrepaga: formulario.telPrepaga
      });
      
      // Mostrar estado de éxito por 2 segundos
      setExito(true);
      setTimeout(() => setExito(false), 2000);
    } catch (error) {
      console.error(error);
      alert("Error al guardar la ficha.");
    }
    setGuardando(false);
  };

  // Estilos reutilizables para no ensuciar el código
  const cardStyle = { background: 'white', borderRadius: '28px', padding: '25px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(0,0,0,0.02)', marginBottom: '20px' };
  const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gris-texto)', marginBottom: '10px', textTransform: 'uppercase' };
  const inputStyle = { width: '100%', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9', background: '#f8fafc', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600, color: 'var(--texto)', boxSizing: 'border-box' };
  const disabledStyle = { ...inputStyle, background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', cursor: 'not-allowed' };

  if (cargando) return <div style={{ textAlign: 'center', padding: '40px' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--verde-logo)' }}></i></div>;

  return (
    <div style={{ padding: '20px 20px 180px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      <div style={{ marginBottom: '20px', paddingLeft: '5px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--texto)', margin: 0 }}>Datos Personales</h2>
      </div>

      <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Nombre Completo</label>
              <input type="text" name="nombre" value={formulario.nombre} disabled style={disabledStyle} />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                  <label style={labelStyle}>DNI</label>
                  <input type="text" name="dni" value={formulario.dni} disabled style={disabledStyle} />
              </div>
              <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Fecha de Nac.</label>
                  <input type="text" name="nacimiento" value={formulario.nacimiento} disabled style={disabledStyle} />
              </div>
          </div>
      </div>

      <div style={{ marginBottom: '20px', paddingLeft: '5px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--texto)', margin: 0 }}>Datos de Salud</h2>
      </div>

      <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Grupo Sanguíneo</label>
              <select name="grupoSanguineo" value={formulario.grupoSanguineo} onChange={handleChange} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  <option value="0 Rh+">0 Rh+</option>
                  <option value="0 Rh-">0 Rh-</option>
                  <option value="A Rh+">A Rh+</option>
                  <option value="A Rh-">A Rh-</option>
                  <option value="B Rh+">B Rh+</option>
                  <option value="B Rh-">B Rh-</option>
                  <option value="AB Rh+">AB Rh+</option>
                  <option value="AB Rh-">AB Rh-</option>
              </select>
          </div>
          <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Alergias Conocidas</label>
              <textarea name="alergias" rows="2" value={formulario.alergias} onChange={handleChange} placeholder="Ej: Penicilina, Látex, polen..." style={{...inputStyle, resize: 'vertical'}}></textarea>
          </div>
          <div>
              <label style={labelStyle}>Enfermedades Crónicas / Preexistentes</label>
              <textarea name="enfermedades" rows="3" value={formulario.enfermedades} onChange={handleChange} placeholder="Ej: Diabetes Tipo 2, Hipertensión..." style={{...inputStyle, resize: 'vertical'}}></textarea>
          </div>
      </div>

      <div style={{ marginBottom: '20px', paddingLeft: '5px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--texto)', margin: 0 }}>Contactos de Emergencia</h2>
      </div>

      <div style={cardStyle}>
          <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Familiar Directo (Nombre y Teléfono)</label>
              <input type="text" name="contactoEmergencia" value={formulario.contactoEmergencia} onChange={handleChange} placeholder="Ej: Maria Perez - 11 1234-5678" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Obra Social / Prepaga</label>
              <input type="text" name="obraSocial" value={formulario.obraSocial} onChange={handleChange} placeholder="Ej: OSDE 210" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Número de Socio</label>
              <input type="text" name="nroSocio" value={formulario.nroSocio} onChange={handleChange} placeholder="Ej: 123456789" style={inputStyle} />
          </div>
          <div>
              <label style={labelStyle}>Número de Emergencia de Prepaga</label>
              <input type="tel" name="telPrepaga" value={formulario.telPrepaga} onChange={handleChange} placeholder="0800-XXX-XXXX" style={inputStyle} />
          </div>
      </div>

      <button 
        onClick={guardarFicha} 
        disabled={guardando || exito} 
        style={{ background: exito ? 'var(--verde-online)' : 'var(--verde-logo)', color: 'white', border: 'none', padding: '18px', width: '100%', borderRadius: '20px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(26, 83, 92, 0.1)', transition: '0.3s' }}
      >
        {guardando ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Guardando...</> : exito ? '¡FICHA GUARDADA!' : 'GUARDAR FICHA MÉDICA'}
      </button>
    </div>
  );
}