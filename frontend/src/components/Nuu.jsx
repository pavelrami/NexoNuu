import { useId } from 'react';

// Ñuu, el personaje de la marca (redibujado en vector a partir del logo entregado).
// Sus ojos cerrados se conservan: está tranquilo, respira lento.
export default function Nuu({ className = '', label }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`nuu ${className}`} viewBox="270 222 720 620" focusable="false"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <defs>
      <linearGradient id={`nuu-g-${id}`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#e3f5ee" />
        <stop offset="1" stopColor="#b3e1cf" />
      </linearGradient>
    </defs>
    <g className="nuu-cuerpo">
      <path className="nuu-forma" fill={`url(#nuu-g-${id})`} d="M400 342C450 330 520 360 580 368C680 380 760 270 860 250C935 236 975 290 968 370C960 470 890 600 862 700C848 750 845 800 800 812C760 822 735 780 715 745C700 720 685 690 662 690C630 690 600 740 575 770C540 812 470 830 452 770C445 740 455 712 462 700C420 725 360 755 320 735C280 715 285 660 320 625C370 575 440 535 500 518C440 528 365 530 335 480C305 430 330 360 400 342Z" />
      <path className="nuu-brillo" d="M362 392C380 372 410 366 440 372M560 392C640 404 720 330 830 290" />
      <g className="nuu-ojos">
        <path d="M722 382C720 410 760 425 786 410" />
        <path d="M818 448C815 480 848 497 872 480" />
        <path d="M741 466C740 491 760 499 777 490" />
        <path d="M386 384C398 380 412 384 420 396" />
        <path d="M372 410C384 420 398 423 407 420" />
        <path d="M792 742C782 755 786 770 794 776" />
        <path d="M808 738C803 750 806 760 812 765" />
      </g>
    </g>
  </svg>;
}
