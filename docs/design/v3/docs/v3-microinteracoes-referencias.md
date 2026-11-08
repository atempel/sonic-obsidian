# Referências de microinterações — Sonic Obsidian

Legenda: [A] = página aberta e lida nesta sessão; [V] = URL vista só no resultado de busca, conteúdo não aberto (verificar antes de citar).

## A. Princípios de motion
1. **Emil Kowalski — Great animations** [A] — https://emilkowal.ski/ui/great-animations — Não animar ações repetidas muitas vezes ao dia (Raycast não tem animação de abertura); reservar motion para mudança de estado; manter < 300 ms e animar só transform/opacity.
2. **Emil Kowalski — 7 practical animation tips** [A] — https://emilkowal.ski/ui/7-practical-animation-tips — Press `scale(0.97)` em :active; entradas partem de scale ~0.93, nunca 0; ease-out para entrar/sair, nunca ease-in; tooltip 125 ms ease-out e vizinhos abrem instantâneos (0 ms); 180 ms parece mais ágil que 400 ms; ~2 px de blur mascara crossfade ruim.
3. **Emil Kowalski — Building a toast component (Sonner)** [A] — https://emilkowal.ski/ui/building-a-toast-component — Toasts com CSS transitions (interrompíveis) e não keyframes; pilha com scale -0.05 e Y -14 px por índice; vida de 4 s pausada no hover e com aba oculta; swipe fecha por distância ou velocidade > 0.11.
4. **Rauno Freiberg — Invisible details of interaction design** [A] — https://rauno.me/craft/interaction-design — Overlays de alta frequência (menu de contexto, Cmd+Tab) sem animação; confirmar escolha com flash breve da cor de acento; animações devem ser interrompíveis/reversíveis no meio.
5. **Material Design 3 motion (tokens no Material Components Android)** [A] — https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md — Standard `cubic-bezier(0.2,0,0,1)`, emphasized-decelerate `(0.05,0.7,0.1,1)`, accelerate `(0.3,0,0.8,0.15)`; durações Short 50/100/150/200, Medium 250–400; duração cresce com a área percorrida. Boa régua para validar 80/120/220/250/400.
6. **Apple HIG — Motion** [A] — https://developer.apple.com/design/human-interface-guidelines/motion — Feedback breve e preciso; evitar motion em interações frequentes; deixar o usuário cancelar/não esperar a animação; motion nunca como único canal de informação.
7. **Josh Comeau — linear() timing function (springs em CSS)** [A] — https://joshwcomeau.com/animation/linear-timing-function — Mola/bounce via `linear()` só dentro de `prefers-reduced-motion: no-preference`; CSS interrompido "estala" ao reverter, então para o que é interrompido com frequência usar mola em JS. Para "casca precisa" provavelmente evitar overshoot.
8. **W3C — Understanding SC 2.3.3 Animation from Interactions (AAA)** [A] — https://w3c.github.io/wcag/understanding/animation-from-interactions — Motion disparado por interação deve poder ser desligado salvo se essencial; honrar `prefers-reduced-motion` ou oferecer toggle. No app: respeitar a configuração do Windows e deixar o núcleo Butterchurn fora da regra (é conteúdo), mas cortar movimento da casca.
9. **W3C — Técnica C39 (prefers-reduced-motion)** [V] — https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html — Receita da media query para suprimir motion de interação.

## B. Padrões específicos
10. **Motion (Framer Motion) — Layout animations / layoutId** [A] — https://motion.dev/docs/react-layout-animations — Indicador que desliza entre abas = mesmo `layoutId` em elementos diferentes; anima só com transform; cuidado com distorção de bordas/radius (usar `layout` nos filhos). Em vanilla: FLIP com transform.
11. **Chrome — View Transitions, same-document** [A] — https://developer.chrome.com/docs/web-platform/view-transitions/same-document — `view-transition-name` por elemento para mover/crossfade; página congela enquanto o callback espera (manter curto, ~100 ms de timeout); em reduced motion preferir versão sutil, não zero. Útil para troca de modo/janela.
12. **Paul Lewis — FLIP (Supercharged, Google)** [V] — https://developers.google.com/web/shows/supercharged/season-2/flip-microtip-2-supercharged — First/Last/Invert/Play para transição de layout só com transform.
13. **Linear — Novo command menu** [A] — https://linear.app/changelog/2019-12-18-new-command-menu — Grupos ordenados pelo contexto atual, subdivididos por tipo, com ícones; a paleta é um atalho, não um espetáculo.
14. **Raycast — Paco Coursey (autor do cmdk)** [V] — https://www.raycast.com/community-stories/paco-coursey — Contexto do cmdk/Raycast; combinar com a regra do Emil (sem animação de abertura).
15. **Frontend Masters — View Transitions Staggering** [V] — https://frontendmasters.com/blog/view-transitions-staggering/ — Stagger de listas por delay incremental; conferir valores na fonte antes de usar.
16. **MDN — font-variant-numeric (tabular-nums)** [V] — https://developer.mozilla.org/zh-CN/docs/Web/CSS/font-variant-numeric — Dígitos de largura fixa para contadores/BPM/tempo sem tremer; base de qualquer odômetro.

