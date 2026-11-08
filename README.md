# Sonic Obsidian

Visualizador de áudio para Windows no espírito do MilkDrop/Winamp. Captura o som do sistema e o transforma em visuais reativos, com o motor [Butterchurn](https://github.com/jberg/butterchurn) e uma interface própria.

> **Status:** em reconstrução (nov/2026) — migrando de Python/Pygame para Electron + Butterchurn. A versão Python funcional está em [`legacy/python/`](legacy/python/README.md).

## Documentação
- [PROJECT.md](PROJECT.md) — visão geral e onde está cada coisa
- [docs/PRD.md](docs/PRD.md) — produto e roadmap
- [TASKS.md](TASKS.md) — o que está sendo feito agora
- [DECISIONS.md](DECISIONS.md) — por que as coisas são como são

## Créditos e agradecimentos
O Sonic Obsidian existe porque outras pessoas fizeram a parte difícil e abriram o código:

- **[Butterchurn](https://github.com/jberg/butterchurn)**, de Jordan Berg e contribuidores (MIT): o motor visual inteiro. É uma implementação em WebGL do MilkDrop 2, e o app o usa como dependência, sem fork e sem modificações.
- **[MilkDrop](https://www.geisswerks.com/milkdrop/)**, de Ryan Geiss (Nullsoft): o visualizador original que inspira tudo isto.
- **Presets** de [butterchurn-presets](https://github.com/jberg/butterchurn-presets): obras de artistas da comunidade MilkDrop. O nome de cada preset carrega o crédito do autor, e o app nunca o remove nem o renomeia.

Muito obrigado. Os textos de licença dessas dependências estão em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), que também vai dentro da pasta do app.

## Licença
Proprietária — uso pessoal. Ver [LICENSE](LICENSE).
