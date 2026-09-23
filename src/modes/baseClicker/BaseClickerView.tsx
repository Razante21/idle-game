import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import {
  GENERATORS,
  MILESTONE_EVERY,
  bulkCost,
  buyGenerator,
  click,
  clickValue,
  generatorRate,
  maxAffordable,
  productionPerSecond,
  type BaseClickerState,
} from './logic';
import styles from './BaseClickerView.module.css';

export function BaseClickerView({ state, ctx, essenceRate, update }: ModeViewProps<BaseClickerState>) {
  const production = productionPerSecond(state, ctx);
  const productionMult = ctx.multiplier('production');

  return (
    <div className={styles.root}>
      <section className={styles.core}>
        <div className={styles.label}>Energia</div>
        <div className={styles.energy}>{formatNumber(state.energy)}</div>
        <div className={styles.rate}>+{formatNumber(production)}/s</div>
        <button className={styles.coreButton} onClick={() => update((s) => click(s, ctx))}>
          <span className={styles.coreButtonTitle}>Canalizar</span>
          <span className={styles.coreButtonValue}>+{formatNumber(clickValue(state, ctx))}</span>
        </button>
        <p className={styles.link}>
          O Núcleo alimenta a rede com <strong>{formatNumber(essenceRate)}</strong> Essência/s
        </p>
      </section>

      <section className={styles.generators}>
        <h2 className={styles.sectionTitle}>Geradores</h2>
        {GENERATORS.map((g, i) => {
          const owned = state.owned[i] ?? 0;
          const revealed = i === 0 || (state.owned[i - 1] ?? 0) > 0 || owned > 0;
          if (!revealed) {
            return (
              <div key={g.name} className={`${styles.generator} ${styles.hidden}`}>
                <span>???</span>
                <span className={styles.muted}>Compre o gerador anterior para revelar</span>
              </div>
            );
          }
          const cost = bulkCost(i, owned, 1);
          const max = maxAffordable(i, owned, state.energy);
          const toMilestone = MILESTONE_EVERY - (owned % MILESTONE_EVERY);
          return (
            <div key={g.name} className={styles.generator}>
              <div className={styles.genInfo}>
                <div className={styles.genName}>
                  {g.name} <span className={styles.owned}>x{owned}</span>
                </div>
                <div className={styles.muted}>
                  {formatNumber(generatorRate(i, owned) * productionMult)}/s · dobra em {toMilestone}
                </div>
              </div>
              <div className={styles.genButtons}>
                <button
                  disabled={state.energy < cost}
                  onClick={() => update((s) => buyGenerator(s, i, 1))}
                >
                  {formatNumber(Math.ceil(cost))}
                </button>
                <button disabled={max === 0} onClick={() => update((s) => buyGenerator(s, i, 'max'))}>
                  Máx ({max})
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
