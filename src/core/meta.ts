import type { CosmosState, MetaState } from './types';

export function initialCosmos(): CosmosState {
  return {
    singularities: 0,
    totalSingularities: 0,
    collapses: 0,
    nodes: [],
    runEssence: 0,
    anomaly: null,
    anomaliesDone: [],
  };
}

export function initialMeta(): MetaState {
  return {
    essence: 0,
    totalEssence: 0,
    purchasedNodes: [],
    activeModeId: 'baseClicker',
    achievements: [],
    playSeconds: 0,
    cosmos: initialCosmos(),
  };
}
