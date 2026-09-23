# Nexus Idle

Idle game de navegador com vários modos de jogo ligados por uma progressão central.

Cada modo tem uma mecânica própria e gera **Essência**, a moeda compartilhada. A Essência é gasta na
**Árvore da Rede**, que fortalece os modos e abre portais para modos novos. Todos os modos
desbloqueados continuam produzindo em paralelo, então os antigos continuam importantes depois que
um novo abre.

| Modo | Mecânica | Ligações com os outros modos |
| --- | --- | --- |
| Núcleo | Clique, 12 geradores, 92 melhorias, Surtos (orbe x7) e o prestígio Sobrecarga | A energia acelera a Fábrica |
| Fábrica | Operários em duas cadeias (Minério → Máquinas e Petróleo → Circuitos → Robôs), pesquisa, contratos com prazo e armazéns limitados | Máquinas fortalecem o Núcleo e a Expedição; Robôs, todos os modos |
| Constelação | Grid de 11 tipos de estrela com sinergia por vizinhança, fusão de níveis e 8 padrões secretos | Faróis fortalecem Núcleo, Fábrica ou Expedição |
| Expedição | Runs roguelike com 3 classes, 5 biomas, chefes nomeados, loja e maldições opcionais | 14 relíquias fortalecem os modos; o recorde fortalece a Constelação |
| Ascensão | Segunda árvore movida a Éter, com 8 níveis de caminhos exclusivos | O Éter vem de todos os modos; os caminhos mudam as regras dos outros |

A Árvore principal tem 27 nós, e os mais fundos exigem que vários modos continuem produzindo ao mesmo
tempo. Há também 43 conquistas, cada uma com +2% de Essência para toda a rede.

## Rodando

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm test         # testes da lógica
npm run build    # typecheck + build de produção em dist/
```

O progresso é salvo no `localStorage` do navegador, com progresso offline de até 24h.

## Adicionando um modo

Cada modo implementa a interface `GameMode` (`src/core/types.ts`) e é registrado em
`src/core/modeRegistry.ts`. O core cuida do loop de tick, do save, dos multiplicadores da árvore e
da barra de modos.
