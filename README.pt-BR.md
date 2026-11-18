<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/brand/lockup-light.png">
    <img alt="Sonic Obsidian" src="docs/brand/lockup-dark.png" width="420">
  </picture>
</p>

<p align="center">
  <b>Um visualizador de áudio estilo MilkDrop para Windows.</b><br>
  Se você toca, ele acende.
</p>

<p align="center">
  <img alt="Status: em desenvolvimento" src="https://img.shields.io/badge/status-in%20development-C244FF?style=flat-square">
  <img alt="Plataforma: Windows" src="https://img.shields.io/badge/platform-Windows-1D1D28?style=flat-square">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-45-1D1D28?style=flat-square&logo=electron&logoColor=EEEEF5">
  <img alt="Butterchurn" src="https://img.shields.io/badge/engine-Butterchurn%20(WebGL%202)-1D1D28?style=flat-square">
  <img alt="Licença: MIT" src="https://img.shields.io/badge/license-MIT-1D1D28?style=flat-square">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-1D1D28?style=flat-square&logo=typescript&logoColor=EEEEF5">
</p>

<p align="center">
  <a href="#o-que-é">O que é</a> ·
  <a href="#recursos">Recursos</a> ·
  <a href="#teclado">Teclado</a> ·
  <a href="#privacidade">Privacidade</a> ·
  <a href="#desenvolvimento">Desenvolvimento</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="#créditos">Créditos</a> ·
  <a href="README.md">English</a>
</p>

<p align="center">
  <img alt="Sonic Obsidian — um preset MilkDrop ao vivo renderizado pelo Butterchurn" src="docs/media/banner.jpg">
</p>

## O que é

O Sonic Obsidian é um app de desktop que transforma o áudio que você escolhe tocar — Spotify, YouTube, um jogo, uma DAW — em imagens ao vivo, reativas à música. Ele traz de volta a experiência do MilkDrop, do Winamp: abra, toque algo e a tela ganha vida. Sem configuração, sem cabo virtual, sem microfone.

