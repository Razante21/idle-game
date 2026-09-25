import { LORE } from '../core/lore';
import { useGameStore } from '../core/store/gameStore';
import s from '../modes/shared.module.css';
import { Modal } from './Modal';
import styles from './LoreView.module.css';

export function LoreView({ onClose }: { onClose(): void }) {
  const meta = useGameStore((st) => st.meta);
  const modes = useGameStore((st) => st.modes);
  const found = new Set(LORE.filter((entry) => entry.check({ meta, modes })).map((e) => e.id));

  return (
    <Modal
      title={`Diário do Arquiteto ${found.size}/${LORE.length}`}
      subtitle="Fragmentos deixados por quem construiu a Rede, revelados por marcos da sua jornada."
      onClose={onClose}
    >
      <div className={s.stack}>
        {LORE.map((entry, i) => {
          const unlocked = found.has(entry.id);
          return (
            <section key={entry.id} className={`${styles.entry} ${unlocked ? '' : styles.locked}`}>
              <div className={styles.number}>Registro {i + 1}</div>
              <h3 className={styles.title}>{unlocked ? entry.title : '???'}</h3>
              <p className={styles.text}>{unlocked ? entry.text : 'Ainda não revelado.'}</p>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
