export type HideOnScrollState = {
  hidden: boolean;
  accumulated: number;
};

const TOP_REVEAL = 8;
const THRESHOLD = 16;
/** Com o chrome já escondido, exige subida maior — bounce/momentum do iOS
 * manda deltas pequenos pra cima no meio do fling e tremia o header. */
const REVEAL_THRESHOLD = 56;
/** Um único evento com salto grande = fling. Decide na hora. */
export const FAST_DELTA = 40;
/** Sem overflow de sobra, esconder o chrome encolhe a lista, o scrollTop
 * volta a 0 e o chrome reaparece — loop. Só esconde com folga. */
export const MIN_OVERFLOW_TO_HIDE = 280;

/** Esconde o chrome ao descer e mostra ao subir. Acumula deltas pequenos
 * (scroll do iOS) até o limiar para não tremer. Fling grande decide na hora. */
export function reduceHideOnScroll(
  state: HideOnScrollState,
  event: { scrollTop: number; delta: number; overflow?: number },
  opts?: {
    topReveal?: number;
    threshold?: number;
    revealThreshold?: number;
    fastDelta?: number;
    minOverflow?: number;
  },
): HideOnScrollState {
  const topReveal = opts?.topReveal ?? TOP_REVEAL;
  const threshold = opts?.threshold ?? THRESHOLD;
  const revealThreshold = opts?.revealThreshold ?? REVEAL_THRESHOLD;
  const fastDelta = opts?.fastDelta ?? FAST_DELTA;
  const minOverflow = opts?.minOverflow ?? MIN_OVERFLOW_TO_HIDE;

  if (event.overflow !== undefined && event.overflow < minOverflow) {
    return { hidden: false, accumulated: 0 };
  }

  if (event.scrollTop <= topReveal) {
    return { hidden: false, accumulated: 0 };
  }

  // Fling: um salto grande vale como intenção clara — não espera acumular
  // e não deixa o bounce seguinte desfazer na hora.
  if (Math.abs(event.delta) >= fastDelta) {
    return { hidden: event.delta > 0, accumulated: 0 };
  }

  const sameDirection =
    state.accumulated === 0 ||
    (state.accumulated >= 0 && event.delta >= 0) ||
    (state.accumulated <= 0 && event.delta <= 0);
  const accumulated = (sameDirection ? state.accumulated : 0) + event.delta;

  if (accumulated >= threshold) return { hidden: true, accumulated: 0 };
  if (accumulated <= -revealThreshold) return { hidden: false, accumulated: 0 };
  // Deltas pequenos pra cima com chrome visível: limiar normal de revelar
  // não se aplica (já está visível). Pra baixo com escondido: ok.
  if (!state.hidden && accumulated <= -threshold) {
    return { hidden: false, accumulated: 0 };
  }
  return { hidden: state.hidden, accumulated };
}
