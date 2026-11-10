> **Cópia do Claude Docs** — [Pesquisa de mercado: quem usaria o Sonic Obsidian](https://claude.ai/artifact/FMe2CEe7UT9kb8B2W2Pmja), exportada em 2026-11-10 (aba "Personas"). O original pode mudar: para atualizar, exporte de novo e substitua este arquivo inteiro, sem editar à mão (só o nome do autor é encurtado para "Alexandre Tempel", como no LICENSE).

# Personas do Sonic Obsidian

São sete proto-personas, montadas a partir da pesquisa de mercado. Elas ainda são hipóteses e devem ser revisadas quando houver usuários reais. Use o apelido nas conversas, issues e specs ("isso atende o DJ de Festa?").

| Prioridade | Apelido | Em uma linha | Momento de uso |
| --- | --- | --- | --- |
| 1 | **Nostálgico do Winamp** | Quer o MilkDrop de volta enquanto ouve música no PC | Em casa, sozinho, tela do PC ou TV |
| 2 | **DJ de Festa** | DJ amador ou de eventos que quer um telão reagindo ao set sem contratar VJ | Festas, bares, casamentos, treino em casa |
| 3 | **Streamer de Set** | Transmite sets na Twitch ou no YouTube e precisa de um fundo vivo e limpo | Lives semanais pelo OBS |
| 4 | **Artista Independente** | Lança música e precisa de vídeos de visualizador e Canvas | Semana de lançamento |
| 5 | **VJ de Clube** | Mixa visuais ao vivo no Resolume e quer mais uma fonte generativa | Clubes, festivais, domos |
| 6 | **Criador de Presets** | Gosta de mexer em shaders e código, cria e compartilha presets, usa IA | Noites de experimentação |
| 7 | **Anfitrião de Ambiente** | Quer uma TV com visual rodando em festa, bar ou loja | Horas seguidas, sem interação |

Cada persona segue o mesmo modelo: quem é, setup, objetivos, frustrações, hábitos, como chega ao Sonic Obsidian, o que precisa, o que não quer, um cenário e um critério de sucesso.

## 1. Nostálgico do Winamp

> "Eu só queria ver a música de novo, como era no Winamp."

**Quem é:** tem entre 28 e 45 anos e usou o Winamp na adolescência. Hoje ouve Spotify, YouTube ou arquivos locais no PC com Windows. Não é músico nem DJ: é ouvinte. Tem algum conforto técnico, mas não quer configurar nada.

**Setup:** PC ou notebook com Windows, fone ou caixa de som, às vezes uma TV ligada por HDMI. Spotify desktop, YouTube no navegador, às vezes foobar2000 ou MusicBee.

**Objetivos**

- Ter visuais bonitos e reativos enquanto trabalha, joga ou relaxa.
- Reencontrar presets clássicos do MilkDrop.
- Deixar rodando em tela cheia sem precisar mexer.

**Frustrações**

- O Spotify tirou o visualizador e nenhuma plataforma grande oferece um.
- As alternativas são demos web, plugins de players antigos ou apps pagos com marca d'água.
- Visualizadores que não ouvem o áudio real (só a API do Spotify) parecem fora de sincronia.

**Hábitos:** descobre ferramentas por Reddit, YouTube e listas no GitHub. Instala e testa rápido; desiste se a primeira experiência exigir configuração. Gosta de favoritar e de mostrar a amigos.

**Como chega ao Sonic Obsidian:** busca "winamp visualizer windows", "milkdrop spotify" ou vê um post no Reddit ou no LinkedIn.

**Precisa de:** instalador simples, captura automática do áudio do sistema, troca automática de presets, tela cheia, favoritos, importar `.milk` e modo ambiente (não apaga a tela).

**Não quer:** conta, assinatura, marca d'água, roteamento de áudio, telas cheias de controles.

**Cenário:** Sexta à noite, abre o Spotify, abre o Sonic Obsidian e coloca na TV. O visual começa a reagir sozinho. Quando aparece um preset que lembra os anos 2000, aperta uma tecla para favoritar.

**Sucesso:** da instalação ao primeiro visual reagindo em menos de 1 minuto, sem abrir configurações.

## 2. DJ de Festa

> "Quero que o telão acompanhe o meu set, mas não tenho como pagar um VJ."

**Quem é:** DJ amador, de eventos ou residente de bar. Toca em festas, casamentos, aniversários e lounges. Parte da renda pode vir do DJing, mas costuma ter outro emprego. É o perfil mais comum do DJ Census.

**Setup:** notebook com Windows ou Mac e controladora Pioneer (DDJ) com rekordbox, ou Serato/VirtualDJ. Leva um projetor ou usa a TV do local. Um cabo HDMI para a segunda tela.

**Objetivos**

- Deixar a festa mais profissional com visuais reagindo ao som.
- Trocar o clima visual quando a música muda (aquecimento, pico, final).
- Montar tudo em minutos e não pensar mais nisso durante o set.

**Frustrações**

- Os plugins de vídeo do rekordbox e do Serato eram pagos e instáveis.
- Software de VJ (Resolume) é caro e exige aprender outra profissão.
- Medo de travamento no meio do set.

**Hábitos:** aprende por YouTube e pela Digital DJ Tips. Ensaia em casa. Durante o set, as mãos e os olhos estão nos decks: no máximo, aperta uma tecla.

**Como chega ao Sonic Obsidian:** busca "visuais grátis para DJ" ou "visualizador rekordbox", ou vê outro DJ usando.

**Precisa de:** saída em segunda tela, troca no beat a cada N compassos, segurar visual no drop, playlists por clima, atalhos de teclado, sensibilidade ajustável e estabilidade.

**Não quer:** interface que exija atenção durante o set, marca d'água no telão, depender de internet no local.

**Cenário:** Antes do casamento, conecta o projetor e escolhe a playlist "Pista". Durante o set, os presets trocam a cada 16 compassos. No drop principal, aperta Enter para segurar o visual mais forte.

**Sucesso:** um set de 4 horas sem travar e sem precisar tocar no mouse.

## 3. Streamer de Set

> "Minha live precisa parecer viva mesmo quando eu só estou mixando."

**Quem é:** DJ ou produtor que transmite sets regulares na Twitch (DJ Program), no YouTube ou no Kick. Pode ser o DJ de Festa em outro momento. Cuida da própria imagem e marca.

**Setup:** PC com Windows e boa GPU, OBS Studio, câmera, software de DJ, às vezes um segundo monitor. Cenas no OBS com câmera, chat e fundo.

**Objetivos**

- Ter um fundo animado que reaja ao som e prenda quem assiste.
- Gerar cortes verticais para TikTok, Reels e Shorts.
- Mostrar o próprio logo e nome.

**Frustrações**

- Capturar uma janela com interface no OBS fica feio.
- Ferramentas como o SYQEL cobram US$ 35/mês para tirar a marca d'água.
- Peso de GPU: o visual compete com o encoder da live.

**Hábitos:** monta cenas no OBS com cuidado, testa antes da live, conversa com o chat. Usa tecla ou Stream Deck para trocar cenas.

**Como chega ao Sonic Obsidian:** busca "OBS music visualizer free" ou vê outro streamer usando.

**Precisa de:** janela de broadcast sem interface, saída Spout/NDI, troca no beat, overlay de logo e texto, gravação vertical e controle de qualidade/FPS para economizar GPU.

**Não quer:** marca d'água, conta obrigatória, consumo de GPU que derrube a live.

**Cenário:** Abre o Sonic Obsidian, ativa a saída Spout e adiciona como fonte no OBS atrás da câmera. Durante o set, troca de playlist pelo Stream Deck. Depois, grava 60 segundos em 9:16 para o Reels.

**Sucesso:** a fonte entra no OBS em menos de 2 minutos, e a live roda a 60 fps sem queda de quadros.

## 4. Artista Independente

> "Cada single precisa de um vídeo, e eu não tenho orçamento para isso."

**Quem é:** músico ou produtor que lança por distribuidora (DistroKid, ONErpm) e cuida da própria divulgação. Faz eletrônica, lo-fi, rock ou pop independente. Trabalha numa DAW.

**Setup:** PC com Windows ou Mac, Ableton, FL Studio ou Logic. Celular para postar. Usa ferramentas web como Specterr, Renderforest ou Kaiber.

**Objetivos**

- Ter um vídeo de visualizador para o YouTube em cada lançamento.
- Gerar o Spotify Canvas (9:16, 3 a 8 segundos, em loop) e cortes para Reels e Shorts.
- Ter uma identidade visual reconhecível entre lançamentos.

**Frustrações**

- As ferramentas web cobram assinatura ou põem marca d'água.
- Templates genéricos, iguais aos de todo mundo.
- Cortar 16:9 para 9:16 fica ruim.

**Hábitos:** trabalha em lotes perto do lançamento. Testa várias versões e escolhe a melhor. Precisa do arquivo final, não de performance ao vivo.

**Como chega ao Sonic Obsidian:** busca "music visualizer video free no watermark" ou "Spotify Canvas maker".

**Precisa de:** abrir um arquivo de áudio, render offline em 16:9 e 9:16 (e 1:1), escolher e travar um preset, loop perfeito para o Canvas, export em MP4 de alta qualidade.

**Não quer:** marca d'água, render em tempo real que dependa do PC não engasgar, dúvida sobre direitos de uso.

**Cenário:** Na véspera do lançamento, carrega o WAV, testa três presets, trava o favorito e exporta o vídeo completo em 16:9 e um loop de 8 segundos em 9:16.

**Sucesso:** vídeo do YouTube e Canvas exportados em uma sessão, prontos para subir.

**Ponto de atenção:** presets da comunidade têm autores. O app precisa mostrar a licença ou o autor do preset para quem usa os vídeos comercialmente.

## 5. VJ de Clube

> "Não vou largar o Resolume, mas quero MilkDrop dentro dele."

**Quem é:** VJ que toca em clubes, festas e festivais, ou artista de projeção mapeada. Domina Resolume e talvez TouchDesigner ou MadMapper. No Brasil, faz parte de uma cena com tradição (Palco\*VJ, Festival Visual Brasil, Festa da Luz).

**Setup:** notebook potente (Windows ou Mac), Resolume Avenue ou Arena, controladora MIDI (APC40 ou similar), placa de captura, saídas para projetor ou LED. Banco de loops e conteúdo próprio.

**Objetivos**

- Ter fontes generativas reativas ao som para misturar com os clipes.
- Sincronizar com o BPM do DJ.
- Controlar tudo pela controladora, sem olhar para a tela do notebook.

**Frustrações**

- Produzir conteúdo leva muito tempo.
- Licenças caras (o Arena custa € 799).
- Medo de travamentos e de codec ou resolução errados ao vivo.

**Hábitos:** prepara bancos de clipes por evento, ajusta tudo na passagem de som, troca informações em fóruns (r/vjing, Resolume) e no Instagram. Já conhece o NestDrop.

**Como chega ao Sonic Obsidian:** busca "milkdrop spout resolume" ou indicação de outro VJ.

**Precisa de:** saída Spout (e NDI), MIDI Learn, BPM via Ableton Link, resolução e FPS configuráveis, troca de preset por comando externo (MIDI/OSC), estabilidade.

**Não quer:** mais um mixer completo competindo com o Resolume, interface que precise de mouse ao vivo.

**Cenário:** No clube, abre o Sonic Obsidian em segundo plano mandando Spout em 1920×1080. No Resolume, o Sonic é uma camada. A cada virada, troca o preset com um pad do APC40.

**Sucesso:** o Sonic aparece como fonte no Resolume e responde ao MIDI sem nenhuma interação na janela dele.

## 6. Criador de Presets

> "Quero criar meu próprio visual, e a IA pode me ajudar a escrever o código."

**Quem é:** desenvolvedor, designer, artista generativo ou entusiasta de shaders. Pode vir da cena MilkDrop antiga ou do Shadertoy e do TouchDesigner. Usa assistentes de IA (Claude, ChatGPT, Cursor) no dia a dia. É o perfil mais próximo de quem contribuiria no repositório.

**Setup:** PC com Windows, editor de código, GitHub, um cliente de IA com suporte a MCP (Claude Desktop, Claude Code).

**Objetivos**

- Criar e ajustar presets vendo o resultado na hora.
- Pedir à IA "um túnel que pulsa no kick e muda de cor nos agudos" e iterar.
- Compartilhar presets e ganhar reconhecimento na comunidade.

**Frustrações**

- A sintaxe dos presets MilkDrop é obscura e mal documentada.
- Ferramentas fechadas cobram créditos de IA (SYQEL Studio).
- O SYQEL não aceita `.milk`, e converter é manual.

**Hábitos:** experimenta à noite e nos fins de semana. Lê código dos outros, faz forks, abre issues e PRs. Posta resultados no Reddit, Discord e GitHub.

**Como chega ao Sonic Obsidian:** pelo GitHub, pelo artigo no Working Illusion/Medium, ou buscando "milkdrop preset editor" e "MCP visualizer".

**Precisa de:** editor de presets com recarga ao vivo, importação e exportação de `.milk` e `.json`, servidor MCP para criar presets e controlar o app, documentação do formato, crédito de autoria nos presets.

**Não quer:** IA embutida e paga, formato proprietário, ter de compilar o app para testar um preset.

**Cenário:** No Claude Desktop, pede um preset inspirado em aurora boreal. O MCP envia o preset ao Sonic Obsidian, que o exibe na hora. Ele pede ajustes ("mais lento, reage mais ao baixo"), salva o resultado e abre um PR na coleção da comunidade.

**Sucesso:** do pedido à IA ao preset rodando em menos de 1 minuto, com a autoria registrada.

## 7. Anfitrião de Ambiente

> "Só quero que a TV fique bonita a noite toda, sem eu precisar mexer."

**Quem é:** dono ou funcionário de bar, café, loja ou estúdio, ou alguém que dá uma festa em casa. Não é técnico. A música vem de uma playlist, e o visual é decoração.

**Setup:** um PC ou mini-PC com Windows ligado a uma TV por HDMI, Spotify ou YouTube tocando. Às vezes, um notebook emprestado na festa.

**Objetivos**

- Ter um visual ambiente que combine com a música durante horas.
- Ligar uma vez e esquecer.
- Combinar com o clima da casa (calmo no café, intenso na festa).

**Frustrações**

- A TV apaga ou entra em proteção de tela.
- Vídeos do YouTube têm anúncios e não reagem à música.
- Presets agressivos ou com flashes demais incomodam o público.

**Hábitos:** configura uma vez, de preferência com ajuda de alguém. Não abre configurações depois. Pode querer o logo do bar na tela.

**Como chega ao Sonic Obsidian:** indicação de um amigo técnico (muitas vezes o Nostálgico do Winamp) ou um post nas redes.

**Precisa de:** modo ambiente (abre direto em tela cheia, não deixa a tela apagar, iniciar com o Windows), playlists por clima ("Calmo", "Festa"), troca automática, filtro de presets com flashes fortes, baixo consumo, logo opcional.

**Não quer:** interface visível, sustos (flashes, telas pretas, travamentos), atualizações que exijam intervenção.

**Cenário:** O dono do café liga o mini-PC de manhã. O Sonic Obsidian abre sozinho em tela cheia na playlist "Calmo" e roda até o fechamento, reagindo à playlist do Spotify.

**Sucesso:** 10 horas rodando sem intervenção e sem a TV apagar.

**Ponto de atenção:** flashes intensos podem afetar pessoas com fotossensibilidade. Um filtro de presets "seguros" serve a esta persona e é uma boa prática para todos.
