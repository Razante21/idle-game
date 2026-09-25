import { logSquared } from '../../core/curves';
import { createRng, validSeed } from '../../core/rng';
import type { Goods, ModeBonus, ModeContext } from '../../core/types';

export type SpeciesId =
  | 'musgo'
  | 'trigo'
  | 'lirio'
  | 'abobora'
  | 'samambaia'
  | 'cacto'
  | 'raiz'
  | 'orquidea'
  | 'fungo'
  | 'arvore';

export interface SpeciesDef {
  name: string;
  symbol: string;
  tier: number;
  /** Segundos por colheita. */
  growTime: number;
  seiva: number;
  comida: number;
  plantCost: number;
  /** Duas plantas vizinhas de um canteiro vazio que podem gerar esta espécie. */
  recipe?: [SpeciesId, SpeciesId];
  /** Chance por segundo da mutação acontecer num canteiro vazio com os pais vizinhos. */
  chance?: number;
  /** Andar mínimo da Expedição para a semente rara brotar. */
  depth?: number;
  special?: string;
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  musgo: { name: 'Musgo Estelar', symbol: '☘', tier: 1, growTime: 10, seiva: 2, comida: 0, plantCost: 1 },
  trigo: { name: 'Trigo Solar', symbol: '⚘', tier: 1, growTime: 20, seiva: 0.5, comida: 8, plantCost: 3 },
  lirio: {
    name: 'Lírio Lunar',
    symbol: '❀',
    tier: 2,
    growTime: 30,
    seiva: 18,
    comida: 3,
    plantCost: 60,
    recipe: ['musgo', 'trigo'],
    chance: 0.03,
  },
  abobora: {
    name: 'Abóbora Cometa',
    symbol: '❂',
    tier: 2,
    growTime: 40,
    seiva: 2,
    comida: 60,
    plantCost: 60,
    recipe: ['trigo', 'trigo'],
    chance: 0.03,
  },
  samambaia: {
    name: 'Samambaia Nebular',
    symbol: '❦',
    tier: 3,
    growTime: 60,
    seiva: 150,
    comida: 0,
    plantCost: 1_200,
    recipe: ['lirio', 'musgo'],
    chance: 0.012,
  },
  cacto: {
    name: 'Cacto Pulsar',
    symbol: '✣',
    tier: 3,
    growTime: 60,
    seiva: 40,
    comida: 250,
    plantCost: 1_200,
    recipe: ['abobora', 'lirio'],
    chance: 0.012,
  },
  raiz: {
    name: 'Raiz Profunda',
    symbol: '♆',
    tier: 3,
    growTime: 90,
    seiva: 60,
    comida: 60,
    plantCost: 3_000,
    recipe: ['abobora', 'musgo'],
    chance: 0.01,
    depth: 15,
    special: 'Vizinhas crescem +50% mais rápido',
  },
  orquidea: {
    name: 'Orquídea do Vazio',
    symbol: '✾',
    tier: 4,
    growTime: 120,
    seiva: 1_500,
    comida: 400,
    plantCost: 30_000,
    recipe: ['samambaia', 'cacto'],
    chance: 0.005,
  },
  fungo: {
    name: 'Fungo Abissal',
    symbol: '✺',
    tier: 4,
    growTime: 150,
    seiva: 4_000,
    comida: 0,
    plantCost: 80_000,
    recipe: ['raiz', 'samambaia'],
    chance: 0.004,
    depth: 30,
  },
  arvore: {
    name: 'Árvore-Mundo',
    symbol: '❋',
    tier: 5,
    growTime: 300,
    seiva: 30_000,
    comida: 8_000,
    plantCost: 1_000_000,
    recipe: ['orquidea', 'fungo'],
    chance: 0.0015,
    depth: 50,
    special: 'Todas as outras plantas rendem +20%',
  },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];
const STARTING_SPECIES: SpeciesId[] = ['musgo', 'trigo'];

export type GardenUpgradeId = 'adubo' | 'colheita' | 'polinizadores' | 'composteira';

