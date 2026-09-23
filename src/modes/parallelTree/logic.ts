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

const TIER_COST: Record<number, number> = { 1: 10, 2: 60, 3: 300, 4: 1_500, 5: 5_000, 6: 15_000, 7: 40_000, 8: 80_000 };

function node(tier: number, id: string, name: string, description: string, effect: Pick<AscensionNode, 'bonuses' | 'flags'>): AscensionNode {
  return { id, name, description, cost: TIER_COST[tier]!, tier, ...effect };
}

export const ASCENSION_TREE: AscensionNode[] = [
  node(1, 'fluxoAstral', 'Fluxo Astral', 'Essência de todos os modos x1.5', {
    bonuses: [{ target: 'global', stat: 'essence', value: 1.5 }],
  }),
  node(1, 'forjaAstral', 'Forja Astral', 'Produção de todos os modos x1.5', {
    bonuses: [{ target: 'global', stat: 'production', value: 1.5 }],
  }),
  node(1, 'mareEterea', 'Maré Etérea', 'Éter x1.5', { bonuses: [{ target: 'parallelTree', stat: 'production', value: 1.5 }] }),

  node(2, 'maosInvisiveis', 'Mãos Invisíveis', 'O Núcleo clica sozinho 5 vezes por segundo', { flags: ['nucleo.autoclick'] }),
  node(2, 'ritmoAureo', 'Ritmo Áureo', 'Geradores do Núcleo dobram a cada 20 em vez de 25', { flags: ['nucleo.milestone20'] }),
  node(2, 'tempestade', 'Tempestade', 'Surtos do Núcleo aparecem com o dobro da frequência', { flags: ['nucleo.surtoFrequente'] }),

  node(3, 'alquimia', 'Alquimia', 'A Fábrica gasta 25% menos insumo', { flags: ['fabrica.eficiencia'] }),
  node(3, 'ceuAberto', 'Céu Aberto', 'Na Constelação, diagonais contam como vizinhas', { flags: ['constelacao.diagonal'] }),
  node(3, 'fusaoEstelar', 'Fusão Estelar', 'Fundir estrelas custa 2 em vez de 3', { flags: ['constelacao.fusaoBarata'] }),

  node(4, 'fenix', 'Fênix', 'Uma vez por expedição, renasce com metade dos PV', { flags: ['expedicao.segundaChance'] }),
  node(4, 'andarilho', 'Andarilho', 'Exploração automática sem precisar do Batedor', { flags: ['expedicao.autoGratis'] }),
  node(4, 'mercador', 'Mercador', 'Lojas da Expedição pela metade do preço', { flags: ['expedicao.lojaDesconto'] }),

  node(5, 'armazemDimensional', 'Armazém Dimensional', 'Armazéns da Fábrica x10', { flags: ['fabrica.armazemInfinito'] }),
  node(5, 'diplomacia', 'Diplomacia', 'Contratos da Fábrica dão o dobro de reputação', { flags: ['fabrica.contratosDobrados'] }),

  node(6, 'pactoSombrio', 'Pacto Sombrio', 'Cada maldição da Expedição rende +50% em vez de +30%', {
    flags: ['expedicao.maldicaoLeve'],
  }),
  node(6, 'olhoCosmico', 'Olho Cósmico', 'Poeira da Constelação x3', { bonuses: [{ target: 'grid', stat: 'production', value: 3 }] }),

  node(7, 'convergenciaTotal', 'Convergência Total', 'Essência de todos os modos x2', {
    bonuses: [{ target: 'global', stat: 'essence', value: 2 }],
  }),
  node(7, 'motorPerpetuo', 'Motor Perpétuo', 'Produção de todos os modos x2.5', {
    bonuses: [{ target: 'global', stat: 'production', value: 2.5 }],
  }),

  node(8, 'transcendencia', 'Transcendência', 'Essência x3 e produção x2 em todos os modos', {
    bonuses: [
      { target: 'global', stat: 'essence', value: 3 },
      { target: 'global', stat: 'production', value: 2 },
    ],
  }),
];

export const TIERS = [...new Set(ASCENSION_TREE.map((n) => n.tier))].sort((a, b) => a - b);
const NODES = new Map(ASCENSION_TREE.map((n) => [n.id, n]));
const ETHER_PER_ROOT = 0.2;
export const RESPEC_REFUND = 0.9;

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

export function nodeStatus(state: ParallelTreeState, n: AscensionNode): AscensionStatus {
  if (state.nodes.includes(n.id)) return 'purchased';
  const owned = ownedNodes(state);
  const tierMax = Math.max(...TIERS);
  if (n.tier < tierMax && owned.some((o) => o.tier === n.tier)) return 'excluded';
  const prerequisiteTiers = n.tier === tierMax ? TIERS.filter((t) => t < tierMax) : [n.tier - 1].filter((t) => t >= 1);
  if (!prerequisiteTiers.every((t) => owned.some((o) => o.tier === t))) return 'locked';
  return state.ether >= n.cost ? 'available' : 'unaffordable';
}

export function buyNode(state: ParallelTreeState, id: string): ParallelTreeState {
  const n = NODES.get(id);
  if (!n || nodeStatus(state, n) !== 'available') return state;
  return { ...state, ether: state.ether - n.cost, nodes: [...state.nodes, id] };
}

export function spentEther(state: ParallelTreeState): number {
  return state.nodes.reduce((sum, id) => sum + (NODES.get(id)?.cost ?? 0), 0);
}

/** Desfaz todas as escolhas e devolve 90% do Éter gasto. */
export function respec(state: ParallelTreeState): ParallelTreeState {
  if (state.nodes.length === 0) return state;
  return { ...state, ether: state.ether + spentEther(state) * RESPEC_REFUND, nodes: [] };
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

/** Custos de versões anteriores da árvore, para reembolsar exatamente o que o jogador pagou. */
const LEGACY_COST: Record<string, number> = { transcendencia: 8_000 };

export function restore(saved: unknown): ParallelTreeState {
  const s = (saved ?? {}) as Partial<ParallelTreeState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const restored: ParallelTreeState = { ether: num(s.ether), totalEther: num(s.totalEther), nodes: [] };
  // Recompra na ordem salva; escolhas que deixaram de ser válidas (a árvore mudou) são reembolsadas.
  for (const id of Array.isArray(s.nodes) ? s.nodes : []) {
    const n = typeof id === 'string' ? NODES.get(id) : undefined;
    if (!n) continue;
    if (nodeStatus({ ...restored, ether: Infinity }, n) === 'available') restored.nodes.push(n.id);
    else restored.ether += LEGACY_COST[n.id] ?? n.cost;
  }
  return restored;
}
