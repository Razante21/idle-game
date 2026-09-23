import type { ModeBonus, ModeContext, ModeId } from '../../core/types';

export type PieceType = 'ana' | 'gigante' | 'pulsar' | 'nebulosa' | 'farolNucleo' | 'farolFabrica' | 'farolExpedicao';

export interface PieceDef {
  name: string;
  symbol: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  beaconTarget?: ModeId;
}

export const PIECES: Record<PieceType, PieceDef> = {
  ana: { name: 'Anã', symbol: '✧', description: 'Gera 1 poeira/s', baseCost: 10, costGrowth: 1.4 },
  nebulosa: {
    name: 'Nebulosa',
    symbol: '≋',
    description: 'Gera 3/s se estiver isolada; 0.5/s com vizinhos',
    baseCost: 40,
    costGrowth: 1.6,
  },
  gigante: {
    name: 'Gigante',
    symbol: '◉',
    description: 'Dobra a produção de cada vizinha',
    baseCost: 60,
    costGrowth: 1.8,
  },
  pulsar: {
    name: 'Pulsar',
    symbol: '✳',
    description: '+50% para todas as estrelas da mesma linha e coluna',
    baseCost: 150,
    costGrowth: 1.9,
  },
  farolNucleo: {
    name: 'Farol do Núcleo',
    symbol: '▲',
    description: 'Produção do Núcleo +15% por vizinha',
    baseCost: 300,
    costGrowth: 2.2,
    beaconTarget: 'baseClicker',
  },
  farolFabrica: {
    name: 'Farol da Fábrica',
    symbol: '▲',
    description: 'Produção da Fábrica +15% por vizinha',
    baseCost: 300,
    costGrowth: 2.2,
    beaconTarget: 'productionChain',
  },
  farolExpedicao: {
    name: 'Farol da Expedição',
    symbol: '▲',
    description: 'Força na Expedição +15% por vizinha',
    baseCost: 300,
    costGrowth: 2.2,
    beaconTarget: 'roguelike',
  },
};

export const PIECE_TYPES = Object.keys(PIECES) as PieceType[];

const BEACON_SOURCE: Partial<Record<ModeId, string>> = {
  baseClicker: 'Farol do Núcleo',
  productionChain: 'Farol da Fábrica',
  roguelike: 'Farol da Expedição',
};

export const MIN_SIZE = 4;
export const MAX_SIZE = 7;
const EXPAND_COSTS: Record<number, number> = { 4: 200, 5: 5_000, 6: 100_000 };
const BEACON_PER_NEIGHBOR = 0.15;
const GIANT_MULT = 2;
const PULSAR_BONUS = 0.5;

export interface GridState {
  dust: number;
  size: number;
  cells: (PieceType | null)[];
  inventory: Record<PieceType, number>;
  bought: Record<PieceType, number>;
  /** Espelha a regra "Céu Aberto" da Ascensão para os bônus dos faróis. */
  diagonal: boolean;
}

function emptyCounts(): Record<PieceType, number> {
  return Object.fromEntries(PIECE_TYPES.map((t) => [t, 0])) as Record<PieceType, number>;
}

export const initialGridState: GridState = {
  dust: 0,
  size: MIN_SIZE,
  cells: Array.from({ length: MIN_SIZE * MIN_SIZE }, () => null),
  inventory: { ...emptyCounts(), ana: 1 },
  bought: emptyCounts(),
  diagonal: false,
};

export function neighbors(index: number, size: number, diagonal: boolean): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (!diagonal && dr !== 0 && dc !== 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) result.push(nr * size + nc);
    }
  }
  return result;
}

/** Poeira/s de uma célula, antes dos multiplicadores externos. */
export function cellOutput(state: GridState, index: number, diagonal = state.diagonal): number {
  const piece = state.cells[index];
  if (!piece) return 0;
  const adjacent = neighbors(index, state.size, diagonal).map((n) => state.cells[n]);
  let base = 0;
  if (piece === 'ana') base = 1;
  if (piece === 'nebulosa') base = adjacent.some(Boolean) ? 0.5 : 3;
  if (base === 0) return 0;

  const giants = adjacent.filter((p) => p === 'gigante').length;
  const r = Math.floor(index / state.size);
  const c = index % state.size;
  let pulsars = 0;
  state.cells.forEach((p, i) => {
    if (p !== 'pulsar' || i === index) return;
    if (Math.floor(i / state.size) === r || i % state.size === c) pulsars++;
  });
  return base * GIANT_MULT ** giants * (1 + PULSAR_BONUS * pulsars);
}

