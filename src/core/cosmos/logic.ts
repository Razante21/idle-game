import type { SimState } from '../engine/simulate';
import { initialCosmos } from '../meta';
import { MODES } from '../modeRegistry';
import type { AnomalyId, CosmosState, Flag, MetaState, ModeBonus, ModeStates } from '../types';
import {
  ANOMALIES,
  ANOMALY_GOAL_NODE,
  ANOMALY_IDS,
  COSMOLOGY,
  COSMOS_BY_ID,
  type CosmosEffect,
  type CosmosNode,
  type KeepKey,
} from './data';

/** O Colapso fica disponível depois de comprar este nó da Árvore da Rede. */
export const COLLAPSE_REQUIRED_NODE = 'harmonia';
const BASE_OFFLINE_HOURS = 24;
const SINGULARITY_BONUS = 0.1;

const PORTALS: Record<'portais1' | 'portais2' | 'portais3', string[]> = {
  portais1: ['unlock_productionChain', 'unlock_grid'],
  portais2: ['unlock_roguelike', 'unlock_parallelTree'],
  portais3: ['unlock_garden', 'unlock_colony'],
};

function effects(cosmos: CosmosState): CosmosEffect[] {
  return cosmos.nodes.flatMap((id) => COSMOS_BY_ID.get(id)?.effects ?? []);
}

export function hasCosmos(cosmos: CosmosState, id: string): boolean {
  return cosmos.nodes.includes(id);
}

export function keeps(cosmos: CosmosState): Set<KeepKey> {
  return new Set(effects(cosmos).flatMap((e) => (e.type === 'keep' ? [e.key] : [])));
}

export function startEssence(cosmos: CosmosState): number {
  return effects(cosmos).reduce((sum, e) => sum + (e.type === 'startEssence' ? e.amount : 0), 0);
}

export function offlineCapSeconds(cosmos: CosmosState): number {
  const hours = effects(cosmos).reduce((h, e) => (e.type === 'offlineHours' ? Math.max(h, e.hours) : h), BASE_OFFLINE_HOURS);
  return hours * 3600;
}

export function hasAutoTree(cosmos: CosmosState): boolean {
  return effects(cosmos).some((e) => e.type === 'autoTree');
}

export function anomaliesUnlocked(cosmos: CosmosState): boolean {
  return effects(cosmos).some((e) => e.type === 'unlockAnomalies');
}

export function weeklyEventsUnlocked(cosmos: CosmosState): boolean {
  return effects(cosmos).some((e) => e.type === 'weeklyEvents');
}

/** Cada Singularidade já conquistada (gasta ou não) dá +10% de Essência para sempre. */
export function singularityMultiplier(cosmos: CosmosState): number {
  return 1 + SINGULARITY_BONUS * cosmos.totalSingularities;
}

export function cosmosBonuses(cosmos: CosmosState): ModeBonus[] {
  const fromNodes = cosmos.nodes.flatMap((id) => {
    const node = COSMOS_BY_ID.get(id);
    return (node?.effects ?? []).flatMap((e) =>
      e.type === 'multiplier' ? [{ target: e.target, stat: e.stat, value: e.value, source: `Cosmologia: ${node!.name}` }] : [],
    );
  });
  const fromAnomalies = cosmos.anomaliesDone.map((id) => ({ ...ANOMALIES[id].rewardBonus, source: `Anomalia vencida: ${ANOMALIES[id].name}` }));
  const active: ModeBonus[] =
    cosmos.anomaly === 'entropia' ? [{ target: 'global', stat: 'essence', value: 0.5, source: 'Anomalia: Entropia' }] : [];
  const passive: ModeBonus[] =
    cosmos.totalSingularities > 0
      ? [{ target: 'global', stat: 'essence', value: singularityMultiplier(cosmos), source: 'Singularidades' }]
      : [];
  return [...passive, ...fromNodes, ...fromAnomalies, ...active];
}

export function cosmosFlags(cosmos: CosmosState): Flag[] {
  const fromNodes = effects(cosmos).flatMap((e) => (e.type === 'flag' ? [e.flag] : []));
  const anomalyFlag = cosmos.anomaly ? ANOMALIES[cosmos.anomaly].flag : undefined;
  return anomalyFlag ? [...fromNodes, anomalyFlag] : fromNodes;
}

/** Durante a Anomalia Isolamento, os modos não trocam bônus entre si. */
export function linksDisabled(cosmos: CosmosState): boolean {
  return cosmos.anomaly === 'isolamento';
}

// ---------- Colapso ----------

