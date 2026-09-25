import { create } from 'zustand';
import { newlyEarned } from '../achievements';
import {
  abandonAnomaly,
  buyCosmos,
  collapse,
  completeAnomalyIfReached,
  hasAutoTree,
  offlineCapSeconds,
} from '../cosmos/logic';
import { computeEssenceRates, simulate, type SimState } from '../engine/simulate';
import { initialMeta } from '../meta';
import { getMode, initialModeStates } from '../modeRegistry';
import { playSound } from '../sound';
import { autoBuyNodes, purchaseNode } from '../skillTree/logic';
import type { AnomalyId, EssenceRates, MetaState, ModeId } from '../types';

export { initialMeta };

export interface GameStore extends SimState {
  essenceRates: EssenceRates;
  /** Conquistas recém-obtidas, esperando para aparecer como aviso. */
  toasts: string[];
  advance(seconds: number): void;
  updateMode<T>(id: ModeId, fn: (state: T) => T): void;
  setActiveMode(id: ModeId): void;
  buyNode(id: string): void;
  collapse(nextAnomaly: AnomalyId | null): void;
  buyCosmos(id: string): void;
  abandonAnomaly(): void;
  hydrate(state: SimState): void;
  dismissToast(): void;
  reset(): void;
}

function freshState(): SimState & { essenceRates: EssenceRates; toasts: string[] } {
  const state = { meta: initialMeta(), modes: initialModeStates() };
  return { ...state, essenceRates: computeEssenceRates(state), toasts: [] };
}

function withAchievements(state: SimState): { meta: MetaState; earned: string[] } {
  const earned = newlyEarned(state);
  if (earned.length === 0) return { meta: state.meta, earned };
  return { meta: { ...state.meta, achievements: [...state.meta.achievements, ...earned] }, earned };
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...freshState(),

  advance(seconds) {
    const { meta, modes, essenceRates, toasts } = get();
    const result = simulate({ meta, modes }, Math.min(seconds, offlineCapSeconds(meta.cosmos)), essenceRates);
    let nextMeta = result.meta;
    if (hasAutoTree(nextMeta.cosmos)) nextMeta = completeAnomalyIfReached(autoBuyNodes(nextMeta, result.essenceRates));
    const { meta: withAch, earned } = withAchievements({ meta: nextMeta, modes: result.modes });
    if (earned.length > 0) playSound('achievement');
    set({
      meta: withAch,
      modes: result.modes,
      essenceRates: result.essenceRates,
      toasts: earned.length ? [...toasts, ...earned] : toasts,
    });
  },

  updateMode(id, fn) {
    set((s) => ({ modes: { ...s.modes, [id]: fn(s.modes[id] as Parameters<typeof fn>[0]) } }));
  },

  setActiveMode(id) {
    const { meta } = get();
    if (!getMode(id).isUnlocked(meta)) return;
    set({ meta: { ...meta, activeModeId: id } });
  },

  buyNode(id) {
    const { meta, modes, essenceRates } = get();
    const bought = purchaseNode(meta, id, essenceRates);
    if (!bought) return;
    playSound('buy');
    const nextMeta = completeAnomalyIfReached(bought);
    set({ meta: nextMeta, essenceRates: computeEssenceRates({ meta: nextMeta, modes }, essenceRates) });
  },

  collapse(nextAnomaly) {
    const { meta, modes } = get();
    const next = collapse({ meta, modes }, nextAnomaly);
    if (next.meta === meta) return;
    playSound('collapse');
    set({ ...next, essenceRates: computeEssenceRates(next) });
  },

  buyCosmos(id) {
    const { meta, modes, essenceRates } = get();
    const cosmos = buyCosmos(meta.cosmos, id);
    if (cosmos === meta.cosmos) return;
    playSound('buy');
    const nextMeta = { ...meta, cosmos };
    set({ meta: nextMeta, essenceRates: computeEssenceRates({ meta: nextMeta, modes }, essenceRates) });
  },

  abandonAnomaly() {
    set((s) => ({ meta: abandonAnomaly(s.meta) }));
  },

  hydrate(state) {
    const { meta, earned } = withAchievements(state);
    set({ ...state, meta, essenceRates: computeEssenceRates({ ...state, meta }), toasts: earned });
  },

  dismissToast() {
    set((s) => ({ toasts: s.toasts.slice(1) }));
  },

  reset() {
    set(freshState());
  },
}));
