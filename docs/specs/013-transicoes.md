# 013 — Transições: tipo e tempo escolhidos pelo usuário

**Fase:** 2 · **Status:** Feito (validado no Windows em 2026-11-08) · **Issue:** [#31](https://github.com/atempel/sonic-obsidian/issues/31) · **Depende de:** [008](008-nucleo-comandos-persistencia.md); a UI completa entra junto com a [011](011-ajustes-configuracoes.md)

## Problema
A troca de preset é o gesto mais divertido do app: trocar na mesma música quando ela muda, mexer no ganho, brincar ao vivo. Hoje a troca manual é sempre corte seco (blend 0 s) e a automática sempre um blend de 2,7 s com um padrão de mesclagem sorteado pelo motor. O usuário não escolhe nem o tipo nem o tempo, e não consegue alternar entre cortar no beat e misturar devagar sem abrir arquivo de configuração.

## Proposta
Expor como escolha do usuário o que o Butterchurn já sabe fazer, separadamente para a troca **manual** (teclado, faixa, Biblioteca, busca) e a **automática** (rotação, coleção):
- **Tipo:** Corte seco · Crossfade · Varredura · Plasma · Radial · Aleatório.
- **Tempo** do blend (quando o tipo não é Corte seco).

E dar controle ao vivo pelo teclado, sem abrir painel. Efeitos próprios desenhados por cima do visual (flash, zoom, corte no beat) ficam para uma spec seguinte (ver Fora de escopo).

### Como o motor faz hoje (fato técnico)
O Butterchurn 2.6.7 mistura dois presets por uma malha de pesos (`BlendPattern`). A cada `loadPreset(preset, blendTime)` com `blendTime > 0`, `createBlendPattern()` sorteia `mixType = 1 + floor(random × 3)`:
- **1 — Varredura:** uma faixa reta que atravessa a tela num ângulo aleatório;
- **2 — Plasma:** manchas orgânicas (ruído plasma);
- **3 — Radial:** um círculo que abre do centro ou fecha para o centro.
- O tipo **0 — Crossfade** (todos os pontos ao mesmo tempo) existe no código, mas nunca é sorteado ("not currently used").

### Como escolher o tipo (decisão do usuário: sobrescrever em tempo de execução)
Sem patch no pacote nem dependência nova. O Engine (`visualizer.ts`) pega a instância em `visualizer.renderer.blendPattern` e envolve o `createBlendPattern` original:
- **Varredura/Plasma/Radial:** antes de chamar o original, troca `Math.random` só na **primeira** chamada (a que sorteia o tipo) por um valor que cai no tipo escolhido, e restaura em seguida (`try/finally`). O resto da aleatoriedade (ângulo, espessura da faixa, direção do radial) continua do motor.
- **Crossfade:** preenche `vertInfoA = 1` e `vertInfoC = 0` em toda a malha (o mesmo que o ramo `mixType === 0`), sem chamar o original.
- **Aleatório:** chama o original sem mexer em nada.
- **Corte seco:** `loadPreset(preset, 0)`.
- Se a estrutura interna não existir (outra versão do motor), o app registra no console, cai para o comportamento padrão do motor e a UI mostra os tipos como indisponíveis. O spike [006](006-spike-butterchurn3-milk.md) (Butterchurn 3) precisa refazer esta ligação.

## Escopo
**P0**
- **Estado (Core):** `blend.manual` e `blend.auto`, cada um com `type` (`cut | crossfade | wipe | plasma | radial | random`) e `seconds` (0,1–10 s). O `settings.json` antigo (`manualSeconds`/`autoSeconds`) é migrado: segundos > 0 viram `random` com esse tempo; 0 vira `cut`.
- **Padrões:** troca automática = **Aleatório, 2,7 s** (como hoje); troca manual = **Aleatório, 1 s** (decisão do usuário: a troca manual também mistura). Quem já tinha 0 s salvo continua com Corte seco até mudar.
- **Comando** `blend.set` passa a aceitar `{ target: 'manual' | 'auto', type?, seconds? }`; a origem (`keyboard`, `ui`, `rotation`…) decide qual dos dois se aplica a cada troca, como já acontece.
- **Engine:** a sobrescrita acima, aplicada a cada `loadPreset`.
- **Ao vivo, pelo teclado (troca manual):**
  - `B` cicla o tipo: Corte seco → Crossfade → Varredura → Plasma → Radial → Aleatório. `Shift+B` volta. Toast: "Transição: Plasma, 1 s".
  - `↑` / `↓` aumentam e diminuem o tempo: 0,25 · 0,5 · 1 · 2 · 4 · 8 s. Toast com o valor.
  - **Shift na troca = corte seco na hora:** `Shift+→`, `Shift+←`, `Shift+Espaço` trocam sem blend, sem mudar o ajuste salvo. Bom para cortar no beat.
- **Assinatura (009):** a barra continua acompanhando o blend usado; com Corte seco, 400 ms (como hoje).

**P1**
- **Ajustes rápidos e Configurações › Visual** (junto com a 011): para cada troca (manual e automática), um seletor de tipo e o slider de tempo, que some com Corte seco. Até a 011 existir, só o teclado e o `settings.json`.
- **Coleção com transição própria:** opcional por coleção (tipo e tempo), usada quando a coleção toca.

**P2**
- Prévia do tipo: ao passar o mouse no seletor, um quadradinho animado mostra a forma da mesclagem.

## Fora de escopo
Efeitos próprios por cima do canvas (flash, zoom, blur, glitch, corte sincronizado com o beat), tempo em batidas (depende de detecção de BPM, Fase 5), transições de vídeo da frente VJ. Ficam em [queue/2026-11-08-playground-transicoes.md](../../queue/2026-11-08-playground-transicoes.md) para uma spec "Efeitos de transição".

## Critérios de aceite (verificar no Windows, com música)
1. Com o tipo manual em **Varredura**, `→` várias vezes: toda troca é uma faixa atravessando a tela (o ângulo muda, o tipo não).
2. Idem para **Plasma** (manchas) e **Radial** (círculo abrindo ou fechando).
3. **Crossfade:** a imagem inteira mistura ao mesmo tempo, sem forma.
4. **Corte seco:** a troca é instantânea.
5. **Aleatório:** em umas 10 trocas aparecem pelo menos dois tipos diferentes.
6. `B` cicla os tipos com toast; `↑`/`↓` mudam o tempo com toast; os valores voltam depois de reabrir o app.
7. Com o manual em Plasma 2 s, `Shift+→` corta seco, e o `→` seguinte volta a fazer Plasma 2 s.
8. A rotação usa o tipo e o tempo **automáticos**, independentes dos manuais.
9. Um `settings.json` da 008/009 com `manualSeconds: 0` abre com Corte seco na troca manual e o automático igual a antes.
10. O fps durante e depois das trocas fica igual ao de hoje (`Ctrl+Shift+D`).

## Perguntas em aberto
*Respondidas pelo usuário em 2026-11-08: `+`/`−`/`0` ficam permanentes; o tipo da troca automática não ganha tecla.*
- **Teclas de ganho:** a DIVERGENCIAS propõe tirar `+`/`−`/`0` quando os Ajustes rápidos existirem (011), mas o usuário descreveu mexer no ganho ao vivo como parte do que é mais divertido no app. Proposta: **manter** `+`/`−`/`0` como atalhos permanentes e pedir ao design para incluí-los na tabela de atalhos.
- **`B` e `↑`/`↓`** não estão nos atalhos do protótipo (e `Shift+←/→` aparece na frente VJ, ainda fora do PRD). Registrar em DIVERGENCIAS e pedir ao design.
- O tipo da troca automática também merece tecla própria, ou o ajuste fica só nos Ajustes rápidos?

## Referências
- Butterchurn 2.6.7: `src/rendering/blendPattern.js` (`createBlendPattern`, tipos 0–3) e `src/rendering/renderer.js` (`loadPreset` → `blendPattern.createBlendPattern()`); acesso por `visualizer.renderer.blendPattern`.
- Protótipo v3 `1794165177-f126` ([SYNC.md](../design/v3/SYNC.md)): `Sonic Obsidian Palco integrado.html` (Ajustes rápidos: "Blend na troca automática" e "Blend quando você troca") e `Sonic Obsidian Configurações.html` (Visual). O protótipo não tem seletor de tipo nem as teclas novas: pedido ao design em DIVERGENCIAS.
- [queue/2026-11-08-playground-transicoes.md](../../queue/2026-11-08-playground-transicoes.md); DECISIONS 2026-11-08 "Transições: tipo escolhido sobrescrevendo o BlendPattern em tempo de execução".
