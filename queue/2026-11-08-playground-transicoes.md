# Playground ao vivo: transições escolhidas pelo usuário e controle durante a música
Status: Pending
Fonte: conversa com o usuário (2026-11-08), depois de testar as specs 008/009 no Windows
Resumo: "A coisa mais divertida do app é ficar controlando: aumentar e diminuir o ganho, trocar de preset na mesma música quando ela muda." O usuário quer que a troca manual também possa ter crossfade e efeitos de mesclagem, **personalizável**: escolher entre corte seco e transição, e entre tipos de transição. Quer explorar o app como um playground de áudio com vídeo.
Fatos técnicos levantados:
- O Butterchurn 2.6.7 já faz blend com padrão de mesclagem sorteado a cada troca: `mixType = 1 + floor(random * 3)` em `src/rendering/blendPattern.js` (padrões de mistura por pixel), além do tempo de blend. Hoje a troca manual usa 0 s (corte seco, padrão do protótipo) e a automática 2,7 s; os dois valores já existem no Core (`blend.set`) e aparecem nos Ajustes rápidos da spec 011.
- Escolher o **tipo** de transição exige mexer no motor: `patch-package` no `blendPattern.js` (fixar o `mixType`) é o primeiro degrau da escada de DECISIONS ("Butterchurn como dependência fixada"); transições próprias (ex.: corte no beat, flash, zoom) seriam uma camada por cima do canvas.
Destino provável:
- Spec 011: deixar "Blend quando você troca" com presets rápidos (Corte seco / Curto / Longo) além do slider.
- Spec nova "Transições" (planejar-feature): seletor de tipo (Corte seco, Crossfade, Aleatório, os 3 padrões do Butterchurn), talvez por origem (tecla, rotação, coleção); atalho para alternar ao vivo; spike curto do patch no `blendPattern.js`.
- PRD: revisar o posicionamento — "playground ao vivo" aproxima a Fase 2 da frente de vídeo/VJ ([queue/2026-11-08-video-vj.md](2026-11-08-video-vj.md)) e do beat/BPM (Fase 5). Discutir com o usuário antes de reordenar fases.
