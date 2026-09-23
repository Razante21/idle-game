import { createRng, validSeed } from '../../core/rng';
import type { ModeBonus, ModeContext } from '../../core/types';

export type Resource = 'minerio' | 'lingote' | 'engrenagem' | 'maquina' | 'petroleo' | 'plastico' | 'circuito' | 'robo';
export type TechId =
  | 'esteiras'
  | 'prospeccao'
  | 'eletronica'
  | 'robotica'
  | 'turnoDuplo'
  | 'recrutamento'
  | 'logistica'
  | 'superLigas'
  | 'armazemInteligente';

export const RESOURCES: Resource[] = ['minerio', 'lingote', 'engrenagem', 'maquina', 'petroleo', 'plastico', 'circuito', 'robo'];

export const RESOURCE_NAMES: Record<Resource, string> = {
  minerio: 'Minério',
  lingote: 'Lingotes',
  engrenagem: 'Engrenagens',
  maquina: 'Máquinas',
  petroleo: 'Petróleo',
  plastico: 'Plástico',
  circuito: 'Circuitos',
  robo: 'Robôs',
};

/** Produtos finais não têm limite de armazém. */
const UNCAPPED: ReadonlySet<Resource> = new Set(['maquina', 'robo']);

export interface StationDef {
  name: string;
  output: Resource;
  /** Produção por operário por segundo, no nível 0. */
  rate: number;
  inputs: { resource: Resource; perOutput: number }[];
  upgrade: { resource: Resource; baseCost: number };
  requires?: TechId;
}

export const STATIONS: StationDef[] = [
  { name: 'Mina', output: 'minerio', rate: 1, inputs: [], upgrade: { resource: 'lingote', baseCost: 10 } },
  {
    name: 'Fundição',
    output: 'lingote',
    rate: 0.5,
    inputs: [{ resource: 'minerio', perOutput: 2 }],
    upgrade: { resource: 'lingote', baseCost: 25 },
  },
  {
    name: 'Montagem',
    output: 'engrenagem',
    rate: 0.25,
    inputs: [{ resource: 'lingote', perOutput: 3 }],
    upgrade: { resource: 'engrenagem', baseCost: 10 },
  },
  {
    name: 'Oficina',
    output: 'maquina',
    rate: 0.05,
    inputs: [{ resource: 'engrenagem', perOutput: 5 }],
    upgrade: { resource: 'engrenagem', baseCost: 25 },
  },
  {
    name: 'Poço',
    output: 'petroleo',
    rate: 0.8,
    inputs: [],
    upgrade: { resource: 'engrenagem', baseCost: 40 },
    requires: 'prospeccao',
  },
  {
    name: 'Refinaria',
    output: 'plastico',
    rate: 0.3,
    inputs: [{ resource: 'petroleo', perOutput: 2 }],
    upgrade: { resource: 'engrenagem', baseCost: 80 },
    requires: 'prospeccao',
  },
  {
    name: 'Laboratório',
    output: 'circuito',
    rate: 0.1,
    inputs: [
      { resource: 'plastico', perOutput: 2 },
      { resource: 'lingote', perOutput: 2 },
    ],
    upgrade: { resource: 'circuito', baseCost: 10 },
    requires: 'eletronica',
  },
  {
    name: 'Linha Robótica',
    output: 'robo',
    rate: 0.02,
    inputs: [
      { resource: 'maquina', perOutput: 1 },
      { resource: 'circuito', perOutput: 5 },
    ],
    upgrade: { resource: 'circuito', baseCost: 30 },
    requires: 'robotica',
  },
];

export interface TechDef {
  name: string;
  description: string;
  cost: { resource: Resource; amount: number };
  requires?: TechId;
}

