# Exploração: Efeitos Visuais Avançados para o Visualizador de Áudio

> Documento vivo — atualizado ao longo das sessões de exploração.
> Foco: efeitos estilo MilkDrop/AVS (Winamp) implementados em Python com Pygame + ModernGL/GLSL.
> Iniciado em março de 2026.

---

## Contexto

O projeto já tem implementados os modos mais simples (Fase 1 do plano):

- **Barras de frequência** — barras verticais clássicas, estilo Winamp
- **Osciloscópio / waveform** — linha contínua da forma de onda
- **Barras radiais circulares** — barras saindo do centro em 360°
- **Trail/decay** — efeito de persistência de imagem via fade

O objetivo desta exploração é ir muito além disso, atingindo o nível de complexidade e beleza do **MilkDrop** — que criava visuais psicodélicos, fluidos, hipnóticos e totalmente reativos ao áudio usando pixel shaders na GPU.

---

## O que tornava o MilkDrop especial

O MilkDrop não apenas desenhava formas — ele **transformava o espaço da tela a cada frame**. Os ingredientes centrais eram:

1. **Feedback visual** — o frame anterior era relido e deformado para gerar o próximo
2. **Warp fields** — campos de distorção que curvavam, rotacionavam e pulsavam a imagem
3. **Reatividade ao áudio** — cada banda de frequência controlava algum parâmetro visual
4. **Efeitos de pós-processamento** — bloom, motion blur, saturação, vinheta
5. **Geometria procedural** — formas geradas matematicamente, não desenhadas manualmente

Com Python + ModernGL, todos esses efeitos são alcançáveis via GLSL fragment shaders.

---

## Categorias de efeitos a explorar

### Categoria 1 — Feedback Loop (base do MilkDrop)

**O que é:** a cada frame, a imagem anterior é lida como textura, ligeiramente distorcida/escalada/rotacionada, e redesenhada como fundo do próximo frame. O que sobra é o acúmulo visual de frames anteriores que vai esmaecendo e se transformando.

**Por que importa:** é o coração do visual "fluido" do MilkDrop. Sem feedback, os efeitos são instantâneos e sem memória visual. Com feedback, eles se acumulam, fluem e criam trails orgânicos.

**Como implementar em Python:**
- Criar dois framebuffers (ping-pong): `fbo_a` e `fbo_b`
- A cada frame: renderizar no `fbo_b` usando `fbo_a` como textura de entrada
- Alternar entre eles a cada frame
- O shader lê a textura do frame anterior, aplica um warp, e passa para frente

**Status:** a explorar

---

### Categoria 2 — Warp / Displacement Fields

**O que é:** ao invés de renderizar pixels "no lugar certo", cada pixel é deslocado por um vetor baseado em alguma função (senoidal, ruído de Perlin, polar). O resultado é uma distorção fluida e contínua da imagem.

**Variações:**

- **Warp radial** — distorção que puxa pixels em direção ao centro ou os afasta, reativo ao bass
- **Warp rotacional** — a imagem "gira" lentamente, com velocidade controlada pelo mid
- **Warp senoidal** — ondas se propagam pela tela como se a superfície fosse água
- **Zoom pulse** — a imagem escala levemente a cada beat (cria sensação de "respiração")
- **Turbulência (Perlin noise)** — campo de vetores baseado em ruído, cria aparência orgânica e caótica

**Como implementar em Python:**

No fragment shader, ao invés de ler `texture(prev_frame, uv)`, lê-se `texture(prev_frame, uv + warp_vector)`.

```glsl
// Exemplo: warp senoidal reativo ao bass
vec2 warp = vec2(
    sin(uv.y * 8.0 + time * 2.0) * bass * 0.03,
    cos(uv.x * 8.0 + time * 1.5) * bass * 0.02
);
vec4 prev = texture(prev_frame, uv + warp);
```

**Status:** a explorar

---

### Categoria 3 — Noise Fields (Ruído de Perlin / Simplex)

**O que é:** o ruído de Perlin é uma função matemática que gera valores "suaves" e orgânicos — diferente do ruído aleatório puro. É usado para criar campos vetoriais que parecem fluidos, nuvens, fogo, terrenos.

**Aplicações visuais:**

- Fundo animado que flui como névoa
- Campo de distorção para o warp
- Variação orgânica de cor em gradientes
- "Lava lamp" — bolhas que sobem e se fundem de forma orgânica

**GLSL nativo não tem Perlin noise** — é necessário implementar a função no shader ou usar uma textura de ruído pré-gerada. A biblioteca `opensimplex` em Python pode gerar essa textura, que é passada ao shader como uniform.