/** Cresce com os dígitos da Essência do ciclo: ~5 em 100M, ~10 em 1B, ~16 em 10B, ~29 em 1T. */
export function collapseGain(runEssence: number): number {
  const digits = Math.log10(Math.max(1, runEssence)) - 6;
  return digits > 0 ? Math.floor(2 * digits ** 1.5) : 0;
}

export function canCollapse(meta: MetaState): boolean {
  return meta.purchasedNodes.includes(COLLAPSE_REQUIRED_NODE) && collapseGain(meta.cosmos.runEssence) >= 1;
}

function collapsedModes(modes: ModeStates, keep: ReadonlySet<string>): ModeStates {
  return Object.fromEntries(
    MODES.map((m) => [m.id, m.onCollapse ? m.onCollapse(modes[m.id], keep) : m.initialState]),
  ) as ModeStates;
}

/** Reinicia o ciclo e paga Singularidades. `nextAnomaly` começa o novo ciclo dentro de uma Anomalia. */
export function collapse(state: SimState, nextAnomaly: AnomalyId | null = null): SimState {
  const { meta } = state;
  if (!canCollapse(meta)) return state;
  const gain = collapseGain(meta.cosmos.runEssence);
  const cosmos: CosmosState = {
    ...meta.cosmos,
    singularities: meta.cosmos.singularities + gain,
    totalSingularities: meta.cosmos.totalSingularities + gain,
    collapses: meta.cosmos.collapses + 1,
    runEssence: 0,
    anomaly: nextAnomaly && anomaliesUnlocked(meta.cosmos) && !meta.cosmos.anomaliesDone.includes(nextAnomaly) ? nextAnomaly : null,
  };
  const keep = keeps(cosmos);
  const purchasedNodes = (['portais1', 'portais2', 'portais3'] as const).flatMap((k) => (keep.has(k) ? PORTALS[k] : []));
  return {
    meta: {
      ...meta,
      essence: startEssence(cosmos),
      purchasedNodes,
      activeModeId: 'baseClicker',
      cosmos,
    },
    modes: collapsedModes(state.modes, keep),
  };
}

/** Encerra a Anomalia ativa (e registra a recompensa) quando o ciclo atinge a meta. */
export function completeAnomalyIfReached(meta: MetaState): MetaState {
  const active = meta.cosmos.anomaly;
  if (!active || !meta.purchasedNodes.includes(ANOMALY_GOAL_NODE)) return meta;
  return {
    ...meta,
    cosmos: { ...meta.cosmos, anomaly: null, anomaliesDone: [...meta.cosmos.anomaliesDone, active] },
  };
}

/** Sai da Anomalia sem recompensa; o ciclo continua normalmente. */
export function abandonAnomaly(meta: MetaState): MetaState {
  return meta.cosmos.anomaly ? { ...meta, cosmos: { ...meta.cosmos, anomaly: null } } : meta;
}

// ---------- Cosmologia ----------

export type CosmosStatus = 'owned' | 'available' | 'unaffordable' | 'locked';

export function cosmosNodeStatus(cosmos: CosmosState, node: CosmosNode): CosmosStatus {
  if (cosmos.nodes.includes(node.id)) return 'owned';
  if (!node.parents.every((p) => cosmos.nodes.includes(p))) return 'locked';
  return cosmos.singularities >= node.cost ? 'available' : 'unaffordable';
}

export function buyCosmos(cosmos: CosmosState, id: string): CosmosState {
  const node = COSMOS_BY_ID.get(id);
  if (!node || cosmosNodeStatus(cosmos, node) !== 'available') return cosmos;
  return { ...cosmos, singularities: cosmos.singularities - node.cost, nodes: [...cosmos.nodes, id] };
}

export function restoreCosmos(raw: unknown): CosmosState {
  const c = (raw ?? {}) as Partial<CosmosState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const base = initialCosmos();
  const anomaly = ANOMALY_IDS.includes(c.anomaly as AnomalyId) ? (c.anomaly as AnomalyId) : null;
  return {
    ...base,
    singularities: Math.floor(num(c.singularities)),
    totalSingularities: Math.floor(num(c.totalSingularities)),
    collapses: Math.floor(num(c.collapses)),
    nodes: Array.isArray(c.nodes) ? [...new Set(c.nodes.filter((id): id is string => COSMOS_BY_ID.has(id as string)))] : [],
    runEssence: num(c.runEssence),
    anomaly,
    anomaliesDone: Array.isArray(c.anomaliesDone)
      ? [...new Set(c.anomaliesDone.filter((id): id is AnomalyId => ANOMALY_IDS.includes(id as AnomalyId)))]
      : [],
  };
}

export { COSMOLOGY };
