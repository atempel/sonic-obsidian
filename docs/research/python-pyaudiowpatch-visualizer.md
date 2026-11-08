# Python + PyAudioWPatch — Visualizador de Áudio no Windows

> Guia técnico completo de implementação usando WASAPI loopback, NumPy FFT, Pygame e ModernGL.

---

## 1. Visão geral da stack

O projeto se divide em três camadas independentes que se comunicam via arrays NumPy:

```
Captura (PyAudioWPatch)  →  Análise (NumPy FFT)  →  Render (Pygame / ModernGL)
```

Cada camada pode ser substituída ou evoluída independentemente. A captura é sempre WASAPI loopback — o render é onde estão as escolhas de complexidade.

### Instalação completa

```bash
pip install pyaudiowpatch numpy pygame moderngl
```

| Biblioteca | Papel | Notas |
|---|---|---|
| `pyaudiowpatch` | Captura WASAPI loopback | Wheels prontos para Python 3.7–3.13 |
| `numpy` | FFT e manipulação de arrays | `np.fft.rfft()` é suficiente |
| `pygame` | Janela, event loop, timing | Pode fazer render 2D direto |
| `moderngl` | Shaders GLSL na GPU | Opcional, para efeitos avançados |

> **Nota sobre o PyAudioWPatch:** o pacote recebe cerca de 747 downloads semanais e há indicações de que é um projeto de manutenção baixa. Funciona bem para Python 3.7–3.13, mas pode não receber atualizações futuras. Para uso pessoal isso é totalmente aceitável — a API WASAPI que ele usa é estável há anos.

---

## 2. Camada de captura — WASAPI Loopback

PyAudioWPatch é um fork do PortAudio que habilita o modo loopback do WASAPI. Os dispositivos loopback ficam disponíveis como dispositivos de entrada virtuais — para capturar dos speakers, você usa o análogo loopback deles, não o dispositivo WASAPI direto.

### 2.1 Captura básica — dispositivo padrão do sistema

```python
import pyaudiowpatch as pyaudio
import numpy as np

p = pyaudio.PyAudio()

# Pega o dispositivo loopback padrão automaticamente
wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
default_speakers = p.get_device_info_by_index(
    wasapi_info["defaultOutputDevice"]
)

# Encontra o loopback correspondente
loopback_device = None
for i in range(p.get_device_count()):
    dev = p.get_device_info_by_index(i)
    if (default_speakers["name"] in dev["name"]
            and dev["hostApi"] == wasapi_info["index"]
            and dev.get("isLoopbackDevice", False)):
        loopback_device = dev
        break

if loopback_device is None:
    raise RuntimeError("Dispositivo loopback não encontrado.")

# Abre o stream de captura
stream = p.open(
    format=pyaudio.paFloat32,
    channels=loopback_device["maxInputChannels"],
    rate=int(loopback_device["defaultSampleRate"]),  # geralmente 48000 Hz
    input=True,
    input_device_index=loopback_device["index"],
    frames_per_buffer=1024,
)
```

### 2.2 Listar todos os dispositivos disponíveis

Útil para debug ou para deixar o usuário escolher o dispositivo de saída:

```bash
python -m pyaudiowpatch
```

Ou programaticamente:

```python
import pyaudiowpatch as pyaudio

p = pyaudio.PyAudio()
for i in range(p.get_device_count()):
    dev = p.get_device_info_by_index(i)
    print(f"[{i}] {dev['name']} | maxIn={dev['maxInputChannels']} | loopback={dev.get('isLoopbackDevice', False)}")
p.terminate()
```

---

## 3. Análise — pipeline FFT com NumPy

Depois de capturar o buffer de áudio bruto, o pipeline para o visualizador é:

```python
import numpy as np

CHUNK = 1024
FFT_SIZE = 2048
SMOOTH = 0.85  # suavização temporal (0 = sem suavização, 1 = congela)

prev_magnitudes = np.zeros(FFT_SIZE // 2 + 1)

def process_audio(stream, channels):
    global prev_magnitudes

    # Lê um buffer de amostras
    raw = stream.read(CHUNK, exception_on_overflow=False)

    # Converte bytes → array numpy de float32
    samples = np.frombuffer(raw, dtype=np.float32)

    # Se stereo, converte para mono
    if channels == 2:
        samples = samples.reshape(-1, 2).mean(axis=1)

    # FFT — transforma domínio do tempo → frequência
    fft = np.fft.rfft(samples, n=FFT_SIZE)
    magnitudes = np.abs(fft)

    # Converte para escala logarítmica (dB), como o ouvido humano percebe
    magnitudes_db = 20 * np.log10(magnitudes + 1e-9)

    # Smoothing temporal — evita flickering brusco entre frames
    prev_magnitudes = SMOOTH * prev_magnitudes + (1 - SMOOTH) * magnitudes_db

    return prev_magnitudes
```

