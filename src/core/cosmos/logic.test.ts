import { describe, expect, it } from 'vitest';
import type { BaseClickerState } from '../../modes/baseClicker/logic';
import * as nucleo from '../../modes/baseClicker/logic';
import * as grid from '../../modes/grid/logic';
import * as fab from '../../modes/productionChain/logic';
import type { RoguelikeState } from '../../modes/roguelike/logic';
import * as exp from '../../modes/roguelike/logic';
import { makeCtx } from '../../test/makeCtx';
import { buildContexts, collectBonuses } from '../engine/contexts';
import { computeEssenceRates, simulate, type SimState } from '../engine/simulate';
import { initialCosmos, initialMeta } from '../meta';
import { initialModeStates } from '../modeRegistry';
import type { CosmosState } from '../types';
import {
  buyCosmos,
  canCollapse,
  collapse,
  collapseGain,
  completeAnomalyIfReached,
  offlineCapSeconds,
} from './logic';

function readyState(cosmos: Partial<CosmosState> = {}): SimState {
  const modes = initialModeStates();
  modes.baseClicker = { ...(modes.baseClicker as BaseClickerState), carga: 40, clicks: 500, owned: [30, ...Array(11).fill(0)] };
  modes.roguelike = { ...(modes.roguelike as RoguelikeState), relics: ['coracao'], bestDepth: 30, fragments: 99 };
  return {
    meta: {
      ...initialMeta(),
      essence: 123,
      totalEssence: 1e12,
      purchasedNodes: ['despertar', 'fluxo', 'unlock_productionChain', 'unlock_grid', 'unlock_roguelike', 'unlock_parallelTree', 'harmonia'],
      achievements: ['n_click100'],
      cosmos: { ...initialCosmos(), runEssence: 1e10, ...cosmos },
    },
    modes,
  };
}

describe('collapse', () => {
  it('pays singularities by the digits of the cycle essence', () => {
    expect(collapseGain(1e6)).toBe(0);
    expect(collapseGain(1e8)).toBe(5);
    expect(collapseGain(1e9)).toBe(10);
    expect(collapseGain(1e12)).toBe(29);
  });

  it('requires Harmonia', () => {
    const state = readyState();
    expect(canCollapse(state.meta)).toBe(true);
    expect(canCollapse({ ...state.meta, purchasedNodes: ['despertar'] })).toBe(false);
    expect(collapse({ ...state, meta: { ...state.meta, purchasedNodes: [] } })).toEqual({ ...state, meta: { ...state.meta, purchasedNodes: [] } });
  });

  it('resets the cycle but keeps achievements, relics and a quarter of the Carga', () => {
    const next = collapse(readyState());
    expect(next.meta.cosmos.singularities).toBe(16);
    expect(next.meta.cosmos.collapses).toBe(1);
    expect(next.meta.cosmos.runEssence).toBe(0);
    expect(next.meta.essence).toBe(0);
    expect(next.meta.purchasedNodes).toEqual([]);
    expect(next.meta.achievements).toEqual(['n_click100']);
    expect(next.meta.totalEssence).toBe(1e12);
    const n = next.modes.baseClicker as BaseClickerState;
    expect(n.carga).toBe(10);
    expect(n.clicks).toBe(500);
    expect(n.owned.every((x) => x === 0)).toBe(true);
    const e = next.modes.roguelike as RoguelikeState;
    expect(e.relics).toEqual(['coracao']);
    expect(e.bestDepth).toBe(0);
    expect(e.fragments).toBe(0);
  });

  it('Cosmologia decides what else survives', () => {
    const next = collapse(readyState({ nodes: ['genese', 'memoriaPortais', 'semente', 'maoAutomata', 'engenheiroFantasma', 'cargaResidual'] }));
    expect(next.meta.purchasedNodes).toEqual(['unlock_productionChain', 'unlock_grid']);
    expect(next.meta.essence).toBe(2_000);
    expect((next.modes.baseClicker as BaseClickerState).carga).toBe(24);
  });
});

