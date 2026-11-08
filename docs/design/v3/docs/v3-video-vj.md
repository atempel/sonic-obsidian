# Sonic Obsidian v3 — Vídeo e VJ

> Especificação de design para o agente do repositório. Complementa `v3-modelo-de-navegacao.md`, `v3-brief-visual-e-craft.md` e `v3-fontes-butterchurn-estudio-mcp.md`. Protótipos: páginas "Vídeo — Propostas", "Palco com vídeo", "Modo performance" e "Biblioteca com clipes e cenas" neste projeto de design.
> Decisão de 08/11/2026: um único compositor por camadas na GPU como base; crossfader A/B no Modo performance; vídeo como textura do preset fica como exploração.

## 1. Modelo escolhido e alternativas

| Modelo | Papel no produto | Custo |
|---|---|---|
| **Camadas compostas** | Base do Palco com vídeo. Até 2 camadas de vídeo + a camada MilkDrop, cada uma com ordem, opacidade e modo de mesclagem. | Baixo |
| **Recorte por chave** (luma key, chroma key, MilkDrop só nas silhuetas) | Não é um modelo à parte: entra como modos de mesclagem do mesmo compositor. | Médio (shader próprio) |
| **Crossfader A/B** | Base do Modo performance. Cada deck é uma pilha de camadas (preset, clipe ou cena); o fader mistura Preview e Program. | Médio |
| **Vídeo como textura do preset** | Exploração / custo alto. O vídeo vira um sampler dentro dos shaders do preset e sofre o warp, o rastro e o feedback do MilkDrop. | Alto (patch no motor) |
| Picture-in-picture | Variante das camadas (camada com posição e escala). Baixa prioridade. | Baixo |

### Arquitetura do compositor (recomendada)
- O Butterchurn continua renderizando no próprio canvas WebGL 2.
- Um **compositor WebGL 2 nosso** desenha o quadro final num canvas de saída: lê o canvas do Butterchurn como textura (`texImage2D(canvas)`, cópia na GPU) e cada `<video>` como textura (`texImage2D(video)`, atualizada por `requestVideoFrameCallback`), e aplica os modos de mesclagem e chaves num shader.
- Por que não CSS `mix-blend-mode`: é mais barato, mas não faz chave por luminosidade/cor, não permite crossfader com curvas e não dá um quadro único para `capture_frame` e para a saída em outra tela.
- Modos de mesclagem: Normal, Tela, Adição, Multiplicação, Diferença, Sobrepor, Luminosidade como máscara (o vídeo define onde o MilkDrop aparece), Chave de luminosidade (remove pretos/brancos do vídeo), Chave de cor (cor e tolerância).

## 2. Reação ao áudio

**Automático** (configurado por camada, salvo na cena; painel "Reação ao áudio"):
- **Cortar no beat:** troca para o próximo clipe da coleção a cada 1, 2, 4, 8 ou 16 beats.
- **Velocidade pela energia:** 0,25×–2×, fonte `bass` / `mid` / `treb` / nível, com suavização.
- **Ida e volta no beat:** inverte a direção a cada N beats.
- **Opacidade pelo nível:** mínimo e máximo; a camada "respira" com a música.
- **Flash nos graves:** limiar de `bass`; flash curto (80 ms) na camada.

**Ao vivo** (disparado pelo usuário, segurando a tecla; no Modo performance):
- `A` ré, `S` stutter (repete 1/4 de beat enquanto segura), `D` strobe (no tempo), `F` congelar quadro.
- Tap tempo `B`; o BPM detectado é a base e o tap corrige.

O BPM vem da detecção (Fase 3). Sem detecção, o tap tempo é a fonte; sem os dois, as reações "no beat" ficam desabilitadas com a nota "Precisa de BPM: toque B no ritmo".

## 3. Banco de clipes

