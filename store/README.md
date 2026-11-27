# Microsoft Store — imagens e textos da ficha

Tudo aqui é refeito por script. O conteúdo de cada imagem é o app renderizando presets de verdade; por cima entram só texto, marca e moldura.

| Pasta / arquivo | O que é | No git? |
|---|---|---|
| `raw/` | Capturas cruas do app (`scripts/store-capture/capture.cjs`) | não (pesado) |
| `presets.json` | Presets escolhidos para as capturas (o primeiro vai na capa) | sim |
| `compose.json` | Quais capturas cruas entram em cada imagem | sim |
| `copy.json` | Textos das imagens em `en` e `pt-BR` | sim |
| `listing/en/`, `listing/pt-BR/` | As 6 imagens, `-3840x2160.png` e `-1920x1080.png` | não (~50 MB; refeitas pelo script, a versão enviada à Store fica com o usuário) |
| `listing/logos/` | Box art 1:1 (1080 e 2160) e pôster 2:3 (720×1080 e 1440×2160) | não (idem) |
| `listing/LISTING.md` | Descrição, recursos, legendas, palavras-chave, privacidade | sim |
| `listing/preview.html` | Contato com todas as imagens lado a lado | sim |

## Refazer

```bash
npm run build
node scripts/store-capture/capture.cjs frames --scale 2          # quadros dos presets em 4K → raw/3840x2160/presets/
node scripts/store-capture/capture.cjs screens --lang en --scale 2
node scripts/store-capture/capture.cjs screens --lang pt-BR --scale 2
node scripts/store-capture/compose.cjs all                       # imagens, logos e preview.html
```

Para escolher presets novos: `node scripts/store-capture/capture.cjs sweep --presets lista.json` grava um quadro pequeno de cada um em `raw/sweep/` com um `contato.html`.

### Como a captura funciona
- O renderer compilado (`out/renderer`) abre no Chromium do Playwright com o mesmo `window.so` simulado dos testes headless (`tests/headless/harness.cjs`). Janela 1920×1080 a 200 % = 3840×2160, como um monitor 4K no Windows; sem cursor e sem moldura.
- O áudio é uma faixa sintetizada pelo próprio script (`scripts/store-capture/music.cjs`, 124 BPM: subida, drop, respiro, virada), entregue no lugar do `getDisplayMedia`. Sem música de terceiros, sem nome de faixa.
- "Pico" = no drop, até 120 ms depois do bumbo, com energia de graves alta; "calmo" = no respiro. A energia e o compasso de cada quadro ficam no `manifest.json`.
- Na nuvem o WebGL é por software (SwiftShader): ~1 quadro/s em 4K, por isso o aquecimento é de ~70 s por preset antes do primeiro quadro. Os presets de realimentação acumulam menos quadros que a 60 fps; o resultado é o preset de verdade, mas no Windows com GPU (o mesmo script, Playwright Chromium) a captura fica mais fiel ao que o usuário vê.
