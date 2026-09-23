# Nexus Idle

Idle game de navegador com vários modos de jogo ligados por uma progressão central.

Cada modo tem uma mecânica própria e gera **Essência**, a moeda compartilhada. A Essência é gasta na
**Árvore da Rede**, que fortalece os modos e abre portais para modos novos. Todos os modos
desbloqueados continuam produzindo em paralelo, então os antigos continuam importantes depois que
um novo abre.

| Modo | Mecânica | Ligações com os outros modos |
| --- | --- | --- |
| Núcleo | Clique e geradores que dobram a cada 25 | A energia acelera a Fábrica |
| Fábrica | Operários numa cadeia Minério → Lingotes → Engrenagens → Máquinas | Máquinas fortalecem o Núcleo e a Expedição |
| Constelação | Grid de estrelas com sinergia por vizinhança | Faróis fortalecem Núcleo, Fábrica ou Expedição |
| Expedição | Runs roguelike com escolhas de sala e chefes | Relíquias fortalecem cada modo; o recorde fortalece a Constelação |
| Ascensão | Segunda árvore movida a Éter, com caminhos exclusivos | O Éter vem de todos os modos; os caminhos mudam as regras dos outros |

A Árvore principal também exige que modos antigos continuem produzindo para liberar os nós mais fundos.

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
