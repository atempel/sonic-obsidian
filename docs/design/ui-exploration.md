# Sonic Obsidian — UI Exploration
> Design System · Moodboard · Wireframes Conceituais
> Versão 0.1 · Março 2026

---

## 0. A Premissa Estética

O nome **Sonic Obsidian** já entrega a identidade antes de qualquer pixel:

- **Obsidian** = vidro vulcânico. Negro profundo, superfície quase especular, bordas afiadas como lâmina. Há uma qualidade de profundidade nessa pedra — você olha pra ela e sente que ela absorve luz em vez de refletir.
- **Sonic** = frequência, energia, pulso. O que acontece *dentro* da tela é vivo, reativo, psicadélico.

A tensão entre esses dois polos é o projeto de UI inteiro: **uma casca imóvel, obscura e precisa que contém algo vivo e caótico**.

---

## 1. Moodboard & Referências

### 1.1 Os três eixos estéticos e como convergem

| Eixo | O que traz | O que descartamos |
|---|---|---|
| **Winamp / Retro** | Displays segmentados, glow de LEDs, UI densa e funcional, nostalgia de skin | Kitsch excessivo, pixel art forçada, texturas de metal escovado anos 2000 |
| **Minimalismo Moderno** | Silêncio visual, tipografia precisa, espaçamento generoso, os visuais dominam | Brancuras, pastéis, UI "wellness", arredondamentos excessivos |
| **Neon / Synthwave** | Preto profundo, acentos elétricos (violeta, cyan, magenta), qualidade de neon de bar | Gradientes arco-íris, aesthetic retro-wave com palmeiras e grids |

**A convergência:** UI que parece ter saído de um estúdio de masterização de alta gama — funcional, escura, precisa — mas que acende com cor quando o áudio pulsa.

---

### 1.2 Referências por categoria

#### Referências de produto
- **Winamp 5.x com Dark Skin** — a densidade de informação, os medidores de VU, o display de frequência segmentado. Referência de *densidade funcional*.
- **Ableton Live (tema escuro)** — grids perfeitos, tipografia mono para valores, hierarquia clara entre zonas de trabalho. Referência de *clareza operacional*.
- **Native Instruments Traktor / Maschine** — UI que lembra hardware. Knobs, LEDs, displays de 7 segmentos. Referência de *materialidade digital*.
- **Teenage Engineering OP-1** — minimalismo extremo mas cheio de personalidade. Cada elemento tem propósito. Referência de *economia de forma*.

#### Referências visuais / atmosféricas
- **MilkDrop presets clássicos** — a fonte de inspiração direta dos shaders. Warp radial, cores ácidas, simbiose entre áudio e imagem.
- **Neon Genesis Evangelion UI** — displays com texto técnico em japonês, readouts de dados, sobreposições verdes sobre fundo preto. Referência de *densidade técnica com caráter*.
- **Tron: Legacy (2010) UI** — geometria limpa, linhas de luz sobre superfícies negras. Referência de *iluminação por linhas*.

---

## 2. Design System

### 2.1 Sistema de Cores

#### Camadas de superfície

A UI é estratificada em quatro planos de profundidade, do mais escuro ao mais alto:

```
Plano 00 — Fundo absoluto      #080809   (obsidian puro)
Plano 01 — Superfície base     #0F0F14   (painel principal)
Plano 02 — Superfície elevada  #16161E   (cards, overlays)
Plano 03 — Superfície flutuante #1D1D28  (dropdowns, tooltips)
```

A diferença entre planos é sutil e intencional — nenhum tom é "cinza", todos têm um leve desvio para azul/violeta frio, reforçando a qualidade obsidiana da pedra.

#### Bordas e separadores

```
Border sutil     #1E1E2A   (separadores entre zonas)
Border médio     #2A2A3A   (bordas de componentes ativos)
Border destaque  #3A3A50   (foco de teclado, hover)
```

#### Acentos (paleta neon)

Três cores de acento, cada uma com papel semântico:

```
Violet (primário)   #C244FF   — identidade, ações primárias, modo ativo
Cyan (secundário)   #00E5FF   — valores numéricos, frequências, readouts
Hot pink (beat)     #FF2D6B   — reação ao beat, alertas, estados críticos
```

Essas cores **nunca aparecem em grandes áreas de preenchimento** — apenas em bordas, ícones, labels de estado e efeitos de glow. A regra: acentos são luz, não tinta.

#### Tokens de glow

