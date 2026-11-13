# Divergências entre o código e o protótipo

Quando a implementação precisar se afastar do protótipo (limite técnico, desempenho, decisão nova), registre aqui **antes do PR**. A sessão de design lê este arquivo sempre que volta a refinar o artefato e responde marcando o status.

Formato (uma entrada por divergência, mais recente no topo):

```
### AAAA-MM-DD — <página> · <elemento>
Protótipo (versão): o que o desenho mostra
Código: o que foi feito e por quê
PR/spec: #N · docs/specs/NNN
Status: Aberta | Aceita (design atualizado na versão X) | Recusada (código volta ao desenho)
```

## Entradas

### 2026-11-08 — Atalhos e Ajustes rápidos · expressividade
Protótipo (`1794165177-f126`): não existe controle de expressividade. O ganho é um slider nos Ajustes rápidos, sem tecla.
Código (spec 015): `+`/`−`/`0` mudam a **Expressividade** (−3…+3), `X` o **Caráter** (Contraste / Energia / Nervo) e `Shift+X` a **Memória** (Curta / Longa / Fixa). O ganho fica só no slider, como no protótipo. Motivo: o motor normaliza os níveis em ~4 s e o ganho só tem efeito passageiro (DECISIONS).
PR/spec: docs/specs/015-expressividade.md · #36
Status: Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Controles da janela · arrasto
Protótipo (`1794165177-f126`): `docs/v3-modelo-de-navegacao.md` › Controles da janela diz "Arrastar a janela: pelo visual (spec 004); a zona dos controles não arrasta".
Código (spec 014): desde a 009 o arrasto é só pela faixa invisível de 40 px no topo (decisão do usuário: no Windows a região de arrasto engole o `mousemove`, e a faixa de controle e a zona do canto não detectariam o ponteiro). A faixa passa a terminar antes da zona dos controles (`right: 166px`).
PR/spec: docs/specs/014-texto-sobre-visual-janela.md · #34
Status: Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Ajustes rápidos e atalhos · tipo de transição
Protótipo (`1794165177-f126`): os Ajustes rápidos e Configurações › Visual têm só o tempo do blend ("Blend na troca automática", "Blend quando você troca", padrão manual 0 s); não há tipo de transição nem teclas para isso.
Código (spec 013): cada troca (manual e automática) ganha **tipo** (Corte seco, Crossfade, Varredura, Plasma, Radial, Aleatório) e tempo; padrão manual = Aleatório 1 s. Teclas novas: `B`/`Shift+B` ciclam o tipo manual, `↑`/`↓` mudam o tempo, Shift na troca (`Shift+→`, `Shift+←`, `Shift+Espaço`) = corte seco. `+`/`−`/`0` passaram para a Expressividade (spec 015; ver a entrada acima). O tipo da troca automática não tem tecla: só Ajustes rápidos (011) e, até lá, o `settings.json`.
PR/spec: docs/specs/013-transicoes.md · #31
Status: Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Palco integrado · Biblioteca e busca rápida (cortes de fase e ajustes)
Protótipo (`1794165177-f126`): a gaveta tem "Novo preset" (Estúdio), chips "Importados"/"Meus", tags de preset importado/criado com IA, item "Editar uma cópia no Estúdio" no menu e miniaturas renderizadas do preset; o submenu "Adicionar à coleção" lista só as coleções existentes.
Código: sem Estúdio, importação e IA (Fases 3–4), então esses itens não aparecem. Miniaturas são um gradiente estável por nome até haver captura de quadro. O submenu ganhou "Nova coleção" no fim. A aba Coleções da busca, sem coleções, diz "Nenhuma coleção ainda. / Crie coleções na Biblioteca (L)." (texto que o protótipo não tem).
PR/spec: docs/specs/010-busca-biblioteca.md
Status: Aceita (design atualizado na versão 1794281099-42d3). Ação no repo: trocar o texto do vazio de coleções na busca para "Nenhuma coleção ainda. · Crie uma pelo botão de coleção na faixa ou na Biblioteca (L)."

