# Microsoft Store — o que preencher no envio

Respostas prontas para a submissão no Partner Center (primeira versão: 0.11.0). Complementa o [guia da Store](microsoft-store.md). As seções seguem a ordem da página **Submission** do Partner Center. Nas listagens, os limites de caracteres são da Microsoft; os textos abaixo já cabem neles.

## 1. Pricing and availability

| Campo | Resposta |
|---|---|
| Markets | Todos (padrão) |
| Visibility | **Public audience** · *Make this product available and discoverable in the Store* |
| Schedule / Publish date | Ver "Submission options" (seção 6): segurar a publicação depois da certificação |
| Pricing | **Free** |
| Free trial | No free trial |
| Sale pricing | nada |

## 2. Properties

| Campo | Resposta |
|---|---|
| Category | **Music** (subcategoria: nenhuma) |
| Privacy policy URL | `https://atempel.github.io/sonic-obsidian/privacy/` |
| Website | `https://atempel.github.io/sonic-obsidian/` |
| Support contact info | `https://github.com/atempel/sonic-obsidian/issues/new/choose` (ou o seu e-mail, se preferir) |
| Game settings | não se aplica (não é jogo) |
| Display mode | deixar como está |

**Product declarations** (só marcar o que é verdade):
- ☐ This app allows users to make purchases… → **não**
- ☐ This app has been tested to meet accessibility guidelines → **não** (não fizemos o teste formal)
- ☑ Customers can install this app to alternate drives or removable storage → **sim** (padrão)
- ☑ Windows can include this app's data in automatic backups to OneDrive → **sim** (padrão)
- ☐ This app depends on non-Microsoft drivers or NT services → **não**
- ☐ Pen / touch / Xbox / etc. → **não**

**System requirements:**
- Minimum › Graphics: **DirectX 11** (o WebGL 2 do Chromium roda sobre o Direct3D 11).
- Minimum › Memory: **4 GB**. Recommended › Memory: **8 GB**.
- O resto em branco.

## 3. Age ratings (questionário IARC)

- E-mail: o seu.
- Category: **"All Other App Types"** (não é jogo, rede social, navegador nem loja).
- Respostas: **No** para tudo — violência, medo, sexualidade, linguagem, drogas, apostas, interação entre usuários, compartilhar localização, dados pessoais compartilhados com terceiros, compras digitais, acesso irrestrito à internet (os links do app abrem páginas específicas do GitHub no navegador do sistema; o app não tem navegador próprio).
- Classificação esperada: livre (3+ / Everyone).

## 4. Packages

- Enviar `SonicObsidian-Store-x64.msix` (artifact `sonic-obsidian-msix-61da9d8…` do workflow `msix` na `rc/v0.11.0`).
- Device families: **Windows 10/11 Desktop** (marcado sozinho pelo pacote; desmarcar Xbox/Holographic/Team se aparecerem).
- O pacote declara **en-US** e **pt-BR**: o Partner Center cria uma listagem para cada idioma (seção 5).

## 5. Store listings

Preencher **English (United States)** e **Português (Brasil)**. Os dois usam as mesmas capturas.

### Screenshots (Desktop)

PNG, 1366×768 ou maior: `1-palco-1600x900.png` e `2-biblioteca-1600x900.png` (gerados de `docs/media/app-palco.jpg` e `app-library.jpg`). Textos de legenda (opcional, 200 caracteres):
- en: *The Stage: the visual fills the window; the control strip appears only when you need it.* / *The Library: search 395 community presets by name or author, with favorites and collections.*
- pt-BR: *O Palco: o visual ocupa a janela; a faixa de controles só aparece quando você precisa.* / *A Biblioteca: busque entre 395 presets da comunidade por nome ou autor, com favoritos e coleções.*

Store logos, trailers, imagens de destaque: opcionais, deixar em branco.

### Product name
`Sonic Obsidian` (já reservado).

### Description — English

```
Sonic Obsidian turns whatever your PC is playing — Spotify, YouTube, a game, a DAW — into live, music-reactive visuals. It brings back the experience of Winamp's MilkDrop: open it, play something, and the screen comes alive. No setup, no virtual cable, no microphone.

It runs Butterchurn, a WebGL 2 implementation of MilkDrop 2, with 395 presets made by artists of the MilkDrop community. Every preset keeps its authors' names.

• Zero setup: the app listens to the system audio output and starts reacting in about two seconds.
• The Stage: frameless window or clean fullscreen; the controls hide on their own.
• Quick search and Library: find any preset by name or author; favorites, recents and collections.
• Transitions you choose, auto-rotation, and preset changes on the beat.
• Expressiveness: decide how strongly the visual reacts, its character and memory; a 16-band frequency curve picks which frequencies drive it.
• Normalize audio: quiet and loud tracks move the visuals alike, without changing what you hear.
• Profiles: save combinations of settings and switch with Alt+1…9.
• Preset Studio: edit parameters, waves, shapes, equations, shaders or the .milk code in a live preview; import and export .milk files.
• Simple mode for a shorter interface, and every action on the keyboard (press ? to see them all).
• English and Portuguese (Brazil).

Privacy: the audio is analyzed on your PC and never recorded or sent anywhere. No account, no ads, no telemetry.

Photosensitivity warning: the visuals include flashing lights and rapid patterns that can trigger seizures in people with photosensitive epilepsy. If you or anyone in your family has had seizures, talk to a doctor before using it.

Sonic Obsidian is open source (MIT): https://github.com/atempel/sonic-obsidian
```

### Description — Português (Brasil)

