# 012 — Setup, diagnóstico e desempenho

**Fase:** 2 · **Status:** A fazer · **Issue:** [#25](https://github.com/atempel/sonic-obsidian/issues/25) · **Depende de:** [008](008-nucleo-comandos-persistencia.md), [009](009-palco-faixa-assinatura.md); P2 depende da [011](011-ajustes-configuracoes.md)

## Problema
Quando algo dá errado (captura recusada, sem WebGL 2, nenhum som chegando) o app fica preto ou parado sem dizer por quê, e na primeira abertura ninguém sabe os atalhos. Alguns presets derrubam o fps e não há como identificá-los nem pular.

## Proposta
Superfícies **não-modais** que nunca bloqueiam o visual: um cartão de boas-vindas na primeira abertura e diagnósticos que só aparecem quando algo falha, com texto do protótipo e ações concretas. Como P2, medir o fps de cada preset e oferecer pular e ocultar os pesados.

## Escopo
**P0 — primeira abertura**
- O app abre já tocando (como hoje). ~800 ms depois, só na primeira execução, aparece o cartão "Já está ouvindo o seu computador" / "Toque música em qualquer app e o visual reage. Nada para configurar.", com os atalhos Espaço "Preset aleatório", / "Buscar", L "Biblioteca", e os botões "Entendi" e "Abrir configurações".
- Não-modal: as teclas do visual continuam funcionando com o cartão aberto. Fecha com "Entendi" ou `Esc` e não volta (flag em `settings.json`).

**P0 — diagnósticos**
- **Sem som** (`role="status"`): depois de 10 s de silêncio (a detecção da 005), "Nenhum som chegando" / "A captura está ligada. Toque algo ou confira se o som está saindo pela saída padrão do Windows." + "Testar captura": por 3 s mostra um medidor ao vivo e "sinal"/"sem sinal". `Esc` fecha; volta na próxima vez que o silêncio passar de 10 s. Une-se ao aviso do Palco (009): os dois mostram um texto só.
- **Captura falhou** (`role="alert"`, `Esc` não fecha): "Não foi possível capturar o áudio" com o checklist Saída padrão encontrada / Permissão de captura do sistema / Formato de áudio / Teste de sinal, cada um com o estado real (ok, Falhou, Pendente) e a ajuda do protótipo para a permissão recusada. Botões "Tentar de novo" (refaz cada passo e mostra "Verificando", depois "Captura funcionando" e fecha), "Abrir configurações de som do Windows" (`ms-settings:sound`) e "Copiar diagnóstico" (texto com versão, data, fonte e itens; "Copiado" por 2 s).
- **WebGL 2 indisponível** (`role="alert"`): "Este computador não suporta WebGL 2" / "O motor visual (Butterchurn) precisa de WebGL 2 para desenhar os presets. Normalmente isso se resolve atualizando o driver de vídeo.", "Detalhes técnicos" (GPU e driver lidos de `WEBGL_debug_renderer_info` / `app.getGPUInfo`), "Copiar diagnóstico". O app não quebra: o resto da UI funciona.

**P2 — desempenho por preset**
- Medir o fps médio de cada preset nos primeiros segundos depois do blend e guardar em `library.json`.
- Abaixo do mínimo, mostrar na faixa um chip "<N> fps · preset pesado" + "Pular e ocultar" (oculta por desempenho e vai para outro aleatório).
- Configurações › Desempenho: "Pular presets lentos" (ligado), "Mínimo de fps" 15–60, passo 5 (padrão 30), lista "Ocultos por desempenho" com "Restaurar" e o vazio do protótipo.

## Fora de escopo
"Duas telas" e o modo compacto (Fase 5, Rack). "Iniciar com o Windows" no cartão (Fase 5). Escolha de dispositivo de captura (Fase 3). Link para o driver de um fabricante específico (o protótipo aponta para a Intel; aqui o link é genérico ou some).

## Critérios de aceite (estados da barra "Protótipo" do Setup e do Palco integrado)
1. **Primeira abertura:** apagando o `settings.json`, o app abre tocando e ~1 s depois aparece o cartão; `Espaço` troca o preset com o cartão aberto; "Entendi" fecha; ao reabrir o app ele não aparece.
2. **Sem som por 10 s:** pausando a música, o aviso aparece em ~10 s; "Testar captura" com a música voltando mostra "sinal".
3. **Captura falhou:** com outro app usando a saída em modo exclusivo (ou a captura recusada de outro jeito), aparece o checklist com "Permissão de captura do sistema — Falhou"; liberando a saída, "Tentar de novo" leva a "Captura funcionando" e o visual volta a reagir.
4. "Copiar diagnóstico" põe na área de transferência um texto com versão, data e o estado de cada item.
5. **WebGL 2:** forçando a falta de WebGL 2 (ex.: `--disable-webgl2` ou flag de teste), aparece o erro com GPU e driver, sem tela preta muda nem exceção não tratada.
6. Nenhuma dessas superfícies impede usar as teclas do visual (exceto quando o próprio visual não existe, no caso do WebGL).
7. (P2) **Preset pesado:** num preset abaixo do mínimo, o chip aparece com o fps medido; "Pular e ocultar" troca o preset e ele passa a constar em "Ocultos por desempenho", de onde "Restaurar" o devolve.

## Perguntas em aberto
- Como provocar a captura recusada de forma reproduzível no Windows para o teste 3? Levantar na implementação (WASAPI exclusivo de um player, ou flag de teste).
- Medir fps por preset custa algo visível? Proposta: só medir, sem gravar a cada quadro.

## Referências
- Protótipo v3 `1794154301-3f85` ([SYNC.md](../design/v3/SYNC.md)): `Sonic Obsidian Setup.html` — estados Primeira abertura, Sem som por 10 s, Captura falhou, WebGL 2 indisponível (Duas telas fica fora); `Sonic Obsidian Palco integrado.html` — estado Preset pesado; `Sonic Obsidian Configurações.html` › Desempenho
- Spec [005](005-sinal-entrada.md) (detecção de silêncio); DECISIONS 2026-11-08 (spec 004, "Ocultos por desempenho")
