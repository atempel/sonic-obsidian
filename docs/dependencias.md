# Dependências — checagem de segurança

Toda dependência nova (ou troca de versão) passa por esta checagem **no momento em que é adicionada**, antes do commit, e ganha uma linha no registro abaixo. É rápida (≈1 min) e só lê o registro do npm; não substitui uma auditoria, mas pega os sinais baratos de risco de cadeia de suprimentos.

## Como checar
1. **Antes de instalar:**
   ```bash
   npm view <pkg>@<versão> license dependencies scripts dist.attestations maintainers --json
   ```
   ```bash
   npm view <pkg> time --json
   ```
   - **Licença** MIT/BSD/Apache/ISC; copyleft (GPL/LGPL) ou paga → parar e perguntar (AGENTS.md, Limites).
   - **Idade:** a versão precisa estar publicada há **14 dias ou mais**. Versão mais nova que isso → usar a última que cumpre a regra (sequestros de pacote costumam ser descobertos em dias).
   - **Install scripts:** `preinstall`/`install`/`postinstall` → só com motivo claro (ex.: binário do Electron).
   - **Proveniência:** `dist.attestations` presente é bom sinal (build ligado ao repositório público); ausência não bloqueia, mas vai na observação.
   - **Dependências diretas:** quantas entram junto.
2. **Instalar com versão exata:** `npm install --save-exact <pkg>@<versão>` (ou `--save-dev`).
3. **Depois de instalar:**
   ```bash
   npm audit --omit=dev
   ```
   ```bash
   npm audit signatures
   ```
   E conferir no diff do `package-lock.json` o que entrou de transitivo e se algum pacote novo tem `"hasInstallScript": true`.
4. **Registrar** uma linha na tabela abaixo. Qualquer sinal ruim (licença, versão recente demais, install script inesperado, vulnerabilidade alta/crítica em produção, mantenedor trocado de repente) → parar e perguntar ao usuário antes do commit.

## Registro

| Data | Pacote@versão | Tipo | Publicada em | Licença | Deps diretas | Install script | Proveniência | `npm audit` | Veredito |
|---|---|---|---|---|---|---|---|---|---|
| 2026-11-08 | `preact@11.0.2` | prod | 2026-10-23 | MIT | 0 (peer opcional `preact-render-to-string`, não instalado) | não | sim (SLSA v1) | 0 em produção | **ok.** A 11.2.0 (`latest`) foi descartada por ter só 2 dias; 11.1.x também tinham menos de 14 dias. |
| 2026-11-08 | `@fontsource/space-grotesk@5.3.0` | prod (fonte) | 2026-07-19 | OFL-1.1 | 0 | não | sim (SLSA v1) | 0 em produção | **ok.** Licença de fonte que permite embutir; texto da OFL em THIRD_PARTY_NOTICES. Só os pesos 400/500/600 são importados. |
| 2026-11-08 | `@fontsource/jetbrains-mono@5.3.0` | prod (fonte) | 2026-07-19 | OFL-1.1 | 0 | não | sim (SLSA v1) | 0 em produção | **ok.** Mesmos mantenedores do anterior; pesos 400/500. |
| 2026-11-08 | ícones do `lucide-static@0.460.0` (copiados, não instalados) | — | 2024-11-15 | ISC | — | — | — | — | **ok.** 13 SVGs copiados para `ui/icons.tsx`; aviso ISC em THIRD_PARTY_NOTICES. Lido de um `npm pack` em pasta isolada. |
| 2026-11-09 | `butterchurn@3.0.0-beta.5` (alias `butterchurn3`) | prod (spike 006) | 2025-07-13 | MIT | 3 (`@assemblyscript/loader`, `ecma-proposal-math-extensions`, `eel-wasm`) | não | não | 0 | **ok para o spike** (aprovado pelo usuário). Beta desde 2021; mesmo mantenedor do 2.6.7. |
| 2026-11-09 | `butterchurn-presets@3.0.0-beta.4` (alias `butterchurn-presets3`) | prod (spike 006) | 2021-06-01 | MIT | 1 (`@babel/runtime`) | não | não | 0 | **ok para o spike.** 18 MB no node_modules; o app só importa `dist/*.min.js` sob demanda. |
| 2026-11-09 | `milkdrop-preset-utils@0.2.1` | prod (spike 006) | 2021-01-24 | MIT | 0 | não | não | 0 | **ok para o spike.** Separa as seções do `.milk`. |
| 2026-11-09 | `hlslparser-js@0.1.1` | prod (spike 006) | 2018-09-16 | MIT | 0 | não | não | 0 | **ok para o spike.** HLSL → GLSL (Emscripten). |

