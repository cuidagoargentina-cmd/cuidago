import { useState } from 'react';

export default function CentroAyudaProfesional() {
  const [preguntaActiva, setPreguntaActiva] = useState(null);

  const toggleFaq = (index) => {
    setPreguntaActiva(preguntaActiva === index ? null : index);
  };

  const preguntas = [
    { q: '¿Cómo retiro mis ganancias?', a: 'Puedes retirar tus ganancias desde la sección "Ingresos" tocando el botón "Retirar Dinero". Las transferencias se realizan a tu CBU asociado en un plazo de 24 a 48 hs hábiles.' },
    { q: '¿Qué pasa si el paciente cancela?', a: 'Si el paciente cancela el turno con menos de 2 horas de anticipación, recibirás una compensación automática del 50% por el tiempo reservado en tu cuenta.' },
    { q: 'No me llegan los pedidos (GPS)', a: 'Verifica que CuidaGo tenga permisos de "Ubicación Siempre" en los ajustes de tu celular, que el GPS esté activo y que tu estado en la app figure como "Online".' }
  ];

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingTop: '10px' }}>
          <i className="fa-solid fa-headset" style={{ fontSize: '3rem', color: 'var(--verde-logo)', marginBottom: '10px' }}></i>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 5px 0', color: 'var(--texto)' }}>¿En qué te ayudamos?</h2>
      </div>

      <div style={{ background: 'var(--blanco)', borderRadius: '20px', padding: '10px 15px', boxShadow: 'var(--shadow-soft)', marginBottom: '25px' }}>
        {preguntas.map((item, index) => (
          <div key={index} style={{ borderBottom: '1px solid #f1f5f9', padding: '15px 0' }}>
              <button onClick={() => toggleFaq(index)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                {item.q} <i className="fa-solid fa-chevron-down" style={{ transform: preguntaActiva === index ? 'rotate(180deg)' : 'none', transition: '0.3s' }}></i>
              </button>
              {preguntaActiva === index && <div style={{ paddingTop: '10px', fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6 }}>{item.a}</div>}
          </div>
        ))}
      </div>

      <div style={{ background: 'linear-gradient(135deg, var(--verde-logo), #2a7c88)', borderRadius: '20px', padding: '25px 20px', textAlign: 'center', color: 'white' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 800 }}>¿Necesitas soporte directo?</h3>
          <button style={{ background: '#25D366', color: 'white', border: 'none', padding: '15px', width: '100%', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer' }}>
              <i className="fa-brands fa-whatsapp"></i> Contactar por WhatsApp
          </button>
      </div>
    </div>
  );
}