import { useState } from 'react';
import { Tabs } from '../../components/Tabs';
import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import r from './RoguelikeView.module.css';
import {
  CLASSES,
  CLASS_IDS,
  CURSES,
  CURSE_IDS,
  RELICS,
  RELIC_IDS,
  ROOMS,
  SHOP,
  SHOP_ITEMS,
  UPGRADES,
  biomeAt,
  buyShopItem,
  buyUpgrade,
  canAutoExplore,
  choose,
  curseMultiplier,
  endRun,
  isNamedBoss,
  leaveShop,
  roomStrength,
  runReward,
  selectClass,
  shopPrice,
  startRun,
  startingStats,
  toggleCurse,
  unlockClass,
  upgradeCost,
  type RoguelikeState,
  type UpgradeId,
} from './logic';

const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
type Tab = 'preparo' | 'melhorias' | 'reliquias';

export function RoguelikeView({ state, ctx, essenceRate, update }: ModeViewProps<RoguelikeState>) {
  const [tab, setTab] = useState<Tab>('preparo');
  const run = state.run;
  const preview = startingStats(state, ctx);
  const autoAvailable = canAutoExplore(state, ctx);
  const nextDepth = run ? run.depth + 1 : 1;

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
              <span className={s.muted}>Chefes</span>
              <span className={s.bigNumber}>{state.bossesDefeated}</span>
            </div>
          </div>
          <p className={s.muted}>
            O recorde gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s, mesmo
            sem jogar.
          </p>
        </section>

        <Tabs<Tab>
          tabs={[
            { id: 'preparo', label: 'Preparação' },
            { id: 'melhorias', label: 'Melhorias' },
            { id: 'reliquias', label: `Relíquias ${state.relics.length}/${RELIC_IDS.length}` },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'preparo' && (
          <>
            <section className={s.panel}>
              <h2 className={s.sectionTitle}>Classe</h2>
              <div className={s.stack}>
                {CLASS_IDS.map((id) => {
                  const c = CLASSES[id];
                  const owned = state.classes.includes(id);
                  const selected = state.selectedClass === id;
                  return (
                    <div key={id} className={s.row}>
                      <div className={s.stat}>
                        <span className={s.value}>{c.name}</span>
                        <span className={s.muted}>{c.description}</span>
                      </div>
                      {owned ? (
                        <button aria-pressed={selected} className={selected ? s.primary : ''} onClick={() => update((x) => selectClass(x, id))}>
                          {selected ? 'Escolhida' : 'Escolher'}
                        </button>
                      ) : (
                        <button disabled={state.fragments < c.unlockCost} onClick={() => update((x) => unlockClass(x, id))}>
                          {c.unlockCost} frag.
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            <section className={s.panel}>
              <h2 className={s.sectionTitle}>Maldições</h2>
              <p className={s.muted}>
                Opcionais. Cada uma deixa a próxima expedição mais difícil e aumenta os fragmentos ganhos. Agora: x
                {formatNumber(curseMultiplier(state.selectedCurses, ctx))}. Não valem na exploração automática.
              </p>
              <div className={s.stack}>
                {CURSE_IDS.map((id) => (
                  <label key={id} className={r.toggle}>
                    <input
                      type="checkbox"
                      checked={state.selectedCurses.includes(id)}
                      onChange={() => update((x) => toggleCurse(x, id))}
                    />
                    <span>
                      <span className={s.value}>{CURSES[id].name}</span> · {CURSES[id].description}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'melhorias' && (
          <section className={s.panel}>
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
        )}

        {tab === 'reliquias' && (
          <section className={s.panel}>
            <p className={s.muted}>
              Chefes a cada 5 andares podem deixar relíquias; os chefes de bioma (a cada 10) sempre deixam.
            </p>
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
        )}
      </div>

      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.row}>
            <h2 className={s.sectionTitle}>Expedição · {biomeAt(nextDepth).name}</h2>
            {autoAvailable && (
              <label className={r.toggle}>
                <input
                  type="checkbox"
                  checked={state.autoEnabled}
                  onChange={(e) => update((x) => ({ ...x, autoEnabled: e.target.checked, autoTimer: 0 }))}
                />
                Automática (70% dos fragmentos)
              </label>
            )}
          </div>

          {!run ? (
            <div className={s.stack}>
              <p className={s.muted}>
                {CLASSES[state.selectedClass].name} com {preview.maxHp} PV e {formatNumber(preview.power)} de força. A
                cada 10 andares o bioma muda e fica mais perigoso; volte a tempo para levar o ouro como fragmentos.
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
              {run.curses.length > 0 && (
                <span className={s.warning}>Maldições: {run.curses.map((c) => CURSES[c].name).join(', ')}</span>
              )}

              {run.shopOpen ? (
                <>
                  <h3 className={s.sectionTitle}>Mercador</h3>
                  <div className={r.rooms}>
                    {SHOP_ITEMS.map((item) => {
                      const price = shopPrice(item, run.depth, ctx);
                      return (
                        <button
                          key={item}
                          className={`${r.room} ${r.loja}`}
                          disabled={run.gold < price}
                          onClick={() => update((x) => buyShopItem(x, item, ctx))}
                        >
                          <span className={s.value}>{SHOP[item].name}</span>
                          <span className={s.muted}>{SHOP[item].description}</span>
                          <span className={s.essence}>{formatNumber(price)} ouro</span>
                        </button>
                      );
                    })}
                  </div>
                  <button className={s.primary} onClick={() => update(leaveShop)}>
                    Seguir viagem
                  </button>
                </>
              ) : (
                <>
                  <h3 className={s.sectionTitle}>Andar {nextDepth}: escolha o caminho</h3>
                  <div className={r.rooms}>
                    {run.options.map((kind, i) => {
                      const boss = kind === 'chefe' && isNamedBoss(nextDepth) ? biomeAt(nextDepth).boss : null;
                      return (
                        <button
                          key={`${kind}-${i}`}
                          className={`${r.room} ${r[kind]}`}
                          onClick={() => update((x) => choose(x, i, ctx))}
                        >
                          <span className={s.value}>{boss ?? ROOMS[kind].name}</span>
                          <span className={s.muted}>{boss ? 'Chefe do bioma: sempre deixa relíquia' : ROOMS[kind].hint}</span>
                          {(kind === 'combate' || kind === 'elite' || kind === 'chefe') && (
                            <span className={s.warning}>
                              Inimigo ~{formatNumber(roomStrength(kind, nextDepth, run.curses))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <button onClick={() => update((x) => endRun(x, true, ctx))}>
                Voltar agora (+{formatNumber(runReward(run, true, ctx))} fragmentos)
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
