import { zeroRates } from '../core/modeRegistry';
import { noGoods } from '../core/goods';
import type { EssenceRates, Flag, Goods, ModeContext, Stat } from '../core/types';

export function makeCtx(
  options: {
    mult?: Partial<Record<Stat, number>>;
    flags?: Flag[];
    rates?: Partial<EssenceRates>;
    imports?: Partial<Goods>;
  } = {},
): ModeContext {
  const flags = new Set(options.flags ?? []);
  return {
    multiplier: (stat) => options.mult?.[stat] ?? 1,
    hasFlag: (flag) => flags.has(flag),
    essenceRates: { ...zeroRates(), ...options.rates },
    imports: { ...noGoods(), ...options.imports },
  };
}
