import { describe, expect, it } from 'vitest';
import type { GridState } from '../../modes/grid/logic';
import type { RoguelikeState } from '../../modes/roguelike/logic';
import { initialMeta } from '../meta';
import { initialModeStates } from '../modeRegistry';
import { buildContexts } from './contexts';
import { zeroRates } from '../modeRegistry';

describe('cross-mode exports', () => {
  const modes = initialModeStates();
  modes.grid = { ...(modes.grid as GridState), cells: [{ type: 'ana', level: 1 }, ...(modes.grid as GridState).cells.slice(1)] };
  modes.roguelike = { ...(modes.roguelike as RoguelikeState), bestDepth: 20 };
  const unlockedAll = [
    'unlock_productionChain',
    'unlock_grid',
    'unlock_roguelike',
    'unlock_parallelTree',
    'unlock_garden',
    'unlock_colony',
  ];

  it('each mode imports what the other unlocked modes export', () => {
    const ctx = buildContexts({ ...initialMeta(), purchasedNodes: unlockedAll }, modes, zeroRates());
    expect(ctx.garden.imports.luz).toBe(1);
    expect(ctx.garden.imports.profundidade).toBe(20);
    expect(ctx.grid.imports.luz).toBe(0); // não importa de si mesmo
  });

  it('locked modes export nothing', () => {
    const ctx = buildContexts(initialMeta(), modes, zeroRates());
    expect(ctx.garden.imports.luz).toBe(0);
  });

  it('isolation cuts every trade route', () => {
    const meta = { ...initialMeta(), purchasedNodes: unlockedAll };
    const ctx = buildContexts({ ...meta, cosmos: { ...meta.cosmos, anomaly: 'isolamento' } }, modes, zeroRates());
    expect(ctx.colony.imports.luz).toBe(0);
    expect(ctx.garden.imports.profundidade).toBe(0);
  });
});
