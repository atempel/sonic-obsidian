# 022 — Importar presets `.milk`

**Fase:** 3 · **Status:** Em andamento · **Issue:** [#64](https://github.com/atempel/sonic-obsidian/issues/64) · **Depende de:** [021](021-migracao-butterchurn3.md)

## Problema
Hoje só tocam os presets que vêm com o app. A comunidade MilkDrop tem milhares de `.milk`, e o usuário quer trazer os dele.

## Proposta
Importar `.milk` escolhendo arquivos ou arrastando para a janela. A conversão roda no processo main (`src/main/milk.ts`, com os contornos de `hlsl-fix.ts` do spike 006): entra texto, sai preset 3.x com equações EEL (WASM) e shaders GLSL. O `.milk` é guardado como fonte e o convertido como cache (`docs/architecture.md` §5).

## Escopo
**P0**
- **Entrada:**
  - Configurações › Biblioteca › "Importar .milk…" (diálogo nativo, vários arquivos);
  - arrastar um ou mais `.milk` para a janela (só `.milk`, até 256 KB cada).
- **Armazenamento:** `userData/presets/imported/<id>.milk`, mais o cache convertido. O nome do preset é o nome do arquivo, sem renomear (créditos).
- **Na Biblioteca e na busca:** os importados aparecem com o rótulo "Importado" e podem ser favoritados, ocultados e postos em coleções como os outros. "Remover importado" apaga o arquivo.
- **Erros legíveis:** "Não deu para converter: shader warp, linha 12 — …". O preset anterior continua tocando. Num lote, o resumo diz quantos entraram e quais falharam.
- **Segurança:**
  - antes de carregar, remover `*_str`/`useJS` e rejeitar campos desconhecidos;
  - medir o primeiro quadro: se passar de um limite, voltar ao preset anterior (shader que trava a GPU).

**P1**
- Exportar `.milk` (devolve o arquivo-fonte).
- Pasta vigiada de presets próprios (design: Configurações › Biblioteca, "Fase 3").

## Fora de escopo
Estúdio (edição), MCP (`create_preset`), conversão reversa GLSL → HLSL.

## Critérios de aceite (Windows)
1. Arrastar 10 `.milk` que não estejam na biblioteca importa os que convertem e explica as falhas, sem travar o app. Os fixtures de `spike/006/milk/` já fazem parte do pacote oficial: arrastados como estão, os 10 são pulados ("já estavam na biblioteca"). Com cópias renomeadas, entram 8 e falham 2.
2. Os importados tocam, aparecem como "Importado" na Biblioteca e na busca, e continuam lá depois de reabrir o app.
3. Um `.milk` com `*_str` malicioso não executa nada.
4. Remover um importado apaga o arquivo e tira o preset da Biblioteca.

## Perguntas respondidas (2026-11-10)
- **Onde fica o botão:** está no protótipo `0fd0`, em Configurações › Biblioteca ("Importar presets .milk", "Escolher arquivos…"). A área de soltar fica no Palco (M21), com o rótulo "Importado" e o filtro "Importados" na Biblioteca. Diferenças em DIVERGENCIAS.
- **Nome repetido:** é pulado e avisado (decisão do usuário).
- **Limite:** 200 por vez, sem teto total (decisão do usuário).

## Referências
[006](006-spike-butterchurn3-milk.md), `docs/architecture.md` §5, DECISIONS 2026-11-09.
