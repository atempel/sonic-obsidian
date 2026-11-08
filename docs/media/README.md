# Mídia

Imagens usadas no README e na divulgação. Tudo aqui é captura real do app ou do Butterchurn: nada de imagem gerada ou simulada.

| Arquivo | O que é | Origem |
|---|---|---|
| `banner.jpg` | Banner do README: lockup branco sobre um quadro escurecido do preset *Geiss, Flexi + Stahlregen - Thumbdrum Tokamak [crossfiring aftermath jelly mashup]* | Quadro real do Butterchurn |
| `app-palco.jpg` | Palco com a faixa de controle. Preset: *bombyx mori - Ft Flexi - AdamFX - StahlRegen - Krash…* | Build do app em Chromium headless (SwiftShader), `window.so` e áudio simulados (sinal de teste sintetizado) |
| `app-library.jpg` | Biblioteca aberta sobre o visual. Preset: *disco mix, lodus, geiss, ludicrous speed, flexi, aderrasi…* | Idem |
| `social-preview.jpg` | Imagem de prévia social do repo (1280×640), para *Settings → Social preview* no GitHub | Mesmo quadro do banner |
| `preset-*.jpg` | Quadros de presets, recorte quadrado 640 px | Butterchurn 2.6.7 + butterchurn-presets 2.4.7, faixa de teste sintetizada |

## Créditos dos presets
O nome de cada preset traz os autores. Ao publicar estas imagens, cite o preset.

- `preset-aderrasi-potion-of-spirits.jpg` — Aderrasi - Potion of Spirits
- `preset-martin-liquid-arrows.jpg` — Martin - liquid arrows
- `preset-orb-waaa.jpg` — ORB - Waaa
- `preset-rovastar-loadus-geiss-fractaldrop-triple-mix.jpg` — Rovastar + Loadus + Geiss - FractalDrop (Triple Mix)
- `preset-geiss-flexi-martin-disconnected.jpg` — Geiss + Flexi + Martin - disconnected
- `preset-geiss-flexi-stahlregen-thumbdrum-tokamak-crossfiri.jpg` — Geiss, Flexi + Stahlregen - Thumbdrum Tokamak [crossfiring aftermath jelly mashup]

## Atualizar os prints da interface
Com a interface mudando a cada spec, os prints envelhecem. Para refazer: `npm run build`, servir `out/renderer/`, abrir no Chromium headless (Playwright) com `--use-angle=swiftshader --enable-unsafe-swiftshader`, simular `window.so` e `getDisplayMedia` (um `AudioContext` com osciladores) num init script, viewport 1600×900. `L` abre a Biblioteca; `→` troca de preset até achar um quadro bom.
