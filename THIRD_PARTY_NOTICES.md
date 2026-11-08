# Avisos de terceiros — Sonic Obsidian

O Sonic Obsidian é construído sobre software livre. Este arquivo acompanha o app (é copiado para a pasta do build) para cumprir as licenças das dependências que vão empacotadas dentro dele.

## Butterchurn e butterchurn-presets
O motor visual é o [Butterchurn](https://github.com/jberg/butterchurn), de Jordan Berg — uma implementação em WebGL do MilkDrop 2, criado por Ryan Geiss (Nullsoft). Os presets vêm de [butterchurn-presets](https://github.com/jberg/butterchurn-presets) e são obras de artistas da comunidade MilkDrop; o nome de cada preset carrega o crédito do autor.

Muito obrigado a Jordan Berg, a Ryan Geiss e a todos os autores de presets.

- butterchurn 2.6.7 — MIT
- butterchurn-presets 2.4.7 — MIT

```
MIT License

Copyright (c) 2013-2018 Jordan Berg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

(O texto de licença de `butterchurn-presets` é idêntico: MIT, Copyright (c) 2013-2018 Jordan Berg.)

## Dependências de runtime desses pacotes (todas MIT)
- @babel/runtime — Copyright (c) 2014-present Sebastian McKenzie and other contributors
- babel-runtime 6.26.0 — Copyright (c) 2014-2017 Sebastian McKenzie
- core-js 2.6.12 — Copyright (c) 2014-2020 Denis Pushkarev
- regenerator-runtime 0.11.1 — Copyright (c) 2014-present, Facebook, Inc.
- lodash 4.x — Copyright OpenJS Foundation and other contributors
- ecma-proposal-math-extensions 0.0.2 — MIT

Todas sob a licença MIT, cujo texto é o mesmo reproduzido acima com o respectivo aviso de copyright.

## Electron
O app roda no [Electron](https://www.electronjs.org/) (MIT) e no Chromium; as licenças deles são incluídas pelo próprio Electron na pasta do app (`LICENSE.electron.txt`, `LICENSES.chromium.html`).