Checagem do spike 006, feita em pasta isolada: 12 pacotes no total, licenças MIT e Apache-2.0, `npm audit` sem vulnerabilidades. O único install script é o `core-js`, que já existia via `butterchurn-presets` 2.x. `eel-wasm@0.0.17` (MIT, captbaritone) entra como dependência indireta do motor 3.

### Checagem retroativa (2026-11-08) — dependências que já estavam no projeto

| Pacote@versão | Tipo | Publicada em | Licença | Deps diretas | Install script | Proveniência | Observação |
|---|---|---|---|---|---|---|---|
| `butterchurn@2.6.7` | prod | 2019-03-12 | MIT | 2 | não | não | Mantenedor único (jberg); estável há anos |
| `butterchurn-presets@2.4.7` | prod | 2018-06-09 | MIT | 3 | não | não | Traz `babel-runtime` 6 e `lodash` (e `core-js` 2, com install script) |
| `electron@45.2.3` | dev | 2026-11-04 | MIT | 3 | não | não | ⚠️ **Fora da regra de 14 dias** (4 dias na checagem) — decidir com o usuário |
| `electron-builder@26.18.0` | dev | 2026-10-20 | MIT | 10 | não | sim (SLSA v1) | Origem dos 6 *moderate* (`minimatch`); o fix do audit é downgrade de major, não avaliado |
| `electron-vite@6.0.0` | dev | 2026-10-14 | MIT | 6 | não | não | Mantenedor único |
| `typescript@6.0.3` | dev | 2026-04-16 | Apache-2.0 | 0 | não | não | — |
| `vite@8.3.6` | dev | 2026-11-05 | MIT | 5 | não | sim (SLSA v1) | ⚠️ **Fora da regra de 14 dias** (3 dias na checagem) — decidir com o usuário |
| `@types/node@26.6.6` | dev | 2026-10-28 | MIT | 1 | não | não | Só tipos |

Pacotes com `hasInstallScript` no lockfile: `core-js@2.6.12` (via `butterchurn-presets`), `electron-winstaller@5.4.0` (via `electron-builder`) e `fsevents@2.3.3` (só macOS, opcional).

Observações da checagem de 2026-11-08:
- `npm audit signatures` falha neste ambiente de nuvem com "Failed to download" (o proxy não entrega as chaves de assinatura do registro). A proveniência foi conferida pelo `dist.attestations` do `npm view`.
- O `npm audit` completo mostra 6 vulnerabilidades *moderate* só em devDependencies (`minimatch` via `electron-builder`/`@electron/universal`), que já existiam antes desta checagem e não entram no app empacotado.

### Decisões da passagem de manutenção (2026-11-09)
- **`electron@45.2.3` e `vite@8.3.6`: mantidos.** Continuam sendo as versões mais recentes (`npm view`), e voltar uma versão traz mais risco que esperar. Completam 14 dias em 2026-11-18 e 2026-11-19; na primeira sessão depois disso, refazer a checagem e tirar o ⚠️ (ou trocar de versão, se surgir aviso).
- **`minimatch` (6 *moderate*): aceito.** O pacote entra só no empacotamento (`electron-builder` → `@electron/universal`), não no app que roda. A correção do `npm audit fix --force` rebaixa o `electron-builder` de versão principal. Rever quando o `electron-builder` publicar uma versão com o `minimatch` corrigido.
