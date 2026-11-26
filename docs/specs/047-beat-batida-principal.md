# 047 — Beat na batida principal: multibanda e fase pelo bumbo/caixa

**Fase:** 3 · **Status:** Implementada (P0) — critérios 1–4 no CI; 5–9 no teste do bloco · **Issue:** [#185](https://github.com/atempel/sonic-obsidian/issues/185) · **Personas:** DJ de Festa, Streamer de Set, VJ de Clube ([personas](../research/mercado/personas.md)) · **Depende de:** [024](024-troca-no-beat-segurar.md) (revisão 3), [043](043-trocas-manuais-no-beat.md)

## Problema
O usuário relata (#185, 2026-11-23; stub `queue/2026-11-10-beat-batida-principal.md`) que a detecção da 024:
- demora a pegar a batida e não acompanha bem a música;
- erra em músicas complexas, com muito contraste, ou com um baixo presente na faixa quase toda;
- às vezes sincroniza no prato em vez de na caixa.

A [pesquisa](../research/beat/2026-11-26-detector-de-beat.md) reproduziu os dois erros no simulador:
- **contratempo:** com o baixo seco no "e" (trance/psy), a fase trava meia batida atrasada. As batidas caem no chimbal aberto/prato;
- **andamento errado:** com o baixo em semicolcheias e notas mudando, o BPM sai errado (161 no lugar de 124, 137 no lugar de 100).

A causa comum é ouvir só os graves (< 150 Hz), onde o bumbo e o baixo são iguais.

## Proposta
Melhorar o detector próprio (`src/renderer/src/beat.ts`), sem dependência nova (§2 da pesquisa: as bibliotecas são GPL/AGPL/não comerciais, offline, ou não dão fase).
1. **Onsets em bandas:**
   - grave (o de hoje);
   - médio-grave, ~150–400 Hz (corpo da caixa);
   - agudo, ~2–8 kHz (ataque do bumbo e da caixa).
   Cada banda usa o mesmo `log1p` e o mesmo seguidor de pico.
2. **Função de batida:** o onset grave vale mais quando vem com ataque no agudo (bumbo) e menos sozinho (nota de baixo). O médio entra com peso próprio. O andamento sai da ACF dessa curva combinada (o resto da análise da 024 fica).
3. **Fase em duas hipóteses:** escolher entre φ e φ + ½ período pelo padrão. Ganha a fase com o bumbo (grave + ataque) nos tempos e a caixa (médio + agudo) alternando, como em 2 e 4. Travado, a hipótese do contratempo só substitui a atual com vantagem clara por ~2 s; a meia batida não passa pelos 4 s de um andamento novo.
4. **Travar mais cedo quando a batida é clara:** com as bandas concordando (o bumbo explica a curva e a fase não tem rival), travar com a metade das análises (`LATCH_RUN` / 2, ~1 s). Nos demais casos, como hoje.

Os limiares novos ficam em `BEAT`, como os da 024.

## Escopo
**P0**
- **Detecção:** bandas, função de batida, fase em duas hipóteses e trava antecipada, como acima. Os parâmetros novos ficam em `BEAT`.
- **Simulador** (`tests/sim/beat-sim.cjs`, lista `hard`, já no `main` com esta spec):
  - os casos difíceis viram teste no CI (`tests/headless/024-beat-sim.test.cjs` ou `047-beat-bandas.test.cjs`), com os limites dos critérios 1–4;
  - o teste guarda também os casos de hoje, que não podem piorar.
- **HUD** (`Ctrl+Shift+D`), linha do beat:
  - força de cada banda nas batidas (`kick`, `snare`);
  - fase escolhida (`on`/`off`) e a margem sobre a outra hipótese.
  - Só texto, em inglês, como o resto do HUD.
- **Log:** a linha "beat: estável a N BPM" ganha a fase escolhida e a margem. Uma linha por mudança de estado ou de fase, nunca por batida.
- **Custo:** a detecção inteira fica < 0,5 ms por quadro no HUD (o limite da 024).

**P1**
- Uma terceira hipótese de andamento (×2 ou ×½ conforme a banda média: a caixa em 2 e 4 marca o andamento "de dança"). Isso resolveria o rock a 150 lido como 75. Só se o P0 ficar abaixo do custo com folga.
- Breakbeat e hip-hop com swing: medir de novo depois do P0. Se continuarem errados, abrir uma issue `backlog` com os números.

## Fora de escopo
- Biblioteca externa, rede neural, `AudioWorklet` (DECISIONS 2026-11-10 e 2026-11-26).
- Downbeat (primeiro tempo do compasso), tap tempo (024 P1, conflito do `B` em aberto), Ableton Link/MIDI.
- Qualquer mudança de interface além do HUD e do log: nada de desenho novo.
- Mudar o comportamento da trava da 024 rev. 3:
  - break e ambiente não soltam;
  - silêncio solta em 3 s;
  - outro andamento troca em ~4 s.

## Critérios de aceite
No simulador (CI), com `node tests/sim/beat-sim.cjs`:
1. `offbass` 138: fase mediana entre −20 e +60 ms (hoje −194 ms), BPM 138 ± 1.
2. `bassline` 124 e 100: BPM a ±2 % do real ou de 2×/½ (hoje 161 e 137); p90 da fase ≤ 80 ms.
3. house, techno, `cymbal` e `rock` 110: travam em ≤ 2,5 s (hoje ~3,1 s), BPM ± 1, fase mediana como hoje (± 15 ms).
4. Os testes da 024 continuam passando: ambiente e silêncio nunca travam; o break de 8 s não solta; o silêncio solta em ≤ 4,5 s; 124 → 140 troca em ≤ 7 s.

No Windows, com o app rodando ("Testar no bloco"):

5. **Trance ou psytrance** com baixo no contratempo, "Trocar no beat" ligado:
   - o ponto de beat e as trocas caem no bumbo, não no "tss" do chimbal entre eles;
   - o HUD mostra `phase on`.
6. **Faixa com baixo marcado o tempo todo** (funk, disco, house com bassline):
   - o BPM do HUD fica a ±2 do real (ou do dobro/metade) em até 8 s;
   - o BPM não troca sozinho durante a faixa.
7. **Rock ou pop com caixa forte:** o ponto pisca nos tempos (bumbo e caixa), não nos contratempos.
8. **House/techno comum:**
   - o ponto aparece em até ~3 s depois do bumbo entrar (antes da 047: ~4–5 s);
   - nada piora em relação ao bloco anterior.
9. Com tudo ligado por 30 min:
   - o custo da detecção no HUD fica < 0,5 ms;
   - o log só tem linhas de mudança de estado ou de fase.

## Perguntas em aberto
- Os pesos das bandas e a margem de troca de fase se ajustam com as músicas do usuário no teste do bloco; ficam em `BEAT`.
- Se o rock a 150 lido como 75 incomodar no uso (os compassos ficam o dobro), o P1 de andamento vira P0 numa revisão.

## Referências
- Pesquisa: [`docs/research/beat/2026-11-26-detector-de-beat.md`](../research/beat/2026-11-26-detector-de-beat.md). Lá estão as tabelas de bibliotecas e licenças, o simulador e as referências (Goto 2001; Klapuri 2006; Davies & Plumbley 2007; Böck & Widmer 2013).
- [024 — Troca no beat](024-troca-no-beat-segurar.md) (revisões 2 e 3); [043 — Trocas manuais no beat](043-trocas-manuais-no-beat.md).
- DECISIONS 2026-11-10 ("Detecção de batida pelo relógio do áudio"; biblioteca descartada) e 2026-11-26 (esta spec).