export const GARDEN_UPGRADES: Record<GardenUpgradeId, { name: string; description: string; baseCost: number; growth: number; max: number }> = {
  adubo: { name: 'Adubo Estelar', description: 'Plantas crescem 30% mais rápido', baseCost: 25, growth: 2.6, max: 20 },
  colheita: { name: 'Colheita Farta', description: 'Cada colheita rende +50%', baseCost: 60, growth: 3, max: 20 },
  polinizadores: { name: 'Polinizadores', description: 'Mutações 50% mais prováveis', baseCost: 150, growth: 5, max: 6 },
  composteira: {
    name: 'Composteira',
    description: 'A comida que fica no Jardim vira +25% de seiva',
    baseCost: 400,
    growth: 4,
    max: 5,
  },
};

export const GARDEN_UPGRADE_IDS = Object.keys(GARDEN_UPGRADES) as GardenUpgradeId[];

export const MIN_SIZE = 3;
export const MAX_SIZE = 6;
const EXPAND_COSTS: Record<number, number> = { 3: 300, 4: 10_000, 5: 400_000 };
const BASE_COMPOST = 0.1;
const COMPOST_PER_LEVEL = 0.25;
const RAIZ_SPEED = 0.5;
const ARVORE_YIELD = 0.2;
const DISCOVERY_BONUS = 0.05;

export interface Plot {
  species: SpeciesId;
  /** Progresso da colheita atual (0 a 1). */
  growth: number;
}

export interface GardenState {
  seiva: number;
  totalSeiva: number;
  size: number;
  plots: (Plot | null)[];
  discovered: SpeciesId[];
  upgrades: Record<GardenUpgradeId, number>;
  /** Fração da comida enviada à Colônia (0 a 1); o resto vira seiva na composteira. */
  exportShare: number;
  /** Comida/s exportada no último passo. */
  foodExport: number;
  harvests: number;
  mutations: number;
  seed: number;
}

function zeroUpgrades(): Record<GardenUpgradeId, number> {
  return { adubo: 0, colheita: 0, polinizadores: 0, composteira: 0 };
}

export const initialGardenState: GardenState = {
  seiva: 10,
  totalSeiva: 0,
  size: MIN_SIZE,
  plots: Array.from({ length: MIN_SIZE * MIN_SIZE }, () => null),
  discovered: [...STARTING_SPECIES],
  upgrades: zeroUpgrades(),
  exportShare: 0.5,
  foodExport: 0,
  harvests: 0,
  mutations: 0,
  seed: 2718,
};

export function neighbors(index: number, size: number): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const out: number[] = [];
  if (r > 0) out.push(index - size);
  if (r < size - 1) out.push(index + size);
  if (c > 0) out.push(index - 1);
  if (c < size - 1) out.push(index + 1);
  return out;
}

// ---------- Ritmo ----------

/** Bônus de crescimento da luz da Constelação: +15% por ordem de grandeza. */
export function lightBonus(ctx: ModeContext): number {
  return 1 + 0.15 * Math.log10(1 + ctx.imports.luz);
}

export function growthSpeed(state: GardenState, ctx: ModeContext): number {
  return 1.3 ** state.upgrades.adubo * lightBonus(ctx);
}

export function yieldMultiplier(state: GardenState, ctx: ModeContext): number {
  return 1.5 ** state.upgrades.colheita * (1 + DISCOVERY_BONUS * state.discovered.length) * ctx.multiplier('production');
}

export function compostRatio(state: GardenState): number {
  return BASE_COMPOST + COMPOST_PER_LEVEL * state.upgrades.composteira;
}

function plotSpeed(state: GardenState, index: number, ctx: ModeContext): number {
  const roots = neighbors(index, state.size).filter((n) => state.plots[n]?.species === 'raiz').length;
  return growthSpeed(state, ctx) * (1 + RAIZ_SPEED * roots);
}

function treeBonus(state: GardenState, index: number): number {
  const trees = state.plots.filter((p, i) => p?.species === 'arvore' && i !== index).length;
  return 1 + ARVORE_YIELD * trees;
}

/** Seiva/s e comida/s de um canteiro, com todos os multiplicadores. */
export function plotRates(state: GardenState, index: number, ctx: ModeContext): { seiva: number; comida: number } {
  const plot = state.plots[index];
  if (!plot) return { seiva: 0, comida: 0 };
  const def = SPECIES[plot.species];
  const perSecond = (plotSpeed(state, index, ctx) / def.growTime) * yieldMultiplier(state, ctx) * treeBonus(state, index);
  return { seiva: def.seiva * perSecond, comida: def.comida * perSecond };
}

