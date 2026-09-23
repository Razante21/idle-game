import { createRng, validSeed } from '../../core/rng';
import type { ModeBonus, ModeContext } from '../../core/types';
import { GENERATORS, UPGRADES_BY_ID, type GeneratorDef, type UpgradeDef, type UpgradeRequirement } from './upgrades';

export { GENERATORS };

export const MILESTONE_EVERY = 25;
const MILESTONE_EVERY_ASCENDED = 20;
const AUTO_CLICKS_PER_SECOND = 5;
const BASE_CLICK_SHARE = 0.05;
const ESSENCE_DIVISOR = 15;

export const SURGE_MULT = 7;
const SURGE_DURATION = 30;
const SURGE_ORB_LIFETIME = 15;
const SURGE_INTERVAL: [number, number] = [90, 240];
const FIRST_SURGE_IN = 60;

const CARGA_PER_LEVEL = 0.1;
const CARGA_ENERGY_UNIT = 1e7;

export interface SurgeState {
  nextIn: number;
  orbLeft: number;
  orbX: number;
  orbY: number;
  activeLeft: number;
  caught: number;
}

export interface BaseClickerState {
  energy: number;
  totalEnergy: number;
  /** Energia desde a última Sobrecarga; define quanta Carga o próximo reset rende. */
  runEnergy: number;
  clicks: number;
  owned: number[];
  upgrades: string[];
  carga: number;
  sobrecargas: number;
  surge: SurgeState;
  seed: number;
}

export const initialBaseClickerState: BaseClickerState = {
  energy: 0,
  totalEnergy: 0,
  runEnergy: 0,
  clicks: 0,
  owned: GENERATORS.map(() => 0),
  upgrades: [],
  carga: 0,
  sobrecargas: 0,
  surge: { nextIn: FIRST_SURGE_IN, orbLeft: 0, orbX: 50, orbY: 50, activeLeft: 0, caught: 0 },
  seed: 7331,
};

function def(index: number): GeneratorDef {
  const g = GENERATORS[index];
  if (!g) throw new Error(`Gerador inexistente: ${index}`);
  return g;
}

// ---------- Modificadores vindos das melhorias ----------

interface Modifiers {
  genMult: number[];
  synergy: { from: number; to: number; perUnit: number }[];
  clickMult: number;
  clickShare: number;
  surgeFrequency: number;
  surgeDuration: number;
}

const modifierCache = new WeakMap<readonly string[], Modifiers>();

export function modifiers(upgrades: readonly string[]): Modifiers {
  const cached = modifierCache.get(upgrades);
  if (cached) return cached;
  const m: Modifiers = {
    genMult: GENERATORS.map(() => 1),
    synergy: [],
    clickMult: 1,
    clickShare: BASE_CLICK_SHARE,
    surgeFrequency: 1,
    surgeDuration: SURGE_DURATION,
  };
  for (const id of upgrades) {
    const effect = UPGRADES_BY_ID.get(id)?.effect;
    if (!effect) continue;
    if (effect.type === 'generator') m.genMult[effect.index]! *= effect.mult;
    if (effect.type === 'click') {
      m.clickMult *= effect.mult;
      m.clickShare += effect.share;
    }
    if (effect.type === 'synergy') m.synergy.push(effect);
    if (effect.type === 'surge') {
      m.surgeFrequency *= effect.frequency;
      m.surgeDuration += effect.duration;
    }
  }
  modifierCache.set(upgrades, m);
  return m;
}

// ---------- Custos ----------

export function bulkCost(index: number, owned: number, amount: number): number {
  const { baseCost, growth } = def(index);
  return (baseCost * growth ** owned * (growth ** amount - 1)) / (growth - 1);
}

export function maxAffordable(index: number, owned: number, energy: number): number {
  const { baseCost, growth } = def(index);
  const first = baseCost * growth ** owned;
  if (energy < first) return 0;
  const n = Math.floor(Math.log((energy * (growth - 1)) / first + 1) / Math.log(growth));
  // Protege contra erro de ponto flutuante na borda.
  return bulkCost(index, owned, n) > energy ? n - 1 : n;
}

