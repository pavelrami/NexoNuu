// A qué panel pertenece cada cuenta y qué secciones lleva su menú lateral.
// Toda cuenta nueva empieza como voluntariado; la administración le suma después
// el rol de institución (representante) o de administración. Manda el rol más alto.

export function rolPrincipal(user) {
  const roles = user?.roles || [];
  if (roles.includes('administrador')) return 'admin';
  if (roles.includes('representante')) return 'institucion';
  return 'voluntario';
}

export const INICIO_PANEL = { admin: '/admin', institucion: '/panel-institucional', voluntario: '/mi-espacio' };
export const NOMBRE_PANEL = { admin: 'Administración', institucion: 'Panel institucional', voluntario: 'Mi espacio' };
export const panelDe = (user) => INICIO_PANEL[rolPrincipal(user)];

const SEGURIDAD = { to: '/verificar-telefono', label: 'Seguridad', icon: 'shield' };
const PUBLICAS = { to: '/jornadas', label: 'Jornadas públicas', icon: 'globe', externo: true, activo: false };

// `vista` es la sección abierta dentro del panel; en páginas compartidas (Seguridad) va en null.
export function navInstitucion({ vista = null, publicadas = 0, pendientes = 0 } = {}) {
  const B = INICIO_PANEL.institucion;
  return [
    { to: B, label: 'Panel general', icon: 'grid', activo: vista === 'general' },
    { to: `${B}?vista=jornadas`, label: 'Jornadas', icon: 'calendar', activo: vista === 'jornadas', badge: publicadas ? `${publicadas} ${publicadas === 1 ? 'activa' : 'activas'}` : null },
    { to: `${B}?vista=postulaciones`, label: 'Postulaciones', icon: 'inbox', activo: vista === 'postulaciones', badge: pendientes ? String(pendientes) : null, badgeSr: `${pendientes} por revisar`, tono: 'alerta' },
    { to: `${B}?vista=nueva`, label: 'Nueva jornada', icon: 'plus', activo: vista === 'nueva' },
    { to: `${B}?vista=seguimiento`, label: 'Seguimiento', icon: 'follow', activo: vista === 'seguimiento' },
    { to: '/instituciones/solicitar', label: 'Solicitudes institucionales', icon: 'building' },
    SEGURIDAD,
    PUBLICAS,
  ];
}

export function navAdmin({ vista = null, resumen = null, solicitudes = 0 } = {}) {
  const cuenta = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  return [
    { to: '/admin', label: 'Panel central', icon: 'grid', activo: vista === 'resumen' },
    { to: '/admin?vista=instituciones', label: 'Instituciones verificadas', icon: 'building', activo: vista === 'instituciones', sub: resumen ? cuenta(resumen.instituciones_verificadas, 'activa', 'activas') : null },
    { to: '/admin?vista=jornadas', label: 'Gestión de jornadas', icon: 'calendar', activo: vista === 'jornadas', sub: resumen ? `${resumen.jornadas_publicadas} en curso` : null },
    { to: '/admin?vista=usuarios', label: 'Usuarios y voluntariado', icon: 'users', activo: vista === 'usuarios', sub: resumen ? cuenta(resumen.usuarios, 'cuenta registrada', 'cuentas registradas') : null },
    { to: '/admin?vista=solicitudes', label: 'Validaciones', icon: 'flag', activo: vista === 'solicitudes', sub: 'Instituciones y representantes', badge: solicitudes ? String(solicitudes) : null, badgeSr: `${solicitudes} pendientes`, tono: 'alerta' },
    SEGURIDAD,
    PUBLICAS,
  ];
}

export function navVoluntariado({ esVoluntario = true, pendientes = 0 } = {}) {
  return [
    { to: '/mi-espacio', label: 'Inicio', icon: 'grid', end: true },
    esVoluntario && { to: '/mis-postulaciones', label: 'Mis postulaciones', icon: 'flag', badge: pendientes ? String(pendientes) : null, badgeSr: `${pendientes} en revisión` },
    esVoluntario && { to: '/mi-perfil-voluntario', label: 'Mi perfil', icon: 'user' },
    SEGURIDAD,
    { to: '/instituciones/solicitar', label: 'Registrar institución', icon: 'building' },
    { to: '/jornadas', label: 'Explorar jornadas', icon: 'calendar', externo: true, activo: false },
  ].filter(Boolean);
}