export const TECHS: Record<TechId, TechDef> = {
  esteiras: { name: 'Esteiras', description: 'Produção de todas as estações +25%', cost: { resource: 'engrenagem', amount: 30 } },
  prospeccao: {
    name: 'Prospecção',
    description: 'Libera o Poço e a Refinaria',
    cost: { resource: 'engrenagem', amount: 60 },
    requires: 'esteiras',
  },
  recrutamento: {
    name: 'Recrutamento',
    description: 'Contratar fica bem mais barato',
    cost: { resource: 'engrenagem', amount: 150 },
    requires: 'esteiras',
  },
  eletronica: {
    name: 'Eletrônica',
    description: 'Libera o Laboratório de circuitos',
    cost: { resource: 'plastico', amount: 40 },
    requires: 'prospeccao',
  },
  logistica: {
    name: 'Logística',
    description: 'Contratos dão o dobro de reputação',
    cost: { resource: 'plastico', amount: 200 },
    requires: 'prospeccao',
  },
  robotica: {
    name: 'Robótica',
    description: 'Libera a Linha Robótica',
    cost: { resource: 'circuito', amount: 40 },
    requires: 'eletronica',
  },
  armazemInteligente: {
    name: 'Armazém Inteligente',
    description: 'Capacidade dos armazéns x4',
    cost: { resource: 'circuito', amount: 80 },
    requires: 'eletronica',
  },
  turnoDuplo: {
    name: 'Turno Duplo',
    description: 'Produção de todas as estações +50%',
    cost: { resource: 'circuito', amount: 100 },
    requires: 'eletronica',
  },
  superLigas: {
    name: 'Superligas',
    description: 'Todas as estações gastam 20% menos insumo',
    cost: { resource: 'circuito', amount: 250 },
    requires: 'turnoDuplo',
  },
};

export const TECH_IDS = Object.keys(TECHS) as TechId[];

const LEVEL_SPEED = 1.6;
const UPGRADE_GROWTH = 2.5;
const STARTING_WORKERS = 3;
const HIRE_BASE_COST = 5;
const STORAGE_BASE = 200;
const STORAGE_UPGRADE_BASE = 40;
const CONTRACT_DURATION = 300;
const CONTRACT_COOLDOWN_FAIL = 60;
const CONTRACT_COOLDOWN_DONE = 20;
const REPUTATION_BONUS = 0.05;
const CONTRACT_REWARD: Record<Resource, number> = {
  minerio: 1,
  lingote: 1,
  engrenagem: 2,
  maquina: 4,
  petroleo: 1,
  plastico: 2,
  circuito: 3,
  robo: 6,
};

export interface Contract {
  resource: Resource;
  amount: number;
  timeLeft: number;
  reward: number;
}

export interface ProductionChainState {
  resources: Record<Resource, number>;
  workers: number;
  assigned: number[];
  levels: number[];
  /** Saída real por segundo de cada estação no último passo (mostra os gargalos). */
  flow: number[];
  techs: TechId[];
  storageLevel: number;
  contract: Contract | null;
  contractCooldown: number;
  contractsDone: number;
  reputation: number;
  seed: number;
}

function emptyResources(): Record<Resource, number> {
  return Object.fromEntries(RESOURCES.map((r) => [r, 0])) as Record<Resource, number>;
}

export const initialProductionChainState: ProductionChainState = {
  resources: emptyResources(),
  workers: STARTING_WORKERS,
  assigned: STATIONS.map(() => 0),
  levels: STATIONS.map(() => 0),
  flow: STATIONS.map(() => 0),
  techs: [],
  storageLevel: 0,
  contract: null,
  contractCooldown: 30,
  contractsDone: 0,
  reputation: 0,
  seed: 4242,
};

function station(i: number): StationDef {
  const s = STATIONS[i];
  if (!s) throw new Error(`Estação inexistente: ${i}`);
  return s;
}

export function hasTech(state: ProductionChainState, id: TechId): boolean {
  return state.techs.includes(id);
}

export function isStationUnlocked(state: ProductionChainState, i: number): boolean {
  const req = station(i).requires;
  return !req || hasTech(state, req);
}

export function freeWorkers(state: ProductionChainState): number {
  return state.workers - state.assigned.reduce((a, b) => a + b, 0);
}

export function hireCost(state: ProductionChainState): number {
  const growth = hasTech(state, 'recrutamento') ? 1.22 : 1.35;
  return Math.ceil(HIRE_BASE_COST * growth ** (state.workers - STARTING_WORKERS));
}

export function upgradeCost(state: ProductionChainState, i: number): number {
  return Math.ceil(station(i).upgrade.baseCost * UPGRADE_GROWTH ** (state.levels[i] ?? 0));
}

export function storageCap(state: ProductionChainState, resource: Resource, ctx: ModeContext): number {
  if (UNCAPPED.has(resource)) return Infinity;
  let cap = STORAGE_BASE * 2 ** state.storageLevel;
  if (hasTech(state, 'armazemInteligente')) cap *= 4;
  if (ctx.hasFlag('fabrica.armazemInfinito')) cap *= 10;
  return cap;
}

export function storageUpgradeCost(state: ProductionChainState): number {
  return Math.ceil(STORAGE_UPGRADE_BASE * UPGRADE_GROWTH ** state.storageLevel);
}