### 2026-11-08 — Palco integrado · faixa de controle (itens fora da Fase 2)
Protótipo (`1794154301-3f85`): a faixa tem botão de fonte de áudio (`monitor-speaker`), modo compacto (`M`), chips de IA e de preset pesado, e o `title` da estrela diz "Favoritar (F)".
Código: sem fonte de áudio, modo compacto e chip de IA (Fases 3–5); o chip de preset pesado entra na spec 012. A estrela não cita tecla (`F` é tela cheia, ver a entrada de `F`) e o botão de tela cheia diz "(F ou F11)". Biblioteca, busca e Ajustes aparecem desabilitados até as specs 010/011.
PR/spec: docs/specs/009-palco-faixa-assinatura.md
Status: Aberta só como registro (corte de fase, não pedido de mudança no desenho).

### 2026-11-08 — Palco · área de arrasto da janela
Protótipo (`1794154301-3f85`): não trata de arrasto (é uma página web).
Código: a janela sem moldura arrasta por uma faixa invisível de 40 px no topo (decisão do usuário; DECISIONS, spec 009). O resto do visual recebe o mouse, para a faixa de controle aparecer.
PR/spec: docs/specs/009-palco-faixa-assinatura.md
Status: Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — atalhos globais · `F`
Protótipo (`1794154301-3f85`): `F` favorita o preset atual; `F11` é tela cheia.
Código: `F` alterna tela cheia (igual a `F11`), por decisão do usuário. Favoritar fica na estrela da faixa (spec 009) e em `Ctrl+F` na busca (spec 010), sem atalho global por enquanto.
PR/spec: docs/specs/008-nucleo-comandos-persistencia.md
Status: Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Configurações › Captura · Ganho padrão
Protótipo (`1794154301-3f85`): "Ganho padrão" é um slider linear de 0,5× a 2× (padrão 1,0×), enquanto os Ajustes rápidos usam −12 a +12 dB com padrão +3 dB.
Código (planejado): dB nos dois lugares, −12 a +12, padrão **0 dB** — uma unidade só para o mesmo valor, e 0 dB = sinal como chega (o +3 do protótipo seria um reforço escondido).
PR/spec: docs/specs/011-ajustes-configuracoes.md
Status: Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Configurações › Renderização · Limite de quadros
Protótipo (`1794154301-3f85`): opções 30 / 45 / 60 / 144 / Sem limite, padrão 60.
Código: hoje o padrão é `'monitor'` (taxa da tela, spec 004). Planejado seguir o protótipo: padrão 60 e "Sem limite" = taxa do monitor.
PR/spec: docs/specs/011-ajustes-configuracoes.md
Status: Aberta só como registro; o código vai ao desenho na 011.

### 2026-11-08 — Palco integrado e Setup · texto do aviso de silêncio
Protótipo (`1794154301-3f85`): o Palco mostra "Sem áudio" / "Toque algo no computador e o visual reage. A captura continua ligada."; o Setup mostra "Nenhum som chegando" / "A captura está ligada. Toque algo ou confira se o som está saindo pela saída padrão do Windows." — dois textos para o mesmo estado (10 s de silêncio).
Código: a spec 005 usa "Nenhum som chegando". As specs 009/012 mostram um aviso só.
PR/spec: docs/specs/009-palco-faixa-assinatura.md, docs/specs/012-setup-diagnostico-desempenho.md
Status: Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — atalhos globais e Ajustes rápidos · ganho
Protótipo (`1794154301-3f85`): o ganho é um slider nos Ajustes rápidos / faixa (Palco integrado, `#gainMini`) de −12 a +12 dB em passos de 1 dB; não há atalho de teclado para ganho.
Código: faixa e passo **alinhados ao protótipo** (−12 a +12 dB, 1 dB), depois que o teste mostrou que +6 a +9 dB bastam para a barra chegar à metade. As teclas `+`/`−`/`0` saíram do ganho e passaram para a Expressividade (spec 015). O ganho fica só no slider, como no protótipo.
PR/spec: (PR da spec 005) · docs/specs/005-sinal-entrada.md
Status: Aceita (o código volta ao desenho: ganho sem tecla).

