import { create } from 'zustand';
import { newlyEarned } from '../achievements';
import { MAX_OFFLINE_SECONDS } from '../engine/offlineProgress';
import { computeEssenceRates, simulate, type SimState } from '../engine/simulate';
import { getMode, initialModeStates } from '../modeRegistry';
import { getNodeStatus } from '../skillTree/logic';
import { NODES_BY_ID } from '../skillTree/treeData';
import type { EssenceRates, MetaState, ModeId } from '../types';

export interface GameStore extends SimState {
  essenceRates: EssenceRates;
  /** Conquistas recém-obtidas, esperando para aparecer como aviso. */
  toasts: string[];
  advance(seconds: number): void;
  updateMode<T>(id: ModeId, fn: (state: T) => T): void;
  setActiveMode(id: ModeId): void;
  buyNode(id: string): void;
  hydrate(state: SimState): void;
  dismissToast(): void;
  reset(): void;
}

export function initialMeta(): MetaState {
  return { essence: 0, totalEssence: 0, purchasedNodes: [], activeModeId: 'baseClicker', achievements: [] };
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
    const result = simulate({ meta, modes }, Math.min(seconds, MAX_OFFLINE_SECONDS), essenceRates);
    const { meta: nextMeta, earned } = withAchievements(result);
    set({
      meta: nextMeta,
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
    const node = NODES_BY_ID.get(id);
    const { meta, modes, essenceRates } = get();
    if (!node || getNodeStatus(node, meta, essenceRates) !== 'available') return;
    const nextMeta: MetaState = {
      ...meta,
      essence: meta.essence - node.cost,
      purchasedNodes: [...meta.purchasedNodes, id],
    };
    set({ meta: nextMeta, essenceRates: computeEssenceRates({ meta: nextMeta, modes }, essenceRates) });
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
