import type { AnomalyId, Flag, ModeId, Stat } from '../types';

/** O que a Cosmologia preserva no Colapso. Cada modo lê as chaves que conhece em `onCollapse`. */
export type KeepKey = 'portais1' | 'portais2' | 'portais3' | 'pesquisas' | 'padroes' | 'carga' | 'ascensao' | 'sementes' | 'leis';

export type CosmosEffect =
  | { type: 'multiplier'; target: ModeId | 'global'; stat: Stat; value: number }
  | { type: 'flag'; flag: Flag }
  | { type: 'keep'; key: KeepKey }
  | { type: 'startEssence'; amount: number }
  | { type: 'offlineHours'; hours: number }
  | { type: 'autoTree' }
  | { type: 'unlockAnomalies' }
  | { type: 'weeklyEvents' };

export interface CosmosNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  parents: string[];
  effects: CosmosEffect[];
  position: { col: number; row: number };
}

export const COSMOLOGY: CosmosNode[] = [
  {
    id: 'genese',
    name: 'Gênese',
    description: 'Essência de todos os modos x2',
    cost: 1,
    parents: [],
    effects: [{ type: 'multiplier', target: 'global', stat: 'essence', value: 2 }],
    position: { col: 2, row: 0 },
  },
  {
    id: 'memoriaPortais',
    name: 'Memória dos Portais',
    description: 'Começa cada ciclo com a Fábrica e a Constelação abertas',
    cost: 2,
    parents: ['genese'],
    effects: [{ type: 'keep', key: 'portais1' }],
    position: { col: 0, row: 1 },
  },
  {
    id: 'semente',
    name: 'Semente Cósmica',
    description: 'Começa cada ciclo com 2.000 de Essência',
    cost: 1,
    parents: ['genese'],
    effects: [{ type: 'startEssence', amount: 2_000 }],
    position: { col: 2, row: 1 },
  },
  {
    id: 'maoAutomata',
    name: 'Mão Autômata',
    description: 'O Núcleo compra geradores sozinho',
    cost: 2,
    parents: ['genese'],
    effects: [{ type: 'flag', flag: 'nucleo.autoGeradores' }],
    position: { col: 4, row: 1 },
  },
  {
    id: 'arquivoIndustrial',
    name: 'Arquivo Industrial',
    description: 'As pesquisas da Fábrica sobrevivem ao Colapso',
    cost: 3,
    parents: ['memoriaPortais'],
    effects: [{ type: 'keep', key: 'pesquisas' }],
    position: { col: 0, row: 2 },
  },
  {
    id: 'producaoCosmica',
    name: 'Produção Cósmica',
    description: 'Produção de todos os modos x3',
    cost: 3,
    parents: ['semente'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'production', value: 3 }],
    position: { col: 2, row: 2 },
  },
  {
    id: 'engenheiroFantasma',
    name: 'Engenheiro Fantasma',
    description: 'O Núcleo compra melhorias sozinho',
    cost: 3,
    parents: ['maoAutomata'],
    effects: [{ type: 'flag', flag: 'nucleo.autoMelhorias' }],
    position: { col: 4, row: 2 },
  },
  {
    id: 'fissuras',
    name: 'Fissuras',
    description: 'Libera as Anomalias: ciclos com regras difíceis e recompensas permanentes',
    cost: 3,
    parents: ['semente'],
    effects: [{ type: 'unlockAnomalies' }],
    position: { col: 3, row: 3 },
  },
  {
    id: 'ecosSazonais',
    name: 'Ecos Sazonais',
    description: 'Libera o Evento Semanal: todo ciclo de 7 dias, um modo diferente ganha um bônus temporário',
    cost: 5,
    parents: ['fissuras'],
    effects: [{ type: 'weeklyEvents' }],
    position: { col: 3, row: 4 },
  },
  {
    id: 'memoriaEstelar',
    name: 'Memória Estelar',
    description: 'Os padrões da Constelação sobrevivem ao Colapso',
    cost: 4,
    parents: ['arquivoIndustrial'],
    effects: [{ type: 'keep', key: 'padroes' }],
    position: { col: 0, row: 3 },
  },
  {
    id: 'despachante',
    name: 'Despachante',
    description: 'A Fábrica entrega contratos sozinha',
    cost: 4,
    parents: ['arquivoIndustrial'],
    effects: [{ type: 'flag', flag: 'fabrica.autoContratos' }],
    position: { col: 1, row: 3 },
  },
  {
    id: 'sono',
    name: 'Sono Profundo',
    description: 'Progresso offline de até 48h',
    cost: 3,
    parents: ['producaoCosmica'],
    effects: [{ type: 'offlineHours', hours: 48 }],
    position: { col: 2, row: 3 },
  },
  {
    id: 'cargaResidual',
    name: 'Carga Residual',
    description: 'Mantém 60% da Carga no Colapso (em vez de 25%)',
    cost: 4,
    parents: ['engenheiroFantasma'],
    effects: [{ type: 'keep', key: 'carga' }],
    position: { col: 4, row: 3 },
  },
  {
    id: 'portaisEternos',
    name: 'Portais Eternos',
    description: 'Começa cada ciclo também com a Expedição e a Ascensão abertas',
    cost: 6,
    parents: ['memoriaEstelar'],
    effects: [{ type: 'keep', key: 'portais2' }],
    position: { col: 0, row: 4 },
  },
  {
    id: 'ecoAscendente',
    name: 'Eco Ascendente',
    description: 'Os caminhos da Ascensão sobrevivem ao Colapso',
    cost: 6,
    parents: ['despachante', 'sono'],
    effects: [{ type: 'keep', key: 'ascensao' }],
    position: { col: 1, row: 4 },
  },
  {
    id: 'essenciaEterna',
    name: 'Essência Eterna',
    description: 'Essência de todos os modos x5',
    cost: 8,
    parents: ['sono'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'essence', value: 5 }],
    position: { col: 2, row: 4 },
  },
  {
    id: 'arquitetoAuto',
    name: 'Arquiteto Automático',
    description: 'A Árvore da Rede compra os nós mais baratos sozinha',
    cost: 6,
    parents: ['cargaResidual'],
    effects: [{ type: 'autoTree' }],
    position: { col: 4, row: 4 },
  },
  {
    id: 'infinitoCosmico',
    name: 'Infinito Cósmico',
    description: 'Essência x10 e produção x10 em todos os modos',
    cost: 25,
    parents: ['portaisEternos', 'essenciaEterna', 'arquitetoAuto'],
    effects: [
      { type: 'multiplier', target: 'global', stat: 'essence', value: 10 },
      { type: 'multiplier', target: 'global', stat: 'production', value: 10 },
    ],
    position: { col: 2, row: 5 },
  },
  {
    id: 'raizesEternas',
    name: 'Raízes Eternas',
    description: 'Começa cada ciclo também com o Jardim e a Colônia abertos',
    cost: 8,
    parents: ['portaisEternos'],
    effects: [{ type: 'keep', key: 'portais3' }],
    position: { col: 0, row: 5 },
  },
  {
    id: 'bancoSementes',
    name: 'Banco de Sementes',
    description: 'As espécies descobertas no Jardim sobrevivem ao Colapso',
    cost: 5,
    parents: ['ecoAscendente'],
    effects: [{ type: 'keep', key: 'sementes' }],
    position: { col: 1, row: 5 },
  },
  {
    id: 'constituicao',
    name: 'Constituição',
    description: 'As leis da Colônia sobrevivem ao Colapso',
    cost: 5,
    parents: ['arquitetoAuto'],
    effects: [{ type: 'keep', key: 'leis' }],
    position: { col: 4, row: 5 },
  },
];

