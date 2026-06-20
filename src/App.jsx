import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from './firebase/config';
import { pedirPermisoNotificaciones, escucharNotificacionesApp } from './hooks/usarNotificaciones.js';

import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import RegistroPaciente from './pages/RegistroPaciente.jsx';
import RegistroEnfermero from './pages/RegistroEnfermero.jsx';
import VerificacionDidit from './pages/VerificacionDidit.jsx';
import VerificacionPaciente from './pages/VerificacionPaciente.jsx';
import TerminosEnfermero from './pages/TerminosEnfermero.jsx';
import TerminosPaciente from './pages/TerminosPaciente.jsx';
import BienvenidaProfesional from './pages/BienvenidaProfesional.jsx';
import BienvenidaPaciente from './pages/BienvenidaPaciente.jsx';

import DashboardPaciente from './pages/Pacientes/DashboardPaciente.jsx';
import TurnosPaciente from './pages/Pacientes/TurnosPaciente.jsx';
import ContratarServicio from './pages/Pacientes/ContratarServicio.jsx';
import SeguimientoServicio from './pages/Pacientes/SeguimientoServicio.jsx';
import HistorialPaciente from './pages/Pacientes/HistorialPaciente.jsx';
import AgendaPaciente from './pages/Pacientes/AgendaPaciente.jsx';
import CentroAyuda from './pages/Pacientes/BarraLateral/CentroAyuda.jsx';
import FichaMedica from './pages/Pacientes/BarraLateral/FichaMedica.jsx';
import Notificaciones from './pages/Pacientes/BarraLateral/Notificaciones.jsx';
import PerfilPaciente from './pages/Pacientes/BarraLateral/PerfilPaciente.jsx';
import Terminos from './pages/Pacientes/BarraLateral/Terminos.jsx';
import DatosPersonales from './pages/Pacientes/BarraLateral/Perfil/DatosPersonales.jsx';
import MediosPago from './pages/Pacientes/BarraLateral/Perfil/MediosPago.jsx';
import MisDirecciones from './pages/Pacientes/BarraLateral/Perfil/MisDirecciones.jsx';
import TelefonosEmergencia from './pages/Pacientes/BarraLateral/Perfil/TelefonosEmergencia.jsx';

import DashboardProfesional from './pages/Profesionales/DashboardProfesional.jsx';
import ServicioActivoProfesional from './pages/Profesionales/ServicioActivoProfesional.jsx';
import AlertaProfesional from './pages/Profesionales/AlertaProfesional.jsx';
import ServiciosProfesional from './pages/Profesionales/ServiciosProfesional.jsx';
import AgendaProfesional from './pages/Profesionales/AgendaProfesional.jsx';
import IngresosProfesional from './pages/Profesionales/IngresosProfesional.jsx';
import PerfilProfesional from './pages/Profesionales/BarraLateral/PerfilProfesional.jsx';
import NotificacionesProfesional from './pages/Profesionales/BarraLateral/NotificacionesProfesional.jsx';
import TerminosProfesional from './pages/Profesionales/BarraLateral/Terminos.jsx';
import CentroAyudaProfesional from './pages/Profesionales/BarraLateral/CentroAyudaProfesional.jsx';
import DatosPersonalesProfesional from './pages/Profesionales/BarraLateral/Perfil/DatosPersonalesProfesional.jsx';
import ServiciosOfrezcoProfesional from './pages/Profesionales/BarraLateral/Perfil/ServiciosOfrezcoProfesional.jsx';
import ResenasProfesional from './pages/Profesionales/BarraLateral/Perfil/ResenasProfesional.jsx';

import AdminPanel from './pages/Admin/AdminPanel.jsx';
import AdminValidacion from './pages/Admin/AdminValidacion.jsx';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SidebarProfesional from './components/SidebarProfesional';
import HeaderProfesional from './components/HeaderProfesional';
import BottomNavProfesional from './components/BottomNavProfesional';

