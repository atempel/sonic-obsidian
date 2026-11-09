# 019 — Landing: refino de movimento e microinterações

**Fase:** Abertura · **Status:** Em andamento · **Issue:** [#52](https://github.com/atempel/sonic-obsidian/issues/52) · **Depende de:** [017](017-landing-github-pages.md) (no ar)

## Problema
A landing (spec 017) é um porte fiel do canvas `1794165992-cb8e`, feito antes de o app ganhar o sistema de movimento da v3 (M01–M23, aprovado em 08/11). Hoje a página tem só os estados de hover do canvas: troca de preset, botões, medidor e Biblioteca mudam "a seco". A página deveria mostrar o mesmo cuidado do app, porque é a primeira impressão dele.

## Proposta
Levar para `site/` a **linguagem de movimento da v3**, com os mesmos tokens e regras, aplicada aos elementos da landing que têm equivalente no app. Nada de animação decorativa nova: a página responde a gesto, rolagem e eventos do áudio (beat, troca de preset), como o app.

### Regras (de `docs/design/v3/docs/v3-microinteracoes.md`)
- Tokens: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--t-fast: 120ms`, `--t-med: 220ms` (de `so-v3-base.css`).
- Tudo termina em < 400 ms; a saída é mais rápida que a entrada, sempre ease-out; escala parte de 0,97; sem bounce/elastic/blur/parallax.
- Animar só `transform` e `opacity`; usar transições CSS (interrompíveis), não keyframes, para o que se repete.
- Stagger de no máximo 20 ms, só nos 8 primeiros itens.
- **Movimento reduzido:** segue o doc, não o `so-v3-base.css` (divergência conhecida): sem deslocamento nem escala, mudanças de estado como troca direta ou fade ≤ 120 ms; medidor e beat continuam.

## Escopo
**P0 — console do topo (o "app" da página)**
- **M02 Troca de título:** ao trocar de preset, o título antigo sobe 4 px e some (t-fast), o novo entra (t-med), o autor entra 40 ms depois, com um flash violeta curto no número `PRESET NN / N`. Vale também para a legenda do espelho do Palco.
- **M03 Linha de rotação:** com AUTO ligado, uma linha de 1 px sob o nome do preset mostra o tempo até a próxima troca; ela esvazia da direita para a esquerda (t-med) na troca e some quando AUTO desliga.
- **M04 Pressão:** botões do console, de download e da Biblioteca descem a 0,97 ao pressionar (80 ms) e voltam em t-fast. Nos de anterior/próximo, o ícone dá um passo de 2 px na direção.
- **M05 Aleatório:** as duas setas do ícone trocam de lugar (t-med) a cada clique.
- **M06 AUTO:** ao ligar, o ícone gira 180° (t-med); ao desligar, só esmaece.
- **M08 Balística do medidor:** ataque ~10 ms e queda ~1,5 s; no silêncio (stop), os segmentos apagam em cascata, 30 ms por segmento.
- **Tocar/Parar demo:** os ícones play ↔ pause trocam com escala cruzada (0,97 → 1, t-fast), em vez do corte seco.

**P0 — página**
- **M12 Biblioteca em degrau:** ao trocar a página da Biblioteca ("Next 12"), os cartões entram com 15 ms entre os 8 primeiros (t-med), e os antigos saem sem degrau (180 ms). O selo ON STAGE entra com fade.
- **M10 Indicador que desliza:** na navegação do topo, um sublinhado de 1 px desliza (t-med) para a seção visível (scroll-spy com `IntersectionObserver`). Some no topo da página.
- **Perguntas:** o `+` já gira; o conteúdo aberto entra com fade de t-fast e 4 px de subida.
- **Entrada das seções ao rolar:** uma vez por seção, o rótulo, o título e os cartões em grade sobem 6 px com fade (t-med), em degrau de 20 ms e só nos 8 primeiros (a mesma regra da M01). Nada some ao rolar de volta. Com movimento reduzido, nada disso acontece.
- **Batida:** marca, coração e ponto do console seguem pulsando no kick, como hoje (já é a regra "reage a evento de áudio").

**P0 — música da demo**
- Tocar demo usa duas faixas do Uppbeat, em sequência: '24 Hrs In Tokyo' (Yawnathan) e 'Space Dancers' (2050). O crédito da faixa atual aparece no console, com link, e o crédito completo (com o código de licença) fica em "Built in the open"; o rótulo de fonte mostra o nome da faixa.
- **Licença:** o Uppbeat permite conteúdo de site, mas proíbe oferecer o arquivo como download avulso. Por isso o repo guarda só a versão criptografada (`site-media/*.enc`, AAC 128k, openssl aes-256-cbc/pbkdf2), e o deploy do Pages decifra com o segredo `SITE_AUDIO_KEY`. O artifact de teste dos PRs não leva as músicas, e sem a chave a demo cai na faixa sintetizada.
- A batida da música (graves acima da média recente) acende a marca, o coração e o ponto do console, como o kick da faixa sintetizada.

**P1**
- **Teclado no palco:** com o foco no console, `←`/`→` trocam de preset, `R` alterna AUTO e `M` muta (como os atalhos do app). Sem atalho global na página.
- **M17 Copiar → copiado:** volta quando o winget for publicado (spec 016, P1).

## Fora de escopo
Novas seções ou textos; mudar layout ou cores do canvas; pulsar elementos com a música (rejeitado na v3); parallax; sons de interface; M09, M11, M13–M16 e M18–M23 (sem equivalente na landing).

## Critérios de aceite
Na página servida localmente (`npm run site:vendor` + `npx serve site`) e no ar:
1. Próximo/anterior/aleatório/AUTO e clicar num cartão trocam o título com subida e fade (M02). O autor entra depois do título, e a legenda do espelho troca junto.
2. Com AUTO ligado, a linha de rotação enche em 16 s e esvazia na troca; com AUTO desligado, ela não aparece.
3. Todo botão do console e de download afunda ao pressionar; o ícone do aleatório troca as setas; o do AUTO gira ao ligar.
4. Ao parar a demo, o medidor cai devagar e apaga em cascata, sem cortar para zero.
5. "Next 12" traz os cartões em degrau, sem atrasar o clique: dá para clicar de novo no meio da animação e ela recomeça.
6. Rolando a página, o sublinhado da navegação acompanha a seção visível, e cada seção entra uma vez.
7. Com "reduzir movimento" ligado no sistema: nenhum deslocamento nem escala; as trocas acontecem direto ou com fade ≤ 120 ms; o palco continua parado até o play (spec 017); medidor e batida seguem.
8. Nenhuma animação passa de 400 ms; só `transform`/`opacity` animam (conferir no DevTools › Animations); sem rolagem horizontal em 390 px.
9. No site publicado, Tocar demo toca '24 Hrs In Tokyo', mostra o crédito no console e passa para 'Space Dancers' ao fim; a marca pisca na batida. No artifact de PR ou sem a chave, toca a faixa sintetizada.
10. O fps do palco não cai com as animações (HUD do navegador ou Performance, num PC com Windows).

## Perguntas em aberto
- O canvas da landing deveria ganhar essas animações (sessão de design), ou a spec basta como referência? Se o site se afastar do canvas, o desvio fica registrado no PR (regra da 017).

## Referências
- `docs/design/v3/docs/v3-microinteracoes.md` (catálogo M01–M23 e regras), `docs/design/v3/prototype/so-v3-base.css` (tokens), página "Palco integrado" (implementação de referência), protótipo v3 `1794178325-0fd0` (`docs/design/v3/SYNC.md`).
- Canvas da landing `1794165992-cb8e` (`docs/design/landing/SYNC.md`), sem mudanças desde a 017.
- Spec [018](018-microinteracoes-faixa.md) (as mesmas microinterações no app).
- Termos do Uppbeat (o usuário confirmou no site: conteúdo de site é permitido; redistribuição e conteúdo só para ouvir, não): [Basic License](https://uppbeat.io/uppbeat-basic-license), [User Agreement](https://uppbeat.io/user-agreement).
