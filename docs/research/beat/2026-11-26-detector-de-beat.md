# Detector de beat mais capaz — pesquisa (#185)

Rodada do ciclo automático, 2026-11-26. Entrada para a [spec 047](../../specs/047-beat-batida-principal.md). Pedido do usuário na [#185](https://github.com/atempel/sonic-obsidian/issues/185) e no stub `queue/2026-11-10-beat-batida-principal.md`.

Rótulos: **[MEDIDO]** = rodado no simulador (`tests/sim/beat-sim.cjs`), não no Windows; **[LITERATURA]** = o que o artigo ou o repositório diz; **[INFERÊNCIA]** = raciocínio nosso.

## 1. Resumo
- **Os erros relatados se reproduzem no simulador** com casos novos (tabela "hard", §3): baixo de ataque seco no contratempo (trance/psy) faz a detecção travar **meia batida atrasada** — o visual cai no "e", onde está o chimbal aberto/prato, que é o "sincroniza no prato"; baixo em semicolcheias com notas mudando dá o **andamento errado** (161 e 137 BPM no lugar de 124 e 100); hip-hop com swing e breakbeat continuam errados (106 no lugar de 90; metade no breakbeat). **[MEDIDO]**
- **A causa comum:** a detecção de hoje ouve uma banda só (graves < 150 Hz). Ali o bumbo e o baixo são indistinguíveis; o que separa os dois é o **ataque largo** (o bumbo tem um clique de 1–5 kHz; a nota do baixo não) e o **padrão** (a caixa em 2 e 4). **[INFERÊNCIA, apoiada em Goto 2001 e Klapuri 2006]**
- **Recomendação:** melhorar o detector próprio, sem dependência: onsets em 3–4 bandas, uma "função de batida" que dá peso ao que tem ataque largo, e a escolha da fase entre φ e φ + ½ período pelo padrão bumbo/caixa. As bibliotecas prontas ou são GPL/AGPL/não comerciais, ou não rodam em tempo real no navegador, ou só dão BPM sem fase (§2). Isso confirma a decisão de 2026-11-10 (DECISIONS, spec 024 rev. 2: "Descartado: biblioteca de beat tracking").
- **Travar mais rápido:** hoje o mínimo é ~3 s (2 s de confirmação + janela); a literatura de rastreadores causais (BTrack, IBT, BeatNet) fala em 2–5 s. O ganho maior vem de errar menos (cada erro custa os 4 s do `CHANGE_RUN`), não de encurtar a confirmação. **[LITERATURA + INFERÊNCIA]**

## 2. Soluções existentes

| Solução | Tipo | Tempo real no navegador | Fase/batida | Licença | Serve? |
|---|---|---|---|---|---|
| **BTrack** (Stark, Davies & Plumbley 2009) | C++; ODF por fluxo espectral complexo + ACF com pente + previsão "context-dependent" | não há port JS/WASM; portável | sim | **GPL-3.0** | só como referência de algoritmo |
| **IBT** (Oliveira et al. 2010, Marsyas) | multiagente causal | não | sim | **GPL** (Marsyas) | referência |
| **aubio** (`tempo`) | C; ODF + ACF + previsão (Davies) | WASM possível | sim | **GPL-3.0** | referência |
| **Essentia.js** (`RhythmExtractor`, `BeatTrackerMultiFeature`) | WASM | parcialmente (os rastreadores são offline) | sim | **AGPL-3.0** | não |
| **madmom** (Böck et al.; RNN + DBN) | Python; modo online existe | não (Python, redes) | sim, inclusive downbeat | código BSD, **modelos CC BY-NC-SA** | não |
| **BeatNet** (Heydari et al. 2021) | CRNN + filtro de partículas, online | não (PyTorch + madmom) | sim, com downbeat e métrica | código CC BY 4.0, depende do madmom | não; ideia do filtro de partículas vale |
| **librosa** `beat_track` (Ellis 2007, programação dinâmica) | Python, offline | não (precisa da faixa inteira) | sim | ISC | só o algoritmo (DP é offline) |
| **realtime-bpm-analyzer** 6.3 | JS/AudioWorklet; picos acima de limiar + histograma de intervalos | sim | **não** (só candidatos de BPM) | Apache-2.0 | não resolve fase nem o baixo |
| **web-audio-beat-detector** 8.2 | JS; `analyze`/`guess` sobre um `AudioBuffer` | não (buffer pronto) | offset inicial só | MIT | não |
| **Meyda** 5.6 | JS; extração de features (fluxo espectral, energia) | sim | não (não rastreia) | MIT | dispensável: as features cabem em 50 linhas nossas |
| **music-tempo**, **bpm-detective** | JS offline | não | não | MIT | não |

Licenças do npm conferidas com `npm view` nesta rodada; as dos projetos não-npm pelo repositório/README de cada um (ver Referências). GPL/AGPL e não comercial ficam de fora (AGENTS.md, Limites; DECISIONS 2026-11-11).

### O que vale copiar como ideia (algoritmos publicados)
1. **Onsets multibanda** (Scheirer 1998; Klapuri 2006): uma curva de onset por banda, somadas com pesos depois de comprimidas. A banda alta pega o ataque do bumbo e da caixa; a grave sozinha confunde bumbo com baixo.
2. **Fluxo espectral com compressão log** (Böck & Widmer 2013, SuperFlux): `log(1 + λ·|X|)` antes da diferença; filtro de máximo na frequência tira o vibrato. Aqui, com filtros IIR e não FFT, o equivalente é o `log1p` que já existe, aplicado por banda.
3. **Padrão bumbo/caixa para a fase** (Goto 2001): em pop/rock/eletrônica, bumbo nos tempos 1 e 3 (ou em todos) e caixa em 2 e 4. Entre as duas fases candidatas (φ e φ + ½ período), a certa é a em que a banda da caixa alterna batida sim, batida não, e a do bumbo cai nos tempos — nunca a em que só o grave sem ataque cai.
4. **Previsão com peso gaussiano em torno da batida esperada** (Davies & Plumbley 2007; BTrack): a fase só é corrigida por onsets perto de onde a batida é esperada, o que a 024 rev. 3 já faz.
5. **Vários agentes/hipóteses** (IBT, BeatRoot; filtro de partículas do BeatNet): manter 2–3 hipóteses (andamento × fase) e trocar quando outra pontua melhor por algum tempo. A 024 tem uma só e troca por `CHANGE_RUN`; uma segunda hipótese "meia batida deslocada" é o caso que mais importa (§3).

## 3. O detector de hoje no simulador
Casos novos em `tests/sim/beat-sim.cjs` (lista `hard`), rodando o `beat.ts` atual do `main` (`node tests/sim/beat-sim.cjs`). Erro de fase = distância de cada batida mostrada até a batida real mais próxima. **[MEDIDO]**

| Caso | BPM real | Trava em | BPM saído | Fase (mediana) | Leitura |
|---|---|---|---|---|---|
| house (ref.) | 124 | 3,1 s | 124,0 | +34 ms | ok (o +34 ms é o atraso da envoltória; o "Adiantar o visual" de 70 ms compensa) |
| `offbass` (trance: baixo seco no contratempo) | 138 | 3,1 s | 138,0 | **−194 ms** (≈ ½ período) | andamento certo, **fase no contratempo** |
| `cymbal` (prato alto no contratempo, bumbo fraco) | 128 | 3,1 s | 128,0 | +24 ms | ok — prato não chega aos graves |
| `rock` (caixa forte 2/4) | 110 | 3,1 s | 110,0 | +18 ms | ok |
| `rock` | 150 | 3,3 s | **75,0** | +24 ms | metade (aceitável: as batidas caem nos tempos, mas compassos ficam o dobro) |
| `bassline` (baixo em semicolcheias, notas mudando) | 124 | 10,6 s | **160,9** | p90 222 ms | andamento errado |
| `bassline` | 100 | 3,4 s | **137,1** | p90 268 ms | andamento errado |
| `hiphop` (swing) | 90 | 11,9 s | **106,0** | p90 324 ms | errado (já conhecido, 024 rev. 2) |
| `breaks` | 172 | 9,5 s | **83,5** | p90 143 ms | metade (já conhecido) |

Leituras:
- O "sincroniza no prato" do relato **não** é o prato entrando na detecção (o caso `cymbal` passa): é o grave do contratempo (baixo de trance, bumbo de "e") ganhando a fase. Visualmente cai junto com o chimbal aberto/prato, que mora no contratempo. **[INFERÊNCIA a partir do MEDIDO]**
- O "baixo de base durante quase toda a faixa" dá andamento errado quando as notas do baixo têm ataque e mudam de altura: cada nota vira um onset grave. **[MEDIDO]**
- Os casos sintéticos são simples; música real tem mais camadas. O simulador serve para pegar regressão e calibrar; a validação é no Windows com as músicas do usuário.

## 4. Proposta (vira a spec 047)
1. **Bandas:** três filtros IIR além do grave atual — grave (< 150 Hz), médio-grave (150–400 Hz, corpo da caixa), agudo (2–8 kHz, ataque de bumbo/caixa e chimbal). Uma curva de onset por banda, mesmo `log1p` + seguidor de pico.
2. **Função de batida:** `beat = grave·g(agudo) + médio·a + agudo·b`, onde o onset grave vale mais quando vem junto de um onset agudo na mesma janela de ~20 ms (bumbo) e menos quando vem sozinho (nota de baixo). Andamento pela ACF dessa curva (a ACF de hoje, sem mudar).
3. **Fase em duas hipóteses:** depois do andamento, comparar φ e φ + ½ período: pontua quem tem onset grave **com** ataque nos tempos e a banda média alternando (caixa em 2 e 4). O contratempo só ganha com vantagem clara por ~2 s.
4. **Medidas no simulador** como critério: `offbass` com fase ≤ 60 ms; `bassline` com BPM ±2 % ou múltiplo 2×/½; os casos de hoje sem piorar.
5. **Custo:** 3 biquads a mais por amostra a 48 kHz ≈ 150 mil multiplicações/s; folga grande para os 0,5 ms por quadro da 024. **[INFERÊNCIA; medir no HUD]**

Fica de fora: rede neural (sem modelo com licença compatível; custo), downbeat (024, fora de escopo), tap tempo (024 P1, conflito de tecla em aberto), biblioteca externa.

## Referências
- Ellis, D. (2007). *Beat Tracking by Dynamic Programming*. JNMR 36(1).
- Davies, M. & Plumbley, M. (2007). *Context-Dependent Beat Tracking of Musical Audio*. IEEE TASLP 15(3).
- Stark, A., Davies, M. & Plumbley, M. (2009). *Real-Time Beat-Synchronous Analysis of Musical Audio*. DAFx. — [BTrack](https://github.com/adamstark/BTrack) (GPL-3.0)
- Goto, M. (2001). *An Audio-based Real-time Beat Tracking System for Music With or Without Drum-sounds*. JNMR 30(2).
- Klapuri, A., Eronen, A. & Astola, J. (2006). *Analysis of the Meter of Acoustic Musical Signals*. IEEE TASLP 14(1).
- Scheirer, E. (1998). *Tempo and Beat Analysis of Acoustic Musical Signals*. JASA 103(1).
- Böck, S. & Widmer, G. (2013). *Maximum Filter Vibrato Suppression for Onset Detection*. DAFx (SuperFlux).
- Oliveira, J. et al. (2010). *IBT: A Real-Time Tempo and Beat Tracking System*. ISMIR.
- Heydari, M., Cwitkowitz, F. & Duan, Z. (2021). *BeatNet: CRNN and Particle Filtering for Online Joint Beat Downbeat and Meter Tracking*. ISMIR. — [arXiv 2108.03576](https://arxiv.org/pdf/2108.03576)
- [madmom](https://github.com/cpjku/madmom) (README: código BSD, modelos CC BY-NC-SA) · [aubio](https://aubio.org/) (GPL-3.0) · [Essentia.js](https://github.com/mtg/essentia.js) (AGPL-3.0) · [realtime-bpm-analyzer](https://github.com/dlepaux/realtime-bpm-analyzer) (Apache-2.0) · web-audio-beat-detector, Meyda, music-tempo, bpm-detective (MIT, `npm view`)
- Pesquisa anterior: [`docs/research/reatividade/2026-11-11-destravar-reatividade.md`](../reatividade/2026-11-11-destravar-reatividade.md) (item A10 e bibliotecas de tempo).
