import type { ComponentType } from 'react';

export type ModeId = 'baseClicker' | 'productionChain' | 'grid' | 'roguelike' | 'parallelTree';

export type Stat = 'production' | 'click' | 'essence';

/** Regras especiais que um modo pode ligar em outro (em geral vindas da Ascensão). */
export type Flag =
  | 'nucleo.autoclick'
  | 'nucleo.milestone20'
  | 'nucleo.surtoFrequente'
  | 'fabrica.eficiencia'
  | 'fabrica.armazemInfinito'
  | 'fabrica.contratosDobrados'
  | 'constelacao.diagonal'
  | 'constelacao.fusaoBarata'
  | 'expedicao.segundaChance'
  | 'expedicao.autoGratis'
  | 'expedicao.lojaDesconto'
  | 'expedicao.maldicaoLeve';

export interface MetaState {
  essence: number;
  totalEssence: number;
  purchasedNodes: string[];
  activeModeId: ModeId;
  achievements: string[];
}

export type EssenceRates = Record<ModeId, number>;
export type ModeStates = Record<ModeId, unknown>;

/** Multiplicador que um modo aplica a outro modo (ou a todos, com 'global'). */
export interface ModeBonus {
  target: ModeId | 'global';
  stat: Stat;
  value: number;
  source: string;
}

export interface ModeContext {
  /** Produto dos multiplicadores da Árvore e dos bônus vindos dos outros modos. */
  multiplier(stat: Stat): number;
  hasFlag(flag: Flag): boolean;
  /** Essência/s de cada modo no passo anterior (somente leitura). */
  essenceRates: Readonly<EssenceRates>;
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
  /** Bônus que este modo concede aos outros enquanto estiver desbloqueado. */
  provides?(state: TState): ModeBonus[];
  flags?(state: TState): Flag[];
  /** Reconstrói o estado a partir de um save antigo; o padrão é mesclar sobre o initialState. */
  restore?(saved: unknown): TState;
  Component: ComponentType<ModeViewProps<TState>>;
}
