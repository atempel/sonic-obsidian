# Landing page — espelho do protótipo

Referência de desenho para a [spec 017](../../specs/017-landing-github-pages.md). O desenho vive num canvas do Claude Design; esta pasta é a cópia versionada dele (versão em [SYNC.md](SYNC.md)). Somente leitura.

## Pranchetas
| Arquivo | O quê |
|---|---|
| `prototype/Main.dc.html` | Landing em inglês, interativa (demo ao vivo com Butterchurn), responsiva em 1100/900/520 px |
| `prototype/MainPT.dc.html` | A mesma página em português (pt-BR) |
| `prototype/SocialCard.dc.html` | Imagem de compartilhamento 1200×630 (vira `site/assets/og.png`) |
| `prototype/canvas.json` | Índice do canvas (posições e títulos das pranchetas) |

## Como ler um `.dc.html`
É o formato do editor de design, não HTML final. Na conversão para `site/`:
- `{{ nome }}` é um valor calculado em `renderVals()` no bloco `<script type="text/x-dc">` no fim do arquivo; `onClick="{{ fn }}"` é o handler.
- `<sc-if value="{{ x }}">` é um condicional; `<sc-for list="{{ xs }}" as="item">` é uma repetição (a Biblioteca de presets).
- `ref="{{ setX }}"` guarda o elemento (canvas do palco, medidor, espelhos, coração e núcleo da marca que pulsam no beat).
- `<helmet>` traz fontes e o CSS das classes (`so-*`) e dos cortes responsivos.
- `data-props` declara os ajustes do editor (cor de destaque, segundos da rotação, escala de render); no site, viram constantes.
- `/_blob/09416e9a…` e `/_blob/ff0d97d3…` são o `butterchurn.min.js` (2.6.7) e o `butterchurnPresets.min.js` (2.4.7) que o canvas carrega; no site, vêm de `site/vendor/` (ver spec 017).
- Toda a lógica do palco (Butterchurn, faixa sintetizada com Web Audio, espelhos, medidor, portão de `prefers-reduced-motion`) está na classe `Component` e pode ser portada quase direto para `site/assets/stage.js`.

## Como atualizar
Quando o canvas mudar: copiar os `project/*.dc.html` e o `project/canvas.json` para `prototype/`, atualizar versão e manifesto no SYNC.md e citar a versão no PR. Se o site se afastar do desenho de propósito, registrar o porquê no PR.

## Ver também
- Design System "Sonic Obsidian" (tokens, componentes, marca, voz): https://claude.ai/artifact/PsbByhFqsyarVehitA8rPZ · marca em [`docs/brand/`](../../brand/)
