> **Cópia do Claude Docs** — [Análise de competidor: SYQEL × Sonic Obsidian](https://claude.ai/artifact/EyYF3RGdM2tapdx9NkRphD), exportada em 2026-11-10 (aba "Tab 1"). O original pode mudar: para atualizar, exporte de novo e substitua este arquivo inteiro, sem editar à mão (só o nome do autor é encurtado para "Alexandre Tempel", como no LICENSE).

# Análise de competidor: SYQEL × Sonic Obsidian

Nov 9, 2026 · Alexandre Tempel

O SYQEL usa o mesmo motor do Sonic Obsidian (Butterchurn) no seu feed Milkdrop. A diferença entre os dois está no produto ao redor do motor: assinatura, conta e créditos de IA de um lado; app aberto, local e gratuito do outro.

## O que é o SYQEL

Plataforma comercial e fechada de visuais reativos a áudio para DJs, VJs, streamers, igrejas e casas de show. Diz ter 25 mil usuários e 7 anos de uso ao vivo; foi lançada no Product Hunt em julho de 2020.

| Produto | Para quê | Plataformas |
| --- | --- | --- |
| Desktop | Visuais para sets de DJ/VJ, com gravação e branding | Windows, macOS, web |
| Live (novo) | Câmera num palco virtual com visuais atrás; multistream | Windows, macOS |
| Art | Visualizador "de jornada" para ouvir música | Web, iOS, Android, desktop, TVs |
| Studio (novo) | Editar visuais ou gerar novos com IA | Web |

## O motor é Butterchurn

Segundo a [página de suporte](https://syqel-astro.pages.dev/support/importing-milkedrop-visuals), o feed Milkdrop do Desktop roda no Butterchurn e importa presets no formato `.json` dele.

- Não aceita `.milk`: manda converter antes, sem explicar como.
- A versão web não importa pastas de presets.
- Presets importados não sincronizam entre máquinas.

O Milkdrop é só um de cinco feeds: Worlds (jornadas 3D), Shaders (Ambient, Party, Chill Out, Worship), Scenes (3D em tempo real), Milkdrop e Image Visuals (imagens de IA animadas por shader gerado por IA).

## Funcionalidades do SYQEL Desktop

Fonte: [syqel.com/desktop](https://syqel.com/desktop) e [home](https://syqel.com/).

| Área | O que oferece |
| --- | --- |
| Reatividade | Partes do visual reagem a instrumentos (kick, snare, baixo, vocais, pratos); curva de resposta em frequência estilo EQ |
| Entrada de áudio | Integração direta com rekordbox e Serato; medidor de entrada; seleção da fonte |
| Controle ao vivo | MIDI Learn e Key Learn em todos os planos; Espaço = próximo, Enter = segurar, Backspace = voltar |
| Playlists | Fila de visuais; avanço por timer, no beat a cada 4–64 compassos ou manual; travar visual |
| Saídas | Janela de broadcast para o OBS (tecla B), NDI, Spout no Windows |
| Gravação | Tecla R grava 4 vídeos de uma vez: 16:9, 1:1, 9:16 e 4:5, com áudio |
| Branding | Até 9 logos trocados ao vivo; letreiro de texto rolante |
| IA (Studio) | Prompt → shader reativo; imagem de IA → animação; remapear instrumento → elemento |
| Offline e conta | Roda offline; a conta sincroniza o setup entre máquinas |
| Conteúdo | 63 packs inclusos em todos os planos; cursos, tutoriais, galeria, Hall of Fame |

## Preços

Modelo freemium: o app inteiro é grátis com marca d'água; paga-se para tirar a marca e ganhar créditos de IA. Fonte: [syqel.com/pricing](https://syqel.com/pricing).

| Plano | Mensal (US$) | Anual (US$) | Marca d'água | Créditos de IA |
| --- | --- | --- | --- | --- |
| Free | 0 | — | Sim | 2, uma vez |
| Desktop | 35 | 299 | Não | 20/mês |
| Live | 25 | 249 | Não | 15/mês |
| Art | 10 | 79 | Não | — |
| Deluxe (os três) | 50 | 450 | Não | 20/mês |
| Gig Pass | 20 por 24 h | — | Não | 5, uma vez |

Créditos extras custam de US$ 15 (10) a US$ 90 (100). Em 2021–2024 houve ofertas de "lifetime" por cerca de US$ 50, que não aparecem mais.

## Percepção pública

Há pouca evidência independente. Não há discussões no Reddit nem avaliações no Trustpilot. O [Product Hunt](https://www.producthunt.com/products/syqel/reviews) tem 4 avaliações (nota 4,0), que elogiam a facilidade; a única reclamação foi a confusão sobre os limites do plano grátis. O [review da Magnetic Mag](https://magneticmag.com/2024/01/syqel-review/) é conteúdo patrocinado. O marketing aposta em "o visualizador mais avançado do mundo", em IA e em "50 mil visuais".

## Onde compete com o Sonic Obsidian

A sobreposição real é o SYQEL Desktop no feed Milkdrop: mesmo motor, Windows, áudio do sistema. Os públicos são diferentes. O SYQEL é ferramenta de trabalho para DJ/streamer, por assinatura e baseada em conta. O Sonic Obsidian é a experiência do Winamp: aberto, local e gratuito, com ferramentas de VJ por cima.

Vantagens do Sonic Obsidian:

1. Gratuito, sem marca d'água e sem conta. É o principal incômodo do SYQEL.
2. Código aberto (MIT): presets e app são da comunidade.
3. `.milk` nativo, convertendo para `.json` na importação, onde o SYQEL falha.
4. Criação de presets + MCP com a IA que a pessoa já usa, em vez de créditos pagos.
5. Foco na qualidade MilkDrop/Winamp, em vez de cinco motores visuais.
6. Compositor por camadas com vídeo e crossfader A/B.

## O que aprender (candidatos ao backlog)

| Ideia | Por que vale | Esforço |
| --- | --- | --- |
| Avanço no beat a cada N compassos + segurar visual | Transição musical em vez de timer | Baixo–médio |
| Mapa de teclas claro (próximo, voltar, segurar, gravar) | Controle ao vivo sem mouse | Baixo |
| Janela de broadcast sem UI | Captura limpa no OBS | Baixo |
| Curva de resposta em frequência | Ajusta presets a gêneros diferentes | Médio |
| Saída Spout (Windows) | Integra com OBS, Resolume e TouchDesigner | Médio |
| MIDI Learn | Essencial para o modo performance e o crossfader | Médio |
| Playlists de presets | Organiza a Biblioteca para sets | Médio |
| Gravação em 16:9 e 9:16 | Conteúdo para redes e divulgação do projeto | Médio–alto |
| Overlay de logo/texto | Útil para streamers; baixa prioridade | Baixo |

O que não copiar: conta obrigatória e créditos de IA; palco com câmera e apps de TV; vários motores 3D; marketing com superlativos, que contraria o tom honesto do projeto.

## Posicionamento sugerido

O SYQEL é uma plataforma de visuais para profissionais que pagam assinatura. O Sonic Obsidian é o MilkDrop do Winamp de volta como app nativo: aberto, gratuito, sem marca d'água, compatível com `.milk` e controlável pela IA que você já usa.

## Fontes

- [SYQEL — home](https://syqel.com/)
- [SYQEL — preços](https://syqel.com/pricing)
- [SYQEL Desktop](https://syqel.com/desktop)
- [Suporte: importar presets Milkdrop](https://syqel-astro.pages.dev/support/importing-milkedrop-visuals)
- [Product Hunt — avaliações](https://www.producthunt.com/products/syqel/reviews)
- [Magnetic Mag — review (patrocinado)](https://magneticmag.com/2024/01/syqel-review/)
