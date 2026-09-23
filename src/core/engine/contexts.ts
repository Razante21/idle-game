import { MODES } from '../modeRegistry';
import { getMultiplier } from '../skillTree/logic';
import type { EssenceRates, Flag, MetaState, ModeBonus, ModeContext, ModeId, ModeStates } from '../types';

export function unlockedModes(meta: MetaState) {
  return MODES.filter((m) => m.isUnlocked(meta));
}

export function collectBonuses(meta: MetaState, modes: ModeStates): ModeBonus[] {
  return unlockedModes(meta).flatMap((m) => m.provides?.(modes[m.id]) ?? []);
}

export function collectFlags(meta: MetaState, modes: ModeStates): Set<Flag> {
  return new Set(unlockedModes(meta).flatMap((m) => m.flags?.(modes[m.id]) ?? []));
}

export function bonusesFor(bonuses: readonly ModeBonus[], modeId: ModeId): ModeBonus[] {
  return bonuses.filter((b) => (b.target === 'global' || b.target === modeId) && b.value !== 1);
}

export function buildContexts(
  meta: MetaState,
  modes: ModeStates,
  essenceRates: EssenceRates,
): Record<ModeId, ModeContext> {
  const bonuses = collectBonuses(meta, modes);
  const flags = collectFlags(meta, modes);
  const contexts = {} as Record<ModeId, ModeContext>;

  for (const mode of MODES) {
    const incoming = bonusesFor(bonuses, mode.id);
    const cache = new Map<string, number>();
    contexts[mode.id] = {
      multiplier(stat) {
        let value = cache.get(stat);
        if (value === undefined) {
          value = getMultiplier(meta.purchasedNodes, mode.id, stat);
          for (const b of incoming) if (b.stat === stat) value *= b.value;
          cache.set(stat, value);
        }
        return value;
      },
      hasFlag: (flag) => flags.has(flag),
      essenceRates,
    };
  }
  return contexts;
}