Para efeitos de brilho (box-shadow e text-shadow em equivalentes nativos):

```
Glow Violet leve    rgba(194, 68, 255, 0.25)
Glow Violet médio   rgba(194, 68, 255, 0.50)
Glow Cyan leve      rgba(0, 229, 255, 0.20)
Glow Beat           rgba(255, 45, 107, 0.60)
```

#### Tipografia de cor

```
Text primary    #EEEEF5   (corpo, labels ativos)
Text secondary  #8080A0   (metadados, labels desabilitados)
Text ghost      #3A3A55   (placeholders, separadores textuais)
Text accent     #C244FF   (valores em destaque, modo ativo)
Text mono       #00E5FF   (valores numéricos: BPM, Hz, dB)
```

#### Paleta completa — tokens

```
--color-bg-00: #080809;
--color-bg-01: #0F0F14;
--color-bg-02: #16161E;
--color-bg-03: #1D1D28;

--color-border-subtle:  #1E1E2A;
--color-border-medium:  #2A2A3A;
--color-border-strong:  #3A3A50;

--color-accent-violet:  #C244FF;
--color-accent-cyan:    #00E5FF;
--color-accent-beat:    #FF2D6B;

--color-accent-violet-dim: rgba(194, 68, 255, 0.15);
--color-accent-cyan-dim:   rgba(0, 229, 255, 0.12);

--color-text-primary:   #EEEEF5;
--color-text-secondary: #8080A0;
--color-text-ghost:     #3A3A55;
--color-text-accent:    #C244FF;
--color-text-mono:      #00E5FF;
```

---

### 2.2 Tipografia

#### Escolha das famílias

**Dois papéis, duas famílias:**

| Papel | Fonte | Uso |
|---|---|---|
| **UI / Labels** | Space Grotesk | Botões, títulos de painel, nomes de modo, menus |
| **Valores / Dados** | JetBrains Mono | BPM, Hz, dB, readouts numéricos, atalhos de teclado |

**Por que Space Grotesk:** Geométrica mas com personalidade — o "G" e o "a" têm detalhes que evitam a frieza do Inter/DM Sans. Lembra ligeiramente os displays de fontes vetoriais dos anos 80/90, sem ser nostálgica de forma óbvia.

**Por que JetBrains Mono:** Projetada para densidades altas de caracteres técnicos. Leitura perfeita para valores que mudam em tempo real. O nome tem "Labs" no DNA — reforça a identidade técnica do projeto.

#### Escala tipográfica

```
xs   — 10px / 400 / tracking +0.08em  → metadados, tooltips
sm   — 12px / 400 / tracking +0.04em  → labels secundários
md   — 13px / 500 / tracking +0.02em  → labels principais (tamanho padrão)
lg   — 15px / 600 / tracking 0        → títulos de seção, modo ativo
xl   — 18px / 700 / tracking -0.01em  → título da janela, nome do modo atual
2xl  — 24px / 700 / tracking -0.02em  → splash, display de preset
```

**Valores numéricos (JetBrains Mono):**
```
data-sm  — 11px / 500  → sub-labels de dados
data-md  — 13px / 500  → readouts gerais
data-lg  — 16px / 600  → valores primários (BPM, dB master)
data-xl  — 22px / 700  → display grande (BPM em destaque)
```

#### Regras de uso

- Labels de UI: sempre UPPERCASE com tracking largo para tamanhos ≤12px
- Valores numéricos: sempre em JetBrains Mono, cor `--color-text-mono` (cyan)
- Nomes de modo/preset: Space Grotesk lg/xl, cor primária
- Atalhos de teclado: JetBrains Mono xs, fundo `--color-bg-03`, bordas `--color-border-medium`

---

### 2.3 Espaçamento & Grid

#### Unidade base

**Base: 4px.** Toda medida de espaçamento é múltiplo de 4.

```
space-1  →  4px   (gap mínimo entre elementos relacionados)
space-2  →  8px   (padding interno de componentes compactos)
space-3  → 12px   (gap padrão entre componentes)
space-4  → 16px   (padding de painéis)
space-5  → 20px   (gap entre seções)
space-6  → 24px   (padding de zonas principais)
space-8  → 32px   (separação entre áreas funcionais)
space-12 → 48px   (margem de tela)
```

#### Grid da janela principal

A janela opera com uma divisão funcional em três zonas:

