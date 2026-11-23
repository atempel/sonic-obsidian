# Sonic Obsidian v3 — Idiomas (inglês e português)

> Sessão de design, 13/11/2026. **Status: aprovado para spec.** Decisões do usuário: o inglês é a fonte, o app segue o idioma do Windows, e o protótipo só ganha uma prova de layout. Hoje o app tem todos os textos em pt-BR escritos direto no código.

## Decisões
1. **O inglês é a fonte.** Todo texto nasce em inglês, e o pt-BR é uma tradução completa, escrita por gente (nunca por tradução automática sem revisão). Segue a regra do design system (*Microcopy*: "write the English string first, then its pt-BR pair").
2. **Na primeira abertura, o app segue o Windows.** Windows em qualquer variante de português (`pt-*`) abre em **Português (Brasil)**; qualquer outro idioma abre em **English**.
3. **Troca em Configurações › Geral › Idioma:** *Automático (do Windows)* · *English* · *Português (Brasil)*. A troca vale **na hora, sem reiniciar**: a interface toda redesenha, inclusive o painel `?` e a busca.
4. **O protótipo continua em pt-BR.** Um seletor PT/EN no Palco integrado (faixa, Ajustes rápidos, plaquinha de atualização) serve de prova de que os textos cabem nos dois idiomas.

## O que se traduz e o que não
| Traduz | Não traduz |
| --- | --- |
| Toda a interface: faixa, Biblioteca, busca, Ajustes, Configurações, Setup, Estúdio, toasts, estados, painel `?` | **Nome e autor dos presets** (são créditos, aparecem como vieram) |
| Nomes das teclas: "Espaço"/"Space", "Seta para a direita"/"Right arrow" (leitor de tela) | Teclas como símbolo (`Esc`, `Ctrl`, `F11`, `←`) |
| Nomes das coleções e perfis do app ("Calmo"/"Calm", "Festa"/"Party") | Nomes que a pessoa deu às coleções, perfis e cenas |
| Mensagens que o MCP faz aparecer na tela ("Claude Desktop tocou…") | O **log** (`sonic-obsidian.log`) e o HUD de diagnóstico, que ficam sempre em inglês, porque vão para issues no GitHub |
| A seção Sobre e os resumos das licenças | Os textos das licenças de terceiros (ficam no original) |
| | Os campos que o app preenche no formulário de bug (o template é em inglês) |
| | As descrições das ferramentas MCP, que ficam em inglês porque quem as lê é o modelo |

## Formatos (com `Intl`, nunca escritos à mão)
- **Números:** decimal com ponto em en (`2.7 s`, `1.5×`) e com vírgula em pt-BR (`2,7 s`, `1,5×`). As unidades levam espaço antes nos dois (`48 kHz`, `+4 dB`). O sinal de menos é o tipográfico (`−6 dB`) nos dois.
- **Datas e horas:** "Última verificação: hoje, 14:32" / "Last checked: today, 2:32 PM". Use `Intl.DateTimeFormat` e `Intl.RelativeTimeFormat`, seguindo o idioma do app, não o do Windows.
- **Plurais:** com `Intl.PluralRules`: "1 preset" / "8 presets", "1 coleção" / "3 coleções".
- **Ordem alfabética e busca:** `localeCompare` no idioma ativo, ignorando acentos na busca nos dois idiomas ("musica" acha "música").

## Regras para o desenho
- **O pt-BR é cerca de 20–30% mais longo.** Por isso o desenho é feito em pt-BR (o caso mais longo) e conferido em inglês. Nenhum botão com texto tem largura fixa. Segmentados de 300 px usam palavras curtas nos dois idiomas, e quando não cabem, quebram em grade (como Curva por frequência).
- **Os termos seguem o glossário do design system** (*Microcopy › Glossary*): Stage/Palco, Control strip/Faixa de controle, Library/Biblioteca, Quick settings/Ajustes rápidos, Clean mode/Modo limpo e assim por diante. Termos novos destas sessões:

| en | pt-BR |
| --- | --- |
| Profile | Perfil |
| Built-in (profile) · Default · Calm · Party · Study presets | Do app · Padrão · Calmo · Festa · Estudar presets |
| Contrast · Energy · Snap | Contraste · Energia · Nervo |
| Duration (of a transition) | Tempo |
| Notifications | Avisos |
| Expressiveness | Expressividade |
| Character | Caráter |
| Memory · Short · Long · Fixed · Live | Memória · Curta · Longa · Fixa · Viva |
| Frequency curve · Flat · Lows · Mids · Highs · Smile · Custom | Curva por frequência · Plana · Graves · Médios · Agudos · Sorriso · Personalizada |
| Normalize audio · Fine adjust | Normalizar áudio · Ajuste fino |
| Transitions · Hard cut | Transições · Corte seco |
| Simple · Full · Rack | Simples · Completo · Rack |
| Restart and update · Later · What's new | Reiniciar e atualizar · Depois · O que mudou |
| Report a problem · Suggest an idea · Ask a question | Relatar um problema · Sugerir uma ideia · Fazer uma pergunta |

- **Tom:** o mesmo nos dois idiomas, direto, sem exclamação, com toasts no passado ("Saved as My preset." / "Salvo como Meu preset."). O inglês não precisa ser tradução literal: precisa dizer a mesma coisa do jeito natural do inglês.

## No app (para a spec)
- **Sem dependência nova.** Catálogos tipados em TypeScript: `src/renderer/src/i18n/en.ts` (fonte, `as const`) e `pt-BR.ts` (tipo `Messages`, derivado do `en`). Uma chave faltando no pt-BR é **erro de typecheck**. Interpolação simples (`t('toast.addedTo', { name })`). O Intl cuida de plurais e formatos. Descartado: i18next/FormatJS, pesados demais para dois idiomas e só no app.
- **Estado:** `settings.language: 'auto' | 'en' | 'pt-BR'` (padrão `'auto'`). O main lê `app.getPreferredSystemLanguages()` e entrega o idioma resolvido ao renderer. A troca é um comando (`app.setLanguage`), sem reinício.
- **Processo main:** menus, diálogos nativos e o texto do instalador (NSIS tem pt-BR) também nos dois idiomas.
- **Chaves por lugar** (`strip.*`, `library.*`, `settings.capture.*`, `toast.*`, `state.*`), com nomes que descrevem o lugar e não o texto.
- **Migração:** extrair os textos atuais (pt-BR) para o `pt-BR.ts`, escrever o `en.ts` e trocar no código, tela por tela. Uma spec, vários PRs.
- **Verificação:**
  - o CI falha com chave faltando (typecheck) e lista as chaves sem uso;
  - um teste headless abre cada tela nos dois idiomas e procura texto cortado (`scrollWidth > clientWidth` em botões e rótulos).
- **Landing e README:** já estão em EN e pt-BR. O botão de download e os prints da landing mostram o app no idioma da página.
