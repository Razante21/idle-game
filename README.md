# Nexus Idle

Idle game de navegador com vários modos de jogo ligados por uma progressão central.

Cada modo tem uma mecânica própria e gera **Essência**, a moeda compartilhada. A Essência é gasta na
**Árvore da Rede**, que fortalece os modos e abre portais para modos novos. Todos os modos
desbloqueados continuam produzindo em paralelo, então os antigos continuam importantes depois que
um novo abre.

| Modo | Mecânica | Status |
| --- | --- | --- |
| Núcleo | Clique e geradores | Jogável |
| Fábrica | Cadeias de produção | Planejado |
| Constelação | Grid com sinergia por posição | Planejado |
| Expedição | Runs curtas estilo roguelike | Planejado |
| Ascensão | Segunda árvore com moeda própria | Planejado |

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
