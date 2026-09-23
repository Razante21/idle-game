import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  RESOURCES,
  assign,
  deliverContract,
  expandStorage,
  freeWorkers,
  hire,
  initialProductionChainState,
  isStationUnlocked,
  provides,
  research,
  restore,
  storageCap,
  tick,
  upgrade,
  type ProductionChainState,
  type Resource,
} from './logic';

const ctx = makeCtx();

function res(partial: Partial<Record<Resource, number>> = {}): Record<Resource, number> {
  return { ...(Object.fromEntries(RESOURCES.map((r) => [r, 0])) as Record<Resource, number>), ...partial };
}

function withWorkers(assigned: number[], extra: Partial<ProductionChainState> = {}): ProductionChainState {
  const full = Array.from({ length: 8 }, (_, i) => assigned[i] ?? 0);
  return {
    ...initialProductionChainState,
    workers: full.reduce((a, b) => a + b, 0),
    assigned: full,
    contractCooldown: 9999,
    ...extra,
  };
}

describe('productionChain stations', () => {
  it('assigns only free workers to unlocked stations', () => {
    let state = assign(initialProductionChainState, 0, 10);
    expect(state.assigned[0]).toBe(3);
    expect(freeWorkers(state)).toBe(0);
    state = assign(state, 0, -3);
    expect(assign(state, 4, 1)).toBe(state);
  });

  it('chains resources and is limited by missing input', () => {
    const after = tick(withWorkers([1, 1]), 1, ctx);
    expect(after.resources.lingote).toBeCloseTo(0.5);
    const starved = tick(withWorkers([0, 1]), 1, ctx);
    expect(starved.resources.lingote).toBe(0);
    expect(starved.flow[1]).toBe(0);
  });

  it('multi-input stations need every input', () => {
    const lab = withWorkers([0, 0, 0, 0, 0, 0, 1], { techs: ['esteiras', 'prospeccao', 'eletronica'], resources: res({ plastico: 10 }) });
    expect(tick(lab, 10, ctx).resources.circuito).toBe(0);
    const fed = { ...lab, resources: res({ plastico: 10, lingote: 10 }) };
    expect(tick(fed, 1, ctx).resources.circuito).toBeCloseTo(0.1 * 1.25);
  });

  it('input savings stack: Alquimia rule and Superligas', () => {
    const state = withWorkers([0, 1], { resources: res({ minerio: 10 }), techs: ['superLigas'] });
    const used = 10 - tick(state, 1, makeCtx({ flags: ['fabrica.eficiencia'] })).resources.minerio;
    expect(used).toBeCloseTo(2 * 0.75 * 0.8 * 0.5);
  });

  it('storage caps overflow, except machines and robots', () => {
    const state = withWorkers([10], { resources: res({ minerio: 195 }) });
    expect(tick(state, 10, ctx).resources.minerio).toBe(200);
    expect(storageCap(state, 'maquina', ctx)).toBe(Infinity);
    expect(storageCap(state, 'minerio', makeCtx({ flags: ['fabrica.armazemInfinito'] }))).toBe(2000);
    const bigger = expandStorage({ ...state, resources: res({ lingote: 100 }) });
    expect(storageCap(bigger, 'minerio', ctx)).toBe(400);
  });
});

describe('productionChain research, hiring and contracts', () => {
  it('research unlocks stations in order', () => {
    const rich = { ...initialProductionChainState, resources: res({ engrenagem: 200 }) };
    expect(research(rich, 'prospeccao')).toBe(rich);
    const s1 = research(research(rich, 'esteiras'), 'prospeccao');
    expect(s1.techs).toEqual(['esteiras', 'prospeccao']);
    expect(isStationUnlocked(s1, 4)).toBe(true);
    expect(isStationUnlocked(s1, 6)).toBe(false);
  });

  it('hires and upgrades by spending resources', () => {
    const rich = { ...initialProductionChainState, resources: res({ lingote: 100 }) };
    expect(hire(rich).workers).toBe(4);
    expect(upgrade(rich, 0).levels[0]).toBe(1);
    expect(upgrade(initialProductionChainState, 0)).toBe(initialProductionChainState);
  });

  it('offers a contract after the cooldown and pays reputation on delivery', () => {
    let state = withWorkers([2], { contractCooldown: 1 });
    state = tick(state, 2, ctx);
    expect(state.contract?.resource).toBe('minerio');
    const amount = state.contract!.amount;
    state = { ...state, resources: res({ minerio: amount }) };
    const done = deliverContract(state);
    expect(done.contract).toBeNull();
    expect(done.reputation).toBe(1);
    expect(done.contractsDone).toBe(1);
  });

  it('an expired contract disappears', () => {
    const state = withWorkers([1], { contract: { resource: 'minerio', amount: 999, timeLeft: 1, reward: 1 } });
    expect(tick(state, 2, ctx).contract).toBeNull();
  });

  it('machines and robots link to other modes', () => {
    const bonuses = provides({ ...initialProductionChainState, resources: res({ maquina: 16, robo: 4 }) });
    expect(bonuses.find((b) => b.target === 'baseClicker')?.value).toBe(2);
    expect(bonuses.find((b) => b.target === 'roguelike')?.value).toBeCloseTo(1.4);
    expect(bonuses.find((b) => b.target === 'global')?.value).toBeCloseTo(1.1);
  });

  it('restore upgrades old saves and drops invalid data', () => {
    const restored = restore({ workers: 2, assigned: [5, 5, 0, 0], resources: { minerio: 3 }, techs: ['esteiras', 'x'] });
    expect(restored.workers).toBe(3);
    expect(restored.assigned).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(restored.resources.robo).toBe(0);
    expect(restored.techs).toEqual(['esteiras']);
  });
});
