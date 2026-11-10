# Performance: presets programados sobre uma faixa de áudio
Status: Pending
Fonte: conversa com o usuário, 2026-11-10 (sessão de encerramento do PR #65)
Resumo: o usuário cria uma "performance": escolhe uma faixa de áudio e programa em que momentos cada preset entra (e talvez transições e expressividade), sincronizado com a música. Não é o uso principal, mas é útil. É a história que deve trazer o player de arquivo de áudio, adiado da Fase 3 (DECISIONS 2026-11-10).
Destino provável: PRD (nova história, Fase 5 ou própria) → spec da fonte arquivo + spec da performance

## Notas
- Antes de especificar, escrever as user stories do app (pedido do usuário: "precisamos pensar nas user stories da aplicação"); outros usos de áudio podem aparecer.
- O protótipo `1794178325-0fd0` já tem o player mínimo: `#srcMenu` (Sistema / Microfone / Arquivo… / SoundCloud…), `#trackRow` (▶/⏸, título, posição, tempo, "Voltar ao áudio do sistema") e o título grande ao começar a faixa (`launchSongTitleAnim`). Não tem linha do tempo nem marcadores; a performance precisa de desenho novo.
- Técnico (docs/architecture.md §4): `<audio src=blob:>` → `MediaElementSource`, que sai em `ctx.destination`; o loopback fica parado enquanto o arquivo toca.
- Perguntas que ficaram em aberto quando o player foi discutido: o que acontece no fim da faixa (voltar ao sistema ou pausar); vários arquivos (fila ou só o primeiro).
