# Nível muito variável entre músicas: ganho automático
Status: Ingested (spec 028)
Fonte: relato do usuário (2026-11-10), ouvindo pelo Spotify; exemplo: Robert Miles, "Children (Dream Version)", caixa marcada e nível baixo
Resumo: o nível da faixa varia muito de música para música; algumas pedem +6 dB de ganho, outras ficam altas no neutro. Prováveis causas: a masterização (faixas dos anos 90 têm ~6–10 dB menos volume que as atuais), o volume do próprio Spotify e a normalização dele, já que a captura por loopback recebe o som depois do volume de cada app. O medidor e o silêncio usam o nível absoluto; o bass/mid/treb do motor é relativo e se adapta sozinho. Ideia: ganho automático (AGC) lento, que mira um RMS de referência numa janela de ~10 s, com teto e sem bombear em breaks; o ganho manual vira ajuste fino. Avaliar também se o medidor deveria ponderar as frequências (ex.: A-weighting).
Destino provável: nova spec (Captura/Ajustes), com o simulador de áudio do 024 como teste
