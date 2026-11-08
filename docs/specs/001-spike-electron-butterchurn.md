# 001 — Spike: Electron + Butterchurn + loopback

**Fase:** 0 · **Status:** A fazer · **Issue:** (criar ao iniciar)

## Problema
Toda a stack nova depende de uma suposição: que um app Electron no Windows consegue capturar o áudio do sistema por loopback e alimentar o Butterchurn a 60 fps. Se isso falhar, o plano muda. Precisa ser provado antes de qualquer interface.

## Proposta
O menor app possível: uma janela Electron, sem UI, que ao abrir já mostra um preset do Butterchurn reagindo ao que está tocando no Windows.

## Escopo
**P0**
- Projeto Electron + Vite + TypeScript em `src/` com `npm run dev` funcionando no Windows.
- No main process: `session.defaultSession.setDisplayMediaRequestHandler` respondendo `{ video: <primeira tela de desktopCapturer.getSources>, audio: 'loopback' }`.
- No renderer: `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })`, parar as tracks de vídeo, `createMediaStreamSource` → `GainNode` → `visualizer.connectAudio()`.
- Butterchurn com `butterchurn-presets` carregando um preset aleatório; tecla `Espaço` = próximo aleatório com blend de 2 s.
- Canvas ocupando a janela, redimensionando com `setRendererSize`.
- Contador de fps no console (ou num canto) para medir.
- Workflow do GitHub Actions em `windows-latest` que, a cada push na branch, gera o app Windows portátil (pasta/zip, sem instalador, sem assinatura) e publica como artifact — é assim que o usuário testa, sem Node no host (ver DECISIONS, 2026-11-08 — Ambiente de dev).
- Typecheck rodando no CI (e na nuvem) para pegar erro antes do build Windows.

**P1**
- `F11` alterna fullscreen.
- Teste: o áudio continua saindo pelos alto-falantes normalmente enquanto captura (não pode silenciar o sistema — usar `'loopback'`, nunca `'loopbackWithMute'`).

## Fora de escopo
Overlay, navegador de presets, persistência, empacotamento.

## Critérios de aceite
1. Com música tocando no Spotify/YouTube, o visual reage em até 3 s após abrir o app, sem nenhum clique ou diálogo.
2. Pausar a música → visual entra em repouso; voltar → reage de novo.
3. 60 fps (±5) em tela cheia na máquina principal com 3 presets diferentes.
4. Funciona com fone Bluetooth/USB definido como saída padrão (registrar resultado se não funcionar).

## Perguntas a responder (registrar respostas em DECISIONS.md)
- O handler de display media evita mesmo o seletor de tela, ou aparece algum diálogo?
- Qual o custo de CPU da track de vídeo enquanto ativa, e ela pode ser parada sem derrubar o áudio?
- ~~Ambiente de dev~~ — respondida: nuvem + build Windows pelo CI (DECISIONS, 2026-11-08).
- Vite + electron (qual template: `electron-vite`, Electron Forge + Vite)? Escolher o mais simples que rode.

## Referências
- Electron — `session.setDisplayMediaRequestHandler` e `desktopCapturer` (docs oficiais)
- Butterchurn — README (API: `createVisualizer`, `connectAudio`, `loadPreset`, `setRendererSize`, `render`)
- Pipeline FFT/beat da v1: [docs/research/python-pyaudiowpatch-visualizer.md](../research/python-pyaudiowpatch-visualizer.md)
