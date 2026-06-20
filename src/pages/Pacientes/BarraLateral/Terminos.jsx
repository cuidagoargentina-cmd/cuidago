export default function Terminos() {
  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingTop: '10px' }}>
          <i className="fa-solid fa-scale-balanced" style={{ fontSize: '2.5rem', color: 'var(--verde-logo)', marginBottom: '15px' }}></i>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '5px', color: 'var(--texto)' }}>Términos y Condiciones</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)' }}>Contrato de uso para pacientes</p>
      </div>

      <div style={{ background: 'var(--blanco)', borderRadius: '24px', padding: '25px 20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04)' }}>
          
          <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-user-check"></i> 1. Uso de la Plataforma
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: '0 0 10px 0' }}>Al utilizar CuidaGo, el paciente acepta que la plataforma actúa como intermediaria tecnológica para conectar necesidades de cuidado en el hogar con profesionales matriculados.</p>
          </div>

          <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-file-invoice-dollar"></i> 2. Pagos y Presupuestos
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: '0 0 10px 0' }}>El paciente se compromete a abonar el total del presupuesto aceptado antes de la llegada del profesional, utilizando los medios de pago integrados y validados en la aplicación.</p>
          </div>

          <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-calendar-xmark"></i> 3. Política de Cancelaciones
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: 0 }}>Las cancelaciones realizadas con menos de 2 horas de anticipación a un turno ya confirmado pueden estar sujetas a un cargo de penalidad para compensar el tiempo y traslado del profesional.</p>
          </div>

          <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-shield-halved"></i> 4. Privacidad de Datos Médicos
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: 0 }}>Toda la información volcada en la Ficha Médica es confidencial. Solo se comparte temporalmente con el profesional asignado para garantizar una atención segura y precisa.</p>
          </div>

      </div>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '20px', fontWeight: 600 }}>
          Última actualización: Mayo 2026
      </div>

    </div>
  );
}