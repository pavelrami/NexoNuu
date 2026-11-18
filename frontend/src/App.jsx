import { Routes, Route, Navigate } from 'react-router-dom';
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

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="container inner-page">Comprobando sesión…</section>;
  return user ? children : <Navigate to="/iniciar-sesion" replace/>;
}

function AdminOnly({children}) {
  const {user,loading}=useAuth();
  if(loading)return <section className="container inner-page">Comprobando permisos...</section>;
  if(!user)return <Navigate to="/iniciar-sesion" replace/>;
  return user.roles?.includes('administrador') ? children : <section className="container inner-page"><h1>Acceso restringido</h1><p>Esta página requiere una cuenta administradora autorizada.</p></section>;
}

export default function App() {
  return <><Header/><main id="contenido"><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/jornadas" element={<Jornadas/>}/>
    <Route path="/jornadas/:id" element={<DetalleJornada/>}/>
    <Route path="/mis-postulaciones" element={<Private><MisPostulaciones/></Private>}/>
    <Route path="/voluntariado" element={<Voluntariado/>}/>
    <Route path="/instituciones" element={<Instituciones/>}/>
    <Route path="/instituciones/solicitar" element={<Private><SolicitarInstitucion/></Private>}/>
    <Route path="/panel-institucional" element={<Private><PanelInstitucional/></Private>}/>
    <Route path="/admin/instituciones" element={<AdminOnly><AdminInstituciones/></AdminOnly>}/>
    <Route path="/seguimiento" element={<Seguimiento/>}/>
    <Route path="/iniciar-sesion" element={<Login/>}/>
    <Route path="/registro" element={<Registro/>}/>
    <Route path="/verificar-correo" element={<VerificarCorreo/>}/>
    <Route path="/olvide-contrasena" element={<OlvideContrasena/>}/>
    <Route path="/restablecer-contrasena" element={<RestablecerContrasena/>}/>
    <Route path="/verificar-telefono" element={<Private><VerificarTelefono/></Private>}/>
    <Route path="/mi-espacio" element={<Private><MiEspacio/></Private>}/>
    <Route path="/mi-perfil-voluntario" element={<Private><PerfilVoluntario/></Private>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main><Footer/></>;
}
