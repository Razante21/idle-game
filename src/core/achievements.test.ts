import { describe, expect, it } from 'vitest';
import type { BaseClickerState } from '../modes/baseClicker/logic';
import { ACHIEVEMENTS, newlyEarned } from './achievements';
import type { SimState } from './engine/simulate';
import { simulate } from './engine/simulate';
import { initialModeStates } from './modeRegistry';
import { initialMeta } from './store/gameStore';

function state(extra: Partial<SimState['meta']> = {}, clicks = 0): SimState {
  const modes = initialModeStates();
  modes.baseClicker = { ...(modes.baseClicker as BaseClickerState), clicks, owned: [20, ...Array(11).fill(0)] };
  return { meta: { ...initialMeta(), ...extra }, modes };
}

describe('achievements', () => {
  it('has unique ids across every category', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ACHIEVEMENTS.map((x) => x.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((x) => x.category)).size).toBe(9);
  });

  it('reports only achievements that are newly met', () => {
    expect(newlyEarned(state())).toEqual([]);
    expect(newlyEarned(state({}, 150))).toEqual(['n_click100']);
    expect(newlyEarned(state({ achievements: ['n_click100'] }, 150))).toEqual([]);
  });

  it('each achievement adds 2% essence to every mode', () => {
    const plain = simulate(state(), 1).essenceGained;
    const boosted = simulate(state({ achievements: ['n_click100', 'n_e1m', 'n_e1b', 'n_e1t', 'n_e1qa'] }), 1).essenceGained;
    expect(boosted).toBeCloseTo(plain * 1.1);
  });
});
