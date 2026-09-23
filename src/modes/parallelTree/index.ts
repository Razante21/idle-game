import { createStubMode } from '../createStubMode';

export const parallelTreeMode = createStubMode({
  id: 'parallelTree',
  name: 'Ascensão',
  icon: '❖',
  tagline: 'Uma segunda árvore, com moeda e regras próprias',
  unlockDescription: 'Compre "Portal: Ascensão" na Árvore',
  plannedFeatures: [
    'Árvore paralela alimentada por uma moeda exclusiva',
    'Ramos que alteram regras dos outros modos, não só números',
    'Escolhas exclusivas: pegar um ramo trava o outro',
  ],
});
