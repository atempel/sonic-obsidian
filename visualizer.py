"""
Visualizador de Áudio — Fase 1
Stack: PyAudioWPatch (WASAPI loopback) + NumPy FFT + Pygame Canvas 2D

Teclas:
  1  — Barras de frequência (Winamp)
  2  — Osciloscópio / waveform
  3  — Barras radiais circulares
  4  — Trail/decay (barras com persistência de imagem)
  T  — Liga/desliga trail em qualquer modo
  F  — Fullscreen
  ↑  — Aumentar ganho (amplifica visualização)
  ↓  — Diminuir ganho (atenua visualização)
  →  — Subir frequência mínima (filtra graves)
  ←  — Baixar frequência mínima
  ESC / Q — Sair
"""

import collections
import math
import threading
import sys

import numpy as np
import pygame
import pyaudiowpatch as pyaudio

# ─── Configurações ────────────────────────────────────────────────────────────

WIDTH, HEIGHT = 1280, 720
FPS = 60
TITLE = "Visualizador de Áudio"

CHUNK = 1024          # amostras por leitura
FFT_SIZE = 2048       # tamanho da FFT (potência de 2)
SMOOTH = 0.82         # suavização temporal (0 = sem suavização, 1 = congela)

NUM_BARS = 120        # quantidade de barras no modo Winamp e circular
FLOOR_DB = -80.0      # piso de dB para normalização
CEIL_DB = 0.0         # teto de dB para normalização

# Ganho de visualização
GAIN_DEFAULT = 0.7    # padrão — bom para áudio em volume normal
GAIN_MIN = 0.1
GAIN_MAX = 3.0
GAIN_STEP = 0.1

# Frequência mínima da análise (filtro de graves)
FREQ_START_DEFAULT = 1    # bin FFT inicial (1 = desde o início, ~23 Hz a 48 kHz)
FREQ_START_MAX = 150      # máximo ~3500 Hz a 48 kHz — cobre todo o range de graves/low-mid
FREQ_START_STEP = 1       # 1 bin por pressionamento (~23 Hz de passo)

# Beat detection
BASS_BINS = slice(1, 12)       # bins de graves (~20–550 Hz)
BEAT_THRESHOLD = 1.6           # multiplicador sobre a média recente para detectar beat
BEAT_MIN_ENERGY_DB = -45.0     # piso absoluto: abaixo disso é silêncio, não conta como beat
BEAT_COOLDOWN = 0.28           # segundos mínimos entre beats
BEAT_FLASH_DURATION = 0.08     # duração do flash visual de beat em segundos

TRAIL_ALPHA = 28               # transparência do fade (0=apaga rápido, 255=congela)
BG_COLOR = (8, 8, 18)

# ─── Estado global de áudio ───────────────────────────────────────────────────

_audio_buffer: collections.deque = collections.deque(maxlen=1)
_waveform_buffer: collections.deque = collections.deque(maxlen=1)
_audio_lock = threading.Lock()
_running = True

_prev_magnitudes = np.zeros(FFT_SIZE // 2 + 1)

# ─── Captura e pipeline FFT ───────────────────────────────────────────────────

def find_loopback_device(p: pyaudio.PyAudio):
    """Encontra o dispositivo loopback WASAPI do speaker padrão."""
    try:
        wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
    except OSError:
        raise RuntimeError(
            "WASAPI não encontrado. Certifique-se de estar no Windows "
            "com drivers de áudio normais instalados."
        )

    default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])

    for i in range(p.get_device_count()):
        dev = p.get_device_info_by_index(i)
        if (
            default_speakers["name"] in dev["name"]
            and dev["hostApi"] == wasapi_info["index"]
            and dev.get("isLoopbackDevice", False)
        ):
            return dev

    raise RuntimeError(
        f"Dispositivo loopback não encontrado para '{default_speakers['name']}'.\n"
        "Verifique se há áudio tocando e se o driver WASAPI está ativo."
    )


def normalize(magnitudes: np.ndarray) -> np.ndarray:
    """Normaliza magnitudes dB para [0, 1]."""
    clipped = np.clip(magnitudes, FLOOR_DB, CEIL_DB)
    return (clipped - FLOOR_DB) / (CEIL_DB - FLOOR_DB)


