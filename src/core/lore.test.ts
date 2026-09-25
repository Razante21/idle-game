import { describe, expect, it } from 'vitest';
import { LORE, unlockedLore } from './lore';
import { initialMeta } from './meta';
import { initialModeStates } from './modeRegistry';
import type { SimState } from './engine/simulate';
import type { BaseClickerState } from '../modes/baseClicker/logic';

function state(over: Partial<SimState['meta']> = {}): SimState {
  return { meta: { ...initialMeta(), ...over }, modes: initialModeStates() };
}

describe('lore', () => {
  it('has unique ids', () => {
    expect(new Set(LORE.map((l) => l.id)).size).toBe(LORE.length);
  });

  it('nothing is unlocked in a fresh game', () => {
    expect(unlockedLore(state())).toEqual([]);
  });

  it('unlocks the first entry after the first click', () => {
    const s = state();
    s.modes.baseClicker = { ...(s.modes.baseClicker as BaseClickerState), clicks: 1 };
    expect(unlockedLore(s).map((l) => l.id)).toContain('l01');
  });

  it('unlocks portal entries as the tree is purchased', () => {
    const s = state({ purchasedNodes: ['unlock_productionChain', 'unlock_garden'] });
    const ids = unlockedLore(s).map((l) => l.id);
    expect(ids).toContain('l03');
    expect(ids).toContain('l07');
    expect(ids).not.toContain('l04');
  });

  it('unlocks Vazio-related entries after a collapse and a sealed rift', () => {
    const s = state({ cosmos: { ...initialMeta().cosmos, collapses: 1 } });
    expect(unlockedLore(s).map((l) => l.id)).toContain('l13');
  });
});