```
┌─────────────────────────────────────────┐
│  TITLE BAR (32px)                       │  zona A
├─────────────────────────────────────────┤
│                                         │
│         VISUALIZER CANVAS               │  zona B (flex, ocupa tudo)
│                                         │
├─────────────────────────────────────────┤
│  CONTROLS BAR (64px)                    │  zona C
└─────────────────────────────────────────┘
```

A Controls Bar tem sua própria subdivisão interna:
```
[MODE SWITCHER — 40%] [SPACER] [DEVICE + SETTINGS — 30%] [LEVEL METER — 20%]
```

#### Tamanhos de janela

```
Mínimo:      640 × 480px
Padrão:      960 × 640px
Confortável: 1280 × 800px
Fullscreen:  monitores suportados (F11 remove todas as zonas exceto B)
```

---

### 2.4 Efeitos & Superfícies

#### Princípio: luz emergente, não decoração

Nenhum efeito existe por estética — cada um tem função:

**Glow de acento:** indica estado ativo, reação ao beat, ou foco de interação. Nunca estático em intensidade máxima — pulsa junto com o áudio quando relevante.

**Blur de overlay:** painéis flutuantes (device selector, settings) usam backdrop-blur sobre o canvas. Isso conecta as duas camadas — a UI não fica solta sobre a visualização.

#### Tokens de efeito

```
Borda ativa (modo selecionado):
  border: 1px solid var(--color-accent-violet)
  box-shadow: 0 0 8px var(--color-accent-violet-dim),
              0 0 2px var(--color-accent-violet)

Glow de beat (flash rápido ao detectar beat):
  box-shadow: 0 0 16px var(--color-accent-beat)
  duração: 80ms ease-out

Blur de overlay:
  backdrop-filter: blur(20px) saturate(1.4)
  background: rgba(15, 15, 20, 0.85)

Separador com gradiente:
  background: linear-gradient(90deg,
    transparent,
    var(--color-border-medium) 20%,
    var(--color-border-medium) 80%,
    transparent)
  height: 1px
```

#### Bordas e raios

O projeto usa bordas **mínimas e precisas**, não arredondadas de forma suave:

```
Radius padrão (botões, cards):  4px
Radius compacto (chips, tags):  3px
Radius de janela/overlay:       6px
Radius zero:                    separadores, barras de progresso, indicadores
```

A preferência por bordas quase retas reforça a estética de hardware — que lembra tanto os anos Winamp quanto as interfaces de instrumentos físicos.

---

## 3. Componentes

### 3.1 Botão de Modo (Mode Button)

O componente mais central da Controls Bar. Seleciona o modo visual ativo.

**Anatomia:**
```
[  ① NÚMERO  |  ② ÍCONE  |  ③ NOME DO MODO  ]
```

**Estados:**

| Estado | Aparência |
|---|---|
| Default | bg: --bg-01, border: --border-subtle, text: --text-secondary |
| Hover | bg: --bg-02, border: --border-medium, text: --text-primary |
| Active | bg: --bg-02, border: accent-violet + glow, text: --text-accent, número em cyan |
| Focused (teclado) | border: --border-strong, outline: 2px dashed --accent-violet |
| Beat flash | Active + glow-beat por 80ms quando beat detectado |

**Dimensões:**
- Padding: 8px 12px
- Altura: 36px
- Gap interno: 6px
- Número: JetBrains Mono data-sm, cor cyan no estado active

---

### 3.2 Level Meter (Medidor de Nível)

Um medidor de VU estilo hardware, vertical ou horizontal.

**Estilo visual:** Segmentado, como LEDs físicos. Não é uma barra sólida — é uma sequência de retângulos com gap de 2px entre eles.

**Zonas de cor:**
```
0% → 70%   →  cyan (#00E5FF) com opacity variando por segmento
70% → 90%  →  violet (#C244FF)
90% → 100% →  beat/hot pink (#FF2D6B) — zona de clipping
```

**Dimensões por segmento:**
- Largura: 4px (vertical) / 3px height (horizontal)
- Gap: 2px
- Total de segmentos: 20 (recomendado para 64px de altura)

**Comportamento:**
- Peak hold: o segmento máximo fica aceso por 1.5s antes de cair
- Decay: os segmentos caem com easing ease-out, ~200ms

---

### 3.3 Device Selector

Um dropdown compacto para seleção do dispositivo de saída de áudio.

**Trigger (fechado):**
```
[ ⟐ HDMI Output — Realtek   ▾ ]
```
- Ícone de dispositivo (16px)
- Nome truncado com ellipsis se necessário
- Seta de dropdown

