import { createStubMode } from '../createStubMode';

export const roguelikeMode = createStubMode({
  id: 'roguelike',
  name: 'Expedição',
  icon: '⚔',
  tagline: 'Runs curtas com escolhas de build e recompensas permanentes',
  unlockDescription: 'Compre "Portal: Expedição" na Árvore',
  plannedFeatures: [
    'Expedições curtas com eventos e escolhas aleatórias',
    'Build montada durante a run, perdida ao final',
    'Relíquias permanentes que fortalecem os outros modos',
  ],
});
