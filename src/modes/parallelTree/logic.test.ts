import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  ASCENSION_TREE,
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

const rich: ParallelTreeState = { ...initialParallelTreeState, ether: 100_000 };

describe('parallelTree logic', () => {
  it('rewards spreading essence across modes', () => {
    const focused = etherPerSecond(makeCtx({ rates: { baseClicker: 16 } }));
    const spread = etherPerSecond(makeCtx({ rates: { baseClicker: 4, productionChain: 4, grid: 4, roguelike: 4 } }));
    expect(focused).toBeCloseTo(0.8);
    expect(spread).toBeCloseTo(1.6);
    expect(etherPerSecond(makeCtx({ rates: { parallelTree: 100 } }))).toBe(0);
  });

  it('choosing a path closes the other one in the same tier', () => {
    const state = buyNode(rich, 'fluxoAstral');
    expect(nodeStatus(state, node('forjaAstral'))).toBe('excluded');
    expect(buyNode(state, 'forjaAstral')).toBe(state);
  });

  it('requires the previous tier, and one of every tier for the capstone', () => {
    expect(nodeStatus(rich, node('maosInvisiveis'))).toBe('locked');
    let state = rich;
    for (const id of ['forjaAstral', 'ritmoAureo', 'alquimia']) state = buyNode(state, id);
    expect(nodeStatus(state, node('transcendencia'))).toBe('locked');
    state = buyNode(state, 'andarilho');
    expect(nodeStatus(state, node('transcendencia'))).toBe('available');
  });

  it('exposes bonuses and rule flags to the other modes', () => {
    let state = rich;
    for (const id of ['fluxoAstral', 'maosInvisiveis', 'ceuAberto']) state = buyNode(state, id);
    expect(flags(state)).toEqual(['nucleo.autoclick', 'constelacao.diagonal']);
    expect(provides(state)).toEqual([{ target: 'global', stat: 'essence', value: 1.5, source: 'Fluxo Astral' }]);
  });

  it('respec refunds everything', () => {
    const spent = buyNode(buyNode(rich, 'fluxoAstral'), 'ritmoAureo');
    const reset = respec(spent);
    expect(reset.nodes).toEqual([]);
    expect(reset.ether).toBe(rich.ether);
  });

  it('restore drops invalid or conflicting choices', () => {
    const restored = restore({ ether: 5, nodes: ['fluxoAstral', 'forjaAstral', 'fenix', 'nope'] });
    expect(restored.nodes).toEqual(['fluxoAstral']);
  });
});
