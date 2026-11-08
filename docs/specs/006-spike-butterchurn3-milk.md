# 006 — Spike: Butterchurn 3 (WASM) e pipeline `.milk`

**Fase:** 3 (fundação) · **Status:** A fazer · **Issue:** (criar ao iniciar) · **Bloqueia:** importar `.milk`, Estúdio, `create_preset` do MCP

## Problema
Presets do usuário e da IA (MCP) exigem carregar presets que não vieram do pacote oficial. No Butterchurn 2.6.7, que o app usa hoje, as equações de cada preset viram JavaScript via `new Function` dentro do renderer: quem fornece o preset executa código arbitrário no app. A versão 3.0 (beta) compila as equações EEL para WebAssembly isolado. Antes de construir qualquer coisa em cima, é preciso saber se o 3.x publicado no npm aguenta o uso real e se conseguimos produzir presets nesse formato a partir de um `.milk`.

## Proposta
Em branch descartável, trocar o motor para o 3.x com `onlyUseWASM: true` e montar o caminho mínimo `.milk` → preset 3.x → tela, sem interface.

## Escopo
**P0**
- Instalar `butterchurn@3.0.0-beta.5` e `butterchurn-presets@3.0.0-beta.4` (versões exatas). Adaptar `visualizer.ts` ao 3.x (o canvas de saída usa contexto 2D; o WebGL roda num `OffscreenCanvas` interno).
- `createVisualizer(..., { onlyUseWASM: true })`. Confirmar que **todos** os presets do pacote 3.x carregam só pelo caminho WASM (contar quantos falham e por quê).
- CSP do renderer sem `'unsafe-eval'`, só com `'wasm-unsafe-eval'`. O app tem que funcionar assim.
- Prova de isolamento: um preset de teste com campos `*_str` maliciosos (ex.: `document.title = 'pwned'`) **não executa** com `onlyUseWASM` + sanitização (remover `*_str` e `useJS`).
- Conversão `.milk` → preset 3.x, rodando localmente (no renderer ou num worker): separar seções (`milkdrop-preset-utils`), manter as equações como EEL bruto (`*_eel`), converter os shaders HLSL `warp`/`comp` para GLSL (`hlslparser-js`, como faz o `milkdrop-preset-converter`). Testar com 10 `.milk` do próprio repositório `butterchurn-presets` (`presets/milkdrop/`) e comparar visualmente com a versão convertida oficial.
- Medir fps de 5 presets pesados em 2.6.7 e em 3.x, mesmo monitor, mesmo build.

**P1**
- Erros de compilação legíveis: equação EEL inválida e shader GLSL que não compila → mensagem com seção e linha, e o preset anterior continua tocando.
- `visualizer.toDataURL()` funcionando (base do `capture_frame` do MCP).

## Fora de escopo
Interface de importação, Estúdio, armazenamento, MCP.

## Critérios de aceite
1. O build Windows do CI roda com Butterchurn 3.x, `onlyUseWASM: true` e CSP sem `'unsafe-eval'`, e o visual reage ao áudio do sistema como no spike 001.
2. Pelo menos 90% dos presets do pacote 3.x carregam; a lista dos que falham fica registrada.
3. O preset malicioso de teste não altera nada fora do canvas.
4. Pelo menos 8 dos 10 `.milk` testados convertem e tocam; diferenças visuais anotadas.
5. Fps do 3.x igual ou melhor (±10%) que o 2.6.7 nos 5 presets medidos.

## Perguntas a responder (registrar em DECISIONS.md)
- Migrar o app para o 3.x? (fecha a "Proposta" de 2026-11-08)
- O conversor roda bem no renderer ou precisa de um worker/utility process?
- Qual o tamanho do bundle com `hlslparser-js` (Emscripten)?
- Licença e créditos dos pacotes novos (`eel-wasm`, `hlslparser-js`, `milkdrop-preset-utils`) — atualizar `THIRD_PARTY_NOTICES.md`.

## Referências
- Butterchurn master: `src/visualizer.js` (`loadWASMPreset`, `loadJSPreset`), opção `onlyUseWASM`
- [jberg/milkdrop-preset-converter](https://github.com/jberg/milkdrop-preset-converter), [jberg/butterchurn-presets](https://github.com/jberg/butterchurn-presets)
- [docs/architecture.md](../architecture.md#5-presets-do-usuário-e-estúdio)
