# 007 — Spike: SoundCloud como fonte

**Fase:** 3 (fontes) · **Status:** A fazer · **Issue:** [#20](https://github.com/atempel/sonic-obsidian/issues/20) · **Depende de:** conta Artist Pro do usuário para gerar as chaves

## Problema
O design prevê colar uma URL do SoundCloud e ver o visual reagir àquela faixa. A viabilidade é incerta:
- desde mai/2026 as chaves da API só saem para assinantes **Artist Pro**;
- os streams agora são **HLS AAC** (os MP3 progressivos foram desligados no fim de 2025), então tocar exige `hls.js`;
- a documentação não diz se os segmentos têm **CORS**; sem CORS, o `MediaElementSource` entrega silêncio ao analisador;
- os termos exigem crédito e link para a faixa, proíbem download, cache além da sessão e *stream capture*, e limitam o uso por `client_id`.

## Proposta
Testar, em ordem, os dois caminhos com uma faixa pública, e decidir.

## Escopo
**P0**
- **Caminho A (API):** no main process, trocar `client_id`/`client_secret` por token (client credentials; segredo só no main, lido de um arquivo local fora do repo). Resolver a URL (`/resolve`), pegar `/tracks/{id}/streams`, tocar o HLS AAC no renderer com `hls.js` num `<audio>` → `MediaElementSource` → ganho → Butterchurn **e** → `ctx.destination` (o usuário precisa ouvir). Verificar se o analisador recebe sinal (CORS).
- **Caminho B (widget):** a página do player oficial (Widget API) numa `BrowserView`/`<webview>` dentro do app, com o visual analisando o loopback do sistema, como hoje. Controlar play/pausa/progresso pela Widget API.
- Em ambos: título, artista e link "Ouvir no SoundCloud" visíveis enquanto toca; nada gravado em disco.

**P1**
- Faixas `preview` (30 s) e `blocked`: mensagem clara.
- Playlist pública: tocar em sequência.

## Fora de escopo
Interface final da fonte (Fase 2/3), login do usuário no SoundCloud, curtidas/playlists privadas.

## Critérios de aceite
1. Uma das duas rotas toca uma faixa pública colada por URL e o visual reage a ela.
2. Registrado em DECISIONS.md: qual caminho, por quê, e o que os termos permitem para cada um.
3. Nenhum segredo no repo, no Notion ou no bundle do renderer.

## Perguntas a responder
- CORS dos segmentos HLS permite análise? (se não: caminho B, ou desistir)
- O limite de reproduções/dia por app é aceitável para uso pessoal?
- Com o caminho B, o loopback analisa o áudio do sistema inteiro (notificações, outros apps) — aceitável?

## Referências
- [developers.soundcloud.com/docs/api/guide](https://developers.soundcloud.com/docs/api/guide), [streaming URLs (2025)](https://developers.soundcloud.com/blog/api-streaming-urls), [terms of use](https://developers.soundcloud.com/docs/api/terms-of-use), [HTML5 widget](https://developers.soundcloud.com/docs/html5-widget)
- [docs/architecture.md](../architecture.md#4-fontes-de-áudio)