- **Entrada:** arrastar vídeos para a janela (MP4/H.264, WebM/VP9 garantidos; HEVC e ProRes: "pode não tocar"), botão "Importar clipes…", ou uma pasta vigiada (Configurações › Vídeo).
- **Só arquivos do usuário.** O app não baixa de YouTube/streaming e não distribui clipes. Os clipes ficam no disco do usuário; a biblioteca guarda referências e miniaturas.
- **Onde mora:** a gaveta Biblioteca ganha um seletor no topo **Presets · Clipes · Cenas**. Presets mantém tudo o que existe (Todos/Favoritos/Recentes/Coleções). Clipes é uma **grade** de miniaturas 16:9 com prévia animada no hover. Cenas é uma lista como a de presets.
- **Cartão do clipe:** miniatura, nome ("Clip 03 · abstrato · 0:08"), duração `.num`, tags, estrela de favorito; badge `--warn` quando o codec não é suportado.
- **Detalhe do clipe** (na gaveta): prévia, régua de tempo com **pontos de entrada e saída do loop** (arrastáveis + teclas `I` e `O` com o clipe em foco), modo de loop (repetir / ida e volta / uma vez), tags editáveis, coleções, "Usar o áudio do clipe como fonte" (desligado por padrão).
- **Tags e coleções:** tags livres com sugestões ("abstrato", "textura", "formas", "anime", "cinema", "ruído"); coleções de clipes alimentam o "cortar no beat".

## 4. Modo performance (VJ ao vivo)

- **Entrada:** tecla `P` ou botão `sliders-vertical` "Modo performance" na faixa. Sai com `Esc` ou o botão "Sair" (dentro do modo, `P` é um pad). É um modo do app (como o Rack), não uma janela nova.
- **Layout:** Preview (próximo, à esquerda) e Program (no ar, à direita) lado a lado; crossfader entre eles; grade de 20 pads de clipes; painel do deck selecionado (camadas, mesclagem, opacidade, velocidade, reações); BPM com tap.
- **Com 2 telas:** a tela do visual mostra só o Program em tela cheia; a janela de controle mostra Preview, Program em miniatura e os controles. É o cenário principal de VJ.
- **Teclado (só dentro do Modo performance; fora dele, nada muda):**
  - `1`–`0` e `Q`–`P`: 20 pads; carregam o clipe no **Preview**. `Shift` + pad: corta direto no Program.
  - `Espaço`: corte (Preview → Program). `V`: transição automática (fade de N beats, padrão 4).
  - `Z` / `X` / `C`: crossfader todo em A / centro / todo em B; `←`/`→`: move o crossfader 10%.
  - `Tab`: alterna o deck em edição (A/B). `PageUp`/`PageDown`: banco de pads anterior/próximo.
  - `A` `S` `D` `F` (segurar): ré, stutter, strobe, congelar. `B`: tap tempo. `N`: sincronizar transições ao beat.
  - Teclas globais remapeadas aqui: `E`, `R`, `P`, `F`, `T`… viram pads/efeitos (por isso `P` não sai do modo: use `Esc`). `M` (Rack), `H`, `F11`, `Ctrl+K`, `Ctrl+,` e `Esc` continuam iguais.

## 5. Cenas

- **Cena** = preset + até 2 camadas de clipe (com entrada/saída, loop, mesclagem, opacidade, velocidade, reações) + parâmetros do Butterchurn usados.
- **Criar:** no Palco, botão "Salvar como cena" (ícone `clapperboard`) no painel da camada de vídeo, ou `Ctrl+S` no Palco; no Modo performance, "Salvar Program como cena". Nome sugerido: "<preset> + <clipe>".
- **Na Biblioteca:** aba Cenas e também em Presets › Todos com o rótulo "Cena" (entra na rotação como se fosse um preset; switch "Incluir cenas na rotação" em Configurações › Visual).
- **No Estúdio:** abrir uma cena mostra a aba nova "Cena" com a pilha de camadas (arrastar para reordenar), e as abas atuais continuam editando o preset da cena.
- O crédito do autor do preset continua sempre visível; o cartão de crédito de uma cena mostra "Cena · <nome>" e, abaixo, "<preset>, por <autor> + <clipe>".

## 6. Atalhos novos (fora do Modo performance)

| Tecla | Ação |
|---|---|
| `V` | Liga/desliga a camada de vídeo |
| `Shift` + `←` / `→` | Clipe anterior / próximo da camada ativa |
| `[` / `]` | Opacidade da camada de vídeo −10% / +10% |
| `G` | Próximo modo de mesclagem |
| `B` | Tap tempo (a mesma tecla do Modo performance) |
| `P` | Entrar no Modo performance |
| `Ctrl+S` | Salvar como cena |

Sem conflito com: Espaço, ←/→, F, R, H, /, Ctrl+K, L, M, ",", Ctrl+,, E, F11, Esc, Ctrl+Shift+P.

## 7. Estados

