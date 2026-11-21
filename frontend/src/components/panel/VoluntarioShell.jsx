import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getMisPostulaciones } from '../../api.js';
import { Icon } from '../Icons.jsx';
import PanelLayout from './PanelLayout.jsx';
import { primerNombre } from './piezas.jsx';

const SECCION = { '/mi-espacio': 'Inicio', '/mis-postulaciones': 'Mis postulaciones', '/mi-perfil-voluntario': 'Mi perfil',
  '/verificar-telefono': 'Seguridad', '/instituciones/solicitar': 'Registrar institución' };

// Panel de voluntariado: el menú lateral se queda montado mientras se navega entre
// Inicio, Mis postulaciones, Mi perfil y Seguridad. Las postulaciones se consultan una
// vez aquí y se comparten con cada página (para el contador del menú).
export default function VoluntarioShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const esVoluntario = user?.roles?.includes('voluntario') ?? false;
  const [post, setPost] = useState({ cargando: esVoluntario, error: '', filas: [] });

  const recargar = useCallback(async () => {
    if (!esVoluntario) { setPost({ cargando: false, error: '', filas: [] }); return; }
    setPost((x) => ({ ...x, cargando: true, error: '' }));
    try {
      const r = await getMisPostulaciones();
      setPost({ cargando: false, error: '', filas: r.postulaciones || [] });
    } catch (e) { setPost({ cargando: false, error: e.message, filas: [] }); }
  }, [esVoluntario]);
  useEffect(() => { recargar(); }, [recargar]);

  const pendientes = post.filas.filter((p) => p.estado === 'pendiente').length;
  const nav = [
    { to: '/mi-espacio', label: 'Inicio', icon: 'grid', end: true },
    esVoluntario && { to: '/mis-postulaciones', label: 'Mis postulaciones', icon: 'flag', badge: pendientes ? String(pendientes) : null, badgeSr: `${pendientes} en revisión` },
    esVoluntario && { to: '/mi-perfil-voluntario', label: 'Mi perfil', icon: 'user' },
    { to: '/verificar-telefono', label: 'Seguridad', icon: 'shield' },
    { to: '/instituciones/solicitar', label: 'Registrar institución', icon: 'building' },
    { to: '/jornadas', label: 'Explorar jornadas', icon: 'calendar', externo: true, activo: false },
  ].filter(Boolean);

  const identidad = <div className="p-ident">
    <span className="p-ident-logo p-ident-logo--rombo"><Icon name="connect" size={20} /></span>
    <span className="p-ident-txt"><strong>{esVoluntario ? 'Voluntariado' : 'Mi cuenta'}</strong>
      <small><i className="p-punto" aria-hidden="true" /> Correo verificado</small></span>
  </div>;

  return <PanelLayout rol="voluntario" nav={nav} identidad={identidad}
    titulo={`Hola, ${primerNombre(user?.nombre)}`}
    migas={['Mi espacio', SECCION[pathname] || 'Inicio']}
    buscar={{ placeholder: 'Buscar jornadas, comunidades o instituciones…', onSubmit: (q) => navigate(q ? `/jornadas?buscar=${encodeURIComponent(q)}` : '/jornadas') }}
    avisos={esVoluntario ? { n: pendientes, to: '/mis-postulaciones', label: pendientes ? `${pendientes} postulaciones en revisión` : 'Sin avisos nuevos: ver mis postulaciones' } : undefined}>
    <Outlet context={{ postulaciones: post, recargar }} />
  </PanelLayout>;
}
