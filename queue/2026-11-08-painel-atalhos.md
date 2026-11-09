# Painel de atalhos (`?`) e busca rápida com comandos — design 1794178325-0fd0
Status: Incorporada — [spec 019](../docs/specs/019-painel-atalhos-comandos.md), issue #51
Fonte: docs/design/v3/docs/v3-modelo-de-navegacao.md (seção "Painel de atalhos"); protótipo `Sonic Obsidian Palco integrado.html` (painel, dica na faixa e grupo "Comandos" na paleta) e `Modo performance.html` (versão com o teclado dos pads)
Resumo: `?` abre um mapa de todos os atalhos (diálogo centralizado, sem animação, com filtro, grupos em duas colunas e o grupo do lugar atual no topo, em "Agora"), com a dica "`?` Atalhos" na faixa e o link "Personalizar em Configurações › Atalhos". A busca rápida (`/`, `Ctrl+K`) passa a achar também comandos, cada um com a tecla ao lado, e Enter executa.
Destino provável:
- Spec nova na Fase 2 (planejar com `planejar-feature`). Usar só as teclas que existem no app (o design ainda lista `F` para favoritar e teclas das Fases 3–5).
- As Configurações já têm a tabela de atalhos (spec 011). O painel pode reaproveitar a mesma lista e abrir as Configurações na seção Atalhos.
