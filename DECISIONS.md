# Decisões — Sonic Obsidian

Registro cronológico: o quê, por quê e alternativas descartadas. Quando passar de ~15 entradas, mover as mais antigas para `decisions/NNN-slug.md` e deixar aqui um índice de uma linha por decisão.

## 2026-03 — Stack v1: Python nativo (substituída)
- **Decisão:** Python + PyAudioWPatch (WASAPI loopback) + NumPy FFT + Pygame, com ModernGL/GLSL planejado para a Fase 3.
- **Por quê:** o browser não capturava o áudio do sistema sem fricção; a via nativa resolvia isso.
- **Resultado:** Fase 1 entregue (4 modos 2D, controles de ganho/graves, fullscreen) — preservada em `legacy/python/`. PRD e plano originais em `docs/legacy/`.

## 2026-11-08 — Motor visual: Butterchurn
- **Decisão:** usar o [Butterchurn](https://github.com/jberg/butterchurn) (MilkDrop 2 em WebGL 2, licença MIT) como motor de renderização, com o pacote `butterchurn-presets`.
- **Por quê:** testado e aprovado; entrega pronta a Fase 3 inteira da v1 (shaders estilo MilkDrop, presets, transições), que era a parte mais difícil. Abre o acervo de presets `.milk` da comunidade (via conversão).
- **Atenção:** o repositório upstream tem pouca atividade recente — tratar como dependência estável, fixar versão.
- **Descartado:** continuar escrevendo shaders próprios em ModernGL (muito trabalho para chegar abaixo do que já existe); projectM nativo (C++, LGPL, integração mais pesada).

## 2026-11-08 — Shell desktop: Electron (por ora)
- **Decisão:** app Electron. A captura usa `session.setDisplayMediaRequestHandler` devolvendo `audio: 'loopback'`, suportado no Windows, e o stream vai para um `AudioContext` conectado ao Butterchurn.
- **Por quê:** é o caminho mais curto para loopback do sistema + WebGL 2 no mesmo processo, e a UI desenhada (React/JSX no protótipo) migra direto.
- **Consequência:** o loopback do Chromium captura a mixagem do sistema; **seleção de dispositivo de saída** (P0 na v1) deixa de ser trivial e vira investigação na Fase 3.
- **Descartado (por ora):** Tauri — exigiria WASAPI em Rust + ponte de áudio até a WebView; reavaliar só se tamanho/memória do Electron incomodarem.

## 2026-11-08 — Python encostado, não apagado
- **Decisão:** `visualizer.py` e docs v1 ficam em `legacy/` como referência (pipeline FFT, beat detection, os 4 modos 2D que podem virar camadas próprias).
- **Por quê:** histórico útil e zero custo de manter; nada nele roda junto com o app novo.

## 2026-11-08 — Estrutura de workspace (workspace//kit)
- **Decisão:** adotar as camadas do [workspace//kit](https://github.com/atempel/workspace-kit): humana (PROJECT/CONTEXT/DECISIONS/TASKS/SESSIONS + `queue/`) e de agente (CLAUDE.md → AGENTS.md + skills em `.claude/skills/`), com o PRD como arquivo âncora.
- **Divisão com o Notion:** o repo é a fonte da documentação técnica e do histórico de decisões; o Notion guarda planejamento/reflexão e o **estado** do projeto (Última ação, Próximo passo) na Tabela Meus Projetos, atualizado pela skill `encerrar-sessao`.

## 2026-11-08 — Ambiente de dev: Claude Code na nuvem + validação no Windows por build de CI
- **Decisão:** desenvolver no Claude Code na nuvem (claude.ai/code, container Linux) e validar no Windows rodando um build gerado pelo GitHub Actions (`windows-latest`), baixado como artifact. **Nada de Node/npm instalado no host Windows.**
- **Por quê:** o usuário não quer toolchain no host. O loopback do Chromium só existe no Windows, então a nuvem serve para escrever, compilar e checar tipos, mas não para ouvir/ver o app; o executável vindo do CI fecha essa lacuna sem instalar nada.
- **Consequências:**
  - O spike (spec 001) ganha um P0: workflow que gera o app Windows (pasta/zip portátil, sem instalador e sem assinatura) a cada push na branch.
  - Na nuvem o `npm install` roda com `ELECTRON_SKIP_BINARY_DOWNLOAD=1` (hook `SessionStart` em `.claude/settings.json`); o binário do Electron só é baixado no CI.
  - Ciclo de teste é mais lento que `npm run dev` com HMR: cada rodada = push → esperar CI → baixar zip → abrir. Critérios de aceite de áudio/fps só contam como verificados quando o usuário confirma rodando esse build.
  - Repo privado: minutos de runner Windows contam em dobro na cota do GitHub Actions.
- **Descartado:** WSL + `npm run dev` no Windows e Claude Code nativo no Windows (ambos exigem Node no host); Node portátil em zip (ainda é toolchain no host).

## 2026-11-08 — Uso do Butterchurn: dependência fixada, sem fork, com créditos
- **Decisão:** consumir `butterchurn` 2.6.7 e `butterchurn-presets` 2.4.7 do npm, com versão exata e sem fork. Créditos: seção no README, `THIRD_PARTY_NOTICES.md` (texto MIT integral, copiado para a pasta do app pelo electron-builder) e o nome do preset sempre visível com o autor.
- **Por quê:** o app só usa a API pública (`createVisualizer`, `connectAudio`, `loadPreset`, `setRendererSize`, `render`). Um fork nos tornaria mantenedores de um motor WebGL sem ganho. Como o Vite embute o Butterchurn no JS do renderer, o LICENSE de `node_modules` não iria junto, e por isso existe o arquivo de avisos.
- **Escada se precisar mexer no motor:** (1) `patch-package` para um ajuste pontual; (2) fork `atempel/butterchurn` mantendo histórico, LICENSE e copyright, usado como dependência git; (3) vendorizar só em último caso. Cada degrau vira uma entrada aqui.
- **Descartado:** fork já no início; Butterchurn 3.0 (ainda em beta).

## 2026-11-08 — Spike 001: respostas (issue #4)
Validado pelo usuário no Windows com o build do CI (`sonic-obsidian-win-2545cbb`), monitor 1080p a 180 Hz, saída de áudio pelo Voicemeeter.
- **O handler evita mesmo o seletor de tela?** Sim. `setDisplayMediaRequestHandler` com `useSystemPicker: false`, respondendo `{ video: primeira tela, audio: 'loopback' }`: nenhum diálogo, e o visual reagiu em ~2 s depois de abrir.
- **Custo da track de vídeo, e dá para pará-la sem derrubar o áudio?** Dá para parar. O renderer pede vídeo mínimo (1×1, 1 fps) e para a track logo após o `getDisplayMedia`; a track de áudio ficou `live` a sessão inteira, inclusive com a música pausada e retomada. O custo de CPU da track de vídeo enquanto ativa **não foi medido**: ela vive só alguns milissegundos, então deixou de importar.
- **Template:** `electron-vite` 6 (uma config para main e renderer, `npm run dev` direto) + `electron-builder` 26 só para empacotar (`--win --dir`, pasta portátil). Descartado: Electron Forge + Vite (plugin experimental, três configs Vite, e o PRD já previa electron-builder na Fase 4).
- **Outras descobertas:**
  - `autoplayPolicy: 'no-user-gesture-required'` na janela é necessário para o AudioContext não nascer suspenso, o que exigiria um clique.
  - A CSP do renderer precisa de `'unsafe-eval'`, porque o Butterchurn compila as equações dos presets com `new Function`.
  - O loop segue o `requestAnimationFrame`, então o fps acompanha a taxa de atualização do monitor (180 fps num monitor de 180 Hz). Limitar o fps (para poupar GPU) fica como pergunta para a Fase 1.
  - Saída por um dispositivo virtual (Voicemeeter) funciona. Fone Bluetooth/USB como saída padrão **não foi testado** (o usuário não tem outro dispositivo).
- **Conclusão:** a premissa da stack v2 está provada. Segue para a Fase 1.

## 2026-11-08 — Spec 002: biblioteca de presets
- **Decisão:** a biblioteca junta o pacote padrão e os pacotes extras que já vêm no `butterchurn-presets` (Extra, Extra2, MD1): 395 presets, deduplicados por nome e em ordem alfabética, com o nome inteiro (que carrega o autor). Os extras entram por `import()` dinâmico depois do primeiro quadro (~85 ms medidos na nuvem), e a abertura continua reagindo em ~2 s no Windows.
- **CSP:** `img-src 'self' data: blob:`, porque alguns presets trazem texturas embutidas como imagens `data:`. Sem isso eles renderizavam sem a textura, e isso já acontecia no build do spike.
- **Descartado:** carregar tudo de forma síncrona no início (+1,7 MB de JS antes do primeiro quadro); os pacotes `Minimal` e `NonMinimal`, que são recortes dos mesmos presets.

## 2026-11-08 — Interface v3: modelo de navegação combinado
- **Decisão:** o **Palco** é a tela padrão (só o visual; faixa de controle aparece com o mouse e some em 2,5 s). A **Biblioteca** é uma gaveta oculta à esquerda (`L`, botão na faixa ou alça na borda). O **Rack** é um modo de visualização compacto, sempre por cima (`M`). **Ajustes rápidos** (`,`) num painel lateral; **Configurações** (`Ctrl+,`) em tela própria por cima do visual, com salvamento automático. **Setup** nunca bloqueia: o app abre tocando; boas-vindas e diagnósticos são não-modais e só aparecem quando algo pede.
- **Por quê:** o usuário escolheu, entre as propostas A (Palco), B (Biblioteca) e C (Rack) do Claude Design, combinar as três como lugares do mesmo app em vez de alternativas.
- **Referência:** [docs/design/v3-modelo-de-navegacao.md](docs/design/v3-modelo-de-navegacao.md) e o artefato "Sonic Obsidian" no Claude Design (páginas *Palco integrado*, *Configurações*, *Setup*, *Estúdio*, *Propostas*).
- **Atalhos v3 são os definitivos** e substituem os provisórios da spec 002 (`R` deixa de ser "aleatório" e vira rotação; blend sai das teclas `1`–`3` e vai para os ajustes rápidos).
- **Descartado:** Carbon Edition (identidade IBM, conteúdo da v1 Python) e a triagem de UI de `queue/2026-11-08-revisao-ui-presets.md`, que fica como histórico.

## 2026-11-08 — Fontes de áudio além do loopback
- **Decisão:** quatro fontes, escolhidas na faixa ou nas Configurações: **áudio do sistema** (padrão), **microfone**, **arquivo** (escolher ou arrastar; mp3, wav, flac, ogg, m4a) e **SoundCloud** (colar URL). Arquivo e SoundCloud são fontes temporárias com transporte próprio e botão "voltar ao áudio do sistema".
- **SoundCloud é condicional:** desde mai/2026 as chaves da API só saem para assinantes Artist Pro; os streams agora são HLS AAC (exige `hls.js`); CORS dos segmentos não é documentado; os termos proíbem download/cache e *stream capture* e exigem crédito + link para a faixa. Entra só depois do spike [007](docs/specs/007-spike-soundcloud.md). Plano B: player oficial (widget) dentro do app, analisado pelo próprio loopback.
- **Não fazer:** baixar ou cachear faixas do SoundCloud; contornar CORS ou limites da API pelo main process.

## 2026-11-08 — Presets do usuário e controle por IA via MCP (escopo novo)
- **Decisão:** entram no produto (revoga o "editor de presets fora de escopo" do PRD v2):
  1. **Importar `.milk`** (escolher ou arrastar) e um **Estúdio de presets** para criar/remixar no formato `.milk`, com prévia ao vivo, erros por linha e histórico de versões. Presets de terceiros nunca são editados no lugar: viram "Remix de …" com o crédito original preservado.
  2. O app é um **servidor MCP local**, desligado por padrão: qualquer ferramenta de IA do usuário (Claude, Cursor, etc.) controla o app ao vivo e cria presets. **O Sonic Obsidian não embute IA nem depende de um provedor.**
- **Condição de segurança (inegociável):** preset vindo de fora — arquivo, Estúdio ou MCP — **nunca vira JavaScript**. No Butterchurn 2.x as equações viram JS via `new Function` no renderer; aceitar presets externos nesse modelo é execução arbitrária de código. Por isso o escopo novo depende da decisão abaixo.
- **Detalhes:** [docs/architecture.md](docs/architecture.md).

## 2026-11-08 — Proposta: migrar para Butterchurn 3.0 (equações em WebAssembly) — pendente do spike 006
- **Proposta:** `butterchurn@3.0.0-beta.5` + `butterchurn-presets@3.0.0-beta.4` com `onlyUseWASM: true`. No 3.x as equações EEL do MilkDrop são compiladas para WebAssembly (`eel-wasm`) só com imports matemáticos: sem acesso a DOM, `window` ou IPC. Presets externos passam a ser seguros por construção, e a CSP pode trocar `'unsafe-eval'` por `'wasm-unsafe-eval'`.
- **Por que reabre a entrada "Uso do Butterchurn" (que descartou o 3.0 por ser beta):** o escopo novo (presets do usuário e MCP) torna a execução de JS de terceiros o maior risco do projeto, e o 3.x é a saída sem fork. A master do Butterchurn está ativa (abr/2026), mas o beta não é promovido a estável desde jul/2025.
- **Riscos a validar no spike [006](docs/specs/006-spike-butterchurn3-milk.md):** o pacote publicado (não a master) carrega os presets 3.x só com WASM; desempenho igual ou melhor; o canvas de saída no 3.x usa contexto 2D (o WebGL vai num `OffscreenCanvas`), o que muda o `visualizer.ts`; o conversor `.milk` (dormente desde 2021) gera presets no formato 3.x.
- **Se o spike falhar:** presets externos ficam fora até haver sandbox equivalente; o MCP sobe só com ferramentas de controle (sem `create_preset`).

## 2026-11-08 — Spec 003: rotação automática e atalhos v3 no código
- **Decisão:** a rotação não tem timer próprio. O loop de render pergunta `rotation.due(now)` a cada quadro, e qualquer troca reinicia a contagem. Assim troca e render ficam no mesmo relógio, e com a janela minimizada o render e a rotação param juntos.
- **Atalhos v3 implementados:** `Espaço` aleatório, `←`/`→`, `R` liga e desliga a rotação, `[`/`]` mudam o intervalo (10/15/30/60/120 s). Os colchetes são lidos por `e.key` (caractere), não por `e.code` (posição física), porque no ABNT2 eles ficam em outras teclas. As letras usam `e.code`.
- **Blend em `src/renderer/src/config.ts`:** manual 0 s, automático 2,7 s, como constantes para os ajustes rápidos da Fase 2. As teclas `1`/`2`/`3` e o `R` aleatório da spec 002 saíram.

## 2026-11-08 — Design e código sincronizados por espelho versionado
- **Decisão:** o artefato do Claude Design é a fonte do desenho da interface; `docs/design/v3/` é um espelho somente leitura com a versão registrada em `SYNC.md`. A skill `sincronizar-design` checa a versão no início de toda tarefa de interface e sincroniza por PR. Afastamentos do desenho vão para `docs/design/v3/DIVERGENCIAS.md`, que a sessão de design lê ao voltar a refinar.
- **Por quê:** o código estava sendo planejado a partir de briefs copiados, sem as páginas e sem saber qual versão do protótipo valia; mudanças no design não chegavam ao repo.
- **Precedência:** fato técnico segue o repo (`docs/architecture.md`); comportamento e aparência seguem o protótipo na versão sincronizada.
- **Descartado:** apontar só o link do artefato (versão muda sem aviso e nem toda superfície lê artefatos); copiar páginas sem versão (vira cópia órfã).

## 2026-11-08 — Spec 004: janela sem moldura e limite de fps
- **Arrasto:** `frame: false` com uma área `-webkit-app-region: drag` (`#drag`) recuada 6 px das bordas, para o redimensionamento nativo continuar funcionando, e ativa só em janela. Em tela cheia ela some, porque regiões de drag engolem o `mousemove` e o cursor não conseguiria sumir. Controles da Fase 2 por cima do visual precisarão de `-webkit-app-region: no-drag`.
- **Tela cheia no renderer:** `BrowserWindow.setFullScreen` não aciona a Fullscreen API. O renderer considera tela cheia quando a janela ocupa a tela inteira (`innerWidth/innerHeight >= screen`).
- **Limite de fps:** pular quadros do `requestAnimationFrame` até completar o intervalo-alvo (tolerância de 1 ms, cadência sem acumular atraso). Em simulação deu 60 fps exatos em telas de 180/144/120/60 Hz, e no Windows ficou fixo em 60. Fica em `config.fpsLimit`, com padrão `'monitor'`; a UI entra em Configurações › Desempenho ("limite de fps", protótipo v3 `1794154301-3f85`) na Fase 2.
- **Resultado:** na máquina principal (RTX 3070, 1080p a 180 Hz), a GPU ficou ~20% com o limite e essencialmente igual sem ele, então o ganho não foi visível (critério 7 não atendido). O custo varia mais por preset do que pela taxa de quadros, o que reforça "pular presets abaixo de N fps" e "Ocultos por desempenho" (v3, Configurações › Desempenho).
- **Descartado:** `setTimeout` agendado (sai do vsync e gera tearing/jitter) e flags do Chromium para a taxa de quadros (globais, sem ajuste em tempo de execução).

## 2026-11-08 — Spec 005: ganho e estado de silêncio
- **Ganho:** em dB no `GainNode` antes do Butterchurn, com `setTargetAtTime` para não estalar. A faixa ficou em −12 a +12 dB, passos de 1 dB (igual ao slider do protótipo v3), depois que o teste mostrou que +6 a +9 dB levam a barra à metade com música em volume normal. O build testado ia até +24 dB com passos de 1,5. Teclas `+`/`−`/`0` provisórias (ver DIVERGENCIAS).
- **Silêncio:** RMS medido **antes** do ganho (limiar ~−66 dBFS, checado a cada 100 ms). Depois de 3 s o relógio do preset desacelera até 15% (`render({ elapsedTime })` com o tempo real × velocidade) e uma camada preta escurece ~35%, em rampa de 1 s. Depois de 10 s aparece "Nenhum som chegando", com texto e tempo do protótipo (Setup › "Sem som por 10 s"), em vez dos 3 s da spec, para a pausa entre faixas não disparar o aviso.
- **Risco que não se confirmou:** parte do movimento dos presets é calculada por quadro, mas a desaceleração ficou visível em todos os presets testados. Isso acontece porque o Butterchurn deriva o `fps` interno do `elapsedTime` recebido.
- **Descartado:** congelar a imagem (o usuário preferiu desacelerar e escurecer); pular quadros para desacelerar (fica picotado).

## 2026-11-08 — UI do overlay (Fase 2): Preact
- **Decisão:** a interface v3 por cima do visual (faixa, Biblioteca, busca, Ajustes rápidos, Configurações, setup) é escrita em **Preact** (`preact`, MIT) com JSX, compilada pelo `oxc` nativo do Vite 8 (`oxc.jsx.importSource: 'preact'`). Versão exata `preact@11.0.2` (spec 008; ver [docs/dependencias.md](docs/dependencias.md)). *Ajuste na 008:* o `@preact/preset-vite` previsto foi descartado, porque só traria HMR (`prefresh`) e exigiria `@babel/core`. Estado vem do Core (AppState + eventos, architecture §1); `@preact/signals` só entra se a spec 008 mostrar necessidade (registrar aqui).
- **Por quê:** a Fase 2 soma gavetas, menus, abas, foco e navegação por teclado e 8 seções de Configurações, o que em TypeScript puro vira muito código manual de estado e DOM. Preact dá o modelo de componentes do React com ~4 KB no renderer.
- **Regra de desempenho:** nada que muda a cada quadro passa pelo Preact. Medidor de nível, linha de progresso da rotação e fps atualizam o DOM direto (ref + `requestAnimationFrame`/tick do Core); componentes só re-renderizam em eventos (troca de preset, abrir gaveta, mudar ajuste).
- **Descartado:** React (o PRD v2 previa por o protótipo v1/v2 ser JSX, mas o protótipo v3 do Palco é HTML/JS puro, então não há migração direta a aproveitar; ~10× maior); TypeScript puro (sem dependência, mas caro de manter na escala da Fase 2).

## 2026-11-08 — Spec 008: núcleo de comandos e persistência
- **Core:** `src/renderer/src/core/` — `state.ts` (tipos, padrões e `sanitize*`: campo inválido volta ao padrão, JSON estranho nunca quebra), `events.ts` (emissor tipado), `commands.ts` (`Core.run(nome, args, origem)` com 23 comandos; erro de validação vira `{ ok: false }`, nunca exceção). O Core não toca Butterchurn nem áudio: `main.ts` assina `presetChanged`/`stateChanged` e aplica. `levelTick` sai do loop direto para os assinantes, ~10×/s, fora do store.
- **Sem `@preact/signals` por ora:** o emissor + `core.state` bastam para a 008; reavaliar na 009 quando houver componentes reais.
- **Persistência:** `src/main/store.ts` (`JsonStore`) em `userData`, debounce de 500 ms, escrita atômica (`.tmp` + `rename`), `flush` no `before-quit`; arquivo ilegível vira `.bak` e o app usa os padrões. O renderer só fala com o disco pelo preload (`window.so.settings/library/window`).
- **Abertura:** preset ao abrir = último usado. Se ele só existir nos pacotes extras, a abertura espera os extras por até 1 s e depois cai para um aleatório do pacote base, para não estourar o "abre e reage em < 3 s".
- **`F` = tela cheia** (igual a `F11`), por decisão do usuário, em vez de favoritar como no protótipo (ver DIVERGENCIAS). Favoritar continua como comando (`library.favorite`), sem atalho global por enquanto.
- **Rotação por coleção:** `collection.play` liga a rotação com `order: 'collection'`, e o intervalo em vigor passa a ser o da coleção, sem sobrescrever o intervalo geral.

## 2026-11-08 — Checagem de segurança de dependências
- **Decisão:** toda dependência nova ou versão nova passa por uma checagem rápida no momento em que entra, registrada em [docs/dependencias.md](docs/dependencias.md): licença, versão publicada há **14 dias ou mais**, install scripts, proveniência (`dist.attestations`), dependências diretas e `npm audit`. Regra em CONTEXT, AGENTS e na skill `executar-task`.
- **Por quê:** é o jeito barato de pegar os riscos mais comuns de cadeia de suprimentos (versão sequestrada, install script novo, licença incompatível) sem auditoria pesada, e deixa registrado o que foi checado. Pedido do usuário.
- **Primeiro efeito:** o Preact entrou na 11.0.2, não na `latest` 11.2.0 (2 dias). A checagem retroativa achou `electron@45.2.3` e `vite@8.3.6` com menos de 14 dias; ficaram como estão até o usuário decidir.
- **Limite conhecido:** `npm audit signatures` não funciona no container da nuvem (falha ao baixar as chaves); a proveniência é lida pelo `npm view`.

## 2026-11-08 — Spec 009: Palco, faixa de controle e assinatura
- **Arrasto da janela só por uma faixa de 40 px no topo** (invisível, recuada 6 px das bordas), escolha do usuário. Na spec 004 o visual inteiro era área de arrasto, mas no Windows a região `-webkit-app-region: drag` engole o `mousemove`, e a faixa de controle não conseguiria aparecer ao mexer o mouse em modo janela. A faixa no topo mantém o encaixe nativo do Windows (Aero Snap, duplo clique maximiza). **Descartado:** arrasto por JS em qualquer lugar (perde o encaixe nativo e é mais código).
- **Cursor:** some junto com a faixa (2,5 s parado), também em modo janela, como no protótipo; o temporizador próprio de 3 s da spec 004 saiu.
- **Fontes embutidas:** Space Grotesk e JetBrains Mono via `@fontsource` (OFL-1.1, escolha do usuário), só os pesos usados. O renderer usa `build.assetsInlineLimit: 0`, porque o Vite embutia as fontes pequenas como `data:` e a CSP (`default-src 'self'`) as bloqueava. A tipografia final continua em aberto (TASKS); trocar é mudar dois imports.
- **Ícones:** 13 SVGs do Lucide copiados para `ui/icons.tsx` (ISC), sem pacote. **Descartado:** `lucide-preact` (dependência a mais para poucos ícones).
- **Tokens:** `ui/theme.css` é cópia de `so-v3-base.css` (versão `1794154301-3f85`) sem a barra do protótipo; ao sincronizar o design, conferir se precisa acompanhar.
- **Assinaturas de eventos com `useLayoutEffect`:** o primeiro preset e o resultado da captura chegam logo depois da montagem; com `useEffect` a UI perdia esses eventos (visto no teste com Chromium headless).
- **Captura com "Tentar de novo":** a captura saiu da abertura bloqueante. O app abre, desenha e depois pede a captura; se ela for recusada (ou a track terminar), o Core passa ao estado `denied` e o Palco mostra o cartão. Sem som (aviso visível) ou sem captura, a rotação congela a contagem.
- **HUD de depuração** escondido por padrão; `Ctrl+Shift+D` mostra e esconde. Erro fatal na abertura continua aparecendo nele.
- **Botões das próximas specs** (Biblioteca, busca, Ajustes) e a alça da borda aparecem desabilitados, com "em breve" no `title`, até as specs 010/011.
- **Teste visual na nuvem:** a página compilada roda no Chromium headless (Playwright) com `window.so` e `getDisplayMedia` simulados (oscilador ou recusa). Serve para layout e estados; áudio real e fps continuam só no Windows.

## 2026-11-08 — Spec 010: busca rápida e Biblioteca
- **Mesmo índice nas duas portas:** `ui/library-data.ts` filtra por trecho do nome completo (autor + título), sem diferenciar maiúsculas; ocultos nunca aparecem na busca, na Biblioteca, no aleatório nem na rotação (o filtro está no `PresetLibrary`, desde a 008).
- **`Esc` saiu do processo main:** fecha o que estiver aberto (menu → busca do campo → coleção → gaveta) e, sem nada aberto, sai da tela cheia. Antes o main engolia o `Esc` em tela cheia e a gaveta não fecharia. `L` alterna a Biblioteca; `/` abre a busca fora de campos de texto; `Ctrl+K` abre e fecha a busca de qualquer lugar.
- **Foco na abertura com `useLayoutEffect`** e a classe do body aplicada pelo próprio componente: com `setTimeout`, o que se digitava logo depois do `Ctrl+K` se perdia (pego no teste headless).
- **Miniaturas provisórias:** gradiente com matiz estável por nome (hash), sem capturar quadro. A miniatura real (P1 da spec) fica para depois: renderizar cada preset fora da tela custa GPU e não pode atrapalhar o render.
- **Reordenar coleção** por arrastar (HTML5 drag-and-drop) com a alça; remover com o `x` da linha.
- **"Nova coleção" também no submenu "Adicionar à coleção"**, para não obrigar a ir à aba Coleções antes.

## 2026-11-08 — Transições: tipo escolhido sobrescrevendo o BlendPattern em tempo de execução
- **Contexto:** o usuário quer a troca manual também com transição e quer escolher entre corte seco e tipos de transição ("playground" ao vivo). Spec [013](docs/specs/013-transicoes.md).
- **Decisão (do usuário):** expor os 4 padrões que o Butterchurn 2.6.7 já tem (crossfade, varredura, plasma, radial) mais Corte seco e Aleatório, separados para troca manual e automática. O tipo é forçado **em tempo de execução**, envolvendo `visualizer.renderer.blendPattern.createBlendPattern`: troca o `Math.random` só na chamada que sorteia o tipo, ou preenche a malha de crossfade. Sem patch no pacote e sem dependência nova; se a estrutura interna mudar, o app volta ao sorteio do motor.
- **Padrão novo da troca manual:** Aleatório, 1 s (antes: corte seco, como no protótipo). Quem já tinha 0 s salvo continua com corte seco.
- **Descartado:** `patch-package` no `blendPattern.js` (primeiro degrau da escada "Butterchurn como dependência fixada": mais robusto, mas dependência e patch a manter); efeitos próprios por cima do canvas no P0 (ficam para uma spec "Efeitos de transição").
- **Risco:** depende de nomes internos do bundle 2.6.7; o spike 006 (Butterchurn 3) precisa refazer a ligação.

## 2026-11-08 — Spec 013: transições implementadas
- **Respostas do usuário às perguntas da spec:** `+`/`−`/`0` (ganho) ficam como atalhos **permanentes**, também depois dos Ajustes rápidos (a 011 tira só `[`/`]`); o tipo da troca automática **não ganha tecla**, só Ajustes rápidos (011) e, até lá, o `settings.json`.
- **Estado:** `settings.blend = { manual: {type, seconds}, auto: {type, seconds} }`, tempo de 0,1 a 10 s. Com Corte seco o tempo fica guardado, para `B` voltar a misturar com o mesmo tempo. O formato antigo (`manualSeconds`/`autoSeconds`) é migrado na leitura, em `sanitizeSettings`.
- **Shift = corte seco** entra como argumento `cut: true` em `preset.next/previous/random`, e não como um comando novo. O evento `presetChanged` passa a levar `blendType`.
- **Sobrescrita na instância:** `visualizer.renderer.blendPattern.createBlendPattern` é trocado só naquele objeto (não no protótipo da classe). No crossfade, a malha é preenchida até `(mesh_width+1)×(mesh_height+1)`, recalculado a cada troca. Se a estrutura não existir, `blendTypesAvailable = false`, o console avisa e o toast de `B` diz "indisponível: sorteio do motor".
- **Efeito da migração no PC do usuário:** o `settings.json` salvo pela 008/009 tem `manualSeconds: 0`, então a troca manual abre em **Corte seco** (critério 9). O padrão novo, Aleatório 1 s, só vale para instalação nova; com o usuário é só apertar `B`.

## 2026-11-08 — Design f126: spec 014 e controles visuais na 011
- **Divisão (decisão do usuário):** o comportamento do texto sobre o visual (preferências, Modo limpo `T`, `eye-off`) e os controles da janela ficam na spec nova [014](docs/specs/014-texto-sobre-visual-janela.md) (#34). A 011 só desenha os controles, junto com os seletores de tipo da 013. É o mesmo padrão da 013: comportamento antes, UI na 011. **Descartado:** pôr tudo na 011, que passaria de ~150 linhas e viraria um PR único grande.
- **Toasts de resposta a tecla não são "importantes"** (decisão do usuário, igual ao protótipo): com "Só importantes" ou com o Modo limpo, ganho, rotação, transição e favoritos não mostram toast. A confirmação do próprio Modo limpo sempre aparece.
- **Modo limpo salvo** em `settings.overlayText.clean`, porque o protótipo não diz se ele volta ao reabrir. Faz sentido para quem deixa a tela limpa como padrão.
- **Arrasto:** a faixa de 40 px termina antes da zona dos controles (`right: 166px`), porque a região de arrasto engole o `mousemove` no Windows. O design diz "arrastar pelo visual"; a divergência está em DIVERGENCIAS.

## 2026-11-08 — Spec 015: expressividade no lugar do ganho em `+`/`−`
- **Problema observado pelo usuário:** subir o ganho tem efeito só por alguns segundos. **Causa:** o Butterchurn entrega aos presets `bass = imm / longAvg` (média longa de ~4 s), então o ganho entra no numerador e no denominador ao mesmo tempo.
- **Decisão (do usuário, depois do spike no Windows):** `+`/`−`/`0` passam a controlar a **Expressividade** (−3…+3), com dois controles de "playground": **Caráter** (`X`: Contraste / Energia / Nervo) e **Memória** (`Shift+X`: Curta / Longa / Fixa). O ganho sai do teclado e fica só nos Ajustes rápidos e nas Configurações. Isso **reverte** a resposta da spec 013 ("`+`/`−`/`0` ganho permanente").
- **Como:** `renderer.audioLevels.updateAudioLevels` envolvido na instância (sem patch), reescrevendo `val`/`att` depois do original, com a saída limitada a 0–4. Mesmo risco da 013: depende de nomes internos da 2.6.7, e o spike 006 precisa refazer a ligação.
- **Nomes:** "curva A/B/C" e "adaptação" do spike não diziam nada a quem toca; viraram Caráter e Memória, e o toast explica cada opção. Valor salvo e global; por preset fica para P2.
- **Descartado:** offset de beat sozinho (sobe a base, mas não muda o contraste); manter o ganho no teclado em `Shift+↑`/`↓` (o usuário preferiu só nos Ajustes, já que o efeito some).

## 2026-11-08 — Queda do driver de vídeo: vazamento de shaders, log e 60 fps por padrão
- **Ocorrência:** o build do spike 015, aberto por muito tempo junto com outros programas, travou e fechou, e os monitores piscaram (sinal típico de reset do driver de vídeo, TDR). A causa exata não foi confirmada: o app não registrava nada.
- **Vazamento achado no motor:** a cada `loadPreset`, o Butterchurn 2.6.7 cria programas WebGL novos para warp e comp e nunca apaga os antigos (o bundle tem 15 `createProgram` e 1 `deleteProgram`). Com rotação de 30 s, são ~240 programas por hora presos à GPU até o coletor de lixo passar. **Correção** em `engine-fixes.ts`, sem patch: os 4 objetos de shader apagam o próprio programa antigo depois de criar o novo. No headless, os programas vivos ficaram constantes em 20 trocas (antes: +2 por troca).
- **Resiliência:** a perda do contexto WebGL recarrega a página em 1,5 s (os ajustes já estão salvos); a queda do renderer recarrega a janela; a queda do processo da GPU fica registrada.
- **Log em arquivo** (`userData/logs/sonic-obsidian.log`, rotação em 1 MB, `Ctrl+Shift+L` abre a pasta): abertura, quedas, contexto perdido, janela oculta/visível e memória por processo a cada 5 min, para achar vazamentos em sessões longas. O HUD mostra a memória JS.
- **Limite de fps padrão = 60** (decisão do usuário), configurável: `'monitor'` gravado até a versão 1 do `settings.json` migra uma vez para 60. Antes, o padrão seguia o monitor (180 Hz na máquina principal) e mantinha a GPU no máximo o tempo todo.
- **NaN:** a expressividade agora converte NaN e infinito em neutro (`Math.min`/`Math.max` deixam NaN passar).
- **Descartado:** `disable-gpu-process-crash-limit` (esconderia quedas repetidas); pausar o render manualmente quando a janela perde o foco (o Chromium já pausa quando ela fica oculta, e o log vai mostrar se isso acontece).

## 2026-11-08 — Spec 014 e foco dos botões da faixa
- **Avisos e Modo limpo** ficam numa política única em `ui/toast.ts` (`setToastPolicy`), com `showToast(texto, ms, { important, force })`. *Nenhum* esconde até os importantes; a confirmação do Modo limpo usa `force`. Painéis de estado não passam por aí.
- **Assinatura na abertura:** com "Só quando eu troco", a primeira assinatura (origem `startup`) aparece, porque só a rotação troca em silêncio.
- **Foco depois do clique:** um clique com o mouse em botões da faixa, dos controles da janela ou da alça tira o foco (`blur` quando `click.detail > 0`). Sem isso, a próxima tecla global mostrava o anel de foco (a estrela parecia marcada no preset seguinte) e o `Espaço` acionava o botão em vez de sortear. Pelo teclado (`Tab`), o foco continua. **Descartado:** tirar o `:focus-visible` dos botões (quebra a navegação por teclado).

## 2026-11-08 — README público e organização para a abertura
- **Decisão:** o `README.md` passa a ser a vitrine pública, **em inglês**, com tradução completa em `README.pt-BR.md` (decisão do usuário para a abertura: inglês principal, pt-BR secundário). Leva lockup, banner, prints reais da interface, galeria de presets com crédito, recursos, atalhos, privacidade, desenvolvimento, arquitetura em Mermaid, roadmap e créditos. O resto da documentação continua em português, como manda o CONTEXT.
- **Organização sem mover nada:** índice novo em `docs/README.md`; marca em `docs/brand/` (SVGs do *The Core* tirados do Design System, PNGs de lockup gerados da mesma construção); imagens em `docs/media/` com origem e crédito de cada uma. Nenhum arquivo existente mudou de lugar, porque skills e outros agentes dependem dos caminhos atuais.
- **Imagens:** só capturas reais (Butterchurn ou o app em Chromium headless com áudio simulado), nunca imagem gerada. Os prints da interface envelhecem a cada spec de UI; o passo a passo para refazê-los está em `docs/media/README.md`.
- **Licença:** o README declara o estado atual (proprietária) e a intenção de abrir sob MIT; o `LICENSE` não mudou.
- **Descartado:** README só em português (a abertura mira público internacional); mover specs/pesquisa para outra estrutura de pastas (quebraria links de skills e sessões em andamento); templates de issue/PR agora (o fluxo atual cria issues pelas skills; fica para a abertura).

## 2026-11-08 — Microinterações: o que entra e quando
- **Contexto:** a versão `1794175739-7509` do design marca as 23 microinterações (M01–M23) como aprovadas e usa o Palco integrado como implementação de referência. Faltava dizer em que ordem entram no app.
- **Decisão (do usuário):** M04, M13, M14, M15, M16 e M19 entram no PR 1 da spec 011 (Ajustes rápidos), porque mexem nos componentes que esse PR já toca. M10 entra no PR 2 (Configurações). M01–M03, M05–M08, M12 e M22 entram num PR curto de "microinterações da faixa" logo depois da 011. M09, M17, M20, M21 e M23 esperam a feature que lhes dá sentido (tap tempo, copiar, Rack, soltar arquivos, BPM: Fases 3–4). M11 já é assim (busca sem animação).
- **M18 (silêncio):** o painel "Sem áudio" continua aparecendo depois de **10 s** (spec 005), não de 1,2 s como no design, para que as pausas entre faixas não mostrem o painel. Do M18 entram o fade de 220 ms e o medidor apagando em cascata. Registrado em DIVERGENCIAS.
- **Descartado:** tudo num PR só (ficaria grande e misturaria a faixa com a 011); deixar a faixa para depois da 012.

## 2026-11-08 — Spec 011, PR 1: Ajustes rápidos
- **Toast único de 4 s (M13):** todo toast passa a viver 4 s, pausa com o mouse em cima e troca o texto no lugar. Antes eram 1,5 s nas teclas, 2,4 s em `X` e 2,6 s na Biblioteca e na busca. `showToast` perdeu o parâmetro de duração. **Descartado:** manter durações por origem, que o design 7509 unificou.
- **`[` e `]` saem;** `ROTATION_STEPS_S` vira a lista dos Ajustes (15/30/45/90 s). Um intervalo salvo fora dela (10, 60, 120 s) aparece como opção a mais, para não ser trocado sem querer.
- **Esc nos Ajustes** fecha o painel mesmo com o foco num slider ou seletor. Teclas globais com o foco no painel ficam desligadas, como na Biblioteca: as setas são do slider.
- **O visual a 40%** com o painel aberto é aplicado no `<canvas>` (opacidade via CSS), sem tocar no render.

## 2026-11-08 — Ícone do app na barra de tarefas
- **Pedido do usuário:** o logo do app na barra de tarefas do Windows.
- **Como:** `resources/icon.ico` gerado de `docs/brand/app-icon.svg` (9 tamanhos, 16–256 px), passado ao `BrowserWindow` (`icon`) e ao `win.icon` do electron-builder, mais `app.setAppUserModelId` com o `appId`, para o Windows agrupar a janela com o ícone certo.
- **`.exe` com o ícone** (decisão do usuário): `signAndEditExecutable: true`, para o electron-builder editar o executável (rcedit) e o ícone aparecer também no Explorer e no atalho fixado. Sem certificado, nada é assinado. Se o CI falhar baixando o `winCodeSign`, a volta é desligar de novo.
- **Descartado:** dependência nova para gerar o `.ico` (Chromium e ImageMagick já estão no ambiente).
