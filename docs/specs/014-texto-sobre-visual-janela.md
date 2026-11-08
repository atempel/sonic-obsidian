# 014 — Texto sobre o visual, Modo limpo e controles da janela

**Fase:** 2 · **Status:** Feito (validado no Windows em 2026-11-08) · **Issue:** [#34](https://github.com/atempel/sonic-obsidian/issues/34) · **Depende de:** [008](008-nucleo-comandos-persistencia.md), [009](009-palco-faixa-assinatura.md); os controles visuais das preferências entram na [011](011-ajustes-configuracoes.md)

## Problema
Tudo o que aparece por cima do visual (a assinatura com o nome do preset em cada troca, os toasts) aparece sempre. Quem quer só o visual, tocando ao vivo ou deixando rodar, não tem como limpar a tela. A janela sem moldura também não tem como minimizar nem fechar com o mouse: só `Ctrl+W`/`Alt+F4`.

## Proposta
Como no protótipo v3 `1794165177-f126`, seguindo o mesmo padrão da 013: esta spec faz o **comportamento** (estado, regras e tecla), e a 011 desenha os controles nos Ajustes rápidos e nas Configurações.
- **Texto sobre o visual:** três preferências salvas (Nome do preset, Título da faixa, Avisos) e o **Modo limpo** (`T`), que esconde tudo de uma vez sem mudar as preferências.
- **Controles da janela:** minimizar e fechar no canto superior direito, que aparecem só quando o ponteiro chega ao canto.

## Escopo
**P0 — Texto sobre o visual**
- **Estado (Core):** `settings.overlayText = { presetName: 'always' | 'manual' | 'never', trackTitle: boolean, toasts: 'all' | 'important' | 'none', clean: boolean }`. Padrões: `always`, `true`, `all`, `false`. Valor inválido volta ao padrão (`sanitizeSettings`). Comando `overlayText.set` (parcial).
- **Nome do preset** (a assinatura da 009): *Sempre* mostra em toda troca; *Só quando eu troco* mostra nas trocas manuais e não na rotação/coleção (`origin === 'rotation'`); *Nunca* não mostra. A faixa de controle continua mostrando nome e autor.
- **Título da faixa:** só o estado por enquanto. Não há fonte com título até a Fase 3 (arquivo, SoundCloud).
- **Avisos:** `showToast` ganha `{ important?: boolean }`. *Todos* mostra tudo; *Só importantes* mostra só os importantes; *Nenhum* não mostra nenhum. Importantes = falhas e ações da IA (Fase 4). Os toasts de resposta a tecla (ganho, rotação, transição, favoritos) **não** são importantes e somem (decisão do usuário). Painéis de estado (sem som, captura recusada, erro de WebGL 2) não são avisos e nunca somem.
- **Modo limpo — `T`:** liga e desliga `clean`. Ligado, esconde a assinatura e os avisos não importantes, ignorando as preferências, que continuam salvas. A confirmação "Modo limpo ligado" / "Modo limpo desligado" aparece sempre, uma vez (forçada). Enquanto estiver ligado, a faixa mostra o ícone `eye-off` ao lado do nome do preset ("Modo limpo ligado (T)"). O estado é salvo e volta ligado ao reabrir.

**P0 — Controles da janela**
- Dois botões de ícone (36 px) no canto superior direito, a 16 px do topo e da direita: `minus` "Minimizar" e `x` "Fechar (Ctrl+W)", sobre uma superfície `overlay` com `line-2` e `r-3`. Hover: fundo `bg-04`, ícone `text-1`, sem vermelho. Ícones Lucide copiados para `ui/icons.tsx` (como na 009).
- **Quando aparecem:** quando o ponteiro entra na zona de ~160×96 px do canto, ou quando um botão recebe foco pelo teclado. Entram com fade `t-fast` e somem ~220 ms depois que o ponteiro sai. Não aparecem com a Biblioteca, a busca, os Ajustes ou um diálogo abertos. Valem em janela e em tela cheia.
- **Fechar** fecha o app na hora, sem confirmação (tudo já salva sozinho), pelo mesmo caminho do `Ctrl+W`. **Minimizar** usa um IPC novo e estreito, `window.so.window.minimize()` → `win.minimize()`.
- **Fato técnico (Windows):** a região `-webkit-app-region: drag` engole o `mousemove`. A faixa de arrasto de 40 px (`#drag`, spec 009) passa a terminar antes da zona do canto (`right: 166px`), para a zona conseguir detectar o ponteiro, e os botões ficam `no-drag`.

**P1**
- `T` na tabela de Atalhos e os controles visuais das preferências (Ajustes rápidos, Configurações › Visual): entram na 011.

## Fora de escopo
Modo performance e Rack (cada um com os próprios controles; Fase 5). Título da faixa aplicado (Fase 3). Avisos da IA (Fase 4).

## Critérios de aceite (verificar no Windows)
1. `T` esconde a assinatura em cada troca e os toasts de tecla. A faixa mostra o `eye-off` e aparece "Modo limpo ligado". `T` de novo volta ao normal com "Modo limpo desligado".
2. Com o Modo limpo ligado, fechar e reabrir o app mantém o Modo limpo.
3. Com `presetName: 'manual'` no `settings.json`, `→` mostra a assinatura e a troca da rotação não mostra.
4. Com `presetName: 'never'`, nenhuma troca mostra a assinatura, mas a faixa continua com nome e autor.
5. Com `toasts: 'important'` ou `'none'`, `+`/`B`/`R` não mostram toast. O cartão "sem som" e o de captura recusada continuam aparecendo.
6. Em modo janela, levar o ponteiro ao canto superior direito mostra minimizar e fechar. Eles somem ao sair do canto e não aparecem com a Biblioteca ou a busca abertas.
7. Minimizar minimiza. Fechar fecha na hora, e ao reabrir os ajustes estão salvos.
8. Em tela cheia os controles aparecem no mesmo canto. Em janela, arrastar pela faixa do topo continua funcionando fora do canto, e o encaixe do Windows (Aero Snap) segue igual.
9. `Tab` chega aos dois botões e eles aparecem com foco visível.

## Perguntas em aberto
- Nenhuma: as duas da sessão de 2026-11-08 já foram respondidas (spec separada da 011; toasts de tecla não são importantes).

## Referências
- Protótipo v3 `1794165177-f126` ([SYNC.md](../design/v3/SYNC.md)): `docs/v3-modelo-de-navegacao.md` (seções "Texto sobre o visual" e "Controles da janela"); `Sonic Obsidian Palco integrado.html` (`.winctl`, `#cleanIco`, grupo `ot*` dos Ajustes, `setClean`); `Sonic Obsidian Configurações.html` (Visual › Texto sobre o visual; Atalhos: "Modo limpo — T").
- DIVERGENCIAS: "Controles da janela · arrasto" (o design diz "arrastar pelo visual"; o código arrasta pela faixa do topo desde a 009).
- [queue/2026-11-08-design-f126-texto-e-janela.md](../../queue/2026-11-08-design-f126-texto-e-janela.md)
