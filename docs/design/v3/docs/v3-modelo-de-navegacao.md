# Brief integrado — Sonic Obsidian v3 (modelo combinado)

Leia também `BRIEF-comum.md` (regras visuais e craft floor continuam valendo integralmente).

## Modelo de navegação decidido
- **Palco (tela padrão):** o app abre aqui, já tocando e reagindo ao som. Só o visual; a faixa de controle inferior aparece ao mexer o mouse e some após 2,5 s. Referência: `project/Sonic Obsidian A Palco.html`.
- **Biblioteca (menu oculto):** gaveta que desliza da esquerda POR CIMA do visual (não redimensiona o visual), 360px, fundo `--bg-01`, borda direita `--line-2`, `--shadow-pop`. Abre por: tecla `L`; botão `library` na faixa de controle (à esquerda do título do preset); ou uma alça discreta que aparece ao encostar o mouse na borda esquerda (aba vertical 28×96px com ícone `library`, só abre no clique). Fecha com `Esc`, `L` ou clique fora. Conteúdo: o da proposta B (`project/Sonic Obsidian B Biblioteca.html`): busca, abas Todos/Favoritos/Recentes/Coleções, linhas com miniatura, estrela, menu "…" (Adicionar à coleção, Não mostrar mais), detalhe de coleção, rodapé de ocultos. Sem o bloco "tocando agora" (a faixa do Palco já faz isso).
- **Busca rápida (`/` ou `Ctrl+K`):** continua existindo como atalho de teclado (paleta da proposta A). Biblioteca = curadoria; busca rápida = tocar algo já.
- **Modo Rack (modo de visualização):** tecla `M` ou botão `picture-in-picture-2` na faixa ("Modo compacto"). A janela vira o mini-player da proposta C (`project/Sonic Obsidian C Rack.html`), sempre por cima. Com 2 telas: visual em tela cheia na tela escolhida. Com 1 tela: o rack ganha um visor de visual próprio (canvas 440×160 acima do display) — o "vis" do Winamp. Sair do Rack: botão `maximize-2` "Voltar ao Palco" ou `M`.
- **Ajustes rápidos (`,`):** painel lateral direito do Palco (já existe na A) só com o que se mexe durante a música: ganho, rotação, intervalo, blend. Ao fim, link "Todas as configurações" (`Ctrl+,`).
- **Configurações (`Ctrl+,`):** tela completa por cima do Palco (o visual continua rodando atrás com opacidade 0.25). Layout de app de configurações: navegação lateral por seções + conteúdo. Tudo salva sozinho ("Salvo" discreto), sem botão Aplicar.
- **Primeira execução / setup:** NUNCA bloqueia (PRD: "abre e reage ao som em < 3 s, sem nenhum clique"; sem splash). O app já abre tocando; o setup é um cartão de boas-vindas não-modal e fluxos de diagnóstico que só aparecem quando algo falha.

## Atalhos globais (use exatamente estes)
Espaço aleatório · ←/→ anterior/próximo · F favoritar · R rotação · H esconder controles · / ou Ctrl+K busca rápida · L Biblioteca · M modo Rack · , ajustes rápidos · Ctrl+, configurações · F11 tela cheia · Esc fecha o que estiver aberto.

## Seções das Configurações (nomes exatos)
1. Geral — abrir em (Palco / Rack), iniciar com o Windows, abrir em tela cheia, preset ao abrir (último / aleatório / um favorito).
2. Captura — status da captura com medidor ao vivo ("Ouvindo a saída padrão do Windows"), dispositivo (FiiO K5 Pro · 48 kHz), botão "Testar captura", ganho padrão, seleção de dispositivo marcada "Fase 3".
3. Visual — rotação automática, intervalo, ordem (aleatória/coleção), duração do blend, trocar no beat ("Fase 3"), mostrar crédito do preset (sempre ligado e desabilitado com a nota "O crédito do autor é sempre exibido").
4. Desempenho — resolução de render (50/75/100%), limite de fps, pular presets abaixo de N fps, lista "Ocultos por desempenho" com restaurar, mostrar fps na faixa.
5. Biblioteca — pacotes (butterchurn-presets base, extra; contagem), pasta de presets .milk próprios ("Fase 3"), presets ocultos (lista + restaurar), exportar/importar coleções (.json).
6. Telas — tela do visual (radio com as telas detectadas), Rack sempre por cima, posição do Rack (canto).
7. Atalhos — tabela de atalhos (ação | tecla), com botão "Restaurar padrões" (edição de tecla pode ser só visual).
8. Sobre — Sonic Obsidian versão 0.3.0, Electron, Butterchurn (MIT), créditos: MilkDrop — Ryan Geiss; Butterchurn — Jordan Berg e contribuidores; presets — artistas da comunidade MilkDrop, creditados no nome de cada preset.

