import { describe, expect, it } from 'vitest';
import { makeCtx } from '../../test/makeCtx';
import {
  beaconBonuses,
  buy,
  cellOutput,
  expand,
  initialGridState,
  neighbors,
  place,
  rawDustPerSecond,
  remove,
  restore,
  tick,
  type GridState,
  type PieceType,
} from './logic';

function gridWith(layout: Record<number, PieceType>, size = 4): GridState {
  const cells: (PieceType | null)[] = Array.from({ length: size * size }, () => null);
  for (const [i, p] of Object.entries(layout)) cells[Number(i)] = p;
  return { ...initialGridState, size, cells };
}

describe('grid logic', () => {
  it('finds orthogonal and diagonal neighbors', () => {
    expect(neighbors(0, 4, false).sort()).toEqual([1, 4]);
    expect(neighbors(5, 4, true)).toHaveLength(8);
  });

  it('applies giant, pulsar and nebula rules', () => {
    // 0 = anã ao lado de uma gigante (1) → 2/s
    expect(cellOutput(gridWith({ 0: 'ana', 1: 'gigante' }), 0)).toBe(2);
    // pulsar na mesma coluna → +50%
    expect(cellOutput(gridWith({ 0: 'ana', 12: 'pulsar' }), 0)).toBe(1.5);
    // nebulosa isolada → 3, com vizinha → 0.5
    expect(cellOutput(gridWith({ 5: 'nebulosa' }), 5)).toBe(3);
    expect(cellOutput(gridWith({ 5: 'nebulosa', 6: 'ana' }), 5)).toBe(0.5);
    expect(rawDustPerSecond(gridWith({ 0: 'ana', 1: 'gigante', 4: 'gigante' }))).toBe(4);
  });

  it('beacons boost their target mode per lit neighbor', () => {
    const [bonus] = beaconBonuses(gridWith({ 5: 'farolNucleo', 1: 'ana', 4: 'ana', 6: 'gigante' }));
    expect(bonus?.target).toBe('baseClicker');
    expect(bonus?.value).toBeCloseTo(1.45);
  });

  it('buys, places, swaps and removes pieces', () => {
    let state: GridState = { ...initialGridState, dust: 100 };
    state = buy(state, 'gigante');
    expect(state.inventory.gigante).toBe(1);
    state = place(state, 0, 'ana');
    state = place(state, 0, 'gigante');
    expect(state.cells[0]).toBe('gigante');
    expect(state.inventory.ana).toBe(1);
    state = remove(state, 0);
    expect(state.inventory.gigante).toBe(1);
    expect(place(state, 1, 'pulsar')).toBe(state);
  });

  it('expands the grid keeping piece positions', () => {
    const state = { ...gridWith({ 5: 'ana' }), dust: 1000 };
    const bigger = expand(state);
    expect(bigger.size).toBe(5);
    expect(bigger.cells[6]).toBe('ana');
    expect(bigger.dust).toBe(800);
  });

  it('tick picks up the Céu Aberto rule so diagonal giants count', () => {
    const state = gridWith({ 0: 'ana', 5: 'gigante' });
    expect(tick(state, 1, makeCtx()).dust).toBe(1);
    const open = tick(state, 1, makeCtx({ flags: ['constelacao.diagonal'] }));
    expect(open.dust).toBe(2);
    expect(open.diagonal).toBe(true);
  });

  it('restore gives a starter piece to empty saves', () => {
    expect(restore(null).inventory.ana).toBe(1);
    expect(restore({ size: 99, cells: ['ana', 'lixo'] }).cells.slice(0, 2)).toEqual(['ana', null]);
  });
});
