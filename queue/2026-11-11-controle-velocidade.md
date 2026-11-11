# Controle de velocidade (time) do visual
Status: Pending
Fonte: pedido do usuário (2026-11-11), depois de testar a Expressividade
Resumo: um controle para a velocidade do relógio do preset (`time`), ao lado da Expressividade e da Memória. O app já controla esse relógio no silêncio: `renderSafe(dt * speed)`, com `elapsedTime` do Butterchurn. Um multiplicador do usuário (ex.: 0,25× a 2×, tecla e item nos Ajustes rápidos) entraria no mesmo ponto. Avaliar: se muda também `fps`/`frame` nas equações (presets que integram por quadro não desaceleram só com `time`), se a troca automática e a batida seguem o relógio real, e como fica com o Respiro. Retorno do usuário no mesmo teste: Expressividade e Memória ficaram bem evidentes; o efeito do Caráter (X) ainda não fica óbvio, só aparece em poucos presets.
Destino provável: nova spec (Ajustes rápidos / Expressividade), talvez junto de uma revisão do Caráter