export function rawDustPerSecond(state: GridState, diagonal = state.diagonal): number {
  return state.cells.reduce((sum, _, i) => sum + cellOutput(state, i, diagonal), 0);
}

export function dustPerSecond(state: GridState, ctx: ModeContext): number {
  return rawDustPerSecond(state, ctx.hasFlag('constelacao.diagonal')) * ctx.multiplier('production');
}

export function tick(state: GridState, dt: number, ctx: ModeContext): GridState {
  const diagonal = ctx.hasFlag('constelacao.diagonal');
  return { ...state, diagonal, dust: state.dust + dustPerSecond(state, ctx) * dt };
}

export function pieceCost(state: GridState, type: PieceType): number {
  const def = PIECES[type];
  return Math.ceil(def.baseCost * def.costGrowth ** state.bought[type]);
}

export function buy(state: GridState, type: PieceType): GridState {
  const cost = pieceCost(state, type);
  if (state.dust < cost) return state;
  return {
    ...state,
    dust: state.dust - cost,
    inventory: { ...state.inventory, [type]: state.inventory[type] + 1 },
    bought: { ...state.bought, [type]: state.bought[type] + 1 },
  };
}

/** Coloca uma peça do inventário; se a célula estiver ocupada, a peça antiga volta para o inventário. */
export function place(state: GridState, index: number, type: PieceType): GridState {
  if (state.inventory[type] <= 0 || index < 0 || index >= state.cells.length) return state;
  const current = state.cells[index];
  if (current === type) return state;
  const inventory = { ...state.inventory, [type]: state.inventory[type] - 1 };
  if (current) inventory[current] += 1;
  const cells = [...state.cells];
  cells[index] = type;
  return { ...state, cells, inventory };
}

export function remove(state: GridState, index: number): GridState {
  const current = state.cells[index];
  if (!current) return state;
  const cells = [...state.cells];
  cells[index] = null;
  return { ...state, cells, inventory: { ...state.inventory, [current]: state.inventory[current] + 1 } };
}

export function expandCost(state: GridState): number | null {
  return EXPAND_COSTS[state.size] ?? null;
}

export function expand(state: GridState): GridState {
  const cost = expandCost(state);
  if (cost === null || state.dust < cost) return state;
  const size = state.size + 1;
  const cells: (PieceType | null)[] = Array.from({ length: size * size }, () => null);
  state.cells.forEach((p, i) => {
    cells[Math.floor(i / state.size) * size + (i % state.size)] = p;
  });
  return { ...state, dust: state.dust - cost, size, cells };
}

export function beaconBonuses(state: GridState): ModeBonus[] {
  const totals = new Map<ModeId, number>();
  state.cells.forEach((p, i) => {
    const target = p ? PIECES[p].beaconTarget : undefined;
    if (!target) return;
    const lit = neighbors(i, state.size, state.diagonal).filter((n) => state.cells[n]).length;
    totals.set(target, (totals.get(target) ?? 0) + lit);
  });
  return [...totals].map(([target, lit]) => ({
    target,
    stat: 'production',
    value: 1 + BEACON_PER_NEIGHBOR * lit,
    source: BEACON_SOURCE[target] ?? 'Farol',
  }));
}

export function essenceRate(state: GridState, ctx: ModeContext): number {
  return 0.25 * Math.sqrt(dustPerSecond(state, ctx));
}

export function restore(saved: unknown): GridState {
  const s = (saved ?? {}) as Partial<GridState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const counts = (v: unknown) => {
    const src = (v ?? {}) as Partial<Record<PieceType, number>>;
    return Object.fromEntries(PIECE_TYPES.map((t) => [t, Math.floor(num(src[t]))])) as Record<PieceType, number>;
  };
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.floor(num(s.size)) || MIN_SIZE));
  const cells = Array.from({ length: size * size }, (_, i) => {
    const p = Array.isArray(s.cells) ? s.cells[i] : null;
    return typeof p === 'string' && p in PIECES ? (p as PieceType) : null;
  });
  const hasAnything = cells.some(Boolean) || Object.values(counts(s.inventory)).some((n) => n > 0);
  return {
    dust: num(s.dust),
    size,
    cells,
    inventory: hasAnything ? counts(s.inventory) : { ...counts(s.inventory), ana: 1 },
    bought: counts(s.bought),
    diagonal: s.diagonal === true,
  };
}
