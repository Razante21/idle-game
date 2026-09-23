import { describe, expect, it } from 'vitest';
import type { ModeContext } from '../../core/types';
import {
  bulkCost,
  buyGenerator,
  click,
  essenceRate,
  generatorRate,
  initialBaseClickerState,
  maxAffordable,
  productionPerSecond,
  restore,
  tick,
} from './logic';

const noMult: ModeContext = { multiplier: () => 1 };

describe('baseClicker logic', () => {
  it('bulk cost equals the sum of individual costs', () => {
    const summed = [0, 1, 2, 3, 4].reduce((acc, owned) => acc + bulkCost(0, owned, 1), 0);
    expect(bulkCost(0, 0, 5)).toBeCloseTo(summed);
  });

  it('maxAffordable never exceeds the energy available', () => {
    for (const energy of [0, 9, 10, 55, 1234, 1e6]) {
      const n = maxAffordable(0, 3, energy);
      if (n > 0) expect(bulkCost(0, 3, n)).toBeLessThanOrEqual(energy);
      expect(bulkCost(0, 3, n + 1)).toBeGreaterThan(energy);
    }
  });

  it('doubles a generator every 25 owned', () => {
    expect(generatorRate(0, 25)).toBe(0.5 * 25 * 2);
    expect(generatorRate(0, 50)).toBe(0.5 * 50 * 4);
  });

  it('buying spends energy and adds generators', () => {
    const state = { ...initialBaseClickerState, energy: 100 };
    const next = buyGenerator(state, 0, 'max');
    expect(next.owned[0]).toBe(maxAffordable(0, 0, 100));
    expect(next.energy).toBeCloseTo(100 - bulkCost(0, 0, next.owned[0]!));
    expect(buyGenerator(initialBaseClickerState, 0, 1)).toBe(initialBaseClickerState);
  });

  it('ticks production and applies multipliers', () => {
    const state = { ...initialBaseClickerState, owned: [10, 0, 0, 0, 0, 0] };
    const doubled: ModeContext = { multiplier: (s) => (s === 'production' ? 2 : 1) };
    expect(productionPerSecond(state, doubled)).toBe(10);
    expect(tick(state, 2, doubled).energy).toBe(20);
    expect(essenceRate(state, doubled)).toBeCloseTo(Math.sqrt(10) / 10);
  });

  it('click grants at least 1 energy', () => {
    const next = click(initialBaseClickerState, noMult);
    expect(next.energy).toBe(1);
    expect(next.clicks).toBe(1);
  });

  it('restore tolerates garbage and missing generator tiers', () => {
    expect(restore(null)).toEqual(initialBaseClickerState);
    const restored = restore({ energy: 5, owned: [3] });
    expect(restored.energy).toBe(5);
    expect(restored.owned).toEqual([3, 0, 0, 0, 0, 0]);
  });
});
