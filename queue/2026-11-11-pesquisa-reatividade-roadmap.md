# Itens da pesquisa de reatividade que ficaram fora da spec 028
Status: Pending
Fonte: pesquisa do usuário com o Cowork (2026-11-11), cópia em docs/research/reatividade/2026-11-11-destravar-reatividade.md; resumo no Claude Docs: https://claude.ai/artifact/T8VRDyCmsZyqWRQeSBdDUm
Resumo: a spec 028 pegou só a Fase 0 da pesquisa (A1, A2, A4, HUD), o AGC (A3) e o teste da janela curta (A6). Os candidatos seguintes, na ordem que a pesquisa sugere:
- Curva de 16 bandas da Expressividade (A7). Design `v3-reatividade.md` aprovado como direção.
- "Intensity" de janela longa e hits por banda (A9). Estrutura build/break/drop (A13), afinada por ouvido, sem detector causal publicado.
- Troca por limiar estilo MD3 (B1/B2) e "Volume Peak Trigger" do NestDrop (B4). Recalibrar se a Expressividade ou a janela mudarem.
- Velocidade (C1): acoplamento `time`/`fps` no motor, ver queue/2026-11-11-controle-velocidade.md. Matiz/saturação global (C4), MIDI (C6).
- Do MilkDrop 3 (só ideias; o MD3 é DirectX e não foi integrado): hardcut por limiar (B1), injetar efeito sem trocar preset (B5), `.milk2` (D1–D4), textura FFT `get_fft` (A11), vídeo como textura no preset (E3).
- Itens que pedem fork do Butterchurn (MIT): áudio float (A5), textura FFT (A11), variáveis novas (A8), mistura fixa `.milk2` (D1).
- Perfil de GPU/CPU por preset (seção 5.4), antes de investir no motor.
Decisões pendentes do usuário (seção 6 da pesquisa):
- fork agora ou só quando um item exigir;
- `.milk2` (prioridade, risco de licença);
- vídeo, compositor fora (E1) ou dentro do preset (E3);
- MIDI/OSC antes ou depois do Estúdio P1;
- dependências GPL/AGPL de beat/onset.
Destino provável: specs da Fase 3/4 depois da 028; decisão de fork em DECISIONS quando um item a exigir
