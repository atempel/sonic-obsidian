# 031 — Feedback e bugs pelo GitHub

**Fase:** Abertura · **Status:** Pronta (rodada 2026-11-18) · **Issue:** [#95](https://github.com/atempel/sonic-obsidian/issues/95) · **Milestone:** v0.9.0 · **Personas:** todas (quem usa o app público precisa de um caminho para relatar problema); Nostálgico do Winamp (não quer configurar nada: o formulário já vem preenchido)

## Problema
O app é público, sem conta e sem servidor. Hoje, quem acha um bug precisa descobrir sozinho o repositório, abrir o formulário vazio e procurar versão, GPU e log. Ideia e pergunta caem nas issues junto com bug. O mantenedor recebe relatos sem versão nem sistema e precisa perguntar de volta.

## Proposta
Três portas no app, cada uma com um destino no GitHub (design `v3-feedback.md`, aprovado em 10/11):

| No app | Abre |
|---|---|
| **Relatar um problema** | `issues/new?template=bug_report.yml&version=…&system=…&audio=…&preset=…` (depois do painel de confirmação) |
| **Sugerir uma ideia** | `discussions/new?category=ideas` |
| **Fazer uma pergunta** | `discussions/new?category=q-a` |

Mais **Copiar diagnóstico** (últimas 200 linhas do log na área de transferência), porque o log não vai na URL. Nada é enviado pelo app: ele só abre o navegador. Continua sem servidor e sem telemetria.

## Escopo
**P0 — no app**
- **Ajustes rápidos:** botão de ícone `message-square` no cabeçalho, ao lado do fechar (e de "Todas as configurações", quando a #109 levar esse botão para lá), `title`/`aria-label` "Feedback e bugs", `aria-haspopup="menu"`. Abre um menu pequeno (224 px) com Relatar um problema (`bug`), Sugerir uma ideia (`lightbulb`), Fazer uma pergunta (`circle-help`), divisor e Copiar diagnóstico (`clipboard-copy`). Teclado: setas, `Enter`, `Esc` fecha e devolve o foco ao botão.
- **Painel "Relatar um problema"** (diálogo modal, 440 px, foco em "Abrir no GitHub"): "Vamos abrir o formulário do GitHub já preenchido com:" e a lista Versão · Windows · GPU · Saída de áudio · Preset atual, cada linha com switch (desligado = valor riscado e fora da URL). Abaixo: "O log não vai junto. Use “Copiar diagnóstico” e cole no formulário." e "Você vai precisar de uma conta no GitHub para enviar." Botões Cancelar / Abrir no GitHub. `Esc` = Cancelar.
- **Valores:**
  - Versão: `app.getVersion()` com `v` (ex.: `v0.9.0`);
  - Windows: `Windows 11` se o build de `os.release()` for ≥ 22000, senão `Windows 10`, com o build (ex.: `Windows 11 (build 22631)`), novo IPC `system:osInfo` no main;
  - GPU: a string de `UNMASKED_RENDERER_WEBGL`, já lida no Diagnóstico (spec 012); vazia → linha "Não identificada" e switch desligado;
  - Saída de áudio: o nome da saída padrão, como no passo 1 da checagem de captura (`enumerateDevices`, sem o prefixo "Padrão - ");
  - Preset atual: o nome completo (com autor), como na faixa.
- **Copiar diagnóstico:** novo IPC `log:tail` no main (caminho fixo do `logPath()`, sem parâmetro de caminho): últimas 200 linhas, com a pasta do usuário trocada por `~`. Copia pelo `system:copyText` (sobe o limite para caber 200 linhas, ex.: 64 KB). No menu, o ícone vira `check` por 1,5 s; toast "Diagnóstico copiado: últimas 200 linhas do log." Sem log → toast de falha.
- **Ao abrir o navegador** (`system:openLink`, que já só aceita `https`): toast "Abrimos o GitHub no navegador."
- **Configurações › Sobre:** grupo **Feedback** com cinco linhas (botões `sm`): Relatar um problema (abre o mesmo painel), Sugerir uma ideia, Fazer uma pergunta, Copiar diagnóstico ("Copiado" por 1,5 s), Abrir a pasta do log (`log:show`). Palavras de busca das Configurações como no protótipo.
- **Busca rápida:** comandos Relatar um problema, Sugerir uma ideia, Fazer uma pergunta e Copiar diagnóstico (sem atalho), na lista de comandos de `shortcuts.ts`.
- Textos em `en.ts` + `pt-BR.ts` (spec 030); log em inglês (`feedback: opened bug form`, sem os valores).

**P0 — no repositório**
- `.github/ISSUE_TEMPLATE/config.yml`: `blank_issues_enabled: false`; links de contato para Ideas e Q&A (Discussions), além do de segurança.
- `bug_report.yml`: ids `version`, `system`, `preset` mantidos; `system` passa a ser "Windows version and GPU"; campo novo `audio` (audio output) e o `log` vira "Diagnostics" (descrição: "Copy diagnostics" no app, ou `Ctrl+Shift+L`). Em inglês, com uma linha dizendo que respostas em português são bem-vindas.
- `feature_request.yml`: descrição aponta primeiro para Discussions › Ideas.
- Rótulos (REST): `idea`, `preset`, `needs-info`, `windows-only`, `good first issue` (os que faltarem; `bug` já existe).
- Seção **Feedback** no README (EN e pt-BR) e na landing (EN e PT), com as três portas.

## Fora de escopo
Formulário dentro do app, envio anônimo, telemetria, coleta automática de erros, anexar o log na URL. Criar ou conferir categorias de Discussions pela API (só existem no GraphQL; o usuário já ligou o Discussions em 13/11 com as categorias padrão).

## Critérios de aceite
Na nuvem (teste headless novo `031-feedback`, com `window.so` simulado):
1. O botão `message-square` dos Ajustes rápidos abre o menu com as quatro ações; `Esc` fecha e devolve o foco.
2. "Relatar um problema" (menu, Sobre e busca) abre o painel com os cinco itens preenchidos; desligar um switch risca o item e o tira da URL aberta (conferida no `openLink` simulado, com os valores codificados).
3. "Sugerir uma ideia" e "Fazer uma pergunta" abrem `discussions/new?category=ideas` e `…=q-a`, com o toast.
4. "Copiar diagnóstico" copia o texto do `log:tail` simulado, com o ícone `check` e o toast; com falha, toast de erro.
5. O grupo Feedback aparece em Configurações › Sobre e é achado pela busca das Configurações ("bug", "log").
6. `030-idiomas` sem chave faltando nem texto cortado nos dois idiomas.

No Windows (bloco v0.9.0):
7. No painel, Windows, GPU e saída de áudio mostram os valores reais da máquina.
8. "Abrir no GitHub" abre o navegador no formulário *Bug report* com Versão, Sistema, Saída de áudio e Preset já preenchidos.
9. Ideia e pergunta abrem a categoria certa do Discussions (a página de nova discussão, logado).
10. O texto colado de "Copiar diagnóstico" tem as últimas linhas do log, sem o caminho da pasta do usuário.
11. No GitHub, "New issue" não oferece issue em branco; os links de Ideas e Q&A aparecem.

## Perguntas em aberto
Nenhuma que precise do usuário. Decididas pela rodada (`agent-decided`, DECISIONS 2026-11-18):
- O "Relatar um problema" de Configurações › Sobre abre **o mesmo painel** (o protótipo de Configurações abre o formulário direto, sem preencher; o doc pede o painel antes do navegador e "já preenchido").
- Windows pelo build de `os.release()` (≥ 22000 = 11); GPU pela string do WebGL (o `getGPUInfo('basic')` só dá ids).
- O diagnóstico copiado troca a pasta do usuário por `~` (o doc diz que o log "pode ter caminhos pessoais"; o texto vai para uma issue pública).

## Referências
- Design: `docs/design/v3/docs/v3-feedback.md` (espelho `1794603894-598c`; igual na versão `1794680346-fb12` do artefato, conferido em 18/11) e as páginas **Palco integrado** (`#fbBtn`, `#fbMenu`, `#fbDialog`, comandos da busca) e **Configurações** (Sobre › Feedback).
- [012 — Setup e diagnóstico](012-setup-diagnostico-desempenho.md) (`UNMASKED_RENDERER_WEBGL`, `system:copyText`), [030 — Idiomas](030-idiomas.md), `src/main/log.ts` (`logPath`).
- GitHub: [preencher formulário de issue pela URL](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query) (parâmetros = `id` dos campos).