// ---------- Produção ----------

export function milestoneEvery(ctx: ModeContext): number {
  return ctx.hasFlag('nucleo.milestone20') ? MILESTONE_EVERY_ASCENDED : MILESTONE_EVERY;
}

export function milestoneMultiplier(owned: number, every = MILESTONE_EVERY): number {
  return 2 ** Math.floor(owned / every);
}

/** Produção de um tipo de gerador, antes de Carga, Surto e multiplicadores externos. */
export function generatorRate(state: BaseClickerState, index: number, every = MILESTONE_EVERY): number {
  const owned = state.owned[index] ?? 0;
  if (owned === 0) return 0;
  const m = modifiers(state.upgrades);
  let synergy = 1;
  for (const s of m.synergy) if (s.to === index) synergy += s.perUnit * (state.owned[s.from] ?? 0);
  return def(index).baseRate * owned * milestoneMultiplier(owned, every) * m.genMult[index]! * synergy;
}

function rawProduction(state: BaseClickerState, every = MILESTONE_EVERY): number {
  let sum = 0;
  for (let i = 0; i < GENERATORS.length; i++) sum += generatorRate(state, i, every);
  return sum;
}

export function cargaMultiplier(state: BaseClickerState): number {
  return 1 + CARGA_PER_LEVEL * state.carga;
}

export function surgeMultiplier(state: BaseClickerState): number {
  return state.surge.activeLeft > 0 ? SURGE_MULT : 1;
}

export function productionPerSecond(state: BaseClickerState, ctx: ModeContext): number {
  return (
    rawProduction(state, milestoneEvery(ctx)) *
    cargaMultiplier(state) *
    surgeMultiplier(state) *
    ctx.multiplier('production')
  );
}

export function clickValue(state: BaseClickerState, ctx: ModeContext): number {
  const m = modifiers(state.upgrades);
  return (1 + m.clickShare * productionPerSecond(state, ctx)) * m.clickMult * ctx.multiplier('click');
}

export function essenceRate(state: BaseClickerState, ctx: ModeContext): number {
  return Math.sqrt(productionPerSecond(state, ctx)) / ESSENCE_DIVISOR;
}

function addEnergy(state: BaseClickerState, gained: number): BaseClickerState {
  return {
    ...state,
    energy: state.energy + gained,
    totalEnergy: state.totalEnergy + gained,
    runEnergy: state.runEnergy + gained,
  };
}

// ---------- Surtos ----------

function nextSurgeDelay(state: BaseClickerState, ctx: ModeContext, roll: number): number {
  const [min, max] = SURGE_INTERVAL;
  let freq = modifiers(state.upgrades).surgeFrequency;
  if (ctx.hasFlag('nucleo.surtoFrequente')) freq *= 0.5;
  return (min + (max - min) * roll) * freq;
}

function tickSurge(state: BaseClickerState, dt: number, ctx: ModeContext): BaseClickerState {
  const s = { ...state.surge };
  let seed = state.seed;
  s.activeLeft = Math.max(0, s.activeLeft - dt);
  if (s.orbLeft > 0) {
    s.orbLeft -= dt;
    if (s.orbLeft <= 0) {
      const rng = createRng(seed);
      s.orbLeft = 0;
      s.nextIn = nextSurgeDelay(state, ctx, rng.next());
      seed = rng.seed;
    }
  } else {
    s.nextIn -= dt;
    if (s.nextIn <= 0) {
      const rng = createRng(seed);
      s.orbLeft = SURGE_ORB_LIFETIME;
      s.orbX = rng.range(12, 88);
      s.orbY = rng.range(15, 85);
      seed = rng.seed;
    }
  }
  return { ...state, surge: s, seed };
}

export function catchSurge(state: BaseClickerState, ctx: ModeContext): BaseClickerState {
  if (state.surge.orbLeft <= 0) return state;
  const rng = createRng(state.seed);
  return {
    ...state,
    seed: rng.seed,
    surge: {
      ...state.surge,
      orbLeft: 0,
      activeLeft: modifiers(state.upgrades).surgeDuration,
      caught: state.surge.caught + 1,
      nextIn: nextSurgeDelay(state, ctx, rng.next()),
    },
  };
}

