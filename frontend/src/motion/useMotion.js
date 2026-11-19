import { useLayoutEffect } from 'react';
import { gsap, RM, safe, animateAttributes, requestRefresh } from './motion.js';

/**
 * Anima lo que esté marcado con atributos data- dentro de `scopeRef`.
 * `setup({ root, ctx })` sirve para coreografías propias (por ejemplo, la firma del inicio);
 * puede devolver una función de limpieza. Lo asíncrono se registra con ctx.add().
 * Todo vive dentro de gsap.context: al salir de la página se revierte y no deja basura.
 * Con "reducir movimiento" no se oculta ni se mueve nada.
 */
export function useMotion(scopeRef, setup, deps = []) {
  useLayoutEffect(() => {
    const root = scopeRef.current;
    if (!root) return undefined;
    const marked = [];
    let cleanup;
    const ctx = gsap.context((self) => {
      if (RM) return;
      if (setup) cleanup = safe(() => setup({ root, ctx: self }));
      safe(() => animateAttributes(root, marked));
    }, root);
    requestRefresh();
    return () => {
      if (typeof cleanup === 'function') safe(cleanup);
      ctx.revert();
      marked.forEach((el) => { delete el.dataset.mDone; });
    };
    // Las dependencias las decide cada página (por ejemplo, cuando llega la lista de jornadas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const fontsReady = (ms = 900) => Promise.race([
  document.fonts?.ready ?? Promise.resolve(),
  new Promise((resolve) => { setTimeout(resolve, ms); }),
]);
