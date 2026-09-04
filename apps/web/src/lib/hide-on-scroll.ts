export type HideOnScrollState = {
  hidden: boolean;
  accumulated: number;
};

const TOP_REVEAL = 8;
const THRESHOLD = 16;

/** Esconde o chrome ao descer e mostra ao subir. Acumula deltas pequenos
 * (scroll do iOS) até o limiar para não tremer. */
export function reduceHideOnScroll(
  state: HideOnScrollState,
  event: { scrollTop: number; delta: number },
  opts?: { topReveal?: number; threshold?: number },
): HideOnScrollState {
  const topReveal = opts?.topReveal ?? TOP_REVEAL;
  const threshold = opts?.threshold ?? THRESHOLD;

  if (event.scrollTop <= topReveal) {
    return { hidden: false, accumulated: 0 };
  }

  const sameDirection =
    state.accumulated === 0 ||
    (state.accumulated >= 0 && event.delta >= 0) ||
    (state.accumulated <= 0 && event.delta <= 0);
  const accumulated = (sameDirection ? state.accumulated : 0) + event.delta;

  if (accumulated >= threshold) return { hidden: true, accumulated: 0 };
  if (accumulated <= -threshold) return { hidden: false, accumulated: 0 };
  return { hidden: state.hidden, accumulated };
}
