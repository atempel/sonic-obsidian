# Interface v3 — modelo de navegação

> Fonte: briefs da sessão de design no Claude Design (8/nov/2026), artefato "Sonic Obsidian" — páginas *Palco integrado*, *Configurações*, *Setup*, *Estúdio* e *Propostas*. Este arquivo é a referência para o desenvolvimento; o protótipo é a referência visual. Decisão em [DECISIONS.md](../../DECISIONS.md) (2026-11-08, "Interface v3").
> As regras visuais e o *craft floor* (tokens, contraste mínimo de 4,5:1, foco visível, ícones Lucide, sem glifos Unicode) estão no brief visual, ainda não trazido para o repo — ver `queue/2026-11-08-design-v3-brief-visual.md`.

## Mapa

```
                 ┌──────────── Palco (abre aqui) ────────────┐
   L / borda ──► │ Biblioteca (gaveta)   / Ctrl+K ─► Busca     │ ◄── , Ajustes rápidos
   M ──────────► │ Modo Rack             E ─► Estúdio          │ ◄── Ctrl+, Configurações
                 └─────────── Setup/diagnóstico: só quando algo pede ─┘
```

| Lugar | Como chega | O que é |
|---|---|---|
| **Palco** | abre aqui | Só o visual. Faixa de controle inferior aparece ao mexer o mouse e some após 2,5 s (não some com o mouse sobre ela ou com foco num campo). |
| **Biblioteca** | `L`, botão na faixa, alça na borda esquerda (só abre no clique) | Gaveta de 360 px por cima do visual (não redimensiona). Busca, abas Todos / Favoritos / Recentes / Coleções, filtros Importados / Meus, estrela, menu "…" (adicionar à coleção, não mostrar mais, editar uma cópia no Estúdio), botão "Novo preset", rodapé de ocultos. Fecha com `Esc`, `L` ou clique fora. |
| **Busca rápida** | `/` ou `Ctrl+K` | Paleta para tocar algo já, por nome ou autor. Biblioteca = curadoria; busca = tocar. |
| **Modo Rack** | `M` ou botão "Modo compacto" | Mini-player sempre por cima. Com 2 telas: visual em tela cheia na tela escolhida. Com 1 tela: o rack ganha um visor de visual próprio. `M` volta ao Palco. |
| **Ajustes rápidos** | `,` | Painel lateral direito só com o que se mexe durante a música: ganho, rotação (liga/intervalo), blend automático e blend manual. Link "Todas as configurações". |
| **Configurações** | `Ctrl+,` | Tela por cima do Palco (visual atrás a 25%). Navegação lateral + conteúdo; tudo salva sozinho ("Salvo"), sem botão Aplicar. |
| **Estúdio** | `E` (cópia do preset atual), Biblioteca › "Novo preset" ou "Editar uma cópia" | Editor `.milk` com prévia ao vivo — ver [architecture.md](../architecture.md#5-presets-do-usuário-e-estúdio). |
| **Setup / diagnóstico** | quando algo pede | Nunca bloqueia. Cartão de boas-vindas não-modal; avisos de "sem som há 10 s"; painel de "captura falhou" com checklist; erro de WebGL 2 (único bloqueante legítimo); sugestão de modo Rack ao detectar 2 telas. |

## Atalhos (definitivos)
`Espaço` aleatório · `←`/`→` anterior/próximo · `F` favoritar · `R` rotação · `H` esconder controles · `/` ou `Ctrl+K` busca · `L` Biblioteca · `M` Rack · `,` ajustes rápidos · `Ctrl+,` configurações · `E` Estúdio · `Ctrl+Shift+P` pausar controle por IA · `F11` tela cheia · `Esc` fecha o que estiver aberto (paleta › gaveta › ajustes).
Atalhos de letra não disparam com foco em campo de texto.

## Seções das Configurações
1. **Geral** — abrir em (Palco / Rack), iniciar com o Windows, abrir em tela cheia, preset ao abrir (último / aleatório / favorito).
2. **Captura** — fonte do áudio (sistema · microfone · arquivo · SoundCloud), status com medidor ao vivo, "Testar captura", ganho padrão, mostrar título da faixa no visual.
3. **Visual** — rotação, intervalo, ordem, blend automático (padrão 2,7 s), blend manual (padrão 0 s), trocar no beat (fase posterior), crédito do autor sempre visível (desabilitado, sempre ligado).
4. **Renderização** — parâmetros reais do Butterchurn: malha (`meshWidth×meshHeight`), escala de pixels (`pixelRatio`), resolução das texturas (`textureRatio`), FXAA (`outputFXAA`), limite de quadros, tamanho do canvas, imagens extras (`loadExtraImages`).
5. **Desempenho** — pular presets abaixo de N fps, lista "Ocultos por desempenho", mostrar fps na faixa.
6. **Biblioteca** — pacotes (contagem), importar `.milk`, presets ocultos, exportar/importar coleções.
7. **Telas** — tela do visual, Rack sempre por cima, posição do Rack.
8. **Integrações** — MCP (ver [architecture.md](../architecture.md#6-mcp--o-app-como-servidor-local)).
9. **Atalhos** — tabela, restaurar padrões.
10. **Sobre** — versão, créditos (MilkDrop — Ryan Geiss; Butterchurn — Jordan Berg e contribuidores; presets — artistas da comunidade MilkDrop, creditados no nome de cada preset), links.

## Assinatura visual
Na troca de preset, nome e autor entram como o crédito de um disco, com uma linha fina que dura o blend. Troca manual com blend 0 s: a linha enche em 400 ms só como confirmação. Título de faixa (arquivo/SoundCloud) e `show_text` do MCP usam outro tratamento: texto grande central que some em 3 s (`launchSongTitleAnim`).

## Indicadores de fonte e de IA na faixa
- Botão de fonte à esquerda do medidor (ícone por fonte) com menu: sistema / microfone / arquivo… / SoundCloud…. Com arquivo ou SoundCloud aparece uma segunda linha de transporte (play/pausa, título — artista, progresso, tempo, "Ouvir no SoundCloud", voltar ao áudio do sistema).
- Colar uma URL do SoundCloud no Palco abre a confirmação "Tocar do SoundCloud?".
- Arrastar arquivos sobre a janela: camada "Solte para adicionar presets .milk · arquivos de áudio tocam como fonte temporária".
- Com cliente MCP conectado: chip "<cliente> conectado" com as últimas ações, "Pausar controle por IA" e link para Configurações › Integrações; cada ação de IA gera um toast discreto.
