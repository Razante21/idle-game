import { achievementMultiplier } from '../achievements';
import { addGoods, noGoods } from '../goods';
import { cosmosBonuses, cosmosFlags, linksDisabled } from '../cosmos/logic';
import { MODES } from '../modeRegistry';
import { getMultiplier } from '../skillTree/logic';
import type { EssenceRates, Flag, Goods, MetaState, ModeBonus, ModeContext, ModeId, ModeStates } from '../types';

export function unlockedModes(meta: MetaState) {
  return MODES.filter((m) => m.isUnlocked(meta));
}

export function collectBonuses(meta: MetaState, modes: ModeStates): ModeBonus[] {
  const bonuses = linksDisabled(meta.cosmos) ? [] : unlockedModes(meta).flatMap((m) => m.provides?.(modes[m.id]) ?? []);
  bonuses.push(...cosmosBonuses(meta.cosmos));
  if (meta.achievements.length > 0) {
    bonuses.push({
      target: 'global',
      stat: 'essence',
      value: achievementMultiplier(meta.achievements.length),
      source: 'Conquistas',
    });
  }
  return bonuses;
}

export function collectFlags(meta: MetaState, modes: ModeStates): Set<Flag> {
  return new Set([...unlockedModes(meta).flatMap((m) => m.flags?.(modes[m.id]) ?? []), ...cosmosFlags(meta.cosmos)]);
}

/** O que cada modo exporta agora. No Isolamento nada circula entre os modos. */
export function collectExports(meta: MetaState, modes: ModeStates): Partial<Record<ModeId, Goods>> {
  if (linksDisabled(meta.cosmos)) return {};
  const out: Partial<Record<ModeId, Goods>> = {};
  for (const m of unlockedModes(meta)) {
    if (m.exports) out[m.id] = addGoods(noGoods(), m.exports(modes[m.id]));
  }
  return out;
}

/** Bens que chegam a `modeId`: a soma das exportações de todos os outros modos. */
export function importsFor(exports: Partial<Record<ModeId, Goods>>, modeId: ModeId): Goods {
  const total = noGoods();
  for (const [id, goods] of Object.entries(exports) as [ModeId, Goods][]) {
    if (id !== modeId) addGoods(total, goods);
  }
  return total;
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
  const exports = collectExports(meta, modes);
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
      imports: importsFor(exports, mode.id),
    };
  }
  return contexts;
}
