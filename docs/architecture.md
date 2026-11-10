# Arquitetura v3 — Sonic Obsidian

> Estado: **planejamento** (8/nov/2026). Hoje o código é o spike da Fase 0 (`src/main/index.ts`, `src/renderer/src/*`). Este documento descreve para onde ele cresce para suportar a interface v3, as fontes de áudio, presets do usuário e o MCP. Decisões em [DECISIONS.md](../DECISIONS.md) (2026-11-08); interface em [design/v3-modelo-de-navegacao.md](design/v3-modelo-de-navegacao.md).

## 1. Princípio: um único núcleo de comandos

Teclado, faixa de controle, Biblioteca, Configurações, Estúdio e MCP são **clientes do mesmo núcleo**. Nenhum deles mexe no Butterchurn diretamente.

```
            teclado / UI (renderer)                 cliente de IA (Claude, Cursor…)
                     │                                          │ MCP (stdio ou HTTP local)
                     ▼                                          ▼
            ┌──────────────────┐   IPC (preload, API estreita)  ┌──────────────────────┐
            │  Core (renderer) │ ◄────────────────────────────► │  Main process        │
            │  ─ AppState      │                                │  ─ McpServer         │
            │  ─ commands      │                                │  ─ Settings (disco)  │
            │  ─ events        │                                │  ─ PresetStore (disco)│
            └───┬─────┬────┬───┘                                │  ─ SoundCloud (token)│
                │     │    │                                    │  ─ loopback handler  │
     AudioGraph │  Engine  │ PresetLibrary                      └──────────────────────┘
      (fontes)  │(Butterchurn) (índice em memória)
```

- **AppState** — um store único e serializável: preset atual, histórico, rotação, blend (manual/automático), fonte ativa, ganho, fps, favoritos/ocultos/coleções, overlay aberto, controle por IA pausado.
- **Commands** — funções nomeadas e tipadas (`preset.play`, `preset.next`, `preset.random`, `rotation.set`, `signal.set`, `source.set`, `library.favorite`, `preset.create`, `preset.validate`, `frame.capture`, `overlay.showText`…). Cada uma valida a entrada (schema), aplica, emite um evento e devolve um resultado. **As ferramentas MCP são um mapeamento 1:1 para esses comandos**, então o MCP não tem lógica própria.
- **Events** — `presetChanged`, `sourceChanged`, `levelTick`, `aiAction`… A UI e o registro de atividade do MCP assinam os mesmos eventos.
- Cada comando tem uma **origem** (`keyboard`, `ui`, `rotation`, `mcp:<cliente>`), usada no histórico de versões, nos toasts de IA e para bloquear comandos de IA quando o controle está pausado.

Consequência prática para a Fase 1/2: as specs 002–005 já devem implementar navegação, rotação, janela e sinal **como comandos**, mesmo antes de haver UI ou MCP. É o que torna o MCP barato depois.

## 2. Processos e segurança do Electron
- Renderer com `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` (como hoje). O `preload` expõe só funções específicas (`window.so.settings.get/set`, `window.so.presets.read/write`, `window.so.mcp.onCommand/reply`…), nunca `ipcRenderer` cru.
- CSP: hoje `'unsafe-eval'` (Butterchurn 2.x compila equações com `new Function`). Meta após o spike 006: só `'wasm-unsafe-eval'`.
- Tudo que toca disco, rede com segredo ou portas locais fica no **main**. O renderer não conhece tokens.

## 3. Engine (Butterchurn)
- Envolve o `visualizer` e é o único lugar que chama a API do Butterchurn: `loadPreset(preset, blend)`, `setRendererSize`, `setInternalMeshSize`, `setOutputAA`, `launchSongTitleAnim(text)`, `loadExtraImages`, `toDataURL`.
- **Configurações → API** (seção Renderização): malha → `meshWidth/meshHeight` (`setInternalMeshSize`); escala de pixels → `pixelRatio`; resolução das texturas → `textureRatio`; FXAA → `outputFXAA` (`setOutputAA`); tamanho do canvas e limite de quadros → controlados pelo app (tamanho do canvas e cadência do `requestAnimationFrame`); imagens extras → `loadExtraImages`.
- Mede fps por preset (média móvel durante os primeiros segundos) e alimenta "Ocultos por desempenho".
- Versão: 2.6.7 hoje; migração para 3.x decidida pelo spike [006](specs/006-spike-butterchurn3-milk.md).

## 4. Fontes de áudio
Interface comum:

```ts
interface AudioSource {
  kind: 'system' | 'microphone' | 'file' | 'soundcloud'
  start(ctx: AudioContext): Promise<AudioNode>   // nó que entra no ganho
  stop(): void
  transport?: { play(); pause(); seek(s: number); duration: number; position: number; meta: TrackMeta }
}
```

Grafo: `fonte → GainNode → (Butterchurn + medidor)`. Só arquivo e SoundCloud ligam também `→ ctx.destination`, para o usuário ouvir; o loopback e o microfone nunca vão para a saída (eco/realimentação).