## C. Medidores e balística
17. **Sound On Sound — PPM vs VU** [A] — https://www.soundonsound.com/sound-advice/q-whats-difference-between-ppm-and-vu-meters — VU: ~300 ms para subir e para cair; PPM: 10 ms (Tipo II) / 4 ms (Tipo I) de ataque e queda lenta (>1,5 s para cair 20 dB).
18. **The Broadcast Bridge — Audio Levels Part 4** [A] — https://www.thebroadcastbridge.com/content/entry/15251/audio-levels-part-4 — BBC PPM sobe em 10 ms e cai 24 dB em 2,8 s; VU não tem peak hold; a queda lenta do PPM faz o papel do hold. Modelo: ataque quase instantâneo, release lento.

## D. Hardware de áudio
19. **Teenage Engineering — OP-1 field (produto)** [A] — https://teenage.engineering/products/op-1 — Continuidade do desenho original, gráficos retrabalhados "tela por tela", interpolação suave de knob, pop-ups informativos.
20. **Sound On Sound — Review OP-1 field** [A] — https://www.soundonsound.com/reviews/teenage-engineering-op-1-field — Pop-up com parâmetro/valor do encoder só "quando não é óbvio"; navegação estável por 4 botões de modo; animação reservada ao conteúdo (personagens, Lissajous), não ao chrome.
- Ableton Live/Push, Elektron e Native Instruments: buscas não devolveram fonte primária aproveitável; nada listado.

## E. VJ, MilkDrop, players
21. **Resolume — Clips (manual)** [A] — https://www.resolume.com/index.php/support/en/7/clips — Selecionar (clicar no nome) é separado de disparar (clicar na miniatura); Beat Snap atrasa o disparo até o próximo beat/compasso. Ideia: troca de preset quantizada ao beat.
22. **Butterchurn README** [A] — https://unpkg.com/butterchurn@2.6.7/README.md — `visualizer.loadPreset(preset, blendTime)` com blendTime em segundos; o crossfade entre presets é do próprio motor, a UI só precisa sinalizar o evento.
23. **Geiss — MilkDrop preset authoring** [A] — https://www.geisswerks.com/milkdrop/milkdrop_preset_authoring.html — Scroll Lock trava a troca de preset; menu aberto trava o preset; M/ESC alterna o menu. Referência de "travar" como estado explícito.
24. **Wikipedia — MilkDrop** [A] — https://en.wikipedia.org/wiki/MilkDrop — Presets transicionam por interpolação gradual; não detalha overlay de título.
25. **Spotify Design — Bringing the Spotify heart to life** [A] — https://spotify.design/article/bringing-the-spotify-heart-to-life — Animação do like com teto de 500 ms, 60 fps, ligada ao ritmo; sem easing documentado.
- Winamp (marquee de título), Apple Music now playing, TouchDesigner, VDMX: sem fonte confirmada; nada listado.

## Páginas que não consegui abrir (permissão não respondida): aerotwist.com/blog/flip-your-animations, web.dev/articles/prefers-reduced-motion, developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric, github.com/pacocoursey/cmdk, blog.master.dev/view-transitions-staggering.

## Princípios destilados
1. Frequência decide: o que acontece muitas vezes por dia (abrir paleta, trocar foco, atalhos) não anima. — Emil (Great animations), Rauno, HIG
2. Fique abaixo de 300 ms; 120–220 ms para a maioria dos eventos, 400 ms só para movimento longo/grande. — Emil, M3 (duração cresce com a distância)
3. Ease-out sempre para entrar e sair; nunca ease-in em UI. Seu `cubic-bezier(0.16,1,0.3,1)` é da família decelerate do M3 (0.05,0.7,0.1,1). — Emil (7 tips), M3
4. Nada nasce de scale(0): entrada parte de ~0.93 com opacidade; press de botão a 0.97. — Emil (7 tips)
5. Transições CSS em vez de keyframes para o que pode ser interrompido (toast, indicador, hover): elas retargetam no meio do caminho. — Emil (Sonner), Rauno, Comeau
6. Primeira exibição com atraso, as seguintes instantâneas: tooltip de vizinho abre com 0 ms quando outro já está aberto. — Emil (7 tips)
7. Medidor: ataque quase instantâneo, queda lenta (PPM 10 ms de ataque, ~1,5 s para cair 20 dB); VU 300 ms simétrico é o "calmo". Peak hold = queda lenta, sem animação extra. — SOS, Broadcast Bridge
8. Chrome dos instrumentos fica quieto; a animação vive no conteúdo; popup de valor só quando não é óbvio. — OP-1 field (SOS review), Rauno
9. Troca de preset/modo é um evento discreto: sinalizar com um pulso curto (flash de acento) e quantizar ao beat se possível; o blend longo é do motor. — Resolume (Beat Snap), Butterchurn (blendTime), Rauno (flash de confirmação)
10. Reduced motion não é motion zero: honrar a preferência do SO, trocar deslocamento por fade curto, e manter o estado comunicado por outro canal além do movimento. — WCAG 2.3.3, Chrome View Transitions, HIG
11. Layout que muda (aba, modo, janela): mover com transform via FLIP/layoutId, nunca animar width/height. — Motion docs, Chrome View Transitions
12. Dígitos que mudam (BPM, tempo, contadores): tabular-nums para não tremer. — MDN [V]
