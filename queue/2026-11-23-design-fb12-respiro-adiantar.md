# Design fb12: Respiro, "Adiantar o visual" em Captura e `Esc` na espera do beat
Status: Ingested (spec 048, #213)
Fonte: docs/design/v3/ (versão `1794680346-fb12`): `docs/v3-respostas-divergencias.md` › "Rodada de 14/11/2026", páginas `Palco integrado` e `Configurações`; DIVERGENCIAS 2026-11-10 (024, revisão 2)
Resumo: a sessão de design aceitou o que a 024 e a 026 fizeram sem desenho, com três ajustes que o app ainda não tem:
1. **Respiro (`Shift+Enter`):** sai a etiqueta violeta com `volume-x` abaixo do autor. Fica ao lado do indicador do Modo limpo, na linha do título (o título encurta com reticências), ícone `wind`, "Respiro" em `text-2`, 12 px. Mesmo ícone no painel `?` (`shortcuts.ts`). Toasts: "Respiro: o visual segue sem o áudio." / "Respiro desligado." (en a escrever). Motivo: violeta é marca/seleção; `volume-x` é o ícone do "sem som".
2. **"Adiantar o visual"** (0–200 ms, padrão 70) sai de Configurações › Visual › Transição e vai para **Configurações › Captura**, junto da "Atrasar o visual" da 032; ajuda "Compensa o atraso entre o som e a imagem. Aumente se o visual parecer atrasado.".
3. **`Esc` cancela a espera** de uma troca no beat (M23); hoje o `Esc` só fecha painéis ou sai da tela cheia (`src/renderer/src/main.ts`).
O resto da rodada de 14/11 (Segurado com `lock`, ponto de beat no botão, compassos, Estúdio P0 como camada, nome do autor, Biblioteca "Meus") já está igual no app.
Destino provável: uma issue pequena de interface (correções da 024), `ready` no milestone aberto mais antigo com vaga; mexe nas chaves de `i18n/en.ts`/`pt-BR.ts` e no teste `030-idiomas`.
