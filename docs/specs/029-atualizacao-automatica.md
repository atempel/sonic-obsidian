# 029 — Atualização automática pelo GitHub Releases

**Fase:** Abertura · **Status:** A fazer · **Issue:** [#69](https://github.com/atempel/sonic-obsidian/issues/69) · **Origem:** P1 da [016](016-releases-abertura.md) · **Relacionada:** [017 — Landing](017-landing-github-pages.md)

## Problema
Hoje, para ter uma versão nova, a pessoa precisa saber que ela saiu, voltar à landing, baixar e reinstalar. Quem instalou a v0.5.0 fica parado nela. Com releases saindo com frequência, o app precisa se atualizar sozinho, e a pessoa só deve precisar confirmar.

## Proposta
Usar o `electron-updater` (mesmo ecossistema do `electron-builder` que já empacota o app) com o provedor **GitHub** apontando para `atempel/sonic-obsidian`.

Fluxo, do ponto de vista de quem usa o app:
1. Uma vez por dia o app pergunta ao GitHub se há versão publicada mais nova que a instalada.
2. Se houver, **baixa em segundo plano, em silêncio** (decisão do usuário, 2026-11-09).
3. Com o download pronto e verificado, aparece um aviso discreto: *"Sonic Obsidian 0.6.1 está pronta · O que mudou · Reiniciar e atualizar"*.
4. Um clique em **Reiniciar e atualizar** fecha o app, roda o instalador em modo silencioso e **reabre o app sozinho**. Não há mais nada a fazer.

Os rascunhos de release continuam sendo o portão: o `electron-updater` só enxerga releases **publicadas**, então nada chega aos usuários antes de você testar e clicar em *Publish*.

## Escopo
**P0 — empacotamento e release**
- `package.json`: `electron-updater` em `dependencies`, versão exata, passando pela checagem de [docs/dependencias.md](../dependencias.md) (linha 6.x estável; a 7.x está em alpha).
- `electron-builder.yml`: bloco `publish: { provider: github, owner: atempel, repo: sonic-obsidian }`. Com isso o build passa a gerar o `app-update.yml` (dentro do app) e o `latest.yml` + `SonicObsidian-Setup.exe.blockmap` (em `release/`). O workflow continua com `--publish never`: quem cria a release é o `gh`, como hoje.
- `.github/workflows/release.yml`: anexar `latest.yml` e `SonicObsidian-Setup.exe.blockmap` ao rascunho e ao artifact do ensaio. Falhar o job se o `latest.yml` não existir ou se a `version` dele divergir da tag.
- Pre-releases (`-beta`, `-rc`) **nunca** são oferecidas (`allowPrerelease: false`).

**P0 — processo main (`src/main/updater.ts`)**
- Só roda no app empacotado e **instalado** (NSIS). Detectar o zip portátil pela ausência do desinstalador ao lado do `.exe` (`Uninstall Sonic Obsidian.exe`); no portátil, ver o P0 do portátil abaixo.
- `autoDownload: true`, `autoInstallOnAppQuit: false` (sem o clique não instala nada; o download fica em cache e o aviso volta na próxima abertura).
- **Agenda:** primeira checagem **30 s depois do primeiro quadro** (não pesar na abertura, que já foi otimizada na Manutenção) se a última tiver mais de 24 h; depois, um timer de 24 h enquanto o app estiver aberto. Guardar `updates.lastCheckAt` no `store.ts`.
- **Instalar:** `quitAndInstall(isSilent = true, isForceRunAfter = true)`. Antes, salvar o estado (preset atual, Biblioteca), como no fechamento normal.
- **Integridade:** o `electron-updater` confere o SHA-512 do `latest.yml`. Sem certificado não há `publisherName`, então a checagem de assinatura não se aplica (assinatura continua fora de escopo, spec 016).
- **Erros** (sem rede, GitHub fora, download corrompido): nada aparece para o usuário; registrar no log (`log.ts`) e tentar de novo na próxima checagem.
- IPC pelo preload: eventos `update:ready {version, notesUrl}` e `update:error`; comandos `update:install`, `update:check-now`, `update:dismiss`.

**P0 — portátil (zip)**
- Mesma checagem diária, **sem download**: o aviso diz *"Versão 0.6.1 disponível"* e o botão abre a página da release no navegador.

**P0 — interface (Preact, overlay)**
- **Aviso persistente** (não é o toast de 4 s da M13): fica até o clique ou até ser dispensado. Nunca aparece no Modo limpo (`T`) nem cobre o visual em tela cheia; aparece quando a faixa/overlay ficam visíveis.
- **Dispensar ("Depois")** esconde o aviso daquela versão até a próxima abertura do app; não esconde para sempre.
- **Configurações › Sobre** (ou a seção que o design indicar):
  - versão instalada;
  - chave **"Buscar atualizações automaticamente"** — ligada por padrão (decisão do usuário, 2026-11-09);
  - botão **"Verificar agora"**, com estados *Verificando… · Você está na versão mais nova · Baixando 42% · Pronta — reiniciar*.
- Ao clicar em *Reiniciar e atualizar*: estado *"Atualizando… o app reabre sozinho"* por um instante, antes de fechar.
- Textos em inglês com tradução pt-BR, no tom de voz do app.

**P0 — privacidade e comunicação**
- README (EN e pt-BR), seção Privacy: trocar *"no network calls of its own"* por algo como *"The only network call the app makes is a daily check on GitHub for new versions. It can be turned off in Settings."*
- Landing: voltar o texto "atualizações automáticas" ao cartão do instalador (DECISIONS 2026-11-08 já previa isso quando existisse).
- `.github/release-notes.md`: dizer que quem está na **v0.5.0 precisa instalar a nova versão uma única vez à mão** (a 0.5.0 não tem atualizador); a partir dela, é automático. Instalar por cima mantém as configurações (`deleteAppDataOnUninstall: false`).

**P1**
- Mostrar o resumo das notas da versão dentro do app (hoje: link "O que mudou").
- Barra de progresso no aviso quando o usuário clica em "Verificar agora" num download grande.
- Publicação no winget (já P1 na 016) deve conviver com o atualizador interno.

## Fora de escopo
Assinatura de código; atualização automática do zip portátil (troca de pasta própria); canal beta; rollback para versão anterior (correção sai como versão nova); atualização diferencial além do que o `blockmap` já dá de graça; macOS/Linux.

## Critérios de aceite (Windows, com duas releases publicadas em sequência — ex.: 0.6.0 instalada à mão e 0.6.1 publicada depois)
1. Com a 0.6.0 instalada e a 0.6.1 publicada, "Verificar agora" baixa a nova versão sem nenhuma interação e mostra o aviso *pronta*.
2. Clicar em *Reiniciar e atualizar* fecha o app, atualiza **sem janela do instalador e sem pedir admin**, e o app reabre sozinho já na 0.6.1 (versão em Configurações › Sobre).
3. Preset atual, favoritos, coleções e configurações continuam iguais depois da atualização.
4. O SmartScreen **não** aparece na atualização (aparece só na primeira instalação manual). *Se aparecer, registrar em DECISIONS e reavaliar.*
5. Um rascunho de release (não publicado) e uma pre-release `-beta` **não** são oferecidos.
6. Sem internet, o app abre e funciona normal; nada aparece para o usuário e o erro vai para o log.
7. Com a chave desligada, nenhuma requisição ao GitHub sai (conferir no log ou no monitor de rede).
8. O app aberto por mais de 24 h checa de novo sozinho (testar com o intervalo reduzido num build de ensaio).
9. No zip portátil, o aviso aparece e o botão abre a página da release; nada é baixado.
10. O aviso não aparece no Modo limpo nem atrapalha a tela cheia; "Depois" esconde até a próxima abertura.
11. O tempo de abertura medido no log não piora (a checagem só começa 30 s após o primeiro quadro).

## Perguntas em aberto (confirmar ao começar)
- **Onde fica o aviso no design:** rodar `sincronizar-design` e ver se o protótipo já tem lugar para isso (faixa? Configurações › Sobre?). Se não tiver, pedir a peça no Claude Design antes de implementar a UI e registrar a lacuna em DIVERGENCIAS.
- ~~**Versão da primeira release com atualizador:** 0.6.0 ou 0.5.1.~~ Decidido pela rodada (2026-11-13, `agent-decided`): a release do milestone em que o PR entrar (hoje **v0.6.0**).
- Se o usuário estiver no meio de uma performance, o aviso deve esperar? (P1: adiar o aviso enquanto a tela cheia estiver ativa.)

## Referências
- [016 — Releases e abertura](016-releases-abertura.md) (P1: atualização automática; nomes fixos dos arquivos; rascunho como portão).
- `electron-builder.yml` (alvos `nsis` + `zip`, `appId` que não pode mudar) e `.github/workflows/release.yml`.
- electron-builder: [Auto Update](https://www.electron.build/docs/features/auto-update) e [Publish](https://www.electron.build/publish).
- DECISIONS 2026-11-08 — "Abertura: GitHub Pages e releases por tag" (desvios de texto da landing).
