import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  SURGE_MULT,
  bulkCost,
  buyGenerator,
  buyUpgrade,
  cargaGain,
  catchSurge,
  click,
  clickValue,
  essenceRate,
  generatorRate,
  initialBaseClickerState,
  maxAffordable,
  productionPerSecond,
  restore,
  sobrecarga,
  tick,
  type BaseClickerState,
} from './logic';
import { GENERATORS, UPGRADES } from './upgrades';

const noMult = makeCtx();

function withOwned(owned: number[], extra: Partial<BaseClickerState> = {}): BaseClickerState {
  return { ...initialBaseClickerState, owned: GENERATORS.map((_, i) => owned[i] ?? 0), ...extra };
}

describe('baseClicker generators', () => {
  it('has 12 generators, the later ones with steeper cost growth', () => {
    expect(GENERATORS).toHaveLength(12);
    expect(GENERATORS[11]!.growth).toBeGreaterThan(GENERATORS[0]!.growth);
  });

  it('bulk cost equals the sum of individual costs', () => {
    const summed = [0, 1, 2, 3, 4].reduce((acc, owned) => acc + bulkCost(7, owned, 1), 0);
    expect(bulkCost(7, 0, 5)).toBeCloseTo(summed, -3);
  });

  it('maxAffordable never exceeds the energy available', () => {
    for (const energy of [0, 9, 10, 55, 1234, 1e6]) {
      const n = maxAffordable(0, 3, energy);
      if (n > 0) expect(bulkCost(0, 3, n)).toBeLessThanOrEqual(energy);
      expect(bulkCost(0, 3, n + 1)).toBeGreaterThan(energy);
    }
  });

  it('doubles a generator every 25 owned', () => {
    expect(generatorRate(withOwned([25]), 0)).toBe(0.5 * 25 * 2);
    expect(generatorRate(withOwned([50]), 0)).toBe(0.5 * 50 * 4);
  });

  it('buying spends energy and adds generators', () => {
    const next = buyGenerator({ ...initialBaseClickerState, energy: 100 }, 0, 'max');
    expect(next.owned[0]).toBe(maxAffordable(0, 0, 100));
    expect(buyGenerator(initialBaseClickerState, 0, 1)).toBe(initialBaseClickerState);
  });

  it('ticks production and applies multipliers', () => {
    const state = withOwned([10]);
    const doubled = makeCtx({ mult: { production: 2 } });
    expect(productionPerSecond(state, doubled)).toBe(10);
    expect(tick(state, 2, doubled).energy).toBe(20);
    expect(essenceRate(state, doubled)).toBeCloseTo(Math.sqrt(10) / 15);
  });

  it('applies Ascensão rules: milestone every 20 and auto-click', () => {
    expect(productionPerSecond(withOwned([20]), makeCtx({ flags: ['nucleo.milestone20'] }))).toBe(20);
    expect(tick(initialBaseClickerState, 1, makeCtx({ flags: ['nucleo.autoclick'] })).energy).toBe(5);
  });

  it('click grants at least 1 energy', () => {
    const next = click(initialBaseClickerState, noMult);
    expect(next.energy).toBe(1);
    expect(next.clicks).toBe(1);
  });
});

describe('baseClicker upgrades', () => {
  it('has around 90 upgrades with unique ids', () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(90);
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
  });

  it('tier upgrades require owning the generator and double it', () => {
    const state = withOwned([1], { energy: 1_000 });
    const bought = buyUpgrade(state, 'gen-0-0');
    expect(bought.upgrades).toEqual(['gen-0-0']);
    expect(generatorRate(bought, 0)).toBe(1);
    expect(buyUpgrade(withOwned([0], { energy: 1_000 }), 'gen-0-0').upgrades).toEqual([]);
  });

  it('synergy adds 1% per unit of the source generator', () => {
    const state = withOwned([100, 10], { upgrades: ['syn-0'] });
    expect(generatorRate(state, 1)).toBeCloseTo(4 * 10 * 2);
  });

  it('click upgrades multiply the click and add production share', () => {
    const state = withOwned([10], { upgrades: ['click-0'] });
    expect(clickValue(state, noMult)).toBeCloseTo((1 + 0.06 * 5) * 2);
  });
});

describe('baseClicker surges and Sobrecarga', () => {
  it('an orb spawns, can be caught and multiplies production', () => {
    let state = withOwned([10]);
    state = tick(state, 61, noMult);
    expect(state.surge.orbLeft).toBeGreaterThan(0);
    state = catchSurge(state, noMult);
    expect(state.surge.caught).toBe(1);
    expect(productionPerSecond(state, noMult)).toBe(5 * SURGE_MULT);
    state = tick(state, 31, noMult);
    expect(state.surge.activeLeft).toBe(0);
  });

  it('an uncaught orb expires and schedules the next one', () => {
    const state = tick(tick(initialBaseClickerState, 61, noMult), 16, noMult);
    expect(state.surge.orbLeft).toBe(0);
    expect(state.surge.nextIn).toBeGreaterThan(0);
  });

  it('Sobrecarga trades the run for Carga', () => {
    const state = withOwned([50, 20], { runEnergy: 4e7, energy: 123, upgrades: ['gen-0-0'], clicks: 9 });
    expect(cargaGain(state)).toBe(2);
    const reset = sobrecarga(state);
    expect(reset.carga).toBe(2);
    expect(reset.owned.every((n) => n === 0)).toBe(true);
    expect(reset.upgrades).toEqual([]);
    expect(reset.clicks).toBe(9);
    expect(productionPerSecond({ ...reset, owned: withOwned([10]).owned }, noMult)).toBeCloseTo(5 * 1.2);
    expect(sobrecarga(initialBaseClickerState)).toBe(initialBaseClickerState);
  });

  it('restore upgrades old saves', () => {
    const restored = restore({ energy: 5, totalEnergy: 50, owned: [3] });
    expect(restored.owned).toHaveLength(12);
    expect(restored.runEnergy).toBe(50);
    expect(restored.upgrades).toEqual([]);
    expect(restore({ upgrades: ['gen-0-0', 'fake'] }).upgrades).toEqual(['gen-0-0']);
  });
});