// ---------- Ações ----------

export function tick(state: BaseClickerState, deltaSeconds: number, ctx: ModeContext): BaseClickerState {
  let perSecond = productionPerSecond(state, ctx);
  if (ctx.hasFlag('nucleo.autoclick')) perSecond += clickValue(state, ctx) * AUTO_CLICKS_PER_SECOND;
  const next = tickSurge(state, deltaSeconds, ctx);
  const gained = perSecond * deltaSeconds;
  return gained === 0 ? next : addEnergy(next, gained);
}

export function click(state: BaseClickerState, ctx: ModeContext): BaseClickerState {
  return { ...addEnergy(state, clickValue(state, ctx)), clicks: state.clicks + 1 };
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

export function isRequirementMet(state: BaseClickerState, req: UpgradeRequirement): boolean {
  switch (req.kind) {
    case 'owned':
      return (state.owned[req.index] ?? 0) >= req.count;
    case 'pair':
      return (state.owned[req.a] ?? 0) >= req.count && (state.owned[req.b] ?? 0) >= req.count;
    case 'clicks':
      return state.clicks >= req.count;
    case 'surges':
      return state.surge.caught >= req.count;
  }
}

export function upgradeStatus(state: BaseClickerState, u: UpgradeDef): 'owned' | 'available' | 'unaffordable' | 'locked' {
  if (state.upgrades.includes(u.id)) return 'owned';
  if (!isRequirementMet(state, u.requirement)) return 'locked';
  return state.energy >= u.cost ? 'available' : 'unaffordable';
}

export function buyUpgrade(state: BaseClickerState, id: string): BaseClickerState {
  const u = UPGRADES_BY_ID.get(id);
  if (!u || upgradeStatus(state, u) !== 'available') return state;
  return { ...state, energy: state.energy - u.cost, upgrades: [...state.upgrades, id] };
}

// ---------- Sobrecarga (prestígio do Núcleo) ----------

export function cargaGain(state: BaseClickerState): number {
  return Math.floor(Math.sqrt(state.runEnergy / CARGA_ENERGY_UNIT));
}

/** Zera energia, geradores e melhorias; mantém cliques, Surtos e a Carga acumulada. */
export function sobrecarga(state: BaseClickerState): BaseClickerState {
  const gain = cargaGain(state);
  if (gain < 1) return state;
  return {
    ...state,
    energy: 0,
    runEnergy: 0,
    owned: GENERATORS.map(() => 0),
    upgrades: [],
    carga: state.carga + gain,
    sobrecargas: state.sobrecargas + 1,
  };
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

export function restore(saved: unknown): BaseClickerState {
  const s = (saved ?? {}) as Partial<BaseClickerState>;
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const surge = (s.surge ?? {}) as Partial<SurgeState>;
  const totalEnergy = num(s.totalEnergy);
  return {
    energy: num(s.energy),
    totalEnergy,
    runEnergy: num(s.runEnergy, totalEnergy),
    clicks: num(s.clicks),
    owned: GENERATORS.map((_, i) => Math.floor(num(Array.isArray(s.owned) ? s.owned[i] : 0))),
    upgrades: Array.isArray(s.upgrades) ? s.upgrades.filter((id): id is string => UPGRADES_BY_ID.has(id as string)) : [],
    carga: Math.floor(num(s.carga)),
    sobrecargas: Math.floor(num(s.sobrecargas)),
    surge: {
      nextIn: num(surge.nextIn, FIRST_SURGE_IN),
      orbLeft: num(surge.orbLeft),
      orbX: num(surge.orbX, 50),
      orbY: num(surge.orbY, 50),
      activeLeft: num(surge.activeLeft),
      caught: Math.floor(num(surge.caught)),
    },
    seed: validSeed(s.seed, initialBaseClickerState.seed),
  };
}
