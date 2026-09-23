import { useState } from 'react';
import { Tabs } from '../../components/Tabs';
import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import g from './GridView.module.css';
import {
  MAX_LEVEL,
  PATTERNS,
  PATTERN_IDS,
  PIECES,
  PIECE_TYPES,
  beaconBonuses,
  buy,
  canExpand,
  cellOutput,
  dustPerSecond,
  expand,
  expandCost,
  fuse,
  fusionCost,
  inventoryCount,
  isAbsorbed,
  patternMultiplier,
  pieceCost,
  place,
  remove,
  type GridState,
  type Piece,
} from './logic';

type Tab = 'pecas' | 'padroes';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export function GridView({ state, ctx, essenceRate, update }: ModeViewProps<GridState>) {
  const [selected, setSelected] = useState<Piece | null>({ type: 'ana', level: 1 });
  const [tab, setTab] = useState<Tab>('pecas');
  const diagonal = ctx.hasFlag('constelacao.diagonal');
  const mult = ctx.multiplier('production') * patternMultiplier(state);
  const nextExpand = expandCost(state);
  const beacons = beaconBonuses(state);
  const need = fusionCost(ctx);

  const onCell = (i: number) => {
    const current = state.cells[i];
    const same = current && selected && current.type === selected.type && current.level === selected.level;
    if (selected && inventoryCount(state, selected) > 0 && !same) {
      update((x) => place(x, i, selected));
    } else if (current) {
      update((x) => remove(x, i));
    }
  };

  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.row}>
            <div className={s.stat}>
              <span className={s.muted}>Poeira estelar</span>
              <span className={s.bigNumber}>{formatNumber(Math.floor(state.dust))}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Por segundo</span>
              <span className={`${s.bigNumber} ${s.accent}`}>{formatNumber(dustPerSecond(state, ctx))}</span>
            </div>
          </div>
          <p className={s.muted}>
            Gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s.
            {diagonal && ' Céu Aberto: diagonais contam como vizinhas.'}
          </p>
        </section>

        <section className={s.panel}>
          <div
            className={g.grid}
            style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Constelação"
          >
            {state.cells.map((p, i) => {
              const out = cellOutput(state, i, diagonal) * mult;
              const absorbed = isAbsorbed(state, i, diagonal);
              return (
                <button
                  key={i}
                  className={`${g.cell} ${p ? g[p.type] : g.empty} ${absorbed ? g.absorbed : ''}`}
                  onClick={() => onCell(i)}
                  title={p ? `${PIECES[p.type].name} nível ${p.level} — clique para recolher` : 'Vazio'}
                  aria-label={p ? `${PIECES[p.type].name} nível ${p.level}` : `Célula vazia ${i + 1}`}
                >
                  {p && <span className={g.symbol}>{PIECES[p.type].symbol}</span>}
                  {p && p.level > 1 && <span className={g.level}>{ROMAN[p.level]}</span>}
                  {out > 0 && <span className={g.out}>{absorbed ? '↘' : formatNumber(out)}</span>}
                </button>
              );
            })}
          </div>
          <p className={s.muted}>
            Selecione uma peça e clique numa célula. Clique numa peça colocada para devolvê-la ao inventário.
          </p>
          {nextExpand !== null && canExpand(ctx) && (
            <button disabled={state.dust < nextExpand} onClick={() => update((x) => expand(x, ctx))}>
              Expandir para {state.size + 1}x{state.size + 1} ({formatNumber(nextExpand)} poeira)
            </button>
          )}
          {!canExpand(ctx) && <p className={s.warning}>Anomalia Céu Pequeno: o grid não pode crescer neste ciclo.</p>}
        </section>

        {beacons.length > 0 && (
          <section className={s.panel}>
            <h2 className={s.sectionTitle}>Faróis acesos</h2>
            {beacons.map((b) => (
              <div key={b.source} className={s.row}>
                <span className={s.muted}>{b.source}</span>
                <span className={s.value}>x{formatNumber(b.value)}</span>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className={s.stack}>
        <Tabs<Tab>
          tabs={[
            { id: 'pecas', label: 'Peças' },
            { id: 'padroes', label: `Padrões ${state.patterns.length}/${PATTERN_IDS.length}` },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'pecas' &&
          PIECE_TYPES.map((t) => {
            const def = PIECES[t];
            const price = pieceCost(state, t);
            const levels = state.inventory[t]
              .map((count, idx) => ({ level: idx + 1, count }))
              .filter((l) => l.count > 0 || state.cells.some((p) => p?.type === t && p.level === l.level));
            return (
              <section key={t} className={`${s.panel} ${selected?.type === t ? g.selected : ''}`}>
                <div className={s.row}>
                  <div className={s.stat}>
                    <span className={s.value}>
                      <span className={g[t]}>{def.symbol}</span> {def.name}
                    </span>
                    <span className={s.muted}>{def.description}</span>
                  </div>
                  <button disabled={state.dust < price} onClick={() => update((x) => buy(x, t))}>
                    Comprar ({formatNumber(price)})
                  </button>
                </div>
                {levels.length > 0 && (
                  <div className={g.levels}>
                    {levels.map(({ level, count }) => {
                      const isSel = selected?.type === t && selected.level === level;
                      return (
                        <div key={level} className={g.levelChip}>
                          <button
                            aria-pressed={isSel}
                            className={isSel ? g.levelSelected : ''}
                            onClick={() => setSelected(isSel ? null : { type: t, level })}
                          >
                            nv {ROMAN[level]} · {count}
                          </button>
                          {level < MAX_LEVEL && count >= need && (
                            <button onClick={() => update((x) => fuse(x, { type: t, level }, ctx))}>
                              Fundir {need}→{ROMAN[level + 1]}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

        {tab === 'padroes' && (
          <section className={s.panel}>
            <p className={s.muted}>
              Forme desenhos no céu para descobrir constelações. Cada uma dá +25% de poeira para sempre, mesmo que
              você desfaça o desenho. Bônus atual: x{formatNumber(patternMultiplier(state))}.
            </p>
            <div className={s.stack}>
              {PATTERN_IDS.map((id) => {
                const found = state.patterns.includes(id);
                return (
                  <div key={id} className={s.row}>
                    <span className={found ? s.value : s.muted}>{found ? PATTERNS[id].name : '???'}</span>
                    <span className={found ? s.good : s.muted}>{found ? 'Descoberta' : PATTERNS[id].hint}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
