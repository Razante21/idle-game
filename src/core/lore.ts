import type { SimState } from './engine/simulate';
import { COSMOLOGY } from './cosmos/data';
import type { BaseClickerState } from '../modes/baseClicker/logic';
import type { VazioState } from '../modes/vazio/logic';

export interface LoreEntry {
  id: string;
  title: string;
  text: string;
  check(s: SimState): boolean;
}

const unlocked = (s: SimState, id: string) => s.meta.purchasedNodes.includes(id);

/**
 * Fragmentos de um diário deixado por quem construiu a Rede — o "Arquiteto". Cada entrada se revela
 * sozinha quando o marco correspondente é alcançado; não há como pular ou reordenar.
 */
export const LORE: LoreEntry[] = [
  {
    id: 'l01',
    title: 'Primeiro registro',
    text: 'Se você está lendo isto, o Núcleo acordou. Eu não sei quanto tempo passou desde que o deixei aqui. Comece devagar: cada clique importa mais do que parece.',
    check: (s) => (s.modes.baseClicker as BaseClickerState).clicks >= 1,
  },
  {
    id: 'l02',
    title: 'A Árvore',
    text: 'A Essência não é combustível, é memória. A Árvore da Rede a transforma em capacidade permanente. Nada do que você compra ali se perde — nem quando tudo o mais some.',
    check: (s) => s.meta.purchasedNodes.length >= 1,
  },
  {
    id: 'l03',
    title: 'A Fábrica desperta',
    text: 'Projetei a Fábrica para nunca dormir: mesmo sem ninguém olhando, os operários continuam. É o primeiro sinal de que a Rede pensa em paralelo, não em série.',
    check: (s) => unlocked(s, 'unlock_productionChain'),
  },
  {
    id: 'l04',
    title: 'O céu que se lembra',
    text: 'A Constelação não é decoração. Cada padrão que você descobre nela é permanente — desfaça o desenho e o bônus continua. Algumas coisas, uma vez vistas, não se pode mais desver.',
    check: (s) => unlocked(s, 'unlock_grid'),
  },
  {
    id: 'l05',
    title: 'Expedições',
    text: 'Mandei sondas antes de mandar pessoas. Nenhuma voltou inteira, mas todas trouxeram algo. É assim que a Expedição funciona: você nunca volta do jeito que foi, e é exatamente isso que a torna útil.',
    check: (s) => unlocked(s, 'unlock_roguelike'),
  },
  {
    id: 'l06',
    title: 'A segunda árvore',
    text: 'A Ascensão é a única parte da Rede que eu não terminei de entender antes de partir. O Éter escolhe caminhos, não pontos — e cada caminho fecha os outros. Escolha como quem sabe que vai viver com a escolha.',
    check: (s) => unlocked(s, 'unlock_parallelTree'),
  },
  {
    id: 'l07',
    title: 'O Jardim',
    text: 'Plantei duas sementes lado a lado, sem saber o que cresceria entre elas. O Jardim aprendeu sozinho a fazer isso melhor do que eu. Vizinhança é o segredo — sempre foi.',
    check: (s) => unlocked(s, 'unlock_garden'),
  },
  {
    id: 'l08',
    title: 'A Colônia',
    text: 'Toda cidade que já construí morreu de fome antes de aprender a comer. A Colônia é diferente: ela pede comida ao Jardim antes de precisar. Pedir antes de precisar — é a única lição de administração que valeu a pena.',
    check: (s) => unlocked(s, 'unlock_colony'),
  },
  {
    id: 'l09',
    title: 'Harmonia',
    text: 'Seis modos, um só fluxo. Se você chegou até aqui mantendo todos vivos ao mesmo tempo, já entendeu o que eu levei uma vida para aprender: nada nesta Rede foi feito para ser abandonado.',
    check: (s) => unlocked(s, 'harmonia'),
  },
  {
    id: 'l10',
    title: 'O Colapso',
    text: 'Eu temia este momento mais do que qualquer outro. Colapsar não é perder — é comprimir tudo o que você construiu numa Singularidade e recomeçar mais forte. Fiz isso muitas vezes. Nunca ficou mais fácil, mas sempre ficou mais rápido.',
    check: (s) => s.meta.cosmos.collapses >= 1,
  },
  {
    id: 'l11',
    title: 'Cosmologia',
    text: 'A Cosmologia é a única parte da Rede que sobrevive a todos os Colapsos. É onde eu guardei o que não podia me dar ao luxo de esquecer.',
    check: (s) => s.meta.cosmos.nodes.length >= 5,
  },
  {
    id: 'l12',
    title: 'Anomalias',
    text: 'Toda regra que a Rede segue, eu quebrei pelo menos uma vez de propósito, só para ver o que sobraria. Chamei essas quebras de Anomalias. Vencer uma delas é entender a regra melhor do que quem a escreveu.',
    check: (s) => s.meta.cosmos.anomaliesDone.length >= 1,
  },
  {
    id: 'l13',
    title: 'Além do Colapso',
    text: 'Existe uma camada que só aparece depois do primeiro Colapso. Eu a chamei de Vazio, sem muita originalidade. É o único lugar da Rede que não reinicia nunca — nem quando tudo o resto reinicia.',
    check: (s) => s.meta.cosmos.collapses >= 1,
  },
  {
    id: 'l14',
    title: 'Fendas',
    text: 'As fendas do Vazio não são falhas — são o preço de ter chegado longe demais rápido demais. Selar uma não a remove da história; só impede que ela continue drenando o presente.',
    check: (s) => (s.modes.vazio as VazioState).sealed >= 1,
  },
  {
    id: 'l15',
    title: 'Núcleo de Sombra',
    text: 'No fim, descobri que a melhor defesa contra o Vazio não era fechar as fendas mais rápido, mas construir algo forte o bastante para que elas importassem cada vez menos. Chamei isso de Núcleo de Sombra. Não é otimismo. É engenharia.',
    check: (s) => (s.modes.vazio as VazioState).upgrades.nucleoDeSombra >= 1,
  },
  {
    id: 'l16',
    title: 'Teoria de Tudo',
    text: 'Se você comprou cada nó da Cosmologia, já sabe mais sobre esta Rede do que eu sabia quando a liguei pela primeira vez. Não há mais nada que eu possa te ensinar a partir daqui. O resto é seu.',
    check: (s) => s.meta.cosmos.nodes.length >= COSMOLOGY.length,
  },
];

/** Todas as entradas cujo marco já foi alcançado (mesmo que a pessoa nunca tenha aberto o diário). */
export function unlockedLore(state: SimState): LoreEntry[] {
  return LORE.filter((entry) => entry.check(state));
}
