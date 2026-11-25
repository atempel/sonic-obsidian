# 045 — Queda do contexto WebGL do motor principal detectada e recarregada

**Fase:** 3 (robustez, ajuste da 012) · **Status:** implementada (critérios 1–4 no headless `045-contexto-webgl`; 5 no bloco) · **Issue:** [#130](https://github.com/atempel/sonic-obsidian/issues/130) · **Milestone:** v0.12.0 · **Personas:** — (nada muda na tela; só a recuperação e o log)

## Problema
Achado na spec 027 (fatia 4). O Butterchurn 3 desenha num `OffscreenCanvas` interno (`this.internalCanvas.getContext("webgl2")` no construtor do `Visualizer`, `node_modules/butterchurn/dist/butterchurn.js`) e copia cada quadro para o canvas da página com um contexto **2D** (`outputGl = canvas.getContext('2d')`). O `src/renderer/src/main.ts` escuta `webglcontextlost` no canvas da página, que nunca tem contexto WebGL: depois de um reinício do driver de vídeo (TDR) ou de falta de memória na GPU, o app não registra a queda nem recarrega, e o visual congela no último quadro (ou fica preto) com a interface funcionando.

Conferido no Chromium headless (rodada de 2026-11-24): `OffscreenCanvas` dispara `webglcontextlost` (cancelável) quando o `WEBGL_lose_context` derruba o contexto. O segundo motor do Estúdio (027, "Comparar com o original") já escuta no lugar certo (`v.gl?.canvas`, getter `PresetVisualizer.gl`).

De quebra: a linha do log diz `reloading in 1.5 s`, mas o `setTimeout` está sem tempo (recarrega na hora).

## Proposta
- Em `main.ts`, trocar o ouvinte do canvas da página pelo do contexto do motor: `viz.gl?.canvas.addEventListener('webglcontextlost', …)`, com `preventDefault()`, a linha no log e o recarregamento como hoje. O ouvinte do canvas da página sai (é código morto).
- O recarregamento espera de fato 1,5 s (`setTimeout(…, 1500)`), como o log diz: dá tempo de a linha chegar ao arquivo pelo IPC antes de a página sumir.
- A linha do log ganha o número da queda na sessão do app, para um laço de quedas aparecer no log: `WebGL context lost (#N this session); reloading in 1.5 s`. O contador fica em `sessionStorage` (sobrevive ao `location.reload()`, zera ao fechar o app).
- `viz.gl` nulo (versão do motor sem o campo): log `WebGL context loss not watched (engine has no gl)` uma vez na abertura, para a falta não passar despercebida numa troca de versão do Butterchurn.
- O segundo motor do Estúdio continua como está (desliga o Comparar sem recarregar; 027, A19).

## Escopo
**P0** — ouvinte no contexto do motor, espera de 1,5 s, contador no log, aviso de `gl` nulo; teste headless `045-contexto-webgl`.

## Fora de escopo
- Recriar o motor sem recarregar a página (`webglcontextrestored`): o recarregamento já devolve o estado salvo e é o que a 012 pede.
- Trava contra laço de recarregamento: o contador no log mostra o caso; se o Chromium bloquear o WebGL depois de quedas seguidas da GPU, a abertura cai na tela "WebGL 2 indisponível" da 012. Uma trava entra se o log de um bloco mostrar laço (ver Perguntas).
- Perda do contexto 2D do canvas da página (`contextlost` do canvas 2D, rara e sem relação com o TDR do WebGL).
- Qualquer mudança visual.

## Critérios de aceite
1. Derrubando o contexto WebGL do motor principal (`WEBGL_lose_context` no contexto interno), o log registra `WebGL context lost (#1 this session); reloading in 1.5 s` e a página recarrega depois de ~1,5 s (não antes de 1 s), voltando a desenhar o mesmo preset (último preset salvo).
2. Uma segunda queda depois do recarregamento registra `#2`.
3. Com o Estúdio aberto em "Comparar com o original", derrubar o contexto do **segundo** motor continua só desligando o Comparar, sem recarregar (027, A19, sem mudança).
4. Abrindo o app normalmente, não há linha `not watched` no log.
5. **Windows (bloco):** com um TDR de verdade (ou `dxcap -forcetdr`, se disponível), o log traz a linha da queda e o app volta a desenhar sozinho.

## Verificação
Teste headless `045-contexto-webgl` (critérios 1–4: captura o contexto do `OffscreenCanvas` como o `027-estudio-comparar`, derruba, espera a navegação e o `mark('engine')` de novo, lê o log simulado; o `sessionStorage` sobrevive ao `reload` no Chromium). O 027 segue passando sem mudança. Critério 5: teste do bloco no Windows.

## Perguntas em aberto
- ~~Trava contra laço de recarregamento agora?~~ Decidido pela rodada (`agent-decided`, DECISIONS 2026-11-24): não; só o contador no log. Reversível.

## Referências
- Issue #130; spec 012 (robustez: falhas do WebGL), spec 027 (fatia 4, `PresetVisualizer.gl`, A19 do `027-estudio-comparar`).
- `src/renderer/src/main.ts` (ouvinte atual), `src/renderer/src/visualizer.ts` (`get gl`).
