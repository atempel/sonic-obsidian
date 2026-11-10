> **Cópia do Claude Docs** — [Pesquisa de mercado: quem usaria o Sonic Obsidian](https://claude.ai/artifact/FMe2CEe7UT9kb8B2W2Pmja), exportada em 2026-11-10 (aba "Tab 1"). O original pode mudar: para atualizar, exporte de novo e substitua este arquivo inteiro, sem editar à mão (só o nome do autor é encurtado para "Alexandre Tempel", como no LICENSE).

# Pesquisa de mercado: quem usaria o Sonic Obsidian

Nov 9, 2026 · Alexandre Tempel

## Resumo

O público mais alinhado ao Sonic Obsidian é o ouvinte que sente falta do Winamp. Logo depois vêm DJs amadores e streamers, que querem visual automático sem contratar VJ. VJs profissionais só adotariam o app como fonte via Spout dentro do Resolume.

- **Ouvintes:** a demanda por visualizadores aparece com frequência (Spotify, Plexamp, Reddit), e nenhum app nativo e gratuito capta o áudio real do Windows com qualidade MilkDrop.
- **DJs:** maioria amadora; rekordbox (34%) e Serato (27%) lideram; metade ou mais em Windows. As tentativas de vídeo dentro do software de DJ não pegaram.
- **Streamers:** o DJ Program da Twitch (2024) resolveu os direitos autorais; o nicho é pequeno, mas o setup com OBS pede uma janela limpa.
- **Músicos:** precisam de vídeos 16:9 e 9:16 por lançamento e hoje pagam ferramentas web que põem marca d'água.
- **VJs:** usam Resolume, TouchDesigner, VDMX e MadMapper, trocam sinal por Spout, Syphon e NDI e sincronizam por Ableton Link e MIDI. O NestDrop já ocupa o espaço de "MilkDrop para VJ" no Windows.
- **Mercado:** não há número confiável. As tendências são IA ao vivo, protocolos abertos (NDI, OSC), shows imersivos e conteúdo vertical.

## VJs

VJs mixam imagens ao vivo como DJs mixam música. O fluxo deles é baseado em clipes, camadas e sincronia de BPM, e o Sonic Obsidian só entra nesse fluxo se mandar sinal para as ferramentas que eles já usam.

### Ferramentas

Os "quatro grandes" citados em comparativos são Resolume, VDMX, MadMapper e TouchDesigner ([alltd.org](https://alltd.org/?p=61918)). Nenhuma fonte de 2025–2026 mede participação de mercado. O último censo amplo de leitores do CDM é de 2011, com 71,8% em Mac e 25,7% em Windows ([CDM](https://cdm.link/2011/08/what-visual-software-readers-use-some-clear-favorites-plenty-of-diversity-in-census-results/)); nele, Winamp AVS aparece entre as respostas "outros".

| Ferramenta | Perfil | Preço / SO |
| --- | --- | --- |
| [Resolume Avenue / Arena](https://resolume.com/software/avenue-arena) | Mixer de clipes "plug and play", padrão em clubes e festivais; Arena adiciona mapeamento, edge blending e DMX | € 299 / € 799 por computador |
| TouchDesigner | Programação visual por nós, generativo e interativo; curva de aprendizado mais íngreme | Windows, macOS |
| VDMX 6 | Modular, bom custo-benefício | Só macOS |
| MadMapper | Mapeamento de projeção, LED e laser | Windows, macOS |
| [Magic Music Visuals](https://magicmusicvisuals.com/) | Visuais reativos a áudio com shaders GLSL, MIDI e OSC | Windows, macOS; demo grátis |
| [NestDrop](https://nestimmersion.ca/nestdrop.php) | Motor MilkDrop para VJs: até 4 decks via Spout para Resolume e TouchDesigner; 1.900 presets curados | Só Windows; edição Classic grátis, Midnight paga |

O NestDrop é o concorrente mais próximo do Sonic Obsidian entre VJs. Ele prova que existe demanda por MilkDrop como fonte de vídeo dentro do Resolume, e não como app isolado. O VDMX também publicou um app gratuito que manda MilkDrop por Syphon ([VDMX](https://vdmx.vidvox.net/blog/projectmilksyphon)).

### Fluxo de trabalho

- Camadas e grupos, blend modes, transições, moduladores e controle MIDI/OSC são o núcleo das ferramentas ([DJ.Studio](https://dj.studio/blog/best-vj-software)).
- Sincronia com o DJ vem de Ableton Link (BPM pela rede local), timecode ou MIDI/OSC disparando cenas em compassos planejados (mesma fonte).
- Controladores MIDI como o Akai APC40 são comuns; o Resolume já sorteou um APC40 em sua pesquisa com usuários de 2018 ([Resolume](https://resolume.com/blog/33196)).
- Codecs recomendados para playback: H.264, Photo JPEG e, para fluidez, HAP ou DXV ([Ticket Fairy](https://www.ticketfairy.com/blog/2025/08/23/projection-led-for-festivals-content-pipelines-that-dont-break/)).
- O conteúdo vem de bancos de loops (Artlist, lojas na Gumroad) e, cada vez mais, de geração por IA com Stable Diffusion, ComfyUI e Deforum ([VJs TV](https://vjstv.com/technology/stable-diffusion-vj)).

### Saídas e palco

- Spout (Windows), Syphon (Mac) e NDI são como os apps trocam vídeo entre si; o Resolume aceita os três como fonte externa ([Resolume](https://resolume.com/software/avenue-arena)).
- Em festivais, o VJ convidado recebe um sinal combinado, como HDMI ou SDI a 1080p60, e entrega arquivos com antecedência ([Ticket Fairy](https://www.ticketfairy.com/blog/2025/08/23/projection-led-for-festivals-content-pipelines-that-dont-break/)).
- Painéis de LED pedem conteúdo na resolução exata do painel, como 1920×1080 ou 3840×1080 (mesma fonte).

### Dores

- Falhas ao vivo: servidor de mídia travando, codec ou resolução errados, sinal do VJ convidado caindo ([Ticket Fairy](https://www.ticketfairy.com/blog/2025/08/23/projection-led-for-festivals-content-pipelines-that-dont-break/)).
- Custo: o Arena custa 2,7 vezes o Avenue.
- Curva de aprendizado: um estudo da Aalto mostra iniciantes com dificuldade na edição por nós do TouchDesigner ([Aalto](https://aaltodoc.aalto.fi/server/api/core/bitstreams/a4357100-515e-429e-bfc7-2bb6c5efc553/content)).
- Produzir conteúdo leva tempo; nenhuma fonte quantifica isso.

**Para o Sonic Obsidian:** o VJ profissional não vai trocar o Resolume. Ele usaria o Sonic como fonte generativa grátis via Spout, como faz com o NestDrop. Spout, BPM/Link e MIDI são o preço de entrada nesse público.

## DJs e streamers

O DJ típico é amador, usa rekordbox ou Serato e divide-se meio a meio entre Windows e Mac. Visuais são um extra que ele raramente produz sozinho. É um público grande e acessível para um app gratuito, desde que a configuração seja simples.

### Quem são

Os dados vêm do Global DJ Census da Digital DJ Tips, a maior pesquisa do tipo. A amostra é autosselecionada entre leitores do site, então não representa o mercado inteiro.

| Dado | Valor | Fonte |
| --- | --- | --- |
| Software de DJ (2026) | rekordbox 34%, Serato 27%, VirtualDJ \~17% | [Census 2026](https://www.digitaldjtips.com/5-facts-about-djs-2026-census/) |
| Hardware | Pioneer DJ / AlphaTheta é a marca principal de \~60% | [Census 2026](https://www.digitaldjtips.com/5-facts-about-djs-2026-census/) |
| Sistema operacional | 60% Windows / 40% Mac (2023); "bem dividido" (2024) | [Census 2023](https://www.digitaldjtips.com/here-are-the-results-from-our-2023-census-the-biggest-dj-survey-in-the-world/), [Census 2024](https://www.digitaldjtips.com/census-results-2024/) |
| Perfil | Quase metade nunca ou raramente toca em público | [Census 2023](https://www.digitaldjtips.com/?p=2776943) |
| Stems | 73% separam stems em tempo real dentro do software de DJ | [Census 2026](https://www.digitaldjtips.com/5-facts-about-djs-2026-census/) |
| Tendência | 41% acham que streaming dentro do software de DJ foi a maior novidade do ano | [Census 2026](https://www.digitaldjtips.com/5-facts-about-djs-2026-census/) |

A maioria toca como hobby, em casamentos, festas, bares e lounges, e não em clubes ou turnês ([Census 2020](https://www.digitaldjtips.com/highlights-from-the-global-digital-dj-census-2020/)). Metade ou mais usa Windows, o que joga a favor de um app só para Windows.

### Como usam visuais

- O software de DJ já tentou embutir vídeo: o rekordbox video e o Serato Video custavam US$ 149 cada. O rekordbox video hoje consta como descontinuado, e o review dizia que não era estável o bastante para shows ([Digital DJ Tips](https://www.digitaldjtips.com/reviews/rekordbox-video/)).
- DJs em turnê costumam contratar VJs locais em vez de levar um ([Digital DJ Tips](https://digitaldjtips.com/?p=17397)).
- Em lugares sem estrutura de vídeo, é preciso alugar projetor e tela, o que encarece (mesma fonte).
- Não há dado independente de 2024–2026 sobre quantos DJs usam visuais. O SYQEL vende justamente para esse vazio: visual automático, sem VJ.

### Streaming

- A Twitch lançou o DJ Program em agosto de 2024, com licenças de UMG, Sony, Warner e Merlin. Isso resolveu boa parte do problema de DMCA que derrubava streams de DJ ([Digital Music News](https://www.digitalmusicnews.com/2024/08/08/twitch-dj-celebration-launches-after-inking-major-labels/)).
- A categoria DJs é pequena: cerca de 260 canais ao vivo e menos de 1% da Twitch, com 5,1–5,9 milhões de horas assistidas por mês no fim de 2025 ([Streams Charts](https://streamscharts.com/games/djs)).
- Em junho de 2026, Twitch e SoundCloud fizeram as "SoundCloud Sessions" para membros do programa ([Tubefilter](https://www.tubefilter.com/2026/06/26/twitch-soundcloud-partnership-dj-sessions-live/amp/)).
- O setup típico é OBS com câmera e visual de fundo, que o SYQEL alimenta por janela de broadcast, NDI ou Spout ([SYQEL](https://syqel.com/desktop)).

**Para o Sonic Obsidian:** para o DJ amador e o streamer, o valor está em funcionar sozinho. Isso significa troca automática de preset no beat, uma janela limpa para o OBS e captura do áudio do software de DJ sem roteamento. A integração direta com rekordbox/Serato, que o SYQEL tem, fica para depois.

## Ouvintes e nostálgicos do Winamp

Esse é o público mais alinhado com a proposta do Sonic Obsidian: gente que só quer ver a música que está tocando. A demanda aparece de forma constante em fóruns, mas ninguém a mede, e as grandes plataformas não a atendem.

### Sinais de demanda

- Usuários do Spotify perguntam onde foi parar o visualizador escondido (`spotify:app:visualizer`) e pedem um visualizador no estilo do Windows Media Player, inclusive em TVs Roku. Não há resposta oficial ([Spotify Community](https://community.spotify.com/t5/Desktop-Windows/Is-the-visualizer-gone/td-p/4473719), [Live Ideas](https://community.spotify.com/t5/Live-Ideas/Bring-back-Windows-media-player-visual-graphic-equilizer/idc-p/7060668/highlight/true)).
- No mesmo tópico, um usuário diz que recorre ao YouTube para ter visuais, e outro reclama da tela que apaga durante a reprodução.
- No fórum do Plex há pedidos de MilkDrop no Plexamp e de visualizações feitas pelos usuários ([Plex](https://forums.plex.tv/t/plexamp-and-plex-clients-milkdrop-visualizer-option/822320), [Plex](https://forums.plex.tv/t/plexamp-allow-users-to-write-and-sideload-their-own-visualizations/880674)).
- Um tópico de 2024 no r/electronicmusic, "o que aconteceu com os visualizadores?", aponta como alternativas Butterchurn, projectM, o visualizador do Apple Music, Plane9, Wallpaper Engine e Electric Sheep ([Reddit](https://redlib.nohost.network/r/electronicmusic/comments/1d8dvkc/what_happened_to_music_visualisers)).

### O ecossistema MilkDrop hoje

| Projeto | Situação |
| --- | --- |
| Winamp | Código do cliente desktop aberto em set/2024, mas com licença que proíbe forks públicos ([TechSpot](https://www.techspot.com/community/topics/winamp-source-code-released-but-with-significant-restrictions.288349/)) |
| [Butterchurn](https://github.com/jberg/butterchurn) | MilkDrop em WebGL, MIT, \~1,9 mil estrelas; presets em pacote npm separado; demo no butterchurnviz.com |
| [Webamp](https://github.com/captbaritone/webamp) | Winamp 2.9 recriado em HTML5, com Butterchurn integrado |
| [foo\_vis\_milk2](https://foobar2000.org/components/view/foo_vis_milk2) | MilkDrop 2 como componente do foobar2000 |
| [NestDrop](https://nestimmersion.ca/nestdrop.php) | MilkDrop para VJs e domos, só Windows |
| [Kaleidosync](https://github.com/SourceAura/kaleidosync) | Visualizador para Spotify que lê a análise da API (beats, seções), e não o áudio real |

Os números das comunidades (r/winamp, r/milkdrop, sites de presets) não foram encontrados.

### Reclamações sobre os visualizadores atuais

- Capturar o áudio é difícil: streams com DRM e apps que usam a API do Spotify em vez de ouvir a saída real.
- Os visualizadores antigos exigiam script e programação, o que afastava o usuário casual ([Reddit](https://redlib.nohost.network/r/electronicmusic/comments/1d8dvkc/what_happened_to_music_visualisers)).
- A oferta está espalhada em plugins de players, demos web e apps pagos.

### Usos

As fontes citam visual de fundo em casa e no home office, a TV como tela ambiente e o protetor de tela. Festas em casa, Discord e rádios lo-fi são usos plausíveis, mas nenhuma fonte os confirma.

**Para o Sonic Obsidian:** esse público quer instalar e ver, sem configurar nada. O diferencial é ouvir o áudio real do Windows (WASAPI), com qualidade MilkDrop e sem conta. Ninguém oferece esse pacote hoje como app nativo e gratuito.

## Músicos e criadores de conteúdo

Músicos independentes precisam de vídeo para cada lançamento: visualizador no YouTube, Spotify Canvas e cortes verticais. Hoje usam geradores web por assinatura, quase sempre com marca d'água no plano grátis.

- O Spotify Canvas pede loop vertical 9:16 de 3 a 8 segundos, mínimo de 720×1280 (recomendado 1080×1920), sem texto, logo ou marca d'água. A especificação vem de um guia de fornecedor e não foi conferida na documentação do Spotify ([Freebeat](https://freebeat.ai/articles/music-visualizer-for-spotify-canvas-best-practices-and-tools-in-2026)).
- As ferramentas citadas são Freebeat, Specterr, Kaiber, VEED, Renderforest e Videobolt. O plano grátis do Freebeat põe marca d'água (mesma fonte).
- O guia alerta contra cortar vídeo 16:9 para 9:16, então o formato vertical precisa ser renderizado como vertical desde o início.
- Produtores podem ligar o visualizador à saída da DAW (Ableton, FL Studio, Logic) sem plugin; o SYQEL explora esse uso ([SYQEL](https://syqel-astro.pages.dev/music-visualizer-for-producers)).

**Para o Sonic Obsidian:** a gravação em 16:9 e 9:16 transforma o app numa fábrica de vídeos de lançamento, e sem marca d'água é um diferencial claro. Uma restrição: presets da comunidade têm autores, então o uso comercial dos vídeos precisa de crédito ou de checagem da licença de cada preset.

## Mercado e tendências

Não existe um número confiável para o tamanho do mercado de visualizadores. Os relatórios encontrados são de baixa qualidade, e o sinal útil está nas tendências.

### Números (com ressalvas)

| Indicador | Valor | Confiabilidade |
| --- | --- | --- |
| Mercado de software de DJ | US$ 405,9 mi (2024) → US$ 570 mi (2031) | Baixa: o relatório se contradiz ([HTF](https://www.htfmarketintelligence.com/report/global-dj-software-market)) |
| Mercado de software de visualização musical | US$ 12,8 mi (2021) | Muito baixa: CAGRs conflitantes e campos vazios ([MRF](https://www.marketresearchforecast.com/reports/music-visualizer-software-25427)) |
| Twitch, total 2025 | \~900 mi de horas assistidas, 9 mi de novos streamers | Média: recap oficial via [Tubefilter](https://www.tubefilter.com/2025/12/03/twitch-year-end-recap-2025-900-million-hours-watch-time/) |
| Respondentes do DJ Census | 22 mil (2026), 36 mil (2019) | Indica um público grande e engajado, não o tamanho do mercado |

### Tendências

- **IA gerando visuais ao vivo:** Stable Diffusion, ComfyUI, Deforum e StreamDiffusion dentro do TouchDesigner ([VJs TV](https://vjstv.com/technology/stable-diffusion-vj), [Derivative](https://derivative.ca/community-post/wip-live-streamdiffusion-%E2%80%9Cskin%E2%80%9D-kinect-depth-point%E2%80%91cloud-glsl-mat-splats/72899)). O SYQEL vende IA como créditos pagos.
- **Protocolos abertos:** NDI virou infraestrutura crítica no broadcast ([AVNation](https://www.avnation.tv/2025/09/14/ndi-at-ten-why-its-now-mission-critical/)), e o OSC está virando padrão de controle entre fabricantes de luz e AV ([Installation](https://www.installation-international.com/technology/avl/the-rise-of-avl-real-time-ai-and-the-future-of-the-lighting-desk)).
- **Imersivo:** domos e projeção 360° aparecem em festivais, como o Mov Dome do Rock the Mountain ([Billboard Brasil](https://billboard.com.br/rock-the-mountain-mov-dome/)).
- **Conteúdo vertical:** Canvas, Reels e Shorts exigem 9:16 nativo.
- **A Resolume reabriu a pesquisa com usuários em 2026**, a primeira desde 2018 ([Resolume](https://resolume.com/blog/33196)).

### Brasil

- O Brasil tem tradição em VJing. O Palco\*VJ, da rede ALTav com a Virada Cultural, reuniu nove nomes da cena em 2018, entre eles 1mpar, ElkaVJ, Embolex e VJ Oigres ([Vimeo](https://vimeo.com/307049109)).
- O VJ Eletroiman, do Rio, organiza o Festival Visual Brasil e se apresenta em festivais internacionais como o Live Performers Meeting ([LPM](https://liveperformersmeeting.net/editions/2025-morocco/artists/vj_eletroiman/), [VJs TV](https://vjstv.com/artists/vj-eletroiman)).
- Festivais de luz e mapeamento: Festa da Luz em Belo Horizonte (4ª edição em 2025, com VJs selecionados) ([LSi](https://old.lsionline.com/news/christie-griffyns-illuminate-festival-of-light)), Abstrata ([AV Node](https://avnode.net/videos/abstrata2edition/)) e o São Paulo International Light Festival.
- A cena eletrônica nacional está em alta, com festivais como o Só Track Boa e nomes como Mochakk e DJ Marky ([Billboard Brasil](https://billboard.com.br/so-track-boa-celebra-10-anos-com-noite-de-encontros-historicos/)).
- A academia estuda o tema: há artigos sobre projeção mapeada e cultura VJ ([DATJournal](https://datjournal.anhembi.br/dat/article/download/893/637/2853)) e TCCs sobre motion design para VJing ([UFU](https://repositorio.ufu.br/bitstream/123456789/46442/3/FERREIRA_GabriMotionDesignFerramenta.pdf)).

### Igrejas e casas de show

Igrejas usam softwares como o ProPresenter, com várias saídas (telão, retorno, transmissão) operadas por voluntários ([Renewed Vision](https://renewedvision.com/blog/church-visual-software-your-guide-to-enhanced-services)). O SYQEL tem uma coleção "Worship". Não há dados de mercado para igrejas nem para bares que usam visual ambiente.

## Funcionalidades por público

Quatro funcionalidades servem a quase todos os públicos: captura do áudio do sistema, troca automática no beat, tela cheia em segunda tela e uma janela limpa para captura. As demais definem públicos específicos: Spout e MIDI para o VJ, gravação vertical para o artista, editor e MCP para o criador de presets.

Grau de utilidade: **Alta** = decide se a pessoa usa o app; **Média** = melhora bastante; **Baixa** = indiferente. Os nomes das colunas são as personas da aba Personas. A coluna "Status" é para você acompanhar.

| Funcionalidade | Nostálgico do Winamp | DJ de Festa | Streamer de Set | Artista Independente | VJ de Clube | Criador de Presets | Anfitrião de Ambiente | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Captura do áudio do sistema ou de um app (WASAPI) | Alta | Alta | Alta | Média | Média | Alta | Alta |  |
| Biblioteca curada de presets + favoritos | Alta | Alta | Média | Média | Média | Média | Alta |  |
| Troca automática de presets (timer, aleatória) | Alta | Média | Alta | Baixa | Baixa | Baixa | Alta |  |
| Troca no beat a cada N compassos + segurar visual | Média | Alta | Alta | Média | Alta | Baixa | Média |  |
| Tela cheia em segunda tela / projetor / TV | Alta | Alta | Média | Baixa | Alta | Baixa | Alta |  |
| Atalhos de teclado (próximo, voltar, segurar, favoritar) | Média | Alta | Alta | Baixa | Alta | Média | Baixa |  |
| Importar `.milk` (conversão automática) | Alta | Baixa | Baixa | Baixa | Média | Alta | Baixa |  |
| Playlists / coleções de presets por clima | Média | Alta | Alta | Média | Alta | Média | Alta |  |
| Sensibilidade e curva de reatividade (graves × agudos) | Baixa | Alta | Média | Média | Alta | Alta | Baixa |  |
| Janela de broadcast sem interface | Baixa | Média | Alta | Média | Média | Baixa | Baixa |  |
| Saída Spout / NDI | Baixa | Baixa | Alta | Baixa | Alta | Baixa | Baixa |  |
| MIDI Learn | Baixa | Média | Média | Baixa | Alta | Baixa | Baixa |  |
| BPM por Ableton Link | Baixa | Média | Baixa | Baixa | Alta | Baixa | Baixa |  |
| Gravação em 16:9 e 9:16 | Baixa | Média | Alta | Alta | Baixa | Alta | Baixa |  |
| Render offline a partir de arquivo de áudio | Baixa | Baixa | Baixa | Alta | Baixa | Média | Baixa |  |
| Upload de arquivo / URL do SoundCloud | Média | Baixa | Baixa | Alta | Baixa | Média | Média |  |
| Editor de presets | Baixa | Baixa | Baixa | Média | Média | Alta | Baixa |  |
| MCP: criar presets e controlar o app pela IA | Baixa | Baixa | Média | Média | Média | Alta | Baixa |  |
| Compositor de camadas com vídeo + crossfader A/B | Baixa | Média | Média | Média | Alta | Média | Baixa |  |
| Overlay de logo e texto | Baixa | Média | Alta | Média | Média | Baixa | Média |  |
| Modo ambiente (não apaga a tela, abre direto no visual, baixo consumo) | Alta | Baixa | Baixa | Baixa | Baixa | Baixa | Alta |  |

Os graus são uma síntese desta pesquisa, não dados medidos. Valem como hipótese até haver usuários para validar.

## Personas e implicações para o produto

A ordem sugerida é atender primeiro o ouvinte nostálgico, depois o DJ amador e o streamer, depois o VJ como fonte via Spout. Cada camada reaproveita a anterior.

As personas detalhadas, com apelidos para usar no desenvolvimento, estão na aba Personas.

| Prioridade | Persona | O que quer | O que precisa no Sonic Obsidian |
| --- | --- | --- | --- |
| 1 | **Nostálgico do Winamp** | Ver a música com qualidade MilkDrop, sem configurar nada | Instalador simples, captura do áudio do sistema, troca automática, tela cheia, sem conta |
| 2 | **DJ de Festa** | Telão ou TV reagindo ao set, sem contratar VJ | Troca no beat a cada N compassos, segurar visual, atalhos, segunda tela |
| 3 | **Streamer de Set** | Fundo animado e limpo para a live | Janela de broadcast, Spout/NDI, sem marca d'água |
| 4 | **Artista Independente** | Vídeos de lançamento e Canvas | Gravação em 16:9 e 9:16, render offline de arquivo de áudio |
| 5 | **VJ de Clube** | Fonte generativa extra no Resolume | Spout, MIDI Learn, Ableton Link, resolução configurável |
| 6 | **Criador de Presets** | Criar e compartilhar presets com ajuda da IA | Editor ao vivo, `.milk`/`.json`, MCP, autoria |
| 7 | **Anfitrião de Ambiente** | TV bonita a noite toda sem mexer | Modo ambiente, playlists por clima, filtro de flashes |

O compositor por camadas com vídeo e o crossfader A/B já planejados servem ao DJ e ao VJ que querem fazer tudo num app só. Eles competem com o Resolume, então fazem mais sentido depois do Spout.

### O que essa pesquisa muda no backlog

1. **Spout** sobe de prioridade: é o que liga o app ao OBS, ao Resolume e ao TouchDesigner, e o NestDrop prova a demanda.
2. **Troca no beat + segurar** atende três personas de uma vez.
3. **Gravação vertical** abre o público de músicos e ainda gera material de divulgação.
4. **Importar `.milk`** é o diferencial para o ouvinte nostálgico, que traz presets antigos.
5. **Ableton Link e OSC** ficam para quando houver usuários VJs.

### Perguntas em aberto

- Quantas pessoas buscam ativamente um visualizador para Windows? Vale medir com estrelas do repositório, downloads e buscas.
- O Sonic Obsidian deve rodar no Mac algum dia? VJs usam bastante Mac; DJs se dividem.
- Qual é a licença dos presets incluídos, e ela permite uso comercial dos vídeos gravados?

## Fontes e limitações

A pesquisa foi feita em novembro de 2026 em quatro frentes paralelas (VJs, DJs/streamers, ouvintes, mercado), mais buscas complementares. As fontes estão linkadas em cada seção.

Limitações:

- O DJ Census é uma pesquisa autosselecionada de leitores de um site, não uma amostra do mercado.
- O único censo de software de VJ com divisão por sistema operacional é de 2011.
- Os relatórios de tamanho de mercado são de baixa qualidade e servem só como ordem de grandeza.
- A demanda dos ouvintes vem de tópicos de fórum, sem contagem de votos ou datas.
- Faltam dados sobre o tamanho das comunidades MilkDrop e Winamp, sobre o mercado de igrejas e bares e sobre a cena de VJs no Brasil de 2025–2026.
- Parte das fontes é de fornecedores (SYQEL, Freebeat, Renewed Vision) e foi tratada como versão do fornecedor.