export interface GardenTotals {
  /** Seiva/s colhida diretamente. */
  seiva: number;
  comida: number;
  exported: number;
  /** Seiva/s vinda da composteira. */
  compost: number;
}

export function totals(state: GardenState, ctx: ModeContext): GardenTotals {
  let seiva = 0;
  let comida = 0;
  state.plots.forEach((_, i) => {
    const r = plotRates(state, i, ctx);
    seiva += r.seiva;
    comida += r.comida;
  });
  const exported = comida * state.exportShare;
  return { seiva, comida, exported, compost: (comida - exported) * compostRatio(state) };
}

// ---------- Mutações ----------

function mutationChanceMultiplier(state: GardenState): number {
  return 1.5 ** state.upgrades.polinizadores;
}

/** Espécies que podem brotar no canteiro vazio `index` agora, com a chance por segundo de cada uma. */
export function mutationCandidates(state: GardenState, index: number, ctx: ModeContext): { species: SpeciesId; chance: number }[] {
  if (state.plots[index]) return [];
  const around = neighbors(index, state.size).map((n) => state.plots[n]?.species).filter((s): s is SpeciesId => !!s);
  if (around.length < 2) return [];
  const mult = mutationChanceMultiplier(state);
  return SPECIES_IDS.flatMap((id) => {
    const def = SPECIES[id];
    if (!def.recipe || !def.chance) return [];
    if (def.depth && ctx.imports.profundidade < def.depth) return [];
    const [a, b] = def.recipe;
    const hasA = around.indexOf(a);
    if (hasA < 0) return [];
    const rest = around.filter((_, i) => i !== hasA);
    return rest.includes(b) ? [{ species: id, chance: def.chance * mult }] : [];
  });
}

function mutate(state: GardenState, dt: number, ctx: ModeContext): GardenState {
  const plots = [...state.plots];
  let discovered = state.discovered;
  let mutations = state.mutations;
  let rolled = false;
  const rng = createRng(state.seed);

  for (let i = 0; i < plots.length; i++) {
    const candidates = mutationCandidates(state, i, ctx);
    if (candidates.length === 0) continue;
    rolled = true;
    const total = candidates.reduce((sum, c) => sum + c.chance, 0);
    if (rng.next() >= Math.min(1, total * dt)) continue;
    let pick = rng.next() * total;
    const chosen = candidates.find((c) => (pick -= c.chance) < 0) ?? candidates[candidates.length - 1]!;
    plots[i] = { species: chosen.species, growth: 0 };
    mutations++;
    if (!discovered.includes(chosen.species)) discovered = [...discovered, chosen.species];
  }

  if (!rolled) return state;
  return { ...state, plots: mutations === state.mutations ? state.plots : plots, discovered, mutations, seed: rng.seed };
}

// ---------- Tick ----------

export function tick(state: GardenState, dt: number, ctx: ModeContext): GardenState {
  const t = totals(state, ctx);
  let harvests = state.harvests;
  const plots = state.plots.map((p, i) => {
    if (!p) return p;
    const growth = p.growth + (dt * plotSpeed(state, i, ctx)) / SPECIES[p.species].growTime;
    const done = Math.floor(growth);
    harvests += done;
    return { ...p, growth: growth - done };
  });
  const gained = (t.seiva + t.compost) * dt;
  const next: GardenState = {
    ...state,
    plots,
    harvests,
    seiva: state.seiva + gained,
    totalSeiva: state.totalSeiva + gained,
    foodExport: t.exported,
  };
  return mutate(next, dt, ctx);
}

// ---------- Ações ----------

export function canPlant(state: GardenState, species: SpeciesId): boolean {
  return state.discovered.includes(species) && state.seiva >= SPECIES[species].plantCost;
}

export function plant(state: GardenState, index: number, species: SpeciesId): GardenState {
  if (index < 0 || index >= state.plots.length || state.plots[index]?.species === species || !canPlant(state, species)) return state;
  const plots = [...state.plots];
  plots[index] = { species, growth: 0 };
  return { ...state, plots, seiva: state.seiva - SPECIES[species].plantCost };
}