## Texto sobre o visual (08/11/2026)
O usuário escolhe quanto texto aparece por cima do visual. Vale no Palco, no Rack (na tela do visual) e em qualquer modo.
- **Configurações › Visual › grupo "Texto sobre o visual":**
  - **Nome do preset** (o cartão de crédito na troca): select *Sempre* (padrão) / *Só quando eu troco* (trocas manuais; a rotação automática troca em silêncio) / *Nunca*.
  - **Título da faixa** (arquivo ou SoundCloud, `launchSongTitleAnim`): switch, ligado por padrão.
  - **Avisos** (toasts): select *Todos* (padrão) / *Só importantes* / *Nenhum*. "Importantes" = ações feitas pela IA via MCP e falhas (codec não suportado, importação que falhou, captura que caiu). Painéis de estado (sem áudio, captura falhou, WebGL 2) não são avisos e nunca são ocultados.
  - Nota fixa: "O crédito do autor continua na faixa de controle e na Biblioteca." A regra "nunca remover o crédito" vale para a interface, não para o texto sobreposto ao visual.
- **Ajustes rápidos (`,`)**: grupo "Texto sobre o visual" com os mesmos três controles e o switch **Modo limpo**.
- **Modo limpo — tecla `T`** (global, fora do Modo performance): esconde de uma vez o nome do preset, o título da faixa e os avisos não importantes, sem mexer nas escolhas acima; `T` de novo volta a elas. A confirmação "Modo limpo ligado/desligado" aparece uma vez, discreta, e a faixa de controle mostra o ícone `eye-off` ao lado do nome do preset enquanto estiver ligado.
- **Modo performance:** a saída (Program) nunca recebe texto; créditos e avisos ficam só na janela de controle.

## Controles da janela (08/11/2026)
A janela não tem moldura nem barra de título (spec 004). Para fechar e minimizar com o mouse:
- **Onde:** canto superior direito, afastado `space-4` (16px) do topo e da direita. Dois botões de ícone (`ibtn`, 36px), da esquerda para a direita: `minus` "Minimizar" e `x` "Fechar (Ctrl+W)". Ficam sobre uma pequena superfície `overlay` com `line-2` e `r-3`, sem barra de título.
- **Quando aparecem:** só quando o ponteiro entra na zona do canto (cerca de 160×96px a partir do canto superior direito) ou quando um deles recebe foco por teclado. Aparecem com fade em `t-fast` e somem `t-med` depois que o ponteiro sai da zona. Não aparecem junto com a faixa de controle, nem quando a Biblioteca, os Ajustes ou um diálogo estão abertos sobre o canto (o painel de ajustes tem o próprio fechar).
- **Fechar:** fecha o app na hora, sem confirmação (tudo já salva sozinho). Hover = fundo `bg-04` e ícone `text-1`; sem vermelho. Teclado: `Ctrl+W` e `Alt+F4` continuam.
- **Tela cheia:** os mesmos controles, na mesma zona.
- **Arrastar a janela:** pela faixa do topo (40 px), fora do canto dos controles, sem indicação visual (10/11/2026).
- **Rack:** mantém o próprio título com fechar; Modo performance tem "Sair (Esc)" e também ganha os controles da janela na mesma zona.

