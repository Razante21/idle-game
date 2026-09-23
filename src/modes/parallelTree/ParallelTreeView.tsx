import { formatNumber } from '../../core/format';
import { getMode } from '../../core/modeRegistry';
import type { ModeViewProps } from '../../core/types';
import s from '../shared.module.css';
import a from './ParallelTreeView.module.css';
import {
  ASCENSION_TREE,
  TIERS,
  buyNode,
  etherPerSecond,
  etherSources,
  nodeStatus,
  respec,
  type ParallelTreeState,
} from './logic';

const STATUS_LABEL = {
  purchased: 'Escolhido',
  available: 'Escolher',
  unaffordable: 'Éter insuficiente',
  excluded: 'Caminho fechado',
  locked: 'Requer o nível anterior',
} as const;

export function ParallelTreeView({ state, ctx, essenceRate, update }: ModeViewProps<ParallelTreeState>) {
  return (
    <div className={s.layout}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.row}>
            <div className={s.stat}>
              <span className={s.muted}>Éter</span>
              <span className={s.bigNumber}>{formatNumber(state.ether)}</span>
            </div>
            <div className={s.stat}>
              <span className={s.muted}>Por segundo</span>
              <span className={`${s.bigNumber} ${s.accent}`}>{formatNumber(etherPerSecond(ctx))}</span>
            </div>
          </div>
          <p className={s.muted}>
            A Ascensão gera <strong className={s.essence}>{formatNumber(essenceRate)}</strong> Essência/s.
          </p>
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>De onde vem o Éter</h2>
          <p className={s.muted}>
            Cada modo rende a raiz da sua Essência/s. Manter todos os modos ativos rende mais do que concentrar tudo
            num só.
          </p>
          {etherSources(ctx).map((src) => (
            <div key={src.modeId} className={s.row}>
              <span className={s.muted}>
                {getMode(src.modeId).icon} {getMode(src.modeId).name}
              </span>
              <span className={s.value}>{formatNumber(src.value)}/s</span>
            </div>
          ))}
        </section>

        <section className={s.panel}>
          <h2 className={s.sectionTitle}>Reconfigurar</h2>
          <p className={s.muted}>Desfaz todas as escolhas e devolve todo o Éter gasto.</p>
          <button disabled={state.nodes.length === 0} onClick={() => update(respec)}>
            Reconfigurar caminhos
          </button>
        </section>
      </div>

      <div className={s.stack}>
        <h2 className={s.sectionTitle}>Caminhos — escolha um por nível</h2>
        {TIERS.map((tier) => {
          const nodes = ASCENSION_TREE.filter((n) => n.tier === tier);
          return (
            <div key={tier} className={a.tier}>
              <span className={a.tierLabel}>Nível {tier}</span>
              <div className={a.choices}>
                {nodes.map((node, i) => {
                  const status = nodeStatus(state, node);
                  return (
                    <div key={node.id} className={a.choiceWrap}>
                      {i > 0 && <span className={a.or}>ou</span>}
                      <button
                        className={`${a.node} ${a[status]}`}
                        disabled={status !== 'available'}
                        onClick={() => update((x) => buyNode(x, node.id))}
                      >
                        <span className={s.value}>{node.name}</span>
                        <span className={s.muted}>{node.description}</span>
                        <span className={a.footer}>
                          {status === 'purchased' ? STATUS_LABEL.purchased : `${formatNumber(node.cost)} Éter · ${STATUS_LABEL[status]}`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