export function uproot(state: GardenState, index: number): GardenState {
  if (!state.plots[index]) return state;
  const plots = [...state.plots];
  plots[index] = null;
  return { ...state, plots };
}

export function upgradeCost(state: GardenState, id: GardenUpgradeId): number {
  const u = GARDEN_UPGRADES[id];
  return Math.ceil(u.baseCost * u.growth ** state.upgrades[id]);
}

export function buyUpgrade(state: GardenState, id: GardenUpgradeId): GardenState {
  const cost = upgradeCost(state, id);
  if (state.upgrades[id] >= GARDEN_UPGRADES[id].max || state.seiva < cost) return state;
  return { ...state, seiva: state.seiva - cost, upgrades: { ...state.upgrades, [id]: state.upgrades[id] + 1 } };
}

export function expandCost(state: GardenState): number | null {
  return EXPAND_COSTS[state.size] ?? null;
}

export function expand(state: GardenState): GardenState {
  const cost = expandCost(state);
  if (cost === null || state.seiva < cost) return state;
  const size = state.size + 1;
  const plots: (Plot | null)[] = Array.from({ length: size * size }, () => null);
  state.plots.forEach((p, i) => {
    plots[Math.floor(i / state.size) * size + (i % state.size)] = p;
  });
  return { ...state, seiva: state.seiva - cost, size, plots };
}

export function setExportShare(state: GardenState, share: number): GardenState {
  const clamped = Math.min(1, Math.max(0, Math.round(share * 10) / 10));
  return clamped === state.exportShare ? state : { ...state, exportShare: clamped };
}

// ---------- Ligações ----------

export function essenceRate(state: GardenState, ctx: ModeContext): number {
  const t = totals(state, ctx);
  return logSquared(t.seiva + t.compost, 2) + 0.1 * state.discovered.length;
}

export function provides(state: GardenState): ModeBonus[] {
  const d = state.discovered.length;
  return [
    { target: 'baseClicker', stat: 'production', value: 1 + 0.1 * d, source: 'Pólen do Jardim' },
    { target: 'roguelike', stat: 'production', value: 1 + 0.05 * d, source: 'Rações do Jardim' },
  ];
}

export function exports(state: GardenState): Partial<Goods> {
  return { comida: state.foodExport };
}

/** Colapso: o Jardim recomeça; o Banco de Sementes guarda as espécies descobertas. */
export function onCollapse(state: GardenState, keeps: ReadonlySet<string>): GardenState {
  return {
    ...initialGardenState,
    discovered: keeps.has('sementes') ? state.discovered : [...STARTING_SPECIES],
    exportShare: state.exportShare,
    harvests: state.harvests,
    mutations: state.mutations,
    seed: state.seed,
  };
}

export function restore(saved: unknown): GardenState {
  const s = (saved ?? {}) as Partial<GardenState> & { plots?: unknown[]; upgrades?: unknown };
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const isSpecies = (v: unknown): v is SpeciesId => typeof v === 'string' && v in SPECIES;
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.floor(num(s.size)) || MIN_SIZE));
  const plots = Array.from({ length: size * size }, (_, i): Plot | null => {
    const raw = Array.isArray(s.plots) ? (s.plots[i] as Partial<Plot> | null) : null;
    return raw && isSpecies(raw.species) ? { species: raw.species, growth: Math.min(0.999, num(raw.growth)) } : null;
  });
  const rawUp = (s.upgrades ?? {}) as Partial<Record<GardenUpgradeId, unknown>>;
  const upgrades = zeroUpgrades();
  for (const id of GARDEN_UPGRADE_IDS) upgrades[id] = Math.min(GARDEN_UPGRADES[id].max, Math.floor(num(rawUp[id])));
  const discovered = Array.isArray(s.discovered) ? s.discovered.filter(isSpecies) : [];
  return {
    seiva: num(s.seiva),
    totalSeiva: num(s.totalSeiva),
    size,
    plots,
    discovered: [...new Set([...STARTING_SPECIES, ...discovered])],
    upgrades,
    exportShare: Math.min(1, num(s.exportShare, initialGardenState.exportShare)),
    foodExport: num(s.foodExport),
    harvests: Math.floor(num(s.harvests)),
    mutations: Math.floor(num(s.mutations)),
    seed: validSeed(s.seed, initialGardenState.seed),
  };
}
