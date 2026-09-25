import type { GameMode, MetaState } from '../../core/types';
import { essenceRate, initialVazioState, onCollapse, provides, restore, tick, type VazioState } from './logic';
import { VazioView } from './VazioView';

function isUnlocked(meta: MetaState): boolean {
  return meta.cosmos.collapses > 0;
}

export const vazioMode: GameMode<VazioState> = {
  id: 'vazio',
  name: 'O Vazio',
  icon: '◈',
  tagline: 'A camada além do Colapso: fendas de entropia drenam a rede até serem seladas por Matéria Escura',
  initialState: initialVazioState,
  isUnlocked,
  unlockDescription: 'Faça o primeiro Colapso',
  tick,
  essenceRate,
  provides,
  onCollapse,
  restore,
  Component: VazioView,
};
