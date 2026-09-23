import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import {
  RESOURCE_NAMES,
  STATIONS,
  assign,
  capacity,
  freeWorkers,
  hire,
  hireCost,
  inputPerOutput,
  provides,
  upgrade,
  upgradeCost,
  type ProductionChainState,
  type Resource,
} from './logic';

const RESOURCES: Resource[] = ['minerio', 'lingote', 'engrenagem', 'maquina'];

export function ProductionChainView({ state, ctx, essenceRate, update }: ModeViewProps<ProductionChainState>) {
  const free = freeWorkers(state);
  const hirePrice = hireCost(state);

  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Estoque</h2>
          <div className={s.statGrid}>
            {RESOURCES.map((r) => (
              <div key={r} className={s.stat}>
                <span className={s.muted}>{RESOURCE_NAMES[r]}</span>
                <span className={`${s.bigNumber} ${r === 'maquina' ? s.accent : ''}`}>
                  {formatNumber(Math.floor(state.resources[r]))}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Operários</h2>
          <div className={s.row}>
            <span>
              <span className={s.value}>{free}</span> livres de <span className={s.value}>{state.workers}</span>
            </span>
            <button
              className={s.primary}
              disabled={state.resources.lingote < hirePrice}
              onClick={() => update(hire)}
            >
              Contratar ({formatNumber(hirePrice)} lingotes)
            </button>
          </div>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>O que as máquinas fazem</h2>
          {provides(state).map((b) => (
            <div key={b.source} className={s.row}>
              <span className={s.muted}>{b.source}</span>
              <span className={s.value}>x{formatNumber(b.value)}</span>
            </div>
          ))}
          <p className={s.muted}>
            A Fábrica gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s.
          </p>
        </section>
      </div>

      <div className={s.stack}>
        <h2 className={s.sectionTitle}>Linha de produção</h2>
        {STATIONS.map((st, i) => {
          const cap = capacity(state, i, ctx);
          const actual = state.flow[i] ?? 0;
          const starved = st.input && cap > 0 && actual < cap * 0.95;
          const cost = upgradeCost(state, i);
          const level = state.levels[i] ?? 0;
          return (
            <section key={st.name} className={s.panel}>
              <div className={s.row}>
                <div className={s.stat}>
                  <span className={s.value}>
                    {st.name} <span className={s.muted}>nv {level}</span>
                  </span>
                  <span className={s.muted}>
                    {st.input
                      ? `${formatNumber(inputPerOutput(i, ctx))} ${RESOURCE_NAMES[st.input.resource]} → 1 ${RESOURCE_NAMES[st.output]}`
                      : `Extrai ${RESOURCE_NAMES[st.output]}`}
                  </span>
                </div>
                <div className={s.buttons}>
                  <button disabled={(state.assigned[i] ?? 0) === 0} onClick={() => update((x) => assign(x, i, -1))}>
                    −
                  </button>
                  <span className={s.value} style={{ minWidth: 28, textAlign: 'center', alignSelf: 'center' }}>
                    {state.assigned[i] ?? 0}
                  </span>
                  <button disabled={free === 0} onClick={() => update((x) => assign(x, i, 1))}>
                    +
                  </button>
                  <button disabled={free === 0} onClick={() => update((x) => assign(x, i, free))}>
                    +Todos
                  </button>
                </div>
              </div>
              <div className={s.row} style={{ marginTop: 8 }}>
                <span className={s.muted}>
                  {formatNumber(actual)}/s de {formatNumber(cap)}/s possíveis{' '}
                  {starved && st.input && <span className={s.warning}>· falta {RESOURCE_NAMES[st.input.resource]}</span>}
                </span>
                <button
                  disabled={state.resources[st.upgrade.resource] < cost}
                  onClick={() => update((x) => upgrade(x, i))}
                >
                  Melhorar ({formatNumber(cost)} {RESOURCE_NAMES[st.upgrade.resource].toLowerCase()})
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
