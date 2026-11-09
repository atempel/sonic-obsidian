# Suíte de testes automatizados de performance (e de regressão)
Status: Pending
Fonte: pedido do usuário na sessão de 2026-11-09 ("não quero testar apenas no meu computador, é um caso de uso ruim")
Resumo: Depois de terminar as tarefas abertas, criar uma suíte que meça a performance sem depender da máquina do usuário. Ela roda no CI e falha quando algo piora. Também evitaria bugs como o das Configurações deslocadas (#56), que nenhum teste pegou.
Destino provável: spec nova (planejar com `planejar-feature`) + DECISIONS (ferramentas e limites de cada medida). Pontos para o planejamento:
- **Abertura:** Playwright com `_electron.launch` no `windows-latest` do CI, lendo a linha `abertura (ms desde o processo)` do log (PR #56). Comparar com um limite e com a média das últimas execuções.
- **Render:** custo por preset (ms por quadro) num canvas de tamanho fixo. A GPU do runner é por software (SwiftShader/WARP), então o número vale para comparar builds entre si, não como fps real. Decidir se mede uma amostra fixa de presets ou todos.
- **Memória:** sessão acelerada (muitas trocas de preset em poucos minutos) acompanhando o heap JS e a memória da GPU, para pegar vazamentos como o dos shaders.
- **Interface:** os testes headless que hoje ficam no scratchpad (painel `?`, busca, Configurações em várias resoluções) viram testes versionados, com `window.so` e `getDisplayMedia` simulados.
- **Ainda manual:** o fps real na GPU do usuário e o áudio real do loopback continuam dependendo do Windows dele. Definir quais critérios das specs passam a ser "verificado pelo CI".
