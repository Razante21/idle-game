import type { ReactNode } from 'react';
import styles from './Modal.module.css';

interface Props {
  title: string;
  subtitle?: ReactNode;
  onClose(): void;
  children: ReactNode;
}

export function Modal({ title, subtitle, onClose, children }: Props) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <button onClick={onClose}>Fechar</button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
