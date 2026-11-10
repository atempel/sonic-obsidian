# Avisos de terceiros — Sonic Obsidian

O Sonic Obsidian é construído sobre software livre. Este arquivo acompanha o app (é copiado para a pasta do build) para cumprir as licenças das dependências que vão empacotadas dentro dele.

## Butterchurn e butterchurn-presets
O motor visual é o [Butterchurn](https://github.com/jberg/butterchurn), de Jordan Berg — uma implementação em WebGL do MilkDrop 2, criado por Ryan Geiss (Nullsoft). Os presets vêm de [butterchurn-presets](https://github.com/jberg/butterchurn-presets) e são obras de artistas da comunidade MilkDrop; o nome de cada preset carrega o crédito do autor.

Muito obrigado a Jordan Berg, a Ryan Geiss e a todos os autores de presets.

- butterchurn 3.0.0-beta.5 — MIT (no app)
- butterchurn-presets 3.0.0-beta.4 — MIT (no app)
- butterchurn 2.6.7 e butterchurn-presets 2.4.7 — MIT (só na landing, em `site/vendor/`)

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

## Dependências de runtime desses pacotes
- eel-wasm 0.0.16 — MIT, Copyright (c) Jordan Eldredge (compila as equações dos presets para WebAssembly)
- @assemblyscript/loader 0.17.14 — Apache-2.0, Copyright (c) Daniel Wirtz / The AssemblyScript Authors (texto da licença em https://www.apache.org/licenses/LICENSE-2.0)
- @babel/runtime — MIT, Copyright (c) 2014-present Sebastian McKenzie and other contributors
- ecma-proposal-math-extensions 0.0.2 — MIT
- Só na landing (empacotados no butterchurn-presets 2.4.7): babel-runtime 6.26.0, core-js 2.6.12, regenerator-runtime 0.11.1, lodash 4.x — MIT

## Conversor de presets `.milk`
- milkdrop-preset-utils 0.2.1 — MIT, Copyright (c) Jordan Berg
- hlslparser-js 0.1.1 — MIT, Copyright (c) Jordan Berg (port em WebAssembly/Emscripten do hlslparser da Thekla, MIT)

As licenças MIT acima têm o mesmo texto reproduzido no início deste arquivo, com o respectivo aviso de copyright.

## Preact
[Preact](https://preactjs.com/) 11 (MIT) — Copyright (c) 2015-present Jason Miller. Licença MIT, mesmo texto reproduzido acima.

## Ícones Lucide
Alguns ícones do [Lucide](https://lucide.dev/) (lucide-static 0.460.0) foram copiados para `src/renderer/src/ui/icons.tsx`.

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Fontes Space Grotesk e JetBrains Mono
Embutidas no app pelos pacotes `@fontsource/space-grotesk` e `@fontsource/jetbrains-mono`, sem modificação.
- Space Grotesk — Copyright 2020 The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk)
- JetBrains Mono — Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)

Ambas sob a SIL Open Font License, versão 1.1:

```
-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

## Músicas da demo da landing (`site-media/`)
Usadas só na demo da landing page (`site/`), sob a licença do [Uppbeat](https://uppbeat.io/user-agreement). **Não fazem parte da licença MIT deste repositório** e não podem ser redistribuídas como arquivos avulsos; por isso o repo guarda só versões criptografadas (`site-media/*.enc`), que o deploy do GitHub Pages decifra com o segredo `SITE_AUDIO_KEY`.
- Music: '24 Hrs In Tokyo' by Yawnathan on #Uppbeat — https://uppbeat.io/c/yawnathan — License code: JRWREVSGEWOWW0HZ
- Music: 'Space Dancers' by 2050 on #Uppbeat — https://uppbeat.io/c/2050-music — License code: VOEBYATB1RJXUOBF

## Electron
O app roda no [Electron](https://www.electronjs.org/) (MIT) e no Chromium; as licenças deles são incluídas pelo próprio Electron na pasta do app (`LICENSE.electron.txt`, `LICENSES.chromium.html`).
