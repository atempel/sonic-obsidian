# 038 — Perfis de ajustes (salvar e aplicar combinações, `Alt+1…9`)

**Fase:** 2 (interface) · **Status:** pronta · **Issue:** [#110](https://github.com/atempel/sonic-obsidian/issues/110) · **Milestone:** v0.12.0 · **Personas:** DJ de Festa (troca de clima no meio da noite com uma tecla), Nostálgico do Winamp (quer "o jeito calmo" sem lembrar seis controles), Criador de presets (o perfil "Estudar presets" para olhar um visual sem rotação)

## Problema
Mudar o clima do visual hoje pede mexer em até seis controles dos Ajustes rápidos (Expressividade, Caráter, Memória, duas transições, rotação). Quem alterna entre "festa" e "fundo calmo" refaz tudo à mão toda vez. O usuário aprovou na sessão de design de 10/11/2026 salvar essas combinações como **Perfis** (não "presets", que já são as visualizações; não "Cenas", que guardam um preset específico).

## Proposta
Seguir `docs/design/v3/docs/v3-perfis.md` e as páginas Palco integrado (`#pf`, barra fixa dos Ajustes rápidos) e Configurações (seção `perfis`).

**Modelo.** Um perfil = `{ id, name, builtIn, groups, values }`. Cinco grupos, na ordem fixa:
| Grupo (`id`) | Valores (campos de `Settings`) | Marcado ao salvar |
|---|---|---|
| Expressividade (`expression`) | `expression.level`, `.curve` (Caráter), `.adaptation` (Memória) | sim |
| Transições (`blend`) | `blend.manual`, `blend.auto` (tipo e tempo) | sim |
| Rotação (`rotation`) | `rotation.enabled`, `.intervalSeconds`, `.onBeat` | sim |
| Sinal (`signal`) | `gainDb`, `autoGain` | não |
| Texto sobre o visual (`text`) | `overlayText.presetName`, `.trackTitle`, `.toasts` | não |

Aplicar um perfil passa cada grupo dele pelos comandos que já existem (os mesmos dos Ajustes rápidos e do teclado) e deixa os outros grupos como estão. Valores lidos de arquivo passam pela sanitização de `state.ts` (campo inválido → valor do perfil Padrão naquele campo).

**Perfis do app** (não se apagam nem se renomeiam; duplicam; nomes traduzidos pela spec 030), todos com Expressividade, Transições e Rotação:
- **Padrão:** os padrões do app (`defaultSettings()`): nível 0, Energia, Curta; manual Aleatório 1 s, automática Aleatório 2,7 s; rotação ligada a 30 s, sem beat.
- **Calmo:** −2, Contraste, Longa; Crossfade 5 s nas duas; rotação a 60 s.
- **Festa:** +2, Nervo, Fixa; manual Corte seco, automática Radial 1 s; rotação a 15 s.
- **Estudar presets:** 0, Energia, Curta; Crossfade 1 s nas duas; rotação desligada (intervalo 30 s guardado).

**Persistência.** `userData/profiles.json` (`JsonStore`, versão 1) guarda só os perfis do usuário, na ordem de criação. Em `settings.json`: `profile: { active: string | null, startup: 'last' | <id> }`. Arquivo ilegível → `.bak`, como os outros.

**"Modificado".** O perfil ativo fica modificado quando algum valor dos grupos **dele** difere do salvo (comparação dos valores sanitizados; tempo de transição com uma casa). Mudar um grupo fora do perfil não marca nada.

### Ajustes rápidos (barra fixa abaixo do cabeçalho, não rola com a lista)
- Rótulo "Perfil" + seletor com o nome do ativo e, se modificado, um ponto. Embaixo, uma linha: o **resumo** do perfil ("+2 · Nervo · Fixa · corte seco · 15 s") ou, modificado, "Modificado" + **Desfazer** (volta aos valores do perfil) + **Atualizar** (só em perfil do usuário).
- Menu do seletor (`role="menu"`, itens `menuitemradio`): perfis do app, separador, os do usuário, separador, "Salvar como novo perfil…". Cada item mostra o `Alt+N` dele (componente `Kbd`). Setas, `Home`/`End`, `Esc` fecha e devolve o foco.
- **Atualizar** abre um painel de confirmação com a lista do que muda ("Memória: Fixa → Longa") e "Cancelar" · "Atualizar perfil".
- **Salvar como novo perfil…** abre um formulário: nome (até 40 caracteres, vazio → "Perfil N", o primeiro N livre), os cinco grupos marcáveis (padrões da tabela; nenhum marcado → "Salvar" desativado), "Grupos fora do perfil ficam como estão quando ele é aplicado." Enter salva; o novo vira o ativo. Nome repetido ganha " (2)".
- Toasts (respeitam Configurações › Avisos): "Perfil: Festa", "Valores de “Festa” restaurados.", "Perfil “X” atualizado.", "Salvo como perfil “X”."
- `Esc` dentro da barra fecha só o menu/painel aberto, não os Ajustes. Teclas do app não disparam com o foco no campo de nome.

### Teclado e busca
- `Alt+1`…`Alt+9` aplicam os nove primeiros perfis na ordem do menu (pelo `e.code` `Digit1…9`, para funcionar em qualquer layout); sem perfil na posição, nada acontece. Não disparam com o foco num campo de texto. Entram na lista única `src/renderer/src/ui/shortcuts.ts` (grupo "Perfis"), portanto no `?` e em Configurações › Atalhos.
- Busca rápida, grupo Comandos: "Perfil: <nome>" para cada perfil (com o `Alt+N`) e "Salvar como novo perfil…" (abre os Ajustes rápidos com o formulário).

### Configurações › Perfis (seção nova, ícone `bookmark`, depois de Visual)
- Lista dos perfis com o resumo de uma linha e o rótulo "do app" nos do app; o ativo marcado. Menu "…": Aplicar, Renomear (campo no lugar, Enter/saída confirma, `Esc` cancela), Duplicar ("<nome> (cópia)"), Exportar `.json`, Apagar (desativado nos do app, com `title`). Apagar mostra "Perfil “X” apagado. Desfazer" na nota da seção; apagar o ativo deixa nenhum ativo (seletor mostra "Nenhum").
- "Importar perfil…": diálogo do main (`.json`, até 64 KB). Formato: `{ app: "sonic-obsidian", version: 1, profile: { name, groups, values } }`. Grupo desconhecido, repetido ou valor fora do lugar → "Arquivo não é um perfil do Sonic Obsidian." e nada muda. Nome repetido ganha " (2)".
- Exportar: `exportFile` do main (como o Estúdio), nome `sonic-obsidian-perfil-<slug>.json`; perfis do app exportam também.
- "Perfil ao abrir": "Último usado" (padrão: os ajustes continuam como ficaram, como hoje) ou um perfil (aplicado ao abrir, antes do primeiro preset). Perfil apagado → volta a "Último usado".

Textos só em `i18n/en.ts` + `pt-BR.ts`; erros do main em inglês com código (`[not-profile]`, `[too-big]`), traduzidos em `main-error.ts`.

## Escopo
**P0** — modelo, quatro perfis do app, `profiles.json`, barra dos Ajustes rápidos (seletor, resumo, modificado, Desfazer, Atualizar, Salvar como novo), `Alt+1…9`, comandos na busca, teste headless `038-perfis`.
**P1** — Configurações › Perfis (lista, menu "…", importar/exportar, "Perfil ao abrir"), no mesmo teste.

A rodada que implementar pode abrir P0 e P1 em PRs separados.

## Fora de escopo
- Curva por frequência (EQ de 16 bandas, #112): entra no grupo Expressividade quando existir; perfis sem ela ficam com a curva plana.
- Ordem e coleção da rotação, compassos e adiantamento do beat, atraso do visual, Modo limpo (`T`): ficam fora dos perfis (dependem do conteúdo ou do equipamento).
- Reordenar perfis; perfil por coleção, Cena com perfil, ferramentas MCP (`list_profiles`…): P2 do design, depois.

## Critérios de aceite
1. **Headless — aplicar:** com Festa (`Alt+3`), os controles dos Ajustes rápidos mostram Expressividade +2, Nervo, Fixa; transição manual Corte seco, automática Radial 1 s; rotação 15 s; o HUD confirma a Expressividade que chegou ao motor. Ganho e texto sobre o visual não mudam. Toast "Perfil: Festa".
2. **Headless — modificado:** depois de Festa, mudar a Memória marca o ponto e mostra Desfazer (sem Atualizar, perfil do app); Desfazer volta a Fixa e o ponto some. Mudar o ganho (fora do perfil) não marca.
3. **Headless — salvar e atualizar:** "Salvar como novo perfil…" com o nome vazio cria "Perfil 1" com três grupos e o torna ativo; mudar o nível mostra Atualizar; a confirmação lista "Expressividade: … → …"; confirmar grava em `profiles.json` (lido de volta pelo `window.so` simulado) e o ponto some.
4. **Headless — teclado e busca:** `Alt+5` aplica o primeiro perfil do usuário; `Alt+9` sem perfil não faz nada; `Alt+1` com o foco no campo de nome não aplica; a busca acha "Perfil: Calmo" com `Alt 2` e o comando aplica. O `?` lista "Aplicar perfil 1 a 9".
5. **Headless — barra fixa:** rolar a lista dos Ajustes até o fim deixa a barra de Perfil visível no topo.
6. **Headless — Configurações (P1):** renomear, duplicar, apagar e desfazer; perfil do app sem Apagar nem Renomear; exportar gera o JSON do formato acima (pelo `exportFile` simulado); importar esse JSON cria "<nome> (2)"; importar um arquivo com grupo desconhecido mostra o erro e não cria nada; "Perfil ao abrir: Calmo" aplica Calmo na reabertura da página.
7. `npm run test:ui` passa (o `030-idiomas` sem chave sobrando nem texto cortado nos dois idiomas).
8. **Windows (testar no bloco):** com música, `Alt+3` (Festa) muda o clima na hora (troca seca no `→`, rotação a cada 15 s); `Alt+2` (Calmo) suaviza; salvar um perfil seu, fechar e abrir o app: ele continua no menu e no `Alt+5`.

## Perguntas em aberto
Nenhuma do usuário. Decididas pela rodada (`agent-decided`, DECISIONS 2026-11-22): Padrão = os padrões do app (automática Aleatório 2,7 s, não Crossfade como no protótipo); grupo Rotação sem ordem/coleção; Sinal = ganho + Normalizar; Texto sem Modo limpo; curva por frequência fora até a #112; Configurações › Perfis depois de Visual.

## Referências
- `docs/design/v3/docs/v3-perfis.md` (aprovado em 10/11/2026); protótipo `Sonic Obsidian Palco integrado.html` (`#pf`, `pfNormG`, `pfDiffs`) e `Sonic Obsidian Configurações.html` (seção `perfis`, `pfParse`), espelho na versão `1794603894-598c`. O artefato está em `1794680346-fb12` (sync pendente, #124), com `v3-perfis.md` idêntico (sha `18a907887e82`).
- Specs 011 (Ajustes rápidos), 013 (transições), 014 (texto sobre o visual), 015/028 (Expressividade, Normalizar), 024 (troca no beat), 030 (idiomas), 037 (cabeçalho dos Ajustes, mesmo milestone).
