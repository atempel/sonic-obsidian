# Brief — Fontes, Butterchurn nativo, Estúdio de presets e MCP

Complementa BRIEF-comum.md e BRIEF-integrado.md (continuam valendo).

## 1. Fontes de áudio
- **Áudio do sistema** (padrão, loopback) · **Microfone** · **Arquivo** (upload: botão "Escolher arquivo…" ou arrastar; mp3, wav, flac, ogg, m4a) · **SoundCloud** (colar URL de faixa ou playlist pública).
- SoundCloud: o app resolve a URL pela API oficial (`/resolve` → `/tracks/{id}/stream`), que exige credenciais de app (OAuth 2.1 client credentials) e tem limite de 15 mil reproduções/dia por app. Só faixas com `access: playable`; `preview` toca 30 s (avisar); `blocked` dá erro claro. Atribuição obrigatória: mostrar título, artista e link "Ouvir no SoundCloud" enquanto toca.
- Arquivo e SoundCloud são fontes temporárias com transporte próprio (play/pausa, barra de progresso, tempo) e um botão "Voltar ao áudio do sistema".
- Ao começar uma faixa (arquivo/SoundCloud), o visual mostra o título com `launchSongTitleAnim(texto)` do Butterchurn (switch "Mostrar título da faixa no visual").
- Colar (Ctrl+V) uma URL do SoundCloud em qualquer lugar do Palco abre a confirmação "Tocar do SoundCloud?".

## 2. Configurações nativas do Butterchurn (nomes reais da API 2.6.7)
Seção "Renderização" (substitui/absorve a parte de render de Desempenho), cada controle mostra o parâmetro em `.num` `--text-3` na ajuda:
- Malha de distorção → `meshWidth × meshHeight` (32×24, 48×36 padrão, 64×48, 96×72, 128×96) — `setInternalMeshSize`
- Escala de pixels → `pixelRatio` (Automático = devicePixelRatio, 1×, 1,5×, 2×)
- Resolução das texturas → `textureRatio` (0,5 / 0,75 / 1 padrão)
- Suavização (FXAA) → `outputFXAA` (switch) — `setOutputAA`
- Limite de quadros (30/45/60/144/sem limite) e Tamanho do canvas (Nativo/75%/50%) — do butterchurnviz
- Imagens extras de textura → `loadExtraImages` (switch "Carregar pacote de imagens extras", alguns presets usam)

## 3. Estúdio de presets (criar e editar .milk)
- Formato: `.milk` (MilkDrop 2). O Butterchurn roda JSON convertido; o app converte .milk ↔ JSON ao salvar/abrir (conversão HLSL→GLSL dos shaders: risco técnico, validar no spike da Fase 3).
- Entradas: Biblioteca › "…" › "Editar uma cópia" (presets de terceiros nunca são editados no lugar: vira "Remix de <título>", crédito original preservado em "baseado em"); Biblioteca › "Novo preset"; atalho `E` abre o Estúdio com uma cópia do preset atual.
- Seções do .milk que o editor expõe: Básico (parâmetros: `decay`, `zoom`, `rot`, `warp`, `cx`, `cy`, `dx`, `dy`, `sx`, `sy`, `echo_zoom`, `echo_alpha`, `gammaadj`, `wave_mode`, `wave_r/g/b/a`, `brighten`, `darken`, `solarize`, `invert`), Equações (`per_frame_init`, `per_frame`, `per_pixel`), Ondas (4 custom waves), Formas (4 custom shapes), Shaders (`warp`, `comp`), e o Código .milk bruto (sincronizado).
- Variáveis de áudio disponíveis nas equações: `bass`, `mid`, `treb`, `bass_att`, `mid_att`, `treb_att`, `time`, `frame`, `fps`.
- Compilação ao vivo (debounce 400ms); erro mostra seção + linha + mensagem e mantém a última versão válida tocando.
- Salvar → biblioteca com rótulo "Meu preset"; Exportar .milk; histórico de versões (cada salvamento e cada edição via MCP vira uma versão restaurável).

## 4. MCP — o app como servidor MCP local
O Sonic Obsidian não embute IA. Ele expõe um **servidor MCP local** para o usuário usar a ferramenta de IA que preferir (Claude Desktop, Claude Code, Cursor, VS Code, etc.).
- Desligado por padrão. Liga em Configurações › Integrações.
- Transportes: **stdio** (o cliente executa `sonic-obsidian-mcp`, um executável fino que fala com o app aberto por named pipe) e **HTTP local** (`http://127.0.0.1:7341/mcp`, Streamable HTTP, token por cliente). Nunca escuta fora do localhost.
- Permissões por escopo (switches): Ler status e biblioteca · Controlar reprodução · Criar e editar presets · Ver o visual (captura de quadro) · Gerenciar biblioteca (coleções, ocultar; apagar sempre pede confirmação no app).
- Ferramentas (nomes exatos):
  - `get_status` — preset atual, autor, fonte, rotação, fps, BPM
  - `get_audio_features` — `bass`/`mid`/`treb`, nível e BPM (instantâneo ou média de N s)
  - `list_presets` — busca e filtros (favoritos, recentes, importados, meus, coleção)
  - `get_preset` — código .milk e metadados
  - `play_preset` · `next_preset` · `previous_preset` · `random_preset`
  - `set_rotation` — ligado, intervalo, ordem
  - `set_signal` — ganho, blend automático, blend manual
  - `set_audio_source` — system | microphone | file | soundcloud (+ caminho/URL)
  - `validate_preset` — compila um .milk e devolve erros por seção/linha
  - `create_preset` — cria a partir de .milk; `preview: true` toca sem salvar
  - `update_preset` — só presets do usuário; de terceiros cria remix
  - `capture_frame` — PNG do quadro atual (`toDataURL`), para a IA ver o resultado
  - `show_text` — mostra um texto no visual (`launchSongTitleAnim`)
  - `manage_collection` — criar, renomear, adicionar, remover
- Recursos MCP: `preset://{id}` (o .milk), `docs://milkdrop/authoring` (guia de variáveis e seções), `docs://sonic-obsidian/examples`.
- Prompts MCP: `criar-preset` (descrição, energia, paleta), `remixar-preset`.
- Na interface: quando um cliente está conectado, a faixa do Palco mostra um chip "Claude Desktop conectado" (ícone `plug`); cada ação de IA gera um toast discreto ("Claude Desktop tocou *Star Ornament*") e entra num registro de atividade; botão "Pausar controle por IA" (atalho `Ctrl+Shift+P`) suspende as ferramentas que alteram estado. Presets criados por MCP mostram "Criado com Claude Desktop" na Biblioteca e no Estúdio.