**Alternativa mais simples:** Hash-based noise implementado diretamente no GLSL (sem dependência externa):

```glsl
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep
    return mix(mix(hash(i),          hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
```

**Status:** a explorar

---

### Categoria 4 — Sistemas de Partículas

**O que é:** milhares de pontos (partículas) com posição, velocidade e cor que se movem segundo regras físicas. Reatividade ao áudio: o beat pode "explodir" as partículas, as frequências podem guiar seu movimento.

**Variações:**

- **Campo de estrelas** — partículas que se aproximam do centro quando há bass forte
- **Explosão de beat** — ao detectar beat, partículas são expulsas do centro radialmente
- **Atrator caótico** — partículas seguem trajetórias de atratores de Lorenz ou Clifford
- **Fluido de partículas** — partículas que respondem a um campo de velocidade baseado no FFT

**Abordagens em Python:**

- **CPU (NumPy):** arrays de posição/velocidade atualizados via operações vetoriais. Viável para até ~10k partículas a 60fps.
- **GPU (Transform Feedback / Compute Shaders):** estado das partículas armazenado em buffer de GPU. Viável para milhões de partículas. Requer OpenGL 4.3+ / ModernGL avançado.

**Status:** a explorar

---

### Categoria 5 — Matemática Visual (Fractais e Campos Complexos)

**O que é:** funções matemáticas que geram geometrias infinitamente complexas, moduladas pelo áudio.

**Variações:**

- **Julia Set reativo** — o parâmetro `c` do fractal de Julia é controlado pelo bass/treble; muda a forma do fractal a cada beat
- **Mandelbrot zoom** — zoom progressivo em regiões do Mandelbrot, velocidade controlada pelo mid
- **Campo de fase complexo** — visualização de `z → z² + c` como campo de cores (domain coloring)
- **Lyapunov fractal** — fractal baseado em estabilidade de sistemas dinâmicos, menos conhecido, visualmente distinto

**Julia Set no shader:**

```glsl
// Julia Set com parâmetro reativo ao áudio
vec2 c = vec2(
    -0.7 + bass * 0.3 * cos(time),
     0.27 + treble * 0.2 * sin(time * 0.7)
);
vec2 z = (uv - 0.5) * 3.0;

int iter = 0;
for (int i = 0; i < 128; i++) {
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    if (dot(z, z) > 4.0) { iter = i; break; }
}
float t = float(iter) / 128.0;
fragColor = vec4(hsv2rgb(vec3(t + time * 0.1, 0.8, t > 0.0 ? 1.0 : 0.0)), 1.0);
```

**Status:** a explorar

---

### Categoria 6 — Bloom e Pós-Processamento

**O que é:** efeitos aplicados sobre a imagem já renderizada para dar qualidade cinematográfica. O bloom faz com que regiões brilhantes "vazem" luz para os pixels adjacentes, criando o efeito de brilho intenso.

**Efeitos de pós-processamento:**

- **Bloom** — blur gaussiano aplicado às regiões mais brilhantes, somado ao original
- **Chromatic aberration** — deslocamento sutil de canais RGB para simular lente barata; dá aparência de efeito analógico
- **Vignette** — escurecimento das bordas da tela; foca a atenção no centro
- **Color grading** — ajuste de curvas de cor: saturação, contraste, temperatura
- **Motion blur** — acumulação de frames anteriores com peso decrescente

**Implementação:** requer múltiplos passes de render (multi-pass rendering). Cada efeito é um shader adicional que processa a saída do anterior.

**Status:** a explorar

---

### Categoria 7 — Geometria 3D Procedural

**O que é:** formas 3D geradas matematicamente, projetadas em 2D. Diferentes de sprites ou meshes fixos — a geometria é criada e deformada em tempo real.

**Variações:**

- **Esfera pulsante** — esfera com vértices deslocados pela amplitude de cada frequência
- **Torus de frequências** — toro onde cada anel representa uma banda de frequência
- **Ribbon / fita helicoidal** — fita que se dobra e gira no espaço 3D, reagindo ao áudio
- **Raymarching** — renderização de geometrias 3D inteiramente no fragment shader, sem vértices. Permite formas impossíveis de definir em meshes (metaballs, fractais 3D como Mandelbulb).

**Raymarching básico:**

O shader avança um "raio" pixel a pixel até colidir com uma superfície definida por uma função de distância (SDF — Signed Distance Function). Sem vértices, sem meshes — geometria pura em matemática.

**Status:** a explorar

