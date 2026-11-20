# Sessões — Sonic Obsidian

Log append-only de quem mexeu no workspace, em que ferramenta, e em que estado deixou. Uma entrada por sessão (a skill `encerrar-sessao` adiciona). É handoff, não histórico de produto: o *porquê* fica em DECISIONS.md.

## Entradas

### 2026-11-20 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/034-memoria-renderer`
**Fez:** Passos 0–4 sem trabalho (nenhuma reivindicação expirada; blocos v0.9.0 #157 e v0.10.0 #164 sem comentário do usuário; nenhum PR aberto; dois blocos em teste e nenhuma `bug` pronta). Passo 5: planejou a `backlog` mais antiga, #98 (memória do renderer): spec 034, só medição (log com memória privada e heap/nós, `perf:win` com série e até 60 min no disparo manual, teste headless `034-memoria`); limiares `agent-decided` (DECISIONS). Os `perf-<sha>` dos blocos v0.7.0–v0.10.0 mostram o `Tab` caindo em 5 min, por isso a medida nova.
**Deixou em:** #98 `ready` no v0.11.0 (com a #97). Com dois blocos esperando teste, a implementação espera (só `bug` entra); próxima rodada planeja a #158 (bug, testes intermitentes) ou a `backlog` seguinte (#99, preset preto).

### 2026-11-20 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/033-normalizar-teto`
**Fez:** Passos 0–4 sem trabalho (nenhuma reivindicação expirada; blocos v0.9.0 #157 e v0.10.0 #164 sem comentário do usuário; nenhum PR aberto; dois blocos em teste e nenhuma issue `ready`). Passo 5: planejou a `backlog` mais antiga, #97 (Normalizar no teto de +12 dB): spec 033, teto +18 dB com a referência mantida (`agent-decided`, DECISIONS), milestone novo v0.11.0, issue `ready`.
**Deixou em:** #97 `ready` no v0.11.0. Com dois blocos esperando teste, a implementação da 033 espera (só `bug` entra); próximas rodadas planejam a `backlog` seguinte (#98, memória do renderer) ou a #158 (bug, ainda `backlog`).

### 2026-11-20 — Claude Code (nuvem, rodada do ciclo automático) — branch `chore/versao-0.10.0`
**Fez:** Passos 0–2 sem trabalho (nenhuma reivindicação expirada; #157, bloco v0.9.0, sem comentário do usuário; nenhum PR aberto). Passo 3: o milestone v0.10.0 está sem issues abertas (#96 e #160, spec 032) e só há um bloco em teste → fecha o bloco v0.10.0: `package.json` 0.10.0 e `.github/release-notes.md` (sincronia). Depois do merge: branch `rc/v0.10.0`, build Windows nela e issue "Testar bloco v0.10.0" atribuída ao usuário. DECISIONS 2026-11-20. O CI deste PR falhou no `027-estudio-extras` 2b (no runner lento a volta da troca trava o thread e a assinatura de 4 s some antes da leitura; reproduzido aqui): o teste agora registra a assinatura por um `MutationObserver` no momento em que ela aparece. Passou localmente.
**Deixou em:** dois blocos esperando o teste do usuário (v0.9.0 #157 e v0.10.0). Próximas rodadas: só `bug` (ex.: #158, ainda `backlog`) e planejar a `backlog` mais antiga; nenhum bloco novo até o usuário responder a um dos dois.

### 2026-11-20 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/032-medir-captura`
**Fez:** Passos 0–3 sem trabalho (nenhuma reivindicação expirada; #157, bloco v0.9.0, sem comentário do usuário; nenhum PR aberto; v0.10.0 com issue aberta). Passo 4: #160 reivindicada e implementada (spec 032, P1): comando "Medir atraso da captura" na busca; `src/renderer/src/capture-latency.ts` (clique de 10 ms por um `AudioContext` à parte, achado por filtro casado no ramo cru da captura antes do `DelayNode`, relógio do áudio dos dois lados, três cliques, mediana); toast "Captura: N ms" ou o aviso; log `[sync] measured capture …`. Teste novo `032-medir-captura` 19/19; `030-idiomas`, `020`, `010`, `032-sincronia`, `031` passaram. DECISIONS 2026-11-20.
**Deixou em:** PR desta branch com `Closes #160`. Não verificado (bloco v0.10.0, Windows): o número real do loopback, a variação em três execuções, se o loopback do Electron inclui o som do próprio app (se não incluir, o comando sempre mostra o aviso), o aviso com o som mudo.

### 2026-11-19 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/032-sincronia-visual`
**Fez:** Passos 0–3 sem trabalho (nenhuma reivindicação expirada; bloco v0.9.0 sem resposta na #157; nenhum PR aberto; v0.10.0 com issue aberta). Passo 4: #96 reivindicada e implementada pela spec 032, P0: `DelayNode` logo depois da fonte (ganho, Butterchurn, silêncio, batida e medidor andam juntos; rampa de 50 ms), `visualDelayMs` 0–500 (passo 10) com comando `audio.visualDelay` e sanitização, grupo "Sincronia" › "Atrasar o visual" em Configurações › Captura (busca por bluetooth/latency/atraso), linha `sync` no HUD e `[sync]` no log (na captura e a cada 5 min, com p95 e o maior intervalo entre quadros). `src/renderer/src/sync.ts` novo. Teste `032-sincronia` (21/21; a média de 33 ms a 30 fps só roda em runner rápido). P1 virou a #160. DECISIONS e DIVERGENCIAS 2026-11-19.
**Deixou em:** PR desta branch com `Closes #96`. Não verificado (bloco v0.10.0, Windows): o atraso real de 300 ms com metrônomo, o ajuste com fone Bluetooth, nenhuma mudança com 0 ms, se o Chromium informa a latência da captura.

### 2026-11-19 — Claude Code (nuvem, rodada do ciclo automático) — merge do PR #159
**Fez:** Passo 0 sem trabalho (nenhuma `in-progress`). Passo 1 sem trabalho (#157, bloco v0.9.0, sem comentário do usuário). Passo 2: PR #159 (spec 032, só docs, sem checks, autor `atempel`, branch do repo, sem pedido de mudança, número 032 livre) → esta entrada e merge em squash.
**Deixou em:** spec 032 no `main`; #96 `ready` + `agent-decided` no v0.10.0. Próxima rodada: implementar a #96 (`executar-task`). Bloco v0.9.0 segue esperando o teste do usuário (#157).

### 2026-11-19 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/032-sincronia-visual`
**Fez:** Passos 0–4 sem trabalho (nenhuma reivindicação expirada; bloco v0.9.0 sem resposta do usuário na #157; nenhum PR aberto; nenhuma issue `ready`). Passo 5: #96 (a `backlog` mais antiga) reivindicada e planejada com `planejar-feature`: **spec 032 — Sincronia do visual com o som** (HUD `sync` e log `[sync]` com as partes do atraso; "Atrasar o visual" 0–500 ms em Configurações › Captura › Sincronia por um `DelayNode` logo depois da fonte; P1: "Medir atraso da captura" com um clique pela saída). Adiantar a reação fica fora (impossível com captura ao vivo). Decisões em DECISIONS (`agent-decided`); milestone v0.10.0 criado.
**Deixou em:** PR desta branch; #96 `ready` + `agent-decided` no v0.10.0. Próxima rodada: mergear este PR e implementar a #96 (`executar-task`). Áudio e sentido do atraso só se verificam no Windows, no bloco.

### 2026-11-19 — Claude Code (nuvem, rodada do ciclo automático) — branch `chore/versao-0.9.0`
**Fez:** Passos 0–2 sem trabalho (nenhuma reivindicação expirada, nenhum bloco esperando teste, nenhum PR aberto). Passo 3: milestone v0.9.0 sem issues abertas (#95 e #133 fechadas) → **fecha o bloco v0.9.0**. `package.json` 0.8.0 → 0.9.0, `.github/release-notes.md` com o Feedback e bugs, DECISIONS (`agent-decided`).
**Deixou em:** depois do merge, branch `rc/v0.9.0` neste commit, `build-windows` disparado nela e a issue "Testar bloco v0.9.0" (`test-block`, atribuída ao atempel) com o roteiro do #155. Nenhuma release antes do ok dele. Áudio, fps e visual não verificados aqui (só no Windows, no bloco).

### 2026-11-19 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/031-feedback-github`
**Fez:** Passos 0–3 sem trabalho (nenhum PR aberto, nenhum bloco esperando teste, v0.9.0 com issue aberta). Passo 4: #95 reivindicada e implementada pela spec 031 (`executar-task`; design conferido: artefato `1794680346-fb12`, igual ao citado na spec). App: botão `message-square` nos Ajustes rápidos com o menu das três portas + Copiar diagnóstico; painel "Relatar um problema" (cinco itens com switch, URL do `bug_report.yml`); grupo Feedback em Configurações › Sobre; quatro comandos na busca; IPC `system:osInfo` e `log:tail` (`src/main/feedback.ts`), `copyText` até 64 KB; textos em `en`/`pt-BR`. Repo: `config.yml` sem issue em branco e com Ideas/Q&A, `bug_report.yml` com `audio` e "Diagnostics", `feature_request.yml` apontando para Ideas, rótulos `idea`, `preset`, `needs-info`, `windows-only` criados, seção Feedback no README (EN/pt-BR) e na landing (EN/PT). Teste novo `031-feedback` 38/38; `030-idiomas` 97/97, `010`, `020`, `029` passaram aqui. DECISIONS e DIVERGENCIAS 2026-11-19.
**Deixou em:** PR desta branch com `Closes #95`. No Windows, não verificado (vai para o bloco v0.9.0): valores reais de Windows/GPU/saída, o navegador abrindo o formulário preenchido e as categorias do Discussions, o texto colado sem a pasta do usuário, "New issue" sem issue em branco.

### 2026-11-18 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/031-feedback-github`
**Fez:** Passos 0–4 da `rodada` sem trabalho (nenhum PR aberto, nenhuma issue `ready`/`in-progress`, nenhum bloco esperando teste). O milestone v0.9.0 só tem a #133 (testes), sem mudança de app: o bloco **não** foi fechado. Passo 5: #95 (a `backlog` mais antiga) reivindicada e planejada com `planejar-feature`: **spec 031 — Feedback e bugs pelo GitHub** (três portas no app, painel com switches antes de abrir o formulário, Copiar diagnóstico, grupo Feedback em Sobre, comandos na busca; templates, rótulos e seção Feedback no README/landing). Design: `v3-feedback.md` igual no artefato `1794680346-fb12` e no espelho `598c`. Três decisões pequenas em DECISIONS (`agent-decided`).
**Deixou em:** PR desta branch; #95 `ready` + `agent-decided` no milestone v0.9.0. Próxima rodada: mergear este PR e implementar a #95 (`executar-task`).

### 2026-11-18 — Claude Code (nuvem, sessão com o usuário) — branch `docs/release-0.8.0`
**Fez:** Documentação depois da publicação da v0.8.0 (pedido do usuário), no padrão da 0.7.0: README.pt-BR (status, Estúdio completo, próximos passos, roadmap, Modo limpo), README (Modo limpo), PROJECT (estado e "Agora" = v0.9.0), TASKS (027 feita), PRD (Estúdio ✅ v0.8.0), architecture (estado e prévia com o quadro inteiro), spec 027 publicada; landing EN/PT: a pergunta "Posso criar meus presets?" deixa de dizer "no roadmap".
**Deixou em:** PR para o `main`. A mesma frase da landing ainda está antiga no canvas do Claude Design (o espelho `docs/design/landing/` é só leitura): atualizar lá na próxima sessão de design.

### 2026-11-18 — Claude Code (nuvem, rodada do ciclo automático) — branch `fix/133-perf-win`
**Fez:** Continuação da #133 (mesma rodada do #145): o `perf:win` (`tests/perf/windows.cjs`, função `play`) estourou os 5 s esperando o campo da busca no runner Windows sem GPU. Espera do campo e do "preset entrou" → 15 s, e a linha do preset na busca passa a ser esperada (antes, 300 ms fixos). Conferido na nuvem com `PERF_QUICK=1` (Electron sob xvfb): passou (41 s). O CI deste PR pegou mais um da família, `027-estudio-versoes` 3a (terceiro Ctrl+S antes de a edição compilar): espera os salvamentos terminarem (contador no `saveMine` simulado) e a compilação da edição começar e terminar; 39/39 aqui. O #146 (para a `rc/v0.8.0`) foi fechado: o #149 já tinha levado os quatro commits.
**Deixou em:** PR desta branch com `Closes #133`. O passo de desempenho do build Windows confere de verdade no próximo build do bloco (com a label ou disparo manual).

### 2026-11-18 — Claude Code (nuvem, sessão com o usuário) — release v0.8.0
**Fez:** Ok do usuário no bloco v0.8.0 (#141). Notas da release com as correções do teste (#150); correção dos testes intermitentes da rodada levada à `rc/v0.8.0` por cherry-pick (#149, no lugar do #146, que conflitava). Release **v0.8.0 publicada** pelo workflow `release` na `rc/v0.8.0` (`b9e6879`; app igual ao `9a5b6b2` testado). `rc/v0.8.0 → main` com o README da 0.8.0.
**Deixou em:** v0.8.0 publicada; #141 e milestone v0.8.0 fechados. Fica na #133: o `perf:win` (`tests/perf/windows.cjs:119`). Próximo milestone: v0.9.0.

### 2026-11-18 — Claude Code (nuvem, rodada do ciclo automático) — branch `fix/133-testes-intermitentes`
**Fez:** Passo 4 da `rodada` (#142 e #143 já reivindicadas por outra sessão há 30 min; nenhum PR aberto; um bloco esperando teste): #133 (`prioridade`, v0.9.0) reivindicada. Testes headless intermitentes: esperas de estado (`waitForSelector`, `waitForFunction`, `H.poll` e o `waitStatus` do 026/030) de 1–5 s passam a 15 s (10 s no `waitStatus`) — só esperas por algo que deve acontecer, nenhuma checagem de "não aparece"; `010-busca` 4: Esc no próprio campo (`page.press`); `030-idiomas` 7d/7g: "Copiado" anotado por um MutationObserver (volta em 2 s, e o `waitForFunction` por rAF não sonda numa aba atrás) e a linha "Captura funcionando" esperada em vez de 400 ms fixos; `027-estudio-exportar` 1b: espera o foco entrar no menu; `027-estudio-basico` 6a (falhou no CI deste PR): clica em "Ir para a linha" só com o Básico já na tela, e 4d liga o switch pelo próprio input (o `check` com force clicava por coordenada); `027-estudio-comparar` C: mínimo de fps no meio entre o sozinho e o com a comparação, e espera a página chegar a ele antes de ligar; se essa página não chega ao mínimo em 15 s (no CI ficou em 1 fps), o C é pulado pelo mesmo motivo do guarda que já existia ("runner lento demais") — `agent-decided`, revisar. Nenhum teste pulado ou desligado. Nesta máquina (2 CPUs): `010-busca`, `026-estudio` 52/52 e `027-estudio-exportar` 20/20, `027-estudio-codigo` e `027-estudio-comparar` passaram (o C do comparar foi pulado aqui: 1 fps).
**Deixou em:** PR para o `main` com `Closes #133` e PR com o mesmo commit para a `rc/v0.8.0` (pedido na issue). O CI de cada PR confere; intermitência só se confirma em várias execuções.

### 2026-11-18 — Claude Code (nuvem, sessão com o usuário) — branches `fix/142-modo-limpo` e `fix/143-previa-inteira`
**Fez:** Teste do bloco v0.8.0 pelo usuário (#141): dois problemas viraram #142 e #143 com as escolhas dele. #142: Modo limpo sem nenhum aviso no Palco (só a confirmação do `T`; toast `stage`; silêncio e captura recusada escondidos), teste `142-modo-limpo`. #143: o `#canvas` encolhe por `transform` para caber inteiro no painel "Seu remix" (e o do Comparar no da esquerda), selos e assinatura sobre o quadro; testes A2b/A2c/A5/A20b no `027-estudio-comparar`. DECISIONS, DIVERGENCIAS (Estúdio P0 revista) e spec 014 atualizadas. #133 (testes intermitentes) ficou `ready` + `prioridade` no v0.9.0 a pedido do usuário.
**Deixou em:** PRs para a `rc/v0.8.0`; depois do merge, build novo da `rc/v0.8.0`, roteiro só do que mudou na #141 e PR `rc/v0.8.0 → main`. No Windows não verificado: o visual encolhido na prévia (nitidez e fps) e os avisos sumindo de verdade.

### 2026-11-18 — Claude Code (nuvem, rodada do ciclo automático) — branch `chore/versao-0.8.0`
**Fez:** Passo 3 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, milestone v0.8.0 sem issues abertas depois da #75): **fecha o bloco v0.8.0**. `package.json` 0.7.0 → 0.8.0, `.github/release-notes.md` com o Estúdio completo, DECISIONS (bloco com uma issue só, `agent-decided`).
**Deixou em:** depois do merge, branch `rc/v0.8.0` neste commit, `build-windows` disparado nela e a issue "Testar bloco v0.8.0" (`test-block`, atribuída ao atempel) com o roteiro das 11 fatias. Nenhuma release antes do ok dele. Áudio, fps e visual não verificados aqui (só no Windows, no bloco).

### 2026-11-18 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-extras-previa`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 11 da 027** (Extras da prévia), a última. Design: artefato em `1794680346-fb12` (espelho ainda em `598c`, sync pendente na #124); botões e assinatura do protótipo do Estúdio. "Testar troca" corta o visual para outro preset (sorteado, sem mexer no atual nem no histórico) e, 500 ms depois, volta para o preset em edição (última versão válida) com a transição das trocas manuais; assinatura com nome e crédito no pé da prévia. "Capturar quadro": `toBlob` do canvas principal → `presets:exportFrame` (diálogo nativo, só PNG, até 64 MB). Teste novo `027-estudio-extras` 17/17; `026-estudio` 52/52, `027-estudio-exportar` 20/20, `027-estudio-comparar` 25/25, `030-idiomas` 97/97. DECISIONS, DIVERGENCIAS, AGENTS e spec (Implementada, falta o Windows).
**Deixou em:** PR desta branch com `Closes #75` (a 027 termina aqui). Com o merge, o milestone v0.8.0 fica sem issues abertas e a próxima rodada fecha o bloco (`chore: versão 0.8.0`, `rc/v0.8.0`, issue "Testar bloco v0.8.0"). Não verificado: a transição da troca e o PNG gravado no disco, no Windows (vai para o bloco v0.8.0).

### 2026-11-18 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-verificador`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 10 da 027** (Verificador próprio). Design: estado **Com erro** do protótipo do Estúdio (espelho `42d3`; artefato visto pela última vez em `1794680346-fb12` nas rodadas de 17/11, sem nova checagem). `src/renderer/src/studio/lint.ts` usa o `parse` do eel-wasm: variável lida que nada atribui e não é do motor vira **aviso** (não erro) com "Você quis dizer…?" e "Corrigir"; `tex2D` e chaves que não fecham nos shaders; o erro de função desconhecida ganhou a sugestão e o Corrigir. Avisos em Problemas depois dos erros (etiqueta "Aviso", sem fundo), número da linha marcado no editor, status segue "Compilado", salvar não bloqueia, Corrigir entra no desfazer. Teste novo `027-estudio-verificador` (nenhum aviso falso nos 380 presets do pacote; 60 têm variável lida sem valor de verdade). DECISIONS e DIVERGENCIAS (o protótipo trata `bas_att` como erro).
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 11 (Extras da prévia: Testar troca e Capturar quadro). Não verificado: o aviso e o Corrigir no app rodando no Windows (vai para o bloco v0.8.0).

### 2026-11-17 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-renomear`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 9 da 027** (Renomear). Design: o protótipo do Estúdio já tem o nome editável (`#presetName`); usada a checagem do artefato da rodada anterior de hoje (`1794680346-fb12`), sem nova checagem. O campo do nome segue editável depois de salvo; nome mudado conta como não salvo; salvar só o nome chama `presets:renameMine` (só o `title` do `meta.json`, sem versão nova); com edição junto, renomeia e salva. Comando `library.renamePreset` troca o nome em favoritos, ocultos, recentes, coleções, fps medido, último preset e favorito de abertura; `PresetLibrary.renameMine` troca no mapa e no histórico do "Anterior". Nome já usado → "(2)". Teste novo `027-estudio-renomear` 27/27 (com o `mine.ts` de verdade numa pasta temporária); `027-estudio-novo` 21/21 e `030-idiomas` 97/97; `026-estudio` atualizado (nome não fica mais só leitura) — numa execução falhou só o 4d por tempo (3 s) nesta máquina, item que esta fatia não toca; o CI confere.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 10 (Verificador próprio). Não verificado: o `meta.json` renomeado no disco do Windows e o nome novo depois de reabrir o app (vai para o bloco v0.8.0).

### 2026-11-17 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-novo-preset`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 8 da 027** (Novo preset). Design checado: artefato ainda em `1794680346-fb12`. Modelo mínimo em `studio/template.ts`: um `.milk` (círculo aditivo de 48 lados, raio e brilho pelo grave, zoom leve) convertido pelo `presets:convertMilk`, então o preset novo nasce com fonte `.milk` (aba Código editável, Exportar devolve a fonte). "Novo preset" no topo da Biblioteca (como no protótipo) e no topo do Estúdio (com mudanças não salvas, o primeiro clique avisa e o segundo troca). Abre como "Meu preset", sem "baseado em", prévia "Seu preset"; sair sem salvar volta ao preset de antes. Teste novo `027-estudio-novo` (21 checagens). DECISIONS, DIVERGENCIAS, AGENTS e a spec atualizados.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 9 (Renomear). Não verificado: o círculo reagindo ao grave na tela, no Windows (vai para o bloco v0.8.0).

### 2026-11-17 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-exportar`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 7 da 027** (Exportar `.milk`). Design checado: artefato ainda em `1794680346-fb12` (botão "Exportar .milk" no topo; o protótipo não desenha o menu → `DIVERGENCIAS.md`). Botão "Exportar .milk" entre Versões e Salvar, com menu: `.milk` (HLSL da fonte; numa cópia do pacote, aviso antes e "sem os shaders"; com GLSL editado, aviso de que vai o HLSL anterior) e JSON do Butterchurn 3. Só exporta o que compilou (`ready()` dividido com o salvar). Main: `presets:exportFile` com diálogo nativo (nome limpo, `.milk` ≤ 256 KB, JSON ≤ 2 MB), títulos no idioma do app. Teste novo `027-estudio-exportar` 20/20 (o `.milk` exportado de um importado volta igual pelo conversor de verdade); `027-estudio-codigo` 32/32, `027-estudio-versoes` 39/39, `030-idiomas` 97/97. O `026-estudio` falhou em itens de tempo de compilação diferentes a cada execução nesta máquina (2 CPUs, WebGL em software); o CI confere.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 8 (Novo preset). Não verificado: o diálogo nativo de salvar e o arquivo exportado abrindo de volta no app, no Windows (vai para o bloco v0.8.0).

### 2026-11-17 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-codigo-milk`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 6 da 027** (Código `.milk`). Design checado: artefato ainda em `1794680346-fb12` (página 027 igual ao espelho nesta aba). Gerador `src/renderer/src/studio/milk.ts` (preset → `.milk`, com o HLSL da fonte); aba `Código .milk` (`Ctrl+6`): importados e meus presets vindos de `.milk` editam o texto, que converte no main e atualiza todas as abas; cópias do pacote mostram o JSON em leitura. Main: `mine/<id>/source.milk` (salvo junto), `presets:importedMilk`/`presets:mineMilk`. Teste novo `027-estudio-codigo` (32/32; inclui ida e volta dos 380 presets do pacote e dos 10 `.milk` do spike pelo conversor de verdade); `027-estudio-basico`/`-ondas` atualizados para 6 abas. DECISIONS e DIVERGENCIAS com as escolhas (`agent-decided`). Obs.: `026-estudio` e `030-idiomas` falharam uma vez cada por tempo nesta máquina (2 CPUs) e passaram ao repetir; o 026 passou 2× seguidas.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 7 (Exportar `.milk`). Não verificado: o visual mudando depois de editar o `.milk`, no Windows (vai para o bloco v0.8.0).

### 2026-11-17 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-shaders`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 5 da 027** (Shaders). Design checado: artefato ainda em `1794680346-fb12` (espelho em `598c`, sync na #124). Aba Shaders (`Ctrl+5`) com os editores `warp` e `comp` do protótipo, para qualquer preset; mesmo ciclo das equações (400 ms, visualizador de teste, última versão válida tocando). Erro do GLSL em Problemas no bloco e na linha do texto do usuário (`comp, linha 3: compilador GLSL: 'float2' : undeclared identifier`), com "Ir para a linha" e a linha marcada; `studio/shader-lines.ts` converte a linha do shader montado pelo Butterchurn. Desfazer e salvar levam os shaders. O bloco só leitura de shaders saiu de Equações. HUD com a impressão digital do `warp`/`comp` que o motor carregou. Teste novo `027-estudio-shaders` (27 checagens); `026-estudio`, `027-estudio-basico`/`ondas`/`versoes`/`comparar` e `020-atalhos` passam; `030-idiomas` 96/97 (falha intermitente em "Copiado" do Diagnóstico, um idioma por vez, fora do Estúdio). DECISIONS, DIVERGENCIAS, AGENTS e a spec atualizados.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 6 (Código `.milk`). Não verificado: o shader editado na tela e o critério 5 no Windows (vai para o bloco v0.8.0).

### 2026-11-16 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-comparar`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 4 da 027** (Comparar com o original). Design checado: artefato ainda em `1794680346-fb12`. Switch "Comparar com o original" abaixo da prévia: liga um segundo `PresetVisualizer` só enquanto está ligado, num painel à esquerda que mostra a mesma região do quadro que o principal mostra à direita, com os mesmos níveis de áudio (cópia do principal a cada quadro). "Comparar" em cada versão da gaveta usa o mesmo segundo motor. Só liga com ≥ 50 fps (ou 90 % do limite de fps); desliga e avisa depois de 2 s abaixo disso ou se o contexto WebGL dele cair. `compareMinFps` no `test-flags.json`. Teste novo `027-estudio-comparar` (25 checagens; a parte da queda por fps só roda num runner acima de 10 fps — aqui ficou em 2–4 fps e foi pulada). Achado: o `webglcontextlost` do canvas principal nunca dispara no Butterchurn 3 → issue #130 (`backlog`). DECISIONS, DIVERGENCIAS, AGENTS e a spec atualizados.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 5 (Shaders). Não verificado: fps com os dois motores e o critério 4 (5 min ligado) no Windows, e a desligada automática por fps (vai para o bloco v0.8.0).

### 2026-11-16 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-versoes`
**Fez:** Passo 4 da `rodada` (nenhum PR aberto, nenhum bloco esperando teste, #75 `ready` no v0.8.0): #75 reivindicada, **fatia 3 da 027** (Histórico e desfazer). Design checado: artefato ainda em `1794680346-fb12`. No main (`mine.ts`): cada salvamento grava `v0001.json`… na pasta do preset (até 50, as mais antigas saem), com resumo em dados (parâmetros e blocos mudados); `preset.prev.json` da 026 migra para v0001; IPC `presets:mineVersions`/`presets:mineVersion` com id e número conferidos. No Estúdio: botão "Versões" e gaveta do protótipo com hora, "Você", resumo no idioma do app e "Restaurar"; `Ctrl+Z`/`Ctrl+Shift+Z` fora de campo de texto desfazem o editor inteiro (um passo por arrasto), dentro do campo vale o nativo. "Comparar" da gaveta fica para a fatia 4 (prévia dividida). Teste novo `027-estudio-versoes` (39 checagens, com o `mine.ts` de verdade numa pasta temporária por trás do `window.so`); `026-estudio`, `027-estudio-basico`, `027-estudio-ondas`, `030-idiomas` e `020-atalhos` passam. DECISIONS e DIVERGENCIAS 2026-11-16.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 4 (Comparar com o original, com o "Comparar" das versões). Não verificado: o visual voltando ao restaurar, no Windows (vai para o bloco v0.8.0).

### 2026-11-16 — Claude (chat, projeto Audio Visualizer) — branch `site/demo-troca-musica`
**Fez:** Landing: botão para trocar a música da demo (próxima música do Uppbeat, `1 / 2`) e Tocar demo esperando a checagem dos arquivos para sempre começar pelo Uppbeat. Spec 019 e DECISIONS atualizados. Conferido no Chromium headless com `site:vendor` e áudios de teste no lugar das músicas (EN e PT): crédito, rótulo e contagem trocam a cada clique.
**Deixou em:** PR desta branch. Não verificado com as músicas reais (só no site publicado, com a `SITE_AUDIO_KEY`). Botão também no canvas da landing (versão `1794848714-486d`, som sintetizado como substituto) e espelho `docs/design/landing/` sincronizado.

### 2026-11-16 — Claude (chat, projeto Audio Visualizer) — branch `docs/release-0.7.0`
**Fez:** Docs atualizadas para a v0.7.0 publicada: README e README.pt-BR (status v0.7.0, recursos da 0.6/0.7, atalhos `Enter`/`Shift+Enter`/`E`/`F11`/`Ctrl+W`, CI por label, `test:ui`, i18n, layout do repo, roadmap, assinatura "Brazil"/"Brasil" a pedido do usuário); PROJECT.md (estado atual), TASKS.md (029, 030, 025 e 028 marcadas), PRD (fases e Fase 5), docs/README.md (specs 016–030), architecture.md (§9 atualização e idiomas), CONTRIBUTING.md (CI e regra de textos traduzidos).
**Deixou em:** PR desta branch (só docs). Rodapé da landing (`site/` EN e PT) também trocado para "Brazil"/"Brasil"; canvas do Claude Design trocado também (versão `1794846713-386e`) e espelho `docs/design/landing/` sincronizado.


### 2026-11-16 — Claude Code (nuvem, continuação da rodada) — branch `site/atualizacoes-0.7.0`
**Fez:** O usuário aprovou o bloco v0.7.0 na conversa ("tudo rodou bem", "pode publicar"). Disparou o workflow `release` na `rc/v0.7.0` com `version=0.7.0` e `publicar=true` (a `rc/v0.7.0` já está no `main`, sem PR de volta). Com a release publicada: landing com "atualizações automáticas" no cartão do instalador (en e pt; "abrir com o Windows" do canvas continua fora, não existe no app) e o lembrete tirado de `.github/release-notes.md`; #121 e milestone v0.7.0 fechados.
**Deixou em:** PR desta branch (só `site/` e `.github/`). Quem está na 0.6.0 instala a 0.7.0 à mão uma vez; dali em diante o atualizador entrega as próximas. Próxima rodada: fatia 3 da 027 (#75).

### 2026-11-16 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-ondas-formas`
**Fez:** Passo 4 da `rodada` (bloco v0.7.0 em #121 sem comentário do usuário; nenhum PR aberto; #75 `ready` no v0.8.0): #75 reivindicada, **fatia 2 da 027** (Ondas e Formas). Design checado: artefato ainda em `1794680346-fb12`. Abas Ondas e Formas (`Ctrl+3`/`Ctrl+4`) com 4 slots em sanfona cada: "Ativa", `samples`/`sep`/`spectrum` e `sides`/`rad`/`ang`/`textured` (faixas do protótipo, valor sempre válido), blocos `per_frame`/`per_point`; slot desligado só leitura. As ondas e formas ligadas compilam e rodam no Worker da 026 (erro, laço e lentidão com o bloco do slot, ex.: `wave_1_per_point, linha 2`); "Ir para a linha" abre a aba e o slot. Achado no caminho: com mais módulos, a compilação num Worker recém-criado passava de 1 s e caía no teto do laço sem fim (o Estúdio ficava preso depois de um laço) — o teto de 1 s agora conta do primeiro bloco rodando. HUD com `studio: live waves … · shapes …` lido do motor. Teste novo `027-estudio-ondas` (28 checagens); `026-estudio`, `027-estudio-basico` e `030-idiomas` (agora mede corte em Ondas e Formas) ajustados. DECISIONS e DIVERGENCIAS 2026-11-16.
**Deixou em:** PR desta branch, sem `Closes` (a #75 fecha na última fatia); #75 volta a `ready` para a fatia 3 (Histórico e desfazer). Não verificado: a onda/forma aparecendo na tela, no Windows (vai para o bloco v0.8.0).

### 2026-11-16 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/027-abas-basico`
**Fez:** Passo 4 da `rodada` (bloco v0.7.0 em #121 sem comentário do usuário; nenhum PR aberto; v0.8.0 com a #75 `ready`): #75 reivindicada, **fatia 1 da 027** (abas e Básico). Design checado: o artefato está em `1794680346-fb12` (espelho em `598c`); a página nova `Estúdio completo (027).html` é igual à `Estúdio.html` do espelho, com uma nota dizendo que o layout virou a camada sobre o Palco (como o P0 já faz). Abas Básico/Equações com ARIA, `Ctrl+1/2`, setas, `Home`/`End`; Básico com os 18 parâmetros do protótipo (sliders, switches, forma da onda, amostra de cor), valor gravado direto no runner do Butterchurn sem recarregar (`PresetVisualizer.tweakBase`; sem ele, recompila), salvo no `baseVals`. Teste novo `027-estudio-basico` (21/21); `026-estudio` (52/52) e `030-idiomas` (97/97, agora mede corte no Básico) ajustados. DECISIONS e DIVERGENCIAS 2026-11-16.
**Deixou em:** PR desta branch, sem `Closes` (a #75 só fecha na última fatia); #75 volta a `ready` para a fatia 2 (Ondas e Formas). Não verificado: o visual mudando enquanto arrasta, no Windows (vai para o bloco v0.8.0). O espelho do design segue em `598c` (issue `backlog` aberta para sincronizar com `fb12`).

### 2026-11-16 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/027-perguntas`
**Fez:** Passo 5 da `rodada` (bloco v0.7.0 esperando o teste do usuário em #121, sem comentário dele; nenhum PR aberto; nada `ready`): planejou a `backlog` mais antiga, #75 (spec 027, Estúdio P1). Fechou as 4 perguntas da spec como `agent-decided` (exportar sem shaders com aviso; versões em arquivo inteiro, até 50; histórico só na pasta do preset; ordem das fatias mantida, um PR por fatia) e registrou em DECISIONS. Criou o milestone v0.8.0.
**Deixou em:** PR desta branch (só docs). #75 em `ready` + `agent-decided`, milestone v0.8.0. Próxima rodada: mergear este PR e começar a fatia 1 da 027 (abas e Básico; checar o design `42d3` antes). Nada verificado no Windows (não houve código).

### 2026-11-15 — Claude Code (nuvem, rodada do ciclo automático) — branch `chore/versao-0.7.0`
**Fez:** Passo 3 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 sem issues abertas e nenhum bloco esperando teste): fecha o bloco v0.7.0. Versão 0.7.0 no `package.json`/`package-lock.json`, notas em `.github/release-notes.md` (atualizador, idiomas, ajustes do 598c, instalar à mão uma vez quem vem da 0.6.0). DECISIONS: bloco fecha com 4 issues; a landing ganha "atualizações automáticas" só na publicação.
**Deixou em:** PR desta branch; depois do merge, branch `rc/v0.7.0`, `build-windows` disparado nela e issue "Testar bloco v0.7.0" (`test-block`, atribuída ao atempel). Próxima rodada: responder ao bloco (ok → release + landing; problema → bugs na `rc/v0.7.0`); sem resposta, planejar o `backlog` mais antigo para o v0.8.0.

### 2026-11-15 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/028-ajustes-design-598c`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 só com a #94): #94 reivindicada. Ajustes de interface da 028 pelo design `1794603894-598c` (seção Sinal e Expressividade inalterada na versão atual do artefato, `1794680346-fb12`): "auto +N dB" em ciano ao lado do nome nos Ajustes e nas Configurações (`Row` ganhou `aside`); Caráter e Memória viram segmentados (`Segmented`, radiogroup com foco itinerante) com ponto de 4 px sob o padrão e "Padrão." na descrição; Memória com 4 opções e a descrição da Viva "(em teste)"; Nível 0 troca a descrição do Caráter e apaga o segmentado (clicável); traço no 0 do Nível; "Restaurar padrão" fantasma com `rotate-ccw` à direita do título, toast "Expressividade no padrão." e foco no Nível. Chaves `quick.default`/`quick.restoreDefaultValues` saíram. Testes: `028-expressividade` 58/58, `028-normalizar` 16/16 (+2), `030-idiomas` 97/97.
**Deixou em:** PR desta branch com `Closes #94`. Não verificado: visual no Windows (vai para o bloco v0.7.0). Com o merge, o v0.7.0 fica sem issues abertas → a próxima rodada fecha o bloco (passo 3). O design `fb12` ainda não está espelhado (mudou só `v3-respostas-divergencias.md`, rodada de 14/11 sobre 024/026) — sincronizar numa rodada de manutenção.

### 2026-11-15 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/025-perf-windows`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com #73 e #94 `ready`): #73 (spec 025, P1) reivindicada. `tests/perf/windows.cjs` + `npm run perf:win`: Playwright `_electron` no `.exe` empacotado, perfil temporário (`--user-data-dir`), bumbo sintético do harness; 3 aberturas a frio (linha `startup` do log), 20 presets fixos (`tests/perf/presets.json`, 1 s de transição + 5 s de amostra a 1280×720), 5 min de trocas a cada 2 s com heap JS e memória por processo; `perf.json` + resumo markdown lado a lado com a execução anterior. Passo novo no fim do job `build-windows` (artifact `perf-<sha>`, 90 dias). Conferido na nuvem com o Electron de dev no Linux (xvfb, `PERF_QUICK=1`): mede, compara com um `perf.json` anterior e falha com `noWebgl2` no perfil. DECISIONS 2026-11-15.
**Deixou em:** PR #118 (`Closes #73`), mergeado na rodada. Conferido no runner Windows com dois disparos do `build-windows` na branch: o passo leva ~9 min (job inteiro ~10 min), WebGL por software funciona, o segundo resumo mostra a execução anterior ao lado (critérios 4–7). Os números do runner variam ~±20% entre execuções iguais — o limite de piora (spec futura) precisa considerar isso.

### 2026-11-15 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/029-atualizacao-automatica`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com 3 issues `ready`): #69 (spec 029) reivindicada. Atualização automática: `electron-updater@6.8.11` (checagem de dependência registrada), `src/main/updater.ts` (agenda 30 s após o primeiro quadro + tique de 1 h/24 h, `updates.json`, instalador baixa e instala em silêncio com reabertura, zip portátil só avisa, erros automáticos só no log), preload `window.so.update`, bloco `publish` no `electron-builder.yml` (o `app-update.yml` sai no app e no zip — conferido num build local), `release.yml` anexa e confere `latest.yml` + `.blockmap`. Interface pelo design `1794603894-598c` (seção inalterada na versão atual do artefato, `1794680346-fb12`): plaquinha acima da faixa, Configurações › Sobre › Atualizações (chave `updatesAuto`, Verificar agora com os estados), comandos "Verificar atualizações"/"Reiniciar e atualizar". README (Privacy) atualizado; landing e notas da release ficam para o fechamento do bloco (lembrete no `.github/release-notes.md`). Teste `029-atualizacao` (32 checagens).
**Deixou em:** PR desta branch com `Closes #69`. Não verificado (Windows, vai para o bloco v0.7.0): download/instalação silenciosa/reabertura, SmartScreen, rascunho/pre-release não oferecidos, portátil, tempo de abertura — só dá para testar com duas releases publicadas com atualizador (0.7.0 → 0.7.1). O `latest.yml` só é gerado no Windows (NSIS precisa de wine aqui): o ensaio do `release.yml` neste PR confere. O artefato do design está numa versão nova (`fb12`) ainda não espelhada — sincronizar numa rodada de manutenção. Próxima rodada: mergear este PR quando verde; depois #73 e #94 no v0.7.0.

### 2026-11-15 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-p1-main-teclas`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com issues abertas): #101 (030, `prioridade`) reivindicada. 9º e último PR da 030, o **P1**: diálogos nativos (coleções, `.milk`) no idioma do app (`app:setLanguage` → `src/main/i18n.ts`); erros lançados pelo main em inglês com código (`[too-big]`, `[js]`, `[invalid]`, `[empty-title]`, `[shader:x]`), traduzidos na tela por `main-error.ts` e em inglês no log; NSIS só com `en_US`/`pt_BR`, pelo idioma do Windows; teclas de símbolo com nome falado para leitor de tela (componente `Kbd`). Decisões `agent-decided` em DECISIONS. Testes: `030-idiomas` 97/97 (+7), `026-estudio` +1 (códigos do main); suíte inteira passou aqui.
**Deixou em:** PR desta branch com `Closes #101`. Não verificado: Windows (diálogos, instalador em pt-BR, leitor de tela) — vai para o bloco v0.7.0. Próxima rodada: mergear este PR quando verde; depois #69 (atualização automática), #73, #94 no v0.7.0.

### 2026-11-15 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-log-hud-ingles`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com issues abertas): #101 (030, `prioridade`) reivindicada. 8º PR da 030: **log e HUD sempre em inglês** — todas as linhas do log (main e renderer: abertura, quedas, captura, beat, Expressividade, presets pesados/pretos/travados, Estúdio, importação), as marcas da abertura (`startup (ms since process start): … first frame …`), o HUD inteiro (inclusive a linha de teclas) e o custo do Estúdio. Os erros do Estúdio saem no idioma do app na tela e em inglês no log (`issueText(i, 'en')` via `msgText`). Motivo de falha da importação de `.milk` vira dado (`Msg`): a interface mostra no idioma do app (o "arquivo maior que 256 KB" fixo em português saiu) e o log em inglês. Testes 024/026/028 atualizados; `030-idiomas` 90/90 (+3: HUD e log em inglês com o app em português, log igual nos dois idiomas).
**Deixou em:** PR desta branch (não fecha a #101; a issue volta a `ready`). Falta na #101 só o P1 (menus/diálogos do main, NSIS, nomes de tecla para leitor de tela; as mensagens de erro lançadas pelo main ainda são em português e chegam assim ao log e à interface — entram no P1). `026-estudio` falha nesta máquina de 2 núcleos no mesmo ponto de antes (Worker recriado passa de 1 s) — o CI decide. Não verificado: Windows (vai para o bloco v0.7.0).

### 2026-11-15 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-idiomas-estudio`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com issues abertas): #101 (030, `prioridade`) reivindicada. 7º PR da 030: migração 7, **Estúdio** — 51 chaves `studio.*` (topo, status, pergunta do nome, prévia, blocos, Problemas, rodapé, Áudio agora). Os erros das equações viram dado (`StudioIssue` no `eel-worker.ts`; `Validator.inspect`/`shaderFailure` no `importer.ts`, sem mudar o texto da importação de `.milk`) e a frase sai no idioma do app ao mostrar (lista "a, b ou c" pelo `Intl.ListFormat`); hora do rodapé pelo `Intl` (`2:32:05 PM` / `14:32:05`); o Estúdio redesenha na troca de idioma. Teste `030-idiomas` 87/87 (+10: Estúdio nos dois idiomas, erro com bloco e linha, hora, nada cortado; preset fixo no teste para não pegar um pesado).
**Deixou em:** PR desta branch (não fecha a #101; a issue volta a `ready`). Falta na #101: log e HUD em inglês (inclui as linhas `estúdio: …` do log e o custo no HUD, que ficaram como estavam) · P1. `026-estudio` falha nesta máquina de 2 núcleos no mesmo ponto (Worker recriado passa de 1 s) e também falhou no `main` aqui — o CI decide. Não verificado: Windows (vai para o bloco v0.7.0).

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-idiomas-setup`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com issues abertas): #101 (030, `prioridade`) reivindicada. 6º PR da 030: migração 6, **Setup e diagnóstico** — 43 chaves `setup.*` (boas-vindas, aviso de silêncio, diagnóstico de captura com as 4 checagens, "Copiar diagnóstico", WebGL 2 indisponível); a tecla Espaço das boas-vindas sai pelo `keyName`. As checagens de captura guardam chaves (`Msg` + `msgText` no `i18n`) e se traduzem ao mostrar; o diagnóstico copiado sai sempre em inglês (`agent-decided`, DECISIONS). Harness: `mockSo` aceita `testFlags` e guarda o `copyText` em `window.__copied`. Teste `030-idiomas` 77/77 (+17: boas-vindas e captura recusada nos dois idiomas, silêncio com troca de idioma ao vivo, WebGL 2, diagnóstico copiado em inglês, nada cortado).
**Deixou em:** PR desta branch (não fecha a #101; a issue volta a `ready`). Falta na #101: Estúdio · log e HUD em inglês · P1. `026-estudio` instável nesta máquina (falha também no `main`) — o CI decide. Não verificado: Windows (vai para o bloco v0.7.0).

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-idiomas-atalhos`
**Fez:** Issue #101 (spec 030), migração 5: painel `?`, a tabela de Configurações › Atalhos e os comandos da busca rápida saem de `shortcuts.ts` com chaves `shortcuts.*` (49 chaves). A tecla Espaço vira `Space`/`Espaço` pelo `keyName`; o filtro do painel e os comandos usam `includesText` (sem acento, no idioma do app: "espaco" acha). Teste `030-idiomas` 60/60 (+12: painel nos dois idiomas, filtro pela tecla traduzida, estado vazio, comandos, nada cortado; a tabela de atalhos agora entra na checagem das Configurações). `020`, `010`, `011`, `024-beat` passam.
**Deixou em:** PR desta branch (não fecha a #101; a issue volta a `ready`). Falta na #101: Setup e diagnóstico (inclui o `<kbd>Espaço</kbd>` de `Diagnostics.tsx`) · Estúdio · log e HUD em inglês (o `hud.ts` ainda tem a linha de teclas em português) · P1. Não verificado: Windows (vai para o bloco v0.7.0).

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — PR #106
**Fez:** Passo 2 da `rodada` (nada em `in-progress`, nenhum bloco em teste, nada do usuário a responder): PR #106 (030, 4º PR: Configurações) verde (`typecheck` + testes headless; `build-windows` pulado), com a tabela de critérios e "Testar no bloco" → mergeado com esta entrada. Não fecha a #101, que segue `ready` + `prioridade` no v0.7.0.
**Deixou em:** `main` com a migração 4 da 030. Nada novo atribuído ao usuário. Próxima rodada: #101 (painel `?` com os rótulos de `shortcuts.ts`, Setup/diagnóstico, Estúdio, log em inglês, P1). Não verificado nesta rodada: só merge, sem código novo.

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-idiomas-configuracoes`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com issues abertas): #101 (030, `prioridade`) reivindicada. 4º PR da 030: migração 4, **Configurações** — 171 chaves `settings.*` (as 8 seções, busca, estado vazio, "Salvo", Biblioteca/importar `.milk`/coleções, Sobre), rótulos iguais aos dos Ajustes reaproveitam `quick.*`; seções com chave em `SECTIONS`; busca das Configurações sem acento nem caixa pelo `includesText` (palavras extras de busca nos dois idiomas); números pelo `Intl` (escala `1,5×`/`1.5×`, `30 s`). Crédito dos meus presets ("based on"/"baseado em") e o autor padrão (`Me`/`Eu`) pelo catálogo (`credit.mine.*`, também no Estúdio). Teste `030-idiomas` +10 itens (48/48). Design `1794607492-78f0` (só a linha Idioma é desenhada; o resto é texto).
**Deixou em:** PR aberto que **não** fecha a #101 (volta a `ready`). Falta: painel `?` (com os rótulos de `shortcuts.ts`, que a tabela de Atalhos das Configurações também usa), Setup/diagnóstico, Estúdio, log em inglês, P1. `026-estudio` e `023-colecoes` instáveis nesta máquina (passam e falham no `main` e na branch) — o CI decide. Não verificado: o app no Windows (vai para o bloco v0.7.0).

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — PR #105
**Fez:** Passo 2 da `rodada` (nada em `in-progress`, nenhum bloco em teste, nada do usuário a responder): PR #105 (030, 3º PR: Biblioteca e busca) verde (`typecheck` + testes headless; `build-windows` pulado), com a tabela de critérios e "Testar no bloco" → mergeado com esta entrada. Não fecha a #101, que segue `ready` + `prioridade` no v0.7.0.
**Deixou em:** `main` com a migração 3 da 030. Próxima rodada: #101 (resto das Configurações, painel `?`, Setup/diagnóstico, Estúdio, log em inglês, P1).

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-biblioteca-busca`
**Fez:** Passo 4 da `rodada` (nada do usuário a responder, nenhum PR aberto, v0.7.0 com issues abertas): #101 (030, `prioridade`) reivindicada. 3º PR da 030: migração 3, **Biblioteca e busca** — 72 chaves `library.*`/`palette.*` (Biblioteca, menu da linha, coleções, estados vazios, busca rápida), abas com chave em `TABS`, `presetsWord` com `tn()` (serve também ao menu de coleção da faixa), segundos das coleções pelo `Intl`. Busca e destaque ignoram acento e caixa no idioma ativo (`findText`/`includesText` no `i18n`: "flêxi" acha Flexi, "musica" acha "Música"); ordem dos presets com `compareText`. Teste `030-idiomas` +8 itens (38/38). Inglês escrito pela rodada (o protótipo só traduz faixa/Ajustes); termos do glossário.
**Deixou em:** PR aberto que **não** fecha a #101 (volta a `ready`). Falta: resto das Configurações, painel `?`, Setup/diagnóstico, Estúdio, log em inglês, P1. `026-estudio` falha neste ambiente também no `main` (compilação passa de 1 s com a máquina lenta) — não relacionado; o CI decide. Não verificado: o app no Windows (vai para o bloco v0.7.0).

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-idiomas-ajustes`
**Fez:** Passo 4 da `rodada`: #101 (030, `prioridade`) reivindicada de novo. 2º PR da 030: migração 2, **Ajustes rápidos** — 45 chaves `quick.*` em `en.ts`/`pt-BR.ts` (inglês do protótipo `1794607492-78f0`, Palco integrado › dicionário PT·EN), compassos com `tn()`, segundos e intervalos pelo `Intl` (`fmtFixed` novo no `i18n`; `secondsText` também serve às Configurações). Teste `030-idiomas` +6 itens (Ajustes em English e pt-BR: título, "4 bars"/"4 compassos", nenhum texto do outro idioma, nada cortado).
**Deixou em:** PR aberto que **não** fecha a #101 (volta a `ready`). Falta: Biblioteca/busca, Configurações, painel `?`, Setup/diagnóstico, Estúdio, log em inglês, P1. O `028-normalizar` falhou uma vez na suíte completa (bumbo simulado sob carga) e passou sozinho — instável, não relacionado. Não verificado: o app empacotado no Windows (vai para o bloco v0.7.0).

### 2026-11-14 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-idiomas-base`
**Fez:** Passo 2 da `rodada` (nada em `in-progress`, nenhum bloco em teste, nada do usuário a responder): PR #103 (030, 1º PR: base de idiomas + faixa, toasts e estados) verde (`typecheck` + testes headless; `build-windows` pulado), com a tabela de critérios e "Testar no bloco" → mergeado com esta entrada. Não fecha a #101, que segue `ready` + `prioridade` no v0.7.0.
**Deixou em:** fila do v0.7.0: #101 (030, próximos PRs: Ajustes rápidos, Biblioteca/busca, Configurações, painel `?`, Setup, Estúdio, log em inglês) → #69 → #73 → #94. Nada novo atribuído ao usuário. Não verificado nesta rodada: só merge, sem código novo.

### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/030-idiomas-base`
**Fez:** Passo 4 da `rodada`: #101 (spec 030, `prioridade`) reivindicada. 1º PR da 030: base de idiomas (`src/renderer/src/i18n/`: `en.ts` fonte, `pt-BR.ts`, `t()`/`tn()`, `fmtNum`/`fmtSeconds` pelo `Intl`), `settings.language` (`auto` padrão), `app:systemLanguage` no main (`app.getPreferredSystemLanguages()`), comando `app.setLanguage` (vale na hora), linha Idioma no topo de Configurações › Geral; migração 1: faixa, assinatura, janela, preset pesado, menu de coleção e todos os toasts. `toLocaleString('pt-BR')` fixos trocados. Teste novo `030-idiomas` (24 itens: idioma pelo Windows, troca na hora e salva, números, nada cortado, chave sem uso); harness simula Windows em pt-BR por padrão. DECISIONS (`agent-decided`: Rest, Mine, "bars"), AGENTS.md.
**Deixou em:** PR aberto que **não** fecha a #101 (volta a `ready` com a lista do que falta: Ajustes, Biblioteca/busca, Configurações, painel `?`, Setup/diagnóstico, Estúdio, log em inglês). Design citado `1794607492-78f0` (o espelho ainda está em `598c`; sincronizar numa rodada). Não verificado: o idioma do Windows real e a troca no app empacotado (vai para o bloco v0.7.0). Notion atualizado.

### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/030-idiomas`
**Fez:** Passo 2 da `rodada` (nada em `in-progress`, nenhum bloco em teste): PR #102 (spec 030, idiomas; só docs, sem checks, sem conflito) mergeado com esta entrada. Issue #101 segue `ready` + `prioridade` no v0.7.0.
**Deixou em:** fila do v0.7.0: #101 (030, `prioridade`) → #69 → #73 → #94. Nada novo atribuído ao usuário. Não verificado: nada de código mudou.

### 2026-11-13 — Claude Code (nuvem, a pedido do usuário) — branch `docs/release-0.6.0`
**Fez:** Passo 1 da `rodada` com o ok do usuário na #91 ("quero liberar essa versão"): release **v0.6.0** publicada pelo workflow `release` na `rc/v0.6.0` (instalador, zip, SHA256SUMS), #91 e milestone v0.6.0 fechados. Lido o log do teste: viraram as issues `backlog` #96 (latência), #97 (Normalizar no teto), #98 (memória do renderer) e #99 (preset preto). README (versão atual e fase 3), spec 028 como feita, DECISIONS. A `rc/v0.6.0` não tem nada fora do `main`; sem PR de volta. Notion atualizado.
**Deixou em:** PR desta branch. Próximo bloco: v0.7.0 (#94, #73, #69 `ready`).

### 2026-11-13 — Claude Code (nuvem, sessão com o usuário) — branch `docs/design-sync-598c`
**Fez:** Passou ao usuário um prompt para o Claude Design desenhar a atualização automática (029) e corrigir a interface da 028. Com o design publicado (`1794603894-598c`), sincronizou o espelho: `Palco integrado`, `Configurações`, docs de navegação, modos, feedback, reatividade e os novos `v3-novidades.md` e `v3-perfis.md`. DIVERGENCIAS 2026-11-11 → aceita com 5 correções. Stub em `queue/`. #69 → `ready` (sem atribuição). Issue nova para as correções da 028.
**Deixou em:** PR de sync. Specs a criar a partir do stub: Perfis, Modos (Simples), Feedback, curva de 16 bandas.
### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `docs/025-p1-desempenho`
**Fez:** Passo 5 da `rodada` (nada `ready`; bloco v0.6.0 esperando o usuário, sem resposta). Issue #73 (spec 025) reavaliada: P0 já entrou no #76; a P1 (desempenho no Windows) foi detalhada na spec — app empacotado, passo extra do `build-windows`, 20 presets fixos, comparação com a execução anterior, sem falhar por número — e a pergunta da devDependency fechada (Playwright segue só no CI, como aprovado). DECISIONS (`agent-decided`). #73 → `ready`, milestone v0.7.0.
**Deixou em:** PR de docs (mergeado se não houver check). Fila: #73 `ready` (v0.7.0); `backlog` #75 (027, 3 perguntas pequenas). Com o usuário: bloco v0.6.0 (#91) e o desenho da #69. Não verificado: nada de código mudou. Notion atualizado.

### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `chore/versao-0.6.0`
**Fez:** Passo 3 da `rodada`: o milestone v0.6.0 ficou sem issues abertas além da #69 (`needs-design`), que foi para o novo milestone v0.7.0 (DECISIONS, `agent-decided`). PR `chore: versão 0.6.0` (`package.json`/lock e `.github/release-notes.md` com o que mudou desde a 0.5.0). Depois do merge: branch `rc/v0.6.0`, build Windows dela e a issue "Testar bloco v0.6.0" (atribuída ao usuário) com o roteiro da 028 (PRs #87 e #89) e uma checagem rápida do resto.
**Deixou em:** bloco v0.6.0 esperando o teste do usuário; nenhuma release criada (só depois do "ok" na issue do bloco). Fila: nada `ready`; `backlog` #73 (025) e #75 (027) para planejar. Notion atualizado.

### 2026-11-13 — Claude Code (nuvem, rodada do ciclo automático) — branch `feat/028-p1-normalizar-viva`
**Fez:** Passo 4 da `rodada`. Primeiro a #69 (spec 029, atualização automática): reivindicada, mas nem o espelho (`42d3`) nem o artefato atual (`1794352628-1d72`) desenham o aviso, a chave e o "Verificar agora" → `needs-design`, atribuída ao usuário com a lista do que falta. Depois a #86 (spec 028 P1): `agc.ts` (Normalizar áudio: RMS antes do ganho em janela de 10 s, ataque 1 s, soltura 8 s, ±12 dB, referência −14 dBFS, congela no silêncio/Respiro), comando `audio.autoGain`, `settings.autoGain`, ganho manual vira ajuste fino ±6 dB; chave nos Ajustes rápidos e em Configurações › Captura com "auto +N dB"; HUD "manual + auto, nível medido" e log. Memória Viva (`live`, 1,7 s) como 4ª do `Shift+X`. Simulador `tests/sim/agc-sim.cjs` + testes `028-agc-sim`, `028-normalizar` e a Viva no `028-expressividade`. DECISIONS (`agent-decided`) e DIVERGENCIAS (como ficou sem desenho).
**Deixou em:** PR aberto com `Closes #86`. Não verificado: nível real, sensação do AGC, fps e a Viva contra a Curta (critérios 7–9, vão para o bloco v0.6.0). Nesta nuvem, o 026 falha também no `main` (ambiente, limite de 1 s por quadro) e o 023/024 oscilam na suíte inteira e passam sozinhos. O design mudou (`42d3` → `1d72`, perfis): sincronizar numa rodada. Notion atualizado.

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
