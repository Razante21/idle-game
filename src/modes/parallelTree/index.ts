import { isModeUnlockedByTree } from '../../core/skillTree/logic';
import type { GameMode } from '../../core/types';
import { essenceRate, flags, initialParallelTreeState, provides, restore, tick, type ParallelTreeState } from './logic';
import { ParallelTreeView } from './ParallelTreeView';

export const parallelTreeMode: GameMode<ParallelTreeState> = {
  id: 'parallelTree',
  name: 'Ascensão',
  icon: '❖',
  tagline: 'Uma segunda árvore movida a Éter, com caminhos exclusivos que mudam as regras dos outros modos',
  initialState: initialParallelTreeState,
  isUnlocked: (meta) => isModeUnlockedByTree(meta.purchasedNodes, 'parallelTree'),
  unlockDescription: 'Compre "Portal: Ascensão" na Árvore',
  tick,
  essenceRate,
  provides,
  flags,
  restore,
  Component: ParallelTreeView,
};
