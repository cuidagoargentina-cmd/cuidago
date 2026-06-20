export default function CentroAyuda() {
  // Estilos reutilizables
  const searchBarStyle = { width: '100%', background: 'var(--blanco)', border: '1px solid var(--borde)', padding: '18px 25px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: 'var(--shadow-soft)' };
  const inputStyle = { border: 'none', outline: 'none', width: '100%', fontSize: '1rem', fontFamily: 'inherit', fontWeight: 600, color: 'var(--texto)' };
  const catCardStyle = { background: 'var(--blanco)', padding: '20px', borderRadius: '24px', textAlign: 'center', boxShadow: 'var(--shadow-soft)', border: '1px solid rgba(0,0,0,0.02)', cursor: 'pointer' };
  const catIconStyle = { fontSize: '1.5rem', color: 'var(--verde-logo)', marginBottom: '12px', display: 'block' };
  const catTextStyle = { fontSize: '0.85rem', fontWeight: 800, color: 'var(--texto)' };
  const faqItemStyle = { padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', cursor: 'pointer' };

  return (
    <div style={{ padding: '25px 20px 180px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* --- BUSCADOR --- */}
      <div style={{ marginBottom: '30px' }}>
          <div style={searchBarStyle}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--gris-texto)', fontSize: '1.1rem' }}></i>
              <input type="text" placeholder="¿En qué podemos ayudarte?" style={inputStyle} />
          </div>
      </div>

      {/* --- CATEGORÍAS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '35px' }}>
          <div style={catCardStyle}>
            <i className="fa-solid fa-user-shield" style={catIconStyle}></i>
            <span style={catTextStyle}>Mi Cuenta</span>
          </div>
          <div style={catCardStyle}>
            <i className="fa-solid fa-credit-card" style={catIconStyle}></i>
            <span style={catTextStyle}>Pagos</span>
          </div>
          <div style={catCardStyle}>
            <i className="fa-solid fa-kit-medical" style={catIconStyle}></i>
            <span style={catTextStyle}>Servicios</span>
          </div>
          <div style={catCardStyle}>
            <i className="fa-solid fa-handshake-angle" style={catIconStyle}></i>
            <span style={catTextStyle}>Seguridad</span>
          </div>
      </div>

      {/* --- PREGUNTAS FRECUENTES --- */}
      <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingLeft: '5px' }}>
              <i className="fa-solid fa-star" style={{ color: 'var(--verde-logo)' }}></i>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--texto)' }}>Preguntas frecuentes</h3>
          </div>
          <div style={{ background: 'var(--blanco)', borderRadius: '24px', boxShadow: 'var(--shadow-soft)', border: '1px solid rgba(0,0,0,0.02)', overflow: 'hidden', marginBottom: '25px' }}>
              
              <div style={faqItemStyle}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--texto)', lineHeight: 1.4, paddingRight: '15px' }}>¿Cómo solicito un profesional urgente?</p>
                  <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}></i>
              </div>
              
              <div style={faqItemStyle}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--texto)', lineHeight: 1.4, paddingRight: '15px' }}>¿Cuáles son los métodos de pago aceptados?</p>
                  <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}></i>
              </div>
              
              <div style={{ ...faqItemStyle, borderBottom: 'none' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--texto)', lineHeight: 1.4, paddingRight: '15px' }}>¿Cómo califico la atención recibida?</p>
                  <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}></i>
              </div>

          </div>
      </div>

      {/* --- BOTÓN FLOTANTE CHATBOT --- */}
      <div style={{ position: 'fixed', bottom: '115px', right: '25px', width: '60px', height: '60px', background: 'var(--verde-logo)', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '1.5rem', boxShadow: '0 10px 25px rgba(26, 83, 92, 0.3)', zIndex: 900, cursor: 'pointer' }}>
          <i className="fa-solid fa-robot"></i>
      </div>

    </div>
  );
}