export const COSMOS_BY_ID: ReadonlyMap<string, CosmosNode> = new Map(COSMOLOGY.map((n) => [n.id, n]));

export interface AnomalyDef {
  name: string;
  rule: string;
  reward: string;
  flag?: Flag;
  rewardBonus: { target: ModeId | 'global'; stat: Stat; value: number };
}

/** Uma Anomalia termina quando o Portal da Expedição é comprado durante o ciclo. */
export const ANOMALY_GOAL_NODE = 'unlock_roguelike';

export const ANOMALIES: Record<AnomalyId, AnomalyDef> = {
  silencio: {
    name: 'Silêncio',
    rule: 'Cliques no Núcleo não geram energia',
    reward: 'Produção do Núcleo x3 para sempre',
    flag: 'anomalia.silencio',
    rewardBonus: { target: 'baseClicker', stat: 'production', value: 3 },
  },
  escassez: {
    name: 'Escassez',
    rule: 'Armazéns da Fábrica com 1/4 da capacidade',
    reward: 'Produção da Fábrica x3 para sempre',
    flag: 'anomalia.escassez',
    rewardBonus: { target: 'productionChain', stat: 'production', value: 3 },
  },
  ceuPequeno: {
    name: 'Céu Pequeno',
    rule: 'A Constelação não pode crescer além de 4x4',
    reward: 'Poeira da Constelação x3 para sempre',
    flag: 'anomalia.ceuPequeno',
    rewardBonus: { target: 'grid', stat: 'production', value: 3 },
  },
  ferro: {
    name: 'Expedição de Ferro',
    rule: 'Sem descansos nem lojas nas expedições',
    reward: 'Força na Expedição x3 para sempre',
    flag: 'anomalia.ferro',
    rewardBonus: { target: 'roguelike', stat: 'production', value: 3 },
  },
  entropia: {
    name: 'Entropia',
    rule: 'Toda a Essência gerada cai pela metade',
    reward: 'Essência de todos os modos x1.5 para sempre',
    rewardBonus: { target: 'global', stat: 'essence', value: 1.5 },
  },
  isolamento: {
    name: 'Isolamento',
    rule: 'As ligações entre os modos param de funcionar',
    reward: 'Produção de todos os modos x2 para sempre',
    rewardBonus: { target: 'global', stat: 'production', value: 2 },
  },
};

export const ANOMALY_IDS = Object.keys(ANOMALIES) as AnomalyId[];
