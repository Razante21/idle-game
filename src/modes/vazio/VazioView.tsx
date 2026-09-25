import { formatNumber } from '../../core/format';
import { playSound } from '../../core/sound';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import v from './VazioView.module.css';
import {
  VAZIO_UPGRADES,
  VAZIO_UPGRADE_IDS,
  drainMultiplier,
  ecoMultiplier,
  focoRate,
  maxRiftSlots,
  sealCost,
  sealReward,
  sealRift,
  shadowMultiplier,
  upgradeCost,
  buyUpgrade,
  type VazioState,
} from './logic';

export function VazioView({ state, ctx, essenceRate, update }: ModeViewProps<VazioState>) {
  const drain = drainMultiplier(state);
  const slots = maxRiftSlots(state);

  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.statGrid}>
            <div className={s.stat}>
              <span className={s.muted}>Foco</span>
              <span className={s.bigNumber}>{formatNumber(Math.floor(state.foco))}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Foco/s</span>
              <span className={`${s.bigNumber} ${s.accent}`}>{formatNumber(focoRate(state, ctx))}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Matéria Escura</span>
              <span className={s.bigNumber}>{formatNumber(Math.floor(state.darkMatter))}</span>
            </div>
          </div>
          <p className={s.muted}>
            Gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s. Núcleo de Sombra x
            {formatNumber(shadowMultiplier(state))} produção, Eco do Nada x{formatNumber(ecoMultiplier(state))} Essência —
            ambos permanentes, mesmo depois do próximo Colapso.
          </p>
          {drain < 1 && (
            <p className={s.warning}>
              As fendas abertas estão drenando {Math.round((1 - drain) * 100)}% da produção de todos os modos.
            </p>
          )}
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>
            Fendas · {state.rifts.length}/{slots}
          </h2>
          {state.rifts.length === 0 ? (
            <p className={v.empty}>Nenhuma fenda aberta agora. Uma nova vai se abrir em {Math.ceil(state.nextRiftIn)}s.</p>
          ) : (
            <div className={v.rifts}>
              {state.rifts.map((r) => {
                const cost = sealCost(r);
                const canSeal = state.foco >= cost;
                return (
                  <div key={r.id} className={v.rift}>
                    <div className={s.row}>
                      <span className={s.value}>
                        Fenda #{r.id} {r.hardened > 0 && `(endurecida x${r.hardened})`}
                      </span>
                      <span className={s.warning}>−{Math.round(r.power * 100)}% produção</span>
                    </div>
                    <div className={v.meter}>
                      <div className={v.timeFill} style={{ width: `${Math.min(100, (r.timeLeft / 240) * 100)}%` }} />
                    </div>
                    <div className={s.row}>
                      <span className={s.muted}>Recompensa: {formatNumber(sealReward(state, r))} Matéria Escura</span>
                      <button
                        disabled={!canSeal}
                        onClick={() => {
                          playSound('buy');
                          update((x) => sealRift(x, r.id));
                        }}
                      >
                        Selar ({formatNumber(cost)} foco)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className={s.muted}>
            Uma fenda não selada a tempo endurece: fica mais forte e continua aberta. Selar sempre é melhor que esperar.
          </p>
        </section>
      </div>

      <div className={s.stack}>
        <h2 className={s.sectionTitle}>Melhorias permanentes</h2>
        {VAZIO_UPGRADE_IDS.map((id) => {
          const u = VAZIO_UPGRADES[id];
          const level = state.upgrades[id];
          const maxed = level >= u.max;
          const cost = upgradeCost(state, id);
          return (
            <section key={id} className={s.panel}>
              <div className={s.row}>
                <div className={s.stat}>
                  <span className={s.value}>
                    {u.name} · {level}/{u.max}
                  </span>
                  <span className={s.muted}>{u.description}</span>
                </div>
                <button disabled={maxed || state.darkMatter < cost} onClick={() => update((x) => buyUpgrade(x, id))}>
                  {maxed ? 'Máximo' : `${formatNumber(cost)} M.E.`}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
