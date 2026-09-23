import { isModeUnlockedByTree } from '../../core/skillTree/logic';
import type { GameMode } from '../../core/types';
import { essenceRate, initialRoguelikeState, provides, restore, tick, type RoguelikeState } from './logic';
import { RoguelikeView } from './RoguelikeView';

export const roguelikeMode: GameMode<RoguelikeState> = {
  id: 'roguelike',
  name: 'Expedição',
  icon: '⚔',
  tagline: 'Runs curtas com escolhas de caminho; o que você traz de volta fortalece a rede',
  initialState: initialRoguelikeState,
  isUnlocked: (meta) => isModeUnlockedByTree(meta.purchasedNodes, 'roguelike'),
  unlockDescription: 'Compre "Portal: Expedição" na Árvore',
  tick,
  essenceRate,
  provides,
  restore,
  Component: RoguelikeView,
};
