export default function TerminosProfesional() {
  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      <div style={{ textAlign: 'center', marginBottom: '25px', paddingTop: '10px' }}>
          <i className="fa-solid fa-scale-balanced" style={{ fontSize: '2.5rem', color: 'var(--verde-logo)', marginBottom: '15px' }}></i>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '5px', color: 'var(--texto)' }}>Términos y Condiciones</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)' }}>Contrato de uso para profesionales</p>
      </div>

      <div style={{ background: 'var(--blanco)', borderRadius: '24px', padding: '25px 20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04)' }}>
          
          <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-user-doctor"></i> 1. Responsabilidad Profesional
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: '0 0 10px 0' }}>Al utilizar la plataforma Cuida Go, el profesional declara bajo juramento:</p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, marginBottom: '8px' }}>Poseer título habilitante y matrícula vigente otorgada por el Ministerio de Salud.</li>
                  <li style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, marginBottom: '8px' }}>Obrar con máxima diligencia médica, respetando los protocolos sanitarios y de bioseguridad vigentes.</li>
                  <li style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, marginBottom: '8px' }}>Mantener un trato respetuoso y ético con los pacientes asignados a través de la aplicación.</li>
              </ul>
          </div>

          <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-location-dot"></i> 2. Geolocalización y Privacidad
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: '0 0 10px 0' }}>El funcionamiento principal de Cuida Go requiere conocer su ubicación para conectar pacientes cercanos.</p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, marginBottom: '8px' }}>El uso del GPS en segundo plano es mandatorio mientras su estado figure como "Online".</li>
                  <li style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, marginBottom: '8px' }}>La plataforma no rastreará su ubicación cuando su estado se encuentre en "Offline".</li>
                  <li style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, marginBottom: '8px' }}>Sus datos de ubicación en tiempo real solo se comparten con el paciente una vez que el turno ha sido aceptado.</li>
              </ul>
          </div>

          <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-hand-holding-dollar"></i> 3. Honorarios y Comisiones
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: 0 }}>El esquema de comisiones por el uso de la plataforma varía según su rango dentro del sistema de niveles de Cuida Go. Los pagos se procesan semanalmente y se transfieren a la cuenta bancaria o billetera virtual asociada en su perfil.</p>
          </div>

          <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--verde-logo)', margin: '0 0 10px 0', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-calendar-xmark"></i> 4. Política de Cancelaciones
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.6, margin: 0 }}>Las cancelaciones reiteradas por parte del profesional una vez aceptado un turno afectarán negativamente su puntuación en el sistema y podrían derivar en una suspensión temporal de la cuenta.</p>
          </div>

      </div>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '20px', fontWeight: 600 }}>
          Última actualización: Abril 2026
      </div>

    </div>
  );
}