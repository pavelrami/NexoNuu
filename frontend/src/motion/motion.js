// Nexo Ñuu · sistema de movimiento
// GSAP 3.13.0 (ScrollTrigger + SplitText) y Lenis 1.3.11, versiones fijas en package.json.
// Regla de oro: el contenido nunca depende de la animación. Si algo falla o la persona
// pidió menos movimiento, todo queda visible y quieto.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const mq = (query) => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia(query).matches : false;

export const RM = mq('(prefers-reduced-motion: reduce)');            // pidió menos movimiento
export const FINE = mq('(hover: hover) and (pointer: fine)');         // mouse o trackpad real
export const SMALL = () => (typeof window !== 'undefined' ? window.innerWidth < 760 : false);

// Tokens de movimiento de la marca: "cercana, clara, tejida".
// Pareja CSS en styles.css (--ease, --ease-io, --ease-pop, --dur, --dist).
export const M = {
  ease: 'power3.out',       // entradas: cubic-bezier(.25,1,.5,1)
  easeIO: 'power2.inOut',   // menú, paneles: cubic-bezier(.65,0,.35,1)
  pop: 'back.out(1.35)',    // piezas pequeñas: nodos, personaje, sellos
  dur: 1,                   // segundos de una entrada
  stagger: 0.085,           // respiración entre piezas
  dist: 26,                 // píxeles que recorre un revelado
  lerp: 0.1,                // inercia de Lenis
};

export const safe = (fn) => {
  try { return fn(); } catch (error) { console.warn('[nexo-movimiento]', error); return undefined; }
};

/* ---------- Lenis conectado a ScrollTrigger ---------- */
let lenis = null;
const raf = (time) => { if (lenis) lenis.raf(time * 1000); };

export function initLenis() {
  if (lenis || RM || !M.lerp || typeof window === 'undefined') return lenis;
  safe(() => {
    lenis = new Lenis({ lerp: M.lerp, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
  });
  return lenis;
}

export const getLenis = () => lenis;

export function lockScroll(locked) {
  document.documentElement.classList.toggle('scroll-lock', locked);
  if (lenis) (locked ? lenis.stop() : lenis.start());
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export function scrollToElement(el, offset = -96) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.3 });
  else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  }
}

/* ---------- Refresco agrupado de ScrollTrigger ---------- */
let refreshTimer = 0;
export function requestRefresh(delay = 120) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => safe(() => ScrollTrigger.refresh()), delay);
}

let observing = false;
export function watchLayout() {
  if (observing || typeof ResizeObserver === 'undefined') return;
  observing = true;
  // El contenido que llega de la API cambia la altura de la página: recalculamos los disparadores.
  const ro = new ResizeObserver(() => requestRefresh(180));
  ro.observe(document.body);
}

/* ---------- Ingredientes por atributos data- ---------- */
// data-reveal            sube y aparece (valores: up | left | right | scale | fade)
// data-split             título por líneas desde una ranura (data-split="words" para frases cortas)
// data-draw              trazos de la marca que se dibujan (data-draw-scrub = avanza con el scroll)
// data-rombo             imagen que se abre en forma de rombo, la ventana de la marca
// data-pop               pieza pequeña que se posa con un rebote corto
// data-count             número que cuenta hasta su valor (data-decimals)
// data-grow              barra que crece de izquierda a derecha
// data-speed             capa con parallax suave (positivo baja, negativo sube)

const FROM = {
  up: () => ({ y: M.dist, opacity: 0 }),
  left: () => ({ x: -M.dist * 1.4, opacity: 0 }),
  right: () => ({ x: M.dist * 1.4, opacity: 0 }),
  scale: () => ({ scale: 0.94, y: M.dist * 0.5, opacity: 0 }),
  fade: () => ({ opacity: 0 }),
};

const pick = (root, selector, marked) => Array.from(root.querySelectorAll(selector)).filter((el) => {
  if (el.dataset.mDone) return false;
  el.dataset.mDone = '1';
  marked.push(el);
  return true;
});

export function drawPrep(paths) {
  paths.forEach((p) => {
    const L = p.getTotalLength ? p.getTotalLength() : 0;
    const w = parseFloat(getComputedStyle(p).strokeWidth) || 2;
    gsap.set(p, { strokeDasharray: `${L} ${L + w + 2}`, strokeDashoffset: L + w + 2 });
  });
}