### 2026-11-08 — atalhos globais · `[` / `]`
Protótipo (`1794154301-3f85`): `[`/`]` não estão nos atalhos globais; em `v3-video-vj.md` §6 eles controlam a opacidade da camada de vídeo (frente VJ, ainda pendente no PRD). O intervalo da rotação fica nos Ajustes rápidos e em Configurações › Visual.
Código: `[`/`]` mudam o intervalo da rotação (10/15/30/60/120 s), porque não há UI na Fase 1 para ajustar o intervalo (spec 003, P1).
PR/spec: #13 · docs/specs/003-rotacao-automatica.md
Status: Aceita (design atualizado na versão 1794281099-42d3). Ação no repo: na spec do vídeo, `[`/`]` viram opacidade do vídeo e o intervalo fica só nos Ajustes.

### 2026-11-08 — Palco integrado · M18, carência do silêncio
Protótipo (`1794175739-7509`, `docs/v3-microinteracoes.md` M18): o painel "Sem áudio" aparece depois de 1,2 s de silêncio contínuo. **No app:** continua em 10 s (spec 005, decisão do usuário reafirmada em 08/11), para que as pausas entre faixas não mostrem o painel. Do M18 entram o fade de 220 ms na volta do som e o medidor apagando em cascata. Ver DECISIONS 2026-11-08 "Microinterações: o que entra e quando". **Status:** Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Palco integrado · transições nos Ajustes rápidos
Protótipo (`1794175739-7509`, painel `#sheet`): "Blend na troca automática" e "Blend quando você troca" são sliders de 0 a 5 s, em que 0 é corte seco. **No app:** cada troca tem um seletor de tipo (Corte seco / Crossfade / Varredura / Plasma / Radial / Aleatório) e o tempo, de 0,1 a 5 s, que some com Corte seco (spec 013 e spec 011). Os dois ficam numa seção "Transições", e a Expressividade (spec 015) ganha seção própria logo depois de Sinal. **Status:** Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Configurações · seção inicial
Protótipo: as Configurações abrem em Captura. **No app:** abrem em Geral (decisão do usuário, spec 011). **Status:** Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Configurações · diferenças da implementação (spec 011, PR 2)
Protótipo `1794175739-7509`, página Configurações. **No app:**
- **M10 no menu lateral:** o protótipo só tem o indicador deslizante nas abas horizontais. Aqui ele foi adaptado ao menu vertical, como uma barra de 2 px à esquerda que desliza até a seção (t-med). Nas abas da Biblioteca, segue o protótipo.
- **Transição:** um seletor de tipo e o tempo de 0,1 a 10 s, no lugar dos dois sliders de 0 a 10 s (spec 013).
- **Testar captura:** sem som em 3 s, mostra "Nenhum som em 3 s. Toque algo no computador e tente de novo." O protótipo não tem esse estado.
- **Atalhos:** a tabela traz os atalhos reais da Fase 2 (B, ↑/↓, +/−/0, X, Shift+X, F para tela cheia). Saem "Favoritar F", Modo Rack, Estúdio e IA, que são de outras fases. Regravar tecla é P1, e "Restaurar padrões" fica desabilitado.
- **Desempenho** mostra só "Mostrar fps na faixa". Pular presets lentos, Mínimo de fps e Ocultos por desempenho chegam com a spec 012.
- **Biblioteca › Pacotes** mostra só a contagem total. Pacote extra para baixar e importar `.milk` são da Fase 3.
- **Sobre** ganha a linha "Licenças de terceiros" (abre o THIRD_PARTY_NOTICES) e mostra a versão do `package.json`.
**Status:** Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-08 — Setup e Palco · diferenças da spec 012
Protótipo `1794178325-0fd0` (Setup, Palco integrado, Configurações › Desempenho). **No app:**
- **Aviso de silêncio:** o Palco do protótipo tem "Sem áudio" (1,2 s) e o Setup tem "Nenhum som chegando". O app usa só o do Setup, aos 10 s, com "Testar captura".
- **Boas-vindas:** sem "M Modo compacto" e sem "Iniciar com o Windows" (Fase 5).
- **WebGL 2:** sem o botão "Como atualizar o driver" (o protótipo aponta para a Intel); GPU e driver são lidos da máquina.
- **Checklist da captura:** estados reais em vez do tempo fixo do protótipo. O rótulo do estado continua só para leitor de tela, como no protótipo.
- **Preset pesado:** o aviso fica logo acima da faixa, alinhado à direita, e não dentro da cauda (com busca, ajustes e tela cheia, não cabe sem cobrir a Rotação). "Pular presets lentos" avisa e não oculta sozinho (DECISIONS).
**Status:** Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-09 — Painel de atalhos e comandos da busca · diferenças da spec 020
Protótipo `1794178325-0fd0`, página Palco integrado (`#kPanel`, `kbdBtn`, comandos da paleta). **No app:**
- **F é tela cheia** (como F11), não "Favoritar" (decisão do usuário). Na busca, "Favoritar preset atual" aparece sem tecla.
- **Grupos:** só as teclas que existem. Saem Vídeo, IA, Modo Rack (M) e Estúdio (E), que são das Fases 3–5. Entram **Expressividade** (+/−/0, X, Shift+X), as teclas da transição (B, ↑/↓, corte seco com Shift) e **Diagnóstico** (Ctrl+Shift+D, Ctrl+Shift+L). F12 fica de fora.
- **Comandos da busca:** além dos do protótipo (menos Modo Rack), entram Preset aleatório, Próximo, Anterior e Esconder controles.
- **Boas-vindas:** a linha "Aperte ? para ver todos os atalhos" é clicável e abre o painel.
- **`?` com o foco no filtro do painel** fecha o painel em vez de filtrar por "?".
**Status:** Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-10 — Importar .milk · diferenças da spec 022
Protótipo `1794178325-0fd0` (Palco integrado: `#dropzone`, rótulo "Importado", filtro "Importados"; Configurações › Biblioteca, linha "Importar presets .milk"). **No app:**
- **Área de soltar:** só a linha "Solte para adicionar presets .milk". A linha "Arquivos de áudio tocam como fonte temporária" sai: a fonte "arquivo de áudio" ainda não existe (Fase 3, outra spec).
- **Resumo:** o toast diz quantos entraram, quantos já estavam na biblioteca (nome igual é pulado, decisão do usuário) e quais não converteram. Nas Configurações, a nota também lista o motivo de cada falha. O protótipo só mostra o caso de sucesso.
- **Remover importado:** fica no menu "…" da linha. O protótipo não desenha remoção.
- **Contagem:** "Base" mostra só os presets que vêm com o app; os importados aparecem na linha de importar ("N importados").
**Status:** Aceita (design atualizado na versão 1794281099-42d3).

