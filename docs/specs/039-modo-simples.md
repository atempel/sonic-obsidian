# 039 — Modo Simples (modos de interface: Simples · Completo)

**Fase:** 2 (interface) · **Status:** pronta · **Issue:** [#111](https://github.com/atempel/sonic-obsidian/issues/111) · **Milestone:** v0.12.0 · **Personas:** Anfitrião de Ambiente (deixa tocando numa festa ou na TV, não quer configurar nada), Nostálgico do Winamp (quer a tela limpa e poucos botões)

## Problema
A faixa de controle, os Ajustes rápidos, a Biblioteca e o painel `?` mostram tudo o que o app sabe fazer. Para quem só deixa o visual tocando, isso é ruído. O usuário decidiu em 10/11/2026 (sessão de design) que haverá modos de interface; o Simples vem primeiro e o Rack fica para a Fase 5.

## Princípio (do design)
Um app, um estado, os mesmos comandos. O modo muda **quanto da casca aparece**, nunca o que o app faz: **todo atalho funciona em todo modo**, a busca rápida acha qualquer comando, e trocar de modo é instantâneo e não perde nada (preset, rotação, coleções, ajustes, perfis). O MCP e o teclado não percebem o modo.

## Proposta
Configuração nova `uiMode: 'simple' | 'full'` em `settings.json`, padrão `'full'` (o app de hoje). O `body` ganha `data-mode` para o CSS.

### Faixa de controle (Simples)
Seguir a página Modos (`body[data-mode=simple] .f { display: none }`): faixa mais estreita (`min(760px, 100%)`) com **agora tocando** (nome e autor), **favoritar**, **anterior · aleatório · próximo**, **tela cheia** e **medidor**. Saem: botão da Biblioteca, pílula de rotação, busca, `?`, Ajustes rápidos e o contador de fps. Os indicadores de estado (segurar, respiro, modo limpo) continuam, porque são estado e não controle. A aba da borda que abre a Biblioteca continua (é o caminho do mouse até ela).

### Ajustes rápidos (`,`) no Simples
Só três seções, nesta ordem: **Sinal** só com o Ganho (ou Ajuste fino, se o Normalizar estiver ligado; a linha do Normalizar sai), **Rotação** só com "Rotação automática" e "Trocar a cada" ("Trocar no beat" sai) e **Texto sobre o visual** inteira. Expressividade, Transições e a barra de Perfil (spec 038, se já existir) não aparecem. No fim da lista, o link **"Todos os ajustes…"** mostra as seções escondidas no mesmo painel até ele fechar. O cabeçalho é o mesmo do Completo (Feedback · Todas as configurações · Fechar, spec 037).

### Biblioteca (`L`) no Simples
Abas **Favoritos** e **Todos**; **Coleções** aparece só quando existe ao menos uma coleção. Saem: a aba Recentes, os filtros Importados/Meus e o botão "Novo preset" (o Estúdio continua no `E`). Se a aba salva for uma que não aparece, abre em Todos. A busca da Biblioteca, o menu de cada preset e a lista ficam iguais.

### Painel `?` no Simples
Os **10 atalhos essenciais**, numa lista só: Aleatório (Espaço), Anterior (←), Próximo (→), Rotação (R), Segurar (Enter), Esconder controles (H), Biblioteca (L), Buscar (/ ou Ctrl+K), Ajustes rápidos (`,`), Tela cheia (F ou F11). Embaixo, o botão **"Ver todos"** troca para a lista completa de hoje (grupos e a seção "Agora"). Os itens saem da lista única `src/renderer/src/ui/shortcuts.ts` (marcação `essential` nas linhas), nada copiado.

### Como trocar
- **Configurações › Geral:** linha **Interface** no topo da seção, segmentado **Simples · Completo · Rack**; Rack desabilitado com a marca "Fase 5" (como a linha "Abrir em" de hoje). A linha "Abrir em" sai (o design a substitui por esta).
- **Busca rápida (`Ctrl+K`), grupo Comandos:** "Modo simples" e "Modo completo"; só aparece o que não está ativo.
- Ao trocar: toast "Modo simples" / "Modo completo" (aviso comum, respeita "Avisos"). Painéis abertos continuam abertos e se redesenham no modo novo.
- Comando de núcleo `ui.setMode` (`{ mode }`), como os outros, para o teclado, a busca e as Configurações usarem o mesmo caminho.

Textos novos só em `i18n/en.ts` + `pt-BR.ts` (spec 030): Simple · Full · Rack em inglês.

## Escopo
**P0** — `uiMode` salvo; faixa, Ajustes rápidos, Biblioteca e `?` reduzidos no Simples; linha Interface nas Configurações; comandos na busca; toast; teste headless `039-modo-simples`.

## Fora de escopo
- Rack em janela e embutido, janela de transmissão e a tecla `M` (Fase 5).
- A pergunta "Como você vai usar?" no cartão de boas-vindas: entra junto com o Rack, quando houver três opções de verdade. Até lá o cartão fica como está e a primeira abertura é Completo.
- Modo performance (`P`), que é um lugar à parte, não um modo de interface.

## Critérios de aceite
1. **Headless — padrão e persistência:** perfil novo abre em Completo (faixa de hoje). Trocar para Simples nas Configurações, recarregar: continua Simples; `settings.json` tem `uiMode: "simple"`.
2. **Headless — faixa:** no Simples a faixa tem exatamente nome/autor, favoritar, anterior, aleatório, próximo, tela cheia e medidor, nessa ordem; largura ≤ 760 px numa janela de 1280 px. No Completo, igual a hoje.
3. **Headless — atalhos em todo modo:** no Simples, `R` desliga a rotação, `→` troca de preset, `L` abre a Biblioteca, `/` abre a busca, `,` abre os Ajustes, `?` abre o painel, `E` abre o Estúdio, `+` muda a Expressividade (o HUD confirma o valor que chegou ao motor).
4. **Headless — Ajustes rápidos:** no Simples, três seções (Sinal só com Ganho, Rotação com duas linhas, Texto inteira); "Todos os ajustes…" mostra as cinco; fechar e reabrir volta às três.
5. **Headless — Biblioteca:** no Simples, sem coleção: abas Favoritos e Todos; criar uma coleção (pelo menu de um preset): a aba Coleções aparece. Sem Recentes, filtros nem "Novo preset". Com Recentes salva como aba, abre em Todos.
6. **Headless — painel `?`:** no Simples, 10 linhas na ordem da spec e o botão "Ver todos"; clicar mostra todos os grupos. No Completo, todos os grupos direto.
7. **Headless — troca sem perder estado:** com uma coleção tocando, rotação a 15 s e Expressividade +2, trocar Simples ↔ Completo pela busca: preset, coleção, rotação e Expressividade iguais (HUD); o comando do modo ativo não aparece na busca; toast mostrado.
8. `npm run test:ui` passa (o `030-idiomas` nos dois idiomas, sem chave sobrando nem texto cortado; os testes de faixa e de Ajustes que já existem rodam em Completo e não mudam).
9. **Windows (testar no bloco):** com música, Configurações › Geral › Interface › Simples: a faixa encolhe para os botões básicos e some como antes; `,` mostra só Ganho, Rotação e Texto; `?` mostra a lista curta. Fechar e abrir o app: continua Simples. `Ctrl+K` › "Modo completo" volta tudo sem o visual piscar.

## Perguntas em aberto
Nenhuma para o usuário. Detalhes que o design deixa abertos foram decididos pela rodada (DECISIONS 2026-11-23, `agent-decided`): quais são os 10 atalhos essenciais; "Todos os ajustes…" mostra as seções no próprio painel (a engrenagem do cabeçalho já abre as Configurações); o que sai da Biblioteca além de Recentes; o cartão de boas-vindas fica para o Rack.

## Referências
- `docs/design/v3/docs/v3-modos.md` (decidido em 10/11/2026) e a página `docs/design/v3/prototype/Sonic Obsidian Modos.html` (`.strip`, `.f`, `#sheet`), espelho na versão `1794603894-598c`. O artefato está em `1794680346-fb12` (sync pendente na #124), mas `v3-modos.md` (`b98df33e8aa3`) e a página Modos (`b181ae2895c7`) são idênticos nas duas.
- Specs 011 (Ajustes rápidos), 020 (painel de atalhos e lista única), 023 (coleções no Palco), 030 (idiomas), 037 (cabeçalho dos Ajustes), 038 (perfis).
