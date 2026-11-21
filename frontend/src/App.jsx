import { useEffect, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Jornadas from './pages/Jornadas.jsx';
import DetalleJornada from './pages/DetalleJornada.jsx';
import MisPostulaciones from './pages/MisPostulaciones.jsx';
import Voluntariado from './pages/Voluntariado.jsx';
import Instituciones from './pages/Instituciones.jsx';
import SolicitarInstitucion from './pages/SolicitarInstitucion.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import PanelInstitucional from './pages/PanelInstitucional.jsx';
import Seguimiento from './pages/Seguimiento.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import VerificarCorreo from './pages/VerificarCorreo.jsx';
import MiEspacio from './pages/MiEspacio.jsx';
import PerfilVoluntario from './pages/PerfilVoluntario.jsx';
import VerificarTelefono from './pages/VerificarTelefono.jsx';
import OlvideContrasena from './pages/OlvideContrasena.jsx';
import RestablecerContrasena from './pages/RestablecerContrasena.jsx';
import CuentaShell, { IrAlPanel, SoloRepresentantes, SoloVoluntariado } from './components/panel/CuentaShell.jsx';
import { panelDe } from './components/panel/navegacion.js';
import { PanelEspera } from './components/panel/PanelLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { gsap, RM, initLenis, requestRefresh, safe, scrollToTop, watchLayout } from './motion/motion.js';
import './panel.css';

// Rutas privadas que se muestran como panel (menú lateral, sin la cabecera pública).
const PANEL = ['/panel', '/mi-espacio', '/mis-postulaciones', '/mi-perfil-voluntario', '/verificar-telefono', '/instituciones/solicitar', '/panel-institucional', '/admin'];
const esPanel = (p) => PANEL.some((r) => p === r || p.startsWith(`${r}/`));

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PanelEspera />;
  return user ? children : <Navigate to="/iniciar-sesion" replace />;
}

function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PanelEspera texto="Comprobando permisos…" />;
  if (!user) return <Navigate to="/iniciar-sesion" replace />;
  // Sin permisos de administración: cada quien vuelve a su propio panel.
  return user.roles?.includes('administrador') ? children : <Navigate to={panelDe(user)} replace />;
}

export default function App() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);

  useEffect(() => { initLenis(); watchLayout(); }, []);

  // Cada cambio de página: arriba, sin brincos, y una entrada corta del contenido.
  useLayoutEffect(() => {
    scrollToTop();
    if (!RM && mainRef.current) {
      safe(() => gsap.fromTo(mainRef.current, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out', clearProps: 'opacity' }));
    }
    requestRefresh(60);
  }, [pathname]);

  const rutas = <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/jornadas" element={<Jornadas/>}/>
    <Route path="/jornadas/:id" element={<DetalleJornada/>}/>
    <Route path="/voluntariado" element={<Voluntariado/>}/>
    <Route path="/instituciones" element={<Instituciones/>}/>
    <Route path="/seguimiento" element={<Seguimiento/>}/>
    <Route path="/iniciar-sesion" element={<Login/>}/>
    <Route path="/registro" element={<Registro/>}/>
    <Route path="/verificar-correo" element={<VerificarCorreo/>}/>
    <Route path="/olvide-contrasena" element={<OlvideContrasena/>}/>
    <Route path="/restablecer-contrasena" element={<RestablecerContrasena/>}/>
    {/* Al entrar, cada cuenta va al panel de su rol */}
    <Route path="/panel" element={<Private><IrAlPanel/></Private>}/>
    {/* Páginas de cuenta: el menú lateral se queda montado entre ellas.
        Mi espacio, Mis postulaciones y Mi perfil son solo de voluntariado. */}
    <Route element={<Private><CuentaShell/></Private>}>
      <Route path="/mi-espacio" element={<SoloVoluntariado><MiEspacio/></SoloVoluntariado>}/>
      <Route path="/mis-postulaciones" element={<SoloVoluntariado><MisPostulaciones/></SoloVoluntariado>}/>
      <Route path="/mi-perfil-voluntario" element={<SoloVoluntariado><PerfilVoluntario/></SoloVoluntariado>}/>
      <Route path="/verificar-telefono" element={<VerificarTelefono/>}/>
      <Route path="/instituciones/solicitar" element={<SolicitarInstitucion/>}/>
    </Route>
    <Route path="/panel-institucional" element={<Private><SoloRepresentantes><PanelInstitucional/></SoloRepresentantes></Private>}/>
    <Route path="/admin" element={<AdminOnly><AdminPanel/></AdminOnly>}/>
    <Route path="/admin/instituciones" element={<AdminOnly><AdminPanel inicial="instituciones"/></AdminOnly>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;

  if (esPanel(pathname)) return rutas;
  return <><Header/><main id="contenido" ref={mainRef} tabIndex={-1}>{rutas}</main><Footer/></>;
}
