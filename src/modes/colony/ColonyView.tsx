import { useState } from 'react';
import { Tabs } from '../../components/Tabs';
import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import c from './ColonyView.module.css';
import {
  BUILDINGS,
  BUILDING_IDS,
  JOBS,
  JOB_IDS,
  LAWS,
  LAW_IDS,
  assign,
  build,
  buildingCost,
  enact,
  hasLaw,
  housing,
  idle,
  lawStatus,
  lightNeed,
  rates,
  type ColonyState,
} from './logic';

type Tab = 'predios' | 'leis';

function Meter({ value }: { value: number }) {
  return (
    <div className={c.meter}>
      <div className={c.meterFill} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function ColonyView({ state, ctx, essenceRate, update }: ModeViewProps<ColonyState>) {
  const [tab, setTab] = useState<Tab>('predios');
  const r = rates(state, ctx);
  const cap = housing(state);
  const food = r.foodImported + r.foodLocal;
  const hungry = food < r.foodNeed;
  const free = idle(state);

  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.statGrid}>
            <div className={s.stat}>
              <span className={s.muted}>População</span>
              <span className={s.bigNumber}>
                {formatNumber(Math.floor(state.population))}/{formatNumber(cap)}
              </span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Influência</span>
              <span className={s.bigNumber}>{formatNumber(Math.floor(state.influencia))}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Influência/s</span>
              <span className={`${s.bigNumber} ${s.accent}`}>{formatNumber(r.influence)}</span>
            </div>
          </div>
          <Meter value={state.population / cap} />
          <p className={s.muted}>
            Gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s.{' '}
            {hungry ? (
              <span className={s.warning}>Falta comida: a população está diminuindo.</span>
            ) : state.population < cap ? (
              'A população cresce enquanto houver comida e moradia.'
            ) : (
              'Moradia cheia: construa casas.'
            )}
          </p>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Abastecimento</h2>
          <div className={c.flow}>
            <span className={s.muted}>Comida do Jardim</span>
            <span>{formatNumber(r.foodImported)}/s</span>
            <span className={s.muted}>Comida dos agricultores</span>
            <span>{formatNumber(r.foodLocal)}/s</span>
            <span className={s.muted}>Consumo</span>
            <span className={hungry ? s.warning : undefined}>{formatNumber(r.foodNeed)}/s</span>
            <span className={s.muted}>Materiais da Fábrica</span>
            <span>{formatNumber(r.materialsIn)}/s</span>
            <span className={s.muted}>Materiais em estoque</span>
            <span>{formatNumber(Math.floor(state.materiais))}</span>
            <span className={s.muted}>Luz da Constelação</span>
            <span>
              {formatNumber(ctx.imports.luz)}/{formatNumber(lightNeed(state))}
            </span>
            <span className={s.muted}>Saber</span>
            <span>
              {formatNumber(Math.floor(state.saber))} (+{formatNumber(r.knowledge)}/s)
            </span>
          </div>
          {r.light < 1 && (
            <p className={s.warning}>Só {Math.round(r.light * 100)}% dos prédios estão iluminados. Mais poeira na Constelação resolve.</p>
          )}
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Empregos</h2>
          <p className={s.muted}>
            Sem emprego: <strong>{free}</strong> (cada um rende 0.1 influência/s)
            {hasLaw(state, 'conselho') && ' · o Conselho distribui os novos habitantes'}
          </p>
          <div className={s.stack}>
            {JOB_IDS.map((id) => (
              <div key={id} className={s.row}>
                <div className={s.stat}>
                  <span className={s.value}>{JOBS[id].name}</span>
                  <span className={s.muted}>{JOBS[id].description}</span>
                </div>
                <div className={c.job}>
                  <button aria-label={`Remover de ${JOBS[id].name}`} disabled={state.jobs[id] <= 0} onClick={() => update((x) => assign(x, id, -1))}>
                    −
                  </button>
                  <span className={c.count}>{state.jobs[id]}</span>
                  <button aria-label={`Adicionar a ${JOBS[id].name}`} disabled={free <= 0} onClick={() => update((x) => assign(x, id, 1))}>
                    +
                  </button>
                  <button disabled={free <= 0} onClick={() => update((x) => assign(x, id, idle(x)))}>
                    +{free}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={s.stack}>
        <Tabs<Tab>
          tabs={[
            { id: 'predios', label: 'Prédios' },
            { id: 'leis', label: `Leis ${state.laws.length}/${LAW_IDS.length}` },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'predios' &&
          BUILDING_IDS.map((id) => {
            const def = BUILDINGS[id];
            const cost = buildingCost(state, id);
            const unit = def.currency === 'materiais' ? 'materiais' : 'influência';
            return (
              <section key={id} className={s.panel}>
                <div className={s.row}>
                  <div className={s.stat}>
                    <span className={s.value}>
                      {def.name} · {state.buildings[id]}
                    </span>
                    <span className={s.muted}>{def.description}</span>
                  </div>
                  <button disabled={state[def.currency] < cost} onClick={() => update((x) => build(x, id))}>
                    {formatNumber(cost)} {unit}
                  </button>
                </div>
              </section>
            );
          })}

        {tab === 'leis' &&
          LAW_IDS.map((id) => {
            const status = lawStatus(state, id);
            return (
              <section key={id} className={s.panel}>
                <div className={s.row}>
                  <div className={s.stat}>
                    <span className={s.value}>{LAWS[id].name}</span>
                    <span className={s.muted}>{LAWS[id].description}</span>
                  </div>
                  {status === 'owned' ? (
                    <span className={s.good}>Em vigor</span>
                  ) : (
                    <button disabled={status !== 'available'} onClick={() => update((x) => enact(x, id))}>
                      {formatNumber(LAWS[id].cost)} saber
                    </button>
                  )}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
