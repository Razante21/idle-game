import { useState } from 'react';
import { Tabs } from '../../components/Tabs';
import { formatDuration, formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import {
  RESOURCES,
  RESOURCE_NAMES,
  STATIONS,
  TECHS,
  TECH_IDS,
  assign,
  capacity,
  deliverContract,
  expandStorage,
  freeWorkers,
  hire,
  hireCost,
  inputPerOutput,
  isStationUnlocked,
  provides,
  reputationMultiplier,
  research,
  storageCap,
  storageUpgradeCost,
  techStatus,
  upgrade,
  upgradeCost,
  type ProductionChainState,
} from './logic';

type Tab = 'producao' | 'pesquisa' | 'logistica';

export function ProductionChainView({ state, ctx, essenceRate, update }: ModeViewProps<ProductionChainState>) {
  const [tab, setTab] = useState<Tab>('producao');
  const free = freeWorkers(state);
  const hirePrice = hireCost(state);
  const visibleResources = RESOURCES.filter(
    (r) => state.resources[r] > 0 || STATIONS.some((st, i) => st.output === r && isStationUnlocked(state, i)),
  );
  const researchable = TECH_IDS.filter((id) => techStatus(state, id) === 'available').length;
  const contract = state.contract;
  const canDeliver = !!contract && state.resources[contract.resource] >= contract.amount;

  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Estoque</h2>
          <div className={s.statGrid}>
            {visibleResources.map((r) => {
              const cap = storageCap(state, r, ctx);
              const full = Number.isFinite(cap) && state.resources[r] >= cap * 0.999;
              return (
                <div key={r} className={s.stat}>
                  <span className={s.muted}>{RESOURCE_NAMES[r]}</span>
                  <span className={`${s.bigNumber} ${r === 'maquina' || r === 'robo' ? s.accent : ''}`}>
                    {formatNumber(Math.floor(state.resources[r]))}
                  </span>
                  {Number.isFinite(cap) && (
                    <span className={full ? s.warning : s.muted}>{full ? 'Armazém cheio' : `de ${formatNumber(cap)}`}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Operários</h2>
          <div className={s.row}>
            <span>
              <span className={s.value}>{free}</span> livres de <span className={s.value}>{state.workers}</span>
            </span>
            <button className={s.primary} disabled={state.resources.lingote < hirePrice} onClick={() => update(hire)}>
              Contratar ({formatNumber(hirePrice)} lingotes)
            </button>
          </div>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>O que a Fábrica faz pela rede</h2>
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
        <Tabs<Tab>
          tabs={[
            { id: 'producao', label: 'Produção' },
            { id: 'pesquisa', label: 'Pesquisa', badge: researchable },
            { id: 'logistica', label: 'Logística', badge: canDeliver ? 1 : undefined },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'producao' &&
          STATIONS.map((st, i) => {
            if (!isStationUnlocked(state, i)) {
              return (
                <section key={st.name} className={s.panel} style={{ opacity: 0.5 }}>
                  <span className={s.value}>{st.name}</span>{' '}
                  <span className={s.muted}>· pesquise {TECHS[st.requires!].name} para liberar</span>
                </section>
              );
            }
            const cap = capacity(state, i, ctx);
            const actual = state.flow[i] ?? 0;
            const starved = st.inputs.length > 0 && cap > 0 && actual < cap * 0.95;
            const cost = upgradeCost(state, i);
            const level = state.levels[i] ?? 0;
            const recipe = st.inputs.length
              ? `${st.inputs.map((inp) => `${formatNumber(inputPerOutput(state, inp.perOutput, ctx))} ${RESOURCE_NAMES[inp.resource]}`).join(' + ')} → 1 ${RESOURCE_NAMES[st.output]}`
              : `Extrai ${RESOURCE_NAMES[st.output]}`;
            const missing = st.inputs.find((inp) => state.resources[inp.resource] < 1);
            return (
              <section key={st.name} className={s.panel}>
                <div className={s.row}>
                  <div className={s.stat}>
                    <span className={s.value}>
                      {st.name} <span className={s.muted}>nv {level}</span>
                    </span>
                    <span className={s.muted}>{recipe}</span>
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
                    {starved && <span className={s.warning}>· falta {RESOURCE_NAMES[(missing ?? st.inputs[0]!).resource]}</span>}
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

        {tab === 'pesquisa' &&
          TECH_IDS.map((id) => {
            const t = TECHS[id];
            const status = techStatus(state, id);
            return (
              <section key={id} className={s.panel} style={{ opacity: status === 'locked' ? 0.45 : 1 }}>
                <div className={s.row}>
                  <div className={s.stat}>
                    <span className={s.value}>{t.name}</span>
                    <span className={s.muted}>
                      {t.description}
                      {status === 'locked' && t.requires && ` · requer ${TECHS[t.requires].name}`}
                    </span>
                  </div>
                  {status === 'owned' ? (
                    <span className={s.good}>Pesquisado</span>
                  ) : (
                    <button disabled={status !== 'available'} onClick={() => update((x) => research(x, id))}>
                      {formatNumber(t.cost.amount)} {RESOURCE_NAMES[t.cost.resource].toLowerCase()}
                    </button>
                  )}
                </div>
              </section>
            );
          })}

        {tab === 'logistica' && (
          <>
            <section className={s.panel}>
              <h2 className={s.sectionTitle}>Contrato</h2>
              {contract ? (
                <div className={s.stack}>
                  <span>
                    Entregar <span className={s.value}>{formatNumber(contract.amount)}</span>{' '}
                    {RESOURCE_NAMES[contract.resource]} em{' '}
                    <span className={s.value}>{formatDuration(contract.timeLeft)}</span>
                  </span>
                  <span className={s.muted}>
                    Você tem {formatNumber(Math.floor(state.resources[contract.resource]))} · recompensa +
                    {contract.reward} reputação
                  </span>
                  <button className={s.primary} disabled={!canDeliver} onClick={() => update(deliverContract)}>
                    Entregar
                  </button>
                </div>
              ) : (
                <p className={s.muted}>Próximo contrato em {formatDuration(state.contractCooldown)}.</p>
              )}
              <p className={s.muted}>
                Reputação {formatNumber(state.reputation)} · produção x{formatNumber(reputationMultiplier(state))} ·{' '}
                {state.contractsDone} contratos cumpridos
              </p>
            </section>

            <section className={s.panel}>
              <h2 className={s.sectionTitle}>Armazéns</h2>
              <p className={s.muted}>
                Cada recurso intermediário tem limite de {formatNumber(storageCap(state, 'minerio', ctx))}. O que passar
                disso é perdido. Máquinas e Robôs não têm limite.
              </p>
              <button disabled={state.resources.lingote < storageUpgradeCost(state)} onClick={() => update(expandStorage)}>
                Dobrar capacidade ({formatNumber(storageUpgradeCost(state))} lingotes)
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
