# Privacy Policy

**Sonic Obsidian** · last updated November 27, 2026 · [Português (Brasil)](#política-de-privacidade-português-brasil)

Sonic Obsidian is an open-source audio visualizer for Windows. It runs entirely on your computer. It has **no account, no telemetry, no analytics and no ads**, and the developer does not collect any personal data. This policy covers the app in every edition (Microsoft Store, installer and portable zip) and the project website at https://atempel.github.io/sonic-obsidian/. The page version is at https://atempel.github.io/sonic-obsidian/privacy/.

## Audio

To draw the visuals, the app captures what your computer is playing (the system's audio output, through Windows "loopback" capture). The audio is analyzed in memory, a few milliseconds at a time, and is **never recorded, saved or sent anywhere**. The app does not use your microphone. Windows offers a screen-capture video track together with the audio; the app discards it immediately without reading it.

## What is stored on your computer

The app keeps these files in its data folder (`%APPDATA%\sonic-obsidian`; in the Microsoft Store edition, Windows may keep them in the app package's own data folder). They never leave your computer unless you copy them yourself:

- `settings.json`: your settings (gain, rotation, transitions, language and so on);
- `library.json`: favorites, collections, recently played presets and the measured frame rate of each preset;
- `updates.json` (installer and zip only): when the last update check happened;
- `presets/imported/` and `presets/mine/`: the `.milk` presets you import and the presets you create in the Studio, including the author name you type;
- `logs/sonic-obsidian.log` (and `.1.log`): technical events used to diagnose problems, such as app and Electron versions, start-up times, crashes, graphics (WebGL) errors, memory use and preset names. The log may contain the path of this folder, which usually includes your Windows user name. It is limited to about 2 MB and is never sent by the app.

Uninstalling the installer edition keeps this folder, so your settings survive a reinstall; delete it by hand if you want them gone.

## Network connections

- **Update check (installer and portable zip only).** Once a day, and when you click **Check now**, the app asks GitHub whether a newer release exists. The installer then downloads it from GitHub. Like any web request, this reveals your IP address and the request to GitHub. You can turn the daily check off in **Settings › About › Updates**. The **Microsoft Store edition never checks GitHub**: Microsoft Store handles its updates.
- **Nothing else on its own.** The part of the app that draws the visuals is not allowed to connect to any server (its content security policy only allows the app's own files).
- **Links you click** (source code, release notes, credits, feedback forms) open in your web browser. From then on, the privacy policy of that website applies.

## Feedback and diagnostics

- **Report a problem** opens a bug form on GitHub in your browser, pre-filled with the app version, Windows version, graphics card, audio output and current preset. You see each item before it is used and can remove any of them. Nothing is sent until you submit the form on GitHub, where it becomes public. You need a GitHub account to post.
- **Copy diagnostics** copies the last 200 lines of the log to your clipboard, with your user folder replaced by `~`, so you can paste them where you choose. The app sends nothing.

## Third parties

- **GitHub** hosts the source code, the releases, the update files, the feedback forms and the website. [GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).
- **Microsoft Store** distributes and updates the Store edition. [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement).

## Website

The website is a static page on GitHub Pages; GitHub may log visits as described in its privacy statement. The page asks the GitHub API for the latest version number and download sizes. The live demo plays a bundled track; if you click **Microphone**, your browser asks for permission and the sound is analyzed only inside your browser, never sent. The site uses no cookies and no analytics.

## Children

The app and the website collect no personal data from anyone, including children.

## Changes

Changes to this policy are published in this file and on the website; the full history is in the [repository](https://github.com/atempel/sonic-obsidian/commits/main/PRIVACY.md).

## Contact

Open an issue at https://github.com/atempel/sonic-obsidian/issues, or report a security problem privately as described in [SECURITY.md](SECURITY.md).

---

# Política de privacidade (Português, Brasil)

**Sonic Obsidian** · atualizada em 27 de novembro de 2026 · [English](#privacy-policy)

O Sonic Obsidian é um visualizador de áudio de código aberto para Windows. Ele roda inteiro no seu computador. **Não tem conta, telemetria, estatísticas de uso nem anúncios**, e o desenvolvedor não coleta nenhum dado pessoal. Esta política vale para o app em todas as edições (Microsoft Store, instalador e zip portátil) e para o site do projeto, https://atempel.github.io/sonic-obsidian/. A versão em página fica em https://atempel.github.io/sonic-obsidian/pt/privacidade/.

## Áudio

Para desenhar o visual, o app captura o que o computador está tocando (a saída de áudio do sistema, pela captura "loopback" do Windows). O áudio é analisado em memória, poucos milissegundos por vez, e **nunca é gravado, salvo nem enviado** a lugar nenhum. O app não usa o microfone. O Windows entrega uma faixa de vídeo da tela junto com o áudio; o app a descarta na hora, sem ler.

## O que fica salvo no seu computador

O app guarda estes arquivos na pasta de dados dele (`%APPDATA%\sonic-obsidian`; na edição da Microsoft Store, o Windows pode guardá-los na pasta de dados do próprio pacote do app). Eles só saem do computador se você mesmo copiar:

- `settings.json`: suas configurações (ganho, rotação, transições, idioma etc.);
- `library.json`: favoritos, coleções, presets tocados recentemente e a taxa de quadros medida de cada preset;
- `updates.json` (só instalador e zip): quando foi a última checagem de atualização;
- `presets/imported/` e `presets/mine/`: os presets `.milk` que você importa e os que você cria no Estúdio, com o nome de autor que você digitar;
- `logs/sonic-obsidian.log` (e `.1.log`): eventos técnicos para diagnosticar problemas, como versões do app e do Electron, tempos de abertura, quedas, erros gráficos (WebGL), uso de memória e nomes de presets. O log pode conter o caminho desta pasta, que normalmente inclui o seu nome de usuário do Windows. Ele fica limitado a cerca de 2 MB e nunca é enviado pelo app.

Desinstalar a edição do instalador mantém esta pasta, para as configurações voltarem numa reinstalação; apague-a à mão se quiser removê-las.

## Conexões de rede

- **Checagem de atualização (só instalador e zip portátil).** Uma vez por dia, e quando você clica em **Verificar agora**, o app pergunta ao GitHub se há uma versão mais nova. O instalador então a baixa do GitHub. Como em qualquer acesso à web, isso revela o seu endereço IP e o pedido ao GitHub. Dá para desligar a checagem diária em **Configurações › Sobre › Atualizações**. A **edição da Microsoft Store nunca consulta o GitHub**: quem cuida das atualizações dela é a Microsoft Store.
- **Nada além disso por conta própria.** A parte do app que desenha o visual não tem permissão para se conectar a nenhum servidor (a política de segurança de conteúdo dela só permite os arquivos do próprio app).
- **Links em que você clica** (código-fonte, notas da versão, créditos, formulários de feedback) abrem no seu navegador. A partir daí, vale a política de privacidade do site aberto.

## Feedback e diagnóstico

- **Relatar um problema** abre um formulário de bug no GitHub, no seu navegador, já preenchido com a versão do app, a versão do Windows, a placa de vídeo, a saída de áudio e o preset atual. Você vê cada item antes e pode tirar qualquer um. Nada é enviado até você mandar o formulário no GitHub, onde ele fica público. É preciso uma conta no GitHub para enviar.
- **Copiar diagnóstico** copia as últimas 200 linhas do log para a área de transferência, com a sua pasta de usuário trocada por `~`, para você colar onde quiser. O app não envia nada.

## Terceiros

- **GitHub** hospeda o código-fonte, as releases, os arquivos de atualização, os formulários de feedback e o site. [Declaração de privacidade do GitHub](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).
- **Microsoft Store** distribui e atualiza a edição da Store. [Política de privacidade da Microsoft](https://privacy.microsoft.com/pt-br/privacystatement).

## Site

O site é uma página estática no GitHub Pages; o GitHub pode registrar as visitas, como descrito na declaração de privacidade dele. A página consulta a API do GitHub para mostrar o número da última versão e o tamanho dos downloads. A demonstração toca uma faixa que vem com o site; se você clicar em **Microfone**, o navegador pede permissão e o som é analisado só dentro do navegador, sem ser enviado. O site não usa cookies nem estatísticas de visita.

## Crianças

O app e o site não coletam dados pessoais de ninguém, inclusive de crianças.

## Mudanças

Mudanças nesta política são publicadas neste arquivo e no site; o histórico completo fica no [repositório](https://github.com/atempel/sonic-obsidian/commits/main/PRIVACY.md).

## Contato

Abra uma issue em https://github.com/atempel/sonic-obsidian/issues, ou relate um problema de segurança em particular, como descrito no [SECURITY.md](SECURITY.md).
