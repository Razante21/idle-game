import { logSquared } from '../../core/curves';
import { createRng, validSeed } from '../../core/rng';
import type { ModeBonus, ModeContext, ModeId } from '../../core/types';

export type PieceType =
  | 'ana'
  | 'nebulosa'
  | 'binaria'
  | 'gigante'
  | 'pulsar'
  | 'cometa'
  | 'quasar'
  | 'buracoNegro'
  | 'farolNucleo'
  | 'farolFabrica'
  | 'farolExpedicao';

export interface Piece {
  type: PieceType;
  level: number;
}

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
  gigante: { name: 'Gigante', symbol: '◉', description: 'Multiplica cada vizinha por (1 + nível)', baseCost: 60, costGrowth: 1.8 },
  pulsar: {
    name: 'Pulsar',
    symbol: '✳',
    description: '+50% por nível para toda a linha e coluna',
    baseCost: 150,
    costGrowth: 1.9,
  },
  binaria: {
    name: 'Binária',
    symbol: '∞',
    description: 'Gera 5/s, mas só se tiver outra Binária vizinha',
    baseCost: 400,
    costGrowth: 1.9,
  },
  cometa: {
    name: 'Cometa',
    symbol: '☄',
    description: 'Gera 6/s e pula para uma célula vazia a cada 20s',
    baseCost: 800,
    costGrowth: 2,
  },
  quasar: {
    name: 'Quasar',
    symbol: '✹',
    description: 'Gera 12/s, mas corta pela metade as vizinhas',
    baseCost: 2_500,
    costGrowth: 2.1,
  },
  buracoNegro: {
    name: 'Buraco Negro',
    symbol: '●',
    description: 'Engole a poeira das vizinhas e a converte em Essência',
    baseCost: 5_000,
    costGrowth: 2.3,
  },
  farolNucleo: {
    name: 'Farol do Núcleo',
    symbol: '▲',
    description: 'Produção do Núcleo +15% por vizinha (por nível)',
    baseCost: 300,
    costGrowth: 2.2,
    beaconTarget: 'baseClicker',
  },
  farolFabrica: {
    name: 'Farol da Fábrica',
    symbol: '▲',
    description: 'Produção da Fábrica +15% por vizinha (por nível)',
    baseCost: 300,
    costGrowth: 2.2,
    beaconTarget: 'productionChain',
  },
  farolExpedicao: {
    name: 'Farol da Expedição',
    symbol: '▲',
    description: 'Força na Expedição +15% por vizinha (por nível)',
    baseCost: 300,
    costGrowth: 2.2,
    beaconTarget: 'roguelike',
  },
};

export const PIECE_TYPES = Object.keys(PIECES) as PieceType[];

export type PatternId =
  | 'cinturao'
  | 'cruzeiro'
  | 'gemeas'
  | 'coroa'
  | 'viaLactea'
  | 'horizonte'
  | 'plenitude'
  | 'ascendente';

export const PATTERNS: Record<PatternId, { name: string; hint: string }> = {
  cinturao: { name: 'Cinturão de Órion', hint: 'Três Anãs lado a lado' },
  cruzeiro: { name: 'Cruzeiro do Sul', hint: 'Uma peça cercada nos quatro lados' },
  gemeas: { name: 'Estrelas Gêmeas', hint: 'Duas Binárias juntas' },
  coroa: { name: 'Coroa Boreal', hint: 'Uma Gigante cercada por Anãs' },
  viaLactea: { name: 'Via Láctea', hint: 'Uma linha inteira preenchida' },
  horizonte: { name: 'Horizonte de Eventos', hint: 'Um Buraco Negro cercado' },
  plenitude: { name: 'Plenitude', hint: 'Vinte peças no céu' },
  ascendente: { name: 'Estrela Ascendente', hint: 'Uma peça de nível 3 no céu' },
};

export const PATTERN_IDS = Object.keys(PATTERNS) as PatternId[];

const BEACON_SOURCE: Partial<Record<ModeId, string>> = {
  baseClicker: 'Farol do Núcleo',
  productionChain: 'Farol da Fábrica',
  roguelike: 'Farol da Expedição',
};

export const MIN_SIZE = 4;
export const MAX_SIZE = 7;
export const MAX_LEVEL = 5;
const EXPAND_COSTS: Record<number, number> = { 4: 300, 5: 8_000, 6: 150_000 };
const LEVEL_OUTPUT = 3.5;
const BEACON_PER_NEIGHBOR = 0.15;
const PULSAR_BONUS = 0.5;
const PATTERN_BONUS = 0.25;
const COMET_INTERVAL = 20;

