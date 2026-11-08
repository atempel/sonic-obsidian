# Pesquisa: Visualizadores de Áudio — Do Winamp à Web Moderna

> Documento de pesquisa gerado em março de 2026 como base para o projeto de visualizador de áudio.

---

## 1. História e contexto: os visualizadores do Winamp

### O que eram

Os visualizadores do Winamp eram plugins que geravam imagens, cores e texturas em tempo real reagindo ao áudio em reprodução. O player lançado em 1997 tornou-se o ambiente mais rico para esse tipo de arte generativa da época.

### Os dois grandes plugins

#### AVS — Advanced Visualization Studio

O plugin original e mais abrangente. Permitia ao usuário construir um número ilimitado de visualizações customizadas a partir de uma biblioteca de efeitos em expansão.

Recursos principais:
- Renderização em janela ou tela cheia
- Customização de presets
- Empilhamento de módulos
- Componentes programáveis como "SuperScope" e "Dynamic Movement"
- Scripts compilados para código nativo em tempo de execução
- Suporte a plugins visuais do Sonique

O AVS foi a porta de entrada da demoscene para o grande público: uma subcultura dedicada a empurrar os limites da arte computacional e gráficos em tempo real.

#### MilkDrop

Criado por Ryan Geiss, o MilkDrop estreou em 2001 como sucessor do Geiss Plugin (1998). A diferença central: foi projetado desde o início com suporte a hardware GPU.

Linha do tempo:
- **1998** — Geiss Plugin, usando CPU com assembly otimizado
- **2001** — MilkDrop v1.0, com aceleração por GPU via DirectX
- **2001–2003** — 12 versões lançadas
- **2005** — Código-fonte da v1.04 liberado sob licença BSD
- **2007** — MilkDrop 2.0, com suporte a pixel shaders (DirectX 9, Shader Model 3+)
- **2008** — MilkDrop 2.0d, última versão oficial
- **2023** — MilkDrop3 (fork comunitário, versão 3.2)

Como funciona o MilkDrop:
- Usa um sistema de interpolação para transitar entre presets gradualmente
- Beat detection integrado dispara efeitos psicodélicos
- Presets são salvos no formato `.milk` e distribuídos por comunidades online
- Pode ser alimentado por áudio ao vivo (microfone ou line-in), não apenas arquivos
- Portado para Kodi, VLC, foobar2000, iTunes e outros players

#### projectM

Implementação open-source do MilkDrop usando OpenGL em C++ (2003), licença GNU LGPL. Compatível com os presets `.milk` do MilkDrop original.

---

## 2. Como funcionavam tecnicamente

O núcleo técnico dos visualizadores clássicos se apoia em dois pilares:

### FFT — Fast Fourier Transform

A transformada rápida de Fourier converte o sinal de áudio do domínio do tempo (forma de onda) para o domínio da frequência (espectro). O resultado é um array onde cada posição representa a amplitude de uma faixa de frequência:

- Posições baixas → graves (bass drums, baixo)
- Posições altas → agudos (pratos, sibilâncias)

Esse array é atualizado ~60 vezes por segundo e alimenta as visualizações.

### Shaders de GPU

MilkDrop 2 usou pixel shaders (HLSL/DirectX 9) para renderizar visuais complexos inteiramente na GPU. O pipeline básico:

1. Captura dados de áudio (FFT)
2. Passa o array de frequências como uniforms para o shader
3. O fragment shader calcula a cor de cada pixel com base nas frequências
4. O resultado é renderizado na tela a 60fps

---

## 3. Equivalentes modernos na web

### Web Audio API

A API nativa dos navegadores modernos para processamento de áudio. O componente central para visualizadores é o `AnalyserNode`:

```javascript
const ctx = new AudioContext();
const analyser = ctx.createAnalyser();
analyser.fftSize = 2048;

const bufferLength = analyser.frequencyBinCount; // frequencyBinCount = fftSize / 2
const dataArray = new Uint8Array(bufferLength);

function draw() {
  requestAnimationFrame(draw);
  analyser.getByteFrequencyData(dataArray); // popula o array com dados do espectro
  // renderizar aqui...
}
```

