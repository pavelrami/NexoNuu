export function Icon({ name, size = 26 }) {
  const shared = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const icons = {
    awareness: <><path d="M3 11v2m3-4 9-4v14l-9-4H3V9h3Z"/><path d="M7 15 9 21h3"/><path d="M19 8l2-2M19 16l2 2"/></>,
    info: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    connect: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2 20c0-4 3-6 6-6s6 2 6 6M14 15c4-1 8 2 8 5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15l3 3 5-5"/></>,
    follow: <><path d="M4 20V8M10 20V14M16 20V10M22 20V4"/><path d="m3 11 6-4 5 3 7-7"/></>,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6"/></>,
    book: <><path d="M12 6C9 3.8 6 3.4 2 4v14c4-.6 7 0 10 2 3-2 6-2.6 10-2V4c-4-.6-7-.2-10 2Z"/><path d="M12 6v14"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  };
  return <svg {...shared}>{icons[name] || icons.info}</svg>;
}
