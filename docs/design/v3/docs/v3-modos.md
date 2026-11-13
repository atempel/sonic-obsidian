# Sonic Obsidian v3 — Modos de interface

> Sessão de design, 10/11/2026. **Status: decidido em 10/11/2026** (respostas abaixo). Página de referência: "Modos". Ordem: Simples primeiro; o Rack segue na Fase 5.

## Princípio
Um app, um estado, os mesmos comandos. O modo muda **quanto da casca aparece**, nunca o que o app sabe fazer:
- todo atalho funciona em todo modo;
- a busca rápida (`Ctrl+K`) acha qualquer comando;
- trocar de modo é instantâneo e não perde nada: preset, rotação, coleções e ajustes continuam onde estavam.

Assim o modo é uma preferência de densidade, não três produtos para manter. O MCP e o teclado nem percebem o modo.

## Os três modos

| | **Simples** (*Simple*) | **Completo** (*Full*) — padrão | **Rack** (*Rack*) |
| --- | --- | --- | --- |
| Para quem | Deixa tocando: festa, trabalho, TV. Não quer configurar nada. | Ouve e cura: troca, favorita, monta coleções, ajusta de vez em quando. | Opera ao vivo ou estuda os presets: quer ver e mexer em tudo sem abrir painéis. |
| O visual | Tela inteira | Tela inteira | Na outra tela (janela compacta) **ou** em cima do rack, na mesma janela (rack embutido) |
| Controles | Faixa curta que some: agora tocando, anterior · aleatório · próximo, favoritar, tela cheia, medidor | Faixa completa que some (a de hoje), com coleções, busca, Biblioteca, ajustes | Tudo à vista, nada some: transporte, transição (tipo e tempo), expressividade (nível, caráter, memória), rotação com contagem, `bass`/`mid`/`treb`, fps, próximo da fila |
| Ajustes rápidos (`,`) | Ganho, rotação, texto sobre o visual + "Todos os ajustes…" | Todos (sinal, rotação, transições, expressividade, texto) | Não precisa: os controles já estão no rack |
| Biblioteca (`L`) | Favoritos e Todos (Coleções aparece quando existir uma) | Completa | Completa, encaixada à esquerda do rack embutido |
| Painel `?` | Os 10 atalhos essenciais + "Ver todos" | Todos | Todos, com o grupo Rack primeiro |

**Modo performance** (VJ com clipes) continua um lugar à parte, não um modo de interface: entra de qualquer modo com `P` e sai com `Esc`, voltando ao modo em que estava.

## Por que três e não quatro
Um modo "Avançado" no Palco mostraria os mesmos controles do Rack num lugar diferente: seriam duas superfícies densas para desenhar, testar e manter. O **rack embutido** cobre o caso "uma tela só, com todos os controles". Já o rack em janela cobre o caso de duas telas, que já estava planejado.

## Como escolher e trocar
- **Primeira abertura:** o cartão de boas-vindas pergunta "Como você vai usar?" com três opções. O app já está tocando, então a pergunta pode ser ignorada (o padrão é Completo).
- **Configurações › Geral › Interface:** segmentado Simples · Completo · Rack, e para o Rack: "Janela separada" · "Embaixo do visual". Substitui a linha "Abrir em".
- **`M`:** alterna entre o Rack e o modo anterior, como hoje. Simples e Completo se trocam pela busca ("Modo simples", "Modo completo") ou nas Configurações, porque é uma escolha rara.
- A faixa mostra o modo só no Rack (o rótulo do painel). Nos outros, nada muda na tela além dos controles.

## O que entra em cada fase
- **Fase 2 (já existe):** Completo.
- **Barato (logo depois da 023):** Simples. É a mesma faixa com itens escondidos, mais os Ajustes reduzidos e o painel `?` curto. Uma spec pequena.
- **Fase 5:** Rack em janela e embutido (já no roadmap), agora com os controles da 013 e da 015.

## Decisões do usuário (10/11/2026)
1. **Nomes:** Simples · Completo · Rack (en: Simple · Full · Rack).
2. **Biblioteca no Simples:** fica, reduzida (Favoritos e Todos; Coleções quando existir uma).
3. **Primeira abertura:** Completo.
4. **Rack:** nas duas formas, em janela e embutido.

## Rack em janela e transmissão (OBS)
Na forma em janela, o Rack já separa o visual da interface: o visual vai para uma janela própria, sem faixa, toasts nem cursor. Essa é a **janela de transmissão** que o SYQEL tem, então não vira um recurso à parte. A janela do visual ganha duas opções em Configurações › Telas:
- **Onde:** tela cheia numa tela escolhida, **ou** uma janela comum de tamanho fixo, que o OBS captura mesmo quando você só tem uma tela.
- **Tamanho fixo:** 1920×1080 · 1280×720 · 1080×1920 (vertical) · personalizado.

Nela nunca aparece texto da interface. O texto sobre o visual segue a configuração da pessoa (o Modo limpo vale aqui também). Comando: "Abrir janela de transmissão", que abre o visual nessa janela sem entrar no Rack.