Métodos disponíveis no AnalyserNode:
- `getByteFrequencyData()` — espectro de frequências (0–255 por bin)
- `getFloatFrequencyData()` — espectro em dB (maior precisão)
- `getByteTimeDomainData()` — forma de onda bruta (osciloscópio)
- `getFloatTimeDomainData()` — forma de onda em ponto flutuante

### Canvas 2D

API de renderização 2D do browser. Mais simples, não precisa de conhecimento de OpenGL. Ideal para:
- Barras de frequência clássicas
- Osciloscópio / waveform
- Espectrograma
- Visualizações circulares

Padrão de animação:

```javascript
function draw() {
  requestAnimationFrame(draw);
  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
  analyser.getByteFrequencyData(dataArray);
  // desenhar barras, linhas, formas...
}
```

### WebGL + Fragment Shaders

O equivalente moderno dos pixel shaders do MilkDrop. Permite efeitos avançados rodando inteiramente na GPU:
- Noise de Perlin
- Julia Sets
- Warp fields
- Bloom e motion blur
- Campos de partículas

Pipeline básico com WebGL:

```javascript
// 1. Capturar dados de áudio
const spectrum = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(spectrum);

// 2. Passar para o shader como uniform/texture
gl.uniform1fv(spectrumLocation, spectrum);

// 3. O fragment shader usa os dados de frequência para calcular cores
// GLSL:
// uniform float u_spectrum[512];
// void main() {
//   float bass = u_spectrum[2];
//   gl_FragColor = vec4(bass / 255.0, ...);
// }
```

### Three.js

Biblioteca que abstrai WebGL. Permite construir cenas 3D com objetos que reagem ao áudio (esferas pulsantes, partículas, geometrias deformadas) sem precisar escrever GLSL puro.

---

## 4. Captura de áudio — o problema central

### Fontes de áudio disponíveis no browser

| Fonte | API | Suporte | Limitações |
|---|---|---|---|
| Microfone | `getUserMedia({ audio: true })` | Universal | Capta ruído ambiente, não o áudio do computador |
| Áudio de aba do browser | `getDisplayMedia({ audio: true })` | Chrome / Edge | Usuário precisa escolher qual aba compartilhar |
| Áudio do sistema (Windows) | `getDisplayMedia` + opção de sistema | Chrome no Windows | Disponibilidade depende do OS |
| Arquivo local | `<input type="file">` + FileReader | Universal | Sem áudio externo ao vivo |
| Stream de URL | `<audio src="...">` | Universal | Requer CORS liberado na origem |

### Comportamento por navegador (estado atual — início de 2026)

**Chrome / Edge (Chromium):** Suporte completo ao `getDisplayMedia` com captura de áudio de aba. No Windows, pode oferecer captura de áudio do sistema inteiro. Melhor ambiente para esse projeto.

**Firefox:** Implementa `getDisplayMedia` mas **ignora completamente a parte de áudio** — sem erro, sem aviso. Captura apenas vídeo.

**Safari:** Situação semelhante ao Firefox para captura de áudio de sistema.

**Mobile:** Nenhum navegador mobile suporta captura de áudio de sistema via `getDisplayMedia`.

### Código para captura de áudio de aba (Chrome/Edge)

```javascript
// Solicita compartilhamento de tela + áudio da aba
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,  // necessário pela spec, mesmo que não use o vídeo
  audio: {
    systemAudio: 'include'  // tenta incluir áudio do sistema (Windows)
  }
});

// Extrair apenas a track de áudio
const audioStream = new MediaStream(stream.getAudioTracks());

// Conectar ao Web Audio API
const ctx = new AudioContext();
const source = ctx.createMediaStreamSource(audioStream);
const analyser = ctx.createAnalyser();
source.connect(analyser);
```

