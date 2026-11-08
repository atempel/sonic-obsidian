# 015 — Expressividade: `+`/`−` mudam o quanto o visual reage

**Fase:** 2 · **Status:** Feito (critérios validados no Windows em 2026-11-08) · **Issue:** [#36](https://github.com/atempel/sonic-obsidian/issues/36) · **Depende de:** [008](008-nucleo-comandos-persistencia.md); os controles visuais entram na [011](011-ajustes-configuracoes.md)

## Problema
Mexer no ganho ao vivo era a principal forma de "tocar" o visual, mas o efeito passa em segundos. O Butterchurn não entrega o volume aos presets: `bass`/`mid`/`treb` = nível agora ÷ média longa (`imm / longAvg`, ~4 s a 30 fps, `src/audio/audioLevels.js`), e os `_att` = média curta ÷ média longa. Subir o ganho sobe as duas partes da divisão, e em 4–8 s tudo volta a oscilar em torno de 1. É o comportamento do MilkDrop: os presets reagem ao contraste da música, não ao volume.

## Proposta
Um controle de **Expressividade** no lugar do ganho nas teclas `+`/`−`. Ele ajusta os níveis **depois** da normalização, então o efeito não some. Junto, dois controles de "playground" para mudar o jeito da reação. Validado no spike (PR #35): "cada um com um efeito diferente em cada preset".

### Como funciona (fato técnico)
O Engine envolve `visualizer.renderer.audioLevels.updateAudioLevels` na instância (sem patch, como a 013) e, depois do original, reescreve `val`/`att` das três bandas:
- **Nível** `L` de −3 a +3: contraste `k = 2^(L/2)` (0,35× a 2,83×) em torno de 1, `v' = 1 + (v − 1)·k`.
- **Caráter** (`X`):
  - *Contraste*: só `k`.
  - *Energia* (padrão): `k` mais o offset `0,15·L`, que sobe ou desce a base.
  - *Nervo*: Energia mais a reação: com L > 0 o `_att` segue o imediato (seco); com L < 0 o imediato segue a média (suave).
- **Memória** (`Shift+X`): a média longa que divide os níveis.
  - *Curta* (~4 s, a do motor).
  - *Longa* (~30 s, média própria).
  - *Fixa*: a média congela ao escolher, e as partes altas da música ficam sempre mais fortes que as baixas.
- **Saída limitada a 0–4**: equações como `zoom = 1 + bass^3` explodem acima disso.
- Se a estrutura interna não existir (outra versão do motor), nada muda e o toast diz "Expressividade indisponível". O spike [006](006-spike-butterchurn3-milk.md) (Butterchurn 3) precisa refazer a ligação.

## Escopo
**P0**
- **Estado (Core):** `settings.expression = { level: −3…3, curve: 'a'|'b'|'c', adaptation: 'normal'|'slow'|'locked' }`. Padrão: 0, Energia, Curta. Salvo e global (não por preset). Comando `expression.set` (parcial).
- **Teclas:** `+`/`−` mudam o nível com o toast "Expressividade +2"; `0` volta a neutra. `X` cicla o Caráter e `Shift+X` a Memória, cada um com um toast que diz o que faz.
- **Ganho sai do teclado** (decisão do usuário): `+`/`−`/`0` deixam de mexer no ganho, que só muda nos Ajustes rápidos e nas Configurações (011). O ganho salvo continua valendo (formas de onda e medidor).
- HUD (`Ctrl+Shift+D`): nível, caráter, memória e `bass` antes → depois.

**P1** (com a 011)
- Ajustes rápidos: grupo "Expressividade" com o nível (slider −3…+3), o Caráter e a Memória (segmentados, com a descrição curta embaixo).
- Configurações › Visual: o mesmo grupo. Atalhos: `+`/`−`/`0`, `X`, `Shift+X`.

**P2**
- Expressividade por preset ou por coleção (o mesmo valor reage diferente em cada preset).
- Atalho direto para cada Caráter, para tocar sem ciclar.

## Fora de escopo
Detecção de BPM e expressividade sincronizada ao beat (Fase 5); efeitos próprios por cima do canvas (queue de transições).

## Critérios de aceite (verificar no Windows, com música)
1. Em +3, o visual fica claramente mais agitado e **continua assim** depois de 30 s. Em −3, fica calmo e continua calmo.
2. `0` volta ao comportamento de sempre (o HUD mostra `bass` antes = depois).
3. `X` troca o Caráter e `Shift+X` a Memória, e o toast explica o que cada opção faz.
4. Com a Memória *Fixa*, a parte alta de uma música fica mais forte que a parte baixa por toda a faixa.
5. `+`/`−`/`0` não mudam mais o ganho.
6. Os valores voltam depois de reabrir o app.
7. Nenhum preset trava ou fica branco/preto fixo nos extremos (+3 e −3).
8. O fps fica igual ao de antes (`Ctrl+Shift+D`).

## Perguntas em aberto
- Nomes "Caráter" (Contraste / Energia / Nervo) e "Memória" (Curta / Longa / Fixa): propostos depois do spike, a confirmar no teste.
- O design não tem esses controles: pedido em DIVERGENCIAS.

## Referências
- Butterchurn 2.6.7: `src/audio/audioLevels.js` (`updateAudioLevels`, `imm`/`avg`/`longAvg`, `val`/`att`) e `src/rendering/renderer.js` (`this.audioLevels`). Código: `src/renderer/src/expression.ts`.
- Spike: PR [#35](https://github.com/atempel/sonic-obsidian/pull/35). DECISIONS 2026-11-08 "Spec 015: expressividade".
