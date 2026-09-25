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
| Jardim | Cultivo num canteiro: cruze duas plantas vizinhas para mutar espécies novas, incluindo sementes raras que só brotam com profundidade da Expedição | Exporta Comida; o Pólen fortalece o Núcleo e a Expedição |
| Colônia | Uma cidade que vive do que os outros modos exportam — Comida do Jardim, Materiais da Fábrica, Luz da Constelação — e produz Influência e leis | A mão de obra fortalece a Fábrica; os jardineiros, o Jardim |
| O Vazio | Só abre depois do primeiro Colapso: fendas de entropia se abrem sozinhas e drenam a produção de todos os modos até serem seladas por Matéria Escura | Melhorias permanentes fortalecem a produção e a Essência de todos os modos, mesmo depois do próximo Colapso |

A Árvore principal tem 37 nós, e os mais fundos exigem que vários modos continuem produzindo ao mesmo
tempo. Há também 67 conquistas, cada uma com +2% de Essência para toda a rede.

### Exportações entre modos

Além dos multiplicadores de `provides`, alguns modos **exportam bens** (Comida, Materiais, Luz,
Profundidade) que outros **importam** de verdade: a Constelação ilumina o Jardim e a Colônia (sem
luz, prédios elétricos não funcionam), o Jardim alimenta a Colônia, a Fábrica fornece materiais de
construção, e a profundidade da Expedição libera sementes raras no Jardim. Isso é lido em
`ctx.imports` (`src/core/engine/contexts.ts`) e soma o que todo modo desbloqueado exporta, exceto
durante a Anomalia Isolamento, que corta as trocas.

### Colapso e Cosmologia

Depois de comprar "Harmonia" na Árvore, o **Colapso** reinicia a Essência, a Árvore e os modos em
troca de **Singularidades**, gastas numa segunda árvore permanente (a **Cosmologia**) que sobrevive
para sempre. Cada Singularidade conquistada também dá +10% de Essência para sempre. A Cosmologia
pode manter portais, pesquisas e padrões entre ciclos, dar Essência inicial, aumentar o teto de
progresso offline, liberar **Anomalias** (ciclos com uma regra extra difícil e uma recompensa
permanente ao vencer) e liberar o **Evento Semanal**: a cada 7 dias (semana ISO), um modo diferente
ganha um bônus temporário — sempre o mesmo modo durante toda a semana, e a rotação é a mesma para
todo mundo.

### O Vazio

O primeiro Colapso libera **O Vazio**, a única camada da Rede que nunca reseta — nem no próximo
Colapso. Fendas se abrem sozinhas e drenam a produção de todos os modos; selá-las (gastando Foco,
gerado passivamente) rende **Matéria Escura**, gasta em 5 melhorias permanentes. Uma fenda ignorada
por tempo demais endurece (fica mais cara de selar), mas o endurecimento tem um teto — sem ele o
custo cresceria exponencialmente enquanto o Foco só cresce de forma linear, e a fenda nunca mais
poderia ser selada.

### Diário do Arquiteto e tutorial

Um diário (`📖` no topo, quando a primeira entrada é revelada) mostra fragmentos de lore
desbloqueados por marcos da jornada — do primeiro clique ao fim da Cosmologia. Um tutorial rápido
(`?` no topo) explica o loop principal e aparece sozinho na primeira visita.

## Rodando

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm test         # testes da lógica
npm run build    # typecheck + build de produção em dist/
npm run balance  # robô que joga sozinho e mede o ritmo (BALANCE_HOURS=72 para simular mais tempo)
```

### Ritmo de referência

O robô de balanceamento (`src/balance/bot.ts`) joga de forma bem ativa, então um jogador comum vai
um pouco mais devagar. Metas atuais medidas por ele: portal da Fábrica em ~15 min, Constelação em
~45 min, Expedição em ~4h, Ascensão em ~10h, Jardim em ~23h, Colônia em ~50h, e o primeiro Colapso
(nó "Harmonia") por volta de 87h.

O progresso é salvo no `localStorage` do navegador, com progresso offline de até 24h (48h com o nó
"Sono Profundo" da Cosmologia). O jogo também é um PWA instalável: funciona offline depois da
primeira visita, graças a um service worker simples (`public/sw.js`).

## Adicionando um modo

Cada modo implementa a interface `GameMode` (`src/core/types.ts`) e é registrado em
`src/core/modeRegistry.ts`. O core cuida do loop de tick, do save, dos multiplicadores da árvore e
da barra de modos.
