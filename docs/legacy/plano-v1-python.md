# Projeto: Visualizador de Áudio — Plano e Contexto

> Documento de referência para desenvolvimento. Use como contexto ao iniciar sessões no Cowork.
> Última revisão: março 2026.

---

## O que é o projeto

Visualizador de áudio em tempo real para Windows, inspirado nos visualizadores clássicos do Winamp (MilkDrop, AVS). Captura o áudio que está tocando no computador via WASAPI loopback e gera visuais reativos às frequências e ao beat.

**Uso pessoal.** Sem requisito de code signing nem distribuição pública.

---

## Decisões já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Plataforma | Windows | WASAPI loopback — captura nativa sem restrições de browser |
| Linguagem | Python | Menor fricção para prototipar, sem compilação |
| Captura de áudio | PyAudioWPatch + WASAPI loopback | Único fork do PyAudio com suporte nativo a loopback |
| Análise de sinal | NumPy FFT (`np.fft.rfft`) | Suficiente para 60fps, simples de integrar |
| Janela e event loop | Pygame | Gerencia windowing, input e timing |
| Render avançado | ModernGL + GLSL shaders | Adicionado nas fases posteriores, sobre o mesmo contexto Pygame |
| Modos visuais | Todos implementados, selecionáveis em runtime | Sem preferência definida — usuário escolhe no app |
| Signing | Nenhum | Uso pessoal, executado localmente |
| Abordagem | Fases incrementais | Começar simples, evoluir sem reescrever |

---

## Stack técnica

```
PyAudioWPatch   →   NumPy FFT   →   Pygame + ModernGL
(WASAPI loopback)   (análise)        (render)
```

### Dependências

```bash
pip install pyaudiowpatch numpy pygame moderngl
```

### Arquitetura de threading

A captura de áudio é **bloqueante** — precisa rodar em thread separada do loop de render:

```
Thread de render (principal)     Thread de áudio (daemon)
────────────────────────────     ────────────────────────
Pygame event loop @ 60fps   ←   stream.read() → FFT → deque(maxlen=1)
```

Comunicação via `collections.deque(maxlen=1)` + `threading.Lock()`.

---

## Fases do projeto

### Fase 1 — Fundação (prioridade atual)

**Objetivo:** app funcional em um único arquivo `.py`.

Entregas:
- Captura WASAPI loopback do dispositivo de saída padrão
- FFT com NumPy + smoothing temporal
- Detecção de beat simples (energia do bass vs. média histórica)
- Modos visuais via Pygame Canvas 2D:
  - Barras de frequência (estilo Winamp clássico)
  - Osciloscópio / waveform
  - Barras radiais circulares
  - Trail/decay (efeito de persistência de imagem)
- Teclas de atalho para trocar de modo em runtime

**Estrutura de arquivo único:**

```python
# visualizer.py
# — captura (PyAudioWPatch + thread)
# — FFT + smoothing + beat detection
# — loop principal Pygame
# — render dos modos visuais
```

### Fase 2 — Usabilidade

Entregas:
- Seletor de dispositivo de saída (para fones, DACs externos, Bluetooth)
- Configurações de sensibilidade e smoothing via sliders na UI
- Modo fullscreen com F11
- Múltiplos modos visuais numerados (teclas 1–5 para trocar)

### Fase 3 — Efeitos avançados (estilo MilkDrop)

Entregas:
- ModernGL + GLSL fragment shaders reativos ao áudio
- Array de frequências passado ao shader como textura 1D
- Efeitos: warp radial, noise de Perlin, bloom, motion blur
- Sistema de presets GLSL intercambiáveis (arquivos `.frag`)
- Transições suaves entre presets

### Fase 4 — Empacotamento (opcional)

Entregas:
- Bundle `.exe` standalone com PyInstaller (sem Python instalado)
- Ícone e nome no executável
- Arquivo de configuração (`config.toml` ou `config.json`) persistente

---

## Pipeline de áudio — referência rápida

```python
# Captura
raw = stream.read(1024, exception_on_overflow=False)
samples = np.frombuffer(raw, dtype=np.float32)
if channels == 2:
    samples = samples.reshape(-1, 2).mean(axis=1)  # stereo → mono

# FFT
fft = np.fft.rfft(samples, n=2048)
magnitudes = np.abs(fft)
magnitudes_db = 20 * np.log10(magnitudes + 1e-9)  # escala logarítmica

# Smoothing temporal (0 = sem suavização, 1 = congela)
SMOOTH = 0.85
magnitudes = SMOOTH * prev + (1 - SMOOTH) * magnitudes_db

# Normalização para o render [0, 1]
normalized = np.clip((magnitudes - (-80)) / 80, 0, 1)

# Beat detection
bass_energy = np.mean(magnitudes[1:10])
is_beat = bass_energy > np.mean(bass_history) * 1.5
```

---

## Modos visuais planejados

| Modo | Tecla | Renderer | Descrição |
|---|---|---|---|
| Barras clássicas | `1` | Pygame Canvas 2D | Barras verticais, gradiente azul→vermelho |
| Osciloscópio | `2` | Pygame Canvas 2D | Waveform contínua, linha verde |
| Barras radiais | `3` | Pygame Canvas 2D | Barras saindo do centro em 360° |
| Trail/decay | `4` | Pygame Canvas 2D | Qualquer modo com fade em vez de clear |
| Shader simples | `5` | ModernGL GLSL | Barras no fragment shader, GPU |
| Shader psicodélico | `6` | ModernGL GLSL | Warp radial reativo ao beat |

---

## Limitações conhecidas

- **Conteúdo DRM:** WASAPI loopback não captura áudio com DRM ativo. Retorna silêncio ou sinal degradado (afeta Spotify com DRM habilitado).
- **Windows ARM64:** loopback WASAPI pode não funcionar — o stack de áudio desses chips pode não expor o endpoint de loopback.
- **Dispositivos externos:** fones Bluetooth, DACs USB e HDMI têm endpoints próprios. O código precisa localizar o loopback correto para o dispositivo em uso (não o default de sistema).
- **PyAudioWPatch:** manutenção baixa (projeto ativo mas com poucos updates). Alternativa futura: `soundcard` (lib mais moderna) ou WASAPI via `ctypes` direto.
- **Silêncio:** se nenhum áudio estiver tocando, o stream retorna buffers vazios e o visualizador fica parado — comportamento esperado.

---

## Estrutura de pastas (Fase 1 → Fase 3)

```
visualizer/
├── main.py                  # entry point e loop principal
├── capture.py               # PyAudioWPatch, thread de captura, FFT
├── beat.py                  # detecção de beat
├── renderers/
│   ├── base.py              # interface comum para todos os renderers
│   ├── bars.py              # barras Canvas 2D
│   ├── waveform.py          # osciloscópio Canvas 2D
│   ├── circular.py          # barras radiais Canvas 2D
│   └── shader.py            # ModernGL + GLSL (Fase 3)
├── shaders/
│   ├── bars.frag            # shader de barras
│   └── psychedelic.frag     # shader estilo MilkDrop
├── config.toml              # configurações persistentes (Fase 4)
└── requirements.txt
```

---

## Ponto atual

**Fase 1 — pronta para implementação.**

O próximo passo é escrever o `main.py` com captura WASAPI loopback + barras de frequência em Pygame Canvas 2D. A arquitetura de threading e o pipeline FFT já estão definidos acima. O objetivo é ter algo visual rodando o quanto antes para validar a captura de áudio antes de evoluir os efeitos.