Por baixo, roda o [Butterchurn](https://github.com/jberg/butterchurn), uma implementação em WebGL 2 do MilkDrop 2, com sua biblioteca de presets da comunidade. Por cima fica a interface do Sonic Obsidian: uma casca quieta e exata em volta de algo vivo.

> [!NOTE]
> **Status:** em desenvolvimento ativo. A fase 2 (a interface completa) está pronta e a fase 3 (fontes e presets) está em andamento; a versão atual é a **v0.8.0**, com o Estúdio de presets completo, e o app instalado se atualiza sozinho. O código está sob a licença MIT.
>
> **Download (Windows 10/11, x64):** [instalador](https://github.com/atempel/sonic-obsidian/releases/latest/download/SonicObsidian-Setup.exe) (por usuário, sem pedir admin) · [zip portátil](https://github.com/atempel/sonic-obsidian/releases/latest/download/SonicObsidian-win-x64.zip) · [todas as versões](https://github.com/atempel/sonic-obsidian/releases). O app não tem assinatura de código: se o SmartScreen avisar, clique em **Mais informações → Executar assim mesmo**.

<p align="center">
  <img alt="O Palco: o visual ocupa a janela, com a faixa de controle na parte de baixo" src="docs/media/app-palco.jpg" width="900">
  <br><sub>O Palco: o visual ocupa a janela inteira e a faixa de controle só aparece quando você precisa.</sub>
</p>

<p align="center">
  <img alt="A gaveta da Biblioteca com busca, abas e a lista de presets" src="docs/media/app-library.jpg" width="900">
  <br><sub>A Biblioteca: busca por preset ou autor, favoritos, recentes e coleções, sem sair do visual.</sub>
</p>

### Presets

O app já vem com 395 presets da comunidade MilkDrop. Alguns deles, capturados do Butterchurn:

<table>
  <tr>
    <td><img src="docs/media/preset-aderrasi-potion-of-spirits.jpg" alt="Aderrasi - Potion of Spirits" width="260"></td>
    <td><img src="docs/media/preset-martin-liquid-arrows.jpg" alt="Martin - liquid arrows" width="260"></td>
    <td><img src="docs/media/preset-orb-waaa.jpg" alt="ORB - Waaa" width="260"></td>
  </tr>
  <tr>
    <td><sub>Aderrasi — Potion of Spirits</sub></td>
    <td><sub>Martin — liquid arrows</sub></td>
    <td><sub>ORB — Waaa</sub></td>
  </tr>
  <tr>
    <td><img src="docs/media/preset-rovastar-loadus-geiss-fractaldrop-triple-mix.jpg" alt="Rovastar + Loadus + Geiss - FractalDrop (Triple Mix)" width="260"></td>
    <td><img src="docs/media/preset-geiss-flexi-martin-disconnected.jpg" alt="Geiss + Flexi + Martin - disconnected" width="260"></td>
    <td><img src="docs/media/preset-geiss-flexi-stahlregen-thumbdrum-tokamak-crossfiri.jpg" alt="Geiss, Flexi + Stahlregen - Thumbdrum Tokamak" width="260"></td>
  </tr>
  <tr>
    <td><sub>Rovastar + Loadus + Geiss — FractalDrop (Triple Mix)</sub></td>
    <td><sub>Geiss + Flexi + Martin — disconnected</sub></td>
    <td><sub>Geiss, Flexi + Stahlregen — Thumbdrum Tokamak</sub></td>
  </tr>
</table>

Todo preset é obra de alguém. O nome do preset leva o crédito dos autores, e o app nunca o remove nem o renomeia.

## Recursos

**Funcionando hoje**

- **Captura sem configuração.** O app capta a reprodução do sistema pelo loopback do Windows e começa a reagir em cerca de dois segundos, sem seletor e sem clique.
- **O Palco.** Janela sem moldura ou tela cheia limpa. A faixa de controle se esconde sozinha; em tela cheia, o cursor some.
- **Assinatura do preset.** A cada troca, o nome do preset e seus autores aparecem por um instante sobre o visual. O Modo limpo (`T`) deixa o visual sem nenhum texto nem aviso por cima.
- **Busca rápida e Biblioteca.** `/` ou `Ctrl+K` encontra qualquer preset por nome ou autor. A gaveta da Biblioteca (`L`) tem abas, favoritos e recentes.
- **Transições à sua escolha.** Escolha o tipo e a duração da transição, separadamente para trocas manuais e para a rotação automática. `Shift` em qualquer troca faz um corte seco.
- **Rotação automática** com intervalo ajustável.
- **Troca no beat.** Muda de preset a cada N compassos da música; `Enter` segura o visual de que você gostou e `Shift+Enter` o deixa em Respiro, sem reagir.
- **Expressividade.** `+` / `−` definem a intensidade da reação do visual; `X` alterna o Caráter e `Shift+X` a Memória (quatro modos, incluindo o Ao vivo para faixas constantes). A Memória aprende só com o som, e silêncio de verdade não pulsa.
- **Normalizar áudio.** Ganho automático opcional para que faixas baixas e altas movam o visual por igual, com o ganho ao vivo nos Ajustes rápidos. Nunca muda o que você ouve.
- **Seus próprios presets.** Importe arquivos `.milk` e organize coleções direto do Palco. O Estúdio de presets (`E`) mostra o quadro inteiro numa prévia ao vivo enquanto você edita parâmetros, ondas e formas, equações, shaders ou o próprio código `.milk`; ele aponta erros de digitação, guarda o histórico de versões, compara com o original, cria presets novos a partir de um modelo e exporta `.milk`. O que você salva é seu, mantendo o crédito original.
- **Inglês e português (Brasil).** No primeiro uso o app segue o idioma do Windows; troque quando quiser em Configurações › Geral › Idioma, sem reiniciar.
- **Atualização automática.** O app instalado consulta o GitHub Releases uma vez por dia, baixa em segundo plano e pergunta antes de reiniciar para atualizar. Dá para desligar em Configurações › Sobre › Atualizações. O zip portátil só avisa que há versão nova.
- **Estado de silêncio.** Quando nada está tocando, o app avisa em vez de mostrar um quadro congelado.
- **Persistência.** Configurações e biblioteca sobrevivem ao reinício e às atualizações.
- **Diagnóstico.** `Ctrl+Shift+D` mostra um HUD de depuração (fps, memória, níveis de áudio, reação); um arquivo de log registra travamentos e eventos da GPU.

**Próximos passos** — o microfone como fonte, um controle de velocidade do visual e um servidor [MCP](https://modelcontextprotocol.io) local para que a ferramenta de IA que você já usa possa controlar o app ao vivo e criar presets. O app em si nunca embute IA. Plano completo no [Roadmap](#roadmap).

## Teclado

| Tecla | Ação |
|---|---|
| `→` / `←` | Próximo / anterior preset |
| `Espaço` | Preset aleatório |
| `Shift` + qualquer uma das anteriores | Corte seco (sem transição) |
| `B` / `Shift+B` | Alterna o tipo de transição |
| `↑` / `↓` | Duração da transição (0,25 s a 8 s) |
| `R` | Liga/desliga a rotação automática |
| `Enter` / `Shift+Enter` | Segura o visual / Respiro (visual sem áudio) |
| `Ctrl+,` | Configurações |
| `,` | Ajustes rápidos (ganho, rotação, transições, Expressividade, texto sobre o visual) |
| `+` / `−` / `0` | Aumenta / diminui / restaura a Expressividade |
| `X` / `Shift+X` | Caráter / Memória da reação |
| `/` ou `Ctrl+K` | Busca rápida |
| `L` | Biblioteca |
| `E` | Estúdio de presets |
| `F` ou `F11` | Tela cheia |
| `T` | Modo limpo (nada sobre o visual) |
| `H` | Esconde a interface agora |
| `Esc` | Fecha o que estiver aberto, ou sai da tela cheia |
| `Ctrl+W` | Fecha o app |
| `?` | Todos os atalhos (com filtro) |
| `Ctrl+Shift+D` | HUD de depuração |
| `Ctrl+Shift+L` | Abre a pasta de logs |

## Privacidade

- **O áudio é analisado em memória e nunca é salvo nem enviado.** O app não tem conta nem telemetria. A única chamada de rede que ele faz por conta própria é uma checagem diária no GitHub por versões novas (a partir da 0.7.0); dá para desligar em Configurações › Sobre › Atualizações.
- Ele visualiza o áudio que você escolhe tocar. Conteúdo protegido por DRM está fora do escopo, e o app não tenta contornar a proteção.
- A integração com ferramentas de IA será opcional, apenas local (`127.0.0.1`), desligada por padrão, com token e permissões restritas.

## Requisitos

- Windows 10 ou 11
- Uma GPU com suporte a WebGL 2
- Qualquer dispositivo de saída de áudio (caixas de som, fones, dispositivos virtuais como o Voicemeeter)

## Desenvolvimento

O app é feito com Electron, electron-vite e TypeScript. A camada de interface usa Preact.

```bash
npm ci            # instala as dependências
npm run typecheck # checa os tipos de main e renderer
npm run build     # compila para out/
npm run test:ui   # testes headless de interface e estados (depois do npm run build)
npm run dist:win  # build + pasta portátil do Windows em release/win-unpacked/
npm run dev       # roda com hot reload (precisa de uma sessão de desktop)
```

A captura de áudio do sistema usa o loopback do Chromium, que só existe no Windows. Por isso o app precisa rodar no Windows para ser testado de verdade. Todo pull request que mexe no app executa o [`build-windows.yml`](.github/workflows/build-windows.yml): checagem de tipos e testes headless no Ubuntu. O build do Windows (o artifact `sonic-obsidian-win-<sha>`, mais uma passagem de desempenho em 20 presets fixos) só roda com a label `build-windows` ou por disparo manual. As releases saem do [`release.yml`](.github/workflows/release.yml), que anexa o instalador, o zip portátil, os checksums e os arquivos de que o atualizador precisa.

Texto de interface nunca vai direto no componente: cada texto é uma chave em `src/renderer/src/i18n/en.ts` (inglês, a fonte) com a tradução em `pt-BR.ts`; chave faltando quebra a checagem de tipos.

### Como funciona

```mermaid
flowchart LR
  A[Reprodução do sistema] -->|loopback do Windows| B[Processo main<br/>handler de display-media]
  B --> C[AudioContext<br/>ganho · normalizar · expressividade]
  C --> D[Butterchurn<br/>WebGL 2]
  D --> E[Canvas]
  F[Teclado · Interface] --> G[Núcleo de comandos]
  G --> D
  G --> H[Overlay em Preact<br/>Palco · Biblioteca · Busca]
  G <-->|IPC via preload| I[(settings.json<br/>library.json)]
```

Teclado, interface e, mais adiante, o MCP são todos clientes de um único **núcleo de comandos** (`preset.next`, `rotation.set`, `library.favorite`…). Nada fala direto com o motor. Detalhes em [docs/architecture.md](docs/architecture.md).

### Estrutura do repositório

```
src/
  main/        processo main do Electron: janela, handler de loopback, armazenamento, conversor .milk, atualizador, log
  preload/     API estreita exposta à página como window.so
  renderer/    Butterchurn, grafo de áudio, núcleo de comandos, overlay em Preact e idiomas (en, pt-BR)
tests/         testes headless de interface e a passagem de desempenho no Windows
site/          landing page (GitHub Pages)
docs/
  PRD.md       produto e roadmap (documento âncora)
  architecture.md
  specs/       uma spec por feature (001–030 até agora)
  design/      interface: espelho do protótipo v3, explorações, moodboard
  brand/       arquivos do logo
  research/    pesquisa técnica (MilkDrop, FFT, efeitos)
legacy/python/ a primeira versão (Python + Pygame), mantida como referência
```

O índice da documentação está em [docs/README.md](docs/README.md).

### Como o projeto é feito

Cada feature começa como uma spec em [`docs/specs/`](docs/specs/), vira uma issue no GitHub e chega por pull request. O trabalho é acompanhado em [issues e milestones](https://github.com/atempel/sonic-obsidian/milestones) (um milestone por release); um ciclo agendado o faz andar, e uma release só sai depois que o mantenedor testa o bloco inteiro no Windows. As decisões e o que foi descartado ficam no [DECISIONS.md](DECISIONS.md); o registro de cada sessão de trabalho fica no [SESSIONS.md](SESSIONS.md). O código é escrito com o [Claude Code](https://claude.com/claude-code), e a interface é desenhada no Claude Design e espelhada em [`docs/design/v3/`](docs/design/v3/README.md). A estrutura segue o [workspace//kit](https://github.com/atempel/workspace-kit).

## Roadmap

| Fase | Objetivo | Estado |
|---|---|---|
| 0 — Spike | Provar loopback + Butterchurn no Electron | Concluída |
| 1 — Núcleo | Presets pelo teclado, rotação, janela, sinal de entrada | Concluída |
| 2 — Interface v3 | Palco, Biblioteca, busca, transições, configurações, setup, atalhos | Feita (v0.5.0) |
| 3 — Fontes e presets | Microfone, arquivos de áudio, importação de `.milk`, Estúdio de presets | Em andamento (v0.6.0: importar `.milk`, Estúdio P0, troca no beat, reação ao áudio · v0.7.0: inglês/português, atualização automática · v0.8.0: Estúdio completo) |
| 4 — MCP | Controle ao vivo e criação de presets pela sua ferramenta de IA | Planejada |
| 5 — Extras | Rack multi-monitor, beat/BPM, instalador, iniciar com o Windows | Planejada (instalador na v0.5.0, atualização automática na v0.7.0) |

Detalhes no [docs/PRD.md](docs/PRD.md); o trabalho atual está nos [milestones](https://github.com/atempel/sonic-obsidian/milestones).

## Créditos

O Sonic Obsidian existe porque outras pessoas fizeram a parte difícil e abriram seu código:

- **[Butterchurn](https://github.com/jberg/butterchurn)**, de Jordan Berg e colaboradores (MIT): todo o motor visual. Uma implementação em WebGL do MilkDrop 2, usada como dependência, sem fork e sem alterações.
- **[MilkDrop](https://www.geisswerks.com/milkdrop/)**, de Ryan Geiss (Nullsoft): o visualizador original que inspira tudo isto, e o **Winamp**, onde muitos de nós o vimos pela primeira vez.
- **Presets** do [butterchurn-presets](https://github.com/jberg/butterchurn-presets): obras de artistas da comunidade MilkDrop. O nome de cada preset leva o crédito de seus autores.

Obrigado. Os textos de licença dessas dependências estão em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), que também acompanha a pasta do app.

## Licença

[MIT](LICENSE) © 2026 Alexandre Tempel. O Butterchurn e os presets mantêm suas próprias licenças e créditos — veja [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Quer ajudar? Leia o [CONTRIBUTING.md](CONTRIBUTING.md) (em inglês). Achou um problema de segurança? Veja o [SECURITY.md](SECURITY.md).

<p align="center">
  <img src="docs/brand/shell.svg" width="18" alt=""><br>
  <sub>Feito com ♥ no Brasil por <a href="https://github.com/atempel">Alexandre Tempel</a></sub>
</p>