---

### Categoria 8 — Tunnel / Voo no Espaço

**O que é:** efeito clássico da demoscene. A tela cria a ilusão de um corredor infinito pelo qual o espectador está voando. Muito presente nos presets do MilkDrop.

**Variações:**

- **Túnel de frequências** — as paredes do túnel são coloridas pelas frequências do FFT
- **Starfield warp** — estrelas que se aproximam rapidamente (efeito warp speed)
- **Vortex** — espiral que puxa para o centro, velocidade reativa ao bass

**Implementação no shader:**

Converte coordenadas UV para coordenadas polares, usa o ângulo para indexar o FFT e o raio para criar profundidade:

```glsl
vec2 center = uv - 0.5;
float angle = atan(center.y, center.x) / (2.0 * PI) + 0.5; // [0, 1]
float radius = length(center);

// Indexa o FFT pelo ângulo (frequência = posição angular)
float freq = texture(spectrum, angle).r;

// Cria profundidade pelo raio
float depth = fract(1.0 / radius - time * speed);
```

**Status:** a explorar

---

## Mapa de complexidade de implementação

| Efeito | Complexidade | Requer GPU shader | Wow factor |
|---|---|---|---|
| Feedback loop | Média | Sim (ping-pong FBO) | ⭐⭐⭐⭐⭐ |
| Warp senoidal | Baixa | Sim | ⭐⭐⭐ |
| Warp com Perlin noise | Média | Sim | ⭐⭐⭐⭐ |
| Zoom pulse no beat | Baixa | Sim | ⭐⭐⭐ |
| Partículas (CPU/NumPy) | Média | Não | ⭐⭐⭐ |
| Partículas (GPU) | Alta | Sim (compute) | ⭐⭐⭐⭐⭐ |
| Julia Set | Baixa | Sim | ⭐⭐⭐⭐ |
| Bloom | Média | Sim (multi-pass) | ⭐⭐⭐⭐ |
| Tunnel | Baixa | Sim | ⭐⭐⭐⭐ |
| Raymarching 3D | Alta | Sim | ⭐⭐⭐⭐⭐ |

---

## Ordem sugerida de exploração

1. **Feedback loop + zoom pulse** — base para quase tudo. Sozinho já é impressionante.
2. **Warp senoidal reativo ao bass** — adicionar sobre o feedback.
3. **Tunnel / vortex** — efeito de impacto alto com baixa complexidade.
4. **Julia Set** — fractal reativo ao áudio, completamente diferente dos anteriores.
5. **Bloom e vignette** — polir o visual de qualquer efeito já implementado.
6. **Partículas (NumPy)** — adicionar camada de pontos sobre os shaders.
7. **Perlin noise warp** — campo de distorção orgânico.
8. **Raymarching** — o mais complexo, mas o resultado é espetacular.

---

## Notas técnicas: ping-pong framebuffer (ModernGL)

Para qualquer efeito de feedback, é necessário o padrão "ping-pong":

```python
import moderngl as mgl

ctx = mgl.create_context()

# Cria dois framebuffers com textura associada
def make_fbo(ctx, width, height):
    texture = ctx.texture((width, height), 4, dtype='f1')
    fbo = ctx.framebuffer(color_attachments=[texture])
    return fbo, texture

fbo_a, tex_a = make_fbo(ctx, 1280, 720)
fbo_b, tex_b = make_fbo(ctx, 1280, 720)

# No loop de render:
# 1. Renderizar em fbo_b usando tex_a como entrada
# 2. Mostrar fbo_b na tela
# 3. Trocar: fbo_a, fbo_b = fbo_b, fbo_a / tex_a, tex_b = tex_b, tex_a
```

---

## Referências externas

- **Shadertoy** (shadertoy.com) — biblioteca enorme de shaders GLSL. Muitos presets estilo MilkDrop. Fonte excelente de inspiração e código adaptável.
- **The Book of Shaders** (thebookofshaders.com) — tutorial interativo de GLSL, inclui capítulos sobre noise, patterns e domain warping.
- **Inigo Quilez** (iquilezles.org) — autor de técnicas fundamentais de raymarching, SDF e domain coloring. Artigos técnicos detalhados.
- **projectM no GitHub** — código-fonte C++/OpenGL do clone open-source do MilkDrop. Referência para entender como os presets `.milk` são interpretados.
- **GLSL Noise Algorithms** (github.com/stegu/webgl-noise) — implementações de referência de Perlin/Simplex noise em GLSL.

---

*Documento em construção — atualizado conforme as sessões de exploração avançam.*
