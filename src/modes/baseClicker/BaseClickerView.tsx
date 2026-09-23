import { useState } from 'react';
import { Tabs } from '../../components/Tabs';
import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import {
  GENERATORS,
  SURGE_MULT,
  bulkCost,
  buyAllUpgrades,
  buyGenerator,
  buyUpgrade,
  cargaGain,
  cargaMultiplier,
  catchSurge,
  click,
  clickValue,
  generatorRate,
  maxAffordable,
  milestoneEvery,
  productionPerSecond,
  sobrecarga,
  upgradeStatus,
  type BaseClickerState,
} from './logic';
import { UPGRADES, requirementText } from './upgrades';
import styles from './BaseClickerView.module.css';

type Tab = 'geradores' | 'melhorias' | 'sobrecarga';
const LOCKED_PREVIEW = 3;

export function BaseClickerView({ state, ctx, essenceRate, update }: ModeViewProps<BaseClickerState>) {
  const [tab, setTab] = useState<Tab>('geradores');
  const production = productionPerSecond(state, ctx);
  const outsideMult = ctx.multiplier('production') * cargaMultiplier(state) * (state.surge.activeLeft > 0 ? SURGE_MULT : 1);
  const every = milestoneEvery(ctx);

  const statuses = UPGRADES.map((u) => ({ u, status: upgradeStatus(state, u) }));
  const buyable = statuses.filter((x) => x.status === 'available' || x.status === 'unaffordable');
  const locked = statuses.filter((x) => x.status === 'locked').slice(0, LOCKED_PREVIEW);
  const affordable = statuses.filter((x) => x.status === 'available').length;
  const ownedCount = state.upgrades.length;
  const gain = cargaGain(state);

  return (
    <div className={styles.root}>
      <section className={styles.core}>
        {state.surge.orbLeft > 0 && (
          <button
            className={styles.orb}
            style={{ left: `${state.surge.orbX}%`, top: `${state.surge.orbY}%` }}
            onClick={() => update((x) => catchSurge(x, ctx))}
            aria-label="Capturar Surto"
            title="Surto! Clique para produção x7"
          >
            ✺
          </button>
        )}
        <div className={styles.label}>Energia</div>
        <div className={styles.energy}>{formatNumber(state.energy)}</div>
        <div className={styles.rate}>+{formatNumber(production)}/s</div>
        {state.surge.activeLeft > 0 && (
          <div className={styles.surgeBanner}>
            SURTO x{SURGE_MULT} · {Math.ceil(state.surge.activeLeft)}s
          </div>
        )}
        <button className={styles.coreButton} onClick={() => update((x) => click(x, ctx))}>
          <span className={styles.coreButtonTitle}>Canalizar</span>
          <span className={styles.coreButtonValue}>+{formatNumber(clickValue(state, ctx))}</span>
        </button>
        <p className={styles.link}>
          O Núcleo alimenta a rede com <strong>{formatNumber(essenceRate)}</strong> Essência/s
        </p>
        {state.carga > 0 && (
          <p className={styles.link}>
            Carga {state.carga}: produção x{formatNumber(cargaMultiplier(state))}
          </p>
        )}
        {ctx.hasFlag('nucleo.autoclick') && <p className={styles.link}>Mãos Invisíveis: 5 cliques/s automáticos</p>}
      </section>

      <section className={styles.side}>
        <Tabs<Tab>
          tabs={[
            { id: 'geradores', label: 'Geradores' },
            { id: 'melhorias', label: `Melhorias ${ownedCount}/${UPGRADES.length}`, badge: affordable },
            { id: 'sobrecarga', label: 'Sobrecarga', badge: gain > 0 ? gain : undefined },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'geradores' &&
          GENERATORS.map((g, i) => {
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
            const toMilestone = every - (owned % every);
            return (
              <div key={g.name} className={styles.generator}>
                <div className={styles.genInfo}>
                  <div className={styles.genName}>
                    {g.name} <span className={styles.owned}>x{owned}</span>
                  </div>
                  <div className={styles.muted}>
                    {formatNumber(generatorRate(state, i, every) * outsideMult)}/s · dobra em {toMilestone}
                  </div>
                </div>
                <div className={styles.genButtons}>
                  <button disabled={state.energy < cost} onClick={() => update((x) => buyGenerator(x, i, 1))}>
                    {formatNumber(Math.ceil(cost))}
                  </button>
                  <button disabled={max === 0} onClick={() => update((x) => buyGenerator(x, i, 'max'))}>
                    Máx ({max})
                  </button>
                </div>
              </div>
            );
          })}

        {tab === 'melhorias' && (
          <div className={s.stack}>
            <div className={s.row}>
              <span className={s.muted}>Melhorias somem da lista depois de compradas.</span>
              <button disabled={affordable === 0} onClick={() => update(buyAllUpgrades)}>
                Comprar todas ({affordable})
              </button>
            </div>
            <div className={styles.upgrades}>
              {buyable.map(({ u, status }) => (
                <button
                  key={u.id}
                  className={`${styles.upgrade} ${status === 'available' ? styles.affordable : ''}`}
                  disabled={status !== 'available'}
                  onClick={() => update((x) => buyUpgrade(x, u.id))}
                >
                  <span className={styles.genName}>{u.name}</span>
                  <span className={styles.muted}>{u.description}</span>
                  <span className={styles.cost}>{formatNumber(u.cost)}</span>
                </button>
              ))}
              {locked.map(({ u }) => (
                <div key={u.id} className={`${styles.upgrade} ${styles.lockedUpgrade}`}>
                  <span className={styles.genName}>{u.name}</span>
                  <span className={styles.muted}>{requirementText(u.requirement)}</span>
                </div>
              ))}
            </div>
            {buyable.length === 0 && locked.length === 0 && <p className={s.muted}>Todas as melhorias compradas.</p>}
          </div>
        )}

        {tab === 'sobrecarga' && (
          <div className={s.panel}>
            <h2 className={s.sectionTitle}>Sobrecarga</h2>
            <p className={s.muted}>
              Reinicia energia, geradores e melhorias do Núcleo. Em troca você ganha Carga: cada ponto dá +10% de
              produção no Núcleo para sempre. Cliques e Surtos capturados são mantidos.
            </p>
            <div className={s.statGrid}>
              <div className={s.stat}>
                <span className={s.muted}>Carga atual</span>
                <span className={s.bigNumber}>{state.carga}</span>
              </div>
              <div className={s.stat}>
                <span className={s.muted}>Ganho agora</span>
                <span className={`${s.bigNumber} ${s.accent}`}>+{gain}</span>
              </div>
              <div className={s.stat}>
                <span className={s.muted}>Sobrecargas</span>
                <span className={s.bigNumber}>{state.sobrecargas}</span>
              </div>
            </div>
            <p className={s.muted}>
              A Carga cresce com a quantidade de dígitos da energia gerada desde a última Sobrecarga: 1 ponto em
              10M, 5 em 1B, 14 em 1T, 52 em 1e20…
            </p>
            <button
              className={s.primary}
              disabled={gain < 1}
              onClick={() => {
                if (window.confirm(`Sobrecarregar o Núcleo por +${gain} Carga?`)) update(sobrecarga);
              }}
            >
              Sobrecarregar (+{gain} Carga)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
