# 044 — Microsoft Store: pacote MSIX, atualização pela Store e publicação automática

**Fase:** Distribuição · **Status:** implementada (etapa 2 desligada até as credenciais) · **Issue:** [#188](https://github.com/atempel/sonic-obsidian/issues/188) · **Guia:** [docs/distribuicao/microsoft-store.md](../distribuicao/microsoft-store.md) · **Design:** Configurações, versão `1794680346-fb12` (a variante da Store diverge: DIVERGENCIAS 2026-11-23)

## Problema (pedido do usuário, 2026-11-23)
O app vai ser distribuído por dois canais no Windows: a **Microsoft Store** (MSIX, assinado pela Store, sem aviso do SmartScreen; download principal no lançamento) e as **releases do GitHub** (instalador e zip, sem assinatura de código: a SignPath Foundation recusou o projeto, #189). Na Store, quem atualiza o app é a Store: o atualizador pelo GitHub (spec 029) tem que ficar desligado nessa versão.

## Proposta
- **Pacote:** alvo `appx` do electron-builder 26.18 (o alvo `msix` só existe em versões mais novas, em beta; trocar a dependência fica fora), com saída `SonicObsidian-Store-x64.msix`, `minVersion` 10.0.17763.0 (Windows 10 1809, o mínimo para `.msix`), idiomas en-US e pt-BR e a identidade do Partner Center: `AlexandreTempel.SonicObsidian`, `CN=FB52A5F4-E46E-48B7-90A9-D2F6FC05DB7B`, `Alexandre Tempel` (Store ID `9MV0B2P4T0G4`). `runFullTrust` entra sempre (app desktop). Sem certificado, o electron-builder não assina; a Store assina depois da certificação. Imagens em `build/appx/`, feitas do símbolo da marca. `npm run dist:msix` (só no Windows).
- **Canal em tempo de execução:** `process.windowsStore` no main (`updater.ts`). Na versão da Store: nenhuma checagem nem download pelo GitHub, nem por "Verificar agora"; o estado leva `store: true`; Configurações › Sobre › Atualizações mostra a versão instalada e "As atualizações vêm da Microsoft Store." (sem a chave e sem "Verificar agora"); a busca rápida não oferece "Verificar atualizações". O log da abertura diz "Microsoft Store package (MSIX)". **Sem lista de dispositivos de mídia** (`enumerateDevices`): no MSIX o Chromium varre também as câmeras e o Windows pede acesso à câmera na abertura (visto no primeiro teste, 2026-11-23); o nome da saída de áudio (checagem de captura e "Relatar um problema") vem da trilha da captura, e, se a captura falhar, a linha da saída fica "aguardando". Instalador e zip seguem iguais.
- **Workflows:** `msix.yml` sob demanda (disparo manual ou label `build-msix`) gera o artifact `sonic-obsidian-msix-<sha>` (30 dias); `scripts/check-msix.sh` confere identidade, `runFullTrust` e versão no manifesto. **Etapa 2:** `store.yml` publica com o `msstore` (`microsoft/microsoft-store-apppublisher`) quando uma release é **publicada** (evento `release: published`, ou disparado pelo `release.yml` com `publicar=true`, ou à mão com a tag); nunca em push ou merge; desligado até `MSSTORE_ENABLED=true` e os quatro secrets `PARTNER_CENTER_*`.

## Fora de escopo
- Trocar o electron-builder para usar o alvo `msix` (beta).
- Migrar configurações entre o instalador `.exe` e a versão da Store (o Windows virtualiza a pasta de dados do MSIX; ver o guia).
- Botão da Store na landing antes de o app estar publicado.
- Assinatura de código das releases do GitHub (a SignPath recusou, #189; DECISIONS 2026-11-27).

## Critérios de aceite
1. O `msix.yml` gera um `.msix` cuja identidade é igual à do Partner Center (o `check-msix.sh` falha se não for).
2. O pacote instala no Windows (Modo de desenvolvedor ou certificado de teste), abre pelo menu Iniciar e **captura o áudio do sistema** (o visual reage). — **testar no Windows**
3. Na versão da Store, nenhuma checagem de atualização sai (sem linhas `[update]` de checagem no log), e Configurações › Sobre › Atualizações mostra só a versão e o texto da Store. — headless `044-store` + Windows
4. No instalador e no zip, a atualização segue igual (spec 029). — headless `029-atualizacao` e `044-store`
5. O `store.yml` não roda sem `MSSTORE_ENABLED=true`, nem com release em rascunho ou pre-release.
6. A versão da Store não pede acesso à câmera ao abrir (nenhuma chamada a `enumerateDevices`), e a saída de áudio continua aparecendo na checagem e no relatório. — headless `044-store` 3a–3e + Windows

## Verificação
Teste headless `044-store` (critério 3 na interface, 4); `029-atualizacao` segue passando. Os critérios 1, 2 e 5 só no GitHub Actions/Windows.
