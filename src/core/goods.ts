import type { Good, Goods } from './types';

export const GOODS: readonly Good[] = ['comida', 'materiais', 'luz', 'profundidade'];

export const GOOD_LABELS: Record<Good, string> = {
  comida: 'Comida',
  materiais: 'Materiais',
  luz: 'Luz',
  profundidade: 'Profundidade',
};

export function noGoods(): Goods {
  return { comida: 0, materiais: 0, luz: 0, profundidade: 0 };
}

/** Soma bens, ignorando valores inválidos (NaN, negativos). */
export function addGoods(into: Goods, extra: Partial<Goods>): Goods {
  for (const g of GOODS) {
    const v = extra[g];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) into[g] += v;
  }
  return into;
}
