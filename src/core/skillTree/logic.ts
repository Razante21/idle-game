import type { EssenceRates, MetaState, ModeId, Stat } from '../types';
import { NODES_BY_ID, SKILL_TREE, type NodeRequirement, type SkillNode } from './treeData';

export function getMultiplier(purchased: readonly string[], modeId: ModeId, stat: Stat): number {
  let mult = 1;
  for (const id of purchased) {
    const node = NODES_BY_ID.get(id);
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type !== 'multiplier' || effect.stat !== stat) continue;
      if (effect.target === 'global' || effect.target === modeId) mult *= effect.value;
    }
  }
  return mult;
}

export function isModeUnlockedByTree(purchased: readonly string[], modeId: ModeId): boolean {
  return purchased.some((id) =>
    NODES_BY_ID.get(id)?.effects.some((e) => e.type === 'unlockMode' && e.modeId === modeId),
  );
}

export function isRequirementMet(req: NodeRequirement, rates: Readonly<EssenceRates>): boolean {
  return rates[req.modeId] >= req.ratePerSecond;
}

export type NodeStatus = 'purchased' | 'available' | 'unaffordable' | 'requirementUnmet' | 'locked';

export function getNodeStatus(node: SkillNode, meta: MetaState, rates: EssenceRates): NodeStatus {
  if (meta.purchasedNodes.includes(node.id)) return 'purchased';
  if (!node.parents.every((p) => meta.purchasedNodes.includes(p))) return 'locked';
  if (!(node.requirements ?? []).every((r) => isRequirementMet(r, rates))) return 'requirementUnmet';
  if (meta.essence < node.cost) return 'unaffordable';
  return 'available';
}

export function countAvailableNodes(meta: MetaState, rates: EssenceRates): number {
  return SKILL_TREE.filter((n) => getNodeStatus(n, meta, rates) === 'available').length;
}
