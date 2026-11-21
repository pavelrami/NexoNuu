import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getMisPostulaciones } from '../../api.js';
import { Icon } from '../Icons.jsx';
import PanelLayout from './PanelLayout.jsx';
import { primerNombre } from './piezas.jsx';
import { navAdmin, navInstitucion, navVoluntariado, panelDe, rolPrincipal } from './navegacion.js';

const SECCION = { '/mi-espacio': 'Inicio', '/mis-postulaciones': 'Mis postulaciones', '/mi-perfil-voluntario': 'Mi perfil',
  '/verificar-telefono': 'Seguridad', '/instituciones/solicitar': 'Solicitudes institucionales' };
const AREA = { voluntario: 'Mi espacio', institucion: 'Área institucional', admin: 'Administración' };

// Marco de las páginas de cuenta. Mi espacio, Mis postulaciones y Mi perfil son solo de voluntariado;
// Seguridad y Solicitudes institucionales se muestran dentro del panel del rol de cada persona.
export default function CuentaShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rol = rolPrincipal(user);
  const esVoluntario = rol === 'voluntario' && (user?.roles?.includes('voluntario') ?? false);
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
  const seccion = SECCION[pathname] || 'Inicio';
  const comun = { titulo: `Hola, ${primerNombre(user?.nombre)}`, migas: [AREA[rol], seccion] };

  if (rol === 'institucion') {
    return <PanelLayout rol="institucion" nav={navInstitucion()} {...comun}
      identidad={<div className="p-ident"><span className="p-ident-logo" aria-hidden="true"><Icon name="building" size={20} /></span>
        <span className="p-ident-txt"><strong>Área institucional</strong><small><i className="p-punto" aria-hidden="true" /> Representación autorizada</small></span></div>}>
      <Outlet context={{ postulaciones: post, recargar }} />
    </PanelLayout>;
  }
  if (rol === 'admin') {
    return <PanelLayout rol="admin" nav={navAdmin()} {...comun}
      identidad={<div className="p-ident"><span className="p-ident-logo p-ident-logo--admin" aria-hidden="true"><Icon name="shield" size={20} /></span>
        <span className="p-ident-txt"><strong>Administración general</strong><small><i className="p-punto" aria-hidden="true" /> Permisos de administración</small></span></div>}>
      <Outlet context={{ postulaciones: post, recargar }} />
    </PanelLayout>;
  }
  return <PanelLayout rol="voluntario" nav={navVoluntariado({ esVoluntario, pendientes })} {...comun}
    identidad={<div className="p-ident">
      <span className="p-ident-logo p-ident-logo--rombo"><Icon name="connect" size={20} /></span>
      <span className="p-ident-txt"><strong>{esVoluntario ? 'Voluntariado' : 'Mi cuenta'}</strong>
        <small><i className="p-punto" aria-hidden="true" /> Correo verificado</small></span>
    </div>}
    buscar={{ placeholder: 'Buscar jornadas, comunidades o instituciones…', onSubmit: (q) => navigate(q ? `/jornadas?buscar=${encodeURIComponent(q)}` : '/jornadas') }}
    avisos={esVoluntario ? { n: pendientes, to: '/mis-postulaciones', label: pendientes ? `${pendientes} postulaciones en revisión` : 'Sin avisos nuevos: ver mis postulaciones' } : undefined}>
    <Outlet context={{ postulaciones: post, recargar }} />
  </PanelLayout>;
}

// Mi espacio y sus páginas existen solo para voluntariado: cualquier otro rol va a su propio panel.
export function SoloVoluntariado({ children }) {
  const { user } = useAuth();
  return rolPrincipal(user) === 'voluntario' ? children : <Navigate to={panelDe(user)} replace />;
}

// /panel lleva a cada quien a su panel (lo usa el regreso del acceso con Google).
export function IrAlPanel() {
  const { user } = useAuth();
  return <Navigate to={panelDe(user)} replace />;
}

// El panel institucional es solo para representantes autorizados.
export function SoloRepresentantes({ children }) {
  const { user } = useAuth();
  return user?.roles?.includes('representante') ? children : <Navigate to={panelDe(user)} replace />;
}
