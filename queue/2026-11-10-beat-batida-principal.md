# Beat: travar na batida principal (bumbo/caixa), não em outros instrumentos
Status: Pending
Fonte: relato do usuário no teste do PR #79 (2026-11-10), em várias músicas
Resumo: às vezes a detecção da 024 sincroniza com outro instrumento e não com a batida que marca o groove (bumbo ou caixa). Seguir a marcação principal é o que torna o "Trocar no beat" útil. Ideias a avaliar: separar onsets por banda (graves para o bumbo, ~150–400 Hz + ruído de 2–5 kHz para a caixa) e escolher a fase pelo padrão bumbo/caixa (caixa nos tempos 2 e 4); dar peso à banda com a periodicidade mais forte; testar no simulador (`tests/sim/beat-sim.cjs`) com faixas em que um hi-hat ou baixo sincopado engana a detecção atual.
Destino provável: nova spec (revisão 4 da 024 ou spec própria), com o simulador como teste
