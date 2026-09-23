import type { ModeBonus, ModeContext } from '../../core/types';

export interface GeneratorDef {
  name: string;
  baseCost: number;
  baseRate: number;
}

export const GENERATORS: GeneratorDef[] = [
  { name: 'Faísca', baseCost: 10, baseRate: 0.5 },
  { name: 'Dínamo', baseCost: 120, baseRate: 4 },
  { name: 'Reator', baseCost: 1_400, baseRate: 30 },
  { name: 'Estrela', baseCost: 16_000, baseRate: 220 },
  { name: 'Pulsar', baseCost: 200_000, baseRate: 1_800 },
  { name: 'Quasar', baseCost: 3_000_000, baseRate: 16_000 },
];

export const COST_GROWTH = 1.15;
export const MILESTONE_EVERY = 25;
const CLICK_PRODUCTION_SHARE = 0.05;
const ESSENCE_DIVISOR = 10;

export interface BaseClickerState {
  energy: number;
  totalEnergy: number;
  clicks: number;
  owned: number[];
}

export const initialBaseClickerState: BaseClickerState = {
  energy: 0,
  totalEnergy: 0,
  clicks: 0,
  owned: GENERATORS.map(() => 0),
};

function def(index: number): GeneratorDef {
  const g = GENERATORS[index];
  if (!g) throw new Error(`Gerador inexistente: ${index}`);
  return g;
}

export function bulkCost(index: number, owned: number, amount: number): number {
  const { baseCost } = def(index);
  return (baseCost * COST_GROWTH ** owned * (COST_GROWTH ** amount - 1)) / (COST_GROWTH - 1);
}

export function maxAffordable(index: number, owned: number, energy: number): number {
  const { baseCost } = def(index);
  const first = baseCost * COST_GROWTH ** owned;
  if (energy < first) return 0;
  const n = Math.floor(Math.log((energy * (COST_GROWTH - 1)) / first + 1) / Math.log(COST_GROWTH));
  // Protege contra erro de ponto flutuante na borda.
  return bulkCost(index, owned, n) > energy ? n - 1 : n;
}

const MILESTONE_EVERY_ASCENDED = 20;
const AUTO_CLICKS_PER_SECOND = 5;

export function milestoneEvery(ctx: ModeContext): number {
  return ctx.hasFlag('nucleo.milestone20') ? MILESTONE_EVERY_ASCENDED : MILESTONE_EVERY;
}

export function milestoneMultiplier(owned: number, every = MILESTONE_EVERY): number {
  return 2 ** Math.floor(owned / every);
}

export function generatorRate(index: number, owned: number, every = MILESTONE_EVERY): number {
  return def(index).baseRate * owned * milestoneMultiplier(owned, every);
}

function rawProduction(state: BaseClickerState, every = MILESTONE_EVERY): number {
  return state.owned.reduce((sum, owned, i) => sum + generatorRate(i, owned, every), 0);
}

export function productionPerSecond(state: BaseClickerState, ctx: ModeContext): number {
  return rawProduction(state, milestoneEvery(ctx)) * ctx.multiplier('production');
}

export function clickValue(state: BaseClickerState, ctx: ModeContext): number {
  return (1 + CLICK_PRODUCTION_SHARE * productionPerSecond(state, ctx)) * ctx.multiplier('click');
}

export function essenceRate(state: BaseClickerState, ctx: ModeContext): number {
  return Math.sqrt(productionPerSecond(state, ctx)) / ESSENCE_DIVISOR;
}

export function tick(state: BaseClickerState, deltaSeconds: number, ctx: ModeContext): BaseClickerState {
  let perSecond = productionPerSecond(state, ctx);
  if (ctx.hasFlag('nucleo.autoclick')) perSecond += clickValue(state, ctx) * AUTO_CLICKS_PER_SECOND;
  const gained = perSecond * deltaSeconds;
  if (gained === 0) return state;
  return { ...state, energy: state.energy + gained, totalEnergy: state.totalEnergy + gained };
}

/** A energia do Núcleo acelera as máquinas da Fábrica. */
export function provides(state: BaseClickerState): ModeBonus[] {
  return [
    {
      target: 'productionChain',
      stat: 'production',
      value: 1 + Math.log10(1 + rawProduction(state)) / 5,
      source: 'Energia do Núcleo',
    },
  ];
}

export function click(state: BaseClickerState, ctx: ModeContext): BaseClickerState {
  const gained = clickValue(state, ctx);
  return {
    ...state,
    energy: state.energy + gained,
    totalEnergy: state.totalEnergy + gained,
    clicks: state.clicks + 1,
  };
}

export function buyGenerator(state: BaseClickerState, index: number, amount: number | 'max'): BaseClickerState {
  const owned = state.owned[index] ?? 0;
  const n = amount === 'max' ? maxAffordable(index, owned, state.energy) : amount;
  if (n <= 0) return state;
  const cost = bulkCost(index, owned, n);
  if (cost > state.energy) return state;
  const nextOwned = [...state.owned];
  nextOwned[index] = owned + n;
  return { ...state, energy: state.energy - cost, owned: nextOwned };
}

export function restore(saved: unknown): BaseClickerState {
  const s = (saved ?? {}) as Partial<BaseClickerState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    energy: num(s.energy),
    totalEnergy: num(s.totalEnergy),
    clicks: num(s.clicks),
    owned: GENERATORS.map((_, i) => num(Array.isArray(s.owned) ? s.owned[i] : 0)),
  };
}
