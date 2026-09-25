import { logSquared } from '../../core/curves';
import { createRng, validSeed } from '../../core/rng';
import type { ModeBonus, ModeContext } from '../../core/types';

/**
 * O Vazio é a camada além do Colapso: só abre depois do primeiro ciclo completo. Fendas se abrem
 * sozinhas e drenam a produção de todos os modos até serem seladas; a Matéria Escura ganha ao
 * selá-las compra melhorias permanentes que sobrevivem a qualquer Colapso futuro.
 */

export type VazioUpgradeId = 'foco' | 'blindagem' | 'ressonancia' | 'ecoDoNada' | 'nucleoDeSombra';

export const VAZIO_UPGRADES: Record<VazioUpgradeId, { name: string; description: string; baseCost: number; growth: number; max: number }> = {
  foco: { name: 'Foco', description: 'Gera 50% mais Foco por nível', baseCost: 5, growth: 2.2, max: 15 },
  blindagem: {
    name: 'Blindagem',
    description: 'Fendas novas demoram mais para se abrir (e uma vaga extra a cada 4 níveis)',
    baseCost: 8,
    growth: 2.6,
    max: 8,
  },
  ressonancia: { name: 'Ressonância', description: 'Selar fendas rende 20% mais Matéria Escura por nível', baseCost: 10, growth: 2.4, max: 10 },
  ecoDoNada: { name: 'Eco do Nada', description: 'Essência de todos os modos +5% por nível', baseCost: 15, growth: 3, max: 20 },
  nucleoDeSombra: { name: 'Núcleo de Sombra', description: 'Produção de todos os modos +10% por nível', baseCost: 40, growth: 5, max: 5 },
};

export const VAZIO_UPGRADE_IDS = Object.keys(VAZIO_UPGRADES) as VazioUpgradeId[];

const BASE_FOCO_RATE = 0.4;
const BASE_RIFT_SLOTS = 3;
const MIN_RIFT_POWER = 0.04;
const MAX_RIFT_POWER = 0.16;
const RIFT_MAX_TIME = 240;
const RIFT_INTERVAL_MIN = 90;
const RIFT_INTERVAL_MAX = 200;
const HARDEN_GROWTH = 1.4;
/** Teto do endurecimento: sem ele o custo de selar cresceria exponencialmente para sempre e uma
 * fenda esquecida por tempo demais nunca mais poderia ser selada (o Foco só cresce linearmente). */
const HARDENED_POWER_CAP = 0.6;
const MIN_DRAIN = 0.25;
const SEAL_COST_PER_POWER = 3000;
const DARK_MATTER_PER_POWER = 40;

export interface Rift {
  id: number;
  power: number;
  timeLeft: number;
  hardened: number;
}

export interface VazioState {
  foco: number;
  darkMatter: number;
  totalDarkMatter: number;
  rifts: Rift[];
  nextRiftIn: number;
  nextRiftId: number;
  upgrades: Record<VazioUpgradeId, number>;
  sealed: number;
  seed: number;
}

function zeroUpgrades(): Record<VazioUpgradeId, number> {
  return { foco: 0, blindagem: 0, ressonancia: 0, ecoDoNada: 0, nucleoDeSombra: 0 };
}

export const initialVazioState: VazioState = {
  foco: 0,
  darkMatter: 0,
  totalDarkMatter: 0,
  rifts: [],
  nextRiftIn: 60,
  nextRiftId: 1,
  upgrades: zeroUpgrades(),
  sealed: 0,
  seed: 90210,
};

export function focoRate(state: VazioState, ctx: ModeContext): number {
  return BASE_FOCO_RATE * 1.5 ** state.upgrades.foco * ctx.multiplier('production');
}

export function maxRiftSlots(state: VazioState): number {
  return BASE_RIFT_SLOTS + Math.floor(state.upgrades.blindagem / 4);
}

function riftInterval(state: VazioState, rng: ReturnType<typeof createRng>): number {
  const shield = Math.max(0.4, 1 - 0.08 * state.upgrades.blindagem);
  return rng.range(RIFT_INTERVAL_MIN, RIFT_INTERVAL_MAX) * shield;
}

export function sealCost(rift: Rift): number {
  return Math.ceil(rift.power * SEAL_COST_PER_POWER);
}

export function sealReward(state: VazioState, rift: Rift): number {
  return rift.power * DARK_MATTER_PER_POWER * (1 + 0.2 * state.upgrades.ressonancia);
}

/** Fração da produção global que sobra com as fendas atuais abertas (nunca cai abaixo do piso). */
export function drainMultiplier(state: VazioState): number {
  const open = state.rifts.reduce((sum, r) => sum + r.power, 0);
  return Math.max(MIN_DRAIN, 1 - open);
}

export function shadowMultiplier(state: VazioState): number {
  return 1 + 0.1 * state.upgrades.nucleoDeSombra;
}

export function ecoMultiplier(state: VazioState): number {
  return 1 + 0.05 * state.upgrades.ecoDoNada;
}

