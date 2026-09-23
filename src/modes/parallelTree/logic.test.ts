import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  ASCENSION_TREE,
  TIERS,
  buyNode,
  etherPerSecond,
  flags,
  initialParallelTreeState,
  nodeStatus,
  provides,
  respec,
  restore,
  type ParallelTreeState,
} from './logic';

function node(id: string) {
  const n = ASCENSION_TREE.find((x) => x.id === id);
  if (!n) throw new Error(id);
  return n;
}

const rich: ParallelTreeState = { ...initialParallelTreeState, ether: 1e12 };

describe('parallelTree logic', () => {
  it('has 8 tiers with up to three paths each', () => {
    expect(TIERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ASCENSION_TREE.filter((n) => n.tier === 1)).toHaveLength(3);
  });

  it('rewards spreading essence across modes', () => {
    const focused = etherPerSecond(makeCtx({ rates: { baseClicker: 16 } }));
    const spread = etherPerSecond(makeCtx({ rates: { baseClicker: 4, productionChain: 4, grid: 4, roguelike: 4 } }));
    expect(focused).toBeCloseTo(0.8);
    expect(spread).toBeCloseTo(1.6);
    expect(etherPerSecond(makeCtx({ rates: { parallelTree: 100 } }))).toBe(0);
  });

  it('choosing a path closes the others in the same tier', () => {
    const state = buyNode(rich, 'fluxoAstral');
    expect(nodeStatus(state, node('forjaAstral'))).toBe('excluded');
    expect(nodeStatus(state, node('mareEterea'))).toBe('excluded');
    expect(buyNode(state, 'forjaAstral')).toBe(state);
  });

  it('requires the previous tier, and one of every tier for the capstone', () => {
    expect(nodeStatus(rich, node('maosInvisiveis'))).toBe('locked');
    let state = rich;
    for (const id of ['forjaAstral', 'tempestade', 'fusaoEstelar', 'mercador', 'diplomacia', 'olhoCosmico']) state = buyNode(state, id);
    expect(state.nodes).toHaveLength(6);
    expect(nodeStatus(state, node('transcendencia'))).toBe('locked');
    state = buyNode(state, 'motorPerpetuo');
    expect(nodeStatus(state, node('transcendencia'))).toBe('available');
  });

  it('exposes bonuses and rule flags to the other modes', () => {
    let state = rich;
    for (const id of ['fluxoAstral', 'tempestade', 'fusaoEstelar']) state = buyNode(state, id);
    expect(flags(state)).toEqual(['nucleo.surtoFrequente', 'constelacao.fusaoBarata']);
    expect(provides(state)).toEqual([{ target: 'global', stat: 'essence', value: 1.5, source: 'Fluxo Astral' }]);
  });

  it('respec refunds 90%', () => {
    const spent = buyNode(buyNode(rich, 'fluxoAstral'), 'ritmoAureo');
    const reset = respec(spent);
    expect(reset.nodes).toEqual([]);
    expect(reset.ether).toBeCloseTo(rich.ether - (node('fluxoAstral').cost + node('ritmoAureo').cost) * 0.1);
  });

  it('restore keeps valid choices and refunds the rest', () => {
    const restored = restore({ ether: 5, nodes: ['fluxoAstral', 'forjaAstral', 'fenix', 'nope'] });
    expect(restored.nodes).toEqual(['fluxoAstral']);
    expect(restored.ether).toBe(5 + node('forjaAstral').cost + node('fenix').cost);
  });

  it('restore refunds the old capstone at the price the player paid', () => {
    const restored = restore({ ether: 0, nodes: ['forjaAstral', 'transcendencia'] });
    expect(restored.nodes).toEqual(['forjaAstral']);
    expect(restored.ether).toBe(8_000);
  });
});