export default function App() {
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [subtext, setSubtext] = useState('Buscando tu ubicación...');
  const [estaOnline, setEstaOnline] = useState(() => localStorage.getItem('cuidaGo_estado') === 'true');
  const [userId, setUserId] = useState(null);
  const [tipoUsuario, setTipoUsuario] = useState(null);

  const estaOnlineRef = useRef(false);
  const watchIdRef = useRef(null);
  const primerAuthRef = useRef(true);

  const [userData, setUserData] = useState(() => {
    try {
      const cached = localStorage.getItem('cuidaGo_pacienteData');
      return cached ? JSON.parse(cached) : { nombre: 'Usuario', primerNombre: 'Usuario', foto: null, localidad: 'Buenos Aires' };
    } catch { return { nombre: 'Usuario', primerNombre: 'Usuario', foto: null, localidad: 'Buenos Aires' }; }
  });

  const [userDataPro, setUserDataPro] = useState(() => {
    try {
      const cached = localStorage.getItem('cuidaGo_enfermeroData');
      return cached ? JSON.parse(cached) : { nombre: 'Profesional', primerNombre: 'Profesional', foto: null, localidad: 'CABA' };
    } catch { return { nombre: 'Profesional', primerNombre: 'Profesional', foto: null, localidad: 'CABA' }; }
  });

  // Escucha notificaciones FCM mientras la app está abierta (foreground)
  useEffect(() => {
    escucharNotificacionesApp();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId(null);
        setTipoUsuario(null);
        setCargandoAuth(false);
        setCargandoUsuario(false);
        primerAuthRef.current = true;
        return;
      }
      setUserId(user.uid);

      try {
        const docPaciente = await getDoc(doc(db, "pacientes", user.uid));
        const docEnfermero = await getDoc(doc(db, "enfermeros", user.uid));

        if (docPaciente.exists()) {
          setTipoUsuario('paciente');
          const data = docPaciente.data();
          const nuevosDatosPaciente = {
            nombre: data.nombre,
            primerNombre: data.primerNombre || data.nombre?.split(' ')[0],
            foto: user.photoURL || data.foto || null,
            localidad: data.localidad || data.ciudad || 'Buenos Aires'
          };
          setUserData(nuevosDatosPaciente);
          localStorage.setItem('cuidaGo_pacienteData', JSON.stringify(nuevosDatosPaciente));
          setCargandoUsuario(false);
          setCargandoAuth(false);
          pedirPermisoNotificaciones();
        }

        if (docEnfermero.exists()) {
          setTipoUsuario('enfermero');
          const dataPro = docEnfermero.data();
          const nuevosDatosPro = {
            nombre: dataPro.nombre,
            primerNombre: dataPro.primerNombre || dataPro.nombre?.split(' ')[0],
            foto: user.photoURL || dataPro.foto || null,
            localidad: dataPro.localidad || dataPro.ciudad || 'CABA'
          };
          setUserDataPro(nuevosDatosPro);
          localStorage.setItem('cuidaGo_enfermeroData', JSON.stringify(nuevosDatosPro));
          setCargandoUsuario(false);
          setCargandoAuth(false);
          pedirPermisoNotificaciones();

          if (primerAuthRef.current) {
            primerAuthRef.current = false;
            // Sincronizar estado online desde Firestore (fuente de verdad)
            try {
              const enfDoc = await getDoc(doc(db, "enfermeros", user.uid));
              if (enfDoc.exists()) {
                const isOnlineFirestore = enfDoc.data().isOnline === true;
                setEstaOnline(isOnlineFirestore);
                estaOnlineRef.current = isOnlineFirestore;
                localStorage.setItem('cuidaGo_estado', isOnlineFirestore ? 'true' : 'false');
              }
            } catch (e) {
              // Si falla, dejar offline por seguridad
              setEstaOnline(false);
              estaOnlineRef.current = false;
              localStorage.setItem('cuidaGo_estado', 'false');
            }
          }
        } else {
          primerAuthRef.current = false;
          setCargandoAuth(false);
        }

      } catch (error) {
        console.error(error);
        setCargandoAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || tipoUsuario !== 'enfermero') return;

    // Sincronizar ref con el estado actual
    estaOnlineRef.current = estaOnline;

    if (estaOnline) {
      if (navigator.geolocation) {
        // Limpiar watch anterior si existe
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        // Primero una lectura inmediata para guardar ubicación sin esperar
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!estaOnlineRef.current) return;
            setDoc(doc(db, 'enfermeros', userId), {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              isOnline: true,
              lastUpdate: new Date().toISOString()
            }, { merge: true }).catch(err => console.error('GPS write error:', err));
          },
          (err) => console.error('GPS getCurrentPosition error:', err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
        // Luego watch continuo
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (!estaOnlineRef.current) return;
            setDoc(doc(db, 'enfermeros', userId), {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              isOnline: true,
              lastUpdate: new Date().toISOString()
            }, { merge: true }).catch(err => console.error('GPS write error:', err));
          },
          (err) => console.error('GPS error:', err),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }
    } else {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setDoc(doc(db, 'enfermeros', userId), {
        isOnline: false,
        lastUpdate: new Date().toISOString()
      }, { merge: true }).catch(err => console.error('Offline write error:', err));
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [estaOnline, userId, tipoUsuario]);

  const cambiarEstadoOnline = (nuevoEstado) => {
    estaOnlineRef.current = nuevoEstado;
    setEstaOnline(nuevoEstado);
    localStorage.setItem('cuidaGo_estado', nuevoEstado);
  };

  const cerrarSesion = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    estaOnlineRef.current = false;
    primerAuthRef.current = true;
    if (userId && tipoUsuario === 'enfermero') {
      try { await setDoc(doc(db, "enfermeros", userId), { isOnline: false }, { merge: true }); } catch (err) {}
    }
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    localStorage.removeItem('user_data_cache');
    localStorage.removeItem('cuidaGo_pacienteData');
    localStorage.removeItem('cuidaGo_enfermeroData');
    localStorage.setItem('cuidaGo_estado', 'false');
    setEstaOnline(false);
    setTipoUsuario(null);
    await signOut(auth);
    window.location.href = '/login';
  };

  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#1a535c' }}></i>
    </div>
  );

  const RequiereAuth = ({ children, tipo }) => {
    if (cargandoAuth) return <Spinner />;
    if (!userId || tipoUsuario !== tipo) return <Navigate to="/login" replace />;
    return children;
  };

  const LayoutAuth = ({ children }) => (
    <div style={{ minHeight: '100vh', width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {children}
      </div>
    </div>
  );

  const LayoutPaciente = ({ children }) => (
    <>
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} userData={userData} cerrarSesion={cerrarSesion} />
      <Header setIsSidebarOpen={setIsSidebarOpen} userData={userData} subtext={subtext} cargandoUsuario={cargandoUsuario} />
      <main className="content-scroll" style={{ padding: '0', height: 'calc(100vh - 85px)', overflowY: 'auto' }}>
        {children}
      </main>
      <BottomNav />
    </>
  );

  const LayoutSeguimiento = ({ children }) => (
    <>
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} userData={userData} cerrarSesion={cerrarSesion} />
      <Header setIsSidebarOpen={setIsSidebarOpen} userData={userData} subtext={subtext} cargandoUsuario={cargandoUsuario} />
      <main className="content-scroll" style={{ padding: '0', height: 'calc(100vh - 85px)', overflowY: 'auto' }}>
        {children}
      </main>
    </>
  );

  const LayoutProfesional = ({ children }) => (
    <>
      <SidebarProfesional
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        userData={userDataPro}
        estaOnline={estaOnline}
        setEstaOnline={cambiarEstadoOnline}
        cerrarSesion={cerrarSesion}
      />
      <HeaderProfesional setIsSidebarOpen={setIsSidebarOpen} userData={userDataPro} estaOnline={estaOnline} cargandoUsuario={cargandoUsuario} />
      <main className="content-scroll" style={{ padding: '0', height: 'calc(100vh - 85px)', overflowY: 'auto' }}>
        {children}
      </main>
      <BottomNavProfesional />
    </>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<LayoutAuth><Registro /></LayoutAuth>} />

        {/* Registro paciente */}
        <Route path="/registro/paciente/terminos" element={<LayoutAuth><TerminosPaciente /></LayoutAuth>} />
        <Route path="/registro/paciente" element={<LayoutAuth><RegistroPaciente /></LayoutAuth>} />
        <Route path="/verificacion-paciente" element={<VerificacionPaciente />} />
        <Route path="/bienvenida-paciente" element={<BienvenidaPaciente />} />

        {/* Registro enfermero */}
        <Route path="/registro/enfermero/terminos" element={<LayoutAuth><TerminosEnfermero /></LayoutAuth>} />
        <Route path="/registro/enfermero" element={<LayoutAuth><RegistroEnfermero /></LayoutAuth>} />
        <Route path="/verificacion" element={<VerificacionDidit />} />
        <Route path="/bienvenida-profesional" element={<BienvenidaProfesional />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/validacion" element={<AdminValidacion />} />

        {/* Rutas paciente — protegidas */}
        <Route path="/paciente/explorar" element={<RequiereAuth tipo="paciente"><LayoutPaciente><DashboardPaciente setGlobalSubtext={setSubtext} /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/turnos" element={<RequiereAuth tipo="paciente"><LayoutPaciente><TurnosPaciente /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/contratar-servicio" element={<RequiereAuth tipo="paciente"><LayoutPaciente><ContratarServicio /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/seguimiento" element={<RequiereAuth tipo="paciente"><LayoutSeguimiento><SeguimientoServicio /></LayoutSeguimiento></RequiereAuth>} />
        <Route path="/paciente/historial" element={<RequiereAuth tipo="paciente"><LayoutPaciente><HistorialPaciente /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/agenda" element={<RequiereAuth tipo="paciente"><LayoutPaciente><AgendaPaciente /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/perfil" element={<RequiereAuth tipo="paciente"><LayoutPaciente><PerfilPaciente userData={userData} /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/ficha-medica" element={<RequiereAuth tipo="paciente"><LayoutPaciente><FichaMedica /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/notificaciones" element={<RequiereAuth tipo="paciente"><LayoutPaciente><Notificaciones /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/ayuda" element={<RequiereAuth tipo="paciente"><LayoutPaciente><CentroAyuda /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/terminos" element={<RequiereAuth tipo="paciente"><LayoutPaciente><Terminos /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/datos-personales" element={<RequiereAuth tipo="paciente"><LayoutPaciente><DatosPersonales /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/direcciones" element={<RequiereAuth tipo="paciente"><LayoutPaciente><MisDirecciones /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/pagos" element={<RequiereAuth tipo="paciente"><LayoutPaciente><MediosPago /></LayoutPaciente></RequiereAuth>} />
        <Route path="/paciente/emergencia" element={<RequiereAuth tipo="paciente"><LayoutPaciente><TelefonosEmergencia /></LayoutPaciente></RequiereAuth>} />

        {/* Rutas profesional — protegidas */}
        <Route path="/profesional/dashboard" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><DashboardProfesional estaOnline={estaOnline} /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/alerta" element={<AlertaProfesional />} />
        <Route path="/profesional/servicio-activo" element={<ServicioActivoProfesional />} />
        <Route path="/profesional/servicios" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><ServiciosProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/agenda" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><AgendaProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/ingresos" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><IngresosProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/perfil" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><PerfilProfesional userData={userDataPro} /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/notificaciones" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><NotificacionesProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/terminos" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><TerminosProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/ayuda" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><CentroAyudaProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/datos-personales" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><DatosPersonalesProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/servicios-ofrezco" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><ServiciosOfrezcoProfesional /></LayoutProfesional></RequiereAuth>} />
        <Route path="/profesional/resenas" element={<RequiereAuth tipo="enfermero"><LayoutProfesional><ResenasProfesional /></LayoutProfesional></RequiereAuth>} />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/paciente" element={<Navigate to="/paciente/explorar" />} />
        <Route path="/profesional" element={<Navigate to="/profesional/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