const drawTargets = (svg) => {
  const custom = svg.querySelectorAll('.dr');
  return Array.from(custom.length ? custom : svg.querySelectorAll('path, line, polyline, circle, ellipse, rect'));
};

export const ROMBO_CERRADO = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
export const ROMBO_ABIERTO = 'polygon(50% -62%, 162% 50%, 50% 162%, -62% 50%)';

export function animateAttributes(root, marked = []) {
  if (RM || !root) return marked;

  // 1. Revelados en cascada
  const reveals = pick(root, '[data-reveal]', marked);
  reveals.forEach((el) => gsap.set(el, (FROM[el.dataset.reveal] || FROM.up)()));
  if (reveals.length) {
    ScrollTrigger.batch(reveals, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => gsap.to(batch, {
        x: 0, y: 0, scale: 1, opacity: 1,
        duration: M.dur, ease: M.ease,
        stagger: Math.min(M.stagger, 0.6 / batch.length),
        overwrite: true, clearProps: 'transform,opacity',
      }),
    });
  }

  // 2. Títulos por líneas
  pick(root, '[data-split]', marked).forEach((el) => safe(() => {
    const mode = el.dataset.split === 'words' ? 'words' : 'lines';
    SplitText.create(el, {
      type: mode,
      mask: mode,
      linesClass: 'linea',
      wordsClass: 'palabra',
      autoSplit: true,
      onSplit: (self) => gsap.from(self[mode], {
        yPercent: mode === 'lines' ? 128 : 120,
        duration: M.dur * (mode === 'lines' ? 1.05 : 0.9),
        stagger: M.stagger * (mode === 'lines' ? 1.2 : 0.5),
        ease: M.ease,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      }),
    });
  }));

  // 3. Trazos que se dibujan
  pick(root, '[data-draw], [data-draw-scrub]', marked).forEach((svg) => safe(() => {
    const lines = drawTargets(svg);
    if (!lines.length) return;
    drawPrep(lines);
    const scrub = svg.hasAttribute('data-draw-scrub');
    gsap.to(lines, {
      strokeDashoffset: 0,
      duration: M.dur * 1.5,
      stagger: M.stagger,
      ease: scrub ? 'none' : M.ease,
      scrollTrigger: scrub
        ? { trigger: svg, start: 'top 88%', end: 'bottom 45%', scrub: 0.6 }
        : { trigger: svg, start: 'top 90%', once: true },
    });
  }));

  // 4. Aperturas en rombo
  pick(root, '[data-rombo]', marked).forEach((el) => {
    gsap.fromTo(el, { clipPath: ROMBO_CERRADO }, {
      clipPath: ROMBO_ABIERTO,
      duration: M.dur * 1.25,
      ease: 'power2.out',
      clearProps: 'clipPath',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // 5. Piezas que se posan
  pick(root, '[data-pop]', marked).forEach((el) => {
    gsap.fromTo(el, { scale: 0.7, opacity: 0 }, {
      scale: 1, opacity: 1, duration: M.dur * 0.8, ease: M.pop, clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });

  // 6. Contadores
  pick(root, '[data-count]', marked).forEach((el) => {
    const target = parseFloat(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const decimals = Number(el.dataset.decimals || 0);
    const fmt = new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    // El valor final sale del atributo, no del texto: así un montaje doble nunca deja el contador en cero.
    const final = fmt.format(target);
    const state = { v: 0 };
    el.textContent = fmt.format(0);
    gsap.to(state, {
      v: target, duration: M.dur * 1.8, ease: 'power2.out',
      onUpdate: () => { el.textContent = fmt.format(state.v); },
      onComplete: () => { el.textContent = final; },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  // 7. Barras que crecen
  pick(root, '[data-grow]', marked).forEach((el) => {
    gsap.fromTo(el, { scaleX: 0 }, {
      scaleX: 1, transformOrigin: '0% 50%', duration: M.dur * 1.4, ease: M.ease,
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });

  // 8. Parallax suave por capas
  pick(root, '[data-speed]', marked).forEach((el) => {
    const s = parseFloat(el.dataset.speed) || 0;
    const amp = (SMALL() ? 40 : 90) * s;
    gsap.fromTo(el, { y: -amp }, {
      y: amp, ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  return marked;
}

export { gsap, ScrollTrigger, SplitText };
