# 002 — Presets: biblioteca e navegação

**Fase:** 1 · **Status:** A fazer · **Issue:** [#6](https://github.com/atempel/sonic-obsidian/issues/6)

## Problema
O spike carrega só o conjunto padrão de `butterchurn-presets` e oferece uma única ação: `Espaço` = aleatório. Para usar o app de verdade é preciso ter a biblioteca inteira à mão e poder voltar ao preset que acabou de passar.

## Proposta
Reunir todos os presets do pacote (incluindo os pacotes extras que já vêm nele) numa lista única, sem duplicatas, e navegar por ela com o teclado: próximo, anterior (com histórico) e aleatório. O blend passa a ter dois tempos (troca manual e automática). Nenhuma interface nova além de um aviso discreto ao trocar.

## Escopo
**P0**
- Carregar os presets de `butterchurn-presets` 2.4.7 e dos pacotes extras em `node_modules/butterchurn-presets/lib`: `butterchurnPresetsExtra.min.js`, `butterchurnPresetsExtra2.min.js` e `butterchurnPresetsMD1.min.js` (nomes conferidos no pacote). Juntar tudo num único mapa nome → preset, deduplicando pelo nome.
- Teclas: `→` próximo (ordem alfabética da lista), `←` anterior (volta pelo histórico de navegação, não pela ordem), `Espaço` aleatório. (`R` fica reservado para a rotação — atalhos v3, ver DECISIONS 2026-11-08.)
- Histórico de navegação: cada troca entra no histórico; `←` desfaz a última, inclusive depois de aleatórios.
- Tempo de blend: dois valores, como no modelo v3 — troca manual (padrão 0 s) e troca automática (padrão 2,7 s). Sem UI ainda: constantes num único módulo de configuração, para os ajustes rápidos da Fase 2 lerem depois. O HUD mostra o total de presets carregados.
- Nenhuma dependência nova.

**P1**
- Toast discreto de ~3 s ao trocar, no canto, com o nome completo do preset. O nome carrega o autor: nunca truncar a ponto de perder o autor (quebrar linha em vez de cortar) e nunca renomear.

## Fora de escopo
Busca, favoritos, recentes e navegador visual (Fase 2). Rotação automática (003). Persistência da escolha de blend (Fase 4). Filtrar presets por qualidade ou desempenho.

## Critérios de aceite
1. A contagem de presets mostrada no HUD é maior que a do spike e não há dois presets com o mesmo nome na navegação (apertar `→` por toda a lista não repete nomes).
2. `→` troca para o preset seguinte e `←` volta exatamente ao anterior, mesmo depois de várias trocas com `Espaço`.
3. `Espaço` troca para um preset diferente do atual a cada toque.
4. Troca manual é um corte imediato (0 s); troca automática (003) é visivelmente gradual (2,7 s). Os dois valores vêm do mesmo módulo de configuração.
5. (P1) Ao trocar, o nome completo do preset aparece por cerca de 3 s e some sozinho, com o autor legível mesmo em nomes longos.
6. Em tela cheia, a navegação não derruba o fps abaixo de 60 nem trava a imagem durante a troca por mais que um instante.
7. Abrir o app com todos os pacotes carregados ainda mostra o visual reagindo em até 3 s (critério do PRD).

## Perguntas em aberto
- Carregar todos os pacotes atrasa a abertura além dos 3 s do critério do PRD? Medir no Windows; se atrasar, considerar carregar o conjunto padrão primeiro e os extras em seguida, sem bloquear o primeiro quadro.
- A ordem do `→` deve ser alfabética pelo nome inteiro (autor incluído) ou por pacote? Padrão proposto: alfabética.

## Referências
- [docs/PRD.md](../PRD.md) — Fase 1, Núcleo
- [CONTEXT.md](../../CONTEXT.md) — créditos dos presets e performance
- [001 — Spike](001-spike-electron-butterchurn.md) e DECISIONS.md, "Spike 001: respostas"
- `src/renderer/src/visualizer.ts` (`PresetVisualizer`), `src/renderer/src/main.ts` (teclas)