### 2026-11-10 — Coleções pelo Palco (spec 023, sem desenho)
Protótipo `1794178325-0fd0` não tem esta tela. **No app:**
- um botão `folder-plus` ao lado da estrela, na faixa;
- um painel no estilo do menu "…" da Biblioteca, com uma linha marcável por coleção (`menuitemcheckbox`) e "Nova coleção" com campo de nome;
- sem atalho de teclado (decisão do usuário).
A sessão de design pode propor o desenho definitivo.
**Status:** Aceita (design atualizado na versão 1794281099-42d3). Ação no repo: ponto violeta de 4 px no botão quando o preset atual está em alguma coleção e o toast "Criada “Nome” com este preset."

### 2026-11-10 — Troca no beat e segurar · diferenças da spec 024
Protótipo `1794281099-42d3`, página Palco integrado (`#beatSwitch`, `.bdot`, `.ibtn.wait`, M23) e Configurações (linha `beat`). **No app:**
- **Segurar (`Enter`):** a área da rotação na faixa troca o ícone por um cadeado e mostra "Segurado" (spec 024; o protótipo não desenha). Um toast confirma: "Visual segurado. Enter solta." / "Visual solto."
- **Ponto de beat:** fica dentro do botão da rotação, depois da contagem, e só aparece com "Trocar no beat" ligado e a batida estável. No protótipo, `#bdot` está no Rack.
- **Ajustes rápidos:** com "Trocar no beat" ligado, "Trocar a cada" lista 4/8/16/32 compassos, e uma nota diz o intervalo de reserva ("Sem batida estável, troca a cada 30 s. Enter segura o visual.").
- **Configurações › Transição:** além do switch "Trocar no beat", uma linha "Compassos" com o mesmo seletor.
- **M23:** um segundo pedido durante a espera substitui o primeiro (spec 024); no protótipo, repetir a mesma tecla cancela.
**Status:** Aberta (aguarda a sessão de design).

