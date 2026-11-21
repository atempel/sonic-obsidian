# 037 — Ajustes rápidos: rolagem volta ao topo, ícones nas seções, configurações no cabeçalho

**Fase:** 2 (interface) · **Status:** pronta · **Issue:** [#109](https://github.com/atempel/sonic-obsidian/issues/109) · **Milestone:** v0.12.0 · **Personas:** Nostálgico do Winamp (abre o painel com a música tocando e quer achar a seção de olho), DJ de Festa (abre e fecha o painel várias vezes numa noite)

## Problema
Três arestas nos Ajustes rápidos (`src/renderer/src/ui/QuickSettings.tsx`), decididas pelo usuário na sessão de design de 10/11/2026:
- o painel guarda a rolagem: quem rolou até "Texto sobre o visual" e fecha, reabre no meio da lista, sem o Sinal à vista;
- as cinco seções só têm o título em texto; o olho não acha a seção numa passada;
- "Todas as configurações" fica no fim do painel, depois de rolar tudo.

## Proposta
Seguir o protótipo (Palco integrado, `#sheet`):
1. **Rolagem:** ao fechar, a lista (`.sheet .body`) volta ao topo **depois** da animação de saída (180 ms; o reset em 200 ms, sem salto visível). Ao abrir, também começa no topo (caso o painel reabra antes do reset). A Biblioteca não muda: guarda a posição da lista.
2. **Ícones das seções:** um ícone de 16 px em `text-2` antes de cada título, com 8 px de espaço, `aria-hidden`: Sinal `audio-lines`, Expressividade `activity`, Rotação `repeat`, Transições `blend`, Texto sobre o visual `type`. Os que faltam em `src/renderer/src/ui/icons.tsx` (`activity`, `blend`, `type`) entram com os caminhos do Lucide (ISC, como os outros).
3. **Cabeçalho:** botão de ícone `settings` entre o Feedback e o fechar (ordem do protótipo: Feedback · Todas as configurações · Fechar). `aria-label` "Todas as configurações", `title` "Todas as configurações (Ctrl+,)"; o clique abre as Configurações (o mesmo `ui.open` de hoje). A seção do fim com o link sai.

Textos novos só em `i18n/en.ts` + `pt-BR.ts` (spec 030): o `title` com o atalho; o `aria-label` reusa `quick.allSettings`.

## Escopo
**P0** — os três itens acima; teste headless `037-ajustes-cabecalho`.

## Fora de escopo
- Barra de Perfil no topo do painel (#110) e a curva por frequência (#112), que o protótipo já mostra.
- Onde o foco cai ao abrir (hoje o painel; no protótipo, o fechar): fica como está.
- Rolagem da Biblioteca, Configurações ou outros painéis.

## Critérios de aceite
1. **Headless — rolagem:** abrir os Ajustes rápidos, rolar a lista até o fim, fechar (`Esc`) e, depois da saída, o `scrollTop` da lista é 0; reabrir mostra o Sinal no topo. Reabrir **antes** dos 200 ms também começa no topo.
2. **Headless — Biblioteca:** rolar a lista da Biblioteca, fechar e reabrir: a posição continua a mesma.
3. **Headless — ícones:** cada um dos cinco `h3` tem um `svg` de 16 px antes do texto, com `aria-hidden="true"`, na cor `text-2`, e o ícone certo (pelo nome do ícone no atributo de teste).
4. **Headless — cabeçalho:** o cabeçalho tem três botões na ordem Feedback, Todas as configurações, Fechar; clicar no do meio abre as Configurações; não há mais `.sheet-link` no painel; `title` e `aria-label` nos dois idiomas.
5. `npm run test:ui` passa (o `030-idiomas` sem chave sobrando e sem texto cortado; o `031-feedback` com o botão de Feedback no mesmo lugar).
6. **Windows (testar no bloco):** com música, `,` abre os Ajustes; rolar até o fim, `Esc`, `,` de novo: abre no Sinal, sem salto visível durante a saída. Os ícones das seções aparecem nítidos; o botão de engrenagem no topo abre as Configurações.

## Perguntas em aberto
Nenhuma: tudo vem do protótipo e da decisão do usuário de 10/11/2026.

## Referências
- Protótipo: `docs/design/v3/prototype/Sonic Obsidian Palco integrado.html` (`#sheet`, `setSheet`), espelho na versão `1794603894-598c`. O artefato está em `1794680346-fb12` (sync pendente na #124), mas `v3-modelo-de-navegacao.md` é idêntico nas duas (sha `443dc34b6c51`).
- `docs/design/v3/docs/v3-modelo-de-navegacao.md` › "Ajustes rápidos: cabeçalho e rolagem (10/11/2026)".
- Spec 011 (Ajustes rápidos), spec 031 (botão de Feedback no cabeçalho), spec 030 (idiomas).