### Estratégia de fallback recomendada

```
1. Tentar getDisplayMedia (Chrome/Edge)
   → Sucesso: visualizador com áudio de aba em tempo real

2. Fallback: getUserMedia (microfone)
   → Funciona em todos os browsers
   → Indicar ao usuário que é captura de microfone

3. Fallback: arquivo local
   → Funciona em todos os browsers
   → Usuário carrega um arquivo de áudio
```

---

## 5. Plano de projeto em fases

### Fase 1 — Fundação web (entregável imediato)

Stack: HTML puro + Web Audio API + Canvas 2D

Funcionalidades:
- Captura de microfone (`getUserMedia`)
- Barras de frequência clássicas (estilo Winamp)
- Osciloscópio / waveform
- Controles básicos (sensibilidade, cores, modo de visualização)
- Funciona em qualquer navegador moderno

**Por que começar aqui:** Não precisa de setup. Pode ser construído como um único arquivo HTML e testado imediatamente no browser.

### Fase 2 — Entrada de áudio real

Adiciona à fase 1:
- Captura via `getDisplayMedia` (áudio de aba ou sistema)
- Detecção de beat manual (threshold no bass bin do FFT)
- Múltiplos modos visuais selecionáveis
- Fallback inteligente com detecção de browser

### Fase 3 — Efeitos avançados (estilo MilkDrop)

Stack adicional: WebGL, Three.js ou react-three-fiber

Funcionalidades:
- Fragment shaders reativos ao áudio
- Sistema de partículas
- Efeitos: bloom, motion blur, warp, noise de Perlin
- Presets intercambiáveis (como os `.milk` do MilkDrop)
- Transições suaves entre presets

### Fase 4 — App desktop (opcional)

Stack: Electron ou Tauri

Vantagens sobre o browser:
- Captura de áudio do sistema sem restrições (via API nativa do OS)
- Janela dedicada fullscreen sem chrome do browser
- Acesso a APIs de áudio do OS (WASAPI no Windows, CoreAudio no macOS)
- Sem limitações de CORS ou sandbox

---

## 6. Recursos e referências

### Documentação oficial

- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AnalyserNode — MDN](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [getDisplayMedia — MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)
- [Visualizations with Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)

### Projetos open-source de referência

- **projectM** — implementação open-source do MilkDrop (C++/OpenGL)
- **MilkDrop 2** — código-fonte original no SourceForge (BSD license)
- [awesome-audio-visualization](https://github.com/willianjusten/awesome-audio-visualization) — lista curada de experimentos

### Leituras técnicas recomendadas

- [Build a Music Visualizer with Web Audio API](https://noisehack.com/build-music-visualizer-web-audio-api/) — inclui WebGL shaders
- [Music Visualization with Shaders, Web Audio API and Perlin Noise](https://scribbler.live/2024/02/19/Music-Visualization-Shaders-Audio-API-Perlin-Noise.html)
- [Write an audio visualizer from scratch with vanilla JS — LogRocket](https://blog.logrocket.com/audio-visualizer-from-scratch-javascript/)

---

## 7. Decisões de design pendentes

Para avançar no projeto, as seguintes decisões precisam ser tomadas:

- **Ambiente alvo:** somente web, ou Electron/desktop também?
- **Ponto de entrada do áudio:** microfone, aba do browser, arquivo local, ou todos com fallback?
- **Estilo visual prioritário:** barras clássicas, partículas, shaders psicodélicos, ou múltiplos modos?
- **Framework:** vanilla JS + Canvas, ou Three.js para efeitos 3D desde o início?
- **Presets:** sistema de presets intercambiáveis desde a fase 1, ou adicionado depois?

---

*Documento gerado com base em pesquisa de fontes públicas (MDN, Wikipedia, fóruns técnicos, artigos de desenvolvimento). Informações sobre suporte a browsers devem ser verificadas no [caniuse.com](https://caniuse.com) para confirmar o estado atual.*