### 2026-11-10 — Troca no beat, revisão 2 (spec 024): Respiro e adiantamento
Sem desenho no protótipo `1794281099-42d3`. **No app:**
- **Respiro (`Shift+Enter`):** o visual fica sem o áudio. A faixa mostra a etiqueta "Respiro" (ícone `volume-x`, em violeta) abaixo do autor, e um toast confirma.
- **Configurações › Transição:** a linha "Adiantar o visual" (0–200 ms, padrão 70) fica abaixo de "Trocar no beat".
**Status:** Aberta (aguarda a sessão de design).

### 2026-11-10 — Estúdio P0 (spec 026), protótipo `1794281099-42d3`, página `Sonic Obsidian Estúdio.html`
**No app:**
- **Camada em tela cheia** sobre o Palco (decisão do usuário), não uma página. A prévia é o próprio visual principal, visto pela coluna da esquerda (moldura com "Seu remix"), e não um canvas 16:9 à parte. Sem "Comparar com o original", "Testar troca", "Capturar quadro", "Versões" e "Exportar .milk" (027).
- **Só a aba "Código"**, com os três blocos de equações. Shaders aparecem num bloco recolhível só de leitura. As abas Básico/Ondas/Formas/Shaders são da 027.
- **Medidores de "Áudio agora"** em barra contínua, não em segmentos.
- **Nome do autor:** no primeiro salvamento, um balão abaixo de "Salvar na biblioteca" pergunta "Seu nome nos presets" (decisão do usuário). Depois, o campo fica em Configurações › Geral › Meus presets.
- **Erros vêm do motor**, com bloco e linha. `bas_att` não é erro (avisos na 027). Um laço longo vira o erro "Laço sem fim ou longo demais" ou "Lento demais: N ms por quadro".
- **Biblioteca:** rótulo "Meu preset", filtro "Meus" ao lado de "Importados", e no menu "…" os itens "Editar uma cópia no Estúdio" (ou "Editar no Estúdio", se for meu) e "Remover meu preset".
**Status:** Aberta (aguarda a sessão de design).

### 2026-11-11 — Expressividade: marcar o padrão e "Normalizar áudio" (spec 028, sem desenho)
- **Pedido do usuário:** nos Ajustes rápidos › Expressividade, as opções padrão aparecem marcadas ("· padrão" em Energia e Curta; Nível 0), há um "Restaurar padrão" e, com Nível 0, o Caráter diz "sem efeito no nível 0". O toast de `X`/`Shift+X` diz "(padrão)".
- **"Normalizar áudio"** (ganho automático, desligado por padrão): interruptor nos Ajustes rápidos, junto do Ganho, e em Configurações › Áudio, com o ganho aplicado em mono ("auto +5 dB"). O Ganho vira ajuste fino de ±6 dB.
- **Silêncio:** os presets recebem zero (não neutro); o escurecimento e a desaceleração continuam como estão.
- **Pedido à sessão de design:** desenhar as duas coisas na página Palco integrado › Ajustes rápidos, conferindo antes a versão `1794352628-1d72`, que o espelho ainda não tem.
