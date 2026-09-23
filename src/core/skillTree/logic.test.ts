import { describe, expect, it } from 'vitest';
import { zeroRates } from '../modeRegistry';
import type { MetaState } from '../types';
import { getMultiplier, getNodeStatus, isModeUnlockedByTree } from './logic';
import { NODES_BY_ID, SKILL_TREE } from './treeData';

function meta(partial: Partial<MetaState> = {}): MetaState {
  return { essence: 0, totalEssence: 0, purchasedNodes: [], activeModeId: 'baseClicker', ...partial };
}

function node(id: string) {
  const n = NODES_BY_ID.get(id);
  if (!n) throw new Error(id);
  return n;
}

describe('skill tree', () => {
  it('has valid parents and one portal per non-base mode', () => {
    for (const n of SKILL_TREE) for (const p of n.parents) expect(NODES_BY_ID.has(p)).toBe(true);
    const portals = SKILL_TREE.flatMap((n) => n.effects.filter((e) => e.type === 'unlockMode'));
    expect(portals.map((e) => (e.type === 'unlockMode' ? e.modeId : null)).sort()).toEqual(
      ['grid', 'parallelTree', 'productionChain', 'roguelike'],
    );
  });

  it('stacks multipliers from mode-specific and global nodes', () => {
    const purchased = ['despertar', 'sobrecarga', 'fluxo'];
    expect(getMultiplier(purchased, 'baseClicker', 'production')).toBe(4);
    expect(getMultiplier(purchased, 'grid', 'production')).toBe(1);
    expect(getMultiplier(purchased, 'grid', 'essence')).toBe(1.5);
  });

  it('reports node status from parents, cost and sustained requirements', () => {
    const rates = zeroRates();
    expect(getNodeStatus(node('despertar'), meta(), rates)).toBe('unaffordable');
    expect(getNodeStatus(node('despertar'), meta({ essence: 3 }), rates)).toBe('available');
    expect(getNodeStatus(node('toque'), meta({ essence: 100 }), rates)).toBe('locked');

    const beforeGrid = meta({
      essence: 1000,
      purchasedNodes: ['despertar', 'fluxo', 'unlock_productionChain'],
    });
    expect(getNodeStatus(node('unlock_grid'), beforeGrid, rates)).toBe('requirementUnmet');
    expect(getNodeStatus(node('unlock_grid'), beforeGrid, { ...rates, baseClicker: 2 })).toBe('available');
  });

  it('unlocks modes only through portal nodes', () => {
    expect(isModeUnlockedByTree(['despertar'], 'productionChain')).toBe(false);
    expect(isModeUnlockedByTree(['unlock_productionChain'], 'productionChain')).toBe(true);
  });
});
