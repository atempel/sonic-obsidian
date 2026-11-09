# 017 — Landing page no GitHub Pages

**Fase:** Abertura · **Status:** Feito (P0) — `site/` + `.github/workflows/pages.yml`; vai ao ar no merge, depois de ligar Settings › Pages › Source = GitHub Actions. P1 (404, notas da versão) pendente. Desvios de texto do protótipo em DECISIONS 2026-11-09 · **Issue:** [#41](https://github.com/atempel/sonic-obsidian/issues/41) · **Depende de:** [016](016-releases-abertura.md) para os links de download

## Problema
O projeto vai abrir para um público internacional que nunca ouviu falar dele. O README explica, mas não mostra: o produto é visual e precisa ser visto funcionando, com um botão de download que sempre aponta para a versão certa.

## Proposta
Portar o design da landing (canvas do Claude Design, versões EN e PT-BR) para um site estático em `site/`, publicado pelo GitHub Pages em `https://atempel.github.io/sonic-obsidian/` (inglês) e `/pt/` (português). O topo roda o Butterchurn de verdade com uma faixa sintetizada no navegador, como no protótipo.

## Estrutura
```
site/                         ← o que o GitHub Pages publica
├── index.html                ← EN
├── pt/index.html             ← PT-BR
├── assets/
│   ├── site.css              ← tokens e componentes (Design System)
│   ├── stage.js              ← palco: Butterchurn, faixa sintetizada, espelhos, console, portão de reduced-motion
│   ├── brand/                ← mark.svg + favicon (de docs/brand/)
│   └── og.png                ← imagem de compartilhamento
└── vendor/                   ← gerado por `npm run site:vendor`, no .gitignore
    ├── butterchurn.min.js
    ├── butterchurnPresets.min.js
    └── fonts/*.woff2 (+ licenças OFL)
scripts/site-vendor.mjs       ← copia de node_modules (butterchurn, butterchurn-presets, @fontsource/*)
.github/workflows/pages.yml
```
- Uma página por idioma; o `stage.js` é comum e lê os textos dinâmicos (Tocar/Parar demo, Copiar, mensagens) de um `<script type="application/json" id="i18n">` em cada página.
- **Links relativos** em tudo (`assets/…`, `../assets/…` no `/pt/`): o site mora em `/sonic-obsidian/`, não na raiz, e também precisa abrir servido localmente.
- Sem dependência nova: o vendor usa pacotes que o app já tem.

## Escopo
**P0**
- `site/index.html` (EN) e `site/pt/index.html` (PT-BR): HTML, CSS e JS puros, sem framework e sem etapa de build. Portar do canvas, removendo a camada do editor (`{{ }}`, `sc-if`, `sc-for`, `DCLogic`) para DOM simples.
- Todas as seções do protótipo: topo com demo ao vivo e console, faixa técnica, Como funciona, Modos (espelhos ao vivo), Biblioteca, Linhagem (com Winamp), Download, Perguntas, Créditos, rodapé com o coração no beat.
- **Aviso de fotossensibilidade** nos três lugares do protótipo (console, Perguntas aberta, Download) e o portão de `prefers-reduced-motion` (nada se mexe antes do play).
- **Tudo servido do próprio site**, nada de CDN: `butterchurn` e `butterchurn-presets` nas mesmas versões fixadas do app (copiados de `node_modules` por um script `npm run site:vendor`), fontes Space Grotesk e JetBrains Mono em `site/fonts/` (OFL, com licença junto). Carregar o motor só depois da primeira pintura.
- Ícones Lucide 0.460.0 inline e marca *The Core* de `docs/brand/`.
- Links de download: `https://github.com/atempel/sonic-obsidian/releases/latest/download/SonicObsidian-Setup.exe` e `…/SonicObsidian-win-x64.zip`. A versão exibida vem de `api.github.com/repos/atempel/sonic-obsidian/releases/latest` (`tag_name`, `published_at`, tamanho dos assets) com reserva "Latest release" se a API falhar.
- Idiomas: `<link rel="alternate" hreflang>` nas duas páginas; seletor de bandeiras leva de uma à outra.
- Metadados: `<title>`, description, Open Graph/Twitter com `site/og.png` (1200×630, exportado do card social do canvas), favicon SVG do *The Core*.
- `.github/workflows/pages.yml`: `actions/upload-pages-artifact` + `actions/deploy-pages` (versões fixadas), `on: push` em `main` com `paths: ['site/**']` e `workflow_dispatch`, e **guarda `if: ${{ !github.event.repository.private }}`** para não falhar enquanto o repo é privado.
- Responsivo nos três cortes do protótipo (1100 / 900 / 520 px).
- `.github/workflows/build-windows.yml`: `paths-ignore: ['site/**', 'docs/**']` nos gatilhos de `push` e `pull_request`, para mudança na landing não gastar o runner Windows.
- `.gitignore`: `site/vendor/`.
- Teste antes da abertura: um job no CI que roda `site:vendor` e sobe `site/` pronto como artifact (`sonic-obsidian-site-<sha>`), para o usuário abrir e testar a demo com som no Windows, igual ao ciclo do app.

**P1**
- 404 com a marca.
- Página de notas da versão gerada da release (ou só link para o GitHub).

## Fora de escopo
Domínio próprio, analytics, Cloudflare (ver DECISIONS), blog, mais idiomas.

## Critérios de aceite
1. Abrindo `site/index.html` servido localmente (`npx serve site`), o topo mostra um preset, "Tocar demo"/"Play demo" faz som e o visual reage; anterior/próximo/aleatório/AUTO funcionam.
2. Com "reduzir movimento" ligado no sistema, nada se mexe até o play.
3. Nenhuma requisição sai para outro domínio além de `api.github.com` (conferir na aba Network).
4. Em 390 px de largura não há rolagem horizontal; o menu vira faixa rolável; o console fica abaixo do título.
5. O botão de download baixa o instalador da última release publicada (depois da 016).
6. O link EN ↔ PT funciona nos dois sentidos e cada página tem `lang` correto.
7. Com o repo ainda privado, um push em `site/**` não quebra o CI (o job de Pages é pulado).

## Perguntas em aberto
- A demo usa o pacote base de presets (~650 KB) ou um recorte menor para carregar mais rápido no celular?
- Mostrar prints reais do app (de `docs/media/`) além dos espelhos ao vivo?

## Referências
- **Protótipo espelhado em [`docs/design/landing/`](../design/landing/README.md)** (versão `1794165992-cb8e`, ver SYNC.md): `Main.dc.html` = EN, `MainPT.dc.html` = PT-BR, `SocialCard.dc.html` = imagem de compartilhamento. Canvas original: https://claude.ai/artifact/77UgsmUowPneiFTfduxF2L.
- Design System "Sonic Obsidian" — https://claude.ai/artifact/PsbByhFqsyarVehitA8rPZ (tokens, componentes, voz: "o áudio que você escolhe tocar").
- `docs/brand/`, `docs/media/`, `THIRD_PARTY_NOTICES.md`.
- DECISIONS 2026-11-08 — "Abertura: GitHub Pages e releases por tag".
