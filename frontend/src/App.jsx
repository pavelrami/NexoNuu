import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Jornadas from './pages/Jornadas.jsx';
import Voluntariado from './pages/Voluntariado.jsx';
import Instituciones from './pages/Instituciones.jsx';
import Seguimiento from './pages/Seguimiento.jsx';

export default function App() {
  return <><Header/><main id="contenido"><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/jornadas" element={<Jornadas/>}/>
    <Route path="/voluntariado" element={<Voluntariado/>}/>
    <Route path="/instituciones" element={<Instituciones/>}/>
    <Route path="/seguimiento" element={<Seguimiento/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main><Footer/></>;
}