O array `prev_magnitudes` é o que o renderer vai ler a cada frame — um vetor de ~1024 valores representando a energia de cada frequência do áudio tocando agora.

### Normalização para o render

```python
# Normaliza para o intervalo [0, 1] para uso no renderer
def normalize(magnitudes, floor_db=-80.0, ceil_db=0.0):
    clipped = np.clip(magnitudes, floor_db, ceil_db)
    return (clipped - floor_db) / (ceil_db - floor_db)
```

---

## 4. Arquitetura de threading

**Detalhe crítico:** a captura de áudio e o render precisam rodar em threads separadas. O `stream.read()` é bloqueante — se chamado no loop principal, a janela congela enquanto espera o buffer encher.

```
Thread principal (render)          Thread de áudio (captura)
─────────────────────────          ──────────────────────────
pygame event loop 60fps      ←     stream.read() bloqueante
                             ↑
                    queue ou lock compartilhado
                    (audio_data: numpy array)
```

### Implementação com threading.Lock

```python
import threading
import collections

# Buffer compartilhado entre threads (tamanho máximo 1 = sempre o frame mais recente)
audio_buffer = collections.deque(maxlen=1)
audio_lock = threading.Lock()

def audio_thread(stream, channels):
    while running:
        magnitudes = process_audio(stream, channels)
        with audio_lock:
            audio_buffer.append(magnitudes.copy())

# Inicia a thread de captura
t = threading.Thread(target=audio_thread, args=(stream, channels), daemon=True)
t.start()

# No loop de render, lê o último frame disponível
def get_latest_magnitudes():
    with audio_lock:
        return audio_buffer[-1] if audio_buffer else np.zeros(FFT_SIZE // 2 + 1)
```

---

## 5. Opção A — Pygame Canvas 2D (começo ideal)

A opção mais simples. Não precisa de conhecimento de shaders. Boa para barras de frequência, osciloscópio e waveform.

### 5.1 Barras de frequência clássicas (estilo Winamp)