## Painel de atalhos (08/11/2026)
Um mapa rápido de todos os atalhos, sem sair do que se está fazendo.
- **Abrir:** tecla `?` (Shift+/) em qualquer lugar fora de campos de texto; também pela dica "`?` Atalhos" na faixa de controle (à direita da busca) e por uma linha no cartão de primeira execução ("Aperte `?` para ver todos os atalhos"). **Fechar:** `?`, `Esc` ou clique fora. Não conflita com `/` (busca rápida).
- **Forma:** painel centralizado sobre o visual (que continua rodando), superfície `overlay`, `line-2`, `r-3`, `shadow-pop`, largura até 760px, altura até 80vh com rolagem interna; abre e fecha **sem animação** (ação frequente, como a busca rápida). Foco vai para o campo de filtro; `Tab` percorre; é um diálogo (`role="dialog"`, `aria-modal="true"`).
- **Conteúdo:** campo "Filtrar atalhos" que filtra por ação ou tecla; grupos em duas colunas — **Reprodução** (Espaço, ←/→, F, R, B), **Navegação** (/, Ctrl+K, L, M, P, E, ",", Ctrl+,), **Texto e controles** (H, T), **Vídeo** (V, G, [ ], Shift+←/→, Ctrl+S), **Janela** (F11, Ctrl+W, Esc, ?), **IA** (Ctrl+Shift+P). Cada linha: ação à esquerda, teclas em `kbd` à direita (uma tecla por `kbd`). Rodapé: link "Personalizar em Configurações › Atalhos" (abre Configurações na seção Atalhos).
- **Contexto primeiro:** o grupo do lugar atual vem no topo com o rótulo "Agora" — com a Biblioteca aberta, um grupo **Biblioteca** (↑/↓, Enter, F, `/` foca a busca, Esc); no modo Rack, **Rack** (M volta ao Palco, Espaço, ←/→, F, R).
- **Modo performance:** o mesmo `?` abre a versão do modo: um teclado desenhado com as fileiras `1`–`0` e `Q`–`P` mostrando o clipe de cada pad, `A S D F` (efeitos de segurar), `Z X C` (crossfader), `B` (tap), `N` (sincronizar), Espaço (corte), `V` (fade), `Tab` (deck), PgUp/PgDn (banco), `Esc` (sair).
- **Busca rápida com comandos:** `Ctrl+K` / `/` passa a encontrar também comandos, num grupo "Comandos" abaixo dos presets: cada comando mostra o atalho em `kbd` à direita e Enter executa (ex.: "Modo limpo" `T`, "Abrir biblioteca" `L`, "Modo Rack" `M`, "Mostrar atalhos" `?`, "Configurações" `Ctrl+,`, "Tela cheia" `F11`, "Favoritar preset atual" `F`, "Rotação automática" `R`). Quem busca a ação aprende a tecla.


## Coleções pela faixa (10/11/2026)
Botão `folder-plus` ao lado da estrela, sem tecla. Abre um painel com uma linha marcável por coleção (`check` + nome + contagem em mono); clicar põe ou tira o preset atual e o painel continua aberto. "Nova coleção" vira um campo no lugar (Enter cria já com o preset). Um ponto violeta de 4 px no botão indica que o preset atual está em alguma coleção. Spec 023 no repo.

## Modos de interface
Proposta em `docs/v3-modos.md` e na página "Modos" (não decidida).

## Ajustes rápidos: cabeçalho e rolagem (10/11/2026)
- O cabeçalho tem "Todas as configurações" (ícone `settings`, `Ctrl+,`) ao lado do fechar; o link no fim do painel sai.
- Cada seção tem um ícone de 16 px em `text-2` antes do título (Sinal `audio-lines`, Expressividade `activity`, Transições `blend`, Rotação `repeat`, Texto `type`).
- Ao fechar, a rolagem volta ao topo depois da animação de saída. A Biblioteca é a exceção: ela guarda a posição da lista, que a pessoa costuma retomar.
- Curva por frequência (EQ de 16 bandas dentro da Expressividade): `docs/v3-reatividade.md`.

