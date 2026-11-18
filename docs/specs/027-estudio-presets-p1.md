# 027 — Estúdio de presets (P1): parâmetros, shaders, versões e exportar

**Fase:** 3 · **Status:** ✅ Publicada na v0.8.0 (2026-11-18; testada pelo usuário no bloco #141, com o quadro inteiro na prévia corrigido no #143) — fatias 1 (abas e Básico), 2 (Ondas e Formas), 3 (Histórico e desfazer) e 4 (Comparar com o original, também o "Comparar" da gaveta de versões) feitas em 2026-11-16; fatias 5 (Shaders), 6 (Código `.milk`), 7 (Exportar `.milk`), 8 (Novo preset) e 9 (Renomear) em 2026-11-17; 10 (Verificador próprio) e 11 (Extras da prévia: Testar troca e Capturar quadro) em 2026-11-18. Perguntas fechadas pela rodada 2026-11-16 (`agent-decided`); uma fatia por PR · **Issue:** [#75](https://github.com/atempel/sonic-obsidian/issues/75) · **Personas:** Criador de Presets, Artista Independente ([personas](../research/mercado/personas.md)) · **Depende de:** [026](026-estudio-presets-p0.md)

## Problema
Com a 026, o usuário edita as equações e salva. Falta o resto do que o desenho do Estúdio promete: mexer nos parâmetros sem escrever código, editar ondas, formas e shaders, voltar a uma versão anterior e levar o preset para fora do app.

## Proposta
Completar o Estúdio do protótipo `42d3` sobre a base da 026, em fatias que se entregam separadas (cada uma já utilizável).

## Escopo
**P1, em ordem de entrega**
1. **Abas e Básico** (`Ctrl+1`–`6`, setas, `Home`/`End`; ARIA de abas): Básico, Equações, Ondas, Formas, Shaders, Código.
   - Básico: sliders e switches dos `baseVals` do protótipo (Movimento, Rastro, Onda principal com forma e cor, Efeitos), cada um com o nome do parâmetro em `.num`. Mexer num slider atualiza o preset na hora e é um erro impossível (só valores válidos).
2. **Ondas e Formas:** 4 slots de cada, com "Ativa", `samples`/`sep`/`spectrum` (ondas), `sides`/`rad`/`ang`/`textured` (formas) e os blocos `per_frame`/`per_point`. Slot desligado fica só leitura.
3. **Histórico e desfazer:**
   - cada salvamento vira uma versão restaurável (`userData/presets/mine/<id>/v0001.json`…), com hora e resumo ("decay 0.960 → 0.975");
   - gaveta "Versões" com "Restaurar" e "Comparar" (a prévia da versão ao lado do atual);
   - `Ctrl+Z` / `Ctrl+Shift+Z` dentro do editor, além do desfazer nativo do campo;
   - limite de versões por preset (sugestão: 50; as mais antigas saem).
4. **Comparar com o original:** switch "Comparar com o original" divide a prévia em duas. Só liga com folga de GPU: abaixo de 50 fps medidos, o app desliga e avisa.
5. **Shaders (`warp`, `comp`):**
   - preset do pacote ou importado de `.milk`: editar o GLSL já convertido, com o mesmo ciclo de validação (o link do shader vem do motor, com a mensagem do compilador);
   - nota: "HLSL do MilkDrop é convertido para GLSL ao salvar" só vale para o que vem de `.milk`; não há caminho de volta para HLSL.
6. **Código `.milk`:** só para presets que têm fonte `.milk` (criados do zero ou importados). Editar aqui atualiza os controles, como no protótipo. Para cópias de presets do pacote, a aba mostra o JSON em leitura.
7. **Exportar `.milk`:** devolve a fonte quando há uma. Cópia de preset do pacote só exporta equações e parâmetros, **sem os shaders**, com aviso claro antes. Alternativa: exportar o JSON do Butterchurn 3.
8. **Novo preset:** "Novo preset" na Biblioteca e no Estúdio, a partir de um modelo mínimo (um círculo reagindo ao `bass`).
9. **Renomear** um preset "meu": favoritos, coleções e recentes acompanham o nome novo.
10. **Verificador próprio** (avisos amarelos, não bloqueiam): "variável desconhecida `bas_att`. Você quis dizer `bass_att`?" com botão "Corrigir"; função desconhecida; chaves de shader que não fecham. Se a 026 ficou sem linha de erro, entra aqui.
11. **Extras da prévia:** "Testar troca" (mostra a assinatura de nome e crédito como no Palco) e "Capturar quadro" (PNG, `toBlob` do canvas).

**P2 / Fase 4 (fora daqui):** banner "Editado por IA" com "Ver mudanças" e "Desfazer" (exige o MCP, versões com origem `mcp:<cliente>`); `validate_preset`, `create_preset` e `update_preset` usam o mesmo pipeline.

## Fora de escopo
Conversão GLSL → HLSL. Botão de IA dentro do Estúdio (a IA é a do usuário, via MCP). Compartilhar ou publicar presets. Editor de shader com destaque de sintaxe completo (um campo simples com números de linha basta).

## Critérios de aceite (Windows, app rodando)
1. Arrastar o slider "Zoom" muda o visual enquanto arrasta e atualiza o código gerado. Os 18 parâmetros do protótipo respondem.
2. Ligar a "Onda 2" e escrever um `per_point` válido faz a onda aparecer. Um erro nele mostra bloco, mensagem e mantém a versão anterior.
3. Salvar três vezes gera três versões. "Restaurar" a primeira volta o visual dela. "Comparar" mostra as duas lado a lado.
4. Com "Comparar com o original" ligado por 5 min, o fps não cai abaixo de 50, ou o app desliga a comparação e avisa.
5. Num preset de `.milk` importado, editar `comp` e errar um `float2` mostra a mensagem do compilador GLSL, com a prévia na última versão válida.
6. Exportar um "meu" preset criado de um `.milk` gera um arquivo que o app importa de volta e toca igual. Exportar a cópia de um preset do pacote avisa que os shaders não vão.
7. "Novo preset" abre um modelo que toca e reage ao áudio. Renomear mantém os favoritos e as coleções.
8. `bas_att` em `per_frame` mostra um aviso (não erro) com "Corrigir → `bass_att`", e o preset continua compilando.
9. "Capturar quadro" salva um PNG do quadro atual. "Testar troca" mostra a assinatura de nome e crédito.

## Perguntas em aberto
Decididas pela rodada em 2026-11-16 (`agent-decided`, revisar no teste do bloco; DECISIONS 2026-11-16):
- ~~Cópia de preset do pacote sem `.milk`: exportar sem shaders?~~ **Sim**, com aviso antes de salvar ("Os shaders não vão no `.milk`: este preset veio do pacote, que só tem a versão convertida"). A alternativa "Exportar JSON do Butterchurn" fica no mesmo menu.
- ~~Versões: arquivo inteiro ou delta?~~ **Arquivo inteiro** por versão (`v0001.json`…), limite de **50** por preset (as mais antigas saem). No pior caso, 50 × 256 KB ≈ 12,5 MB por preset.
- ~~Histórico no `library.json` ou na pasta do preset?~~ **Só na pasta** (`userData/presets/mine/<id>/`, ao lado de `meta.json`/`preset.json`); o `library.json` não cresce. O `preset.prev.json` da 026 vira a primeira versão na migração.
- ~~Ordem das fatias~~ **Mantida** (1 → 11). Cada fatia é um PR que não fecha a issue, como na 030; o último fecha.

## Referências
- Protótipo `1794281099-42d3` (`docs/design/v3/SYNC.md`), página `Sonic Obsidian Estúdio.html`: abas, Básico, slots de Ondas e Formas, gaveta de Versões, "Comparar com o original", "Testar troca", "Capturar quadro", "Exportar .milk", estados **Normal**, **Com erro** (avisos) e **Editado por IA** (Fase 4).
- [Brief v3 — Estúdio](../design/v3/docs/v3-fontes-butterchurn-estudio-mcp.md) §3 e [architecture.md §5](../architecture.md#5-presets-do-usuário-e-estúdio).
- [026](026-estudio-presets-p0.md), [022](022-importar-milk.md), PRD (Fase 3: "editar cópia, novo, compilação ao vivo, erros por linha, versões, exportar").
