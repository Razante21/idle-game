import type { Flag, ModeBonus, ModeContext, ModeId } from '../../core/types';

export interface AscensionNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  tier: number;
  bonuses?: Omit<ModeBonus, 'source'>[];
  flags?: Flag[];
}

export const ASCENSION_TREE: AscensionNode[] = [
  {
    id: 'fluxoAstral',
    name: 'Fluxo Astral',
    description: 'Essência de todos os modos x1.5',
    cost: 10,
    tier: 1,
    bonuses: [{ target: 'global', stat: 'essence', value: 1.5 }],
  },
  {
    id: 'forjaAstral',
    name: 'Forja Astral',
    description: 'Produção de todos os modos x1.5',
    cost: 10,
    tier: 1,
    bonuses: [{ target: 'global', stat: 'production', value: 1.5 }],
  },
  {
    id: 'maosInvisiveis',
    name: 'Mãos Invisíveis',
    description: 'O Núcleo clica sozinho 5 vezes por segundo',
    cost: 60,
    tier: 2,
    flags: ['nucleo.autoclick'],
  },
  {
    id: 'ritmoAureo',
    name: 'Ritmo Áureo',
    description: 'Geradores do Núcleo dobram a cada 20 em vez de 25',
    cost: 60,
    tier: 2,
    flags: ['nucleo.milestone20'],
  },
  {
    id: 'alquimia',
    name: 'Alquimia',
    description: 'A Fábrica gasta 25% menos insumo',
    cost: 300,
    tier: 3,
    flags: ['fabrica.eficiencia'],
  },
  {
    id: 'ceuAberto',
    name: 'Céu Aberto',
    description: 'Na Constelação, diagonais contam como vizinhas',
    cost: 300,
    tier: 3,
    flags: ['constelacao.diagonal'],
  },
  {
    id: 'fenix',
    name: 'Fênix',
    description: 'Uma vez por expedição, renasce com metade dos PV',
    cost: 1500,
    tier: 4,
    flags: ['expedicao.segundaChance'],
  },
  {
    id: 'andarilho',
    name: 'Andarilho',
    description: 'Exploração automática sem precisar do Batedor',
    cost: 1500,
    tier: 4,
    flags: ['expedicao.autoGratis'],
  },
  {
    id: 'transcendencia',
    name: 'Transcendência',
    description: 'Essência x3 e produção x2 em todos os modos',
    cost: 8000,
    tier: 5,
    bonuses: [
      { target: 'global', stat: 'essence', value: 3 },
      { target: 'global', stat: 'production', value: 2 },
    ],
  },
];

export const TIERS = [...new Set(ASCENSION_TREE.map((n) => n.tier))].sort((a, b) => a - b);
const NODES = new Map(ASCENSION_TREE.map((n) => [n.id, n]));
const ETHER_PER_ROOT = 0.2;

export interface ParallelTreeState {
  ether: number;
  totalEther: number;
  nodes: string[];
}

export const initialParallelTreeState: ParallelTreeState = { ether: 0, totalEther: 0, nodes: [] };

/** Cada modo contribui com a raiz da sua Essência/s: espalhar a produção rende mais que concentrar. */
export function etherSources(ctx: ModeContext): { modeId: ModeId; value: number }[] {
  return (Object.entries(ctx.essenceRates) as [ModeId, number][])
    .filter(([id]) => id !== 'parallelTree')
    .map(([modeId, rate]) => ({ modeId, value: Math.sqrt(Math.max(0, rate)) * ETHER_PER_ROOT }));
}

export function etherPerSecond(ctx: ModeContext): number {
  return etherSources(ctx).reduce((sum, s) => sum + s.value, 0) * ctx.multiplier('production');
}

export function tick(state: ParallelTreeState, dt: number, ctx: ModeContext): ParallelTreeState {
  const gained = etherPerSecond(ctx) * dt;
  if (gained === 0) return state;
  return { ...state, ether: state.ether + gained, totalEther: state.totalEther + gained };
}

export type AscensionStatus = 'purchased' | 'available' | 'unaffordable' | 'excluded' | 'locked';

export function nodeStatus(state: ParallelTreeState, node: AscensionNode): AscensionStatus {
  if (state.nodes.includes(node.id)) return 'purchased';
  const owned = state.nodes.map((id) => NODES.get(id)).filter((n): n is AscensionNode => !!n);
  const tierMax = Math.max(...TIERS);
  if (node.tier < tierMax && owned.some((n) => n.tier === node.tier)) return 'excluded';
  const prerequisiteTiers = node.tier === tierMax ? TIERS.filter((t) => t < tierMax) : [node.tier - 1].filter((t) => t >= 1);
  if (!prerequisiteTiers.every((t) => owned.some((n) => n.tier === t))) return 'locked';
  return state.ether >= node.cost ? 'available' : 'unaffordable';
}

export function buyNode(state: ParallelTreeState, id: string): ParallelTreeState {
  const node = NODES.get(id);
  if (!node || nodeStatus(state, node) !== 'available') return state;
  return { ...state, ether: state.ether - node.cost, nodes: [...state.nodes, id] };
}

/** Desfaz todas as escolhas e devolve todo o Éter gasto. */
export function respec(state: ParallelTreeState): ParallelTreeState {
  const refund = state.nodes.reduce((sum, id) => sum + (NODES.get(id)?.cost ?? 0), 0);
  return { ...state, ether: state.ether + refund, nodes: [] };
}

function ownedNodes(state: ParallelTreeState): AscensionNode[] {
  return state.nodes.map((id) => NODES.get(id)).filter((n): n is AscensionNode => !!n);
}

export function provides(state: ParallelTreeState): ModeBonus[] {
  return ownedNodes(state).flatMap((n) => (n.bonuses ?? []).map((b) => ({ ...b, source: n.name })));
}

export function flags(state: ParallelTreeState): Flag[] {
  return ownedNodes(state).flatMap((n) => n.flags ?? []);
}

export function essenceRate(state: ParallelTreeState): number {
  return 0.1 * Math.sqrt(state.totalEther);
}

export function restore(saved: unknown): ParallelTreeState {
  const s = (saved ?? {}) as Partial<ParallelTreeState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const restored: ParallelTreeState = { ether: num(s.ether), totalEther: num(s.totalEther), nodes: [] };
  const savedNodes = Array.isArray(s.nodes) ? s.nodes : [];
  // Recompra na ordem salva, ignorando qualquer escolha que não seria válida.
  for (const id of savedNodes) {
    const node = typeof id === 'string' ? NODES.get(id) : undefined;
    if (!node) continue;
    const status = nodeStatus({ ...restored, ether: Infinity }, node);
    if (status === 'available') restored.nodes.push(id as string);
  }
  return restored;
}