**Dropdown aberto:**
- Overlay com backdrop-blur
- Lista de dispositivos disponíveis
- Dispositivo ativo com bullet violet e label em accent
- Separador entre categorias (Saídas / Entradas)
- Largura mínima: 280px

**Estados de item:**
- Default: text-secondary
- Hover: bg-03, text-primary
- Selected: text-accent, ícone ativo

---

### 3.4 Slider de Parâmetro

Para sensibilidade e smoothing (Fase 2).

**Anatomia:**
```
LABEL          VALUE
Smoothing      0.85
[━━━━━━━━━━━○─────]
```

**Visual:**
- Track: 2px de altura, bg: --border-medium
- Track preenchido: gradiente de transparent para cyan
- Thumb: 10px × 10px, borda circular, cor: --accent-violet, glow leve
- Hover no thumb: glow aumenta, escala 1.2x

**Dimensões:**
- Altura total do componente: 48px
- Label: Space Grotesk sm, text-secondary
- Valor: JetBrains Mono data-sm, text-mono (cyan)

---

### 3.5 Title Bar

Custom (sem o chrome nativo do Windows no modo ideal).

**Anatomia:**
```
[  ◆ SONIC OBSIDIAN        ···  −  □  ×  ]
```
- Logo mark (◆) — diamante como símbolo do obsidian cristalino
- Nome do app: Space Grotesk md, text-secondary
- Preset ativo (quando tiver): Space Grotesk sm, text-ghost, separado por "|"
- Controles de janela alinhados à direita: ícones minimalistas 16px

**Comportamento:**
- Área arrastável em toda a extensão exceto os botões
- Hover nos controles: bg sutil, ícone text-primary
- Fechar: sem confirmação (estado salvo automaticamente)

---

### 3.6 Keyboard Shortcut Chip

Para exibir atalhos de teclado em tooltips e onboarding.

```
[ 1 ]  [ F11 ]  [ ↑ ]
```
- Fundo: --bg-03
- Borda: --border-medium
- Texto: JetBrains Mono xs, text-secondary
- Padding: 2px 5px
- Radius: 3px

---

## 4. Layout Explorations

### 4.1 Janela Principal — Modo Visualizador

```
┌─ TITLE BAR ─────────────────────────────────────────────────┐
│  ◆ SONIC OBSIDIAN           ···  [ − ][ □ ][ × ]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│               [ VISUALIZER CANVAS ]                        │
│             (preenche todo o espaço)                       │
│                                                             │
│                                                             │
├─ CONTROLS BAR ──────────────────────────────────────────────┤
│ [1·BARS][2·WAVE][3·RADIAL][4·TRAIL][5·SHADER]  [⟐ Device▾] │
│                                              │ ≡│ ██▉▊ ▋▌▍│
└─────────────────────────────────────────────────────────────┘
```

**Princípio:** o canvas é 100% da área útil. A Controls Bar é uma faixa fina (64px) que emerge da borda inferior. O foco está sempre no visual.

**Comportamento dos controles em fullscreen (F11):**
A Controls Bar desaparece. Reaparece com movimento de mouse na borda inferior, com transição de fade-up (200ms). Desaparece após 2s de inatividade.

---

### 4.2 Overlay de Settings

Um painel lateral deslizante da direita (não uma janela separada).

```
┌─ TITLE BAR ────────────────────┬─ SETTINGS ──────────────┐
│  ◆ SONIC OBSIDIAN              │  ✕  Configurações       │
├────────────────────────────────│─────────────────────────┤
│                                │  ÁUDIO                   │
│   [ VISUALIZER CANVAS ]        │  ─────────────────────  │
│     (dimmed: opacity 0.4)      │  Dispositivo             │
│                                │  [⟐ HDMI Output ▾]      │
│                                │                          │
│                                │  VISUALIZAÇÃO            │
│                                │  ─────────────────────  │
│                                │  Sensibilidade           │
│                                │  [━━━━━○──────] 0.72    │
│                                │                          │
│                                │  Smoothing               │
│                                │  [━━━━━━━○─────] 0.85   │
├────────────────────────────────│─────────────────────────┤
│ [controles]                    │                          │
└────────────────────────────────┴─────────────────────────┘
```

