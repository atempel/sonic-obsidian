# Brief comum — Sonic Obsidian v3 (propostas de interface)

Produto: app desktop Windows (Electron) que captura o áudio do sistema e renderiza presets do MilkDrop via Butterchurn (centenas de presets, cada um com autor). A UI é uma camada de controle por cima do visual. Uso pessoal; idioma da UI: português do Brasil.

## Arquivos base (já existem em project/, NÃO edite)
- `so-v3-base.css` — tokens (`--bg-00..04`, `--line-1..3`, `--text-1..3`, `--violet`, `--cyan`, `--beat`, `--ok`, `--warn`, fontes, raios, easing) e primitivas: `.ibtn` (botão de ícone 36px, `aria-pressed`), `.btn`, `.btn-primary`, `.btn-ghost`, `kbd`, `input[type=range]` (use `style="--fill:NN%"` e atualize no input), `.switch` (label > input checkbox + span.track), `.meter` (medidor), `.proto` (barra de controle do protótipo, fora do produto), `.num` (mono tabular). Leia o arquivo antes de começar.
- `so-v3-data.js` — `window.SO_DATA` com `presets[]` ({id, full, author, title, hue, style, heavy, fav, plays}), `collections[]` ({id,name,ids,interval}), `recents[]`, `totalLibrary`, `capture` ({source, device, rate}).
- `so-v3-viz.js` — `SOViz.create(canvas)` → `{setPreset(preset, blendMs), setSilent(bool), level(), peak(), onBeat(cb)}`; `SOViz.meter(el, n)` → função `update(level, peak)` (chame a cada frame num requestAnimationFrame).

## Cabeçalho obrigatório da página
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>…</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="so-v3-base.css">
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="so-v3-data.js"></script>
<script src="so-v3-viz.js"></script>
</head>
```
Um único arquivo HTML: CSS próprio num `<style>`, JS vanilla num `<script>` no fim do body. Sem React, sem Babel, sem outros CDNs. Ícones: `<i data-lucide="skip-forward" class="ico"></i>` e `lucide.createIcons()` depois de cada render que insere ícones.

## Princípios decididos (respeitar)
- "Acentos são luz, não tinta": violeta = marca e seleção; ciano = valor vivo (nível, BPM, fps); rosa `--beat` só para beat/clip. Nada de áreas grandes coloridas.
- Só o visual reage ao áudio continuamente; a UI reage só a eventos discretos (beat, troca de preset).
- Nenhuma animação pesada na UI; transições 120–250ms com `--ease-out`.
- Um clique ou uma tecla para qualquer ação frequente. Ajustes aplicam ao vivo (sem botão "Aplicar").
- O nome do preset vem sempre com o autor ("por Geiss"); nunca esconder ou renomear o crédito.
- Sem splash, sem loading. Só modo escuro.
- Movimento assinatura (obrigatório em toda proposta): na troca de preset, um cartão de crédito tipográfico (título grande peso 600 com `text-wrap: balance`, "por Autor" abaixo em `--text-2`) e uma linha de 2px violeta que percorre 0→100% durante o blend de 2 s; o cartão some depois de ~4 s com fade.

## Craft floor (vai ser revisado item a item)
- Todo elemento clicável é `<button>`, `<a href>` ou input real com `<label>`. Nunca `onclick` em div/span. Botão só-ícone tem `aria-label` e `title` com o atalho.
- Contraste: texto só com `--text-1/2/3` (todos ≥4.5:1 nos fundos escuros). Nada de cinza translúcido sobre o visual: texto sobre o visual fica num scrim (gradiente escuro) ou numa superfície `--bg-01/02` sólida.
- Texto mínimo 12px; corpo 14px. Rótulos em sentence case, sem CAIXA ALTA com tracking largo, sem "eyebrow" acima de título.
- Mono (`.num`) só para números, tempos, atalhos. Nunca para descrição.
- Proibido: border-left/right colorido >1px em itens selecionados (use fundo `--violet-soft` + texto/ícone violeta), texto em gradiente, glow/halo sem offset, glifos Unicode como ícone, emoji, cards aninhados, número gigante isolado como enfeite, glassmorphism decorativo.
- Sombras só `--shadow-pop` em superfícies flutuantes.
- Estados desenhados: hover, foco (`:focus-visible` já é global), pressionado, desabilitado, vazio, silêncio, erro.
- Copy: controles dizem a ação ("Próximo preset", "Favoritar"); erros dizem problema + saída.
- Responsivo: nada quebra entre 900px e 1920px de largura; abaixo de 900px pode empilhar.
- `prefers-reduced-motion` já é tratado no base.

## Barra do protótipo
Use `.proto` (canto superior esquerdo) para alternar estados de demonstração (ex.: Normal / Silêncio / …). Primeiro item: `<b>Protótipo</b>`. Botões com `aria-pressed`.

## Entrega
Escreva só o arquivo pedido. Ao final, rode `node -e` para checar que o JS do `<script>` final faz parse (extraia o conteúdo e use `new Function(src)`), e devolva em até 10 linhas: o que a página tem, atalhos, e qualquer item do craft floor que não conseguiu cumprir. Não publique nada, não abra navegador.
