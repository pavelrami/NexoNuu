import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Jornadas from './pages/Jornadas.jsx';
import Voluntariado from './pages/Voluntariado.jsx';
import Instituciones from './pages/Instituciones.jsx';
import Seguimiento from './pages/Seguimiento.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import VerificarCorreo from './pages/VerificarCorreo.jsx';
import MiEspacio from './pages/MiEspacio.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <section className="container inner-page">Comprobando sesión…</section>;
  return user ? children : <Navigate to="/iniciar-sesion" replace/>;
}

export default function App() {
  return <><Header/><main id="contenido"><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/jornadas" element={<Jornadas/>}/>
    <Route path="/voluntariado" element={<Voluntariado/>}/>
    <Route path="/instituciones" element={<Instituciones/>}/>
    <Route path="/seguimiento" element={<Seguimiento/>}/>
    <Route path="/iniciar-sesion" element={<Login/>}/>
    <Route path="/registro" element={<Registro/>}/>
    <Route path="/verificar-correo" element={<VerificarCorreo/>}/>
    <Route path="/mi-espacio" element={<Private><MiEspacio/></Private>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main><Footer/></>;
}
