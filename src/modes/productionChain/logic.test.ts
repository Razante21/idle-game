import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  assign,
  freeWorkers,
  hire,
  initialProductionChainState,
  provides,
  restore,
  tick,
  upgrade,
  type ProductionChainState,
} from './logic';

const ctx = makeCtx();

function withWorkers(assigned: number[], extra: Partial<ProductionChainState> = {}): ProductionChainState {
  return {
    ...initialProductionChainState,
    workers: assigned.reduce((a, b) => a + b, 0),
    assigned,
    ...extra,
  };
}

describe('productionChain logic', () => {
  it('assigns only free workers', () => {
    let state = initialProductionChainState;
    state = assign(state, 0, 10);
    expect(state.assigned[0]).toBe(3);
    expect(freeWorkers(state)).toBe(0);
    expect(assign(state, 1, 1)).toBe(state);
    expect(assign(state, 0, -5).assigned[0]).toBe(0);
  });

  it('chains resources and is limited by missing input', () => {
    const state = withWorkers([1, 1, 0, 0]);
    const after = tick(state, 1, ctx);
    expect(after.resources.lingote).toBeCloseTo(0.5);
    expect(after.resources.minerio).toBeCloseTo(0);
    const starved = tick(withWorkers([0, 1, 0, 0]), 1, ctx);
    expect(starved.resources.lingote).toBe(0);
    expect(starved.flow[1]).toBe(0);
  });

  it('uses less input with the Alquimia rule', () => {
    const state = withWorkers([0, 1, 0, 0], { resources: { minerio: 10, lingote: 0, engrenagem: 0, maquina: 0 } });
    const normal = tick(state, 1, ctx).resources.minerio;
    const efficient = tick(state, 1, makeCtx({ flags: ['fabrica.eficiencia'] })).resources.minerio;
    expect(10 - normal).toBeCloseTo(1);
    expect(10 - efficient).toBeCloseTo(0.75);
  });

  it('hires and upgrades by spending resources', () => {
    const rich = { ...initialProductionChainState, resources: { minerio: 0, lingote: 100, engrenagem: 0, maquina: 0 } };
    const hired = hire(rich);
    expect(hired.workers).toBe(4);
    expect(hired.resources.lingote).toBe(95);
    const upgraded = upgrade(rich, 0);
    expect(upgraded.levels[0]).toBe(1);
    expect(upgrade(initialProductionChainState, 0)).toBe(initialProductionChainState);
  });

  it('machines boost Núcleo and Expedição', () => {
    const state = { ...initialProductionChainState, resources: { minerio: 0, lingote: 0, engrenagem: 0, maquina: 16 } };
    const bonuses = provides(state);
    expect(bonuses.find((b) => b.target === 'baseClicker')?.value).toBe(2);
    expect(bonuses.find((b) => b.target === 'roguelike')?.value).toBeCloseTo(1.4);
  });

  it('restore drops an invalid worker assignment', () => {
    const restored = restore({ workers: 2, assigned: [5, 5, 0, 0] });
    expect(restored.workers).toBe(3);
    expect(restored.assigned).toEqual([0, 0, 0, 0]);
  });
});
