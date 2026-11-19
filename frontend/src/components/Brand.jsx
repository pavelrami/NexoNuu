import { Link } from 'react-router-dom';

// Isotipo de Nexo Ñuu: un rombo tejido con cuatro hilos que se cruzan.
// Cada trazo es su propio <path> para que pueda dibujarse (la firma de la marca).
export function Isotipo({ className = '', title }) {
  return <svg className={`isotipo ${className}`} viewBox="0 0 48 48" fill="none" focusable="false"
    aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
    {title && <title>{title}</title>}
    <path className="iso-rombo" d="M24 2 45 24 24 46 3 24Z" />
    <path className="iso-hilo" d="M12 12 36 36" />
    <path className="iso-hilo" d="M36 12 12 36" />
    <path className="iso-hilo" d="M4 24h40" />
    <path className="iso-hilo" d="M24 4v40" />
  </svg>;
}

export default function Brand({ to = '/', onClick, className = '' }) {
  return <Link to={to} onClick={onClick} className={`brand ${className}`} aria-label="Nexo Ñuu, ir al inicio">
    <span className="brand-mark" aria-hidden="true"><Isotipo /></span>
    <span className="brand-name">Nexo <strong>Ñuu</strong></span>
  </Link>;
}
