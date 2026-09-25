import { logSquared } from '../../core/curves';
import type { ModeBonus, ModeContext } from '../../core/types';

export type JobId = 'agricultor' | 'artesao' | 'estudioso';
export type BuildingId = 'casa' | 'celeiro' | 'oficina' | 'biblioteca' | 'monumento';
export type LawId =
  | 'racionamento'
  | 'mutirao'
  | 'guildas'
  | 'academia'
  | 'festival'
  | 'iluminacao'
  | 'conselho'
  | 'rotas'
  | 'censo'
  | 'tributo';

export const JOBS: Record<JobId, { name: string; description: string }> = {
  agricultor: { name: 'Agricultores', description: 'Plantam 0.3 comida/s cada' },
  artesao: { name: 'Artesãos', description: 'Transformam 0.5 materiais/s em 1 influência/s' },
  estudioso: { name: 'Estudiosos', description: 'Produzem 0.1 saber/s para as leis' },
};

export const JOB_IDS = Object.keys(JOBS) as JobId[];

export interface BuildingDef {
  name: string;
  description: string;
  baseCost: number;
  growth: number;
  currency: 'materiais' | 'influencia';
  /** Prédios que precisam da luz da Constelação para funcionar. */
  powered: boolean;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  casa: { name: 'Casa', description: '+5 de moradia', baseCost: 15, growth: 1.3, currency: 'materiais', powered: false },
  celeiro: {
    name: 'Celeiro',
    description: 'Agricultores +50% cada',
    baseCost: 40,
    growth: 1.45,
    currency: 'materiais',
    powered: false,
  },
  oficina: {
    name: 'Oficina',
    description: 'Artesãos +25% cada (precisa de luz)',
    baseCost: 80,
    growth: 1.55,
    currency: 'materiais',
    powered: true,
  },
  biblioteca: {
    name: 'Biblioteca',
    description: 'Estudiosos +30% cada (precisa de luz)',
    baseCost: 200,
    growth: 1.65,
    currency: 'materiais',
    powered: true,
  },
  monumento: {
    name: 'Monumento',
    description: 'Influência +25% cada (precisa de luz)',
    baseCost: 400,
    growth: 3.5,
    currency: 'influencia',
    powered: true,
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

export const LAWS: Record<LawId, { name: string; description: string; cost: number }> = {
  racionamento: { name: 'Racionamento', description: 'Cada habitante come 30% menos', cost: 15 },
  mutirao: { name: 'Mutirão', description: 'Casas abrigam 8 em vez de 5', cost: 40 },
  guildas: { name: 'Guildas', description: 'Artesãos produzem o dobro', cost: 100 },
  academia: { name: 'Academia', description: 'Estudiosos produzem o dobro', cost: 200 },
  festival: { name: 'Festival das Colheitas', description: 'A população cresce 3x mais rápido', cost: 400 },
  iluminacao: { name: 'Iluminação Pública', description: 'Prédios gastam metade da luz', cost: 800 },
  conselho: { name: 'Conselho', description: 'Novos habitantes escolhem um emprego sozinhos', cost: 1_500 },
  rotas: { name: 'Rotas Comerciais', description: 'Dobra o bônus da Colônia para a Fábrica', cost: 3_000 },
  censo: { name: 'Censo', description: 'Moradia +50%', cost: 6_000 },
  tributo: { name: 'Tributo à Rede', description: 'Essência de todos os modos x1.25', cost: 15_000 },
};

export const LAW_IDS = Object.keys(LAWS) as LawId[];

const BASE_HOUSING = 10;
const FOOD_PER_PERSON = 0.2;
const FARM_OUTPUT = 0.3;
const ARTISAN_INPUT = 0.5;
const ARTISAN_OUTPUT = 1;
const SCHOLAR_OUTPUT = 0.1;
const IDLE_OUTPUT = 0.1;
const MIN_POPULATION = 2;

export interface ColonyState {
  population: number;
  materiais: number;
  influencia: number;
  totalInfluencia: number;
  saber: number;
  buildings: Record<BuildingId, number>;
  jobs: Record<JobId, number>;
  laws: LawId[];
  peakPopulation: number;
}

function zeroBuildings(): Record<BuildingId, number> {
  return { casa: 0, celeiro: 0, oficina: 0, biblioteca: 0, monumento: 0 };
}

function zeroJobs(): Record<JobId, number> {
  return { agricultor: 0, artesao: 0, estudioso: 0 };
}

export const initialColonyState: ColonyState = {
  population: 3,
  materiais: 0,
  influencia: 0,
  totalInfluencia: 0,
  saber: 0,
  buildings: zeroBuildings(),
  jobs: { ...zeroJobs(), agricultor: 2 },
  laws: [],
  peakPopulation: 3,
};

export function hasLaw(state: ColonyState, id: LawId): boolean {
  return state.laws.includes(id);
}

export function housing(state: ColonyState): number {
  const perHouse = hasLaw(state, 'mutirao') ? 8 : 5;
  return (BASE_HOUSING + perHouse * state.buildings.casa) * (hasLaw(state, 'censo') ? 1.5 : 1);
}

export function employed(state: ColonyState): number {
  return JOB_IDS.reduce((sum, j) => sum + state.jobs[j], 0);
}

export function idle(state: ColonyState): number {
  return Math.max(0, Math.floor(state.population) - employed(state));
}

// ---------- Luz ----------

export function lightNeed(state: ColonyState): number {
  const powered = BUILDING_IDS.reduce((sum, b) => sum + (BUILDINGS[b].powered ? state.buildings[b] : 0), 0);
  return 2 * powered ** 1.5 * (hasLaw(state, 'iluminacao') ? 0.5 : 1);
}

/** Fração dos prédios iluminados (0 a 1). Sem prédios elétricos, tudo funciona. */
export function lightEfficiency(state: ColonyState, ctx: ModeContext): number {
  const need = lightNeed(state);
  return need > 0 ? Math.min(1, ctx.imports.luz / need) : 1;
}

// ---------- Economia ----------

export interface ColonyRates {
  foodNeed: number;
  /** Comida vinda do Jardim. */
  foodImported: number;
  foodLocal: number;
  materialsIn: number;
  /** Materiais que os artesãos querem gastar por segundo. */
  materialsUsed: number;
  influence: number;
  knowledge: number;
  light: number;
}

export function rates(state: ColonyState, ctx: ModeContext): ColonyRates {
  const prod = ctx.multiplier('production');
  const light = lightEfficiency(state, ctx);
  const b = state.buildings;
  const foodLocal = state.jobs.agricultor * FARM_OUTPUT * (1 + 0.5 * b.celeiro) * prod;
  const foodNeed = state.population * FOOD_PER_PERSON * (hasLaw(state, 'racionamento') ? 0.7 : 1);

  // Os artesãos param quando faltam materiais: o estoque mais o que chega da Fábrica.
  const wanted = state.jobs.artesao * ARTISAN_INPUT;
  const available = state.materiais > 0 ? wanted : Math.min(wanted, ctx.imports.materiais);
  const working = wanted > 0 ? available / wanted : 0;
  const artisan = state.jobs.artesao * working * ARTISAN_OUTPUT * (1 + 0.25 * b.oficina * light) * (hasLaw(state, 'guildas') ? 2 : 1);
  const influence = (artisan + idle(state) * IDLE_OUTPUT) * (1 + 0.25 * b.monumento * light) * prod;
  const knowledge = state.jobs.estudioso * SCHOLAR_OUTPUT * (1 + 0.3 * b.biblioteca * light) * (hasLaw(state, 'academia') ? 2 : 1);

  return {
    foodNeed,
    foodImported: ctx.imports.comida,
    foodLocal,
    materialsIn: ctx.imports.materiais,
    materialsUsed: available,
    influence,
    knowledge,
    light,
  };
}

function trimJobs(jobs: Record<JobId, number>, population: number): Record<JobId, number> {
  let excess = JOB_IDS.reduce((sum, j) => sum + jobs[j], 0) - Math.floor(population);
  if (excess <= 0) return jobs;
  const next = { ...jobs };
  for (const j of ['estudioso', 'artesao', 'agricultor'] as JobId[]) {
    const cut = Math.min(next[j], excess);
    next[j] -= cut;
    excess -= cut;
  }
  return next;
}

/** Conselho: cada habitante sem emprego vai para onde falta — comida primeiro, depois 2 artesãos para cada estudioso. */
function autoAssign(state: ColonyState, ctx: ModeContext): ColonyState {
  let next = state;
  for (let guard = 0; guard < 1000 && idle(next) > 0; guard++) {
    const r = rates(next, ctx);
    const job: JobId =
      r.foodImported + r.foodLocal < r.foodNeed * 1.1
        ? 'agricultor'
        : next.jobs.artesao < 2 * (next.jobs.estudioso + 1)
          ? 'artesao'
          : 'estudioso';
    next = { ...next, jobs: { ...next.jobs, [job]: next.jobs[job] + 1 } };
  }
  return next;
}

export function tick(state: ColonyState, dt: number, ctx: ModeContext): ColonyState {
  const r = rates(state, ctx);
  const supply = r.foodImported + r.foodLocal;
  const cap = housing(state);
  let population = state.population;
  if (supply >= r.foodNeed) {
    const speed = (0.05 + 0.01 * population) * (hasLaw(state, 'festival') ? 3 : 1);
    population = Math.min(Math.max(cap, population), population + speed * dt);
    if (population > cap) population = Math.max(cap, population - 0.02 * population * dt);
  } else {
    const hunger = 1 - supply / r.foodNeed;
    population = Math.max(MIN_POPULATION, population - 0.02 * population * hunger * dt);
  }

  const materiais = Math.max(0, state.materiais + (r.materialsIn - r.materialsUsed) * dt);
  const influencia = r.influence * dt;
  let next: ColonyState = {
    ...state,
    population,
    peakPopulation: Math.max(state.peakPopulation, population),
    jobs: trimJobs(state.jobs, population),
    materiais,
    influencia: state.influencia + influencia,
    totalInfluencia: state.totalInfluencia + influencia,
    saber: state.saber + r.knowledge * dt,
  };
  if (hasLaw(next, 'conselho')) next = autoAssign(next, ctx);
  return next;
}

// ---------- Ações ----------

export function assign(state: ColonyState, job: JobId, delta: number): ColonyState {
  const count = state.jobs[job] + delta;
  if (count < 0 || (delta > 0 && idle(state) < delta)) return state;
  return { ...state, jobs: { ...state.jobs, [job]: count } };
}

export function buildingCost(state: ColonyState, id: BuildingId): number {
  const def = BUILDINGS[id];
  return Math.ceil(def.baseCost * def.growth ** state.buildings[id]);
}

export function build(state: ColonyState, id: BuildingId): ColonyState {
  const def = BUILDINGS[id];
  const cost = buildingCost(state, id);
  if (state[def.currency] < cost) return state;
  return {
    ...state,
    [def.currency]: state[def.currency] - cost,
    buildings: { ...state.buildings, [id]: state.buildings[id] + 1 },
  };
}

export function lawStatus(state: ColonyState, id: LawId): 'owned' | 'available' | 'unaffordable' {
  if (hasLaw(state, id)) return 'owned';
  return state.saber >= LAWS[id].cost ? 'available' : 'unaffordable';
}

export function enact(state: ColonyState, id: LawId): ColonyState {
  if (lawStatus(state, id) !== 'available') return state;
  return { ...state, saber: state.saber - LAWS[id].cost, laws: [...state.laws, id] };
}

// ---------- Ligações ----------

export function essenceRate(state: ColonyState, ctx: ModeContext): number {
  return logSquared(rates(state, ctx).influence, 2) + logSquared(state.population, 2);
}

export function provides(state: ColonyState): ModeBonus[] {
  const pop = Math.sqrt(state.population);
  const bonuses: ModeBonus[] = [
    {
      target: 'productionChain',
      stat: 'production',
      value: 1 + 0.03 * pop * (hasLaw(state, 'rotas') ? 2 : 1),
      source: 'Mão de obra da Colônia',
    },
    { target: 'garden', stat: 'production', value: 1 + 0.1 * Math.sqrt(state.jobs.agricultor), source: 'Jardineiros da Colônia' },
  ];
  if (hasLaw(state, 'tributo')) bonuses.push({ target: 'global', stat: 'essence', value: 1.25, source: 'Tributo à Rede' });
  return bonuses;
}

/** Colapso: a Colônia recomeça; a Constituição guarda as leis. */
export function onCollapse(state: ColonyState, keeps: ReadonlySet<string>): ColonyState {
  return {
    ...initialColonyState,
    laws: keeps.has('leis') ? state.laws : [],
    peakPopulation: state.peakPopulation,
  };
}

export function restore(saved: unknown): ColonyState {
  const s = (saved ?? {}) as Partial<ColonyState>;
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const buildings = zeroBuildings();
  const rawB = (s.buildings ?? {}) as Partial<Record<BuildingId, unknown>>;
  for (const id of BUILDING_IDS) buildings[id] = Math.floor(num(rawB[id]));
  const jobs = zeroJobs();
  const rawJ = (s.jobs ?? {}) as Partial<Record<JobId, unknown>>;
  for (const id of JOB_IDS) jobs[id] = Math.floor(num(rawJ[id]));
  const population = Math.max(MIN_POPULATION, num(s.population, initialColonyState.population));
  return {
    population,
    materiais: num(s.materiais),
    influencia: num(s.influencia),
    totalInfluencia: num(s.totalInfluencia),
    saber: num(s.saber),
    buildings,
    jobs: trimJobs(jobs, population),
    laws: Array.isArray(s.laws) ? [...new Set(s.laws.filter((l): l is LawId => l in LAWS))] : [],
    peakPopulation: Math.max(population, num(s.peakPopulation)),
  };
}
