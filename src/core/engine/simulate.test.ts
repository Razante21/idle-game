import { describe, expect, it } from 'vitest';
import type { BaseClickerState } from '../../modes/baseClicker/logic';
import type { ParallelTreeState } from '../../modes/parallelTree/logic';
import type { ProductionChainState } from '../../modes/productionChain/logic';
import { logSquared } from '../curves';
import { initialMeta } from '../meta';
import { initialModeStates } from '../modeRegistry';
import type { MetaState } from '../types';
import { applyOfflineProgress, MAX_OFFLINE_SECONDS } from './offlineProgress';
import { deserialize, exportSave, importSave, serialize } from './persistence';
import { simulate, type SimState } from './simulate';

function stateWith(owned: number[], meta: Partial<MetaState> = {}): SimState {
  const modes = initialModeStates();
  const padded = Array.from({ length: 12 }, (_, i) => owned[i] ?? 0);
  modes.baseClicker = { ...(modes.baseClicker as BaseClickerState), owned: padded };
  return {
    meta: { ...initialMeta(), ...meta },
    modes,
  };
}

describe('simulate', () => {
  it('produces energy and essence from the base mode', () => {
    const result = simulate(stateWith([20, 0, 0, 0, 0, 0]), 10);
    const base = result.modes.baseClicker as BaseClickerState;
    expect(base.energy).toBeCloseTo(100);
    expect(result.essenceGained).toBeCloseTo(logSquared(10, 8) * 10);
    expect(result.meta.essence).toBeCloseTo(result.essenceGained);
    expect(result.essenceRates.baseClicker).toBeCloseTo(logSquared(10, 8));
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

  it('links modes: Fábrica machines speed up the Núcleo, Ascensão rules reach it', () => {
    const base = stateWith([20, 0, 0, 0, 0, 0], { purchasedNodes: ['unlock_productionChain', 'unlock_parallelTree'] });
    const plain = simulate(base, 1).modes.baseClicker as BaseClickerState;

    const withMachines: SimState = {
      ...base,
      modes: {
        ...base.modes,
        productionChain: {
          ...(base.modes.productionChain as ProductionChainState),
          resources: { ...(base.modes.productionChain as ProductionChainState).resources, maquina: 16 },
        },
      },
    };
    expect((simulate(withMachines, 1).modes.baseClicker as BaseClickerState).energy).toBeCloseTo(plain.energy * 2);

    const withAutoclick: SimState = {
      ...base,
      modes: { ...base.modes, parallelTree: { ether: 0, totalEther: 0, nodes: ['forjaAstral', 'maosInvisiveis'] } },
    };
    expect((simulate(withAutoclick, 1).modes.baseClicker as BaseClickerState).energy).toBeGreaterThan(plain.energy * 1.5);
  });

  it('Ascensão earns Éter from the other modes’ essence', () => {
    const state = stateWith([20, 0, 0, 0, 0, 0], { purchasedNodes: ['unlock_parallelTree'] });
    const result = simulate(state, 10);
    expect((result.modes.parallelTree as ParallelTreeState).ether).toBeGreaterThan(0);
  });

  it('counts play time', () => {
    expect(simulate(stateWith([1]), 12).meta.playSeconds).toBe(12);
  });

  it('caps offline progress', () => {
    const { elapsedSeconds } = applyOfflineProgress(stateWith([1, 0, 0, 0, 0, 0]), 0, 1e12);
    expect(elapsedSeconds).toBe(MAX_OFFLINE_SECONDS);
  });
});

describe('persistence', () => {
  it('exports and imports a save as text, keeping huge numbers finite', () => {
    const state = stateWith([3], { essence: Infinity, totalEssence: 5 });
    const text = exportSave(state, 99);
    expect(text.startsWith('NEXUS1:')).toBe(true);
    const loaded = importSave(text);
    expect(loaded?.savedAt).toBe(99);
    expect(loaded?.state.meta.essence).toBe(Number.MAX_VALUE);
    expect(importSave('lixo')).toBeNull();
  });

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
      meta: { essence: 'x', purchasedNodes: ['nope', 'despertar'], activeModeId: 'grid', achievements: ['n_click100', 'fake'] },
      modes: {},
    });
    expect(loaded?.state.meta).toEqual({
      essence: 0,
      totalEssence: 0,
      purchasedNodes: ['despertar'],
      activeModeId: 'baseClicker',
      achievements: ['n_click100'],
      playSeconds: 0,
      cosmos: initialMeta().cosmos,
    });
  });
});