**Características:**
- Largura: 280px fixo
- Canvas fica visível mas dimmed (opacity 0.4, blur leve) quando settings está aberto
- Entrada: slide-in da direita, 250ms ease-out
- Saída: slide-out, 180ms ease-in
- Backdrop do painel: blur + bg-01 a 90% de opacidade

---

### 4.3 Fullscreen Puro

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│               [ VISUALIZER CANVAS ]                        │
│                    (100% × 100%)                           │
│                                                             │
│                                                             │
│                                                             │
│ ·····  (controls bar aparece ao hover na borda inferior)   │
└─────────────────────────────────────────────────────────────┘
```

**Watermark sutil (opcional):** "SONIC OBSIDIAN" em text-ghost (opacity 0.06) no canto superior esquerdo. Quase invisível mas presente quando o preset é branco/claro.

---

### 4.4 Estado de Silêncio (No Audio)

Quando nenhum áudio está tocando, o canvas exibe um estado de idle gracioso — não fica simplesmente parado ou bugado.

**Opções de idle state (a definir):**
- Visualização congelada no último frame com fade para preto gradual
- Ondas de ruído de baixa amplitude — como silêncio "respirando"
- Ícone central minimalista com texto "Aguardando áudio..." em text-ghost

---

## 5. Motion Principles

### 5.1 Princípio geral: reatividade vs. fidgeting

**Regra:** apenas o canvas reage ao áudio de forma contínua. A UI só reage ao áudio em eventos discretos (beat detectado). Controles que pulsam o tempo todo viram ruído — o usuário perde a referência.

### 5.2 Tabela de transições

| Interação | Propriedade | Duração | Easing |
|---|---|---|---|
| Hover em botão | background, border | 100ms | ease-out |
| Ativação de modo | border glow, text-color | 150ms | ease-out |
| Beat flash (UI) | box-shadow | 80ms in / 400ms out | ease-in / ease-out |
| Abertura de settings | transform translateX | 250ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Fechamento de settings | transform translateX | 180ms | ease-in |
| Controls bar aparecer (fullscreen) | transform translateY, opacity | 200ms | ease-out |
| Controls bar sumir (fullscreen) | transform translateY, opacity | 300ms | ease-in |
| Level meter — segmentos subindo | fill instantâneo | — | — |
| Level meter — segmentos caindo | fill, delay por segmento | 200ms | ease-out |
| Peak hold release | opacity, translateY | 600ms | ease-in |

### 5.3 Beat reactivity na UI

Quando um beat é detectado:
1. O **Mode Button ativo** recebe `glow-beat` por 80ms
2. O **Level Meter** pisca com a zona de clipping por 40ms (independente do nível real)
3. Nenhum outro elemento da UI reage — evitar sobrecarga visual

### 5.4 Sem animações de loading / splash

O app abre diretamente no estado funcional. Zero splash screen. Se o dispositivo de áudio demorar para inicializar, exibe o estado de silêncio (idle) sem nenhuma animação de "carregando".

---

## 6. Decisões a Tomar (Backlog de UI)

Aspectos que precisam de exploração adicional ou decisão do produto:

| Decisão | Opções | Recomendação |
|---|---|---|
| Fonte: web font vs. sistema | Empacotar Space Grotesk + JetBrains Mono como recursos vs. usar fontes do sistema | Empacotar — garante identidade consistente |
| Ícone do app | Diamante obsidian (◆) com glow violet vs. forma de onda estilizada | ◆ com glow — coerente com o logotype |
| Tema alternativo | Somente dark vs. oferecer variante light | Somente dark — é parte da identidade |
| Atalho para toggle da Controls Bar | Tecla dedicada vs. apenas mouse | Tecla `H` para "hide controls" — coerência com Winamp |
| Preset picker | Inline na Controls Bar vs. overlay separado | Overlay separado quando houver presets GLSL (Fase 3) |
| Configuração persistente | Salvar automaticamente vs. botão "Salvar" | Auto-save — comportamento moderno |

---

## 7. Próximos Passos

1. **Validar direção estética** — especialmente a paleta e a tipografia antes de avançar
2. **Protótipo de tela** — wireframe de alta fidelidade das três views principais (main, settings, fullscreen)
3. **Especificações para Pygame** — traduzir os tokens de cor e os componentes para valores usáveis no código Python
4. **Motion spec para Pygame** — as transições acima precisam ser mapeadas para `pygame.Surface` e timing do game loop

---

*Sonic Obsidian UI Exploration v0.1 — gerado em sessão Cowork · Alexandre*
