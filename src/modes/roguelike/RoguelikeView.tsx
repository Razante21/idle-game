import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import r from './RoguelikeView.module.css';
import {
  RELICS,
  RELIC_IDS,
  ROOMS,
  UPGRADES,
  buyUpgrade,
  canAutoExplore,
  choose,
  endRun,
  enemyStrength,
  runReward,
  startRun,
  startingStats,
  upgradeCost,
  type RoguelikeState,
  type UpgradeId,
} from './logic';

const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export function RoguelikeView({ state, ctx, essenceRate, update }: ModeViewProps<RoguelikeState>) {
  const run = state.run;
  const preview = startingStats(state, ctx);
  const autoAvailable = canAutoExplore(state, ctx);

  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.statGrid}>
            <div className={s.stat}>
              <span className={s.muted}>Fragmentos</span>
              <span className={s.bigNumber}>{formatNumber(state.fragments)}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Andar recorde</span>
              <span className={`${s.bigNumber} ${s.accent}`}>{state.bestDepth}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Expedições</span>
              <span className={s.bigNumber}>{state.runs}</span>
            </div>
          </div>
          <p className={s.muted}>
            O recorde gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s, mesmo
            sem jogar.
          </p>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Melhorias permanentes</h2>
          <div className={s.stack}>
            {UPGRADE_IDS.map((id) => {
              const u = UPGRADES[id];
              const level = state.upgrades[id];
              const maxed = level >= u.max;
              const cost = upgradeCost(state, id);
              return (
                <div key={id} className={s.row}>
                  <div className={s.stat}>
                    <span className={s.value}>
                      {u.name} {u.max > 1 && <span className={s.muted}>nv {level}</span>}
                    </span>
                    <span className={s.muted}>{u.description}</span>
                  </div>
                  <button disabled={maxed || state.fragments < cost} onClick={() => update((x) => buyUpgrade(x, id))}>
                    {maxed ? 'Máximo' : `${formatNumber(cost)} frag.`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Relíquias ({state.relics.length}/{RELIC_IDS.length})</h2>
          <p className={s.muted}>Chefes a cada 5 andares podem deixar relíquias que fortalecem os outros modos.</p>
          <div className={r.relics}>
            {RELIC_IDS.map((id) => {
              const owned = state.relics.includes(id);
              return (
                <div key={id} className={`${r.relic} ${owned ? r.owned : ''}`}>
                  <span className={s.value}>{owned ? RELICS[id].name : '???'}</span>
                  <span className={s.muted}>{owned ? RELICS[id].description : 'Ainda não encontrada'}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.row}>
            <h2 className={s.sectionTitle}>Expedição</h2>
            {autoAvailable && (
              <label className={r.toggle}>
                <input
                  type="checkbox"
                  checked={state.autoEnabled}
                  onChange={(e) => update((x) => ({ ...x, autoEnabled: e.target.checked, autoTimer: 0 }))}
                />
                Exploração automática
              </label>
            )}
          </div>

          {!run ? (
            <div className={s.stack}>
              <p className={s.muted}>
                Você parte com {preview.maxHp} PV e {formatNumber(preview.power)} de força. Cada andar fica mais
                perigoso; volte a tempo para levar o ouro como fragmentos.
              </p>
              <button className={s.primary} onClick={() => update((x) => startRun(x, ctx))}>
                Iniciar expedição
              </button>
            </div>
          ) : (
            <div className={s.stack}>
              <div className={r.hpBar} aria-label={`PV ${Math.ceil(run.hp)} de ${run.maxHp}`}>
                <div className={r.hpFill} style={{ width: `${Math.max(0, (run.hp / run.maxHp) * 100)}%` }} />
                <span className={r.hpText}>
                  {Math.ceil(run.hp)} / {run.maxHp} PV
                </span>
              </div>
              <div className={s.statGrid}>
                <div className={s.stat}>
                  <span className={s.muted}>Andar</span>
                  <span className={s.value}>{run.depth}</span>
                </div>
                <div className={s.stat}>
                  <span className={s.muted}>Força</span>
                  <span className={s.value}>{formatNumber(run.power)}</span>
                </div>
                <div className={s.stat}>
                  <span className={s.muted}>Ouro</span>
                  <span className={s.value}>{formatNumber(run.gold)}</span>
                </div>
              </div>

              <h3 className={s.sectionTitle}>Andar {run.depth + 1}: escolha o caminho</h3>
              <div className={r.rooms}>
                {run.options.map((kind, i) => (
                  <button key={`${kind}-${i}`} className={`${r.room} ${r[kind]}`} onClick={() => update((x) => choose(x, i, ctx))}>
                    <span className={s.value}>{ROOMS[kind].name}</span>
                    <span className={s.muted}>{ROOMS[kind].hint}</span>
                    {(kind === 'combate' || kind === 'elite' || kind === 'chefe') && (
                      <span className={s.warning}>
                        Inimigo ~{formatNumber(enemyStrength(run.depth + 1) * (kind === 'elite' ? 1.8 : kind === 'chefe' ? 3 : 1))}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={() => update((x) => endRun(x, true))}>
                Voltar agora (+{formatNumber(runReward(run, true))} fragmentos)
              </button>
            </div>
          )}
        </section>

        {state.log.length > 0 && (
          <section className={s.panel}>
            <h2 className={s.sectionTitle}>Diário</h2>
            <ul className={r.log}>
              {state.log.map((line, i) => (
                <li key={`${i}-${line}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
