import { useState } from 'react';
import { ANOMALIES, ANOMALY_IDS, COSMOLOGY } from '../core/cosmos/data';
import {
  COLLAPSE_REQUIRED_NODE,
  anomaliesUnlocked,
  canCollapse,
  collapseGain,
  cosmosNodeStatus,
  keeps,
  singularityMultiplier,
} from '../core/cosmos/logic';
import { formatNumber } from '../core/format';
import { NODES_BY_ID } from '../core/skillTree/treeData';
import { useGameStore } from '../core/store/gameStore';
import type { AnomalyId } from '../core/types';
import s from '../modes/shared.module.css';
import { Modal } from './Modal';
import { Tabs } from './Tabs';
import c from './CollapseView.module.css';

type Tab = 'colapso' | 'cosmologia' | 'anomalias';

const KEEP_LABELS: Record<string, string> = {
  portais1: 'Portais da Fábrica e da Constelação',
  portais2: 'Portais da Expedição e da Ascensão',
  pesquisas: 'Pesquisas da Fábrica',
  padroes: 'Padrões da Constelação',
  carga: '60% da Carga (em vez de 25%)',
  ascensao: 'Caminhos da Ascensão',
};

export function CollapseView({ onClose }: { onClose(): void }) {
  const [tab, setTab] = useState<Tab>('colapso');
  const [anomaly, setAnomaly] = useState<AnomalyId | null>(null);
  const meta = useGameStore((st) => st.meta);
  const collapse = useGameStore((st) => st.collapse);
  const buyCosmos = useGameStore((st) => st.buyCosmos);
  const cosmos = meta.cosmos;
  const gain = collapseGain(cosmos.runEssence);
  const ready = canCollapse(meta);
  const hasHarmonia = meta.purchasedNodes.includes(COLLAPSE_REQUIRED_NODE);
  const kept = [...keeps(cosmos)].map((k) => KEEP_LABELS[k]).filter(Boolean);
  const unlocked = anomaliesUnlocked(cosmos);
  const available = COSMOLOGY.filter((n) => cosmosNodeStatus(cosmos, n) === 'available').length;

  const doCollapse = () => {
    const extra = anomaly ? ` O próximo ciclo começa na Anomalia ${ANOMALIES[anomaly].name}.` : '';
    if (!window.confirm(`Colapsar a rede por +${gain} Singularidades?${extra}`)) return;
    collapse(anomaly);
    setAnomaly(null);
    onClose();
  };

  return (
    <Modal
      title="Colapso"
      subtitle={
        <>
          Singularidades: <strong className={s.essence}>{cosmos.singularities}</strong> · ciclos completos:{' '}
          {cosmos.collapses}
        </>
      }
      onClose={onClose}
    >
      <Tabs<Tab>
        tabs={[
          { id: 'colapso', label: 'Colapso', badge: ready ? gain : undefined },
          { id: 'cosmologia', label: 'Cosmologia', badge: available },
          { id: 'anomalias', label: `Anomalias ${cosmos.anomaliesDone.length}/${ANOMALY_IDS.length}` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'colapso' && (
        <div className={s.stack}>
          <section className={s.panel}>
            <p className={s.muted}>
              O Colapso reinicia a Essência, a Árvore da Rede e os modos. Em troca você ganha Singularidades para
              gastar na Cosmologia, que fica para sempre, e cada Singularidade conquistada dá +10% de Essência
              (agora x{formatNumber(singularityMultiplier(cosmos))}). Conquistas, relíquias, classes, melhorias da
              Expedição e 25% da Carga sempre sobrevivem.
            </p>
            <div className={s.statGrid}>
              <div className={s.stat}>
                <span className={s.muted}>Essência deste ciclo</span>
                <span className={s.bigNumber}>{formatNumber(cosmos.runEssence)}</span>
              </div>
              <div className={s.stat}>
                <span className={s.muted}>Singularidades agora</span>
                <span className={`${s.bigNumber} ${s.accent}`}>+{gain}</span>
              </div>
            </div>
            <p className={s.muted}>
              O ganho cresce com os dígitos da Essência do ciclo: ~5 em 100M, ~10 em 1B, ~16 em 10B, ~29 em 1T.
            </p>
            {!hasHarmonia && (
              <p className={s.warning}>Compre “{NODES_BY_ID.get(COLLAPSE_REQUIRED_NODE)?.name}” na Árvore para liberar o Colapso.</p>
            )}
            {kept.length > 0 && <p className={s.good}>A Cosmologia também guarda: {kept.join(', ')}.</p>}
          </section>

          {unlocked && (
            <section className={s.panel}>
              <h3 className={s.sectionTitle}>Próximo ciclo</h3>
              <div className={c.anomalyChoices}>
                <label className={c.choice}>
                  <input type="radio" checked={anomaly === null} onChange={() => setAnomaly(null)} />
                  Ciclo normal
                </label>
                {ANOMALY_IDS.filter((id) => !cosmos.anomaliesDone.includes(id)).map((id) => (
                  <label key={id} className={c.choice}>
                    <input type="radio" checked={anomaly === id} onChange={() => setAnomaly(id)} />
                    Anomalia: {ANOMALIES[id].name}
                  </label>
                ))}
              </div>
            </section>
          )}

          <button className={s.primary} disabled={!ready} onClick={doCollapse}>
            Colapsar (+{gain} Singularidades)
          </button>
        </div>
      )}

      {tab === 'cosmologia' && (
        <div className={c.cosmology}>
          {COSMOLOGY.map((node) => {
            const status = cosmosNodeStatus(cosmos, node);
            return (
              <button
                key={node.id}
                className={`${c.node} ${c[status]}`}
                style={{ gridColumn: node.position.col + 1, gridRow: node.position.row + 1 }}
                disabled={status !== 'available'}
                onClick={() => buyCosmos(node.id)}
              >
                <span className={s.value}>{node.name}</span>
                <span className={s.muted}>{node.description}</span>
                <span className={c.cost}>{status === 'owned' ? 'Adquirido' : `${node.cost} Singularidade${node.cost > 1 ? 's' : ''}`}</span>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'anomalias' && (
        <div className={s.stack}>
          <p className={s.muted}>
            {unlocked
              ? 'Escolha uma Anomalia na aba Colapso para começar o próximo ciclo sob a regra dela. Vença comprando o Portal da Expedição durante esse ciclo.'
              : 'Compre “Fissuras” na Cosmologia para liberar as Anomalias.'}
          </p>
          {ANOMALY_IDS.map((id) => {
            const a = ANOMALIES[id];
            const done = cosmos.anomaliesDone.includes(id);
            const active = cosmos.anomaly === id;
            return (
              <section key={id} className={`${s.panel} ${done ? c.done : ''}`}>
                <div className={s.row}>
                  <span className={s.value}>{a.name}</span>
                  <span className={done ? s.good : active ? s.warning : s.muted}>
                    {done ? 'Vencida' : active ? 'Em andamento' : 'Pendente'}
                  </span>
                </div>
                <p className={s.muted}>Regra: {a.rule}</p>
                <p className={s.muted}>Recompensa: {a.reward}</p>
              </section>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
