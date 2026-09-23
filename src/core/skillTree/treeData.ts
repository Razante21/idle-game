import type { ModeId, Stat } from '../types';

export type NodeEffect =
  | { type: 'unlockMode'; modeId: ModeId }
  | { type: 'multiplier'; target: ModeId | 'global'; stat: Stat; value: number };

export type NodeRequirement = {
  type: 'sustainedContribution';
  modeId: ModeId;
  ratePerSecond: number;
};

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  parents: string[];
  effects: NodeEffect[];
  requirements?: NodeRequirement[];
  /** Coluna (0 = esquerda) e linha (0 = topo) na grade de exibição. */
  position: { col: number; row: number };
}

export const SKILL_TREE: SkillNode[] = [
  {
    id: 'despertar',
    name: 'Despertar',
    description: 'Produção do Núcleo x2',
    cost: 3,
    parents: [],
    effects: [{ type: 'multiplier', target: 'baseClicker', stat: 'production', value: 2 }],
    position: { col: 2, row: 0 },
  },
  {
    id: 'toque',
    name: 'Toque Firme',
    description: 'Valor do clique x3',
    cost: 10,
    parents: ['despertar'],
    effects: [{ type: 'multiplier', target: 'baseClicker', stat: 'click', value: 3 }],
    position: { col: 0, row: 1 },
  },
  {
    id: 'fluxo',
    name: 'Fluxo',
    description: 'Essência de todos os modos x1.5',
    cost: 25,
    parents: ['despertar'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'essence', value: 1.5 }],
    position: { col: 2, row: 1 },
  },
  {
    id: 'sobrecarga',
    name: 'Sobrecarga',
    description: 'Produção do Núcleo x2',
    cost: 40,
    parents: ['despertar'],
    effects: [{ type: 'multiplier', target: 'baseClicker', stat: 'production', value: 2 }],
    position: { col: 4, row: 1 },
  },
  {
    id: 'ressonancia',
    name: 'Ressonância',
    description: 'Valor do clique x5',
    cost: 120,
    parents: ['toque'],
    effects: [{ type: 'multiplier', target: 'baseClicker', stat: 'click', value: 5 }],
    position: { col: 0, row: 2 },
  },
  {
    id: 'unlock_productionChain',
    name: 'Portal: Fábrica',
    description: 'Desbloqueia o modo Fábrica',
    cost: 60,
    parents: ['fluxo'],
    effects: [{ type: 'unlockMode', modeId: 'productionChain' }],
    position: { col: 2, row: 2 },
  },
  {
    id: 'catalise',
    name: 'Catálise',
    description: 'Produção do Núcleo x3',
    cost: 200,
    parents: ['sobrecarga'],
    effects: [{ type: 'multiplier', target: 'baseClicker', stat: 'production', value: 3 }],
    position: { col: 4, row: 2 },
  },
  {
    id: 'unlock_grid',
    name: 'Portal: Constelação',
    description: 'Desbloqueia o modo Constelação',
    cost: 350,
    parents: ['unlock_productionChain'],
    effects: [{ type: 'unlockMode', modeId: 'grid' }],
    requirements: [{ type: 'sustainedContribution', modeId: 'baseClicker', ratePerSecond: 1.5 }],
    position: { col: 2, row: 3 },
  },
  {
    id: 'forja',
    name: 'Forja',
    description: 'Produção da Fábrica x2',
    cost: 150,
    parents: ['unlock_productionChain'],
    effects: [{ type: 'multiplier', target: 'productionChain', stat: 'production', value: 2 }],
    position: { col: 0, row: 3 },
  },
  {
    id: 'convergencia',
    name: 'Convergência',
    description: 'Essência de todos os modos x2',
    cost: 800,
    parents: ['catalise'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'essence', value: 2 }],
    position: { col: 4, row: 3 },
  },
  {
    id: 'hiperfluxo',
    name: 'Hiperfluxo',
    description: 'Produção do Núcleo x5',
    cost: 2500,
    parents: ['ressonancia', 'unlock_grid'],
    effects: [{ type: 'multiplier', target: 'baseClicker', stat: 'production', value: 5 }],
    position: { col: 0, row: 4 },
  },
  {
    id: 'unlock_roguelike',
    name: 'Portal: Expedição',
    description: 'Desbloqueia o modo Expedição',
    cost: 1500,
    parents: ['unlock_grid'],
    effects: [{ type: 'unlockMode', modeId: 'roguelike' }],
    requirements: [{ type: 'sustainedContribution', modeId: 'productionChain', ratePerSecond: 1 }],
    position: { col: 2, row: 4 },
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    description: 'Poeira da Constelação x2',
    cost: 900,
    parents: ['unlock_grid'],
    effects: [{ type: 'multiplier', target: 'grid', stat: 'production', value: 2 }],
    position: { col: 4, row: 4 },
  },
  {
    id: 'linhaMontagem',
    name: 'Linha de Montagem',
    description: 'Produção da Fábrica x3',
    cost: 4000,
    parents: ['forja', 'unlock_roguelike'],
    effects: [{ type: 'multiplier', target: 'productionChain', stat: 'production', value: 3 }],
    position: { col: 0, row: 5 },
  },
  {
    id: 'unlock_parallelTree',
    name: 'Portal: Ascensão',
    description: 'Desbloqueia o modo Ascensão',
    cost: 6000,
    parents: ['unlock_roguelike'],
    effects: [{ type: 'unlockMode', modeId: 'parallelTree' }],
    requirements: [
      { type: 'sustainedContribution', modeId: 'baseClicker', ratePerSecond: 5 },
      { type: 'sustainedContribution', modeId: 'grid', ratePerSecond: 2 },
    ],
    position: { col: 2, row: 5 },
  },
  {
    id: 'lamina',
    name: 'Lâmina Estelar',
    description: 'Força na Expedição x2',
    cost: 2500,
    parents: ['unlock_roguelike'],
    effects: [{ type: 'multiplier', target: 'roguelike', stat: 'production', value: 2 }],
    position: { col: 4, row: 5 },
  },
  {
    id: 'eco',
    name: 'Eco do Éter',
    description: 'Éter da Ascensão x2',
    cost: 12000,
    parents: ['unlock_parallelTree', 'linhaMontagem'],
    effects: [{ type: 'multiplier', target: 'parallelTree', stat: 'production', value: 2 }],
    position: { col: 0, row: 6 },
  },
  {
    id: 'harmonia',
    name: 'Harmonia',
    description: 'Essência de todos os modos x2',
    cost: 20000,
    parents: ['unlock_parallelTree'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'essence', value: 2 }],
    requirements: [
      { type: 'sustainedContribution', modeId: 'productionChain', ratePerSecond: 2 },
      { type: 'sustainedContribution', modeId: 'grid', ratePerSecond: 2 },
      { type: 'sustainedContribution', modeId: 'roguelike', ratePerSecond: 2 },
    ],
    position: { col: 2, row: 6 },
  },
  {
    id: 'supernova',
    name: 'Supernova',
    description: 'Poeira da Constelação x3',
    cost: 15000,
    parents: ['cosmos', 'lamina'],
    effects: [{ type: 'multiplier', target: 'grid', stat: 'production', value: 3 }],
    position: { col: 4, row: 6 },
  },
  {
    id: 'singularidade',
    name: 'Singularidade',
    description: 'Produção de todos os modos x3',
    cost: 250000,
    parents: ['harmonia'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'production', value: 3 }],
    requirements: [
      { type: 'sustainedContribution', modeId: 'baseClicker', ratePerSecond: 10 },
      { type: 'sustainedContribution', modeId: 'productionChain', ratePerSecond: 4 },
      { type: 'sustainedContribution', modeId: 'grid', ratePerSecond: 4 },
      { type: 'sustainedContribution', modeId: 'roguelike', ratePerSecond: 4 },
    ],
    position: { col: 2, row: 7 },
  },
  {
    id: 'ventania',
    name: 'Ventania',
    description: 'Valor do clique do Núcleo x10',
    cost: 40_000,
    parents: ['eco'],
    effects: [{ type: 'multiplier', target: 'baseClicker', stat: 'click', value: 10 }],
    position: { col: 0, row: 7 },
  },
  {
    id: 'constelacaoViva',
    name: 'Constelação Viva',
    description: 'Poeira da Constelação x5',
    cost: 60_000,
    parents: ['supernova'],
    effects: [{ type: 'multiplier', target: 'grid', stat: 'production', value: 5 }],
    position: { col: 4, row: 7 },
  },
  {
    id: 'reputacao',
    name: 'Império Industrial',
    description: 'Produção da Fábrica x5',
    cost: 150_000,
    parents: ['ventania', 'singularidade'],
    effects: [{ type: 'multiplier', target: 'productionChain', stat: 'production', value: 5 }],
    position: { col: 0, row: 8 },
  },
  {
    id: 'eterPuro',
    name: 'Éter Puro',
    description: 'Éter da Ascensão x3',
    cost: 300_000,
    parents: ['singularidade'],
    effects: [{ type: 'multiplier', target: 'parallelTree', stat: 'production', value: 3 }],
    position: { col: 2, row: 8 },
  },
  {
    id: 'lenda',
    name: 'Lenda',
    description: 'Força na Expedição x3',
    cost: 150_000,
    parents: ['constelacaoViva', 'singularidade'],
    effects: [{ type: 'multiplier', target: 'roguelike', stat: 'production', value: 3 }],
    position: { col: 4, row: 8 },
  },
  {
    id: 'infinito',
    name: 'Infinito',
    description: 'Essência de todos os modos x3',
    cost: 2_000_000,
    parents: ['eterPuro'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'essence', value: 3 }],
    requirements: [
      { type: 'sustainedContribution', modeId: 'baseClicker', ratePerSecond: 15 },
      { type: 'sustainedContribution', modeId: 'productionChain', ratePerSecond: 15 },
      { type: 'sustainedContribution', modeId: 'grid', ratePerSecond: 15 },
      { type: 'sustainedContribution', modeId: 'roguelike', ratePerSecond: 15 },
      { type: 'sustainedContribution', modeId: 'parallelTree', ratePerSecond: 15 },
    ],
    position: { col: 2, row: 9 },
  },
  {
    id: 'omega',
    name: 'Ômega',
    description: 'Produção de todos os modos x5',
    cost: 20_000_000,
    parents: ['infinito', 'reputacao', 'lenda'],
    effects: [{ type: 'multiplier', target: 'global', stat: 'production', value: 5 }],
    requirements: [
      { type: 'sustainedContribution', modeId: 'baseClicker', ratePerSecond: 40 },
      { type: 'sustainedContribution', modeId: 'productionChain', ratePerSecond: 40 },
      { type: 'sustainedContribution', modeId: 'grid', ratePerSecond: 40 },
      { type: 'sustainedContribution', modeId: 'roguelike', ratePerSecond: 40 },
      { type: 'sustainedContribution', modeId: 'parallelTree', ratePerSecond: 40 },
    ],
    position: { col: 2, row: 10 },
  },
];

export const NODES_BY_ID: ReadonlyMap<string, SkillNode> = new Map(SKILL_TREE.map((n) => [n.id, n]));
