/**
 * Gerador mulberry32. O estado da sorte fica no save de cada modo, então a simulação
 * (inclusive o progresso offline) é determinística.
 */
export function createRng(seed: number) {
  let s = seed | 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let r = Math.imul(s ^ (s >>> 15), 1 | s);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
    range(min: number, max: number) {
      return min + (max - min) * this.next();
    },
    get seed() {
      return s;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

export function validSeed(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}
