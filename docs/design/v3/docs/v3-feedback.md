# Sonic Obsidian v3 — Feedback e bugs

> Sessão de design, 10/11/2026. **Status: aprovado para spec (10/11/2026).** O app é aberto (MIT) e sem conta: o feedback vai para o GitHub, sem servidor nosso e sem telemetria.

## Três portas, cada uma com um destino
| No app | Vai para | Por quê |
| --- | --- | --- |
| **Relatar um problema** | Issue, formulário *Bug report* | Bug precisa de versão, sistema e passos; vira trabalho rastreável. |
| **Sugerir uma ideia** | Discussions › *Ideas* | Ideia precisa de conversa antes de virar tarefa. O mantenedor converte em issue quando decidir. |
| **Fazer uma pergunta** | Discussions › *Q&A* | Resposta marcada ajuda o próximo; não polui as issues. |

E uma quarta categoria só no GitHub: **Show and tell** ("Mostre seu preset"), para presets `.milk` e vídeos. Ela conversa com a importação e o Estúdio.

## No app
- **Ajustes rápidos:** um botão de ícone `message-square` no cabeçalho, ao lado de "Todas as configurações", com `title` "Feedback e bugs". Ele abre um menu pequeno com as três portas e, embaixo, "Copiar diagnóstico".
- **Configurações › Sobre:** as mesmas três linhas, mais "Abrir a pasta do log".
- **Busca rápida:** os comandos "Relatar um problema", "Sugerir uma ideia" e "Fazer uma pergunta".
- **Antes de abrir o navegador**, "Relatar um problema" mostra um painel curto com o que vai junto: versão, Windows, GPU, saída de áudio e o preset atual. Cada item tem um switch, e o botão é "Abrir no GitHub". Nada sai sem a pessoa ver.
- **Preenchimento:** o formulário do GitHub aceita os campos na URL (`issues/new?template=bug_report.yml&version=…&system=…&preset=…`). O log não vai na URL, porque é longo e pode ter caminhos pessoais. "Copiar diagnóstico" põe as últimas 200 linhas na área de transferência, e o formulário pede para colar.
- **Precisa de conta no GitHub** para enviar. O painel diz isso numa linha: "Você vai precisar de uma conta no GitHub para enviar."
- Depois de abrir, o toast diz: "Abrimos o GitHub no navegador."

## No repositório
- **Ligar Discussions** com as categorias *Announcements*, *Ideas*, *Q&A* (formato de resposta) e *Show and tell*.
- **`config.yml`:** `blank_issues_enabled: false`. Links de contato para *Ideas* e *Q&A*, além do de segurança que já existe.
- **`feature_request.yml`:** continua existindo para ideias já conversadas. A descrição dele aponta primeiro para *Ideas*.
- **`bug_report.yml`:** os `id`s dos campos ficam estáveis (`version`, `system`, `preset`), porque o app depende deles para preencher a URL. Entra um campo `audio` (saída de áudio) e um de diagnóstico colado.
- **Rótulos:** `bug`, `idea`, `preset`, `needs-info`, `windows-only` (só no Windows), `good first issue`.
- **README e landing:** uma seção "Feedback" com as mesmas três portas.
- Templates e categorias em inglês; aceitar pt-BR nas respostas.

## Fora
Formulário dentro do app, envio anônimo, telemetria e coleta automática de erros. Não ter servidor é uma promessa do projeto.