export function tick(state: VazioState, dt: number, ctx: ModeContext): VazioState {
  const rng = createRng(state.seed);
  let rifts = state.rifts.map((r) => {
    let { power, timeLeft, hardened } = r;
    timeLeft -= dt;
    for (let guard = 0; guard < 20 && timeLeft <= 0; guard++) {
      power = Math.min(HARDENED_POWER_CAP, power * HARDEN_GROWTH);
      timeLeft += RIFT_MAX_TIME;
      hardened++;
    }
    return { ...r, power, timeLeft, hardened };
  });

  let nextRiftIn = state.nextRiftIn - dt;
  let nextRiftId = state.nextRiftId;
  const maxSlots = maxRiftSlots(state);
  for (let guard = 0; guard < 20 && nextRiftIn <= 0 && rifts.length < maxSlots; guard++) {
    rifts = [...rifts, { id: nextRiftId++, power: rng.range(MIN_RIFT_POWER, MAX_RIFT_POWER), timeLeft: RIFT_MAX_TIME, hardened: 0 }];
    nextRiftIn += riftInterval(state, rng);
  }
  if (nextRiftIn <= 0 && rifts.length >= maxSlots) nextRiftIn = riftInterval(state, rng);

  return { ...state, foco: state.foco + focoRate(state, ctx) * dt, rifts, nextRiftIn, nextRiftId, seed: rng.seed };
}

export function sealRift(state: VazioState, id: number): VazioState {
  const rift = state.rifts.find((r) => r.id === id);
  if (!rift) return state;
  const cost = sealCost(rift);
  if (state.foco < cost) return state;
  const reward = sealReward(state, rift);
  return {
    ...state,
    foco: state.foco - cost,
    darkMatter: state.darkMatter + reward,
    totalDarkMatter: state.totalDarkMatter + reward,
    rifts: state.rifts.filter((r) => r.id !== id),
    sealed: state.sealed + 1,
  };
}

export function upgradeCost(state: VazioState, id: VazioUpgradeId): number {
  const u = VAZIO_UPGRADES[id];
  return Math.ceil(u.baseCost * u.growth ** state.upgrades[id]);
}

export function buyUpgrade(state: VazioState, id: VazioUpgradeId): VazioState {
  const cost = upgradeCost(state, id);
  if (state.upgrades[id] >= VAZIO_UPGRADES[id].max || state.darkMatter < cost) return state;
  return { ...state, darkMatter: state.darkMatter - cost, upgrades: { ...state.upgrades, [id]: state.upgrades[id] + 1 } };
}

export function essenceRate(state: VazioState): number {
  return logSquared(state.totalDarkMatter, 2.5);
}

export function provides(state: VazioState): ModeBonus[] {
  return [
    { target: 'global', stat: 'production', value: drainMultiplier(state), source: 'Fendas abertas' },
    { target: 'global', stat: 'production', value: shadowMultiplier(state), source: 'Núcleo de Sombra' },
    { target: 'global', stat: 'essence', value: ecoMultiplier(state), source: 'Eco do Nada' },
  ];
}

/**
 * Diferente dos outros modos, o Vazio NÃO reseta no Colapso: ele é a recompensa por colapsar, então
 * a Matéria Escura e as melhorias ficam para sempre. Só as fendas do ciclo atual se fecham.
 */
export function onCollapse(state: VazioState): VazioState {
  return { ...state, rifts: [], nextRiftIn: initialVazioState.nextRiftIn };
}

export function restore(saved: unknown): VazioState {
  const s = (saved ?? {}) as Partial<VazioState> & { rifts?: unknown[]; upgrades?: unknown };
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  const rifts = Array.isArray(s.rifts)
    ? s.rifts
        .map((r): Rift | null => {
          const raw = r as Partial<Rift> | null;
          if (!raw || typeof raw.id !== 'number') return null;
          return {
            id: Math.floor(raw.id),
            power: Math.min(1, Math.max(0.01, num(raw.power, MIN_RIFT_POWER))),
            timeLeft: num(raw.timeLeft, RIFT_MAX_TIME),
            hardened: Math.floor(num(raw.hardened)),
          };
        })
        .filter((r): r is Rift => r !== null)
    : [];
  const rawUp = (s.upgrades ?? {}) as Partial<Record<VazioUpgradeId, unknown>>;
  const upgrades = zeroUpgrades();
  for (const id of VAZIO_UPGRADE_IDS) upgrades[id] = Math.min(VAZIO_UPGRADES[id].max, Math.floor(num(rawUp[id])));
  const nextId = rifts.reduce((max, r) => Math.max(max, r.id + 1), Math.floor(num(s.nextRiftId, 1)));
  return {
    foco: num(s.foco),
    darkMatter: num(s.darkMatter),
    totalDarkMatter: num(s.totalDarkMatter),
    rifts,
    nextRiftIn: num(s.nextRiftIn, initialVazioState.nextRiftIn),
    nextRiftId: nextId,
    upgrades,
    sealed: Math.floor(num(s.sealed)),
    seed: validSeed(s.seed, initialVazioState.seed),
  };
}
