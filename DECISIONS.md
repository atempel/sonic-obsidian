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

## 2026-11-08 — Licença MIT antecipada e arquivos de comunidade
- **Decisão (do usuário):** o código passa a ser **MIT** já, `Copyright (c) 2026 Alexandre Tempel`, com o repo ainda privado. `LICENSE`, `package.json` (`"license": "MIT"`), READMEs e CONTEXT atualizados. Isso antecipa parte do checklist "no dia" da spec 016 (PR #42): a troca do `LICENSE`, a seção de licença do README e os arquivos de comunidade (`CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, templates de issue — bug, ideia, crédito de preset — e de PR). Responde também à pergunta em aberto da 016 sobre quem assina o copyright: nome pessoal.
- **Por quê:** a licença já estava decidida; com ela e os arquivos de comunidade prontos antes, a abertura vira só tornar o repo público, e os templates podem ser testados enquanto ele ainda é privado.
- **Contato:** sem e-mail público. Segurança e conduta vão pelo relato privado de vulnerabilidade do GitHub (*Security → Report a vulnerability*), que precisa estar ligado nas configurações.
- **Configurações do repo** (descrição em inglês, tópicos, merge só por squash com título do PR, apagar branch após o merge, Projects desligado, Dependabot, prévia social `docs/media/social-preview.jpg`): aprovadas pelo usuário, aplicadas pela interface do GitHub, porque o proxy da sessão na nuvem não permite gravar configurações pela API.
- **Repo público (2026-11-08, decisão do usuário):** aberto no mesmo dia, antes das releases e da landing (specs 016/017), que seguem como próximos passos. Até a primeira release, o README manda compilar a partir do código.
- **Descartado:** esperar a abertura para trocar a licença (era a recomendação; o usuário preferiu adiantar); texto integral do Contributor Covenant (adotado por link, com resumo e forma de contato).

## 2026-11-08 — Abertura: GitHub Pages e releases por tag
- **Decisão:** na abertura do repo (sem data; quando o usuário decidir), o projeto passa a MIT, a landing page fica no **GitHub Pages** (`atempel.github.io/sonic-obsidian`, `/pt/` para português) e o app é distribuído pelo **GitHub Releases**. Uma tag `vX.Y.Z` gera um rascunho de release com instalador, zip portátil e `SHA256SUMS.txt`; o usuário publica à mão. Os arquivos têm nome **sem versão**, para a landing usar o link fixo `releases/latest/download/<arquivo>`. Specs [016](docs/specs/016-releases-abertura.md) e [017](docs/specs/017-landing-github-pages.md).
- **Por quê:** o usuário já publicou landings no GitHub Pages; tudo (código, releases, site) fica num lugar só e sem custo. Como o Pages gratuito só publica de repo público, o site só vai ao ar junto com a abertura; o workflow de Pages fica pronto antes, com guarda para pular enquanto o repo for privado.
- **Landing:** o protótipo é o canvas do Claude Design (EN + PT-BR, responsivo, demo ao vivo com Butterchurn, aviso de fotossensibilidade). O site final não usa CDN nem Google Fonts: motor, presets e fontes são servidos do próprio site, coerente com a promessa de privacidade.
- **Atualização (mesmo dia):** o repo abriu antes, com MIT e arquivos de comunidade ([#43](https://github.com/atempel/sonic-obsidian/pull/43), entrada acima). Das specs 016/017 sobram o pipeline de release, a landing e ligar o Pages.
- **Fixado com o usuário:** nome do repo `atempel/sonic-obsidian` e `appId` `dev.atempel.sonic-obsidian` não mudam na abertura; o MIT sai como `Copyright (c) 2026 Alexandre Tempel`.
- **Descartado:** Cloudflare (Pages está em modo de manutenção, a recomendação atual é Workers com arquivos estáticos). Ganharia prévia por PR, cabeçalhos HTTP, analytics sem cookies e publicação com o repo ainda privado; reavaliar se algum desses virar necessidade. Também descartados: assinatura de código e Microsoft Store por ora (SmartScreen avisa; a landing explica).

## 2026-11-08 — Ícone do app na barra de tarefas
- **Pedido do usuário:** o logo do app na barra de tarefas do Windows.
- **Como:** `resources/icon.ico` gerado de `docs/brand/app-icon.svg` (9 tamanhos, 16–256 px), passado ao `BrowserWindow` (`icon`) e ao `win.icon` do electron-builder, mais `app.setAppUserModelId` com o `appId`, para o Windows agrupar a janela com o ícone certo.
- **`.exe` com o ícone** (decisão do usuário): `signAndEditExecutable: true`, para o electron-builder editar o executável (rcedit) e o ícone aparecer também no Explorer e no atalho fixado. Sem certificado, nada é assinado. Se o CI falhar baixando o `winCodeSign`, a volta é desligar de novo.
- **Descartado:** dependência nova para gerar o `.ico` (Chromium e ImageMagick já estão no ambiente).

## 2026-11-08 — Spec 011, PR 2: Configurações
- **Ganho padrão × ganho em vigor:** `settings.gainDefaultDb` é o ganho ao abrir (Configurações › Captura); `gainDb` é o ganho mexido nos Ajustes rápidos durante a música e **volta ao padrão a cada abertura**, como no protótipo ("Aplicado ao abrir. Durante a música, use os Ajustes rápidos."). Na migração, o `gainDefaultDb` nasce do `gainDb` salvo, então ninguém perde o ganho que usava. **Descartado:** manter o ganho dos Ajustes entre aberturas (seriam dois controles para a mesma coisa).
- **Renderização na hora:** malha por `setInternalMeshSize`, FXAA por `setOutputAA`, escala de pixels, texturas e tamanho do canvas por `setRendererSize(w, h, {pixelRatio, textureRatio})`, com o canvas menor esticado pelo CSS. O pacote de imagens extras é carregado sob demanda (import dinâmico) e só sai na próxima abertura. FXAA passa a vir ligado por padrão, como no protótipo.
- **Arquivos de coleções** pelo diálogo nativo no main (`collections:export`/`collections:import`, limite de 2 MB); o renderer só passa texto. Importar substitui coleções de mesmo id e acrescenta as novas.
- **Links do Sobre** abrem no navegador por `system:openLink` (só `https://`), e toda janela nova é negada (`setWindowOpenHandler`).
- **Fora deste PR:** regravar teclas (P1), Telas e Integrações (Fases 3–5) e as opções de desempenho da spec 012.

## 2026-11-09 — Landing (spec 017): porte e desvios do protótipo
- **Porte:** `site/` gerado uma vez a partir de `docs/design/landing/prototype/Main(PT).dc.html` (versão `1794165992-cb8e`): marcação do canvas mantida, `{{ }}`/`sc-if`/`sc-for`/`ref` viraram atributos `data-text`/`data-if`/`data-ref`/`data-act` e um `<template>` para a Biblioteca; a classe `Component` virou `site/assets/stage.js` (mesmo palco, faixa sintetizada, espelhos, portão de reduced-motion). Sem build; `site/vendor/` vem de `npm run site:vendor`. `og.png` renderizado do `SocialCard.dc.html`.
- **Desvios de texto (de propósito, para a página pública não prometer o que o app ainda não faz):** cartão do instalador sem "abrir com o Windows" e "atualizações automáticas" (são P1 da spec 016); portátil sem "configurações junto do executável" (o app grava no `userData`); cartão do winget marcado "SOON / EM BREVE", sem botão Copiar (publicação no winget é P1 da 016). Quando essas coisas existirem, voltar ao texto do canvas.
- **Release:** versão, data e tamanhos vêm de `api.github.com/.../releases/latest`; sem release publicada (hoje) mostram "Latest release"/"—" e os botões de download dão 404 até a spec 016 publicar a primeira.
- **CI:** `build-windows.yml` ignora `site/**` e `docs/**`. Se algum dia esse check virar obrigatório na proteção de branch, PR só de docs/site ficará esperando — trocar por filtro dentro do job.

## 2026-11-08 — Spec 012: setup, diagnóstico e desempenho por preset
- **Um PR só** (decisão do usuário).
- **Flags de teste em arquivo** (decisão do usuário; o usuário não roda o app pela linha de comando): `test-flags.json` na pasta de dados do app (a pasta acima de `logs/`, que `Ctrl+Shift+L` abre), com `{"captureFail": true}` (a primeira tentativa de captura falha como se o Windows recusasse; "Tentar de novo" é real) e/ou `{"noWebgl2": true}` (abre direto no diagnóstico de WebGL 2). Só esses dois booleanos; arquivo ausente ou inválido não faz nada; a flag ativa aparece no log. **Descartado:** teclas de teste no HUD.
- **Aviso de silêncio:** um texto só, o do Setup ("Nenhum som chegando…", decisão do usuário), com "Testar captura" (3 s de medidor ao vivo, "sinal"/"sem sinal"). Continua aparecendo aos 10 s (DIVERGENCIAS M18); `Esc` fecha até o próximo silêncio de 10 s.
- **Boas-vindas uma vez para todos** (decisão do usuário): `settings.welcomeSeen`. Quem já usa o app vê o cartão uma vez.
- **Checklist real da captura:** saída padrão (lista de dispositivos do Chromium; se a captura funcionar, ela existe), permissão (`getDisplayMedia`), formato (taxa e canais da track) e sinal (até 3 s de som antes do ganho). Sem som, a captura conta como funcionando e o item de sinal fica "Pendente". "Copiar diagnóstico" vai pelo main (`clipboard`), com versão, data e cada item.
- **Desempenho por preset:** fps médio de 5 s, 1 s depois do fim do blend, só com a janela visível, guardado em `library.json` (`presetFps`). "Pular presets lentos" ligado = **avisar** na faixa ("<N> fps · preset pesado" + "Pular e ocultar"); o app não oculta nada sozinho, porque uma queda passageira (outro programa pesado aberto) esconderia presets bons. O mínimo nunca passa do limite de fps − 2 (com limite 30 e mínimo 30, nada seria pesado por definição). Restaurar um oculto por desempenho apaga a medida, para medir de novo.

## 2026-11-09 — Landing: movimento da v3 e música licenciada em espera (spec 019)
- **Decisão:** o refino da landing reaproveita o sistema de movimento da v3 (tokens, regras e M02–M08/M10/M12), sem animação decorativa nova; a entrada das seções ao rolar segue a regra da M01 (uma vez, 6 px, degrau de 20 ms). No movimento reduzido vale o doc de microinterações (fades ≤ 120 ms), não o `so-v3-base.css`, que zera tudo.
- **Música (atualizado no mesmo dia):** o usuário confirmou nos termos do Uppbeat que conteúdo de site é permitido; ficam proibidos redistribuir os arquivos como avulsos e o conteúdo só para ouvir. A demo da landing passa a tocar '24 Hrs In Tokyo' (Yawnathan) e 'Space Dancers' (2050) em sequência, sincronizando o visual (não é conteúdo só para ouvir), com crédito no console e nos créditos. Como o repo é público e MIT, os arquivos ficam **criptografados** em `site-media/*.enc` e só o deploy do Pages decifra, com o segredo `SITE_AUDIO_KEY`; o artifact de PR não leva as músicas. Descartado: o MP3 em claro no git (seria oferecer o arquivo para download e ficaria para sempre no histórico) e outro host (mais uma conta e mais um ponto de falha). Limite conhecido: quem visita o site ainda pode salvar o áudio pela aba Network; isso vale para qualquer áudio na web e não é oferecer download.

## 2026-11-09 — Spec 020: painel de atalhos e lista única
- **Lista única** em `src/renderer/src/ui/shortcuts.ts`: grupos de atalhos, grupos "Agora" e comandos da busca. A tabela das Configurações, o painel `?` e a busca leem dela; tecla nova no `keydown` entra também nessa lista. **Descartado:** manter a tabela local das Configurações e copiar para o painel (já havia três cópias divergentes).
- **Painel fora do `core.state.overlay`:** é um estado de interface à parte (`ShortcutsPanel.tsx`), para abrir por cima da Biblioteca sem fechá-la (grupo "Agora · Biblioteca"). A busca e os Ajustes rápidos fecham ao abrir o painel, e vice-versa. **Descartado:** um overlay `shortcuts` no Core (fecharia a Biblioteca, e o painel não é ação que o MCP precise).
- **Comandos da busca executam as mesmas funções das teclas** (`setActionRunner` em `main.ts`), com os mesmos toasts.
- **Do usuário:** F continua sendo tela cheia; o grupo Diagnóstico entra sem o F12; os comandos aparecem só na aba Todos, abaixo dos presets.

## 2026-11-09 — Passagem de manutenção: tempos da abertura, CI e registros
- **Abertura lenta:** o log do usuário só tinha o `app ready` ("abriu") de cada abertura, nenhuma etapa depois disso. Agora o main grava uma linha `abertura (ms desde o processo): …` com as etapas `main.js`, `pronto`, `janela`, `página carregada`, `renderer`, `ajustes lidos`, `motor`, `primeiro preset`, `primeiro quadro` e `captura` (os pacotes extras entram se chegarem antes). As marcas do renderer vão por `window.so.mark` (só nomes conhecidos; o main carimba a hora na chegada). Primeiro medir, depois corrigir a etapa que cresceu. **Descartado:** otimizar às cegas (ex.: adiar os pacotes extras) sem saber qual etapa está lenta.
- **CI:** o `push` do `build-windows.yml` passa a valer só para o `main`. Branches de trabalho buildam pelo PR, uma vez só.
- **Dependências:** `electron`/`vite` mantidos até completarem 14 dias; `minimatch` aceito por ser só de empacotamento (detalhes em `docs/dependencias.md`).
- **Segurança da janela, conferida sem mudanças:** `contextIsolation`, `sandbox` e `nodeIntegration: false`, preload com API estreita, CSP `default-src 'self'`, janelas novas negadas. O `'unsafe-eval'` da CSP continua necessário, porque os presets do `butterchurn-presets` são JS (o caminho WASM é o spike 006).

## 2026-11-09 — Primeira release: v0.5.0 e versão pelo roadmap
- **Regra (pedido do usuário):** a 1.0 é o app com tudo o que o PRD planeja hoje (Fases 0–5 e abertura). A versão sai da fração do roadmap entregue, com peso por prioridade (P0 = 3, P1 = 2, P2 = 1):
  - Fase 1 (4 × P0): 12 de 12.
  - Fase 2 (5 P0, 2 P1, 1 P2): 20 de 20.
  - Fase 3: 0 de 15.
  - Fase 4: 0 de 14.
  - Fase 5: ~0,7 de 7 (ícone e instalador, da linha "Iniciar com o Windows, instalador, ícone").
  - Abertura (landing e releases, 2 × P0): 6 de 6.
  - Total: ≈ 39 de 74, cerca de 52%, logo **0.5.0**. Contar só as fases dá o mesmo (0, 1 e 2 de 0–5 = 3/6).
- **Daqui para frente:** cada fase concluída sobe o *minor* conforme a mesma conta. Correções sobem o *patch*. *Pre-release* (`-beta.N`) só quando o usuário pedir.
- **Release como rascunho:** a tag cria o rascunho, e o usuário testa o instalador e o zip antes do *Publish*. Isso cobre o fato de os builds de #53 e #56 ainda não terem sido testados no Windows.
- **Ensaio em PR:** o `release.yml` também roda em PR que mexe no empacotamento. Nesse caso só builda e sobe os três arquivos como artifact, para testar o instalador antes de existir tag.
- **Descartado:** 0.1.0 (não reflete o que já existe); `0.x-beta` (o link `releases/latest/download` ignora pré-releases e a landing continuaria dando 404).
- **Atualização (mesmo dia):** a sessão na nuvem não consegue enviar tags (o push de `v0.5.0` foi recusado). O `release.yml` ganhou um disparo manual com `version`: ele faz a mesma checagem e o mesmo build e cria o rascunho apontando para o commit disparado (`--target`). A tag nasce quando o usuário publica. O push de tag continua valendo para quem tiver git local.

## 2026-11-09 — Abertura lenta e memória da GPU: o que o log da v0.5.0 mostrou
- **Abertura:** são duas aberturas da v0.5.0 no Windows do usuário.
  - **Primeira** (logo depois de instalar): `main.js` só começou a rodar 8,3 s depois de o processo nascer. Do `main.js` em diante, o app levou o mesmo ~1 s de sempre.
  - **Segunda:** `main.js` aos 69 ms, janela aos 535 ms, primeiro quadro aos **1,09 s**. A captura fica pronta aos 2,7 s, sem bloquear o visual.
  - **Conclusão:** a lentidão vem de antes do código do app. É o Windows (Defender/SmartScreen) examinando um `.exe` novo e sem assinatura na primeira execução. Como o usuário sempre testa um build novo, todo teste caía na primeira abertura, o que explica "ficou mais lenta há algumas builds".
  - **Fica assim:** nada a otimizar no código por ora. Assinar o código continua fora de escopo (spec 016).
  - **A conferir:** se a terceira abertura também ficar em ~1 s, o item fecha. A suíte de performance no CI deve medir a abertura "quente" e a "fria" separadamente.
- **Memória da GPU:** sessão de ~40 min com o app visível (16:47–17:27), memória a cada 5 min.
  - GPU oscilou entre 158 e 200 MB, sem tendência de alta.
  - Página oscilou entre 310 e 444 MB e cai quando o GC age.
  - Browser estável em ~140 MB.
  - **Conclusão:** o vazamento de shaders (DECISIONS 2026-11-08) não voltou.
- **Bug achado no mesmo log:** "preset pesado: Flexi - predator-prey-spirals a 6.7 fps" saiu 2 ms depois de a janela voltar a ficar visível. Com a janela oculta, o `requestAnimationFrame` para, então a medida de 5 s contava o tempo parado como quadros lentos. **Correção:** a medida é descartada quando a janela fica oculta ou quando passam mais de 500 ms entre dois quadros. Uma medida errada já gravada some ao restaurar o preset, ou é sobrescrita na próxima medição.

## 2026-11-09 — Spike 006 aprovado: o app migra para o Butterchurn 3
- **Decisão (do usuário):** o app passa para o Butterchurn `3.0.0-beta.5` com `onlyUseWASM` e uma CSP sem `'unsafe-eval'`. Fecha a "Proposta" de 2026-11-08. Duas specs, um PR cada: [021](docs/specs/021-migracao-butterchurn3.md) (migração) e [022](docs/specs/022-importar-milk.md) (importar `.milk`).
- **Por quê (medido no Windows):**
  - No 2.6.7, um preset com `*_str` malicioso executou JavaScript no app (o título virou "pwned"). No 3.x, nada executa e a página bloqueia `new Function`.
  - O fps é o mesmo (177–180 contra 178–180, no teto do monitor).
  - 472/472 presets carregam. Os 395 atuais estão todos no pacote novo, que traz 77 a mais, então favoritos e coleções não perdem nada.
- **Conversor `.milk`:** roda no processo main (`src/main/milk.ts`), porque o `hlslparser-js` usa `new Function`. Entra texto e sai texto.
  - O `hlslparser-js` troca `a*b*c` por `&&`. Contornos em `src/main/hlsl-fix.ts`: parênteses explícitos no HLSL e nas macros, corpo de volta para o `shader_body`, cópias locais de `uv`/`q`/`texsize`, inicializadores globais movidos para o corpo.
  - Resultado: 463/504 das fontes oficiais linkam (91,9%) e 8/10 fixtures tocam no Windows.
- **A tratar na migração:** um preset trava dentro do WASM ("float unrepresentable") e, em seguida, uma transição falha (`reading 'time'`); o render precisa de `try/catch` e de pular o preset que falha. Seis presets novos têm nome só numérico ("27", "269"), sem crédito do autor no nome.
- **Descartado:**
  - ficar no 2.6.7 e bloquear presets externos (travaria importar `.milk`, o Estúdio e o MCP);
  - converter no renderer (exigiria `'unsafe-eval'`);
  - recompilar o `hlslparser` em C++ para WASM (exige toolchain Emscripten; os contornos chegaram a 92%).

## 2026-11-09 — Spec 021: migração para o Butterchurn 3
- **Preset que trava:** o render tem `try/catch`. Três erros em 1 s pulam o preset até o app fechar: ele sai do "próximo" e do "aleatório", com um toast e uma linha no log, e nada é gravado. **Descartado:** ocultar de vez como em "Ocultos por desempenho". Uma falha pode depender do áudio ou do driver, e esconder para sempre um preset bom seria pior do que tentar de novo na próxima abertura.
- **Carregar preset é assíncrono no 3.x:** os pedidos entram numa fila, e um pedido já superado por outro mais novo é descartado antes de compilar. Sem isso, um preset lento terminaria depois de um mais novo e tomaria a tela.
- **Landing continua no 2.6.7** (aliases `butterchurn-v2-site` e `butterchurn-presets-v2-site`, só como dependência de desenvolvimento). Ela só toca os presets embutidos, não carrega preset de fora. Migrar a landing para o 3.x fica para outra tarefa (a API do 3.x é assíncrona e a saída usa um canvas 2D).

## 2026-11-10 — Spec 022: importar .milk
- **Do usuário:** nome igual a um preset que já está na biblioteca (do pacote ou importado antes) é pulado e avisado, sem renomear (créditos). Limite de 200 arquivos por importação, até 256 KB cada, sem teto total.
- **Validar antes de gravar:** cada preset convertido é carregado num visualizador de 64×64 fora da tela (o mesmo motor, `onlyUseWASM`), que confere se as equações compilam e se os shaders linkam. Só os que passam são gravados. Assim o resumo diz qual shader falhou (`shader comp não compila: 'res' : undeclared identifier`), e o preset atual não é afetado. O visualizador de teste é descartado no fim do lote (`WEBGL_lose_context`). **Descartado:** gravar tudo e descobrir o erro ao tocar (tela preta sem explicação); compilar o GLSL "na mão" fora do motor (repetiria o cabeçalho que o motor monta e quebraria a cada versão).
- **Armazenamento:** `userData/presets/imported/<id>.milk` (fonte, como veio), `<id>.json` (convertido + nome) e `<id>.name`. O id é um hash do nome. Na abertura, os importados entram antes do primeiro preset, para o "último usado" poder ser um deles.
- **Segurança:** o conversor só produz `*_eel` e GLSL, e o motor roda com `onlyUseWASM`. Um `.milk` não tem como trazer JavaScript, e um preset com `*_str` seria recusado de qualquer forma.

## 2026-11-10 — Spec 023: coleções pelo Palco
- **Do usuário:** o botão fica só na faixa, ao lado da estrela, sem atalho. O painel é uma lista com marcação: clicar põe ou tira o preset e o painel continua aberto; "Nova coleção" cria uma com nome, já com o preset. Implementado sem desenho, no estilo do menu "…" da Biblioteca e registrado em DIVERGENCIAS. **Descartado:** só adicionar e fechar (tirar continuaria exigindo a Biblioteca); esperar a sessão de design.

## 2026-11-10 — Fonte "arquivo de áudio" adiada; o próximo passo da Fase 3 é o Estúdio
- **Decisão (do usuário):** o player de arquivo de áudio (escolher/arrastar, com transporte) sai da Fase 3. Volta quando houver uma história que precise dele. A primeira candidata é a **performance sincronizada**: presets programados sobre uma faixa de áudio ([queue/2026-11-10-performance-sincronizada.md](queue/2026-11-10-performance-sincronizada.md)).
- **Por quê:**
  - Nada do que está planejado agora depende de um player. O Estúdio faz a prévia com o áudio do sistema, e a suíte de testes simula o áudio no headless.
  - O player traz peso (decodificação, transporte, troca de fonte, título da faixa) sem um uso concreto.
  - A performance sincronizada vai pedir tempo exato da faixa e marcadores. É melhor desenhar o player para ela do que fazer um mínimo agora e refazer depois.
- **Ordem da Fase 3:** Estúdio agora; microfone (pequeno) depois; SoundCloud continua condicionado ao spike 007.
- **Descartado:**
  - seguir o PRD (arquivo como P0) só porque estava no plano;
  - fazer o microfone antes do Estúdio.
- **Protótipo:** `#srcMenu`, `#trackRow` e a área de soltar que fala de áudio continuam no desenho. No app, a área de soltar segue só com `.milk` (já em DIVERGENCIAS, spec 022).

## 2026-11-10 — Pesquisa de mercado e personas entram no repo
- **Do usuário:** o contexto da pesquisa "Pesquisa de mercado: quem usaria o Sonic Obsidian" (Claude Docs) precisa estar no repositório.
- **Como:** cópia exata, exportada em Markdown, em `docs/research/mercado/`: pesquisa, personas e análise do SYQEL. O original continua no Claude Docs. Para atualizar, exporta-se de novo e o arquivo inteiro é substituído. Única mudança: o nome do autor fica como no LICENSE.
- **Uso:** `planejar-feature` lê as personas, e cada spec diz no cabeçalho qual persona atende.
- **Descartado:**
  - resumir a pesquisa (perderia as fontes e a matriz);
  - só linkar o Claude Docs (agentes na nuvem nem sempre têm o conector).

## 2026-11-10 — Spec 024: troca no beat e segurar vêm antes do Estúdio
- **Do usuário, com base na pesquisa de mercado:** "troca no beat + segurar" atende três personas: DJ de Festa, Streamer de Set e VJ de Clube. O Estúdio atende sobretudo o Criador de Presets. A 024 vem antes, e o Estúdio logo depois.
- **Decisões da spec (do usuário):**
  - **Intervalo em compassos** (4/8/16/32, de 4 batidas cada). Sem batida estável, volta aos segundos.
  - **`Enter` segura** e `R` continua ligando e desligando a rotação (como no SYQEL).
  - **As trocas manuais também esperam a próxima batida** (M23).
- **Técnica:** a detecção é própria, no renderer, sobre o `AnalyserNode` que já existe: fluxo espectral nos graves e autocorrelação, entre 70 e 180 BPM. Assim não entra dependência nova, e o custo fica sob controle (< 0,5 ms por quadro).
- **Descartado:**
  - intervalo em segundos quantizado ao beat (não acompanha a frase musical);
  - `R` como "segurar" (o usuário preferiu separar segurar de desligar a rotação);
  - detectar o primeiro tempo do compasso (downbeat), Ableton Link e MIDI clock, que ficam para quando houver usuários VJ.

## 2026-11-10 — Spec 024: detecção de batida pelo relógio do áudio
- **Problema:** a primeira versão media o fluxo espectral no `AnalyserNode` do silêncio (1024 amostras) a cada quadro. No teste headless (~5 fps) ela errava o BPM (136 em vez de 124): cada quadro só vê os últimos ~21 ms de áudio, e o que cai entre quadros se perde. No Windows isso aconteceria com presets pesados, limite de 30 fps ou quadros longos na troca de preset.
- **Decisão:** um `AnalyserNode` só da detecção, ligado depois do medidor de silêncio (mesmo sinal antes do ganho), com buffer de 32768 amostras (~0,7 s). Cada quadro lê só as amostras novas, pela diferença de `ctx.currentTime`; passa-baixas de 2 polos, energia em células de 10 ms, onset = subida em dB. A rotação e as trocas que esperam a batida contam no relógio do áudio, e um quadro lento pode cruzar mais de uma batida (todas contam). Custo medido: ~0,04–0,1 ms por quadro a 60 fps.
- **Afasta-se da spec** ("sobre o `AnalyserNode` existente"): é um nó a mais do mesmo tipo, sem dependência nova nem mudança no caminho do som.
- **Descartado:** `AudioWorklet` (arquivo de módulo à parte, CSP, mais um caminho de áudio para manter) e aumentar o `fftSize` do medidor de silêncio (mudaria a medida do RMS).
- **Primeira trava:** a contagem em compassos começa na troca seguinte, como a spec já pede para a volta da batida. Assim, a troca nunca muda de unidade no meio de uma contagem.
- **Perda:** sem um onset nas últimas 1,5 batida, a confiança cai; depois de 1 s assim, a batida é dada como perdida (~2–3,5 s no total; critério 3 pede ≤ 4 s). Valores iniciais em `BEAT`, a ajustar com músicas reais.

## 2026-11-10 — Estúdio de presets: corte em duas specs (proposta, aguarda o usuário)
- **Proposta:** 026 = P0 (editar `per_frame_init`/`per_frame`/`per_pixel` com prévia ao vivo no áudio do sistema, compilar com erro legível, salvar como "Meu preset" com crédito "baseado em"); 027 = P1 (abas Básico/Ondas/Formas/Shaders/Código, versões e desfazer, exportar `.milk`, comparar com o original, novo preset, avisos de variável).
- **Armazenamento:** `userData/presets/mine/<id>/` com `preset.json` (preset Butterchurn 3) e `meta.json` (título, autor, `basedOn`). **Por quê:** os presets do pacote já são JSON com `*_eel` e shaders em GLSL, sem `.milk` nem caminho de volta para HLSL. Manter o JSON como fonte editável evita perder os shaders; o `.milk` vira só formato de exportação (P1, com aviso nas cópias do pacote). Isso muda o que o architecture.md §5 diz ("o `.milk` é sempre a fonte"): atualizar quando aprovado.
- **Segurança:** o Estúdio usa a mesma barreira da 022: só `*_eel` (sem `*_str`/`useJS`), 256 KB, `onlyUseWASM`, `<id>` gerado no main, validação no visualizador de teste 64×64 antes de carregar no principal. Dúvida técnica registrada: laço infinito em `while`/`loop` no WASM pode congelar o renderer (spec 026, critério 4).
- **Erros:** vêm do motor, não de um verificador próprio. Em EEL todo nome é variável válida, então `bas_att` não é erro de compilação; o "Você quis dizer?" do protótipo vira aviso na 027.
- **Descartado:** editar presets do pacote no lugar (viola "Remix de …"); usar o `.milk` como fonte para tudo (exigiria conversão reversa de shader); mostrar dois visuais ao mesmo tempo no P0 (custo de GPU; comparação fica na 027).

## 2026-11-10 — Spec 024, revisão 2: detecção recalibrada, adiantamento, Respiro
- **Contexto:** no primeiro teste no Windows, a batida quase não travava e o BPM variava. No log, a trava caía a cada 1–2 s. Um simulador com músicas sintéticas reproduziu o problema:
  - a energia em dB fazia o baixo saindo do sidechain parecer ataque;
  - medir uma nota grave longa em blocos de 10 ms criava uma ondulação periódica, que dava uma trava falsa a 150 BPM no ambiente.
- **Decisão:**
  - energia suavizada (15 Hz), `log1p` e seguidor de pico;
  - checagens de pente ≥ 2,8 e de agudeza ≥ 5;
  - perda depois de 2,5 s;
  - o simulador vira teste no CI (`tests/headless/024-beat-sim.test.cjs`).
  - **Descartado:** biblioteca de beat tracking (dependência e custo) e um `AudioWorklet` (não resolveria a curva de onsets).
- **Sincronia (do usuário):**
  - adiantar 70 ms por padrão, ajustável de 0 a 200 ms;
  - no modo beat, a troca automática mistura no máximo 1 batida.
  - **Descartado:** medir a latência automaticamente, porque não há como saber quando a imagem chega à tela.
- **`Enter` só fica com o controle focado pelo teclado** (`:focus-visible`). Depois de um clique, o foco ficava no botão e o `Enter` repetia o clique, em vez de segurar.
- **Respiro (`Shift+Enter`, do usuário):** "fazer como se não tivesse áudio chegando, pra dar um respiro no visual e depois voltar com o áudio". É feito no ganho que alimenta o Butterchurn; a batida e o silêncio continuam medidos antes dele.
  - **Descartado:** congelar o quadro, porque o usuário quer o preset animando sem áudio.
  - **Descartado:** as teclas `A`, `S`, `D` e `F`, reservadas aos efeitos de vídeo do protótipo.

## 2026-11-10 — Spec 024, revisão 3: o andamento trava e só muda quando outro se confirma
- **Do usuário:** "ao invés de tentar identificar e alterar o valor o tempo inteiro, [...] identificar o BPM e depois deixá-lo seguir. Apenas se em algum momento for detectado um bpm diferente que possa ser atualizado." No log, a confiança caía em viradas e trechos calmos e, a cada nova trava, o BPM saía diferente.
- **Decisão:**
  - travar o andamento e seguir com o volante;
  - corrigir só a fase (e ±3 % de ajuste fino) quando as batidas confirmam;
  - trocar de andamento só depois de ~4 s de outro BPM confirmado, sem contar dobro, metade, 3/2 ou 2/3;
  - soltar só em silêncio (3 s) ou depois de 30 s sem batida.
  - Compassos passam a 1/2/4/8/16, com padrão 4: 16 e 32 eram longos demais (pedido do usuário).
- **Troca no critério 3 da spec:** ambiente depois de uma faixa com batida não volta mais aos segundos. Para o DJ, manter o andamento no break é o comportamento certo.
- **Descartado:** soltar por falta de confiança (era a causa das quedas); tap tempo agora (fica para o P1, se a detecção ainda errar o BPM).

## 2026-11-10 — Spec 026: Estúdio P0 (respostas do usuário e implementação)
- **Do usuário:**
  - o Estúdio é uma **camada em tela cheia** sobre o Palco, com o visual principal na prévia;
  - o nome do autor é **perguntado no primeiro salvamento** e também fica em Configurações › Geral;
  - `bas_att` e afins viram aviso na 027;
  - laço infinito: **teste num Worker com teto de tempo**.
- **Proposta de 2026-11-10 aprovada:** os meus presets guardam o JSON do Butterchurn 3 (`mine/<id>/preset.json` + `meta.json`), não o `.milk`. O architecture.md §5 foi atualizado.
- **Worker:** o `eel-wasm` (o mesmo compilador do motor, agora dependência declarada) compila cada bloco e roda um quadro, com `per_pixel` em cada ponto da malha. Teto de 1 s; um quadro de mais de 250 ms também é recusado. O Worker vem embutido como blob (`?worker&inline` do Vite), e a CSP ganhou `worker-src blob:`. Um arquivo de Worker separado em `file://` foi descartado, porque o Chromium trata a origem como opaca e o comportamento no Electron empacotado seria incerto.
  - **Por quê:** `while` para em ~1 milhão de voltas por chamada, mas `loop(n, …)` não tem teto, e `per_pixel` multiplica pelos pontos da malha. Rodar direto no visualizador principal (ou no de teste, na mesma thread) congelaria a interface sem como interromper.
  - **Descartado:** checagem estática do texto (pega menos casos); instrumentar o WASM gerado (mexe por dentro do motor).
- **Só salva o que compilou.** Ao sair sem salvar, volta o preset de origem; salvo, o meu preset vira o atual (a faixa mostra "baseado em").
- **Crédito:** `splitPresetName` reconhece os meus presets e devolve "<você> · baseado em <título>, por <autor>". Assim a faixa, a Biblioteca, a busca e as Configurações mostram o crédito sem mudar cada tela.
- **Rotação parada no Estúdio:** o loop segura a contagem (como no silêncio) e ignora as batidas, sem mexer no `settings.json`. Um travamento do motor no Estúdio volta ao preset de origem em vez de pular o preset.
