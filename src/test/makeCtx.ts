import { zeroRates } from '../core/modeRegistry';
import type { EssenceRates, Flag, ModeContext, Stat } from '../core/types';

export function makeCtx(
  options: { mult?: Partial<Record<Stat, number>>; flags?: Flag[]; rates?: Partial<EssenceRates> } = {},
): ModeContext {
  const flags = new Set(options.flags ?? []);
  return {
    multiplier: (stat) => options.mult?.[stat] ?? 1,
    hasFlag: (flag) => flags.has(flag),
    essenceRates: { ...zeroRates(), ...options.rates },
  };
}
