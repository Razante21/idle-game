import { describe, expect, it } from 'vitest';
import { logSquared } from '../../core/curves';
import { makeCtx } from '../../test/makeCtx';
import {
  beaconBonuses,
  buy,
  cellOutput,
  discoverPatterns,
  essenceRate,
  expand,
  fuse,
  gridTotals,
  initialGridState,
  inventoryCount,
  neighbors,
  place,
  rawDustPerSecond,
  remove,
  restore,
  tick,
  type GridState,
  type Piece,
  type PieceType,
} from './logic';

const ctx = makeCtx();

function gridWith(layout: Record<number, PieceType | Piece>, size = 4): GridState {
  const cells: (Piece | null)[] = Array.from({ length: size * size }, () => null);
  for (const [i, p] of Object.entries(layout)) cells[Number(i)] = typeof p === 'string' ? { type: p, level: 1 } : p;
  return { ...initialGridState, size, cells };
}

describe('grid pieces', () => {
  it('finds orthogonal and diagonal neighbors', () => {
    expect(neighbors(0, 4, false).sort()).toEqual([1, 4]);
    expect(neighbors(5, 4, true)).toHaveLength(8);
  });

  it('applies giant, pulsar and nebula rules', () => {
    expect(cellOutput(gridWith({ 0: 'ana', 1: 'gigante' }), 0)).toBe(2);
    expect(cellOutput(gridWith({ 0: 'ana', 1: { type: 'gigante', level: 2 } }), 0)).toBe(3);
    expect(cellOutput(gridWith({ 0: 'ana', 12: 'pulsar' }), 0)).toBe(1.5);
    expect(cellOutput(gridWith({ 5: 'nebulosa' }), 5)).toBe(3);
    expect(cellOutput(gridWith({ 5: 'nebulosa', 6: 'ana' }), 5)).toBe(0.5);
  });

  it('binaries need a partner and quasars halve their neighbours', () => {
    expect(cellOutput(gridWith({ 0: 'binaria' }), 0)).toBe(0);
    expect(cellOutput(gridWith({ 0: 'binaria', 1: 'binaria' }), 0)).toBe(5);
    expect(cellOutput(gridWith({ 0: 'ana', 1: 'quasar' }), 0)).toBe(0.5);
    expect(cellOutput(gridWith({ 0: 'ana', 1: 'quasar' }), 1)).toBe(12);
  });

  it('higher levels produce 3.5x more', () => {
    expect(cellOutput(gridWith({ 0: { type: 'ana', level: 3 } }), 0)).toBeCloseTo(12.25);
  });

  it('black holes swallow neighbour dust and turn it into essence', () => {
    const state = gridWith({ 0: 'ana', 1: 'buracoNegro', 3: 'ana' });
    const totals = gridTotals(state);
    expect(totals.dust).toBe(1);
    expect(totals.absorbed).toBe(1);
    expect(essenceRate(state, ctx)).toBeCloseTo(logSquared(1, 2) + logSquared(1, 1.5));
  });

  it('beacons boost their target mode per lit neighbour and level', () => {
    const [bonus] = beaconBonuses(gridWith({ 5: { type: 'farolNucleo', level: 2 }, 1: 'ana', 4: 'ana' }));
    expect(bonus?.target).toBe('baseClicker');
    expect(bonus?.value).toBeCloseTo(1.6);
  });
});

describe('grid actions', () => {
  it('buys, places, swaps and removes pieces', () => {
    let state: GridState = { ...initialGridState, dust: 100 };
    state = buy(state, 'gigante');
    expect(inventoryCount(state, { type: 'gigante', level: 1 })).toBe(1);
    state = place(state, 0, { type: 'ana', level: 1 });
    state = place(state, 0, { type: 'gigante', level: 1 });
    expect(state.cells[0]).toEqual({ type: 'gigante', level: 1 });
    expect(inventoryCount(state, { type: 'ana', level: 1 })).toBe(1);
    state = remove(state, 0);
    expect(inventoryCount(state, { type: 'gigante', level: 1 })).toBe(1);
    expect(place(state, 1, { type: 'pulsar', level: 1 })).toBe(state);
  });

  it('fuses three pieces into one of the next level (two with Fusão Estelar)', () => {
    const state = { ...initialGridState, inventory: { ...initialGridState.inventory, ana: [3, 0, 0, 0, 0] } };
    const fused = fuse(state, { type: 'ana', level: 1 }, ctx);
    expect(fused.inventory.ana).toEqual([0, 1, 0, 0, 0]);
    const cheap = makeCtx({ flags: ['constelacao.fusaoBarata'] });
    expect(fuse({ ...state, inventory: { ...state.inventory, ana: [2, 0, 0, 0, 0] } }, { type: 'ana', level: 1 }, cheap).inventory.ana).toEqual([0, 1, 0, 0, 0]);
    expect(fuse(fused, { type: 'ana', level: 1 }, ctx)).toBe(fused);
  });

  it('expands the grid keeping piece positions', () => {
    const bigger = expand({ ...gridWith({ 5: 'ana' }), dust: 1000 });
    expect(bigger.size).toBe(5);
    expect(bigger.cells[6]).toEqual({ type: 'ana', level: 1 });
    expect(bigger.dust).toBe(700);
  });

  it('comets jump to an empty cell every 20s', () => {
    const state = gridWith({ 0: 'cometa' });
    const moved = tick(state, 21, ctx);
    expect(moved.cells[0]).toBeNull();
    expect(moved.cells.filter((p) => p?.type === 'cometa')).toHaveLength(1);
  });

  it('tick picks up the Céu Aberto rule so diagonal giants count', () => {
    const state = gridWith({ 0: 'ana', 5: 'gigante' });
    expect(tick(state, 1, ctx).dust).toBe(1);
    const open = tick(state, 1, makeCtx({ flags: ['constelacao.diagonal'] }));
    expect(open.dust).toBe(2);
    expect(open.diagonal).toBe(true);
  });
});

describe('grid patterns', () => {
  it('discovers patterns and keeps the bonus', () => {
    const belt = discoverPatterns(gridWith({ 0: 'ana', 1: 'ana', 2: 'ana' }));
    expect(belt.patterns).toContain('cinturao');
    expect(rawDustPerSecond(belt)).toBeCloseTo(3 * 1.25);
    const crown = discoverPatterns(gridWith({ 5: 'gigante', 1: 'ana', 4: 'ana', 6: 'ana', 9: 'ana' }));
    expect(crown.patterns).toEqual(expect.arrayContaining(['coroa', 'cruzeiro']));
  });

  it('placing a piece can complete a pattern', () => {
    let state = gridWith({ 0: 'binaria' });
    state = { ...state, inventory: { ...state.inventory, binaria: [1, 0, 0, 0, 0] } };
    expect(place(state, 1, { type: 'binaria', level: 1 }).patterns).toEqual(['gemeas']);
  });

  it('restore converts old saves with plain piece names', () => {
    const restored = restore({ size: 4, cells: ['ana', 'gigante', 'lixo'], inventory: { ana: 2 } });
    expect(restored.cells.slice(0, 3)).toEqual([{ type: 'ana', level: 1 }, { type: 'gigante', level: 1 }, null]);
    expect(restored.inventory.ana).toEqual([2, 0, 0, 0, 0]);
    expect(restore(null).inventory.ana[0]).toBe(1);
  });
});