```python
import pygame
import numpy as np

pygame.init()
WIDTH, HEIGHT = 1280, 720
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Visualizador")
clock = pygame.time.Clock()

NUM_BARS = 128

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    magnitudes = get_latest_magnitudes()
    normalized = normalize(magnitudes)

    # Agrupa bins de FFT em bandas logarítmicas
    bar_values = np.array([
        normalized[int(i * len(normalized) / NUM_BARS)]
        for i in range(NUM_BARS)
    ])

    screen.fill((10, 10, 20))

    bar_width = WIDTH // NUM_BARS
    for i, val in enumerate(bar_values):
        height = int(val * (HEIGHT - 20))
        hue = int(240 - (i / NUM_BARS) * 240)  # azul → vermelho
        color = pygame.Color(0)
        color.hsva = (hue, 100, 90, 100)
        pygame.draw.rect(screen, color,
            (i * bar_width, HEIGHT - height, bar_width - 2, height))

    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

### 5.2 Osciloscópio / waveform

```python
def draw_waveform(screen, samples, color=(0, 255, 128)):
    WIDTH, HEIGHT = screen.get_size()
    mid = HEIGHT // 2
    step = max(1, len(samples) // WIDTH)
    points = []

    for x in range(WIDTH):
        idx = x * step
        if idx < len(samples):
            y = int(mid + samples[idx] * mid * 0.8)
            y = max(0, min(HEIGHT - 1, y))
            points.append((x, y))

    if len(points) > 1:
        pygame.draw.lines(screen, color, False, points, 2)
```

### 5.3 Visualização circular (barras radiais)

```python
import math

def draw_circular(screen, magnitudes, cx, cy, radius, num_bars=128):
    normalized = normalize(magnitudes)
    bar_values = [normalized[int(i * len(normalized) / num_bars)] for i in range(num_bars)]

    for i, val in enumerate(bar_values):
        angle = (i / num_bars) * 2 * math.pi - math.pi / 2
        bar_len = int(val * 150)

        x1 = int(cx + math.cos(angle) * radius)
        y1 = int(cy + math.sin(angle) * radius)
        x2 = int(cx + math.cos(angle) * (radius + bar_len))
        y2 = int(cy + math.sin(angle) * (radius + bar_len))

        hue = int((i / num_bars) * 360)
        color = pygame.Color(0)
        color.hsva = (hue, 100, 90, 100)
        pygame.draw.line(screen, color, (x1, y1), (x2, y2), 2)
```

---

## 6. Opção B — Pygame + ModernGL com GLSL shaders

Para efeitos avançados estilo MilkDrop. Pygame gerencia a janela e o event loop; ModernGL executa shaders GLSL diretamente na GPU.

O array de frequências é passado ao shader como uma textura 1D — o shader calcula a cor de cada pixel com liberdade total, rodando em paralelo para todos os pixels da tela.

### 6.1 Setup básico Pygame + ModernGL

```python
import pygame as pg
import moderngl as mgl
import numpy as np

pg.init()
pg.display.gl_set_attribute(pg.GL_CONTEXT_MAJOR_VERSION, 3)
pg.display.gl_set_attribute(pg.GL_CONTEXT_MINOR_VERSION, 3)
pg.display.gl_set_attribute(pg.GL_CONTEXT_PROFILE_MASK, pg.GL_CONTEXT_PROFILE_CORE)

screen = pg.display.set_mode((1280, 720), pg.OPENGL | pg.DOUBLEBUF)
ctx = mgl.create_context()
clock = pg.time.Clock()
```

### 6.2 Shader de barras de frequência

```python
vertex_shader = """
#version 330
in vec2 in_vert;
out vec2 uv;
void main() {
    uv = in_vert * 0.5 + 0.5;
    gl_Position = vec4(in_vert, 0.0, 1.0);
}
"""

fragment_shader = """
#version 330

uniform sampler1D spectrum;
uniform float time;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;

    // Amplitude da frequência na posição horizontal
    float freq = texture(spectrum, uv.x).r;

    // Barra de frequência
    float bar = step(uv.y, freq);

    // Gradiente de cor: grave=azul, agudo=vermelho
    vec3 color = mix(vec3(0.0, 0.4, 1.0), vec3(1.0, 0.1, 0.0), uv.x);
    color *= bar * (0.5 + freq * 0.5);  // brilho proporcional à amplitude

    fragColor = vec4(color, 1.0);
}
"""
```

### 6.3 Pipeline completo com textura de áudio

```python
# Compila shaders
prog = ctx.program(vertex_shader=vertex_shader, fragment_shader=fragment_shader)

# Quad fullscreen (dois triângulos cobrindo toda a tela)
vertices = np.array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
     1.0,  1.0,
], dtype='f4')
vbo = ctx.buffer(vertices.tobytes())
vao = ctx.simple_vertex_array(prog, vbo, 'in_vert')

# Textura 1D para os dados de áudio (1024 bins de frequência)
SPECTRUM_SIZE = 1024
texture = ctx.texture((SPECTRUM_SIZE, 1), 1, dtype='f4')
texture.use(location=0)
prog['spectrum'] = 0
prog['resolution'] = (1280.0, 720.0)

t = 0.0
running = True
while running:
    for event in pg.event.get():
        if event.type == pg.QUIT:
            running = False

    # Atualiza textura com dados de áudio
    magnitudes = get_latest_magnitudes()
    normalized = normalize(magnitudes)[:SPECTRUM_SIZE].astype('f4')
    texture.write(normalized.tobytes())

    # Render
    ctx.clear(0.05, 0.05, 0.1)
    prog['time'] = t
    vao.render(mgl.TRIANGLE_STRIP)

    pg.display.flip()
    clock.tick(60)
    t += clock.get_time() / 1000.0

pg.quit()
```

### 6.4 Fragment shader psicodélico — estilo MilkDrop

Um shader mais elaborado com efeito de warp e feedback de cores:

```glsl
#version 330

uniform sampler1D spectrum;
uniform float time;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 center = uv - 0.5;

    // Bass e treble separados
    float bass   = texture(spectrum, 0.05).r;
    float mid    = texture(spectrum, 0.3).r;
    float treble = texture(spectrum, 0.8).r;

    // Distorção polar reativa ao bass
    float angle  = atan(center.y, center.x);
    float radius = length(center);
    float warp   = bass * 0.15 * sin(angle * 6.0 + time * 2.0);
    radius += warp;

    // Campo de frequências como textura
    float freq = texture(spectrum, radius * 1.2).r;

    // Cor: mistura de tonalidades baseada nas bandas
    vec3 color = vec3(
        bass   * 0.8 + sin(time + uv.x * 3.14) * 0.2,
        mid    * 0.6 + cos(time * 0.7) * 0.2,
        treble * 0.9 + sin(time * 1.3 + uv.y * 6.0) * 0.1
    );

    // Brilho proporcional à amplitude local
    color *= freq * 2.5;

    // Vinheta suave nas bordas
    float vignette = 1.0 - smoothstep(0.4, 0.8, radius);
    color *= vignette;

    fragColor = vec4(color, 1.0);
}
```

---

## 7. Opção C — Pygame Canvas 2D com efeito de trail/decay

Meio-termo entre A e B: sem shaders, mas com efeito visual de persistência de imagem (como os antigos visualizadores de osciloscópio).

```python
# Surface semi-transparente aplicada a cada frame cria o efeito de fade
fade_surface = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
fade_surface.fill((10, 10, 20, 30))  # alpha baixo = trail longo