## Atualização automática (13/11/2026, spec 029)
O app baixa a versão nova em silêncio e só então avisa. O aviso não é um toast: é uma plaquinha **persistente** que vive junto com a faixa de controle.

**Lugar: acima da faixa, à esquerda**, alinhada à borda esquerda dela (`bottom: 100% + 8px`, `left: 0`). Ela fica no `.strip-wrap`, então aparece e some com a faixa: some no ocioso, nunca aparece no Modo limpo (`T`) e nunca fica sozinha sobre o visual em tela cheia. Por que à esquerda:
- a direita acima da faixa é dos avisos sobre **o visual agora** (preset pesado), que pedem ação rápida;
- a esquerda fica sobre "agora tocando", a parte informativa da faixa, e é onde o olho começa a ler;
- os dois avisos nunca se sobrepõem nem se empurram.

**Os dois avisos juntos:**
- Acima de 900 px de largura, cada um fica no seu canto.
- Abaixo de 900 px, não cabem lado a lado. O de preset pesado tem prioridade, e o de versão **espera escondido** até o outro sumir. Ele não vira notificação nem perde a vez.
- Enquanto um menu ou painel ancorado na faixa estiver aberto (coleções, IA, busca, Biblioteca, Ajustes), a plaquinha também se esconde.

**Conteúdo** (superfície `overlay`, `line-2`, `r-3`, `shadow-pop`; ícone `circle-arrow-down` em `text-2`):
| Estado | Texto (pt-BR / en) | Ações |
| --- | --- | --- |
| Pronta (instalador) | "Sonic Obsidian 0.6.1 está pronta" / "Sonic Obsidian 0.6.1 is ready" | link "O que mudou" / "What's new" (abre a release no navegador, ícone `external-link` 12 px) · primário **"Reiniciar e atualizar"** / "Restart and update" · fantasma "Depois" / "Later" |
| Disponível (zip portátil) | "Versão 0.6.1 disponível" / "Version 0.6.1 available" | primário **"Abrir página da versão"** / "Open release page" (`external-link`) · "Depois". Nada é baixado. |
| Atualizando | "Atualizando… o app reabre sozinho" / "Updating… the app will reopen on its own" | nenhuma; ícone `loader-circle` girando (parado com movimento reduzido). O texto troca no lugar (como o M13). A faixa fica presa visível. Dura ~800 ms e a janela fecha. |

**Regras:**
- "Depois" esconde o aviso **daquela versão** até a próxima abertura do app. Se sair uma versão mais nova nesse meio-tempo, o aviso volta com ela.
- Sem barra de progresso e sem erro no aviso. Erros de checagem e de download nunca aparecem no Palco: vão para o log.
- **Modo performance:** o aviso não aparece (show ao vivo) e espera a saída do modo. **Rack:** uma linha compacta no rodapé do rack ("0.6.1 pronta · Reiniciar") quando o rack existir (Fase 5).

**Movimento:** a plaquinha entra com a faixa, como um quarto bloco do M01: sobe 6 px com fade, `t-med` `ease-out`, 40 ms depois do último bloco da faixa. Sai junto com a faixa, em fade de 150 ms. Quando a versão fica pronta com a faixa já visível, entra sozinha do mesmo jeito. Nada de pulso nem de animação para chamar atenção. Com movimento reduzido, só o fade.

**Teclado e leitor de tela:**
- A plaquinha tem `role="status"` e `aria-live="polite"`, e é anunciada uma vez quando fica pronta.
- **Não rouba o foco.** Na ordem de Tab, vem **antes** dos controles da faixa: "O que mudou" → "Reiniciar e atualizar" → "Depois" → faixa. Assim, quem usa o teclado chega nela primeiro, sem precisar atravessar a faixa.
- `Esc` não a dispensa (`Esc` fecha sobreposições, e ela não é uma). Sem tecla própria.