- **Normal:** camada de vídeo ativa, chip da camada na faixa (miniatura do clipe, nome, modo de mesclagem).
- **Sem clipes:** popover da camada vazio — "Nenhum clipe ainda. Arraste vídeos MP4 ou WebM para a janela." + "Importar clipes…".
- **Codec não suportado:** cartão com badge "HEVC não suportado"; ao tentar tocar, aviso "Este clipe usa HEVC, que o app não consegue decodificar. Converta para MP4 (H.264) ou WebM (VP9)." A camada mantém o clipe anterior.
- **Carga alta:** quando o tempo de quadro passa de 20 ms por 3 s, chip `--warn` "Carga alta · 41 fps" com ações "Reduzir vídeo para 720p" e "Pausar camada 2"; opção de fazer isso automaticamente.
- **Clipe ausente:** arquivo movido/apagado — "Arquivo não encontrado" + "Localizar…".

## 8. Configurações novas — seção "Vídeo" (entre Renderização e Desempenho)

- Resolução da camada de vídeo: Nativa / 1080p / 720p (padrão em carga alta) / 540p.
- Decodificação por hardware (ligado).
- Camadas de vídeo simultâneas: 1 ou 2.
- Ao entrar em carga alta: Avisar / Reduzir resolução automaticamente / Pausar camada 2.
- Pasta de clipes vigiada; gerar miniaturas animadas (ligado); pré-carregar os pads do banco atual (memória).
- Usar o áudio do clipe como fonte (padrão desligado).
- Codecs: lista do que toca (H.264, VP9, AV1 se a GPU suportar) e do que é incerto (HEVC, ProRes).
- Transição padrão do Modo performance: corte / fade de 1, 2, 4, 8 beats; curva do crossfader (linear / potência constante / corte).

## 9. MCP — ferramentas novas

Mesmo padrão das existentes; escopos: "Controlar reprodução" cobre tocar e mixar; "Gerenciar biblioteca" cobre importar e criar cenas.

- `list_clips` — busca, tags, coleções, favoritos, codec suportado
- `get_clip` — metadados, duração, entrada/saída do loop, tags
- `import_clip` — a partir de um caminho local do usuário (nunca URL)
- `play_clip` — clipe numa camada (`layer: 1|2`) ou no Preview do Modo performance, com transição
- `set_layer` — camada: ligada, clipe, opacidade, velocidade, direção, entrada/saída, posição/escala
- `set_blend_mode` — modo de mesclagem e parâmetros de chave
- `set_audio_reactions` — reações automáticas da camada
- `trigger_effect` — `stutter` | `strobe` | `reverse` | `freeze` | `flash`, duração em beats
- `set_crossfader` — posição 0–1, duração em beats
- `take` — Preview → Program, `cut` ou `fade` com N beats
- `set_bpm` — BPM fixo ou `tap`
- `list_scenes` · `create_scene` (do estado atual ou de uma especificação) · `update_scene` · `play_scene`

## 10. O que depende de patch no motor

- **Vídeo como textura do preset:** o Butterchurn só aceita imagens estáticas (`loadExtraImages`). Seria preciso um fork que registre uma textura dinâmica atualizada a cada quadro (`texImage2D(video)`) e a exponha aos shaders `warp`/`comp` como um sampler novo (ex.: `sampler_video`). Presets teriam que ser escritos para usá-la (extensão nossa do formato .milk). Custo alto; candidato a spike depois da Fase 3.
- Todo o resto (camadas, chaves, crossfader, reações, cenas) roda fora do motor, no compositor.

## 11. Perguntas em aberto

1. Duas camadas de vídeo 1080p + MilkDrop em 1440p cabem em 60 fps na RTX 3070? Medir no spike do compositor.
2. `texImage2D(canvas)` do Butterchurn custa quanto por quadro? Alternativa: compartilhar o contexto WebGL com o motor.
3. Formato de cena: JSON próprio que referencia o preset por id e os clipes por caminho? Como exportar uma cena com clipes ausentes?
4. Miniaturas animadas: gerar sprites na importação (custo de disco) ou decodificar sob demanda no hover?
5. Saída para outra tela no Modo performance: janela Electron separada recebendo o canvas (MediaStream/OffscreenCanvas) ou duplicar o compositor?
6. Vale suportar MIDI (controladores de VJ) na Fase 4? Os atalhos foram desenhados para mapear 1:1.
