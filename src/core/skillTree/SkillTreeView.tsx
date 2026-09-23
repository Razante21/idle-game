import { formatNumber } from '../format';
import { getMode } from '../modeRegistry';
import { useGameStore } from '../store/gameStore';
import { getNodeStatus, isRequirementMet } from './logic';
import { NODES_BY_ID, SKILL_TREE, type SkillNode } from './treeData';
import styles from './SkillTreeView.module.css';

const COL_UNIT = 100;
const ROW_UNIT = 164;
const NODE_W = 180;
const NODE_H = 132;

const maxCol = Math.max(...SKILL_TREE.map((n) => n.position.col));
const maxRow = Math.max(...SKILL_TREE.map((n) => n.position.row));
const WIDTH = maxCol * COL_UNIT + NODE_W;
const HEIGHT = maxRow * ROW_UNIT + NODE_H;

function origin(node: SkillNode) {
  return { x: node.position.col * COL_UNIT, y: node.position.row * ROW_UNIT };
}

interface Props {
  onClose(): void;
}

export function SkillTreeView({ onClose }: Props) {
  const meta = useGameStore((s) => s.meta);
  const rates = useGameStore((s) => s.essenceRates);
  const buyNode = useGameStore((s) => s.buyNode);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Árvore de habilidades">
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Árvore da Rede</h2>
            <p className={styles.subtitle}>
              Essência: <strong>{formatNumber(meta.essence)}</strong> — gaste para fortalecer os modos e abrir novos portais
            </p>
          </div>
          <button onClick={onClose}>Fechar</button>
        </header>

        <div className={styles.scroller}>
          <div className={styles.canvas} style={{ width: WIDTH, height: HEIGHT }}>
            <svg className={styles.edges} width={WIDTH} height={HEIGHT} aria-hidden>
              {SKILL_TREE.flatMap((node) =>
                node.parents.map((parentId) => {
                  const parent = NODES_BY_ID.get(parentId);
                  if (!parent) return null;
                  const from = origin(parent);
                  const to = origin(node);
                  const x1 = from.x + NODE_W / 2;
                  const y1 = from.y + NODE_H;
                  const x2 = to.x + NODE_W / 2;
                  const y2 = to.y;
                  const midY = (y1 + y2) / 2;
                  const active = meta.purchasedNodes.includes(parentId);
                  return (
                    <path
                      key={`${parentId}-${node.id}`}
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      className={active ? styles.edgeActive : styles.edge}
                    />
                  );
                }),
              )}
            </svg>

            {SKILL_TREE.map((node) => {
              const status = getNodeStatus(node, meta, rates);
              const { x, y } = origin(node);
              const isPortal = node.effects.some((e) => e.type === 'unlockMode');
              return (
                <button
                  key={node.id}
                  className={`${styles.node} ${styles[status]} ${isPortal ? styles.portal : ''}`}
                  style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
                  onClick={() => buyNode(node.id)}
                  disabled={status !== 'available'}
                >
                  <span className={styles.nodeName}>{node.name}</span>
                  {status === 'locked' ? (
                    <span className={styles.nodeDetail}>
                      Requer: {node.parents.map((p) => NODES_BY_ID.get(p)?.name).join(' + ')}
                    </span>
                  ) : (
                    <span className={styles.nodeDetail}>{node.description}</span>
                  )}
                  {status !== 'purchased' && node.requirements && (
                    <span className={styles.reqs}>
                      {node.requirements.map((req) => {
                        const mode = getMode(req.modeId);
                        return (
                          <span
                            key={req.modeId}
                            className={isRequirementMet(req, rates) ? styles.reqMet : styles.reqUnmet}
                            title={`${mode.name} precisa gerar ${formatNumber(req.ratePerSecond)} Essência/s (agora ${formatNumber(rates[req.modeId])})`}
                          >
                            {mode.icon} ≥{formatNumber(req.ratePerSecond)}/s
                          </span>
                        );
                      })}
                    </span>
                  )}
                  <span className={styles.nodeCost}>
                    {status === 'purchased' ? 'Adquirido' : `${formatNumber(node.cost)} Essência`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
