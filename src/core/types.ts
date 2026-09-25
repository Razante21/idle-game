import type { ComponentType } from 'react';

export type ModeId = 'baseClicker' | 'productionChain' | 'grid' | 'roguelike' | 'parallelTree' | 'garden' | 'colony' | 'vazio';

/**
 * Bens que um modo exporta para os outros. São fluxos por segundo (comida, materiais, luz)
 * ou marcos (profundidade); quem importa lê a soma do que os outros modos exportam.
 */
export type Good = 'comida' | 'materiais' | 'luz' | 'profundidade';
export type Goods = Record<Good, number>;

export type Stat = 'production' | 'click' | 'essence';

/** Regras especiais ligadas por outros modos (Ascensão), pela Cosmologia ou por uma Anomalia. */
export type Flag =
  | 'nucleo.autoclick'
  | 'nucleo.milestone20'
  | 'nucleo.surtoFrequente'
  | 'nucleo.autoGeradores'
  | 'nucleo.autoMelhorias'
  | 'fabrica.eficiencia'
  | 'fabrica.armazemInfinito'
  | 'fabrica.contratosDobrados'
  | 'fabrica.autoContratos'
  | 'constelacao.diagonal'
  | 'constelacao.fusaoBarata'
  | 'expedicao.segundaChance'
  | 'expedicao.autoGratis'
  | 'expedicao.lojaDesconto'
  | 'expedicao.maldicaoLeve'
  | 'anomalia.silencio'
  | 'anomalia.escassez'
  | 'anomalia.ceuPequeno'
  | 'anomalia.ferro';

export type AnomalyId = 'silencio' | 'escassez' | 'ceuPequeno' | 'ferro' | 'entropia' | 'isolamento';

/** Progresso que sobrevive ao Colapso. */
export interface CosmosState {
  singularities: number;
  totalSingularities: number;
  collapses: number;
  nodes: string[];
  /** Essência ganha desde o último Colapso; define as Singularidades do próximo. */
  runEssence: number;
  anomaly: AnomalyId | null;
  anomaliesDone: AnomalyId[];
}

export interface MetaState {
  essence: number;
  totalEssence: number;
  purchasedNodes: string[];
  activeModeId: ModeId;
  achievements: string[];
  playSeconds: number;
  cosmos: CosmosState;
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
  /** Soma do que os outros modos desbloqueados exportam agora. */
  imports: Readonly<Goods>;
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
  /** Bens que este modo entrega aos outros; lidos por eles em `ctx.imports`. */
  exports?(state: TState): Partial<Goods>;
  /** Estado depois de um Colapso; o padrão é voltar ao initialState. `keeps` diz o que a Cosmologia preserva. */
  onCollapse?(state: TState, keeps: ReadonlySet<string>): TState;
  /** Reconstrói o estado a partir de um save antigo; o padrão é mesclar sobre o initialState. */
  restore?(saved: unknown): TState;
  Component: ComponentType<ModeViewProps<TState>>;
}
