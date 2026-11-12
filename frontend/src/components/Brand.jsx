import { Link } from 'react-router-dom';

export default function Brand() {
  return <Link to="/" className="brand" aria-label="Nexo Ñuu, ir al inicio">
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" focusable="false">
        <path d="M24 2 45 24 24 46 3 24Z" stroke="currentColor" strokeWidth="3"/>
        <path d="M12 12 36 36M36 12 12 36M4 24h40M24 4v40" stroke="#E7B965" strokeWidth="3"/>
      </svg>
    </span>
    <span>Nexo <strong>Ñuu</strong></span>
  </Link>;
}
