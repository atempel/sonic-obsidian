# 026 — Estúdio de presets (P0): editar equações com prévia ao vivo

**Fase:** 3 · **Status:** Planejada · **Issue:** [#74](https://github.com/atempel/sonic-obsidian/issues/74) · **Personas:** Criador de Presets, Nostálgico do Winamp (mexer num clássico) ([personas](../research/mercado/personas.md)) · **Depende de:** [021](021-migracao-butterchurn3.md), [022](022-importar-milk.md) · **Segue em:** [027](027-estudio-presets-p1.md)

## Problema
O app já toca e importa presets, mas ninguém consegue mudar um. O Criador de Presets quer "criar e ajustar vendo o resultado na hora" ([personas](../research/mercado/personas.md), §6). A sintaxe do MilkDrop é obscura, e hoje errar uma equação só aparece como tela preta, sem explicação.

## Proposta
Uma tela cheia, o **Estúdio**, por cima do Palco (como as Configurações). À esquerda, a prévia: o mesmo motor, com o áudio do sistema. À direita, as equações do preset em edição. A cada pausa de 400 ms na digitação, o app compila. Se compila, o visual troca na hora. Se não, mostra o erro e **continua tocando a última versão válida**.

Salvar cria sempre um preset **novo** em "Meus", com o crédito do original ("baseado em"). Preset do pacote e importado nunca é sobrescrito.

## Escopo
**P0**
- **Entrada:** tecla `E` (abre o Estúdio com uma cópia do preset atual) e item "Editar uma cópia no Estúdio" no menu "…" da Biblioteca. Entra no painel `?` (`shortcuts.ts`) e na busca de comandos.
- **Fonte editável:** o preset Butterchurn 3 em JSON (`*_eel` + shaders GLSL), seja do pacote, importado ou de "Meus". Os shaders ficam como estão e aparecem só como leitura (edição na 027).
- **Editor** (campo de texto com números de linha, `Tab` = 2 espaços, `Esc` sai do campo): três blocos, `per_frame_init`, `per_frame`, `per_pixel`, com a legenda do protótipo ("Executa uma vez ao carregar o preset" etc.). Nota fixa: "Variáveis disponíveis: bass mid treb bass_att mid_att treb_att time frame fps".
- **Compilação ao vivo:**
  - debounce de 400 ms; `Ctrl+Enter` compila agora;
  - a validação usa o visualizador de teste da 022 (64×64, fora da tela, `onlyUseWASM`), criado ao abrir o Estúdio e descartado ao fechar (`WEBGL_lose_context`);
  - só o que passa é carregado no visualizador principal, com blend curto. Pedidos em fila: vale o último (021);
  - status no topo: "Compilado" / "Compilando…" / "N erros"; rodapé "Compilado às hh:mm:ss".
- **Erros legíveis:** painel "Problemas" (recolhível) com o bloco, a linha quando o motor informar, a mensagem e "Ir para a linha". Com erro, aparece o selo "Mostrando a última versão válida" e a linha fica marcada no editor.
- **Áudio agora:** medidores `bass`, `mid`, `treb` com o valor, vindos do analisador que já existe.
- **Rotação parada** enquanto o Estúdio está aberto, sem mexer no `settings.json`. Ao sair, volta ao estado de antes.
- **Salvar** (`Ctrl+S` e botão "Salvar na biblioteca"):
  - grava `userData/presets/mine/<id>/preset.json` e `meta.json` (`title`, `author`, `basedOn: {name, author}`, `createdAt`);
  - o título começa como "Remix de <nome>", e o crédito mostra "por <você> · baseado em <nome>, por <autor>". O autor original sempre fica preservado;
  - o preset entra na Biblioteca com o rótulo "Meu preset" e o filtro "Meus"; pode ser favoritado e posto em coleções;
  - salvar de novo um "meu" preset sobrescreve o dele e guarda a versão anterior em `preset.prev.json` (histórico completo na 027);
  - nome já existente na biblioteca vira "<nome> (2)". O nome não muda depois do primeiro salvamento (renomear na 027).
- **Remover:** "Remover meu preset" no menu da Biblioteca, com confirmação (apaga a pasta).
- **Sair:** `Esc` fora de um campo volta ao Palco. Com alterações não salvas, o primeiro `Esc` avisa e o segundo, em até 3 s, sai.
- **Segurança (a mesma da 022):** no main, o preset salvo passa pela sanitização: só campos conhecidos, só `*_eel` (nenhum `*_str` nem `useJS`), até 256 KB. Nenhum caminho de disco vem do renderer (o `<id>` é gerado no main).
- **Diagnóstico:** log com uma linha por abrir, salvar e fechar, e por erro novo (nunca por tecla digitada). O HUD mostra o custo da compilação.

**P1:** tudo na [027](027-estudio-presets-p1.md).

## Fora de escopo
Edição de shaders, sliders de parâmetros, ondas e formas, versões, exportar `.milk` (027). MCP e IA (Fase 4). Conversão GLSL → HLSL. Áudio de arquivo (adiado, DECISIONS 2026-11-10). Compartilhar presets.

## Critérios de aceite (Windows, app rodando)
1. Tocando uma música, `E` abre o Estúdio com o preset atual já na prévia e o áudio reagindo. Os medidores `bass`/`mid`/`treb` se mexem com a música.
2. Mudar `zoom = 1.01 + 0.04*bass_att;` para `0.12*bass_att` em `per_frame` muda o visual em até ~1 s depois de parar de digitar. O status passa por "Compilando…" e termina em "Compilado".
3. Apagar um `;` ou um `)` mostra "1 erro" em até ~1 s. O painel Problemas diz o bloco e a mensagem, e a prévia **continua tocando** a versão anterior com o selo "Mostrando a última versão válida". Corrigir o erro tira o selo e atualiza o visual.
4. Um `while(1, 1);` em `per_frame` não congela o app por mais de ~1 s (ou é recusado com mensagem). Se congelar, é bug bloqueante (ver Perguntas).
5. `Ctrl+S` cria "Remix de <nome>" na Biblioteca com o rótulo "Meu preset" e o filtro "Meus". O original continua intacto, e a faixa mostra "baseado em <nome>, por <autor>". Reabrir o app mantém o preset.
6. Editar o preset salvo e salvar de novo sobrescreve só o "meu". O preset do pacote nunca muda.
7. Com o Estúdio aberto, a rotação não troca o preset. Ao sair com `Esc`, volta ao estado de antes. Com mudanças não salvas, o primeiro `Esc` só avisa.
8. Um preset com `*_str` (JavaScript) nunca executa: é recusado ao salvar.
9. 15 min editando e tocando: fps igual ao de antes (HUD), memória da GPU sem alta, log só com linhas de evento. Fechar o Estúdio libera o visualizador de teste.
10. O painel `?` lista "Abrir o Estúdio · E".

## Perguntas em aberto
- **Erro por linha:** o `eel-wasm` informa a linha do erro de sintaxe? Se só devolver a mensagem, o P0 mostra o bloco sem a linha, e a 027 traz um verificador próprio. Descobrir no começo da implementação.
- **Laço infinito:** o `eel-wasm` limita `loop`/`while`? Se não, a validação precisa de teto de tempo (por exemplo, rodar um quadro num Worker) antes de carregar no visualizador principal.
- **Nome do autor:** de onde vem o "por Alexandre"? Sugestão: campo em Configurações › Geral; vazio = "Eu".
- **Variável com erro de digitação** (`bas_att`): no EEL qualquer nome é variável válida (vale 0), então não é erro de compilação. O protótipo a mostra como erro com "Você quis dizer?"; aqui vira aviso na 027. Confirmar.
- **Estúdio como página ou camada:** o protótipo é uma página com topo próprio. Sugestão: camada em tela cheia (como Configurações), com o visual principal na prévia. Dois visuais ao mesmo tempo (original e remix) custam GPU, por isso a comparação é P1.

## Referências
- Protótipo `1794281099-42d3` (`docs/design/v3/SYNC.md`), página `Sonic Obsidian Estúdio.html`. Barra "Protótipo":
  - **Normal:** critérios 1–3 e 5–7;
  - **Com erro:** critério 3 (no protótipo, `bas_att` e `tex2d` são detectados por um verificador de mentira; aqui o erro vem do motor, e os avisos ficam para a 027);
  - **Editado por IA:** banner "Claude Desktop alterou este preset" — Fase 4, fora daqui.
- [Brief v3 — Estúdio](../design/v3/docs/v3-fontes-butterchurn-estudio-mcp.md) §3 e [architecture.md §5](../architecture.md#5-presets-do-usuário-e-estúdio).
- [022](022-importar-milk.md) (validação em 64×64, sanitização), [021](021-migracao-butterchurn3.md) (fila de presets, preset que falha).
- DECISIONS 2026-11-08 ("Remix de …" com crédito) e 2026-11-10 (corte do Estúdio).
