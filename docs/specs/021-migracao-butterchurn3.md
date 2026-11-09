# 021 — Migração para o Butterchurn 3 (WASM)

**Fase:** 3 · **Status:** Em andamento · **Issue:** [#63](https://github.com/atempel/sonic-obsidian/issues/63) · **Depende de:** [006](006-spike-butterchurn3-milk.md) (aprovado)

## Problema
O motor 2.6.7 transforma as equações de cada preset em JavaScript (`new Function`). No Windows, um preset de teste com código malicioso executou dentro do app (spike 006). Enquanto for assim, nenhum preset de fora pode entrar: importar `.milk`, o Estúdio e o MCP dependem disso.

## Proposta
Trocar o motor pelo Butterchurn 3 com `onlyUseWASM`, como padrão e sem flag, e fechar a página para `eval`. Com o motor novo vem o pacote de presets 3.x: os 395 atuais continuam todos lá, e entram 77 novos. O render fica protegido contra presets que travam dentro do WASM.

## Escopo
**P0**
- **Dependências:** `butterchurn@3.0.0-beta.5` e `butterchurn-presets@3.0.0-beta.4` no lugar do 2.6.7/2.4.7, sem alias. Saem o motor e os presets antigos.
- **CSP** do renderer: `script-src 'self' 'wasm-unsafe-eval'`, sem `'unsafe-eval'`.
- **Presets:** o pacote base carrega na abertura; extra, md1 e image entram depois do primeiro quadro, como hoje. As imagens dos presets "image" vêm do `imageData` do pacote 3.x (o 3.x não tem mais o `butterchurnExtraImages`), seguindo a opção de Renderização que já existe.
- **Render resiliente:** `try/catch` em volta de `render`. Se um preset falhar 3 vezes em 1 s ("float unrepresentable" no WASM, `reading 'time'` numa transição), o app registra no log, mostra o toast "Este preset travou e foi pulado" e vai para o próximo. Esse preset fica oculto por erro, e restaurar funciona como em "Ocultos por desempenho".
- **`loadPreset` assíncrono:** em trocas rápidas, vale o último pedido. Um preset que não compila é registrado e o anterior continua tocando.
- **Ganchos:** confirmar no 3.x os tipos de transição (spec 013), a limpeza de shaders (2026-11-08) e a expressividade (spec 015). Se algum desligar, consertar ou registrar.
- **Limpeza do spike:** saem as flags `engine3`/`spike006` e `src/renderer/src/spike006.ts`. Os fixtures `.milk` e o conversor do main ficam para a spec 022.

**P1**
- Seis presets novos têm nome só numérico ("27", "269"). Manter o nome (regra dos créditos) e conferir se o pacote traz autor em outro campo.

## Fora de escopo
Importar `.milk` ([022](022-importar-milk.md)), Estúdio, MCP.

## Critérios de aceite (no app rodando, Windows)
1. O app abre direto no motor 3 e reage ao áudio. Um `new Function` na página é bloqueado (HUD ou log).
2. A Biblioteca mostra 472 presets. Favoritos, coleções e recentes de antes continuam funcionando.
3. Tipos de transição, expressividade (`+`/`−`, `X`) e as opções de Renderização funcionam como antes.
4. Um preset que trava é pulado com aviso, e o app segue sem travar nem fechar.
5. Mesmo fps de antes nos presets pesados, e memória da GPU estável numa sessão de ~30 min.

## Referências
- Spike: [006](006-spike-butterchurn3-milk.md); DECISIONS 2026-11-09 "Spike 006 aprovado".
