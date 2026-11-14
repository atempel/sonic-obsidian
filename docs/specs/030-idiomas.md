# 030 — Idiomas: inglês e português (Brasil)

**Fase:** Abertura · **Status:** Em andamento (base + migração 1 no 1º PR; migração 2, Ajustes rápidos, no 2º) · **Issue:** [#101](https://github.com/atempel/sonic-obsidian/issues/101) · **Personas:** todas (o app público precisa falar inglês); Nostálgico do Winamp e Anfitrião de Ambiente no Brasil (pt-BR)

## Problema
Todos os textos do app estão em pt-BR, escritos direto nos componentes, sem nenhuma estrutura de tradução. O repositório e a landing já são bilíngues, e o design system manda escrever o texto primeiro em inglês ("English first, pt-BR as a full translation"). Quem baixa o app fora do Brasil hoje recebe tudo em português.

## Proposta (decisões do usuário, 2026-11-13)
1. **O inglês é a fonte.** Todo texto nasce em inglês, e o pt-BR é uma tradução completa, revisada por gente.
2. **Na primeira abertura, o app segue o Windows.** Qualquer `pt-*` abre em Português (Brasil); qualquer outro idioma abre em English.
3. **Troca em Configurações › Geral › Idioma:** Automático (do Windows) · English · Português (Brasil). A troca vale **na hora, sem reiniciar**.
4. **Sem dependência nova.** Catálogos tipados em TypeScript; descartados i18next e FormatJS (pesados demais para dois idiomas).

## Escopo
**P0 — base**
- `src/renderer/src/i18n/en.ts` (fonte, `as const`) e `pt-BR.ts`, com o tipo derivado do `en`. **Uma chave faltando no pt-BR é erro de typecheck.**
- `t(key, params?)` com interpolação simples e um hook/sinal Preact que redesenha a interface quando o idioma muda.
- Chaves por lugar, descrevendo onde o texto fica e não o texto em si: `strip.*`, `library.*`, `palette.*`, `quick.*`, `settings.<seção>.*`, `toast.*`, `state.*`, `shortcuts.*`, `setup.*`, `studio.*`, `update.*`, `feedback.*`.
- Formatos sempre pelo `Intl`, no idioma **do app**:
  - números: `2.7 s` / `2,7 s`, com espaço antes da unidade e o menos tipográfico `−`;
  - datas e horas relativas: "Last checked: today, 2:32 PM" / "Última verificação: hoje, 14:32";
  - plurais: `Intl.PluralRules`.
  - Trocar os `toLocaleString('pt-BR', …)` que estão fixos no código.
- Busca e ordenação com `localeCompare` no idioma ativo, ignorando acentos.
- Estado: `settings.language: 'auto' | 'en' | 'pt-BR'` (padrão `'auto'`). O main resolve `'auto'` com `app.getPreferredSystemLanguages()` e envia ao renderer. Comando `app.setLanguage`.
- Configurações › Geral: a linha **Idioma** no topo. A ajuda em Automático diz "Agora: Português (Brasil), o idioma do Windows."; nos outros, "Muda na hora, sem reiniciar.".

**P0 — migração** (vários PRs, uma tela por vez): extrair os textos atuais para o `pt-BR.ts`, escrever o `en.ts` e trocar no código. Ordem sugerida:
1. faixa, toasts e estados;
2. Ajustes rápidos;
3. Biblioteca e busca;
4. Configurações;
5. painel `?`;
6. Setup e diagnóstico;
7. Estúdio.

**O que não se traduz**
- Nome e autor dos presets (créditos).
- Nomes dados pela pessoa a coleções, perfis e cenas. Os nomes que vêm com o app se traduzem.
- O log (`sonic-obsidian.log`) e o HUD de diagnóstico, que ficam sempre em inglês porque vão para issues.
- As descrições das ferramentas MCP (inglês).
- O texto das licenças de terceiros.

**P1**
- Processo main: menus, diálogos nativos e o instalador NSIS em pt-BR.
- Nomes de tecla para leitor de tela ("Space" / "Espaço").

## Glossário (fonte: design system › Microcopy, mais os termos novos)
Stage/Palco · Control strip/Faixa de controle · Library/Biblioteca · Quick search/Busca rápida · Quick settings/Ajustes rápidos · Settings/Configurações · Clean mode/Modo limpo · **Notifications/Avisos** (decisão do usuário, 2026-11-13: não "Notices") · Profile/Perfil · Built-in/Do app · Default · Calm · Party · Study presets/Padrão · Calmo · Festa · Estudar presets · Expressiveness/Expressividade · Character: Contrast · Energy · Snap/Caráter: Contraste · Energia · Nervo · Memory: Short · Long · Fixed · Live/Memória: Curta · Longa · Fixa · Viva · Frequency curve: Flat · Lows · Mids · Highs · Smile · Custom/Curva por frequência: Plana · Graves · Médios · Agudos · Sorriso · Personalizada · Normalize audio · Fine adjust/Normalizar áudio · Ajuste fino · Transitions · Hard cut · Duration/Transições · Corte seco · Tempo · Restart and update · Later · What's new/Reiniciar e atualizar · Depois · O que mudou · Report a problem · Suggest an idea · Ask a question/Relatar um problema · Sugerir uma ideia · Fazer uma pergunta.

O tom é o mesmo nos dois idiomas: sentence case, toasts no passado, sem exclamação. O inglês precisa soar natural, não literal.

## Fora de escopo
Outros idiomas; tradução da landing e do README (já são bilíngues); tradução automática; idioma por janela.

## Critérios de aceite (Windows)
1. Com o Windows em português, o app abre em pt-BR; com o Windows em inglês (ou em outro idioma), abre em English.
2. Trocar o idioma em Configurações › Geral muda **na hora** a faixa, os Ajustes, a Biblioteca, a busca, o painel `?`, os toasts e as próprias Configurações, sem reiniciar. A escolha volta na próxima abertura.
3. Em English, nenhum texto em português aparece nas telas migradas, e o contrário em pt-BR. A exceção são os nomes de presets e os nomes dados pela pessoa.
4. Números e horas seguem o idioma do app (`2.7 s` / `2,7 s`).
5. O log continua em inglês nos dois idiomas.
6. CI: uma chave faltando no pt-BR quebra o typecheck. Um teste headless abre cada tela migrada nos dois idiomas e falha se algum botão ou rótulo estiver cortado (`scrollWidth > clientWidth`).

## Referências
- Design: Claude Design, artefato `UYomSYJHhGRN9bqUPc21qF`, versão `1794607492-78f0`. Em `docs/v3-idiomas.md`, ficam a especificação completa e o glossário. A página **Palco integrado** tem o seletor de protótipo "Idioma: PT · EN", com a faixa, os Ajustes rápidos e a plaquinha de atualização traduzidos (prova de que cabem). Em **Configurações › Geral** está a linha Idioma. O espelho em `docs/design/v3/` chega com o próximo `sincronizar-design`.
- Design system › Microcopy (glossário). "Notices" virou "Notifications" na versão `1794607489-dc67`.
