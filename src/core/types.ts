import type { ComponentType } from 'react';

export type ModeId = 'baseClicker' | 'productionChain' | 'grid' | 'roguelike' | 'parallelTree';

export type Stat = 'production' | 'click' | 'essence';

export interface MetaState {
  essence: number;
  totalEssence: number;
  purchasedNodes: string[];
  activeModeId: ModeId;
}

export interface ModeContext {
  multiplier(stat: Stat): number;
}

export interface ModeViewProps<TState> {
  state: TState;
  ctx: ModeContext;
  essenceRate: number;
  update(fn: (state: TState) => TState): void;
}

export interface GameMode<TState> {
  id: ModeId;
  name: string;
  icon: string;
  tagline: string;
  initialState: TState;
  isUnlocked(meta: MetaState): boolean;
  unlockDescription: string;
  tick(state: TState, deltaSeconds: number, ctx: ModeContext): TState;
  /** Essência por segundo gerada por este modo, antes do multiplicador de Essência. */
  essenceRate(state: TState, ctx: ModeContext): number;
  /** Reconstrói o estado a partir de um save antigo; o padrão é mesclar sobre o initialState. */
  restore?(saved: unknown): TState;
  Component: ComponentType<ModeViewProps<TState>>;
}

export type ModeStates = Record<ModeId, unknown>;
export type EssenceRates = Record<ModeId, number>;
