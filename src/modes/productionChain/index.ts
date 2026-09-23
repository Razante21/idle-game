import { isModeUnlockedByTree } from '../../core/skillTree/logic';
import type { GameMode } from '../../core/types';
import {
  essenceRate,
  initialProductionChainState,
  onCollapse,
  provides,
  restore,
  tick,
  type ProductionChainState,
} from './logic';
import { ProductionChainView } from './ProductionChainView';

export const productionChainMode: GameMode<ProductionChainState> = {
  id: 'productionChain',
  name: 'Fábrica',
  icon: '⚙',
  tagline: 'Distribua operários numa cadeia onde cada recurso alimenta o próximo',
  initialState: initialProductionChainState,
  isUnlocked: (meta) => isModeUnlockedByTree(meta.purchasedNodes, 'productionChain'),
  unlockDescription: 'Compre "Portal: Fábrica" na Árvore',
  tick,
  essenceRate,
  provides,
  onCollapse,
  restore,
  Component: ProductionChainView,
};
