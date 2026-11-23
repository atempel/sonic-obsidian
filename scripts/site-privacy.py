#!/usr/bin/env python3
"""Gera as páginas de privacidade da landing a partir do PRIVACY.md (inglês e pt-BR).

Uso: python3 scripts/site-privacy.py  (precisa do pacote `markdown`).
Saída: site/privacy/index.html e site/pt/privacidade/index.html. Rodar de novo sempre que o
PRIVACY.md mudar; as páginas geradas vão para o git (o GitHub Pages publica a pasta site/).
"""
import html
import re
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://atempel.github.io/sonic-obsidian/'
src = (ROOT / 'PRIVACY.md').read_text(encoding='utf-8')
en_md, pt_md = src.split('\n---\n', 1)

PAGES = {
    'en': dict(md=en_md, out=ROOT / 'site/privacy/index.html', up='../', lang='en', url=SITE + 'privacy/',
               alt=SITE + 'pt/privacidade/', title='Privacy Policy — Sonic Obsidian', home='Back to Sonic Obsidian',
               other='Português', other_href='../pt/privacidade/', other_lang='pt-BR',
               desc='Sonic Obsidian has no account, no telemetry and no analytics. Audio is analyzed in memory and never saved or sent.'),
    'pt': dict(md=pt_md, out=ROOT / 'site/pt/privacidade/index.html', up='../../', lang='pt-BR', url=SITE + 'pt/privacidade/',
               alt=SITE + 'privacy/', title='Política de privacidade — Sonic Obsidian', home='Voltar ao Sonic Obsidian',
               other='English', other_href='../../privacy/', other_lang='en',
               desc='O Sonic Obsidian não tem conta, telemetria nem estatísticas de uso. O áudio é analisado em memória e nunca é salvo nem enviado.'),
}


def body(md_text: str, lang: str) -> str:
    # Tira a linha de troca de idioma do topo (a página tem a própria) e ajusta links relativos do repo.
    md_text = re.sub(r' · \[(English|Português \(Brasil\))\]\(#[^)]*\)', '', md_text)
    md_text = md_text.replace('# Política de privacidade (Português, Brasil)', '# Política de privacidade')
    md_text = md_text.replace('](SECURITY.md)', '](https://github.com/atempel/sonic-obsidian/blob/main/SECURITY.md)')
    return markdown.markdown(md_text.strip(), extensions=['extra'])


for key, p in PAGES.items():
    content = body(p['md'], p['lang'])
    en_url = PAGES['en']['url']
    pt_url = PAGES['pt']['url']
    page = f'''<!doctype html>
<html lang="{p['lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(p['title'])}</title>
<meta name="description" content="{html.escape(p['desc'])}">
<meta name="theme-color" content="#080809">
<link rel="canonical" href="{p['url']}">
<link rel="alternate" hreflang="en" href="{en_url}">
<link rel="alternate" hreflang="pt-BR" href="{pt_url}">
<link rel="alternate" hreflang="x-default" href="{en_url}">
<link rel="icon" href="{p['up']}assets/brand/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{p['up']}assets/site.css">
<style>
.so-doc{{max-width:760px;margin:0 auto;padding:48px 24px 96px;font-size:16px;line-height:1.7;color:#C9C9D8}}
.so-doc h1{{font-size:40px;line-height:1.1;letter-spacing:-.02em;color:#EEEEF5;margin:40px 0 12px;font-weight:600}}
.so-doc h2{{font-size:22px;color:#EEEEF5;margin:40px 0 8px;font-weight:600}}
.so-doc strong{{color:#EEEEF5;font-weight:600}}
.so-doc code{{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:14px;color:#EEEEF5;background:#14141B;border:1px solid #2A2A3A;border-radius:3px;padding:1px 5px}}
.so-doc ul{{padding-left:22px}} .so-doc li{{margin:6px 0}}
.so-doc nav{{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:14px}}
</style>
</head>
<body>
<main class="so so-doc" style="font-family: 'Space Grotesk', sans-serif">
<nav aria-label="Site"><a href="{p['up']}">{html.escape(p['home'])}</a><a href="{p['other_href']}" hreflang="{p['other_lang']}">{p['other']}</a></nav>
{content}
</main>
</body>
</html>
'''
    p['out'].parent.mkdir(parents=True, exist_ok=True)
    p['out'].write_text(page, encoding='utf-8')
    print('ok', p['out'].relative_to(ROOT))
