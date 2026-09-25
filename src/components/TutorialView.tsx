import { useState } from 'react';
import s from '../modes/shared.module.css';
import { Modal } from './Modal';
import styles from './TutorialView.module.css';

const STEPS = [
  {
    title: 'Bem-vindo à Rede',
    text: 'Nexus Idle tem vários modos de jogo, cada um com uma mecânica própria. Todos geram Essência, a moeda compartilhada — e todos continuam produzindo em segundo plano, mesmo quando você não está olhando para eles.',
  },
  {
    title: 'A Árvore da Rede',
    text: 'Gaste Essência na Árvore (botão "Árvore" no topo) para fortalecer os modos e abrir Portais para modos novos. Nada ali se perde: mesmo os modos antigos continuam importantes depois que um novo abre.',
  },
  {
    title: 'Modos ligados, não fundidos',
    text: 'A barra debaixo mostra cada modo desbloqueado. Eles não se misturam, mas se alimentam: a Constelação ilumina o Jardim, a Fábrica manda materiais para a Colônia, e por aí vai. Fique de olho na seção "Ligações ativas" de cada modo.',
  },
  {
    title: 'O Colapso',
    text: 'Bem mais à frente, você vai poder Colapsar a Rede: reinicia o ciclo em troca de Singularidades, gastas numa segunda árvore (Cosmologia) que nunca reseta. É assim que a progressão continua depois que tudo parece ter chegado ao topo.',
  },
];

export function TutorialView({ onClose }: { onClose(): void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <Modal title="Como jogar" onClose={onClose}>
      <div className={styles.step}>
        <h3>{current.title}</h3>
        <p className={s.muted}>{current.text}</p>
      </div>
      <div className={styles.dots}>
        {STEPS.map((_, i) => (
          <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} />
        ))}
      </div>
      <div className={styles.nav}>
        <button disabled={step === 0} onClick={() => setStep((s2) => s2 - 1)}>
          Voltar
        </button>
        {last ? <button className={s.primary} onClick={onClose}>Entendi</button> : <button onClick={() => setStep((s2) => s2 + 1)}>Próximo</button>}
      </div>
    </Modal>
  );
}
