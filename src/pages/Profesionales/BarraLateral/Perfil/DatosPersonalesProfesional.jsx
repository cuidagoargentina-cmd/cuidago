import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

export default function DatosPersonalesProfesional() {
  const auth = getAuth();
  const db = getFirestore();

  const [currentUser, setCurrentUser] = useState(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [btnText, setBtnText] = useState('Guardar Cambios');
  
  // Estado para el Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState('');
  const [btnModalText, setBtnModalText] = useState('Confirmar');

  // Valores originales para comparar si hubo cambios
  const [originalData, setOriginalData] = useState({ email: '', telefono: '' });

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    nacimiento: '',
    matricula: '',
    especialidad: 'Enfermero Profesional',
    email: '',
    telefono: ''
  });

  useEffect(() => {
    // 1. Carga rápida desde caché (Supervelocidad)
    const cachedData = localStorage.getItem('cuidaGo_enfermeroData');
    if (cachedData) {
      const data = JSON.parse(cachedData);
      setFormData(prev => ({
        ...prev,
        nombre: data.nombre || '',
        dni: data.dni || '',
        nacimiento: data.nacimiento || '',
        matricula: data.matricula || '',
        especialidad: data.especialidad || 'Enfermero Profesional',
        email: data.email || '',
        telefono: data.telefono || ''
      }));
    }

    // 2. Carga real desde Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsGoogleUser(user.providerData.some(provider => provider.providerId === 'google.com'));
        
        try {
          const docRef = doc(db, "enfermeros", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const userEmail = data.email || user.email || '';
            const userPhone = data.telefono || '';

            setFormData({
              nombre: data.nombre || '',
              dni: data.dni || '',
              nacimiento: data.nacimiento || '',
              matricula: data.matricula || '',
              especialidad: data.especialidad || 'Enfermero Profesional',
              email: userEmail,
              telefono: userPhone
            });

            setOriginalData({ email: userEmail, telefono: userPhone });
            
            // Actualizar caché
            data.email = userEmail;
            localStorage.setItem('cuidaGo_enfermeroData', JSON.stringify(data));
          }
        } catch (error) {
          console.error("Error al cargar datos:", error);
        } finally {
          setCargando(false);
        }
      } else {
        setCargando(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const intentarGuardar = (e) => {
    e.preventDefault();
    const currentEmail = formData.email.trim();
    const currentTel = formData.telefono.trim();

    if (currentEmail === originalData.email && currentTel === originalData.telefono) {
      alert('No se detectaron cambios para guardar.');
      return;
    }

    if (isGoogleUser) {
      ejecutarActualizacion(currentEmail, currentTel, null);
    } else {
      setMostrarModal(true);
    }
  };

  const confirmarModal = () => {
    if (!passwordModal) {
      alert('Por favor, ingresá tu contraseña.');
      return;
    }
    ejecutarActualizacion(formData.email.trim(), formData.telefono.trim(), passwordModal);
  };

  const ejecutarActualizacion = async (nuevoEmail, nuevoTel, password) => {
    setGuardando(true);
    setBtnText('Cargando...');
    if (password) setBtnModalText('Verificando...');

    try {
      if (nuevoEmail !== originalData.email && !isGoogleUser && password) {
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
        await updateEmail(currentUser, nuevoEmail);
      }

      const docRef = doc(db, "enfermeros", currentUser.uid);
      await updateDoc(docRef, {
        email: nuevoEmail,
        telefono: nuevoTel
      });

      // Éxito
      setOriginalData({ email: nuevoEmail, telefono: nuevoTel });
      
      const cachedData = JSON.parse(localStorage.getItem('cuidaGo_enfermeroData')) || {};
      cachedData.email = nuevoEmail;
      cachedData.telefono = nuevoTel;
      localStorage.setItem('cuidaGo_enfermeroData', JSON.stringify(cachedData));
      
      setMostrarModal(false);
      setPasswordModal('');
      
      setBtnText('¡Datos Guardados!');
      
      setTimeout(() => {
        setBtnText('Guardar Cambios');
        setGuardando(false);
        if (password) setBtnModalText('Confirmar');
      }, 3000);

    } catch (error) {
      console.error(error);
      let msjError = error.message;
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msjError = 'La contraseña ingresada es incorrecta.';
      } else if (error.code === 'auth/email-already-in-use') {
        msjError = 'El correo electrónico ya está en uso por otra cuenta.';
      }
      
      alert('Error: ' + msjError);
      
      setBtnText('Guardar Cambios');
      setGuardando(false);
      if (password) setBtnModalText('Confirmar');
    }
  };

  // --- ESTILOS INYECTADOS ---
  const styles = {
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--gris-texto)', marginBottom: '8px' },
    input: { width: '100%', padding: '15px', borderRadius: '14px', border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600, color: 'var(--texto)', background: 'var(--blanco)', transition: '0.3s', outline: 'none' },
    inputDisabled: { width: '100%', padding: '15px', borderRadius: '14px', border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600, background: '#f1f5f9', color: 'var(--gris-texto)', cursor: 'not-allowed' },
    btnSave: { width: '100%', padding: '16px', background: btnText === '¡Datos Guardados!' ? '#10b981' : 'var(--verde-logo)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', cursor: guardando ? 'not-allowed' : 'pointer', marginTop: '10px', boxShadow: '0 4px 15px rgba(26, 83, 92, 0.2)', transition: '0.3s', opacity: guardando && btnText !== '¡Datos Guardados!' ? 0.7 : 1 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 2999, backdropFilter: 'blur(3px)', display: mostrarModal ? 'block' : 'none' },
    modalBox: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--blanco)', padding: '25px', borderRadius: '20px', zIndex: 3000, width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: mostrarModal ? 'block' : 'none' },
    btnCancel: { background: '#f1f5f9', color: 'var(--texto)', width: '100%', padding: '16px', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }
  };

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {cargando && <p style={{ textAlign: 'center', color: 'var(--gris-texto)', fontSize: '0.9rem' }}>Cargando datos...</p>}

      {/* --- CAMPOS SOLO LECTURA --- */}
      <div style={styles.formGroup}>
          <label style={styles.label}>Nombre Completo (Solo lectura)</label>
          <input type="text" value={formData.nombre} style={styles.inputDisabled} disabled />
      </div>
      <div style={styles.formGroup}>
          <label style={styles.label}>DNI (Solo lectura)</label>
          <input type="text" value={formData.dni} style={styles.inputDisabled} disabled />
      </div>
      <div style={styles.formGroup}>
          <label style={styles.label}>Fecha de Nacimiento (Solo lectura)</label>
          <input type="date" value={formData.nacimiento} style={styles.inputDisabled} disabled />
      </div>
      <div style={styles.formGroup}>
          <label style={styles.label}>Número de Matrícula (Solo lectura)</label>
          <input type="text" value={formData.matricula} style={styles.inputDisabled} disabled />
      </div>
      <div style={styles.formGroup}>
          <label style={styles.label}>Especialidad / Título (Solo lectura)</label>
          <input type="text" value={formData.especialidad} style={styles.inputDisabled} disabled />
      </div>

      <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '25px 0' }} />

      {/* --- CAMPOS EDITABLES --- */}
      <div style={styles.formGroup}>
          <label style={styles.label}>Correo Electrónico</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} style={styles.input} />
      </div>
      <div style={styles.formGroup}>
          <label style={styles.label}>Teléfono Móvil</label>
          <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} style={styles.input} />
      </div>
      
      <button onClick={intentarGuardar} disabled={guardando} style={styles.btnSave}>
        {btnText}
      </button>

      {/* --- MODAL DE SEGURIDAD --- */}
      <div style={styles.modalOverlay} onClick={() => setMostrarModal(false)}></div>
      <div style={styles.modalBox}>
          <h3 style={{ marginBottom: '10px', color: 'var(--texto)', fontWeight: 800, marginTop: 0 }}>Confirmar Cambios</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--gris-texto)', marginBottom: '20px' }}>Por tu seguridad, ingresá tu contraseña actual para modificar tu correo o teléfono.</p>
          
          <input 
            type="password" 
            placeholder="Contraseña actual" 
            value={passwordModal}
            onChange={(e) => setPasswordModal(e.target.value)}
            style={{ ...styles.input, marginBottom: '15px' }} 
          />
          
          <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setMostrarModal(false)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={confirmarModal} disabled={guardando} style={{ ...styles.btnSave, marginTop: 0 }}>{btnModalText}</button>
          </div>
      </div>

    </div>
  );
}