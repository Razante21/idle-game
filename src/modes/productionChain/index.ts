import { createStubMode } from '../createStubMode';

export const productionChainMode = createStubMode({
  id: 'productionChain',
  name: 'Fábrica',
  icon: '⚙',
  tagline: 'Cadeias de produção onde cada recurso alimenta o próximo',
  unlockDescription: 'Compre "Portal: Fábrica" na Árvore',
  plannedFeatures: [
    'Recursos encadeados: matéria-prima → componentes → máquinas',
    'Trabalhadores alocados entre processos, gargalos a resolver',
    'Gera Essência de forma estável, mas depende de energia do Núcleo',
  ],
});
