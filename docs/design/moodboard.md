# Sonic Obsidian — Moodboard & Referências
> Sessão de exploração visual · Março 2026
> *Design system e wireframes: etapa posterior*

---

## A tensão criativa

Três eixos estéticos que não se cancelam — se sobrepõem:

```
WINAMP / RETRO          MINIMALISMO MODERNO        NEON / SYNTHWAVE
Densidade funcional  +  Silêncio visual         +  Luz elétrica sobre escuridão
Display segmentado      UI invisível                Magenta, cyan, violeta
Glow de LED             Tipografia precisa          Profundidade obsidiana
```

O resultado: uma casca imóvel, negra e precisa que contém algo vivo e caótico.

---

## Referências — Categoria por Categoria

### 1. Interfaces de Audio Tools (UI densa, dark, funcional)

| Referência | O que observar | URL para visitar |
|---|---|---|
| **Winamp 5.x — Dark Skin** | Medidores de VU segmentados, display de frequência LCD, densidade de informação, skin engine | [winampheritage.com](https://winampheritage.com) → filtrar por Dark skins |
| **Ableton Live — TXL Night Runner** | Alternativa dark ao tema padrão: tons frios, hierarquia de zonas por contraste, tipografia mono para valores | [thuanxle.gumroad.com](https://thuanxle.gumroad.com/l/MXfJQ) |
| **Native Instruments Traktor** | UI que emula hardware físico: knobs, LEDs, displays de 7 segmentos | Busca: "Traktor Pro dark UI screenshot" |
| **Rekordbox 6** | Dark theme moderno com acentos coloridos nos decks, level meters laterais | [rekordbox.com](https://rekordbox.com) → screenshots |
| **foobar2000 + DarkOne4Mod** | Extremo: player quase sem UI, hierarquia puramente tipográfica | Busca: "foobar2000 DarkOne4Mod screenshot" |

**O que procurar nessas referências:** como os level meters são visualizados (segmentado vs. gradiente contínuo), onde ficam os controles de playback vs. configuração, como o app gerencia o foco entre "visualizar" e "controlar".

---

### 2. Visualizadores (a parte que importa esteticamente)

| Referência | O que observar | URL |
|---|---|---|
| **MilkDrop 2 / 3 presets** | Warp radial, bloom, cores ácidas reagindo ao beat — essa é a estética que os shaders do projeto vão emular | [forums.winamp.com/forum/visualizations/milkdrop](https://forums.winamp.com/forum/visualizations/milkdrop) |
| **MilkDrop 3.0 (2023)** | Versão atualizada com suporte a qualquer fonte de áudio (Spotify, YouTube), double-presets | [forums.winamp.com — MilkDrop 3.0 thread](https://forums.winamp.com/forum/visualizations/milkdrop/milkdrop-presets/4614686-milkdrop-3-0-500-presets-lots-of-new-functionality) |
| **Butterchurn** | Port web do MilkDrop em WebGL — dá pra abrir no browser agora mesmo e ver os presets rodando | [butterchurnviz.com](https://butterchurnviz.com) ← **abrir isso** |
| **projectM** | Reimplementação open-source do MilkDrop, roda em Linux/Windows/Mac | [github.com/projectM-visualizer/projectm](https://github.com/projectM-visualizer/projectm) |

**Butterchurn é a referência mais acessível:** abre no browser, deixa você explorar os presets em tempo real e entender como os shaders reagem ao áudio. É exatamente o território visual que o projeto quer alcançar.

---

### 3. Estética Dark + Neon (inspiração visual além de audio tools)

| Referência | O que observar | Como acessar |
|---|---|---|
| **Dear ImGui demos** | Tema dark que é o default do Dear PyGui — o "chão" sobre o qual a UI do Sonic Obsidian vai ser construída | Busca: "Dear ImGui dark theme screenshot" |
| **RPCS3 emulator UI** | Usa Dear ImGui com tema escuro muito refinado — boa referência de tool UI densa | [rpcs3.net](https://rpcs3.net) → screenshots |
| **Dribbble — "neon UI"** | Explore a tag neon_ui no Dribbble para ver como designers usam acentos elétricos sobre superfícies escuras | [dribbble.com/tags/neon_ui](https://dribbble.com/tags/neon_ui) |
| **Dracula theme** | Paleta escura bem calibrada usada por IDEs do mundo todo — o violeta/magenta/cyan está presente aqui | [draculatheme.com/contribute](https://draculatheme.com/contribute) → ver paleta |
| **Catppuccin Mocha** | Dark theme muito popular para IDEs, paleta com roxo/lavanda/cyan sobre charcoal | [catppuccin.com](https://catppuccin.com) |

**Dracula e Catppuccin** são pontos de partida concretos para a paleta — não estamos inventando do zero. São sistemas de cor testados por milhões de usuários em contexto de leitura prolongada sobre fundos escuros.

---

### 4. Motion e Reatividade (como UI e áudio coexistem)

| Referência | O que observar |
|---|---|
| **Resolume Avenue** | VJ software: UI totalmente secundária à saída visual. Como os controles ficam "fora do caminho" sem desaparecer | Busca: "Resolume Avenue UI screenshot" |
| **TouchDesigner** | Node-based, dark, altamente técnico — boa referência de "UI de profissional que não tenta parecer amigável" | [derivative.ca](https://derivative.ca) |
| **Teenage Engineering OP-1** | Hardware, não software, mas: minimalismo extremo com cada elemento justificando sua existência | Busca: "OP-1 UI design" |

---

## Framework Python — Recomendação

### O que foi avaliado

| Framework | Prós | Contras |
|---|---|---|
| **pygame-gui** | Roda dentro do Pygame — compatível com a stack atual sem nenhuma mudança | Esteticamente limitado, difícil de customizar para o look que queremos |
| **CustomTkinter** | Moderno, fácil, aparência limpa | Baseado em Tkinter, não integra bem com o loop de render do Pygame/ModernGL |
| **PyQt6 / PySide6** | Muito completo, QSS para styling completo | Pesado, licença complicada (PyQt6), janela separada do Pygame |
| **Dear PyGui** | GPU-acelerado, baseado em Dear ImGui, tema dark nativo, suporte a TTF fonts, ImPlot para gráficos de dados | Sistema de janelas próprio — requer integração com ModernGL para o canvas do visualizador |
| **Pygame nativo (sem lib)** | Controle total, zero dependência extra, funciona agora mesmo | Mais código manual para cada componente |

### Recomendação: abordagem em duas fases

**Fase 1 e 2 → Pygame nativo com componentes customizados**

Para as fases iniciais, a UI é mínima (controles por teclado, depois sliders). Construir esses componentes diretamente em Pygame é mais rápido e não introduz conflito de loop entre dois sistemas de janelas.

A estética desejada (segmentado, glow, neon) é mais fácil de conseguir com `pygame.draw` + `pygame.Surface` com alpha do que customizando um widget toolkit externo.

**Fase 3+ → Dear PyGui como overlay de controles**

Quando a UI ficar mais rica (preset picker, configurações avançadas, múltiplos sliders), Dear PyGui começa a compensar. A integração com ModernGL é possível via viewport embedding, e o Dear ImGui dark theme já está na direção certa visualmente.

**Por que Dear PyGui quando chegar lá:**
- Base de tema dark nativa — o "chão" já está correto
- Suporte a custom TTF fonts (Space Grotesk, JetBrains Mono)
- ImPlot nativo para renderizar o spectrum como gráfico de linha/barra em tempo real
- Baixa latência por ser GPU-acelerado em C++ por baixo
- A estética Dear ImGui já aparece em ferramentas de áudio profissional (RPCS3, ferramentas de game dev)

---

## Paletas de Referência para Explorar

Duas paletas prontas como ponto de partida — não para usar direto, mas para calibrar o tom:

### Dracula Official
```
Background:  #282a36
Current:     #44475a
Foreground:  #f8f8f2
Comment:     #6272a4
Cyan:        #8be9fd
Green:       #50fa7b
Orange:      #ffb86c
Pink:        #ff79c6
Purple:      #bd93f9
Red:         #ff5555
Yellow:      #f1fa8c
```
→ [draculatheme.com](https://draculatheme.com/contribute)

### Catppuccin Mocha
```
Base:        #1e1e2e
Surface0:    #313244
Overlay0:    #6c7086
Text:        #cdd6f4
Lavender:    #b4befe
Blue:        #89b4fa
Sapphire:    #74c7ec
Sky:         #89dceb
Teal:        #94e2d5
Mauve:       #cba6f7
Pink:        #f38ba8
```
→ [catppuccin.com](https://catppuccin.com) → Mocha variant

**Nota:** a paleta do Sonic Obsidian vai ser derivada dessas, com backgrounds mais escuros (Dracula usa #282a36, nós queremos algo mais próximo de #0a0a0c para a qualidade "obsidiana") e acentos mais elétricos (cyan mais saturado, violeta mais vivo).

---

## Próximos passos sugeridos

1. **Agora:** visitar [butterchurnviz.com](https://butterchurnviz.com) para calibrar a estética do canvas — é o visualizador rodando no browser
2. **Agora:** explorar a paleta Dracula e Catppuccin Mocha lado a lado para decidir a direção de cor
3. **Depois:** derivar a paleta do Sonic Obsidian a partir dessas referências (backgrounds + acentos)
4. **Depois (Fase 2):** avaliar Dear PyGui com um protótipo de controles simples antes de decidir adotar

---

*Sonic Obsidian Moodboard v0.1 · Março 2026*