def audio_thread_fn(stream, channels: int):
    """Thread de captura: lê stream → FFT → smoothing → grava no buffer."""
    global _prev_magnitudes, _running

    while _running:
        try:
            raw = stream.read(CHUNK, exception_on_overflow=False)
        except OSError:
            break

        samples = np.frombuffer(raw, dtype=np.float32).copy()

        if channels >= 2:
            # Stereo → mono
            samples = samples.reshape(-1, channels).mean(axis=1)

        # Salva waveform bruta (normalizada para [-1, 1])
        waveform = np.clip(samples, -1.0, 1.0)
        with _audio_lock:
            _waveform_buffer.append(waveform)

        # FFT → magnitudes em dB
        fft = np.fft.rfft(samples, n=FFT_SIZE)
        magnitudes = np.abs(fft)
        magnitudes_db = 20.0 * np.log10(magnitudes + 1e-9)

        # Smoothing temporal
        _prev_magnitudes = SMOOTH * _prev_magnitudes + (1.0 - SMOOTH) * magnitudes_db

        with _audio_lock:
            _audio_buffer.append(_prev_magnitudes.copy())


def get_magnitudes() -> np.ndarray:
    with _audio_lock:
        return _audio_buffer[-1].copy() if _audio_buffer else np.full(FFT_SIZE // 2 + 1, FLOOR_DB)


def get_waveform() -> np.ndarray:
    with _audio_lock:
        return _waveform_buffer[-1].copy() if _waveform_buffer else np.zeros(CHUNK)


# ─── Beat detection ───────────────────────────────────────────────────────────

_bass_history: collections.deque = collections.deque(maxlen=43)  # ~700 ms a 60 fps
_last_beat_time = 0.0


def detect_beat(magnitudes: np.ndarray, current_time: float) -> bool:
    global _last_beat_time

    bass_energy = float(np.mean(magnitudes[BASS_BINS]))
    _bass_history.append(bass_energy)

    # Piso absoluto: silêncio ou ruído de fundo não disparam beat
    if bass_energy < BEAT_MIN_ENERGY_DB:
        return False

    if len(_bass_history) < 10:
        return False

    avg = float(np.mean(_bass_history))

    # Evita divisão/comparação espúria se a média ainda está no piso de silêncio
    if avg < BEAT_MIN_ENERGY_DB:
        return False

    is_beat = (
        bass_energy > avg * BEAT_THRESHOLD
        and current_time - _last_beat_time > BEAT_COOLDOWN
    )

    if is_beat:
        _last_beat_time = current_time

    return is_beat


# ─── Helpers de render ────────────────────────────────────────────────────────

def bin_to_bars(magnitudes: np.ndarray, num_bars: int, gain: float, freq_start: int) -> np.ndarray:
    """Agrupa bins FFT em bandas logarítmicas e aplica ganho.

    freq_start: bin FFT de início (1 = desde o começo). Aumentar filtra graves.
    """
    norm = normalize(magnitudes)
    n = len(norm)
    start = max(1, freq_start)          # log10(0) é indefinido
    end = n - 1
    if start >= end:
        start = end - 1
    indices = np.logspace(np.log10(start), np.log10(end), num=num_bars, base=10).astype(int)
    indices = np.clip(indices, 0, n - 1)
    return np.clip(norm[indices] * gain, 0.0, 1.0)


def hue_color(hue_deg: float, saturation=100, value=88) -> tuple:
    """Retorna cor RGB a partir de HSV."""
    c = pygame.Color(0)
    c.hsva = (hue_deg % 360, saturation, value, 100)
    return (c.r, c.g, c.b)


# ─── Renderers ───────────────────────────────────────────────────────────────

def draw_bars(surface: pygame.Surface, bar_values: np.ndarray, beat: bool):
    """Modo 1 — barras verticais estilo Winamp."""
    w, h = surface.get_size()
    n = len(bar_values)
    bar_w = max(1, w // n)
    gap = max(1, bar_w // 8)

    for i, val in enumerate(bar_values):
        bar_h = int(val * (h - 4))
        if bar_h < 1:
            continue
        hue = 220.0 - (i / n) * 220.0          # azul → verde → amarelo → vermelho
        brightness = 75 + int(val * 25)
        color = hue_color(hue, value=brightness)

        # Flash de beat: clareia as primeiras barras (graves)
        if beat and i < n // 6:
            color = tuple(min(255, c + 60) for c in color)

        x = i * bar_w
        pygame.draw.rect(
            surface, color,
            (x + gap, h - bar_h, bar_w - gap * 2, bar_h)
        )

        # Topo destacado
        top_color = tuple(min(255, c + 50) for c in color)
        pygame.draw.rect(surface, top_color, (x + gap, h - bar_h - 2, bar_w - gap * 2, 2))


def draw_waveform(surface: pygame.Surface, samples: np.ndarray, beat: bool, gain: float):
    """Modo 2 — osciloscópio / waveform."""
    w, h = surface.get_size()
    mid = h // 2

    if len(samples) < 2:
        return

    step = max(1, len(samples) // w)
    points = []
    for x in range(w):
        idx = x * step
        if idx < len(samples):
            y = int(mid - samples[idx] * gain * mid * 0.85)
            y = max(1, min(h - 2, y))
            points.append((x, y))

    if len(points) > 1:
        color = (0, 230, 100) if not beat else (255, 255, 80)
        pygame.draw.lines(surface, color, False, points, 2)

        # Linha central de referência
        pygame.draw.line(surface, (30, 30, 50), (0, mid), (w, mid), 1)


def draw_circular(surface: pygame.Surface, bar_values: np.ndarray, beat: bool, t: float):
    """Modo 3 — barras radiais saindo do centro."""
    w, h = surface.get_size()
    cx, cy = w // 2, h // 2
    n = len(bar_values)

    base_radius = min(w, h) * 0.18
    max_bar_len = min(w, h) * 0.32

    # Pulso de beat no raio interno
    radius = base_radius + (12 if beat else 0)

    for i, val in enumerate(bar_values):
        angle = (i / n) * 2 * math.pi - math.pi / 2
        bar_len = int(val * max_bar_len)
        if bar_len < 1:
            continue

        cos_a, sin_a = math.cos(angle), math.sin(angle)
        x1 = int(cx + cos_a * radius)
        y1 = int(cy + sin_a * radius)
        x2 = int(cx + cos_a * (radius + bar_len))
        y2 = int(cy + sin_a * (radius + bar_len))

        hue = (i / n) * 360.0
        brightness = 70 + int(val * 30)
        color = hue_color(hue, value=brightness)

        width = 1 if val < 0.5 else 2
        pygame.draw.line(surface, color, (x1, y1), (x2, y2), width)

    # Círculo central
    center_color = (255, 80, 80) if beat else (60, 60, 120)
    pygame.draw.circle(surface, center_color, (cx, cy), int(radius), 2)


# ─── HUD (informações na tela) ────────────────────────────────────────────────

def draw_hud(surface: pygame.Surface, mode: int, trail: bool, beat: bool,
             fps: float, gain: float, freq_start_hz: float, font: pygame.font.Font):
    mode_names = {1: "Barras", 2: "Osciloscópio", 3: "Circular", 4: "Barras + Trail"}
    name = mode_names.get(mode, "")

    # FPS
    fps_surf = font.render(f"{fps:.0f} fps", True, (50, 50, 80))
    surface.blit(fps_surf, (surface.get_width() - fps_surf.get_width() - 10, 8))

    # Modo atual
    mode_surf = font.render(f"[{mode}] {name}{'  +trail' if trail and mode != 4 else ''}", True, (70, 70, 100))
    surface.blit(mode_surf, (10, 8))

    # Ganho
    gain_color = (100, 180, 100) if gain <= 1.0 else (220, 160, 60)
    gain_surf = font.render(f"ganho  {gain:.1f}x  (↑↓)", True, gain_color)
    surface.blit(gain_surf, (10, 22))

    # Frequência mínima
    freq_color = (100, 140, 220) if freq_start_hz <= 50 else (180, 120, 220)
    freq_surf = font.render(f"freq min  {freq_start_hz:.0f} Hz  (←→)", True, freq_color)
    surface.blit(freq_surf, (10, 36))

    # Indicador de beat
    if beat:
        beat_surf = font.render("BEAT", True, (255, 60, 60))
        surface.blit(beat_surf, (10, 52))

    # Legenda de teclas (canto inferior esquerdo, discreta)
    hint = font.render("1/2/3/4 · T trail · F full · ↑↓ ganho · ←→ freq min · ESC sair", True, (35, 35, 55))
    surface.blit(hint, (10, surface.get_height() - hint.get_height() - 8))


# ─── Loop principal ───────────────────────────────────────────────────────────

def main():
    global _running

    # Inicializa captura de áudio
    p = pyaudio.PyAudio()
    try:
        loopback = find_loopback_device(p)
    except RuntimeError as e:
        print(f"Erro: {e}")
        p.terminate()
        sys.exit(1)

    channels = loopback["maxInputChannels"]
    rate = int(loopback["defaultSampleRate"])

    print(f"Dispositivo: {loopback['name']}")
    print(f"  Canais: {channels} | Sample rate: {rate} Hz")

    stream = p.open(
        format=pyaudio.paFloat32,
        channels=channels,
        rate=rate,
        input=True,
        input_device_index=loopback["index"],
        frames_per_buffer=CHUNK,
    )

    # Inicia thread de captura
    capture_thread = threading.Thread(
        target=audio_thread_fn, args=(stream, channels), daemon=True
    )
    capture_thread.start()

    # ── Pygame ──
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
    pygame.display.set_caption(TITLE)
    clock = pygame.time.Clock()

    try:
        font = pygame.font.SysFont("Consolas", 13)
    except Exception:
        font = pygame.font.Font(None, 16)

    # Surface de trail (fade em vez de clear)
    trail_surface = pygame.Surface((WIDTH, HEIGHT))
    trail_surface.fill(BG_COLOR)

    # Estado da UI
    mode = 1                    # modo visual ativo (1–4)
    trail_on = False            # trail ligado/desligado manual
    fullscreen = False
    gain = GAIN_DEFAULT         # controle de ganho/atenuação
    freq_start = FREQ_START_DEFAULT  # bin FFT inicial (filtro de graves)

    beat = False
    beat_flash_end = 0.0
    t = 0.0           # tempo em segundos para animações

    while True:
        dt = clock.tick(FPS) / 1000.0
        t += dt
        current_time = pygame.time.get_ticks() / 1000.0

        # ── Eventos ──
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                _running = False
                return

            if event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_q):
                    _running = False
                    return
                elif event.key == pygame.K_1:
                    mode = 1
                elif event.key == pygame.K_2:
                    mode = 2
                elif event.key == pygame.K_3:
                    mode = 3
                elif event.key == pygame.K_4:
                    mode = 4
                elif event.key == pygame.K_UP:
                    gain = round(min(GAIN_MAX, gain + GAIN_STEP), 2)
                elif event.key == pygame.K_DOWN:
                    gain = round(max(GAIN_MIN, gain - GAIN_STEP), 2)
                elif event.key == pygame.K_RIGHT:
                    freq_start = min(FREQ_START_MAX, freq_start + FREQ_START_STEP)
                elif event.key == pygame.K_LEFT:
                    freq_start = max(FREQ_START_DEFAULT, freq_start - FREQ_START_STEP)
                elif event.key == pygame.K_t:
                    trail_on = not trail_on
                elif event.key == pygame.K_f:
                    fullscreen = not fullscreen
                    if fullscreen:
                        screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
                    else:
                        screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
                    # Recriar trail_surface com novo tamanho
                    w, h = screen.get_size()
                    trail_surface = pygame.Surface((w, h))
                    trail_surface.fill(BG_COLOR)

            if event.type == pygame.VIDEORESIZE:
                trail_surface = pygame.Surface((event.w, event.h))
                trail_surface.fill(BG_COLOR)

        # ── Dados de áudio ──
        magnitudes = get_magnitudes()
        waveform = get_waveform()
        freq_start_hz = freq_start * rate / FFT_SIZE
        bar_values = bin_to_bars(magnitudes, NUM_BARS, gain, freq_start)

        beat = detect_beat(magnitudes, current_time)
        if beat:
            beat_flash_end = current_time + BEAT_FLASH_DURATION
        beat_visible = current_time < beat_flash_end

        # ── Render ──
        w, h = screen.get_size()
        use_trail = trail_on or mode == 4

        if use_trail:
            # Redimensiona trail_surface se necessário
            if trail_surface.get_size() != (w, h):
                trail_surface = pygame.Surface((w, h))
                trail_surface.fill(BG_COLOR)

            # Fade: desenha um overlay semi-transparente sobre o frame anterior
            fade = pygame.Surface((w, h), pygame.SRCALPHA)
            fade.fill((*BG_COLOR, TRAIL_ALPHA))
            trail_surface.blit(fade, (0, 0))
            draw_surface = trail_surface
        else:
            draw_surface = pygame.Surface((w, h))
            draw_surface.fill(BG_COLOR)

        # Flash de beat como fundo sutil
        if beat_visible and mode != 2:
            flash = pygame.Surface((w, h), pygame.SRCALPHA)
            flash.fill((255, 80, 40, 12))
            draw_surface.blit(flash, (0, 0))

        # Desenha o modo visual ativo
        if mode == 1 or mode == 4:
            draw_bars(draw_surface, bar_values, beat_visible)
        elif mode == 2:
            draw_waveform(draw_surface, waveform, beat_visible, gain)
        elif mode == 3:
            draw_circular(draw_surface, bar_values, beat_visible, t)

        screen.blit(draw_surface, (0, 0))
        draw_hud(screen, mode, trail_on, beat_visible, clock.get_fps(), gain, freq_start_hz, font)

        pygame.display.flip()

    # ── Cleanup ──
    _running = False
    stream.stop_stream()
    stream.close()
    p.terminate()
    pygame.quit()


if __name__ == "__main__":
    main()
