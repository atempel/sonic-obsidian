# Sonic Obsidian v3 — Perfis de ajustes

> Sessão de design, 10/11/2026. **Status: aprovado para spec (10/11/2026).** Ideia do usuário: salvar combinações de ajustes (transições, expressividade e outros) para trocar com um clique. Páginas: Palco integrado › Ajustes rápidos e Configurações › Perfis.

## Nome: Perfil, não "preset"
No app, **preset** já é a visualização do MilkDrop, e chamar as duas coisas pelo mesmo nome confundiria tudo. O nome proposto é **Perfil** (en: *Profile*): um conjunto salvo de *como* o visual se comporta, independente de *qual* preset está tocando.

Também não é **Cena**. A Cena (frente VJ) guarda um preset específico, mais clipes e mesclagem. Um Perfil vale para qualquer preset. Uma Cena pode apontar para um Perfil (P2).

## O que um perfil guarda
Ao salvar, a pessoa escolhe os grupos (todos vêm marcados, menos os dois últimos):
| Grupo | Conteúdo | Marcado por padrão |
| --- | --- | --- |
| Expressividade | nível, caráter, memória, curva por frequência | sim |
| Transições | tipo e tempo, manual e automática | sim |
| Rotação | ligada, intervalo, ordem, trocar no beat | sim |
| Sinal | ganho | não (depende da sala e do volume) |
| Texto sobre o visual | nome do preset, título, avisos | não |

Grupos fora do perfil ficam como estão quando ele é aplicado.

## Perfis que vêm com o app
Não podem ser apagados; podem ser duplicados.
- **Padrão:** o motor como sempre (Expressividade 0, Energia, Curta, curva plana; manual Aleatório 1 s, automática Crossfade 2,7 s; rotação a cada 30 s).
- **Calmo:** Expressividade −2, Contraste, memória Longa, curva Plana; Crossfade 5 s nas duas trocas; rotação a cada 60 s.
- **Festa:** Expressividade +2, Nervo, memória Fixa, curva Graves; corte seco na troca manual, Radial 1 s na automática; rotação a cada 15 s.
- **Estudar presets:** Expressividade 0, curva Plana; Crossfade 1 s; rotação desligada.

## Interface
**Ajustes rápidos, logo abaixo do cabeçalho**, fixo enquanto o painel rola:
- Um seletor "Perfil" com o nome do perfil atual. Ao abrir, ele lista os perfis (os do app primeiro, com o rótulo "do app") e, embaixo, "Salvar como novo perfil…".
- Quando algum ajuste muda depois de aplicar o perfil, aparece um ponto ao lado do nome ("Festa •") e dois botões: **Atualizar** (só em perfil seu) e **Desfazer** (volta aos valores do perfil). Atualizar exige confirmar: mostra o que muda.
- "Salvar como novo perfil…" abre um campo de nome, com os cinco grupos marcáveis embaixo. Enter salva.
- Toast ao aplicar: "Perfil: Festa".

**Configurações › Perfis** (seção nova, ícone `bookmark`):
- Lista dos perfis, cada um com um resumo em uma linha ("+2 · Nervo · Fixa · Graves · corte seco · 15 s") e um menu "…" com Aplicar, Renomear, Duplicar, Exportar `.json` e Apagar.
- "Importar perfil…" para um `.json`. Serve para trocar perfis com outras pessoas (Discussions › Show and tell).
- "Perfil ao abrir: Último usado · um perfil".

**Busca rápida:** comandos "Perfil: Calmo", "Perfil: Festa"… e "Salvar como novo perfil…".

**Teclado:** `Alt+1`…`Alt+9` aplicam os nove primeiros perfis, na ordem do menu (decisão do usuário, 10/11). Não conflitam com os pads do Modo performance, que usam números sem modificador. A tecla aparece no menu, na busca, no painel `?` e em Configurações › Atalhos.

## Depois (P2)
- Perfil por coleção: "Ao tocar esta coleção, usar o perfil X."
- Uma Cena guarda o perfil junto.
- MCP: `list_profiles`, `apply_profile` e `save_profile`. A IA monta um perfil para um gênero de música.

## No app
Estado: `profiles: { id, name, builtIn, groups, values }[]`, `activeProfile`, `profileDirty` (calculado comparando os valores). Comandos: `profile.apply`, `profile.save`, `profile.update`, `profile.revert`. Arquivo: `userData/profiles.json`. Exportado como `.json` com `version` e `app`.