**Configurações › Sobre › Atualizações** (grupo novo, logo depois de "Aplicativo"):
- **Versão instalada:** "Sonic Obsidian · 0.6.0" (mono), com o link "O que mudou".
- **Chave "Buscar atualizações automaticamente"** (en: "Check for updates automatically"), ligada por padrão. Ajuda: "Uma checagem por dia no GitHub. É a única chamada de rede que o app faz por conta própria." O "por conta própria" existe porque fontes como o SoundCloud, quando entrarem, também usam a rede, só que a pedido da pessoa.
- **"Verificar agora"** (funciona com a chave desligada). A linha de status fica embaixo, em `text-2`:
  - *Verificando…*: o botão fica desabilitado e mostra `loader-circle`.
  - *Você está na versão mais nova.*: com `check`; o botão volta a "Verificar agora".
  - *Baixando 42%*: o número em mono ciano, com uma linha fina de progresso embaixo. A barra é permitida aqui, porque nas Configurações foi a pessoa que pediu.
  - *Versão 0.6.1 pronta.*: o botão vira o primário "Reiniciar e atualizar", o mesmo do aviso.
  - No zip portátil: *Versão 0.6.1 disponível.* e o botão "Abrir página da versão".
  - **Erro:** como foi a pessoa que pediu, o silêncio confundiria. Aparece "Não deu para verificar agora. Confira a conexão e tente de novo.", com o ícone `circle-alert` em `warn`, e o botão volta. Erros das checagens automáticas continuam silenciosos.
- Uma linha "Última verificação: hoje, 14:32" (mono, `text-3`).

**Busca rápida:**
- O comando **"Verificar atualizações"** entra no grupo Comandos, sem tecla. Ele roda a checagem no lugar e responde por toast: "Você está na versão mais nova." · "Baixando a versão 0.6.1…" (e o aviso aparece quando terminar) · "Não deu para verificar agora.".
- Quando há versão pronta, entra também o comando **"Reiniciar e atualizar"**.
- Nada muda no painel `?`.

## Sinal e Expressividade (respostas à divergência de 11/11, spec 028)
**Confirmado:**
- **"Normalizar áudio"**, desligado por padrão, acima do ganho, nos Ajustes rápidos › Sinal e em Configurações › Captura › Nível.
- Ligado, o slider vira **"Ajuste fino" (−6 a +6 dB)** e aparece a nota "Iguala o volume entre faixas em alguns segundos. O som das caixas não muda.".
- Ao ligar, o valor atual é preso dentro de ±6. Ao desligar, o slider volta a ser o Ganho com o mesmo valor.
- "Restaurar padrão", "Sem efeito no nível 0" e a 4ª Memória.

**Corrigido:**
1. **"auto +5 dB" em ciano, não em `text-3`.** É um valor ao vivo, e valor ao vivo é ciano no sistema. Fica em mono 12 px, ao lado do nome "Normalizar áudio", nos dois lugares, inclusive nas Configurações (não à esquerda do switch). Desligado, some.
2. **"· padrão" sai do rótulo das opções.** Em segmentados de 300 px o rótulo não cabe ("Energia · padrão"). O padrão ganha uma **marca de 4 px** (ponto em `text-3`) sob o rótulo da opção padrão, e a palavra vai para a linha de descrição: "Amplia e sobe a base: tudo reage mais. Padrão.". No Nível, a marca é um traço no 0 do slider. O toast de `X`/`Shift+X` continua dizendo "(padrão)".
3. **Memória vira segmentado de 4: Curta · Longa · Fixa · Viva**, e não um select. "(em teste)" sai do rótulo e vai para a descrição: "Viva (em teste): compara com os últimos ~1,7 s, como o MilkDrop 2. Reage a cada batida.".
4. **"Sem efeito no nível 0"** substitui a descrição do Caráter enquanto o Nível for 0. O segmentado fica em `text-3`, mas continua clicável: a escolha vale assim que o nível sair do 0.
5. **"Restaurar padrão"** é um botão fantasma pequeno (ícone `rotate-ccw`) à direita do título da seção Expressividade. Fica desabilitado quando tudo já está no padrão. Restaura Nível 0, Energia, Curta e a curva Plana, e o toast diz "Expressividade no padrão.".
