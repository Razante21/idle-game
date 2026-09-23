import type { ModeBonus, ModeContext } from '../../core/types';

export type Resource = 'minerio' | 'lingote' | 'engrenagem' | 'maquina';

export const RESOURCE_NAMES: Record<Resource, string> = {
  minerio: 'Minério',
  lingote: 'Lingotes',
  engrenagem: 'Engrenagens',
  maquina: 'Máquinas',
};

export interface StationDef {
  name: string;
  output: Resource;
  /** Produção por operário por segundo, no nível 0. */
  rate: number;
  input?: { resource: Resource; perOutput: number };
  upgrade: { resource: Resource; baseCost: number };
}

export const STATIONS: StationDef[] = [
  { name: 'Mina', output: 'minerio', rate: 1, upgrade: { resource: 'lingote', baseCost: 10 } },
  {
    name: 'Fundição',
    output: 'lingote',
    rate: 0.5,
    input: { resource: 'minerio', perOutput: 2 },
    upgrade: { resource: 'lingote', baseCost: 25 },
  },
  {
    name: 'Montagem',
    output: 'engrenagem',
    rate: 0.25,
    input: { resource: 'lingote', perOutput: 3 },
    upgrade: { resource: 'engrenagem', baseCost: 10 },
  },
  {
    name: 'Oficina',
    output: 'maquina',
    rate: 0.05,
    input: { resource: 'engrenagem', perOutput: 5 },
    upgrade: { resource: 'engrenagem', baseCost: 25 },
  },
];

const LEVEL_SPEED = 1.6;
const UPGRADE_GROWTH = 2.5;
const STARTING_WORKERS = 3;
const HIRE_BASE_COST = 5;
const HIRE_GROWTH = 1.35;
const EFFICIENT_INPUT = 0.75;

export interface ProductionChainState {
  resources: Record<Resource, number>;
  workers: number;
  assigned: number[];
  levels: number[];
  /** Saída real por segundo de cada estação no último passo (mostra os gargalos). */
  flow: number[];
}

export const initialProductionChainState: ProductionChainState = {
  resources: { minerio: 0, lingote: 0, engrenagem: 0, maquina: 0 },
  workers: STARTING_WORKERS,
  assigned: STATIONS.map(() => 0),
  levels: STATIONS.map(() => 0),
  flow: STATIONS.map(() => 0),
};

function station(i: number): StationDef {
  const s = STATIONS[i];
  if (!s) throw new Error(`Estação inexistente: ${i}`);
  return s;
}

export function freeWorkers(state: ProductionChainState): number {
  return state.workers - state.assigned.reduce((a, b) => a + b, 0);
}

export function hireCost(state: ProductionChainState): number {
  return Math.ceil(HIRE_BASE_COST * HIRE_GROWTH ** (state.workers - STARTING_WORKERS));
}

export function upgradeCost(state: ProductionChainState, i: number): number {
  return Math.ceil(station(i).upgrade.baseCost * UPGRADE_GROWTH ** (state.levels[i] ?? 0));
}

export function inputPerOutput(i: number, ctx: ModeContext): number {
  const input = station(i).input;
  if (!input) return 0;
  return input.perOutput * (ctx.hasFlag('fabrica.eficiencia') ? EFFICIENT_INPUT : 1);
}

/** Capacidade de saída por segundo da estação, se não faltar insumo. */
export function capacity(state: ProductionChainState, i: number, ctx: ModeContext): number {
  const s = station(i);
  return (state.assigned[i] ?? 0) * s.rate * LEVEL_SPEED ** (state.levels[i] ?? 0) * ctx.multiplier('production');
}

export function tick(state: ProductionChainState, dt: number, ctx: ModeContext): ProductionChainState {
  const resources = { ...state.resources };
  const flow = STATIONS.map((s, i) => {
    let out = capacity(state, i, ctx) * dt;
    if (s.input) {
      const cost = inputPerOutput(i, ctx);
      out = Math.min(out, resources[s.input.resource] / cost);
      resources[s.input.resource] -= out * cost;
    }
    resources[s.output] += out;
    return dt > 0 ? out / dt : 0;
  });
  return { ...state, resources, flow };
}

export function assign(state: ProductionChainState, i: number, delta: number): ProductionChainState {
  const current = state.assigned[i] ?? 0;
  const next = Math.max(0, Math.min(current + delta, current + freeWorkers(state)));
  if (next === current) return state;
  const assigned = [...state.assigned];
  assigned[i] = next;
  return { ...state, assigned };
}

export function hire(state: ProductionChainState): ProductionChainState {
  const cost = hireCost(state);
  if (state.resources.lingote < cost) return state;
  return {
    ...state,
    workers: state.workers + 1,
    resources: { ...state.resources, lingote: state.resources.lingote - cost },
  };
}

export function upgrade(state: ProductionChainState, i: number): ProductionChainState {
  const cost = upgradeCost(state, i);
  const res = station(i).upgrade.resource;
  if (state.resources[res] < cost) return state;
  const levels = [...state.levels];
  levels[i] = (levels[i] ?? 0) + 1;
  return { ...state, levels, resources: { ...state.resources, [res]: state.resources[res] - cost } };
}

export function essenceRate(state: ProductionChainState): number {
  return 0.3 * Math.sqrt(state.resources.maquina);
}

export function provides(state: ProductionChainState): ModeBonus[] {
  const m = Math.sqrt(state.resources.maquina);
  return [
    { target: 'baseClicker', stat: 'production', value: 1 + 0.25 * m, source: 'Máquinas da Fábrica' },
    { target: 'roguelike', stat: 'production', value: 1 + 0.1 * m, source: 'Armas da Fábrica' },
  ];
}

export function restore(saved: unknown): ProductionChainState {
  const s = (saved ?? {}) as Partial<ProductionChainState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const list = (v: unknown) => STATIONS.map((_, i) => Math.floor(num(Array.isArray(v) ? v[i] : 0)));
  const r = (s.resources ?? {}) as Partial<Record<Resource, number>>;
  const workers = Math.max(STARTING_WORKERS, Math.floor(num(s.workers)));
  let assigned = list(s.assigned);
  if (assigned.reduce((a, b) => a + b, 0) > workers) assigned = STATIONS.map(() => 0);
  return {
    resources: {
      minerio: num(r.minerio),
      lingote: num(r.lingote),
      engrenagem: num(r.engrenagem),
      maquina: num(r.maquina),
    },
    workers,
    assigned,
    levels: list(s.levels),
    flow: STATIONS.map(() => 0),
  };
}
