import { isModeUnlockedByTree } from '../../core/skillTree/logic';
import type { GameMode } from '../../core/types';
import { GardenView } from './GardenView';
import { essenceRate, exports, initialGardenState, onCollapse, provides, restore, tick, type GardenState } from './logic';

export const gardenMode: GameMode<GardenState> = {
  id: 'garden',
  name: 'Jardim',
  icon: '❀',
  tagline: 'Cultive plantas cósmicas e cruze vizinhas para descobrir espécies novas; a comida alimenta a Colônia',
  initialState: initialGardenState,
  isUnlocked: (meta) => isModeUnlockedByTree(meta.purchasedNodes, 'garden'),
  unlockDescription: 'Compre "Portal: Jardim" na Árvore',
  tick,
  essenceRate,
  provides,
  exports,
  onCollapse,
  restore,
  Component: GardenView,
};