```
O Sonic Obsidian transforma o que o seu PC está tocando — Spotify, YouTube, um jogo, uma DAW — em visuais ao vivo que reagem à música. Ele traz de volta a experiência do MilkDrop do Winamp: abra, toque alguma coisa e a tela ganha vida. Sem configurar nada, sem cabo virtual, sem microfone.

Por dentro roda o Butterchurn, uma implementação em WebGL 2 do MilkDrop 2, com 395 presets feitos por artistas da comunidade MilkDrop. Todo preset mantém o nome dos seus autores.

• Sem configuração: o app ouve a saída de áudio do sistema e começa a reagir em uns dois segundos.
• O Palco: janela sem moldura ou tela cheia limpa; os controles se escondem sozinhos.
• Busca rápida e Biblioteca: ache qualquer preset por nome ou autor; favoritos, recentes e coleções.
• Transições à sua escolha, rotação automática e troca de preset no beat.
• Expressividade: decida quanto o visual reage, o caráter e a memória; uma curva de 16 bandas escolhe quais frequências o movem.
• Normalizar áudio: faixas baixas e altas movem o visual por igual, sem mudar o que você ouve.
• Perfis: salve combinações de ajustes e troque com Alt+1…9.
• Estúdio de presets: edite parâmetros, ondas, formas, equações, shaders ou o código .milk com prévia ao vivo; importe e exporte arquivos .milk.
• Modo Simples para uma interface mais curta, e toda ação no teclado (aperte ? para ver todas).
• Português (Brasil) e inglês.

Privacidade: o áudio é analisado no seu PC e nunca é gravado nem enviado. Sem conta, sem anúncios, sem telemetria.

Aviso de fotossensibilidade: os visuais têm luzes piscando e padrões rápidos que podem provocar crises em pessoas com epilepsia fotossensível. Se você ou alguém da sua família já teve convulsões, fale com um médico antes de usar.

O Sonic Obsidian é código aberto (MIT): https://github.com/atempel/sonic-obsidian
```

### What's new in this version
Primeira versão: deixar em branco. Nas próximas, usar o topo do `.github/release-notes.md` da versão.

### Product features (até 20, 200 caracteres cada)

| en | pt-BR |
|---|---|
| Reacts to any audio your PC plays, with zero setup | Reage a qualquer áudio que o PC toca, sem configurar nada |
| 395 MilkDrop community presets, credited by name | 395 presets da comunidade MilkDrop, com o crédito dos autores |
| Frameless window or clean fullscreen | Janela sem moldura ou tela cheia limpa |
| Search presets by name or author; favorites and collections | Busca de presets por nome ou autor; favoritos e coleções |
| Transitions, auto-rotation and changes on the beat | Transições, rotação automática e troca no beat |
| Expressiveness and a 16-band frequency curve | Expressividade e curva de 16 bandas |
| Profiles of settings on Alt+1…9 | Perfis de ajustes em Alt+1…9 |
| Preset Studio with live preview; import and export .milk | Estúdio de presets com prévia ao vivo; importa e exporta .milk |
| Keyboard-first, with Simple mode | Tudo pelo teclado, com Modo Simples |
| No account, no ads, no telemetry | Sem conta, sem anúncios, sem telemetria |

### Additional system requirements (opcional)
- en: `A GPU with WebGL 2 support (DirectX 11). Audio playing on the PC.`
- pt-BR: `Placa de vídeo com suporte a WebGL 2 (DirectX 11). Áudio tocando no PC.`

### Campos extras (Additional information)

| Campo | Resposta |
|---|---|
| Short title | `Sonic Obsidian` |
| Sort title / Voice title | em branco |
| Short description (en) | `A MilkDrop-style audio visualizer: whatever your PC plays turns into live, music-reactive visuals.` |
| Short description (pt-BR) | `Um visualizador de áudio no estilo MilkDrop: o que o seu PC toca vira visual ao vivo, no ritmo da música.` |
| Search terms (en, até 7) | `visualizer`, `music visualizer`, `MilkDrop`, `Winamp`, `audio visualizer`, `VJ`, `Butterchurn` |
| Search terms (pt-BR, até 7) | `visualizador`, `visualizador de música`, `MilkDrop`, `Winamp`, `visualizador de áudio`, `VJ`, `Butterchurn` |
| Copyright and trademark info | `© 2026 Alexandre Tempel. Butterchurn © Jordan Berg (MIT). Presets by their credited authors.` |
| Additional license terms | `MIT License — https://github.com/atempel/sonic-obsidian/blob/main/LICENSE` |
| Developed by | `Alexandre Tempel` |

## 6. Submission options

**Publishing hold options:** *Don't publish this submission until I select Publish now* — assim você escolhe o momento depois que a certificação passar.

**Notes for certification** (inglês):

```
Sonic Obsidian is a music visualizer. It analyzes the system audio output (Windows loopback through Chromium's getDisplayMedia) and draws visuals that react to it. To test: open the app, then play any audio on the PC (for example a YouTube video in a browser); the visual starts reacting within about two seconds. With no audio playing, the app shows a "silence" message, which is expected.
No account, login, purchase or network connection is needed. The app does not use the microphone or the camera, and it does not record or send audio anywhere.
Keyboard: Right/Left arrows change presets, F toggles fullscreen, ? lists every shortcut.
The visuals contain flashing lights by design; a photosensitivity warning is in the description.
```

**Restricted capabilities › runFullTrust** (justificativa):

```
Desktop audio visualizer built with Electron; it needs full trust to capture the system's audio output (WASAPI loopback) and render it with WebGL.
```

Depois: **Submit to the Store**.