export function inputPerOutput(state: ProductionChainState, perOutput: number, ctx: ModeContext): number {
  let mult = 1;
  if (ctx.hasFlag('fabrica.eficiencia')) mult *= 0.75;
  if (hasTech(state, 'superLigas')) mult *= 0.8;
  return perOutput * mult;
}

export function reputationMultiplier(state: ProductionChainState): number {
  return 1 + REPUTATION_BONUS * state.reputation;
}

export function productionMultiplier(state: ProductionChainState, ctx: ModeContext): number {
  let m = ctx.multiplier('production') * reputationMultiplier(state);
  if (hasTech(state, 'esteiras')) m *= 1.25;
  if (hasTech(state, 'turnoDuplo')) m *= 1.5;
  return m;
}

/** Capacidade de saída por segundo da estação, se não faltar insumo. */
export function capacity(state: ProductionChainState, i: number, ctx: ModeContext): number {
  if (!isStationUnlocked(state, i)) return 0;
  const s = station(i);
  return (state.assigned[i] ?? 0) * s.rate * LEVEL_SPEED ** (state.levels[i] ?? 0) * productionMultiplier(state, ctx);
}

function contractReward(state: ProductionChainState, resource: Resource, ctx: ModeContext): number {
  let reward = CONTRACT_REWARD[resource];
  if (hasTech(state, 'logistica')) reward *= 2;
  if (ctx.hasFlag('fabrica.contratosDobrados')) reward *= 2;
  return reward;
}

function tickContract(state: ProductionChainState, dt: number, ctx: ModeContext): ProductionChainState {
  if (state.contract) {
    const timeLeft = state.contract.timeLeft - dt;
    if (timeLeft > 0) return { ...state, contract: { ...state.contract, timeLeft } };
    return { ...state, contract: null, contractCooldown: CONTRACT_COOLDOWN_FAIL };
  }
  const cooldown = state.contractCooldown - dt;
  if (cooldown > 0) return { ...state, contractCooldown: cooldown };

  const rng = createRng(state.seed);
  const candidates = STATIONS.map((s, i) => ({ s, i })).filter(({ i }) => isStationUnlocked(state, i) && (state.assigned[i] ?? 0) > 0);
  const pool = candidates.length > 0 ? candidates : [{ s: station(0), i: 0 }];
  const pick = pool[Math.floor(rng.next() * pool.length)]!;
  // Pede cerca de 2 minutos da produção atual da estação, para o contrato ser apertado mas possível.
  const perSecond = Math.max(capacity(state, pick.i, ctx), 0.05);
  const amount = Math.max(5, Math.ceil(perSecond * 120 * rng.range(0.8, 1.6)));
  const cap = storageCap(state, pick.s.output, ctx);
  return {
    ...state,
    seed: rng.seed,
    contractCooldown: 0,
    contract: {
      resource: pick.s.output,
      amount: Math.min(amount, Math.floor(cap * 0.9)),
      timeLeft: CONTRACT_DURATION,
      reward: contractReward(state, pick.s.output, ctx),
    },
  };
}

export function tick(state: ProductionChainState, dt: number, ctx: ModeContext): ProductionChainState {
  const resources = { ...state.resources };
  const flow = STATIONS.map((s, i) => {
    let out = capacity(state, i, ctx) * dt;
    if (out <= 0) return 0;
    for (const input of s.inputs) {
      out = Math.min(out, resources[input.resource] / inputPerOutput(state, input.perOutput, ctx));
    }
    for (const input of s.inputs) {
      resources[input.resource] -= out * inputPerOutput(state, input.perOutput, ctx);
    }
    resources[s.output] = Math.min(resources[s.output] + out, storageCap(state, s.output, ctx));
    return dt > 0 ? out / dt : 0;
  });
  return tickContract({ ...state, resources, flow }, dt, ctx);
}

export function assign(state: ProductionChainState, i: number, delta: number): ProductionChainState {
  if (!isStationUnlocked(state, i)) return state;
  const current = state.assigned[i] ?? 0;
  const next = Math.max(0, Math.min(current + delta, current + freeWorkers(state)));
  if (next === current) return state;
  const assigned = [...state.assigned];
  assigned[i] = next;
  return { ...state, assigned };
}

function spend(state: ProductionChainState, resource: Resource, amount: number): ProductionChainState | null {
  if (state.resources[resource] < amount) return null;
  return { ...state, resources: { ...state.resources, [resource]: state.resources[resource] - amount } };
}

