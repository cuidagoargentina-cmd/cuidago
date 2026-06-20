import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_SERVICIOS = {
  medicamentos: true, curaciones: true, monitoreo: true,
  higiene: true, invasivos: true, noInvasivos: true,
  respiratorios: true, alimentacion: true, acompanamiento: true,
  educacion: true, urgencias: true
};

export default function ServiciosOfrezcoProfesional() {
  const [servicios, setServicios] = useState(DEFAULT_SERVICIOS);
  const [uid, setUid] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);
      try {
        const snap = await getDoc(doc(db, 'enfermeros', user.uid));
        if (snap.exists() && snap.data().serviciosActivos) {
          setServicios({ ...DEFAULT_SERVICIOS, ...snap.data().serviciosActivos });
        }
      } catch(e) { console.error(e); }
    });
    return () => unsub();
  }, []);

  const toggleServicio = async (id) => {
    const nuevo = { ...servicios, [id]: !servicios[id] };
    setServicios(nuevo);
    if (!uid) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'enfermeros', uid), { serviciosActivos: nuevo }, { merge: true });
    } catch(e) { console.error(e); }
    setGuardando(false);
  };

  const listaServicios = [
    { id: 'medicamentos', icon: 'fa-syringe', titulo: 'Administración de Medicamentos', desc: 'Vía oral, inyectables, intravenosa.' },
    { id: 'curaciones', icon: 'fa-band-aid', titulo: 'Curaciones', desc: 'Heridas simples, complejas, ostomías.' },
    { id: 'monitoreo', icon: 'fa-heart-pulse', titulo: 'Control y Monitoreo', desc: 'Signos vitales, glucemia capilar.' },
    { id: 'higiene', icon: 'fa-bed', titulo: 'Higiene y Confort', desc: 'Baño en cama, cambios posturales.' },
    { id: 'invasivos', icon: 'fa-flask-vial', titulo: 'Procedimientos Técnicos Invasivos', desc: 'Sondas, vías periféricas, aspiración.' },
    { id: 'noInvasivos', icon: 'fa-stethoscope', titulo: 'Procedimientos Técnicos No Invasivos', desc: 'Procedimientos generales de control.' },
    { id: 'respiratorios', icon: 'fa-lungs', titulo: 'Cuidados Respiratorios', desc: 'Oxígeno, nebulizaciones, CPAP/BiPAP.' },
    { id: 'alimentacion', icon: 'fa-utensils', titulo: 'Alimentación y Cuidados Especiales', desc: 'Nutrición asistida, enteral, bombas.' },
    { id: 'acompanamiento', icon: 'fa-clock', titulo: 'Cuidados y Acompañamientos', desc: 'Servicios por hora y jornadas largas.' },
    { id: 'educacion', icon: 'fa-book-medical', titulo: 'Educación y Asistencia a la Familia', desc: 'Prevención de complicaciones, educación.' },
    { id: 'urgencias', icon: 'fa-truck-medical', titulo: 'Atención en Urgencias', desc: 'Manejo inicial y sistemas de emergencia.' }
  ];

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Estilos inyectados para el Switch */}
      <style>{`
        .switch-cuida { position: relative; display: inline-block; width: 50px; height: 28px; flex-shrink: 0; }
        .switch-cuida input { opacity: 0; width: 0; height: 0; }
        .slider-cuida { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider-cuida:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .switch-cuida input:checked + .slider-cuida { background-color: var(--verde-online); }
        .switch-cuida input:checked + .slider-cuida:before { transform: translateX(22px); }
      `}</style>

      <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', marginBottom: '20px', lineHeight: 1.5 }}>
        Activa o desactiva los servicios que estás dispuesto a realizar a domicilio. Solo recibirás solicitudes de los servicios activos.
      </p>

      <div style={{ background: 'var(--blanco)', borderRadius: '20px', padding: '5px 15px', boxShadow: 'var(--shadow-soft)', marginBottom: '20px' }}>
          
          {listaServicios.map((srv, index) => {
            const isLast = index === listaServicios.length - 1;
            return (
              <div key={srv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 5px', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#166534', fontSize: '1.1rem', flexShrink: 0 }}>
                          <i className={`fa-solid ${srv.icon}`}></i>
                      </div>
                      <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)', lineHeight: 1.2 }}>{srv.titulo}</h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>{srv.desc}</p>
                      </div>
                  </div>
                  
                  <label className="switch-cuida">
                      <input 
                        type="checkbox" 
                        checked={servicios[srv.id]} 
                        onChange={() => toggleServicio(srv.id)} 
                      />
                      <span className="slider-cuida"></span>
                  </label>
              </div>
            );
          })}

      </div>
    </div>
  );
}