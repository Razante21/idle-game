import { describe, expect, it } from 'vitest';
import type { BaseClickerState } from '../../modes/baseClicker/logic';
import { initialModeStates } from '../modeRegistry';
import type { MetaState } from '../types';
import { applyOfflineProgress, MAX_OFFLINE_SECONDS } from './offlineProgress';
import { deserialize, serialize } from './persistence';
import { simulate, type SimState } from './simulate';

function stateWith(owned: number[], meta: Partial<MetaState> = {}): SimState {
  const modes = initialModeStates();
  modes.baseClicker = { ...(modes.baseClicker as BaseClickerState), owned };
  return {
    meta: { essence: 0, totalEssence: 0, purchasedNodes: [], activeModeId: 'baseClicker', ...meta },
    modes,
  };
}

describe('simulate', () => {
  it('produces energy and essence from the base mode', () => {
    const result = simulate(stateWith([20, 0, 0, 0, 0, 0]), 10);
    const base = result.modes.baseClicker as BaseClickerState;
    expect(base.energy).toBeCloseTo(100);
    expect(result.essenceGained).toBeCloseTo((Math.sqrt(10) / 10) * 10);
    expect(result.meta.essence).toBeCloseTo(result.essenceGained);
    expect(result.essenceRates.baseClicker).toBeCloseTo(Math.sqrt(10) / 10);
  });

  it('applies the global essence multiplier', () => {
    const plain = simulate(stateWith([20, 0, 0, 0, 0, 0]), 1).essenceGained;
    const boosted = simulate(stateWith([20, 0, 0, 0, 0, 0], { purchasedNodes: ['fluxo'] }), 1).essenceGained;
    expect(boosted).toBeCloseTo(plain * 1.5);
  });

  it('keeps long intervals accurate with bounded steps', () => {
    const result = simulate(stateWith([10, 0, 0, 0, 0, 0]), 3600);
    expect((result.modes.baseClicker as BaseClickerState).energy).toBeCloseTo(5 * 3600);
  });

  it('caps offline progress', () => {
    const { elapsedSeconds } = applyOfflineProgress(stateWith([1, 0, 0, 0, 0, 0]), 0, 1e12);
    expect(elapsedSeconds).toBe(MAX_OFFLINE_SECONDS);
  });
});

describe('persistence', () => {
  it('round-trips a save', () => {
    const state = stateWith([3, 1, 0, 0, 0, 0], {
      essence: 42,
      purchasedNodes: ['despertar', 'fluxo', 'unlock_productionChain'],
      activeModeId: 'productionChain',
    });
    const loaded = deserialize(JSON.parse(JSON.stringify(serialize(state, 1234))));
    expect(loaded?.savedAt).toBe(1234);
    expect(loaded?.state).toEqual(state);
  });

  it('rejects unknown versions and sanitizes bad data', () => {
    expect(deserialize({ schemaVersion: 999 })).toBeNull();
    const loaded = deserialize({
      schemaVersion: 1,
      savedAt: 1,
      meta: { essence: 'x', purchasedNodes: ['nope', 'despertar'], activeModeId: 'grid' },
      modes: {},
    });
    expect(loaded?.state.meta).toEqual({
      essence: 0,
      totalEssence: 0,
      purchasedNodes: ['despertar'],
      activeModeId: 'baseClicker',
    });
  });
});
