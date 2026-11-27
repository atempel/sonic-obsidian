# 048 — Ajustes do design fb12: Respiro, "Adiantar o visual" em Captura e `Esc` na espera do beat

**Fase:** 3 (correções da 024/032) · **Status:** implementada (PR da #213; critério 10 no teste do bloco v0.12.0) · **Issue:** [#213](https://github.com/atempel/sonic-obsidian/issues/213) · **Personas:** as mesmas da 024 · **Design:** `Palco integrado` e `Configurações`, versão `1794680346-fb12` (`docs/design/v3/docs/v3-respostas-divergencias.md` › "Rodada de 14/11/2026")

## Problema
A sessão de design de 14/11 aceitou o que as specs 024 e 032 fizeram sem desenho (DIVERGENCIAS 2026-11-10, 024 revisão 2), com três correções que o app ainda não tem (stub `queue/2026-11-23-design-fb12-respiro-adiantar.md`):
1. O **Respiro** (`Shift+Enter`) aparece como uma etiqueta **violeta** com o ícone `volume-x` abaixo do autor. Violeta é marca/seleção; `volume-x` é o ícone do estado "sem som" (checklist da captura) e confunde os dois.
2. **"Adiantar o visual"** está em Configurações › Visual › Transição, mas é sobre o tempo do áudio: o lugar é Configurações › Captura, junto de "Atrasar o visual" (spec 032).
3. Na espera de uma troca manual no beat (M23, spec 043), não há como desistir: `Esc` só fecha painéis ou sai da tela cheia.

## Proposta
1. **Respiro na linha do título.** Sai a `.breath-tag` de baixo do autor. O indicador vai para a `.now-row`, ao lado do indicador do Modo limpo (`.clean-ico`), com o ícone **`wind`** (Lucide, mesma origem dos outros ícones de `icons.tsx`) e o texto "Respiro" em `text-2`, 12 px; o título encurta com reticências para caber. Sem violeta. Mesmo ícone `wind` na linha do Respiro do painel `?` (`shortcuts.ts`). Toasts novos: "Respiro: o visual segue sem o áudio." / "Respiro desligado." (en: "Rest: the visual runs without the audio." / "Rest off."). O `title` do indicador continua dizendo como voltar (`Shift+Enter`).
2. **"Adiantar o visual" em Captura.** A linha `st-lead` sai de Configurações › Visual › Transição e entra em Configurações › Captura, no grupo da sincronia, logo abaixo de "Atrasar o visual". Slider de 0 a 200 ms, passo 10, padrão 70, valor em mono (como já é). Ajuda nova: "Compensa o atraso entre o som e a imagem. Aumente se o visual parecer atrasado." (en: "Makes up for the delay between sound and picture. Raise it if the visual feels late."). Continua desabilitada quando "Trocar no beat" e "Trocas manuais no beat" estão desligadas (spec 043); nesse caso a ajuda diz que vale com uma das duas ligada (texto existente ou novo, sem mudar a regra). A busca rápida e a busca das Configurações levam à linha no lugar novo. O valor salvo (`rotation.beatLeadMs`) não muda de chave.
3. **`Esc` cancela a espera do beat.** Com uma troca manual esperando a batida (botão tracejado, evento `beatWait` com `key`), `Esc` cancela o pedido: o preset não troca, o tracejado some e nada mais acontece nesse toque (não fecha painel nem sai da tela cheia). Sem espera, `Esc` faz o que já faz. Campo de texto com foco segue com o `Esc` dele.

## Escopo
- **P0:** os três itens acima, chaves novas em `i18n/en.ts` e `pt-BR.ts` (as que ficarem sem uso saem), entrada de `Esc` no painel `?` ("Cancelar a troca no beat" junto de "Fechar painel ou gaveta"), DIVERGENCIAS 2026-11-10 (024 revisão 2) marcada como resolvida pela versão `fb12`, stub da `queue/` como `Ingested`.
- **Fora de escopo:** mudar a regra do M23 (último pedido vale, troca na hora sem batida), o valor padrão do adiantamento, os ícones do Modo limpo e do checklist da captura.

## Critérios de aceite
| # | Critério | Como verificar |
|---|---|---|
| 1 | Com o Respiro ligado, o indicador `wind` + "Respiro" aparece na linha do título, ao lado do ícone do Modo limpo quando os dois estão ligados; nenhum elemento violeta nem `volume-x` no Respiro; título longo termina em reticências sem empurrar o indicador para fora | headless (DOM + estilo computado) |
| 2 | `Shift+Enter` mostra os toasts novos ao ligar e ao desligar, nos dois idiomas | headless |
| 3 | O painel `?` mostra o ícone `wind` na linha do Respiro e a linha de `Esc` para cancelar a troca no beat | headless |
| 4 | Configurações › Captura tem "Adiantar o visual" abaixo de "Atrasar o visual", 70 ms por padrão, com a ajuda nova; Configurações › Visual não tem mais a linha; desabilitada com as duas opções de beat desligadas | headless (024 e 043 ajustados) |
| 5 | Buscar "adiantar" (pt) / "lead"/"latency" leva à linha em Captura | headless |
| 6 | Mexer no slider no lugar novo muda o adiantamento do detector (linha `beat` do HUD/`settings.json`), como antes | headless |
| 7 | Com "Trocas manuais no beat" ligada e batida estável, `→` e depois `Esc` antes da batida: o preset não troca, o tracejado some, o painel aberto (se houver) continua aberto e a tela cheia continua | headless (024 simula o bumbo) |
| 8 | Sem espera, `Esc` fecha painel / sai da tela cheia como antes | headless (testes existentes) |
| 9 | `030-idiomas` sem chave sem uso nem texto cortado | headless |
| 10 | No Windows, com música: o indicador do Respiro fica legível sobre presets claros e escuros; `Esc` na espera parece imediato | testar no bloco |

## Decisões tomadas no planejamento (`agent-decided`)
- `Esc` cancela a espera **antes** de fechar painel ou sair da tela cheia: a espera dura no máximo ~1,5 batida e quem aperta `Esc` nesse intervalo está desistindo da troca. O design não diz a ordem.
- O `?` ganha uma linha para o `Esc` da espera (o painel é a lista única de atalhos, `AGENTS.md`).
- Sem toast ao cancelar: o tracejado sumindo já é o retorno, e o design não pede texto novo.

## Perguntas em aberto
Nenhuma.

## Referências
- `docs/design/v3/docs/v3-respostas-divergencias.md` › "Rodada de 14/11/2026" (linhas de M23, Respiro e Adiantar o visual); páginas `Palco integrado` e `Configurações`, versão `1794680346-fb12`.
- Specs 024 (Respiro, M23), 032 ("Atrasar o visual"), 043 (trocas manuais no beat).
- Código: `src/renderer/src/ui/Overlay.tsx` (`.breath-tag`, `.clean-ico`), `ui/palco.css`, `ui/Settings.tsx` (`st-lead`, `st-delay`), `ui/shortcuts.ts`, `main.ts` (`pending`/`setPending`, `Esc`), testes `024-beat`, `043-beat-manual`, `030-idiomas`.
