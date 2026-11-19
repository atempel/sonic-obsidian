# 032 — Sincronia do visual com o som

**Fase:** 5 — Extras (reatividade) · **Status:** Planejada (rodada 2026-11-19, `agent-decided`) · **Issue:** [#96](https://github.com/atempel/sonic-obsidian/issues/96) · **Milestone:** v0.10.0 · **Personas:** Nostálgico do Winamp (TV por HDMI, fone Bluetooth: o som chega depois do visual), DJ de Festa (projetor e caixa do local com atraso próprio)

## Problema
No teste do bloco v0.6.0 (#91, item 3) o usuário viu "às vezes o visual alguns milissegundos dessincronizado com a música". Não sabemos o tamanho nem o sentido do atraso, e o app não mostra nada que ajude a descobrir.

O caminho do som até a tela tem duas metades:
- **Antes do app** (o visual fica **atrás** do som): captura loopback do Windows/Chromium, janela de análise do Butterchurn (1024 amostras, `smoothingTimeConstant` 0 → ~10 ms no meio da janela), desenho e apresentação (1–3 quadros; com limite de 30 fps, até 33 ms a mais).
- **Depois do loopback** (o visual fica **à frente** do som): o loopback lê a mixagem antes do dispositivo de saída. Fone Bluetooth (150–250 ms), TV por HDMI com processamento, Voicemeeter ou outro roteador somam atraso que o app não vê.

Com captura ao vivo, o app **não pode adiantar a reação** ao som: não existe o som antes de ele ser capturado. A spec 024 já adianta o que é previsível (o ponto de beat e as trocas, "Adiantar o visual", 70 ms). O que dá para fazer é **medir** o atraso de dentro do app e **atrasar** o visual quando ele está à frente.

## Proposta
1. **Medir:** uma linha `sync` no HUD (`Ctrl+Shift+D`) e uma linha `[sync]` no log com as partes do atraso que o app conhece, para o próximo relato vir com números.
2. **Atrasar o visual:** controle em Configurações › Captura, de 0 a 500 ms, que atrasa o som que alimenta tudo o que desenha (Butterchurn, batida, medidor), para quem ouve por Bluetooth, TV ou roteador de áudio.
3. **(P1) Medir a captura:** comando da busca que toca um clique curto e mede quanto ele leva para voltar pelo loopback.

## Escopo
### P0 — medir
- HUD, linha `sync` (inglês, como o resto do HUD): `capture <n> ms` (`audioTrack.getSettings().latency` × 1000, se o Chromium informar; senão `?`), `ctx <n> ms` (`AudioContext.baseLatency`), `window 11 ms` (metade da janela do Butterchurn na taxa real), `frame <média>/<p95> ms` (intervalo entre quadros desenhados nos últimos 5 s), `cap <fps|monitor>`, `delay <n> ms` (o ajuste abaixo), `lead <n> ms` (o da 024) e `est <n> ms` = soma do que o app conhece (captura + ctx + janela + 1,5 quadro + delay).
- Log: uma linha `[sync]` com os mesmos campos quando a captura começa e a cada 5 min, junto da linha `[mem]`; mais `frame p95` e o maior intervalo entre quadros desses 5 min (os "às vezes" costumam ser quedas de fps).

### P0 — atrasar o visual
- Configuração nova `visualDelayMs` (0–500, passo 10, padrão 0) em `settings.json`, com comando `audio.visualDelay` no núcleo (spec 008) e sanitização como os outros números.
- No grafo de áudio, um `DelayNode` (`maxDelayTime` 1 s) **logo depois da fonte**, antes do ramo de silêncio/batida e do ganho: tudo o que desenha anda junto e a batida continua alinhada com a reação. O "Adiantar o visual" da 024 segue valendo em cima do sinal atrasado (não se misturam).
- Mudar o valor durante a música não dá estalo nem buraco visível (o `delayTime` muda com rampa de 50 ms).
- Configurações › Captura, grupo novo **"Sincronia"** abaixo de "Nível", uma linha com o `Rng` que já existe: "Atrasar o visual" — ajuda: "Para fone Bluetooth, TV ou roteador de áudio: o som chega depois do que o app captura. Aumente até o visual bater com o que você ouve." Palavras da busca: `latência latency atraso delay sincronia sync bluetooth hdmi`. Textos em `en.ts`/`pt-BR.ts` (spec 030).
- Os Ajustes rápidos não ganham nada (é ajuste de uma vez por saída de som).

### P1 — medir a captura
- Comando na busca "Medir atraso da captura": toca, por um `AudioContext` à parte ligado à saída, um clique de 10 ms a −20 dBFS e procura o pico no ramo antes do `DelayNode` (relógio do áudio, como a 024). Três cliques, mediana. Toast com o resultado ("Captura: 42 ms") e linha `[sync] measured capture …` no log; sem pico em 1 s → toast "Não deu para medir: o som do sistema está mudo ou muito alto".
- Não mede o atraso depois do loopback (Bluetooth/TV); o toast não promete isso.

## Fora de escopo
- Adiantar a reação ao som (impossível com captura ao vivo; o que dá para prever já está na 024).
- Descobrir sozinho o atraso do dispositivo de saída (Windows não expõe isso para o loopback do Chromium; fica para a "Seleção de dispositivo de saída" do PRD).
- Trocar o `AudioContext` de `latencyHint` ou mexer no `fftSize` do Butterchurn sem medir antes (pode virar spec depois, com os números do P0).
- Perfis de atraso por dispositivo de saída (o app só ouve a saída padrão).

## Critérios de aceite
1. Com o HUD aberto e música tocando, a linha `sync` mostra os oito campos e o `frame` muda quando se troca o limite de fps (60 → 30: média perto de 33 ms).
2. O log tem uma linha `[sync]` logo depois da captura começar e outra a cada 5 min.
3. Configurações › Captura › Sincronia › "Atrasar o visual" vai de 0 a 500 ms em passos de 10; o valor fica salvo ao reabrir o app; a busca acha a linha por "bluetooth" e por "latency".
4. Com 300 ms, uma batida seca (metrônomo) aparece no visual e no ponto de beat cerca de 300 ms depois do som nas caixas; voltando a 0, a reação volta a ser imediata. Mudar o valor com música não congela nem pisca o visual.
5. Com fone Bluetooth (ou Voicemeeter), dá para achar um valor em que o visual bate com o que se ouve.
6. Com o atraso em 0, nada muda em relação à v0.9.0 (mesmo fps, mesma reação).
7. (P1) "Medir atraso da captura" na busca mostra um número entre 5 e 200 ms em três execuções seguidas, com variação menor que 20 ms; com o som do sistema mudo, mostra o aviso.

Headless (CI): 1 e 3 (HUD com `getDisplayMedia` simulado; comando, sanitização e persistência), e o critério 4 lendo o `delayTime` aplicado de volta pelo HUD. Os critérios 4–7 com som e tela de verdade vão para o roteiro do bloco.

## Decisões tomadas no planejamento (`agent-decided`, revisar no bloco)
- **Só atrasar, de 0 a 500 ms, padrão 0** (Bluetooth chega a ~250 ms; TV com processamento pode passar disso). Opção recomendada; a outra seria um controle de −200 a +500 que juntasse o "Adiantar o visual" da 024, mas o lado negativo só valeria para batida e trocas e confundiria.
- **Em Configurações › Captura**, não em Visual: o atraso depende da saída de som, não do preset. O protótipo não tem a linha; entra com os componentes que já existem e uma entrada em `docs/design/v3/DIVERGENCIAS.md`, como a "Adiantar o visual" da 024.
- **`DelayNode` antes de tudo** (inclui o medidor e o "Testar captura"): um atraso só, sem casos em que a batida e a reação andem separadas.

## Perguntas em aberto
- Nenhuma que bloqueie. Se o critério 7 mostrar captura acima de ~60 ms, abrir spec para baixar o atraso do lado do app (`latencyHint`, buffer da captura).

## Referências
- Relato: #91 (bloco v0.6.0, item 3); issue #96.
- Spec 024 (batida, "Adiantar o visual", relógio do áudio em `src/renderer/src/beat.ts`); spec 028 (Normalizar, onde fica o medidor); spec 012 (HUD, log `[mem]`).
- Grafo de áudio: `src/renderer/src/main.ts` (fonte → ganho → Butterchurn; ramos `preGain`, `beatTap`, `meter`); captura em `src/renderer/src/capture.ts`.
- Butterchurn 3: analysers com `fftSize` 1024 e `smoothingTimeConstant` 0 (lido de `node_modules/butterchurn/dist/butterchurn.js`).
- Design: Configurações › Captura em `docs/design/v3/prototype/` (versão `1794603894-598c`, `SYNC.md`); sem linha de sincronia no protótipo.