describe('cosmologia', () => {
  it('buys nodes in order with singularities', () => {
    let cosmos: CosmosState = { ...initialCosmos(), singularities: 3 };
    expect(buyCosmos(cosmos, 'memoriaPortais')).toBe(cosmos);
    cosmos = buyCosmos(cosmos, 'genese');
    cosmos = buyCosmos(cosmos, 'memoriaPortais');
    expect(cosmos.nodes).toEqual(['genese', 'memoriaPortais']);
    expect(cosmos.singularities).toBe(0);
  });

  it('multiplies every mode and extends offline progress', () => {
    const state = readyState();
    const withNodes = { ...state, meta: { ...state.meta, cosmos: { ...state.meta.cosmos, nodes: ['genese', 'semente', 'producaoCosmica', 'sono'] } } };
    const ctx = buildContexts(withNodes.meta, withNodes.modes, computeEssenceRates(withNodes)).grid;
    expect(ctx.multiplier('essence') / buildContexts(state.meta, state.modes, computeEssenceRates(state)).grid.multiplier('essence')).toBeCloseTo(2);
    expect(offlineCapSeconds(withNodes.meta.cosmos)).toBe(48 * 3600);
    expect(offlineCapSeconds(initialCosmos())).toBe(24 * 3600);
  });

  it('automation: generators and upgrades bought by themselves', () => {
    const state = { ...(initialModeStates().baseClicker as BaseClickerState), energy: 1e4 };
    const ctx = makeCtx({ flags: ['nucleo.autoGeradores', 'nucleo.autoMelhorias'] });
    const auto = nucleo.tick(nucleo.tick(state, 0.1, ctx), 0.1, ctx);
    expect(auto.energy).toBeGreaterThan(1e3);
    expect(auto.owned[0]).toBeGreaterThan(0);
    expect(auto.upgrades.length).toBeGreaterThan(0);
  });
});

describe('anomalias', () => {
  it('start a cycle under a rule and finish at the Portal da Expedição', () => {
    const state = readyState({ nodes: ['genese', 'semente', 'fissuras'] });
    const next = collapse(state, 'entropia');
    expect(next.meta.cosmos.anomaly).toBe('entropia');
    const done = completeAnomalyIfReached({ ...next.meta, purchasedNodes: ['unlock_roguelike'] });
    expect(done.cosmos.anomaly).toBeNull();
    expect(done.cosmos.anomaliesDone).toEqual(['entropia']);
    expect(collapse(state, 'entropia').meta.cosmos.anomaly).toBe('entropia');
    expect(collapse(readyState(), 'entropia').meta.cosmos.anomaly).toBeNull();
  });

  it('entropia halves essence and isolamento cuts the links between modes', () => {
    const base = readyState();
    const plain = simulate(base, 1).essenceGained;
    const entropy = simulate({ ...base, meta: { ...base.meta, cosmos: { ...base.meta.cosmos, anomaly: 'entropia' } } }, 1).essenceGained;
    expect(entropy / plain).toBeCloseTo(0.5, 2);
    const isolated = { ...base.meta, cosmos: { ...base.meta.cosmos, anomaly: 'isolamento' as const } };
    expect(collectBonuses(isolated, base.modes).some((b) => b.source === 'Coração Pulsante')).toBe(false);
    expect(collectBonuses(base.meta, base.modes).some((b) => b.source === 'Coração Pulsante')).toBe(true);
  });

  it('beaten anomalies grant permanent rewards', () => {
    const base = readyState({ anomaliesDone: ['silencio'] });
    expect(collectBonuses(base.meta, base.modes)).toContainEqual(
      expect.objectContaining({ target: 'baseClicker', stat: 'production', value: 3 }),
    );
  });

  it('each rule changes its mode', () => {
    const n = { ...(initialModeStates().baseClicker as BaseClickerState) };
    const silence = makeCtx({ flags: ['anomalia.silencio'] });
    expect(nucleo.click(n, silence).energy).toBe(0);
    // Sem travar: o Núcleo ainda junta energia para a primeira Faísca.
    expect(nucleo.tick(n, 20, silence).energy).toBeGreaterThanOrEqual(nucleo.bulkCost(0, 0, 1));
    const f = initialModeStates().productionChain as fab.ProductionChainState;
    expect(fab.storageCap(f, 'minerio', makeCtx({ flags: ['anomalia.escassez'] }))).toBe(50);
    const g = { ...(initialModeStates().grid as grid.GridState), dust: 1e9 };
    expect(grid.expand(g, makeCtx({ flags: ['anomalia.ceuPequeno'] }))).toBe(g);
    const iron = makeCtx({ flags: ['anomalia.ferro'] });
    let e = exp.startRun(initialModeStates().roguelike as RoguelikeState, iron);
    for (let i = 0; i < 30 && e.run; i++) {
      expect(e.run.options).not.toContain('descanso');
      expect(e.run.options).not.toContain('loja');
      e = { ...exp.choose({ ...e, run: { ...e.run, hp: 1e9, maxHp: 1e9, power: 1e9 } }, 0, iron) };
    }
  });

  it('auto contracts are delivered by the Despachante', () => {
    const f = initialModeStates().productionChain as fab.ProductionChainState;
    const state = { ...f, resources: { ...f.resources, minerio: 100 }, contract: { resource: 'minerio' as const, amount: 10, timeLeft: 100, reward: 1 } };
    expect(fab.tick(state, 0.1, makeCtx({ flags: ['fabrica.autoContratos'] })).reputation).toBe(1);
  });
});