export interface GridState {
  dust: number;
  size: number;
  cells: (Piece | null)[];
  /** Quantidade no inventário por tipo e nível (índice 0 = nível 1). */
  inventory: Record<PieceType, number[]>;
  bought: Record<PieceType, number>;
  patterns: PatternId[];
  cometTimer: number;
  seed: number;
  /** Espelha a regra "Céu Aberto" da Ascensão para os bônus dos faróis. */
  diagonal: boolean;
}

function emptyInventory(): Record<PieceType, number[]> {
  return Object.fromEntries(PIECE_TYPES.map((t) => [t, Array.from({ length: MAX_LEVEL }, () => 0)])) as Record<PieceType, number[]>;
}

function emptyCounts(): Record<PieceType, number> {
  return Object.fromEntries(PIECE_TYPES.map((t) => [t, 0])) as Record<PieceType, number>;
}

export const initialGridState: GridState = {
  dust: 0,
  size: MIN_SIZE,
  cells: Array.from({ length: MIN_SIZE * MIN_SIZE }, () => null),
  inventory: { ...emptyInventory(), ana: [1, 0, 0, 0, 0] },
  bought: emptyCounts(),
  patterns: [],
  cometTimer: COMET_INTERVAL,
  seed: 1618,
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

function baseOutput(state: GridState, index: number, adjacent: (Piece | null)[]): number {
  const piece = state.cells[index];
  if (!piece) return 0;
  switch (piece.type) {
    case 'ana':
      return 1;
    case 'nebulosa':
      return adjacent.some(Boolean) ? 0.5 : 3;
    case 'binaria':
      return adjacent.some((p) => p?.type === 'binaria') ? 5 : 0;
    case 'cometa':
      return 6;
    case 'quasar':
      return 12;
    default:
      return 0;
  }
}

/** Poeira/s de uma célula antes dos multiplicadores externos (ignora buracos negros). */
export function cellOutput(state: GridState, index: number, diagonal = state.diagonal): number {
  const piece = state.cells[index];
  if (!piece) return 0;
  const adjacent = neighbors(index, state.size, diagonal).map((n) => state.cells[n] ?? null);
  const base = baseOutput(state, index, adjacent);
  if (base === 0) return 0;

  let mult = LEVEL_OUTPUT ** (piece.level - 1);
  for (const p of adjacent) {
    if (p?.type === 'gigante') mult *= 1 + p.level;
    if (p?.type === 'quasar' && piece.type !== 'quasar') mult *= 0.5;
  }
  const r = Math.floor(index / state.size);
  const c = index % state.size;
  let pulsar = 0;
  state.cells.forEach((p, i) => {
    if (p?.type !== 'pulsar' || i === index) return;
    if (Math.floor(i / state.size) === r || i % state.size === c) pulsar += PULSAR_BONUS * p.level;
  });
  return base * mult * (1 + pulsar);
}

/** Força de absorção de cada célula: o maior nível de Buraco Negro vizinho (0 = não absorvida). */
function absorption(state: GridState, index: number, diagonal: boolean): number {
  let level = 0;
  for (const n of neighbors(index, state.size, diagonal)) {
    const p = state.cells[n];
    if (p?.type === 'buracoNegro') level = Math.max(level, p.level);
  }
  return level;
}

export function patternMultiplier(state: GridState): number {
  return 1 + PATTERN_BONUS * state.patterns.length;
}

export function gridTotals(state: GridState, diagonal = state.diagonal): { dust: number; absorbed: number } {
  let dust = 0;
  let absorbed = 0;
  state.cells.forEach((_, i) => {
    const out = cellOutput(state, i, diagonal);
    if (out === 0) return;
    const bh = absorption(state, i, diagonal);
    if (bh > 0) absorbed += out * (0.5 + 0.5 * bh);
    else dust += out;
  });
  return { dust: dust * patternMultiplier(state), absorbed };
}

export function rawDustPerSecond(state: GridState, diagonal = state.diagonal): number {
  return gridTotals(state, diagonal).dust;
}

export function dustPerSecond(state: GridState, ctx: ModeContext): number {
  return rawDustPerSecond(state, ctx.hasFlag('constelacao.diagonal')) * ctx.multiplier('production');
}

export function isAbsorbed(state: GridState, index: number, diagonal = state.diagonal): boolean {
  return absorption(state, index, diagonal) > 0 && cellOutput(state, index, diagonal) > 0;
}

// ---------- Padrões ----------

function surrounded(state: GridState, i: number): boolean {
  const ortho = neighbors(i, state.size, false);
  return ortho.length === 4 && ortho.every((n) => state.cells[n]);
}

function patternFound(state: GridState, id: PatternId): boolean {
  const { cells, size } = state;
  const at = (r: number, c: number) => (r >= 0 && r < size && c >= 0 && c < size ? cells[r * size + c] : null);
  switch (id) {
    case 'cinturao':
      return cells.some((_, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        return [0, 1, 2].every((d) => at(r, c + d)?.type === 'ana');
      });
    case 'cruzeiro':
      return cells.some((p, i) => p && surrounded(state, i));
    case 'gemeas':
      return cells.some((p, i) => p?.type === 'binaria' && neighbors(i, size, false).some((n) => cells[n]?.type === 'binaria'));
    case 'coroa':
      return cells.some(
        (p, i) => p?.type === 'gigante' && surrounded(state, i) && neighbors(i, size, false).every((n) => cells[n]?.type === 'ana'),
      );
    case 'viaLactea':
      return Array.from({ length: size }, (_, r) => r).some((r) => Array.from({ length: size }, (_, c) => at(r, c)).every(Boolean));
    case 'horizonte':
      return cells.some((p, i) => p?.type === 'buracoNegro' && surrounded(state, i));
    case 'plenitude':
      return cells.filter(Boolean).length >= 20;
    case 'ascendente':
      return cells.some((p) => (p?.level ?? 0) >= 3);
  }
}

export function discoverPatterns(state: GridState): GridState {
  const found = PATTERN_IDS.filter((id) => !state.patterns.includes(id) && patternFound(state, id));
  return found.length ? { ...state, patterns: [...state.patterns, ...found] } : state;
}

// ---------- Tick ----------

function moveComets(state: GridState): GridState {
  const rng = createRng(state.seed);
  const cells = [...state.cells];
  cells.forEach((p, i) => {
    if (p?.type !== 'cometa') return;
    const empty = cells.map((c, j) => (c ? -1 : j)).filter((j) => j >= 0);
    if (empty.length === 0) return;
    const target = empty[Math.floor(rng.next() * empty.length)]!;
    cells[target] = p;
    cells[i] = null;
  });
  return { ...state, cells, seed: rng.seed };
}

export function tick(state: GridState, dt: number, ctx: ModeContext): GridState {
  const diagonal = ctx.hasFlag('constelacao.diagonal');
  let next: GridState = { ...state, diagonal, dust: state.dust + dustPerSecond(state, ctx) * dt };
  if (state.cells.some((p) => p?.type === 'cometa')) {
    let timer = state.cometTimer - dt;
    while (timer <= 0) {
      next = moveComets(next);
      timer += COMET_INTERVAL;
    }
    next = discoverPatterns({ ...next, cometTimer: timer });
  }
  return next;
}

// ---------- Ações ----------

export function pieceCost(state: GridState, type: PieceType): number {
  const def = PIECES[type];
  return Math.ceil(def.baseCost * def.costGrowth ** state.bought[type]);
}

function changeInventory(state: GridState, piece: Piece, delta: number): Record<PieceType, number[]> {
  const levels = [...state.inventory[piece.type]];
  levels[piece.level - 1] = (levels[piece.level - 1] ?? 0) + delta;
  return { ...state.inventory, [piece.type]: levels };
}

export function inventoryCount(state: GridState, piece: Piece): number {
  return state.inventory[piece.type][piece.level - 1] ?? 0;
}

export function buy(state: GridState, type: PieceType): GridState {
  const cost = pieceCost(state, type);
  if (state.dust < cost) return state;
  return {
    ...state,
    dust: state.dust - cost,
    inventory: changeInventory(state, { type, level: 1 }, 1),
    bought: { ...state.bought, [type]: state.bought[type] + 1 },
  };
}

/** Coloca uma peça do inventário; se a célula estiver ocupada, a peça antiga volta para o inventário. */
export function place(state: GridState, index: number, piece: Piece): GridState {
  if (inventoryCount(state, piece) <= 0 || index < 0 || index >= state.cells.length) return state;
  const current = state.cells[index];
  if (current && current.type === piece.type && current.level === piece.level) return state;
  let next: GridState = { ...state, inventory: changeInventory(state, piece, -1) };
  if (current) next = { ...next, inventory: changeInventory(next, current, 1) };
  const cells = [...next.cells];
  cells[index] = { ...piece };
  return discoverPatterns({ ...next, cells });
}

export function remove(state: GridState, index: number): GridState {
  const current = state.cells[index];
  if (!current) return state;
  const cells = [...state.cells];
  cells[index] = null;
  return { ...state, cells, inventory: changeInventory(state, current, 1) };
}

export function fusionCost(ctx: ModeContext): number {
  return ctx.hasFlag('constelacao.fusaoBarata') ? 2 : 3;
}

/** Funde peças iguais do inventário em uma de nível acima. */
export function fuse(state: GridState, piece: Piece, ctx: ModeContext): GridState {
  const need = fusionCost(ctx);
  if (piece.level >= MAX_LEVEL || inventoryCount(state, piece) < need) return state;
  const spent = { ...state, inventory: changeInventory(state, piece, -need) };
  return { ...spent, inventory: changeInventory(spent, { type: piece.type, level: piece.level + 1 }, 1) };
}

export function expandCost(state: GridState): number | null {
  return EXPAND_COSTS[state.size] ?? null;
}

export function expand(state: GridState): GridState {
  const cost = expandCost(state);
  if (cost === null || state.dust < cost) return state;
  const size = state.size + 1;
  const cells: (Piece | null)[] = Array.from({ length: size * size }, () => null);
  state.cells.forEach((p, i) => {
    cells[Math.floor(i / state.size) * size + (i % state.size)] = p;
  });
  return { ...state, dust: state.dust - cost, size, cells };
}

export function beaconBonuses(state: GridState): ModeBonus[] {
  const totals = new Map<ModeId, number>();
  state.cells.forEach((p, i) => {
    const target = p ? PIECES[p.type].beaconTarget : undefined;
    if (!p || !target) return;
    const lit = neighbors(i, state.size, state.diagonal).filter((n) => state.cells[n]).length;
    totals.set(target, (totals.get(target) ?? 0) + lit * p.level);
  });
  return [...totals].map(([target, lit]) => ({
    target,
    stat: 'production',
    value: 1 + BEACON_PER_NEIGHBOR * lit,
    source: BEACON_SOURCE[target] ?? 'Farol',
  }));
}

export function essenceRate(state: GridState, ctx: ModeContext): number {
  const { dust, absorbed } = gridTotals(state, ctx.hasFlag('constelacao.diagonal'));
  const mult = ctx.multiplier('production');
  return logSquared(dust * mult, 2) + logSquared(absorbed * mult, 1.5);
}

export function restore(saved: unknown): GridState {
  const s = (saved ?? {}) as Partial<Omit<GridState, 'cells' | 'inventory'>> & { cells?: unknown[]; inventory?: unknown };
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const isType = (v: unknown): v is PieceType => typeof v === 'string' && v in PIECES;
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.floor(num(s.size)) || MIN_SIZE));

  const cells = Array.from({ length: size * size }, (_, i): Piece | null => {
    const raw = Array.isArray(s.cells) ? s.cells[i] : null;
    // Saves antigos guardavam só o tipo da peça.
    if (isType(raw)) return { type: raw, level: 1 };
    if (raw && typeof raw === 'object' && isType((raw as Piece).type)) {
      return { type: (raw as Piece).type, level: Math.min(MAX_LEVEL, Math.max(1, Math.floor(num((raw as Piece).level, 1)))) };
    }
    return null;
  });

  const rawInv = (s.inventory ?? {}) as Record<string, unknown>;
  const inventory = emptyInventory();
  for (const t of PIECE_TYPES) {
    const v = rawInv[t];
    if (typeof v === 'number') inventory[t][0] = Math.floor(num(v));
    else if (Array.isArray(v)) inventory[t] = inventory[t].map((_, lvl) => Math.floor(num(v[lvl])));
  }
  const hasAnything = cells.some(Boolean) || PIECE_TYPES.some((t) => inventory[t].some((n) => n > 0));
  if (!hasAnything) inventory.ana[0] = 1;

  const bought = emptyCounts();
  const rawBought = (s.bought ?? {}) as Partial<Record<PieceType, number>>;
  for (const t of PIECE_TYPES) bought[t] = Math.floor(num(rawBought[t]));

  return {
    dust: num(s.dust),
    size,
    cells,
    inventory,
    bought,
    patterns: Array.isArray(s.patterns) ? s.patterns.filter((p): p is PatternId => PATTERN_IDS.includes(p as PatternId)) : [],
    cometTimer: num(s.cometTimer, COMET_INTERVAL),
    seed: validSeed(s.seed, initialGridState.seed),
    diagonal: s.diagonal === true,
  };
}
