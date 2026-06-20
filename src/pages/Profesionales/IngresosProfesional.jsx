import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

export default function IngresosProfesional() {
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [statsMesActual, setStatsMesActual] = useState({ ganancias: 0, turnos: 0, aceptacion: 0 });
  const [historialMensual, setHistorialMensual] = useState([]);
  const [ultimosMovimientos, setUltimosMovimientos] = useState([]);
  
  const [cuentaMP, setCuentaMP] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;

    localStorage.setItem(`ingresos_visto_${uid}`, new Date().toISOString());

    const q = query(collection(db, 'solicitudes'), where('enfermeroId', '==', uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const hoy = new Date();
      const mesActualKey = `${hoy.getFullYear()}-${hoy.getMonth()}`; 
      const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      let datosPorMes = {}; 
      let movimientos = [];

      snapshot.forEach((d) => {
        const data = d.data();
        
        const fechaDoc = data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : new Date(data.fechaCreacion || Date.now());
        const mesKey = `${fechaDoc.getFullYear()}-${fechaDoc.getMonth()}`;
        const nombreMes = `${mesesNombres[fechaDoc.getMonth()]} ${fechaDoc.getFullYear()}`;

        if (!datosPorMes[mesKey]) {
          datosPorMes[mesKey] = { nombre: nombreMes, ganancias: 0, turnos: 0, asignados: 0, aceptados: 0, timestamp: fechaDoc.getTime() };
        }

        const monto = Number(data.gananciaEnfermeroFinal || data.gananciaEnfermero || 0);

        if (['completado', 'pagado', 'en_curso', 'rechazado', 'cancelado'].includes(data.estado)) {
          datosPorMes[mesKey].asignados++;
          if (['completado', 'pagado', 'en_curso'].includes(data.estado)) {
            datosPorMes[mesKey].aceptados++;
          }
        }

        if (data.estado === 'completado') {
          datosPorMes[mesKey].ganancias += monto;
          datosPorMes[mesKey].turnos++;

          movimientos.push({
            id: d.id,
            tipo: 'income',
            titulo: 'Servicio Completado',
            paciente: data.pacienteNombre || 'Paciente',
            fecha: formatFechaMovimiento(fechaDoc),
            monto: monto,
            timestamp: fechaDoc.getTime()
          });
        }
      });

      const actual = datosPorMes[mesActualKey] || { ganancias: 0, turnos: 0, asignados: 0, aceptados: 0 };
      const aceptacionMesActual = actual.asignados > 0 ? Math.round((actual.aceptados / actual.asignados) * 100) : 100;
      
      setStatsMesActual({
        ganancias: actual.ganancias,
        turnos: actual.turnos,
        aceptacion: aceptacionMesActual
      });

      setSaldoTotal(actual.ganancias);

      const mesesArray = Object.keys(datosPorMes)
        .filter(key => key !== mesActualKey)
        .map(key => {
          const item = datosPorMes[key];
          const porcentaje = item.asignados > 0 ? Math.round((item.aceptados / item.asignados) * 100) : 100;
          return { ...item, aceptacion: porcentaje };
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3); 

      setHistorialMensual(mesesArray);

      movimientos.sort((a, b) => b.timestamp - a.timestamp);
      setUltimosMovimientos(movimientos.slice(0, 5));
    });

    const unsubPerfil = onSnapshot(doc(db, 'enfermeros', uid), (docSnap) => {
      if (docSnap.exists()) {
        setCuentaMP(docSnap.data().cuentaMercadoPago || '');
      }
    });

    return () => {
      unsub();
      unsubPerfil();
    };
  }, []);

  const guardarCuentaMercadoPago = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, 'enfermeros', user.uid), {
        cuentaMercadoPago: cuentaMP
      });
      alert('¡Cuenta de depósito guardada correctamente!');
    } catch (e) {
      console.error('Error guardando cuenta MP:', e);
      alert('Hubo un error al intentar guardar la cuenta.');
    }
    setGuardando(false);
  };

  const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto);
  };

  const formatFechaMovimiento = (d) => {
    const hoy = new Date();
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === hoy.toDateString()) return `Hoy, ${hora} hs`;
    if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora} hs`;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) + `, ${hora} hs`;
  };

  return (
    <div style={{ padding: '20px 20px 120px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* --- BILLETERA PREMIUM --- */}
      <div style={{ 
        background: 'linear-gradient(135deg, #3c5e56 0%, #1e3330 40%, #7f0000 75%, #b71c1c 100%)', 
        borderRadius: '28px', 
        padding: '35px 20px', 
        color: 'white', 
        textAlign: 'center', 
        marginBottom: '20px', 
        boxShadow: '0 20px 40px -10px rgba(60, 94, 86, 0.4)', 
        position: 'relative', 
        overflow: 'hidden',
        zIndex: 1
      }}>
          <div style={{ position: 'absolute', top: '-30%', right: '-15%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', zIndex: -1 }}></div>
          <div style={{ position: 'absolute', bottom: '-40%', left: '-15%', width: '240px', height: '240px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%', zIndex: -1 }}></div>
          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', background: 'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.18) 0%, transparent 60%)', zIndex: -1 }}></div>
          <div style={{ position: 'absolute', top: '12px', right: '20px', opacity: 0.15, fontSize: '3rem', zIndex: -1 }}>♥</div>

          <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.85 }}>
            Ganancia del Mes
          </div>
          
          <div style={{ fontSize: '3.2rem', fontWeight: 800, margin: '15px 0', letterSpacing: '-1.5px', textShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            {formatearDinero(saldoTotal)}
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.12)', 
            display: 'inline-block', 
            padding: '8px 18px', 
            borderRadius: '20px', 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            backdropFilter: 'blur(5px)', 
            border: '1px solid rgba(255,255,255,0.2)' 
          }}>
            <i className="fa-solid fa-bolt" style={{ color: '#fbbf24', marginRight: '6px' }}></i> 
            Transferencias automáticas
          </div>
      </div>

      {/* --- CONFIGURAR CUENTA DE DEPÓSITO --- */}
      <div style={{ 
        background: 'var(--blanco)', 
        borderRadius: '24px', 
        padding: '20px', 
        boxShadow: 'var(--shadow-soft)', 
        marginBottom: '25px',
        border: '1px solid #f1f5f9'
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0284c7' }}>
                  <i className="fa-solid fa-building-columns" style={{ fontSize: '0.9rem' }}></i>
              </div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--texto)' }}>Cuenta para recibir pagos</h4>
          </div>
          
          {/* TEXTO CORREGIDO ACÁ: Cambiado a depósitos instantáneos */}
          <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: 'var(--gris-texto)', lineHeight: '1.4' }}>
              Ingresá tu CVU o Alias de Mercado Pago. Los fondos se transferirán de manera instantánea a esta cuenta después de cada servicio.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                  type="text" 
                  value={cuentaMP}
                  onChange={(e) => setCuentaMP(e.target.value)}
                  placeholder="Ej: alias.mp"
                  style={{ 
                      flex: 1, 
                      padding: '12px 16px', 
                      borderRadius: '14px', 
                      border: '1px solid #cbd5e1', 
                      fontSize: '0.85rem', 
                      fontFamily: 'inherit',
                      outline: 'none',
                      color: 'var(--texto)',
                      background: '#f8fafc'
                  }}
              />
              <button 
                  onClick={guardarCuentaMercadoPago}
                  disabled={guardando}
                  style={{ 
                      background: 'var(--verde-logo)', 
                      color: 'white', 
                      border: 'none', 
                      padding: '0 20px', 
                      borderRadius: '14px', 
                      fontWeight: 700, 
                      fontSize: '0.85rem', 
                      cursor: 'pointer',
                      opacity: guardando ? 0.6 : 1,
                      transition: '0.2s'
                  }}
              >
                  {guardando ? '...' : 'Guardar'}
              </button>
          </div>
      </div>

      {/* --- ESTADÍSTICAS RÁPIDAS --- */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--blanco)', flex: '1 1 100px', padding: '15px', borderRadius: '20px', boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ minWidth: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--texto)', fontSize: '1.1rem' }}><i className="fa-solid fa-chart-line"></i></div>
              <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--gris-texto)', fontWeight: 700, textTransform: 'uppercase' }}>Este Mes</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: 'var(--texto)', marginTop: '2px' }}>
                    {formatearDinero(statsMesActual.ganancias)}
                  </strong>
              </div>
          </div>

          <div style={{ background: 'var(--blanco)', flex: '1 1 100px', padding: '15px', borderRadius: '20px', boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ minWidth: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--texto)', fontSize: '1.1rem' }}><i className="fa-solid fa-check-double"></i></div>
              <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--gris-texto)', fontWeight: 700, textTransform: 'uppercase' }}>Turnos</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: 'var(--texto)', marginTop: '2px' }}>
                    {statsMesActual.turnos}
                  </strong>
              </div>
          </div>

          <div style={{ background: 'var(--blanco)', flex: '1 1 100px', padding: '15px', borderRadius: '20px', boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ minWidth: '40px', height: '40px', borderRadius: '12px', background: '#e0f2fe', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0284c7', fontSize: '1.1rem' }}><i className="fa-solid fa-clipboard-check"></i></div>
              <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--gris-texto)', fontWeight: 700, textTransform: 'uppercase' }}>Aceptación</span>
                  <strong style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: 'var(--texto)', marginTop: '2px' }}>
                    {statsMesActual.aceptacion}%
                  </strong>
              </div>
          </div>
      </div>

      {/* --- HISTORIAL MENSUAL --- */}
      <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '15px', color: 'var(--texto)' }}>
          Resumen de Meses Anteriores
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
          {historialMensual.length > 0 ? (
            historialMensual.map((item, index) => (
                <div key={index} style={{ background: 'var(--blanco)', borderRadius: '18px', padding: '15px', boxShadow: 'var(--shadow-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--texto)', textTransform: 'capitalize' }}>{item.nombre}</h5>
                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>
                            <span style={{ marginRight: '10px' }}><i className="fa-solid fa-check" style={{ color: 'var(--verde-logo)' }}></i> {item.turnos} Turnos</span>
                            <span><i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i> {item.aceptacion}% OK</span>
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--texto)' }}>{formatearDinero(item.ganancias)}</span>
                    </div>
                </div>
            ))
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', textAlign: 'center', margin: '10px 0' }}>No hay historial de meses anteriores.</p>
          )}
      </div>

      {/* --- ÚLTIMOS MOVIMIENTOS --- */}
      <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--texto)' }}>
          Últimos Movimientos
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ultimosMovimientos.length > 0 ? (
            ultimosMovimientos.map(tx => (
                <div key={tx.id} style={{ background: 'var(--blanco)', borderRadius: '18px', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: '42px', height: '42px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.1rem', background: '#dcfce7', color: '#16a34a' }}>
                            <i className="fa-solid fa-arrow-down"></i>
                        </div>
                        <div>
                            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--texto)' }}>{tx.titulo}</h5>
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--gris-texto)' }}>{tx.paciente} • {tx.fecha}</p>
                        </div>
                    </div>
                    <div>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a' }}>
                          +{formatearDinero(tx.monto)}
                        </span>
                    </div>
                </div>
            ))
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', textAlign: 'center' }}>No hay movimientos recientes.</p>
          )}
      </div>

    </div>
  );
}