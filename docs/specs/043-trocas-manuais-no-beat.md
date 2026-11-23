# 043 — Trocas manuais no beat, separadas da rotação no beat

**Fase:** 3 (ajuste da 024) · **Status:** implementada · **Issue:** [#183](https://github.com/atempel/sonic-obsidian/issues/183) · **Design:** `Palco integrado` e `Configurações`, versão `1794680346-fb12` (diverge: ver DIVERGENCIAS 2026-11-23)

## Problema (pedido do usuário, 2026-11-23)
"Trocar no beat" (spec 024) faz duas coisas: a rotação automática conta compassos e troca na batida, **e** as trocas manuais (`→`, `←`, `Espaço`, botões da faixa) esperam a próxima batida (M23). Quando o detector atrasa, a troca manual atrasa junto. Para usar a rotação no beat e trocar à mão na hora, hoje é preciso ligar e desligar a opção.

## Proposta
- **"Trocar no beat"** (`rotation.onBeat`) passa a valer só para a rotação automática.
- **"Trocas manuais no beat"** (`rotation.manualOnBeat`, novo, padrão **desligado**): as trocas manuais esperam a próxima batida, como o M23 (botão tracejado, último pedido vale, `Shift` incluído). Sem batida estável, trocam na hora. Funciona com a rotação automática desligada.
- Onde: Ajustes rápidos › Rotação (switch logo abaixo de "Trocar no beat") e Configurações › Visual › Transição (linha abaixo de "Trocar no beat").
- O ponto de beat na faixa aparece com qualquer uma das duas ligada. "Adiantar o visual" fica habilitado com qualquer uma das duas.
- Migração: `settings.json` sem o campo → desligado (quem usava "Trocar no beat" passa a ter troca manual na hora; foi o pedido).
- Perfis de ajustes (spec 038, ainda não implementada): o grupo Rotação leva os dois campos.

## Critérios de aceite
1. Com "Trocar no beat" ligado e "Trocas manuais no beat" desligado, `→` troca na hora, sem tracejado; a rotação continua no beat.
2. Ligando "Trocas manuais no beat", `→` espera a próxima batida com o botão tracejado.
3. Com a rotação desligada e só "Trocas manuais no beat", a seta espera a batida e o ponto de beat aparece.
4. Os dois switches salvam em `settings.json` sem mexer um no outro e aparecem nos Ajustes rápidos e nas Configurações, nos dois idiomas.

## Verificação
Teste headless `043-beat-manual` (critérios 1–4, bumbo sintético a 124 BPM); o `024-beat` liga as duas opções e segue igual. Atraso percebido com música real: teste do bloco no Windows.
