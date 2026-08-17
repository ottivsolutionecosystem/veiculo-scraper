/**
 * PRNG determinístico (mulberry32). Os mocks precisam ser idênticos entre
 * render de servidor e cliente — `Math.random()` quebraria a hidratação.
 */
export function createRng(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error("pick: array vazio");
  return item;
}

export function int(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}
