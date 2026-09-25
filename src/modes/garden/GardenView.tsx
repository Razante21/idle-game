import { useState } from 'react';
import { Tabs } from '../../components/Tabs';
import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import g from './GardenView.module.css';
import {
  GARDEN_UPGRADES,
  GARDEN_UPGRADE_IDS,
  SPECIES,
  SPECIES_IDS,
  buyUpgrade,
  canPlant,
  compostRatio,
  expand,
  expandCost,
  lightBonus,
  mutationCandidates,
  plant,
  plotRates,
  setExportShare,
  totals,
  uproot,
  upgradeCost,
  type GardenState,
  type SpeciesId,
} from './logic';

type Tab = 'sementes' | 'melhorias';

export function GardenView({ state, ctx, essenceRate, update }: ModeViewProps<GardenState>) {
  const [selected, setSelected] = useState<SpeciesId | null>('musgo');
  const [tab, setTab] = useState<Tab>('sementes');
  const t = totals(state, ctx);
  const nextExpand = expandCost(state);

  const onPlot = (i: number) => {
    const current = state.plots[i];
    if (selected && current?.species !== selected && canPlant(state, selected)) update((x) => plant(x, i, selected));
    else if (current) update((x) => uproot(x, i));
  };

  const recipeText = (id: SpeciesId) => {
    const def = SPECIES[id];
    if (!def.recipe) return 'Semente inicial';
    const [a, b] = def.recipe;
    const known = state.discovered.includes(a) && state.discovered.includes(b);
    const parents = known ? `${SPECIES[a].name} + ${SPECIES[b].name}` : '??? + ???';
    const depth = def.depth ? ` · exige Expedição andar ${def.depth} (agora ${ctx.imports.profundidade})` : '';
    return `Mutação: ${parents}${depth}`;
  };

  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.statGrid}>
            <div className={s.stat}>
              <span className={s.muted}>Seiva</span>
              <span className={s.bigNumber}>{formatNumber(Math.floor(state.seiva))}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Seiva/s</span>
              <span className={`${s.bigNumber} ${s.accent}`}>{formatNumber(t.seiva + t.compost)}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Comida/s</span>
              <span className={s.bigNumber}>{formatNumber(t.comida)}</span>
            </div>
          </div>
          <p className={s.muted}>
            Gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s. A luz da Constelação
            acelera o crescimento em x{formatNumber(lightBonus(ctx))}.
          </p>
        </section>

        <section className={s.panel}>
          <div
            className={g.grid}
            style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Canteiros do Jardim"
          >
            {state.plots.map((p, i) => {
              const r = plotRates(state, i, ctx);
              const fertile = !p && mutationCandidates(state, i, ctx).length > 0;
              const def = p ? SPECIES[p.species] : null;
              return (
                <button
                  key={i}
                  className={`${g.plot} ${p ? '' : g.empty} ${fertile ? g.fertile : ''}`}
                  onClick={() => onPlot(i)}
                  title={def ? `${def.name} — clique para arrancar` : fertile ? 'Vazio: uma mutação pode brotar aqui' : 'Vazio'}
                  aria-label={def ? def.name : `Canteiro vazio ${i + 1}`}
                >
                  {def && <span className={`${g.symbol} ${g[`tier${def.tier}`]}`}>{def.symbol}</span>}
                  {def && <span className={g.out}>{formatNumber(r.seiva > r.comida ? r.seiva : r.comida)}</span>}
                  {fertile && <span className={g.out}>✧</span>}
                  {p && <span className={g.bar} style={{ width: `${p.growth * 100}%` }} />}
                </button>
              );
            })}
          </div>
          <p className={s.muted}>
            Escolha uma semente e clique num canteiro. Canteiros vazios com duas plantas certas ao lado podem brotar
            uma espécie nova (brilham em verde). Clique numa planta para arrancá-la.
          </p>
          {nextExpand !== null && (
            <button disabled={state.seiva < nextExpand} onClick={() => update(expand)}>
              Ampliar para {state.size + 1}x{state.size + 1} ({formatNumber(nextExpand)} seiva)
            </button>
          )}
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Celeiro</h2>
          <div className={s.row}>
            <span className={s.muted}>Enviar para a Colônia</span>
            <span className={s.value}>{Math.round(state.exportShare * 100)}%</span>
          </div>
          <input
            className={g.slider}
            type="range"
            min={0}
            max={100}
            step={10}
            value={Math.round(state.exportShare * 100)}
            onChange={(e) => update((x) => setExportShare(x, Number(e.target.value) / 100))}
            aria-label="Parte da comida enviada à Colônia"
          />
          <p className={s.muted}>
            Exportando <strong>{formatNumber(t.exported)}</strong> comida/s. O resto vira{' '}
            <strong>{formatNumber(t.compost)}</strong> seiva/s na composteira ({Math.round(compostRatio(state) * 100)}%).
          </p>
        </section>
      </div>

      <div className={s.stack}>
        <Tabs<Tab>
          tabs={[
            { id: 'sementes', label: `Sementes ${state.discovered.length}/${SPECIES_IDS.length}` },
            { id: 'melhorias', label: 'Melhorias' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'sementes' &&
          SPECIES_IDS.map((id) => {
            const def = SPECIES[id];
            const known = state.discovered.includes(id);
            if (!known) {
              return (
                <section key={id} className={s.panel}>
                  <span className={s.value}>??? (nível {def.tier})</span>
                  <p className={s.muted}>{recipeText(id)}</p>
                </section>
              );
            }
            const isSel = selected === id;
            return (
              <button
                key={id}
                className={`${s.panel} ${g.seed} ${isSel ? g.selected : ''}`}
                aria-pressed={isSel}
                onClick={() => setSelected(isSel ? null : id)}
              >
                <div className={s.row}>
                  <span className={s.value}>
                    <span className={g[`tier${def.tier}`]}>{def.symbol}</span> {def.name}
                  </span>
                  <span className={state.seiva >= def.plantCost ? s.muted : s.warning}>
                    Plantar: {formatNumber(def.plantCost)} seiva
                  </span>
                </div>
                <p className={s.muted}>
                  A cada {def.growTime}s: {def.seiva > 0 && `${formatNumber(def.seiva)} seiva`}
                  {def.seiva > 0 && def.comida > 0 && ' · '}
                  {def.comida > 0 && `${formatNumber(def.comida)} comida`}
                  {def.special && ` · ${def.special}`}
                </p>
                <p className={s.muted}>{recipeText(id)}</p>
              </button>
            );
          })}

        {tab === 'melhorias' &&
          GARDEN_UPGRADE_IDS.map((id) => {
            const u = GARDEN_UPGRADES[id];
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
                  <button disabled={maxed || state.seiva < cost} onClick={() => update((x) => buyUpgrade(x, id))}>
                    {maxed ? 'Máximo' : `${formatNumber(cost)} seiva`}
                  </button>
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
