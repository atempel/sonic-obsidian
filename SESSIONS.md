# Sessões — Sonic Obsidian

Log append-only de quem mexeu no workspace, em que ferramenta, e em que estado deixou. Uma entrada por sessão (a skill `encerrar-sessao` adiciona). É handoff, não histórico de produto: o *porquê* fica em DECISIONS.md.

## Entradas

### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `fix/85-testes-instaveis`
**Fez:** Passo 4 da `rodada`: issue #85 (`bug`, `prioridade`) reivindicada. Seguindo o comentário do usuário, rodou a suíte de novo no `main` por disparo manual (run 43461067400): verde. Mas a falha do 023 (`page.click` 30 s, "canvas intercepts pointer events") se reproduziu aqui na nuvem: a faixa some (2,5 s sem mouse) e o clique do Playwright não move o mouse, então nunca acorda. No harness: `H.click` (leva o mouse ao elemento, tempo próprio, tenta de novo) e `H.poll` (sonda até ficar verdadeiro). Aplicados no 023, 024 (botão da faixa), 021 (preset desenha: sonda até 8 s em vez de 1 quadro) e 026 (4a mede contra a linha de base do próprio run e repete uma vez; 6b/6d/10 esperam o estado em vez de tempo fixo).
**Deixou em:** PR aberto com `Closes #85`. 023 passou 3/3 aqui depois do ajuste; 021 ok. O 026 ainda falha às vezes **nesta nuvem** pelo limite de 1 s por quadro do próprio app ("passou de 1 s num quadro" com código válido, máquina lenta com SwiftShader) — é do ambiente, passa no CI; não mexi no app. "Esc fecha" (010) não se reproduziu; sem mudança. Nada atribuído ao usuário.

### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/028-reacao-ao-audio-p0`
**Fez:** Passo 4 da `rodada`: issue #81 (spec 028, `prioridade`) reivindicada e implementada no **P0**. `expression.ts`: semente da Memória só com som (média de `imm` em 2 s, depois do aquecimento), Longa semeia de novo depois do silêncio/Respiro, silêncio = zero com rampa (0,3 s / 1 s), saída sempre 0–4. Ajustes rápidos: "· padrão", "Sem efeito no nível 0", "Restaurar padrão"; toasts com "(padrão)". HUD com `imm`, médias, RMS/pico em dBFS e ganho; log na abertura e a cada 5 min. Teste `028-expressividade` (42 casos; o código antigo falha 14, incluindo a trava da Fixa em 1,00). P1 (Normalizar áudio, Memória Viva) virou a issue #86 (`ready`, v0.6.0). DECISIONS com a escolha da semente (`agent-decided`). Design checado: artefato em `1794352628-1d72`, sem desenho para o padrão visível (entrada já aberta em DIVERGENCIAS).
**Deixou em:** PR aberto com `Closes #81`. Não verificado: áudio real, fps e o visual (vão para o bloco v0.6.0). Nesta nuvem, 023 e 026 falham por tempo também no `main` (ambiente; o 026 é a #85). Fila `ready` do v0.6.0: #85, #86, #69. Nada novo atribuído ao usuário.

### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/atualizacao-automatica`
**Fez:** Passo 2 da `rodada`: PR #70 (spec 029, atualização automática) estava em conflito com o `main` e com o `typecheck` vermelho (base antiga, antes do CI sob demanda). Trouxe o `main` para a branch por merge (sem reescrever histórico), mantendo as duas entradas do DECISIONS. Decidiu a pergunta pequena da 029 (versão: milestone v0.6.0, `agent-decided`). Issue #69 → `ready`, milestone v0.6.0.
**Deixou em:** PR #70 mergeado se o CI ficou verde. Na fila `ready` do v0.6.0: #85 (teste 026 instável, `prioridade`), #81 (spec 028, `prioridade`), #69 (029). Nada novo atribuído ao usuário. Não verificado: nada de código mudou.

### 2026-11-11 a 13 — Claude Code (nuvem, claude.ai/code) — branch `claude/ecstatic-carson-9x3kh6`
**Fez:**
- **Design checado:** o artefato está em `1794352628-1d72`, o espelho em `1794281099-42d3`. Não sincronizado nesta sessão: a frente não tem tela desenhada, só o AGC precisa de interface no P1.
- **Frente escolhida pelo usuário:** ganho automático + reação ao áudio. O usuário trouxe uma pesquisa própria (Cowork), copiada em `docs/research/reatividade/`.
- **Achado conferido no código** (`expression.ts` e o bundle do motor): a Memória Longa/Fixa semeia a média uma vez, com `imm/val`. Aberta em silêncio, a Fixa trava `bass` em 1,00. Com `level: 0`, o Caráter não age.
- **Spec 028** (corrigir a Memória, HUD/log, AGC, Memória "Viva" A/B), issue #81, TASKS e DECISIONS.
- **Fila:** stub com o resto da pesquisa (curva de 16 bandas, build/break/drop, hardcut, fork etc.).
**Deixou em:**
- **PR #82 mergeado** (só docs) com o ok do usuário em 2026-11-13. Issue #81 aberta para a implementação. Nenhum código mudou nesta sessão.
- Resumo da pesquisa no Claude Docs (https://claude.ai/artifact/T8VRDyCmsZyqWRQeSBdDUm) lido: é o mesmo estudo já copiado; os itens do MilkDrop 3 ficaram listados na fila.
- **Respostas do usuário registradas na 028:** silêncio = zero, Normalizar áudio desligado, Memória salva, padrão visível na interface. HUD do build atual: Nervo + Fixa + Nível 0, `bass` antes = depois, 0,5–1,9 (trava em 1,00 não reproduzida).
- **Nível padrão:** 0 com aviso (do usuário, 2026-11-13). Docs mergeados no PR #82; a issue #81 segue aberta para a implementação.
- **Antes do build novo:** o usuário confere no HUD (`Ctrl+Shift+D`) a Memória salva e `bass x → y` (critério 1).
- **Próximo:** sincronizar o design (`1d72`, o padrão visível é interface) e implementar a 028 P0 (`executar-task`).
- **Não verificado:** nada rodou no app; a causa só se confirma no Windows.
- **A refazer:** checagem de `electron`/`vite` depois de 19/11.

### 2026-11-11 — Claude Code (nuvem, claude.ai/code) — branch `claude/vibrant-pascal-rqir88` (continuação)
**Fez:**
- **PR #80 mergeado** com o ok do usuário, validado no Windows: dois presets ficavam pretos ("Hyperspace - kaleidoscope", "Snapshot Of Space (LSB mix)").
  - O log de diagnóstico do próprio PR mostrou a causa: a onda principal em pontos do Butterchurn 3 não define `gl_PointSize`, e o ANGLE/Direct3D não desenha.
  - Correção em `fixPointSize`.
  - Ficaram no app os registros "preset preto" e de shader que não compila (este pula o preset).
  - A rotação passa a ficar parada desde o `E` do Estúdio.
- **Stubs em `queue/`, de relatos e pedidos do usuário:**
  - ganho automático;
  - reação ao áudio;
  - controle de velocidade (`time`).
**Deixou em:**
- `main` com o #80. Nada aberto.
- **Próximo:** Estúdio P1 (spec 027), beat na batida principal, ganho automático/reação ao áudio ou o controle de velocidade. O usuário escolhe.
- **Retorno do usuário:** Expressividade e Memória ficaram evidentes; o Caráter (X) ainda é pouco perceptível.

### 2026-11-10 (noite) — Claude Code (nuvem, claude.ai/code) — branch `claude/vibrant-pascal-rqir88`
**Fez:**
- **Design checado:** `1794281099-42d3`, sem mudança.
- **Respostas da 026 coletadas** (camada em tela cheia; nome perguntado no 1º salvar + campo em Configurações; `bas_att` na 027; laço testado num Worker). Spec atualizada.
- **Estúdio P0 (spec 026, #74), no PR #79:**
  - editor das três equações com compilação ao vivo, erro com bloco e linha, e a última versão válida tocando;
  - Worker com `eel-wasm` e teto de 1 s;
  - salvar em `presets/mine/<id>/`, com crédito "baseado em";
  - filtro "Meus" e "Remover meu preset" na Biblioteca;
  - rotação parada.
- **Teste headless** `026-estudio.test.cjs`: 48/48; a suíte passa 7/7. O mock comum ganhou `listMine/saveMine/removeMine`.
**Deixou em:**
- **PR #79 mergeado** com o ok do usuário, depois de 2 rodadas de teste no Windows. Na 1ª, o laço infinito não congelou. Vieram dois relatos: a seleção de texto na interface (agora só campos, shaders e erros) e o efeito que travou. Para o travamento, o Worker passou a recusar valores NaN/infinito. Na 2ª: "funcionou".
- **Novo pedido:** o beat às vezes trava em outro instrumento, e não na batida principal. Stub em `queue/2026-11-10-beat-batida-principal.md` e item no TASKS.
- **Próximo:** Estúdio P1 (spec 027, #75), revisar a spec e trazer as perguntas; ou planejar o beat na batida principal.
- **Não medido à parte:** fps e GPU numa sessão longa com o Estúdio aberto (critério 9). O usuário validou o uso geral.
- **A refazer:** checagem de `electron`/`vite` depois de 19/11.

### 2026-11-10 (tarde) — Claude Code (nuvem, claude.ai/code) — branch `claude/sleepy-darwin-8zm6g6` (continuação)
**Fez:**
- **PR #76 mergeado**, com o ok do usuário para o Playwright no CI: suíte headless (025 P0) e specs do Estúdio 026/027.
- **024, revisões 2 e 3 (PR #77, mergeado).** Partiram do teste do usuário e de dois logs:
  - o simulador de batida (`tests/sim/beat-sim.cjs`) reproduziu os erros;
  - detecção refeita;
  - andamento travado, que só muda com outro BPM confirmado e só solta em silêncio;
  - "Adiantar o visual" (70 ms);
  - troca automática de no máximo 1 batida;
  - `Enter` só com `:focus-visible`;
  - **Respiro (`Shift+Enter`)**, pedido do usuário;
  - compassos 1/2/4/8/16, com padrão 4.
- **Validada no Windows pelo usuário:** "o beat ficou estável".
**Deixou em:**
- `main` com a 024 completa. Nada aberto deste branch.
- **Próximo:** Estúdio P0 (spec 026, #74). Falta o usuário responder às perguntas em aberto da spec.
- **Não verificado:** hip-hop com swing e breakbeat no simulador (erram o andamento); tap tempo (P1) se a trava pegar BPM errado.
- **Uma vez no log:** queda do processo "Video Capture" do Chromium ao reabrir o app (17:16), sem efeito na captura. Só observar.
- **A refazer:** checagem de `electron`/`vite` depois de 19/11.

### 2026-11-10 (madrugada) — Claude Code (nuvem, claude.ai/code) — branch `claude/sleepy-darwin-8zm6g6`
**Fez:**
- **Design:** o protótipo mudou de `0fd0` para `42d3`, e o espelho foi sincronizado no PR #72 (só docs, **mergeado**). Entram a página Modos, EQ de 16 bandas e respostas às divergências. Stub em `queue/2026-11-10-design-42d3-modos-feedback-eq.md`. A 024 não muda.
- **Spec 024, troca no beat + segurar:** PR #71, **mergeado** (squash `1d5f34f`), com CI verde. Artifact `sonic-obsidian-win-565d351`.
  - A detecção lê os graves pelo relógio do áudio (DECISIONS 2026-11-10). A versão por quadro errava o BPM com fps baixo.
  - O teste headless passou 32/32.
- **Spec 025, suíte de testes no CI** (issue #73), no PR #76, **aberto e aguardando ok**:
  - harness comum e `npm run test:ui`, com 5 arquivos, todos passando;
  - job no Ubuntu com `playwright@1.63.0`, instalado com `--no-save`.
- **Specs 026 e 027, Estúdio** (issues #74 e #75), planejadas no PR #76. As perguntas em aberto estão nas specs.
**Deixou em:**
- **PR #76:** não mergear sem o ok do usuário para o Playwright no CI e sem as respostas do Estúdio.
- **Teste no Windows da 024** (roteiro no PR #71): ainda não feito. Falta também o log de ~30 min.
- **Não verificado no Windows:** 024 (áudio, fps, estabilidade, BPM com música real). Os limiares em `BEAT` podem precisar de ajuste.
- **Ações do design 42d3 ainda no repo:**
  - texto do vazio de coleções na busca;
  - ponto violeta e toast da 023;
  - `[`/`]` na spec do vídeo.
- **Notion:** linha da tabela atualizada (Última ação, Próximo passo, Atualizado em).
- **A refazer:** a checagem de `electron`/`vite` depois de 19/11.

### 2026-11-10 — Claude Code (nuvem, claude.ai/code) — branch `claude/stoic-faraday-31wbf8` (+ `claude/clever-faraday-72vlrd`, do PR #65)
**Fez:**
- Design checado: `1794178325-0fd0`, sem mudança.
- **Spec 023, teste headless refeito: 30/30** (critérios 1–5; o mock de `window.so` agora inclui `presets`). O teste achou um bug real: o painel de coleções nascia dentro da `.strip` (`overflow: hidden`) e ficava cortado e invisível, com o clique caindo no canvas.
  - Correção: portal para a `.strip-wrap` com `position: fixed`, e a faixa não some com o painel aberto.
  - O foco depois de "Nova coleção" também se perdia; corrigido.
  - Commit `9841b32`, enviado também ao branch do PR #65 a pedido do usuário. O script ficou em `tests/headless/023-colecoes.cjs`, semente da suíte de testes.
- **PR #65 (022 + 023) saiu do rascunho.** CI verde; artifact `sonic-obsidian-win-fa433b2`, com o roteiro de teste de 021/022/023 enviado ao usuário.
- **Fonte arquivo de áudio adiada** (decisão do usuário): volta com a história "performance sincronizada" ([queue](queue/2026-11-10-performance-sincronizada.md)). PRD e TASKS atualizados.
- **Pesquisa de mercado no repo:** `docs/research/mercado/` (pesquisa, personas, SYQEL), cópia exata do Claude Docs. `planejar-feature` passa a ler as personas, e a spec cita a persona.
- **Com a pesquisa, a prioridade mudou:** a troca no beat + segurar vem antes do Estúdio. **Spec 024** planejada, issue #67: compassos 4/8/16/32, `Enter` segura, trocas manuais esperam a batida (M23), detecção própria.
**Deixou em:**
- ~~PR #65 aguardando teste~~ (ver atualização abaixo). Roteiro: 021 (motor 3), 022 (importar `.milk`, incluindo um `.milk` com JS) e 023 (coleções), mais o `sonic-obsidian.log` depois de ~30 min com rotação.
- **O branch da sessão está à frente do PR #65** com só docs, a spec 024 e o teste: `8a1584a`, `0e87547`, `046850e` e o encerramento. Depois do merge do #65, abrir um PR deste branch, ou alinhar com `merge -s ours` se o main já tiver tudo.
- **Atualização (02:20 UTC):**
  - O usuário testou 021/022/023 no Windows e aprovou: tudo normal, sem mudança de performance.
  - Log de ~30 min: GPU entre 144 e 160 MB, abertura quente em 1,35 s, sem erros. O `.milk` com JS foi recusado na conversão.
  - Corrigido o anel de foco na aba "Todos" ao abrir a Biblioteca com `L` (relato do usuário): agora o foco vai para a gaveta.
  - **PR #65 mergeado** (squash `d166c59`). Este branch foi alinhado ao main, e o PR dele leva docs, a spec 024 e `tests/headless/`.
  - Não testada pelo usuário: a importação de um `.milk` com nome novo (o arquivo baixado já estava na biblioteca e foi pulado, como esperado).
- **Próximo:** implementar a 024 numa sessão nova (o contexto desta acabou); o Estúdio vem depois (specs a criar).
- **Não verificado no Windows:** 021, 022 e 023, incluindo áudio, fps e estabilidade.
- **A refazer:** checagem de `electron`/`vite` depois de 19/11.

### 2026-11-09/10 — Claude Code (nuvem, claude.ai/code) — branch `claude/clever-faraday-72vlrd` (continuação)
**Fez:**
- Log da v0.5.0 analisado: a abertura lenta é a 1ª execução de cada `.exe` novo, e o app abre em ~1,1 s; memória da GPU estável em ~40 min. Corrigido o falso "preset pesado" ao voltar de janela oculta (#61).
- **Spike 006 aprovado** (validado no Windows):
  - no 2.6.7, um preset malicioso executou JS; no 3.x, nada executa;
  - 472/472 presets, mesmo fps;
  - `.milk`: 8/10 fixtures e 463/504 fontes, com os contornos do `hlslparser-js` em `src/main/hlsl-fix.ts`.
- **Spec 021, migração para o Butterchurn 3:** mergeada no #62 com o ok do usuário, ainda **sem teste do usuário no Windows**.
- **Spec 022, importar `.milk`:** PR #65 aberto, headless 8/8.
- **Spec 023, coleções pelo Palco** (pedido do usuário): spec, issue #66 e código no mesmo branch, entrando no PR #65.
**Deixou em:**
- **PR #65** (022 + 023) aberto e **não mergear ainda**. O teste headless da 023 parou no meio: o mock antigo não tinha `window.so.presets`; depois de corrigido, a 1ª verificação passou e o resto não chegou a rodar. O script está em `/tmp/.../scratchpad/t/col.cjs` (some com o container), e o roteiro está na spec 023.
- **Falta o teste do usuário no Windows** de 021, 022 e 023.
- **Landing ainda no Butterchurn 2.6.7** (aliases só de dev).
- **Suíte de testes de performance:** na fila.
- **Checagem de electron/vite:** depois de 19/11.

### 2026-11-09 — Claude Code (nuvem, claude.ai/code) — branch `claude/clever-faraday-72vlrd`
**Fez:**
- Design checado: `0fd0`, sem mudança.
- **Spec 020, Painel de atalhos `?` e busca com comandos** (issue #51, PR #53, mergeado com o ok do usuário). Planejada com três perguntas respondidas: F continua tela cheia, Diagnóstico entra sem F12, comandos só na aba Todos. Teste headless com 23 verificações. A spec nasceu como 019 e foi renumerada, porque outra sessão usou a 019 para a landing (#54/#55).
- **Passagem de manutenção (PR #56, mergeado):**
  - linha `abertura (ms desde o processo): …` no log, com cada etapa;
  - CI com `push` só no `main`;
  - `electron`/`vite` mantidos até 14 dias e `minimatch` aceito;
  - segurança da janela conferida;
  - **bug das Configurações** relatado pelo usuário, corrigido: o `.panel` global do `setup.css` (spec 012) deslocava as seções para fora da área de conteúdo.
**Deixou em:** `main` com #53 e #56; o branch da sessão está alinhado com `merge -s ours`. Com a 020, a Fase 2 (Interface v3) fica completa.
- **Pendente (precisa do usuário no Windows):**
  - o `sonic-obsidian.log` com as linhas `abertura` de 2 ou 3 aberturas do build `7f8a59f` ou mais novo, para achar a etapa lenta e corrigi-la;
  - uma sessão de horas para a memória da GPU.
  O log antigo (até 02:55 de 09/11) só tinha o `app ready` e sessões de até ~15 min, com GPU entre 147 e 183 MB, sem crescer.
- **A refazer:** checagem de `electron@45.2.3`/`vite@8.3.6` depois de 19/11.
- **Não verificado no Windows:** o usuário aprovou o merge do #53 e do #56 sem testar os builds. O painel 020 (critérios 1–9, incluindo `?` no ABNT2 e o fps), a correção das Configurações e a linha `abertura` no log foram verificados só no headless. A sessão longa também não foi feita.
- **Release v0.5.0 (spec 016):** pipeline de release (PRs #58 e #59). Como a nuvem não envia tags, o `release.yml` foi disparado manualmente com `version=0.5.0`. O rascunho foi publicado pelo usuário às 03:56 UTC, e o README ganhou os links de download. Versão calculada pelo roadmap (DECISIONS). Não verificado daqui: o download via `releases/latest/download` (o proxy da nuvem responde 401) e os critérios 2–5 da 016 no Windows.
- **Log da v0.5.0 (sessão longa do usuário):** a abertura lenta é a primeira execução de um `.exe` novo (8,3 s antes do `main.js`); a segunda abertura chegou ao primeiro quadro em 1,09 s. A memória da GPU ficou estável (158–200 MB em ~40 min). Corrigido o falso "preset pesado" ao voltar de janela oculta (PR desta sessão).
- **Pedido do usuário:** depois das tarefas abertas, criar uma suíte de testes automatizados de performance que não dependa da máquina dele: [queue/2026-11-09-suite-testes-performance.md](queue/2026-11-09-suite-testes-performance.md).

### 2026-11-09 — Claude Code (nuvem, claude.ai/code) — branch `docs/landing-refino`
**Fez:** Spec 019 e issue #52 (refino de movimento da landing). Implementou no `site/` o movimento da v3 (M02 troca de título, M03 linha de rotação, M04 pressão, M05 aleatório, M06 AUTO, M08 balística do medidor, M10 sublinhado da navegação, M12 Biblioteca em degrau, entrada das seções ao rolar, fade nas Perguntas, teclado no console) com o movimento reduzido do doc, e a demo com as duas músicas do Uppbeat, criptografadas em `site-media/` e decifradas pelo `site:vendor` com `SITE_AUDIO_KEY`. Verificado no Chromium headless: as animações só usam transform/opacity, com movimento reduzido sobram só fades, a música toca, o crédito aparece, a batida acende a marca, sem erros e sem domínio externo novo.
**Deixou em:** PR `docs/landing-refino` → `main`. O usuário criou o segredo `SITE_AUDIO_KEY` e mandou o código de licença de 'Space Dancers'; PR #54 mergeado e publicado; o usuário validou no Windows e a issue #52 foi fechada.

### 2026-11-08/09 — Claude Code (nuvem, claude.ai/code) — branch `claude/dazzling-rubin-orl47m`
**Fez:** Design sincronizado duas vezes: `7509` (as 23 microinterações aprovadas) e `0fd0` (Painel de atalhos `?` e busca com comandos, que foram para a queue). Escolha das microinterações registrada em DECISIONS (M18 continua com 10 s). Specs entregues e validadas pelo usuário no Windows, todas mergeadas em squash com o ok dele:
- **011, em dois PRs:** Ajustes rápidos com M04, M13–M16 e M19 (#39); Configurações com M10 e o ícone do app, com o `.exe` editado (#44).
- **018:** microinterações da faixa e da gaveta (planejada nesta sessão, issue #45, PR #46).
- **012:** boas-vindas, diagnósticos de captura e WebGL 2, aviso de silêncio e desempenho por preset (#47), com `test-flags.json` para simular falhas.
Teste headless (Playwright) em todos os PRs. Três conflitos só no `DECISIONS.md` (PRs do README, da licença e da landing, feitos por outros agentes) foram resolvidos com merge.
**Deixou em:** `main` com 011, 012 e 018; o branch da sessão está alinhado com `merge -s ours`. A Fase 2 só não tem o **Painel de atalhos** (`queue/2026-11-08-painel-atalhos.md`, falta a spec).
- **Pendente em TASKS › Manutenção:** a passagem de performance, segurança e otimização pedida pelo usuário. Inclui a abertura lenta há algumas builds: o renderer abre igual nos builds do PR 1 e do #44, então falta medir o main e o carregamento no Windows. Também: a sessão longa para a memória da GPU, `electron`/`vite` recentes, `minimatch` e o CI duplicado.
- **Não verificado:** a cópia do diagnóstico em outra máquina e o comportamento de "Pular presets lentos" numa máquina fraca de verdade.
- **Mudança de comportamento:** o ganho dos Ajustes volta ao Ganho padrão a cada abertura.

### 2026-11-09 — Claude Code (nuvem, claude.ai/code) — branch `claude/trusting-gates-peo7zy`
**Fez:** Spec 017 (P0): landing em `site/` (EN + `/pt/`), portada do canvas `1794165992-cb8e`; `site/assets/stage.js` (Butterchurn + faixa sintetizada + espelhos + medidor + reduced-motion), `site.css` com fontes locais, favicon/marca, `og.png`; `scripts/site-vendor.mjs` (`npm run site:vendor`); `.github/workflows/pages.yml` (artifact `sonic-obsidian-site-<sha>` em PR, deploy em `main`); `build-windows.yml` ignora `site/**` e `docs/**`. Verificado no Chromium headless (SwiftShader): presets carregam, demo/próximo funcionam, só `api.github.com` sai do site, sem rolagem horizontal a 390 px, links EN↔PT, portão de reduced-motion.
**Deixou em:** PR #48 mergeado; workflow `pages` publicou em https://atempel.github.io/sonic-obsidian/ (deploy ok no Actions; a nuvem não alcança `github.io`, então a página no ar não foi aberta daqui). Não verificado: som da demo e fps (precisa navegador real com áudio — testar o artifact ou a página no ar no Windows); download (não há release publicada até a spec 016). P1 (404, notas da versão) pendente. Próximo da abertura: spec 016 (releases), que destrava os downloads da landing.

### 2026-11-08 — Claude (chat, projeto "Audio Visualizer") — branch `docs/abertura-landing-releases`
**Fez:** Planejou a abertura com `planejar-feature`. Specs **016** (releases por tag → rascunho com instalador, zip e checksums; nomes sem versão para `releases/latest/download/`; checklist MIT do dia) e **017** (landing no GitHub Pages, EN + PT-BR, portada do canvas do Claude Design; sem CDN; workflow com guarda para repo privado). Issues #40 e #41 (label novo `abertura`). DECISIONS: GitHub Pages escolhido, Cloudflare descartado com o porquê. TASKS ganhou a seção *Abertura*; PRD ganhou nota aditiva em "Fora de escopo". Fora do repo, nesta mesma conversa: o canvas da landing (EN e PT-BR, responsivo, aviso de fotossensibilidade) e o Design System "Sonic Obsidian", links nas specs.
**Deixou em:** PR #42 → `main`, só docs; depois, espelho do canvas em `docs/design/landing/` e a estrutura de `site/` na 017. Ao mergear, resolveu conflito com o #43 (repo já público e MIT) e atualizou 016/017/TASKS para isso. Nada a verificar no app. Notion não atualizado nesta sessão.

### 2026-11-08 — Claude (chat, projeto "Audio Visualizer") — branch `chore/licenca-mit-comunidade`
**Fez:** Revisão das configurações do repo. Licença trocada para MIT (decisão do usuário), arquivos de comunidade (CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, templates de issue e PR), imagem de prévia social, entrada em DECISIONS. Configurações do GitHub aprovadas pelo usuário; o proxy da nuvem bloqueia gravação de configurações pela API, então foram feitas pela interface do GitHub no navegador.
**Deixou em:** PR #43 mesclado e repo **público** (pedido do usuário). Relato privado de vulnerabilidade ligado depois de abrir. A spec 016 (PR #42, de outra sessão) ainda lista essas tarefas como "no dia": ao mesclar o #42, marcar os itens de licença e comunidade como feitos. 13 branches já mescladas por squash continuam no remoto (apagar pela interface; a sessão não pode deletar refs).

### 2026-11-08 — Claude (chat, projeto "Audio Visualizer") — branch `docs/readme-revitalizacao`
**Fez:** README reescrito para a abertura futura: inglês (`README.md`) + tradução completa (`README.pt-BR.md`), com lockup da marca, banner, prints reais da interface (Palco e Biblioteca, capturados em Chromium headless com SwiftShader), galeria de 6 presets com crédito, recursos entregues até a spec 015, atalhos tirados de `main.ts`, privacidade, arquitetura em Mermaid e roadmap. Novo: `docs/README.md` (índice da documentação), `docs/brand/` (SVGs e PNGs do *The Core*, regras), `docs/media/` (imagens com origem e créditos, e como refazer os prints). PROJECT.md aponta para as pastas novas; DECISIONS registra a escolha.
**Deixou em:** PR `docs/readme-revitalizacao` → `main`. Sem código. Nenhum arquivo movido. Os prints da interface vão envelhecer com as specs 011/012: refazer pelo passo em `docs/media/README.md`. Notion não atualizado nesta sessão.

### 2026-11-08 — Claude Code (nuvem) — branch `claude/clever-einstein-pak1q7`
**Fez:** `sincronizar-design` no modo checar: artefato em `1794165177-f126`, igual ao espelho. Implementou a spec 013 (Transições) com `executar-task`: tipo e tempo separados para a troca manual e a automática, o tipo forçado envolvendo `blendPattern.createBlendPattern` na instância, as teclas `B`/`Shift+B` e `↑`/`↓`, Shift na troca = corte seco e a migração do `settings.json`. Teste no Chromium headless (toasts, migração, screenshots no meio do blend). O usuário validou os 10 critérios no Windows (build `sonic-obsidian-win-31af7cf`) e o PR #33 foi mergeado (squash, com o ok dele), fechando a #31. Respostas do usuário: `+`/`−`/`0` ficam permanentes e a troca automática não tem tecla. Planejou o design f126: spec 014 (texto sobre o visual, Modo limpo `T`, controles da janela; issue #34) e a spec 011 revista, com os controles da 013 e da 014 e a tabela de atalhos. DIVERGENCIAS ganhou a entrada do arrasto. A queue do f126 foi marcada como Ingested. Depois, a pedido do usuário, fez o spike de **expressividade** (o ganho se adapta em ~4 s no motor). O usuário testou no Windows e aprovou os controles; virou a spec 015 (#36), com `+`/`−`/`0` = expressividade, `X` = Caráter, `Shift+X` = Memória e o ganho só nos Ajustes. O build do spike travou e fechou depois de muito tempo aberto (monitores piscaram). Achou um vazamento de programas WebGL no Butterchurn e corrigiu; acrescentou recarga na perda de contexto, log em arquivo (`Ctrl+Shift+L`) e limite padrão de 60 fps (DECISIONS).
**Deixou em:** PR #35 (branch `claude/clever-einstein-pak1q7`, alinhado ao `main` com `merge -s ours`), com as specs 014 e 015, a 011 revista e o código da 015 com os nomes finais. O usuário validou os critérios da 015 no Windows e o #35 foi mergeado (squash, com o ok dele), fechando a #36. **Não verificado:** sessão longa depois da correção do vazamento (pendente em TASKS › Manutenção, com o log). Depois: `sincronizar-design` (versão `1794171149-6542`, só acréscimos: microinterações M01–M23, Propostas, stub na queue) e a spec 014 (texto sobre o visual, Modo limpo `T`, minimizar e fechar no canto), validada no Windows. No teste, o usuário achou um bug de foco: depois de clicar na estrela, ela parecia marcada no preset seguinte (anel de foco) e o `Espaço` desfavoritava. Corrigido e validado. PR #37 mergeado (squash, com o ok dele), fechando a #34. Próximo: a 014 e depois a 011. Áudio e fps da 013 foram verificados pelo usuário; os da 015 ainda não.

### 2026-11-08 (continuação) — Claude Code (nuvem) — branch `claude/amazing-clarke-wbr2td`
**Fez:** Executou e o usuário validou no Windows as specs **008** (núcleo de comandos + persistência, PR #27), **009** (Palco: faixa de controle, assinatura, cartões de silêncio/captura negada, PR #28) e **010** (busca rápida + Biblioteca em gaveta, PR #30), todas mergeadas. Sincronizou o design para `1794165177-f126` (PR #29: texto sobre o visual, Modo limpo `T`, controles da janela → `queue/2026-11-08-design-f126-texto-e-janela.md`). Planejou a spec **013 — Transições** (issue #31) a pedido do usuário. Processo novo: checagem de segurança de dependências (`docs/dependencias.md`, regra em CONTEXT/AGENTS/`executar-task`). Dependências novas: `preact@11.0.2`, `@fontsource/space-grotesk@5.3.0`, `@fontsource/jetbrains-mono@5.3.0`; 13+ ícones Lucide copiados (ISC). Decisões do usuário registradas: `F` = tela cheia, arrasto só pela faixa de 40 px do topo, fontes embutidas, transições escolhíveis (tipo forçado em tempo de execução). Teste visual na nuvem com Chromium headless (Playwright) pegou 4 bugs antes do Windows.
**Deixou em:** `main` com 008–010 e a spec 013. Próximo: **executar a 013** (transições). Depois 011 (incorporando o design f126 e a decisão sobre as teclas de ganho) e 012. Pendentes: decidir `electron@45.2.3`/`vite@8.3.6` (menos de 14 dias na checagem retroativa) e os 6 *moderate* de `minimatch` (TASKS › Manutenção); 11 branches antigas no remoto (não apagadas, pedem ok); posicionamento "playground" no PRD (`queue/2026-11-08-playground-transicoes.md`). Push forçado é bloqueado pelo modo automático: esta sessão reaproveitou o branch com `git merge -s ours` do histórico antigo (sem mudar arquivos).

### 2026-11-08 — Claude Code (nuvem) — branch `claude/amazing-clarke-wbr2td`
**Fez:** Mergeou o PR #18 (squash, com o ok do usuário). `sincronizar-design` no modo checar: artefato na versão `1794154301-3f85`, igual ao SYNC.md. Criou as issues #19 (spike 006) e #20 (spike 007) com o label `fase-3`. Planejou a Fase 2 com `planejar-feature`, extraindo os estados do protótipo (Palco integrado, Configurações, Setup) com subagentes: specs 008 (núcleo + persistência), 009 (Palco: faixa + assinatura), 010 (busca + Biblioteca), 011 (Ajustes rápidos + Configurações) e 012 (setup, diagnóstico e fps por preset), com as issues #21–#25 (label `fase-2`). Decisão do usuário: overlay em Preact (DECISIONS). Três divergências novas em DIVERGENCIAS (ganho padrão em dB, limite de quadros, texto do aviso de silêncio). TASKS e PROJECT apontando para a Fase 2.
**Deixou em:** branch `claude/amazing-clarke-wbr2td` com PR para `main` (só docs, sem código). O Preact ainda não foi instalado: entra na execução da spec 008. Próximo: `executar-task` da 008. Nada de áudio/fps a verificar nesta sessão.

### 2026-11-08 — Claude Code (nuvem, claude.ai/code) — branches `feat/presets-navegacao`, `feat/rotacao-automatica`, `feat/janela`, `feat/sinal-entrada`
**Fez:** Fase 1 inteira, cada spec validada pelo usuário no Windows com o build do CI:
- 002 (395 presets, navegação, toast; corrigida a CSP que bloqueava texturas `data:` dos presets) — PR #12;
- 003 (rotação automática, atalhos v3, blend manual 0 s/automático 2,7 s em `config.ts`) — PR #13;
- 004 (janela sem moldura, `Ctrl+W`, cursor some em tela cheia, limite de fps opcional) — PR #15;
- 005 (ganho −12…+12 dB, silêncio que desacelera/escurece em 3 s e avisa em 10 s) — PR #17.
Também: spec 005 ajustada ao pedido do usuário (desacelerar e escurecer) no PR #10; PR #11 (planejamento v3) redirecionado para `main` e conflitos resolvidos; divergências com o protótipo registradas em `docs/design/v3/DIVERGENCIAS.md`.
**Deixou em:** `main` com a Fase 1 completa; nenhum PR aberto desta sessão. Pendências: specs da Fase 2; issues dos spikes 006/007; teclas provisórias de rotação/ganho saem com os Ajustes rápidos; CI duplicado em branch com PR. Não verificado ou não atendido: fone Bluetooth/USB (001), 1440p, economia de GPU com o limite de fps (004, critério 7 não atendido).

### 2026-11-08 — Claude Code (nuvem) — branch `claude/jolly-shannon-i4sq2a`
**Fez:** Revisou o PR #14 (`docs/design-sync`): o `main` não tinha andado, então não precisou de rebase; links relativos e arquivos citados em `docs/design/v3/README.md` conferidos; CI verde. Squash merge com o ok do usuário (`cbd7c81`). Testou `sincronizar-design` no modo "checar": a ferramenta de artefatos funciona nesta superfície e `project/compat.json` vem da versão `1794154301-3f85`, igual ao `SYNC.md`, então está sincronizado. TASKS: brief visual marcado como feito e a frente de vídeo/VJ apontando para a queue.
**Deixou em:** `main` com o espelho v3. Nenhuma feature implementada. Fase 1 continua com as specs 004 e 005. A branch `docs/design-sync` não foi apagada.

### 2026-11-08 — Claude (chat, sessão de design no projeto "Audio Visualizer") — branch `docs/design-sync`
**Fez:** Espelhou o protótipo v3 do Claude Design (versão `1794154301-3f85`) em `docs/design/v3/`: 12 páginas, tokens e scripts compartilhados, e os 4 docs (brief visual/craft, navegação, fontes/Butterchurn/Estúdio/MCP, vídeo/VJ). Criou `SYNC.md`, `README.md` (precedência e mapa página → fase) e `DIVERGENCIAS.md`; skill `sincronizar-design`; passos de design em `planejar-feature` e `executar-task`; seção "Design (protótipo)" no AGENTS.md; decisão em DECISIONS; queue do brief visual marcada como Ingested; stub novo `queue/2026-11-08-video-vj.md`.
**Deixou em:** PR `docs/design-sync` → `main`. Sem código. Notion não atualizado nesta sessão. Frente de vídeo/VJ ainda fora do PRD (ver o stub na queue).

### 2026-11-08 — Claude (chat, projeto "Audio Visualizer") — branch `plan/fontes-presets-mcp`
**Fez:** Registrou as decisões da sessão de design (Claude Design): interface v3 (Palco, Biblioteca, Rack, Configurações, setup), fontes de áudio (sistema, microfone, arquivo, SoundCloud), presets do usuário (`.milk` + Estúdio) e MCP sem IA embutida. Pesquisa com subagentes: SoundCloud (chaves só Artist Pro desde mai/2026, HLS AAC, CORS não documentado, termos), Butterchurn (3.0 beta compila equações em WASM — saída para presets externos seguros), MCP (SDK v2, Claude Desktop só stdio, `Origin` obrigatório). Escreveu `docs/architecture.md`, `docs/design/v3-modelo-de-navegacao.md`, specs 006 (Butterchurn 3 + `.milk`) e 007 (SoundCloud), PRD com roadmap revisto (Fases 2–5), TASKS, CONTEXT, DECISIONS. Ajustou os atalhos das specs 002/003 ao modelo v3 (`R` = rotação, dois tempos de blend).
**Deixou em:** PR `plan/fontes-presets-mcp` com base em `docs/fase-1-specs` (PR #10) — mergear o #10 antes. Sem código. Issues das specs 006/007 não criadas. Brief visual v3 pendente em `queue/`. Próximo continua sendo a spec 002, agora como comando do núcleo.

### 2026-11-08 — Claude Code (nuvem, claude.ai/code) — branches `feat/spike-electron-butterchurn`, `docs/fase-1-specs`
**Fez:** Issue #4 e label `fase-0`. Spike implementado (electron-vite + TypeScript, loopback, Butterchurn, HUD, F11) com workflow que gera a pasta portátil Windows como artifact; validado pelo usuário no Windows — critérios 1–3 ok, 4 (fone BT/USB) não verificado (sem segundo dispositivo; funciona com Voicemeeter). PR #5 mergeado (squash). DECISIONS: respostas do spike e "Butterchurn como dependência fixada, sem fork, com créditos" (`THIRD_PARTY_NOTICES.md`, README). AGENTS.md com comandos reais. Regras de acesso ao Notion para agentes em CONTEXT.md. Página do projeto no Notion reescrita para a v2. Fase 1: specs 002–005 e issues #6–#9 (label `fase-1`).
**Deixou em:** PR `docs/fase-1-specs` → `main` aberto (specs + TASKS + PROJECT + esta entrada). Labels `fase-2`…`fase-4` ainda não existem (MCP do GitHub não cria label avulso; nascem com a primeira issue de cada fase). Próximo: executar a spec 002 (`feat/presets-navegacao`). Não verificado: 1440p, fone Bluetooth/USB, custo de CPU da track de vídeo.

### 2026-11-08 — Claude Code (desktop, Windows) — branch `chore/cloud-ready`
**Fez:** PR #2 mesclado (squash). Branch padrão do GitHub renomeada para `main` (era `feat/project-config` → `master` → `main`); `feat/project-config` e `chore/workspace-electron` apagadas. Remote local sem token embutido (usa o login do `gh`). Ambiente decidido: dev na nuvem + validação no Windows por build do CI, sem Node no host (DECISIONS). Hook `SessionStart` para a nuvem. Spec 001 ganhou o P0 do workflow Windows. Revisão de UI para presets delegada a subagente → `queue/2026-11-08-revisao-ui-presets.md`.
**Deixou em:** PR `chore/cloud-ready` → `main`. Sessão continua no Claude Code na nuvem. Pendente, na ordem:
1. Skill `planejar-feature` só para criar a issue da spec 001 (label `fase-0`) e os labels `fase-0`…`fase-4`; pôr o número na spec e no TASKS.
2. Skill `executar-task` na branch `feat/spike-electron-butterchurn`: plan mode com template (electron-vite × Forge+Vite), estrutura de `src/`, fluxo main → renderer → AudioContext → Butterchurn, **e o workflow Windows**; esperar aprovação. `audio: 'loopback'` (nunca `loopbackWithMute`), parar tracks de vídeo. Fatias pequenas. No fim, o usuário testa o build do CI com música e confirma os 4 critérios um por um — nada marcado sem confirmação. Responder "Perguntas a responder" em DECISIONS, trocar "Stack & comandos" do AGENTS.md, PR com `Closes #N`.
3. Com o spike aprovado: `planejar-feature` para a Fase 1 — no máximo 4 specs, mostrar a lista antes de escrever.
4. Encerrar com `encerrar-sessao` (Notion: linha do projeto, page id na skill).
Não verificado: nada de código existe ainda.

### 2026-11-08 — Claude (chat, projeto "Audio Visualizer") — branch `chore/workspace-electron`
**Fez:** Retomada do projeto. Repo reorganizado no padrão workspace//kit: Python movido para `legacy/python/`; docs soltos da pasta local (PRD v1, plano, pesquisas, exploração de UI, moodboard, protótipo do Claude Design) trazidos para `docs/`; camadas humana e de agente criadas; PRD v2 (Electron + Butterchurn) e spec 001 do spike escritos; skills `planejar-feature`, `executar-task`, `encerrar-sessao`.
**Deixou em:** PR aberto para `master`. Nenhum código novo — `src/` vazio. Próximo: spike (spec 001) no Claude Code, rodando no Windows. Issue do spike ainda não criada (fazer com `planejar-feature` ou à mão no início do spike).

### 2026-03-26 — Claude Code
**Fez:** Fase 1 em Python (4 modos 2D, controles, fullscreen) — commit inicial + `.gitignore`.
**Deixou em:** `master` com a Fase 1; projeto pausado até nov/2026.
