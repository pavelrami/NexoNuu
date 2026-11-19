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
import AdminInstituciones from './pages/AdminInstituciones.jsx';
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
import { useAuth } from './context/AuthContext.jsx';
import { gsap, M, RM, initLenis, requestRefresh, safe, scrollToTop, watchLayout } from './motion/motion.js';
import { useMotion } from './motion/useMotion.js';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="container inner-page"><p role="status">Comprobando sesión…</p></section>;
  return user ? children : <Navigate to="/iniciar-sesion" replace/>;
}

function AdminOnly({children}) {
  const {user,loading}=useAuth();
  if(loading)return <section className="container inner-page"><p role="status">Comprobando permisos…</p></section>;
  if(!user)return <Navigate to="/iniciar-sesion" replace/>;
  return user.roles?.includes('administrador') ? children : <section className="container inner-page"><h1>Acceso restringido</h1><p>Esta página requiere una cuenta administradora autorizada.</p></section>;
}

// Las páginas privadas y de gestión entran con un revelado discreto por bloques.
function Suave({ children }) {
  const ref = useRef(null);
  useMotion(ref, ({ root }) => {
    const bloques = root.querySelectorAll('.inner-page > *, .auth-page > *');
    gsap.from(bloques, { y: M.dist * 0.6, opacity: 0, duration: M.dur * 0.8, ease: M.ease, stagger: 0.06, clearProps: 'transform,opacity' });
  }, []);
  return <div ref={ref}>{children}</div>;
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

  return <><Header/><main id="contenido" ref={mainRef} tabIndex={-1}><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/jornadas" element={<Jornadas/>}/>
    <Route path="/jornadas/:id" element={<DetalleJornada/>}/>
    <Route path="/mis-postulaciones" element={<Private><Suave><MisPostulaciones/></Suave></Private>}/>
    <Route path="/voluntariado" element={<Voluntariado/>}/>
    <Route path="/instituciones" element={<Instituciones/>}/>
    <Route path="/instituciones/solicitar" element={<Private><Suave><SolicitarInstitucion/></Suave></Private>}/>
    <Route path="/panel-institucional" element={<Private><Suave><PanelInstitucional/></Suave></Private>}/>
    <Route path="/admin/instituciones" element={<AdminOnly><Suave><AdminInstituciones/></Suave></AdminOnly>}/>
    <Route path="/seguimiento" element={<Seguimiento/>}/>
    <Route path="/iniciar-sesion" element={<Login/>}/>
    <Route path="/registro" element={<Registro/>}/>
    <Route path="/verificar-correo" element={<Suave><VerificarCorreo/></Suave>}/>
    <Route path="/olvide-contrasena" element={<Suave><OlvideContrasena/></Suave>}/>
    <Route path="/restablecer-contrasena" element={<Suave><RestablecerContrasena/></Suave>}/>
    <Route path="/verificar-telefono" element={<Private><Suave><VerificarTelefono/></Suave></Private>}/>
    <Route path="/mi-espacio" element={<Private><Suave><MiEspacio/></Suave></Private>}/>
    <Route path="/mi-perfil-voluntario" element={<Private><Suave><PerfilVoluntario/></Suave></Private>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main><Footer/></>;
}
