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

### 2026-11-08 — Configurações › Captura · Ganho padrão
Protótipo (`1794154301-3f85`): "Ganho padrão" é um slider linear de 0,5× a 2× (padrão 1,0×), enquanto os Ajustes rápidos usam −12 a +12 dB com padrão +3 dB.
Código (planejado): dB nos dois lugares, −12 a +12, padrão **0 dB** — uma unidade só para o mesmo valor, e 0 dB = sinal como chega (o +3 do protótipo seria um reforço escondido).
PR/spec: docs/specs/011-ajustes-configuracoes.md
Status: Aberta. Pedido ao design: alinhar o slider das Configurações a dB.

### 2026-11-08 — Configurações › Renderização · Limite de quadros
Protótipo (`1794154301-3f85`): opções 30 / 45 / 60 / 144 / Sem limite, padrão 60.
Código: hoje o padrão é `'monitor'` (taxa da tela, spec 004). Planejado seguir o protótipo: padrão 60 e "Sem limite" = taxa do monitor.
PR/spec: docs/specs/011-ajustes-configuracoes.md
Status: Aberta só como registro; o código vai ao desenho na 011.

### 2026-11-08 — Palco integrado e Setup · texto do aviso de silêncio
Protótipo (`1794154301-3f85`): o Palco mostra "Sem áudio" / "Toque algo no computador e o visual reage. A captura continua ligada."; o Setup mostra "Nenhum som chegando" / "A captura está ligada. Toque algo ou confira se o som está saindo pela saída padrão do Windows." — dois textos para o mesmo estado (10 s de silêncio).
Código: a spec 005 usa "Nenhum som chegando". As specs 009/012 mostram um aviso só.
PR/spec: docs/specs/009-palco-faixa-assinatura.md, docs/specs/012-setup-diagnostico-desempenho.md
Status: Aberta. Pedido ao design: escolher um texto (proposta: título do Palco + ação "Testar captura" do Setup).

### 2026-11-08 — atalhos globais e Ajustes rápidos · ganho
Protótipo (`1794154301-3f85`): o ganho é um slider nos Ajustes rápidos / faixa (Palco integrado, `#gainMini`) de −12 a +12 dB em passos de 1 dB; não há atalho de teclado para ganho.
Código: faixa e passo **alinhados ao protótipo** (−12 a +12 dB, 1 dB), depois que o teste mostrou que +6 a +9 dB bastam para a barra chegar à metade. Continuam as teclas `+`/`−`/`0`, porque não há UI na Fase 1.
PR/spec: (PR da spec 005) · docs/specs/005-sinal-entrada.md
Status: Aberta só quanto às teclas. Proposta: saem junto com `[`/`]` quando os Ajustes rápidos existirem.

### 2026-11-08 — atalhos globais · `[` / `]`
Protótipo (`1794154301-3f85`): `[`/`]` não estão nos atalhos globais; em `v3-video-vj.md` §6 eles controlam a opacidade da camada de vídeo (frente VJ, ainda pendente no PRD). O intervalo da rotação fica nos Ajustes rápidos e em Configurações › Visual.
Código: `[`/`]` mudam o intervalo da rotação (10/15/30/60/120 s), porque não há UI na Fase 1 para ajustar o intervalo (spec 003, P1).
PR/spec: #13 · docs/specs/003-rotacao-automatica.md
Status: Aberta. Proposta: tirar `[`/`]` da rotação quando os Ajustes rápidos (Fase 2) existirem ou quando a frente VJ entrar, o que vier primeiro.
