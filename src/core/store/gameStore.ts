import { create } from 'zustand';
import { MAX_OFFLINE_SECONDS } from '../engine/offlineProgress';
import { computeEssenceRates, simulate, type SimState } from '../engine/simulate';
import { getMode, initialModeStates } from '../modeRegistry';
import { getNodeStatus } from '../skillTree/logic';
import { NODES_BY_ID } from '../skillTree/treeData';
import type { EssenceRates, MetaState, ModeId } from '../types';

export interface GameStore extends SimState {
  essenceRates: EssenceRates;
  advance(seconds: number): void;
  updateMode<T>(id: ModeId, fn: (state: T) => T): void;
  setActiveMode(id: ModeId): void;
  buyNode(id: string): void;
  hydrate(state: SimState): void;
  reset(): void;
}

function initialMeta(): MetaState {
  return { essence: 0, totalEssence: 0, purchasedNodes: [], activeModeId: 'baseClicker' };
}

function freshState(): SimState & { essenceRates: EssenceRates } {
  const state = { meta: initialMeta(), modes: initialModeStates() };
  return { ...state, essenceRates: computeEssenceRates(state) };
}

export const useGameStore = create<GameStore>()((set, get) => ({
  ...freshState(),

  advance(seconds) {
    const { meta, modes, essenceRates } = get();
    const result = simulate({ meta, modes }, Math.min(seconds, MAX_OFFLINE_SECONDS), essenceRates);
    set({ meta: result.meta, modes: result.modes, essenceRates: result.essenceRates });
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
    set({ ...state, essenceRates: computeEssenceRates(state) });
  },

  reset() {
    set(freshState());
  },
}));
