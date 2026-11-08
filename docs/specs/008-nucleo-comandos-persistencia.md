# 008 — Núcleo de comandos e persistência

**Fase:** 2 · **Status:** Concluído (6/6 critérios verificados pelo usuário no Windows, build `da2c4ce`) · **Issue:** [#21](https://github.com/atempel/sonic-obsidian/issues/21) · **Bloqueia:** 009, 010, 011, 012

## Problema
As specs 002–005 funcionam, mas cada tecla mexe direto em módulos soltos (`presets.ts`, `rotation.ts`, `main.ts`), e nada sobrevive a fechar o app: ganho, rotação, intervalo e blend voltam ao padrão, e não existem favoritos, ocultos, recentes nem coleções. A interface v3 precisa de um estado único que vários clientes (teclado, faixa, Biblioteca, Configurações e, depois, o MCP) leiam e alterem pelo mesmo caminho.

## Proposta
Implementar o Core descrito em [architecture.md §1](../architecture.md#1-princípio-um-único-núcleo-de-comandos) e a persistência de [§7](../architecture.md#7-configurações-e-persistência), sem UI nova. As teclas atuais passam a chamar comandos. Esta spec também adiciona o Preact ao build (DECISIONS 2026-11-08, "UI do overlay"), para as specs 009–012 partirem de uma base pronta.

## Escopo
**P0**
- **AppState** único e serializável: preset atual, histórico (anterior/próximo), rotação (ligada, intervalo, ordem, coleção), blend automático e manual, ganho, limite de fps, favoritos, ocultos (por você / por desempenho), recentes, coleções, overlay aberto.
- **Comandos** nomeados e tipados, com validação da entrada, evento emitido e resultado: `preset.play`, `preset.next`, `preset.previous`, `preset.random`, `rotation.set`, `signal.set`, `blend.set`, `library.favorite`, `library.hide`, `library.restore`, `collection.create|rename|add|remove|reorder|play`, `settings.set`, `ui.open|close`. Cada chamada tem **origem** (`keyboard`, `ui`, `rotation`, `startup`).
- **Eventos** (`presetChanged`, `stateChanged`, `levelTick`, `silenceChanged`…) que a UI assina. O `levelTick` não passa pelo store: vai direto aos assinantes, sem disparar re-render.
- Teclas das specs 002–005 (`Espaço`, `←`/`→`, `R`, `[`/`]`, `+`/`−`/`0`, `F11`) refeitas como chamadas de comando, sem mudar o comportamento. `F` passa a alternar tela cheia, igual a `F11` (decisão do usuário na execução; o protótipo usa `F` para favoritar, ver DIVERGENCIAS). Favoritar fica como comando `library.favorite`, sem atalho global.
- **Persistência no main:** `settings.json` e `library.json` em `app.getPath('userData')`, lidos e escritos só pelo main. O preload expõe `window.so.settings.get/set` e `window.so.library.get/set` (API estreita, nunca `ipcRenderer` cru). Escrita com debounce (~500 ms) e atômica (arquivo temporário + rename). Versão do esquema no JSON (`version: 1`).
- **Abrir:** estado restaurado antes do primeiro preset, sem atrasar o "abre e reage em < 3 s". Preset ao abrir = último usado (padrão).
- **Arquivo corrompido ou ilegível:** o app abre com os padrões, renomeia o arquivo para `*.bak` e registra no console; não trava.
- Recentes: últimos 8 presets tocados, sem repetição.
- Preact adicionado com versão exata (JSX pelo `oxc` do Vite, sem `@preact/preset-vite`); um componente raiz vazio montado por cima do canvas, com `pointer-events: none` fora dos controles, para provar o build.

**P1**
- Evento `saved` emitido após cada escrita bem-sucedida (a 011 usa para o indicador "Salvo").
- Preset favorito, oculto ou em coleção é identificado pelo nome completo do preset (que já carrega o autor). Preset que sumiu do pacote é ignorado sem erro.

## Fora de escopo
Qualquer UI visível (009–012). MCP e origem `mcp:<cliente>` (Fase 4). Exportar/importar coleções (011). Segredos e `safeStorage` (Fase 3/4).

## Critérios de aceite
1. Todas as teclas da Fase 1 funcionam como antes no build Windows (navegar, aleatório, rotação, intervalo, ganho, tela cheia).
2. Mudar ganho, rotação e intervalo, fechar e abrir o app: os valores voltam, e o preset inicial é o último que estava tocando.
3. `F` alterna tela cheia como `F11`. (Favorito persistido em `library.json` é verificado pela estrela da faixa, na spec 009.)
4. Apagar o conteúdo de `settings.json` (deixar texto inválido) e abrir: o app abre normal com os padrões e existe um `settings.json.bak`.
5. O app continua abrindo e reagindo ao som em menos de 3 s.
6. `npm run typecheck` e o CI passam com o Preact no build; o fps em tela cheia não muda em relação à Fase 1 (o usuário confere com o HUD).

## Perguntas em aberto
- Um store próprio com eventos basta, ou o `@preact/signals` simplifica a ligação Core → componentes? Decidir na implementação e registrar em DECISIONS se adicionar.
- O histórico anterior/próximo também persiste? Proposta: não (só o preset atual).

## Referências
- [architecture.md §1, §2, §7](../architecture.md)
- Protótipo v3 `1794154301-3f85` ([SYNC.md](../design/v3/SYNC.md)): `Sonic Obsidian Configurações.html` (salvamento automático, sem botão Aplicar) e `so-v3-data.js` (recentes, coleções com intervalo próprio)
- Specs [002](002-presets-biblioteca-navegacao.md)–[005](005-sinal-entrada.md); DECISIONS 2026-11-08 "UI do overlay (Fase 2): Preact"