| Fonte | Implementação | Observações |
|---|---|---|
| **Sistema** (padrão) | o que existe hoje: `getDisplayMedia` + `audio: 'loopback'` no main | sem escolha de dispositivo: captura a mixagem |
| **Microfone** | `getUserMedia({ audio: { deviceId } })`, lista por `enumerateDevices` | sem eco: não vai para a saída |
| **Arquivo** | `<audio src=blob:>` → `MediaElementSource`; escolher ou arrastar; mp3/wav/flac/ogg/m4a | enquanto toca, o loopback fica **parado** (senão o app analisaria o próprio som duas vezes); ao terminar ou fechar, volta ao sistema |
| **SoundCloud** | condicional ao spike [007](specs/007-spike-soundcloud.md): (A) API + `hls.js` + `MediaElementSource`, token no main; ou (B) widget oficial numa view + loopback | crédito + link sempre visíveis; nada em disco |

Trocar de fonte é o comando `source.set`; título de faixa usa `launchSongTitleAnim` se a opção estiver ligada.

## 5. Presets do usuário e Estúdio

### Formatos e armazenamento
- **Importados:** a fonte é o **`.milk`** (texto do MilkDrop 2); o convertido é cache.
- **Meus presets (Estúdio, spec 026):** a fonte é o **preset Butterchurn 3 em JSON** (`*_eel` + shaders GLSL). Os presets do pacote já são JSON, sem `.milk` nem caminho de volta para HLSL; guardar o JSON evita perder os shaders. O `.milk` vira formato de exportação (027). DECISIONS 2026-11-10.
- Pasta de dados (`app.getPath('userData')`):
  ```
  presets/
    imported/<id>.milk            # importados (arquivo/arrastar)
    imported/<id>.json            # convertido (cache) + nome
    mine/<id>/preset.json         # meu preset (Estúdio): o preset Butterchurn 3
    mine/<id>/preset.prev.json    # a versão anterior (P0); histórico completo na 027
    mine/<id>/meta.json           # título, autor, basedOn (crédito original), createdAt
  library.json                    # favoritos, ocultos, recentes, coleções, fps medido
  settings.json
  ```
- Presets de terceiros nunca são editados no lugar: "Editar uma cópia" cria `mine/<id>` com `baseado em: <nome original — autor>`.

### Pipeline (o mesmo para arquivo, Estúdio e MCP)
```
.milk (texto) ─► parse (seções, baseVals, equações EEL, shaders HLSL)
              ─► shaders HLSL → GLSL (hlslparser-js)
              ─► preset Butterchurn 3.x com equações *_eel (WASM)
              ─► sanitizar: remover *_str e useJS, limitar tamanho, rejeitar campos desconhecidos
              ─► validar: compilar num visualizer de teste; erros com seção + linha
              ─► cache + carregar (ou devolver os erros)
```
- **Regra de segurança:** nenhum preset de fora vira JavaScript. Sem o Butterchurn 3.x (`onlyUseWASM`), este pipeline não é ligado (ver DECISIONS, proposta de 2026-11-08).
- Shaders GLSL não executam código no host, mas podem travar a GPU ou não compilar: compilar com `try/catch`, medir o tempo do primeiro quadro e reverter se passar de um limite.
- Exportar `.milk`: importados devolvem o arquivo-fonte; meus presets precisam de um gerador de `.milk` a partir do JSON (027), com aviso quando o shader GLSL não tem volta para HLSL.
- **No P0 do Estúdio (026)** a validação tem duas barreiras antes do visualizador principal: um Worker com o `eel-wasm` (erro com bloco e linha, e um quadro rodado com teto de 1 s, porque `loop(n, …)` não tem limite e `while` limita a ~1 milhão de voltas por chamada, o que em `per_pixel` multiplica pelos pontos da malha) e o visualizador de teste de 64×64 da 022. CSP: `worker-src blob:`.

### Estúdio
- P0 (026): camada em tela cheia sobre o Palco; a prévia é o visualizador principal. Edita `per_frame_init`, `per_frame` e `per_pixel`; shaders só leitura.
- P1 (027): abas Básico (parâmetros `baseVals`), Equações, Ondas, Formas, Shaders (`warp`, `comp`) — todas editam o mesmo preset em memória.
- Compila com debounce de 400 ms pelo pipeline acima; com erro, continua tocando a última versão válida.
- Variáveis de áudio expostas nas equações: `bass`, `mid`, `treb`, `bass_att`, `mid_att`, `treb_att`, `time`, `frame`, `fps`.
- Cada salvamento e cada `update_preset` via MCP gera uma versão restaurável, com origem registrada.

## 6. MCP — o app como servidor local
O app não embute IA. Ele expõe um servidor **MCP** para a ferramenta de IA que o usuário já usa.

