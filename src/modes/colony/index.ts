import { isModeUnlockedByTree } from '../../core/skillTree/logic';
import type { GameMode } from '../../core/types';
import { ColonyView } from './ColonyView';
import { essenceRate, initialColonyState, onCollapse, provides, restore, tick, type ColonyState } from './logic';

export const colonyMode: GameMode<ColonyState> = {
  id: 'colony',
  name: 'Colônia',
  icon: '⌂',
  tagline: 'Uma cidade que vive do que os outros modos exportam: comida do Jardim, materiais da Fábrica e luz da Constelação',
  initialState: initialColonyState,
  isUnlocked: (meta) => isModeUnlockedByTree(meta.purchasedNodes, 'colony'),
  unlockDescription: 'Compre "Portal: Colônia" na Árvore',
  tick,
  essenceRate,
  provides,
  onCollapse,
  restore,
  Component: ColonyView,
};