while running:
    # Aplica fade no lugar de limpar completamente
    screen.blit(fade_surface, (0, 0))

    magnitudes = get_latest_magnitudes()
    # ... desenha barras, linhas, partículas sobre o fade
```

---

## 8. Opção D — Detecção de beat

Independente do renderer escolhido, a detecção de beat pode ser adicionada ao pipeline de análise:

```python
BASS_BINS = slice(1, 10)      # frequências de 20 Hz a ~500 Hz
BEAT_THRESHOLD = 1.5           # multiplicador sobre a média recente
BEAT_COOLDOWN = 0.3            # mínimo de segundos entre beats detectados

bass_history = collections.deque(maxlen=43)  # ~43 frames = ~700ms de histórico
last_beat = 0.0

def detect_beat(magnitudes, current_time):
    global last_beat

    bass_energy = np.mean(magnitudes[BASS_BINS])
    bass_history.append(bass_energy)

    if len(bass_history) < 10:
        return False

    avg_bass = np.mean(bass_history)
    is_beat = (bass_energy > avg_bass * BEAT_THRESHOLD
               and current_time - last_beat > BEAT_COOLDOWN)

    if is_beat:
        last_beat = current_time

    return is_beat
```

O beat pode ser usado para disparar flashes, mudanças de cor, pulsos no raio da visualização circular, etc.

---

## 9. Estrutura de projeto sugerida

```
visualizer/
├── main.py               # entry point, inicializa tudo e roda o loop
├── capture.py            # PyAudioWPatch — thread de captura e FFT
├── renderers/
│   ├── bars.py           # Opção A: barras Canvas 2D
│   ├── waveform.py       # Opção A: osciloscópio
│   ├── circular.py       # Opção A: barras radiais
│   └── shader.py         # Opção B: fullscreen GLSL shader
├── shaders/
│   ├── bars.frag         # shader de barras
│   └── psychedelic.frag  # shader estilo MilkDrop
└── requirements.txt
```

`requirements.txt`:
```
pyaudiowpatch
numpy
pygame
moderngl
```

---

## 10. Limitações conhecidas

| Limitação | Detalhe |
|---|---|
| Conteúdo DRM | WASAPI loopback não captura áudio com DRM ativo (ex: Spotify Premium com proteção habilitada). Retorna silêncio ou sinal degradado. |
| ARM64 | Loopback WASAPI pode não funcionar em dispositivos Windows ARM64 — o stack de áudio nesses chips pode não expor o endpoint de loopback. |
| Silêncio real | Se não houver áudio tocando, o stream retorna buffers vazios mas continua rodando. O visualizador simplesmente não mostrará nada. |
| Dispositivos externos | Fones Bluetooth ou DACs USB têm seus próprios endpoints de loopback — o código precisa encontrar o loopback correto para o dispositivo em uso, não o default de sistema. |
| PyAudioWPatch manutenção | O projeto tem atividade baixa. Alternativas: `soundcard` (lib mais moderna), ou WASAPI direto via `ctypes`. |

---

## 11. Próximos passos

1. **Fase 1 funcional:** `main.py` com captura loopback + barras Canvas 2D — um único arquivo de ~150 linhas.
2. **Fase 2:** Adicionar seletor de dispositivo na UI, beat detection, modos visuais intercambiáveis.
3. **Fase 3:** Substituir Canvas 2D por ModernGL + shaders GLSL para efeitos avançados.
4. **Fase 4 (opcional):** Empacotar com PyInstaller para `.exe` standalone, sem necessidade de Python instalado.

---

*Baseado em pesquisa de fontes públicas: PyPI, GitHub (s0d3s/PyAudioWPatch, moderngl/moderngl), MDN, Microsoft Learn e artigos técnicos de desenvolvimento. Informações sobre comportamento do WASAPI em hardware específico devem ser verificadas empiricamente, pois variam por driver e fabricante.*
