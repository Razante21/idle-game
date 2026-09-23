import { useState } from 'react';
import { formatNumber } from '../../core/format';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import g from './GridView.module.css';
import {
  PIECES,
  PIECE_TYPES,
  beaconBonuses,
  buy,
  cellOutput,
  dustPerSecond,
  expand,
  expandCost,
  pieceCost,
  place,
  remove,
  type GridState,
  type PieceType,
} from './logic';

export function GridView({ state, ctx, essenceRate, update }: ModeViewProps<GridState>) {
  const [selected, setSelected] = useState<PieceType | null>('ana');
  const diagonal = ctx.hasFlag('constelacao.diagonal');
  const mult = ctx.multiplier('production');
  const nextExpand = expandCost(state);
  const beacons = beaconBonuses(state);

  const onCell = (i: number) => {
    const current = state.cells[i];
    if (selected && state.inventory[selected] > 0 && current !== selected) {
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
              return (
                <button
                  key={i}
                  className={`${g.cell} ${p ? g[p] : g.empty}`}
                  onClick={() => onCell(i)}
                  title={p ? `${PIECES[p].name} — clique para recolher` : 'Vazio'}
                  aria-label={p ? PIECES[p].name : `Célula vazia ${i + 1}`}
                >
                  {p && <span className={g.symbol}>{PIECES[p].symbol}</span>}
                  {out > 0 && <span className={g.out}>{formatNumber(out)}</span>}
                </button>
              );
            })}
          </div>
          <p className={s.muted}>
            Escolha uma peça ao lado e clique numa célula. Clique numa peça colocada para devolvê-la ao inventário.
          </p>
          {nextExpand !== null && (
            <button disabled={state.dust < nextExpand} onClick={() => update(expand)}>
              Expandir para {state.size + 1}x{state.size + 1} ({formatNumber(nextExpand)} poeira)
            </button>
          )}
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
        <h2 className={s.sectionTitle}>Peças</h2>
        {PIECE_TYPES.map((t) => {
          const def = PIECES[t];
          const price = pieceCost(state, t);
          return (
            <section key={t} className={`${s.panel} ${selected === t ? g.selected : ''}`}>
              <div className={s.row}>
                <div className={s.stat}>
                  <span className={s.value}>
                    <span className={g[t]}>{def.symbol}</span> {def.name}{' '}
                    <span className={s.muted}>({state.inventory[t]} no inventário)</span>
                  </span>
                  <span className={s.muted}>{def.description}</span>
                </div>
                <div className={s.buttons}>
                  <button
                    aria-pressed={selected === t}
                    onClick={() => setSelected(selected === t ? null : t)}
                  >
                    {selected === t ? 'Selecionada' : 'Selecionar'}
                  </button>
                  <button disabled={state.dust < price} onClick={() => update((x) => buy(x, t))}>
                    Comprar ({formatNumber(price)})
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