- **Desligado por padrão.** Liga em Configurações › Integrações.
- **Onde roda:** no main process, com o SDK oficial TypeScript **v2** (`@modelcontextprotocol/server`, especificação 2026-07-28, sem sessões no protocolo; a v1 `@modelcontextprotocol/sdk` só recebe correções). Cada chamada de ferramenta vira um comando enviado ao Core do renderer pelo IPC e espera o resultado. Conferir no início da fase o wrapper HTTP para Node e as assinaturas de recursos/prompts nos `examples/` do SDK (não verificados).
- **Transportes** (os dois são necessários):
  - **HTTP local (Streamable HTTP)** em `127.0.0.1:<porta>` (padrão 7341), nunca em `0.0.0.0`. A especificação **exige** validar o cabeçalho `Origin` e responder 403 se inválido (DNS rebinding); além disso, `Authorization: Bearer <token>` com token por cliente, gerado e revogável na UI. Atende Claude Code (`claude mcp add --transport http`) e Cursor.
  - **stdio** — obrigatório para o **Claude Desktop**, que só executa servidores locais como processo (conectores personalizados dele precisam de URL pública, o que não queremos). Executável fino `sonic-obsidian-mcp` (o binário do Electron com `ELECTRON_RUN_AS_NODE` + script empacotado) que repassa stdio ↔ HTTP local do app aberto, usando o mesmo token. Se o app não estiver aberto: erro claro ("abra o Sonic Obsidian"). Mesmo padrão do Blender MCP, mas **com** autenticação (o dele não tem).
- **Escopos** (switches na UI, aplicados por token): ler status e biblioteca · controlar reprodução · criar e editar presets · ver o visual (captura de quadro) · gerenciar biblioteca (apagar sempre pede confirmação **no app**).
- **Ferramentas** (nomes do design; cada uma = um comando do Core):

  | Ferramenta | Comando | Escopo |
  |---|---|---|
  | `get_status` | `state.get` | ler |
  | `get_audio_features` | `audio.features` (bass/mid/treb, nível; BPM só quando existir detecção de beat) | ler |
  | `list_presets`, `get_preset` | `library.list`, `preset.read` (devolve o `.milk`) | ler |
  | `play_preset`, `next_preset`, `previous_preset`, `random_preset` | `preset.*` | controlar |
  | `set_rotation`, `set_signal`, `set_audio_source` | `rotation.set`, `signal.set`, `source.set` | controlar |
  | `show_text` | `overlay.showText` (`launchSongTitleAnim`) | controlar |
  | `validate_preset` | `preset.validate` (erros por seção/linha, sem tocar) | criar |
  | `create_preset` (`preview: true` toca sem salvar), `update_preset` (só presets do usuário; de terceiros vira remix) | `preset.create`, `preset.update` | criar |
  | `capture_frame` | `frame.capture` (`toDataURL` → PNG como conteúdo `image` do resultado; se o cliente não mostrar imagens ao modelo, devolver também uma descrição numérica: cores dominantes, brilho, movimento) | ver |
  | `manage_collection` | `library.collection.*` | gerenciar |

- **Recursos:** `preset://{id}` (o `.milk`), `docs://milkdrop/authoring` (guia de seções, variáveis e funções EEL — é o que permite à IA escrever presets válidos), `docs://sonic-obsidian/examples`.
- **Prompts:** `criar-preset` (descrição, energia, paleta), `remixar-preset`.
- **Ciclo de criação por IA:** `docs://milkdrop/authoring` → `create_preset(preview)` → `capture_frame` → ajustar → `validate_preset`/`update_preset` → salvar. A IA vê o resultado pela captura.
- **Na interface:** chip "<cliente> conectado", toast por ação, registro de atividade (hora, cliente, ferramenta, resultado), "Pausar controle por IA" (`Ctrl+Shift+P`) que bloqueia todo comando com origem `mcp:*` que altere estado. Presets criados mostram "Criado com <cliente>".
- **A confirmar na implementação:** se Claude Desktop e Claude Code repassam ao modelo as imagens de resultado de ferramenta (Cursor documenta que sim).
- **Limites:** taxa máxima de comandos por segundo por cliente; tamanho máximo de `.milk`; `capture_frame` reduzido (ex.: 640 px) para não pesar no contexto da IA.

## 7. Configurações e persistência
- `settings.json` no `userData`, lido e escrito só pelo main; o renderer recebe um snapshot e pede mudanças via IPC. Salvamento automático com debounce.
- `library.json` separado (cresce com uso). Exportar/importar coleções = esse JSON filtrado.
- Segredos (token do SoundCloud, tokens MCP) com `safeStorage` do Electron, fora dos JSON.

## 8. Ordem de construção (resumo — detalhe no PRD)
1. **Fase 1** (specs 002–005) já como comandos do Core.
2. **Fase 2 — Interface v3**: Palco + faixa, busca rápida, Biblioteca, ajustes rápidos, Configurações (Geral, Captura-sistema, Visual, Renderização, Desempenho, Atalhos, Sobre), setup/diagnóstico. Persistência entra aqui (antes estava na Fase 4).
3. **Fase 3 — Fontes e presets**: arquivo e microfone; spikes 006 e 007; importar `.milk`; Estúdio; SoundCloud se o 007 aprovar.
4. **Fase 4 — MCP**: servidor, transportes, escopos, ferramentas de controle; criação de presets se o 006 aprovar.
5. **Fase 5 — Extras**: Rack/multi-monitor, beat/BPM, "iniciar com o Windows", instalador.