export function hire(state: ProductionChainState): ProductionChainState {
  const paid = spend(state, 'lingote', hireCost(state));
  return paid ? { ...paid, workers: paid.workers + 1 } : state;
}

export function upgrade(state: ProductionChainState, i: number): ProductionChainState {
  if (!isStationUnlocked(state, i)) return state;
  const paid = spend(state, station(i).upgrade.resource, upgradeCost(state, i));
  if (!paid) return state;
  const levels = [...paid.levels];
  levels[i] = (levels[i] ?? 0) + 1;
  return { ...paid, levels };
}

export function expandStorage(state: ProductionChainState): ProductionChainState {
  const paid = spend(state, 'lingote', storageUpgradeCost(state));
  return paid ? { ...paid, storageLevel: paid.storageLevel + 1 } : state;
}

export function techStatus(state: ProductionChainState, id: TechId): 'owned' | 'available' | 'unaffordable' | 'locked' {
  if (hasTech(state, id)) return 'owned';
  const t = TECHS[id];
  if (t.requires && !hasTech(state, t.requires)) return 'locked';
  return state.resources[t.cost.resource] >= t.cost.amount ? 'available' : 'unaffordable';
}

export function research(state: ProductionChainState, id: TechId): ProductionChainState {
  if (techStatus(state, id) !== 'available') return state;
  const paid = spend(state, TECHS[id].cost.resource, TECHS[id].cost.amount);
  return paid ? { ...paid, techs: [...paid.techs, id] } : state;
}

export function deliverContract(state: ProductionChainState): ProductionChainState {
  const c = state.contract;
  if (!c) return state;
  const paid = spend(state, c.resource, c.amount);
  if (!paid) return state;
  return {
    ...paid,
    contract: null,
    contractCooldown: CONTRACT_COOLDOWN_DONE,
    contractsDone: paid.contractsDone + 1,
    reputation: paid.reputation + c.reward,
  };
}

export function essenceRate(state: ProductionChainState): number {
  return 0.3 * Math.sqrt(state.resources.maquina) + Math.sqrt(state.resources.robo);
}

export function provides(state: ProductionChainState): ModeBonus[] {
  const m = Math.sqrt(state.resources.maquina);
  const bonuses: ModeBonus[] = [
    { target: 'baseClicker', stat: 'production', value: 1 + 0.25 * m, source: 'Máquinas da Fábrica' },
    { target: 'roguelike', stat: 'production', value: 1 + 0.1 * m, source: 'Armas da Fábrica' },
  ];
  if (state.resources.robo > 0) {
    bonuses.push({
      target: 'global',
      stat: 'production',
      value: 1 + 0.05 * Math.sqrt(state.resources.robo),
      source: 'Robôs da Fábrica',
    });
  }
  return bonuses;
}

export function restore(saved: unknown): ProductionChainState {
  const s = (saved ?? {}) as Partial<ProductionChainState>;
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const list = (v: unknown) => STATIONS.map((_, i) => Math.floor(num(Array.isArray(v) ? v[i] : 0)));
  const r = (s.resources ?? {}) as Partial<Record<Resource, number>>;
  const workers = Math.max(STARTING_WORKERS, Math.floor(num(s.workers)));
  let assigned = list(s.assigned);
  if (assigned.reduce((a, b) => a + b, 0) > workers) assigned = STATIONS.map(() => 0);
  const c = s.contract as Partial<Contract> | null | undefined;
  const contract =
    c && typeof c.resource === 'string' && RESOURCES.includes(c.resource as Resource) && num(c.amount) > 0 && num(c.timeLeft) > 0
      ? { resource: c.resource as Resource, amount: num(c.amount), timeLeft: num(c.timeLeft), reward: num(c.reward, 1) }
      : null;
  return {
    resources: Object.fromEntries(RESOURCES.map((res) => [res, num(r[res])])) as Record<Resource, number>,
    workers,
    assigned,
    levels: list(s.levels),
    flow: STATIONS.map(() => 0),
    techs: Array.isArray(s.techs) ? s.techs.filter((t): t is TechId => TECH_IDS.includes(t as TechId)) : [],
    storageLevel: Math.floor(num(s.storageLevel)),
    contract,
    contractCooldown: num(s.contractCooldown, initialProductionChainState.contractCooldown),
    contractsDone: Math.floor(num(s.contractsDone)),
    reputation: num(s.reputation),
    seed: validSeed(s.seed, initialProductionChainState.seed),
  };
}
