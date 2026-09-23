import { isModeUnlockedByTree } from '../../core/skillTree/logic';
import type { GameMode } from '../../core/types';
import { GridView } from './GridView';
import { beaconBonuses, essenceRate, initialGridState, restore, tick, type GridState } from './logic';

export const gridMode: GameMode<GridState> = {
  id: 'grid',
  name: 'Constelação',
  icon: '✦',
  tagline: 'Posicione estrelas num grid: a mesma peça rende mais ou menos conforme a vizinhança',
  initialState: initialGridState,
  isUnlocked: (meta) => isModeUnlockedByTree(meta.purchasedNodes, 'grid'),
  unlockDescription: 'Compre "Portal: Constelação" na Árvore',
  tick,
  essenceRate,
  provides: beaconBonuses,
  restore,
  Component: GridView,
};
