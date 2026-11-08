# Microinterações do design (versão 1794171149-6542)
Status: Pending (todas "Propostas" no design; o usuário escolhe quais entram)
Fonte: docs/design/v3/docs/v3-microinteracoes.md (catálogo M01–M23 e sistema de movimento) e v3-microinteracoes-referencias.md; laboratórios `Sonic Obsidian Micro Faixa.html` e `Micro Navegação.html`
Resumo: sistema de movimento ("a casca não se mexe sozinha"; tudo < 400 ms, ease-out, nada anima a cada quadro além do medidor) e 23 microinterações: faixa em degrau (M01), flash e troca de título na troca de preset (M02), linha de rotação que esvazia (M03), pressão 0,97 nos botões (M04), ícones de aleatório, rotação e favorito (M05–M07), medidor com balística de PPM (M08), indicador deslizante nas abas (M10), gaveta em degrau (M12), toast de 4 s com pausa no hover (M13), switch e slider com leitura (M14–M15), controles da janela deslizando 4 px e `x` girando no hover (M16), silêncio com carência (M18), Modo limpo com fade de 400 ms (M19), Palco → Rack por FLIP (M20).
Destino provável:
- Escolha do usuário: quais itens entram, e quando (spec nova "Microinterações" ou P1 das specs em andamento).
- Relação com specs: M16 e M19 tocam a spec 014; M10, M14 e M15 tocam a 011; M18 propõe o painel "Sem áudio" depois de 1,2 s, mas o código usa 10 s por decisão do usuário (DECISIONS, spec 005), então registrar em DIVERGENCIAS se não mudar.
- A 014 implementa só o comportamento combinado (fade simples com os tokens atuais) e não as microinterações propostas, até a escolha.
