# 🎵 Sonic Obsidian

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)
![Pygame](https://img.shields.io/badge/Pygame--CE-latest-76B900?style=flat-square&logo=python&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-FFT-013243?style=flat-square&logo=numpy&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)
![Status](https://img.shields.io/badge/Status-Phase%201-blueviolet?style=flat-square)

> Visualizador de áudio em tempo real para Windows, capturando o áudio do sistema via WASAPI loopback sem necessidade de cabo virtual ou software externo.

<img width="1282" height="752" alt="image" src="https://github.com/user-attachments/assets/37ee7207-5227-4f38-b56c-2c842a56ab37" />

---

## Visão Geral

**Sonic Obsidian** é um visualizador de áudio desktop construído com Python puro. Ele captura o que está tocando no seu sistema operacional (Spotify, YouTube, jogos, qualquer fonte) e renderiza visualizações em tempo real usando FFT e análise de waveform.

### Stack

| Componente | Tecnologia |
|---|---|
| Captura de áudio | [PyAudioWPatch](https://github.com/s0d3s/PyAudioWPatch) — WASAPI loopback |
| Análise espectral | NumPy FFT (2048 pontos) |
| Renderização | Pygame-CE (Canvas 2D, 60 fps) |

---

## Modos de Visualização

| Tecla | Modo | Descrição |
|---|---|---|
| `1` | **Barras de frequência** | Espectro estilo Winamp com 120 bandas logarítmicas |
| `2` | **Osciloscópio** | Waveform da forma de onda bruta |
| `3` | **Barras radiais** | Espectro circular com gradiente de cor |
| `4` | **Trail / Decay** | Barras com persistência de imagem e fade |

---

## Controles

| Tecla | Ação |
|---|---|
| `↑` / `↓` | Aumentar / diminuir ganho da visualização |
| `→` / `←` | Subir / baixar frequência mínima da análise (filtro de graves) |
| `T` | Liga/desliga trail em qualquer modo |
| `F` | Alternar fullscreen |
| `ESC` / `Q` | Sair |

---

## Instalação

### Pré-requisitos

- Windows 10/11
- Python 3.10+
- Dispositivo de áudio compatível com WASAPI

### Setup

```bash
# Clone o repositório
git clone https://github.com/atempel/sonic-obsidian.git
cd sonic-obsidian

# Instale as dependências
pip install -r requirements.txt

# Execute
python visualizer.py
```

### Dependências

```
pyaudiowpatch
numpy
pygame-ce
```

---

## Como Funciona

1. **Captura**: PyAudioWPatch abre um stream WASAPI loopback do dispositivo de saída padrão do Windows, capturando o áudio do sistema sem interromper a reprodução.
2. **FFT**: A cada frame, 2048 amostras são transformadas via `numpy.fft.rfft`, gerando o espectro de frequências em escala dB.
3. **Smoothing**: Os bins são suavizados temporalmente (`SMOOTH = 0.82`) para evitar jitter visual.
4. **Mapeamento logarítmico**: Os bins FFT são agrupados em 120 bandas com espaçamento logarítmico, concentrando resolução nos graves (comportamento similar ao ouvido humano).
5. **Beat detection**: A energia nos bins de graves (~20–550 Hz) é comparada contra uma média móvel; um beat é detectado quando supera o limiar com cooldown de 280 ms.

---

## Configuração Avançada

Todas as constantes de comportamento ficam no topo de `visualizer.py`:

```python
FFT_SIZE = 2048       # resolução da análise
NUM_BARS = 120        # quantidade de bandas
SMOOTH = 0.82         # suavização temporal
GAIN_DEFAULT = 0.7    # ganho inicial
BEAT_THRESHOLD = 1.6  # sensibilidade do detector de beat
```

---

## Roadmap

- [x] **Fase 1** — Captura WASAPI + 4 modos de visualização + controles de ganho e frequência
- [ ] **Fase 2** — Shaders GLSL / efeitos GPU (Pygame + OpenGL)
- [ ] **Fase 3** — Sincronização com BPM / metadados de faixa
- [ ] **Fase 4** — Interface de configuração e temas

---

## Licença

© 2026 atempel — All Rights Reserved.
Este software é proprietário e confidencial. Nenhum uso, cópia ou distribuição é permitido sem autorização prévia por escrito. Veja o arquivo [LICENSE](LICENSE) para detalhes.
