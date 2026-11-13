# Sonic Obsidian v3 — Curva de expressividade

> Sessão de design, 10/11/2026. **Status: aprovado para spec (10/11/2026), começando por um spike** ("bandas de um espectro, sem falar de instrumentos"). O detalhe ainda é proposta. Substitui a ideia anterior de "reatividade por instrumento", que vinha do SYQEL e foi descartada. Página: Palco integrado › Ajustes rápidos › Expressividade, e Configurações › Visual.

## A ideia
É um **EQ gráfico de 16 bandas** que não mexe no som: ele muda o quanto cada faixa de frequência da música move o visual. Quem usa DAW ou mesa reconhece na hora: bandas em Hz, ganho em dB, uma curva plana como ponto de partida. Não há nomes de instrumento em lugar nenhum.

A curva faz parte da **Expressividade**, ao lado do Nível, do Caráter e da Memória. O Nível diz *quanto* o visual reage; a curva diz *a quais frequências*.

## Bandas
São 16 bandas em 2/3 de oitava (frequências ISO): **20 · 31,5 · 50 · 80 · 125 · 200 · 315 · 500 · 800 · 1,25k · 2k · 3,15k · 5k · 8k · 12,5k · 20k Hz**. Cada uma vai de −12 a +12 dB, com passo de 1 dB e 0 dB como padrão (curva plana = o motor como sempre).

## Como ela age no preset (fato técnico)
O preset recebe três valores, `bass`, `mid` e `treb`. As bandas são somadas nessas três **zonas**: até 250 Hz, de 250 Hz a 4 kHz e acima de 4 kHz. O motor divide cada zona pela média recente dela, e por isso o efeito da curva depende da **Memória**:
- **Curta / Longa:** só a **forma dentro de cada zona** conta. Subir 80 Hz e baixar 200 Hz faz o `bass` seguir o grave curto e não o sustentado. Subir a zona inteira por igual é desfeito em segundos.
- **Fixa:** a média congela, então a **curva inteira** age, inclusive a altura de uma zona em relação a outra. É o modo em que a curva vira uma "mixagem" de quanto cada frequência mexe o visual.

A interface diz isso sem jargão:
- As três zonas ficam desenhadas atrás das barras, com o rótulo do valor do preset (`bass`, `mid`, `treb`) em mono.
- Com a Memória em Curta ou Longa e a curva fora do plano, aparece uma linha: "Com a memória *Fixa*, a curva age por inteiro." e o botão "Usar Fixa".

## Desenho
**Ajustes rápidos › Expressividade** (depois de Nível, Caráter e Memória):
- **Curva:** um segmentado com Plana · Graves · Médios · Agudos · Sorriso, e "Personalizada" aparece sozinha quando a pessoa edita. Depois de uma edição à mão, o rótulo **continua Personalizada** mesmo que a curva volte a ser igual a uma predefinição, até a pessoa escolher uma (decisão do usuário, 10/11).
- **O EQ:** 16 barras finas arrastáveis na vertical (um clique define o valor; duplo clique volta a 0 dB), com uma linha de 0 dB e o espectro ao vivo atrás em `text-3`. A curva é desenhada em violeta. O valor da banda sob o ponteiro aparece num balão mono ("80 Hz · +4 dB", M15).
- Pelo teclado: as setas ←/→ escolhem a banda e ↑/↓ mudam ±1 dB (Shift: ±3).

**Configurações › Visual › Expressividade:** o mesmo EQ maior (altura de ~160 px), com os rótulos de frequência embaixo, a escala em dB à esquerda e "Restaurar plana".

**Predefinições** (dB por banda, de 20 Hz a 20 kHz):
- Plana: tudo 0.
- Graves: +6 +6 +5 +4 +2 0 −2 −3 −3 −3 −3 −3 −3 −3 −3 −3.
- Médios: −3 −3 −3 −2 0 +2 +4 +5 +5 +4 +2 0 −2 −3 −3 −3.
- Agudos: −3 −3 −3 −3 −3 −3 −2 −1 0 +1 +2 +4 +5 +6 +6 +5.
- Sorriso: +5 +5 +4 +3 +1 0 −2 −3 −3 −2 0 +1 +3 +4 +5 +5.

## No app (a confirmar num spike)
- Um `AnalyserNode` próprio (FFT 2048) calcula a energia de cada banda e aplica os pesos da curva. As somas por zona substituem o `imm` do motor no mesmo gancho da Expressividade (`audioLevels.updateAudioLevels`). É preciso confirmar que esse gancho existe no Butterchurn 3 (spec 021).
- O som que sai das caixas não muda.
- Estado: `settings.expression.curve16: number[16]` e `curvePreset`. Comando `expression.set`; no MCP, `set_signal` ganha `eq_curve`.

## Outras ideias do SYQEL (para escolher depois)
| Ideia | Onde entra | Esforço |
| --- | --- | --- |
| Troca no beat a cada N compassos + segurar o visual (`Enter`) | Rotação; M23 (depende de BPM) | Médio |
| Janela de transmissão sem interface (OBS) | Configurações › Telas | Baixo |
| Saída Spout | Configurações › Telas › Saídas | Médio |
| MIDI Learn | Modo performance e Rack | Médio |
| Gravar em 16:9 e 9:16 | Faixa e Configurações › Gravação | Médio–alto |

## Roadmap das ideias do SYQEL (decisão do usuário, 10/11/2026)
- **Entram:** troca no beat a cada N compassos com "segurar o visual" (`Enter`, depende do BPM, Fase 5); Spout e MIDI Learn (Modo performance e Rack).
- **Janela de transmissão:** coberta pelo Rack em janela, com tamanho fixo (ver `docs/v3-modos.md`).
- **Fica de fora por ora:** gravar em 16:9 e 9:16.
