import { createStubMode } from '../createStubMode';

export const gridMode = createStubMode({
  id: 'grid',
  name: 'Constelação',
  icon: '✦',
  tagline: 'Posicione estrelas num grid e crie sinergias por vizinhança',
  unlockDescription: 'Compre "Portal: Constelação" na Árvore',
  plannedFeatures: [
    'Grid onde cada peça buffa as vizinhas de formas diferentes',
    'Otimização espacial: a mesma peça rende mais ou menos conforme a posição',
    'Peças raras obtidas em outros modos',
  ],
});
