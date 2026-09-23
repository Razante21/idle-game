import type { GameMode } from '../../core/types';
import { BaseClickerView } from './BaseClickerView';
import { essenceRate, initialBaseClickerState, provides, restore, tick, type BaseClickerState } from './logic';

export const baseClickerMode: GameMode<BaseClickerState> = {
  id: 'baseClicker',
  name: 'Núcleo',
  icon: '◉',
  tagline: 'Canalize energia e construa geradores',
  initialState: initialBaseClickerState,
  isUnlocked: () => true,
  unlockDescription: 'Disponível desde o início',
  tick,
  essenceRate,
  provides,
  restore,
  Component: BaseClickerView,
};
