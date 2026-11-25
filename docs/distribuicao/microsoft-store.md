# Microsoft Store (MSIX)

Guia da distribuição pela Microsoft Store (spec 044). O pacote é um MSIX gerado pelo alvo `appx` do electron-builder, sem assinatura: a Store assina depois da certificação, então o SmartScreen não avisa.

| Campo do Partner Center | Valor (no `electron-builder.yml` › `appx`) |
|---|---|
| Package/Identity/Name | `AlexandreTempel.SonicObsidian` |
| Package/Identity/Publisher | `CN=FB52A5F4-E46E-48B7-90A9-D2F6FC05DB7B` |
| Package/Properties/PublisherDisplayName | `Alexandre Tempel` |
| Store ID | `9MV0B2P4T0G4` |

A Store recusa o pacote se um desses valores for diferente. O `scripts/check-msix.sh` confere os três primeiros no manifesto de todo pacote gerado e falha o workflow se algum mudar.

## 1. Gerar o .msix

Precisa do Windows (o `makeappx` vem do Windows SDK), então roda no GitHub Actions:

1. GitHub › **Actions › msix › Run workflow**, escolhendo a branch (ou a tag da versão que vai para a Store).
2. Ao terminar, abra a execução e baixe o artifact **`sonic-obsidian-msix-<sha>`** (fica 30 dias). Dentro do zip está o `SonicObsidian-Store-x64.msix`.

Num PR, a label `build-msix` faz o mesmo.

Localmente, no Windows com o Windows SDK: `npm run dist:msix` gera o pacote em `release/`.

## 2. Testar o pacote no próprio PC antes de enviar

O pacote sem assinatura não instala por clique duplo. Há dois jeitos de instalar:

**A. Sem certificado (mais simples):** ligue o Modo de desenvolvedor em Configurações do Windows › Sistema › Para desenvolvedores. No PowerShell, na pasta do artifact baixado:

```powershell
Copy-Item .\SonicObsidian-Store-x64.msix .\pacote.zip
Expand-Archive .\pacote.zip -DestinationPath .\pacote -Force
# Dentro do .msix os nomes com espaço vêm codificados (Sonic%20Obsidian.exe); o Expand-Archive não decodifica.
Get-ChildItem .\pacote -Recurse | Where-Object Name -match '%[0-9A-Fa-f]{2}' |
  Sort-Object { $_.FullName.Length } -Descending |
  Rename-Item -NewName { [uri]::UnescapeDataString($_.Name) }
Test-Path ".\pacote\app\Sonic Obsidian.exe"   # tem que dar True
Add-AppxPackage -Register .\pacote\AppxManifest.xml
```

Sem o passo de decodificar, o pacote registra mas não abre (o manifesto aponta para `app\Sonic Obsidian.exe`, e na pasta o arquivo fica `Sonic%20Obsidian.exe`). Não apague a pasta `pacote` enquanto testar: nesse modo o app roda dela. Para tirar: `Get-AppxPackage *SonicObsidian* | Remove-AppxPackage`. Com o Windows SDK instalado, `makeappx unpack /p SonicObsidian-Store-x64.msix /d pacote` faz a extração já com os nomes certos.

**B. Com um certificado de teste**, no PowerShell como administrador. O `Subject` tem que ser exatamente o Publisher do manifesto:

```powershell
$cert = New-SelfSignedCertificate -Type Custom -KeyUsage DigitalSignature `
  -CertStoreLocation Cert:\CurrentUser\My `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
  -Subject "CN=FB52A5F4-E46E-48B7-90A9-D2F6FC05DB7B" -FriendlyName "Sonic Obsidian (teste)"
$pw = ConvertTo-SecureString -String "teste" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath .\teste.pfx -Password $pw
Import-PfxCertificate -FilePath .\teste.pfx -CertStoreLocation Cert:\LocalMachine\TrustedPeople -Password $pw
# signtool vem do Windows SDK (ex.: C:\Program Files (x86)\Windows Kits\10\bin\<versão>\x64\signtool.exe)
signtool sign /fd SHA256 /f .\teste.pfx /p teste .\SonicObsidian-Store-x64.msix
Add-AppxPackage .\SonicObsidian-Store-x64.msix
```

Use o pacote assinado com o certificado de teste só no seu PC. Para a Store vai sempre o `.msix` do artifact, sem assinatura. Depois do teste, remova o certificado de `Cert:\LocalMachine\TrustedPeople` e o app (Configurações › Aplicativos), se quiser.

### O que conferir com o pacote instalado

1. **Abre pelo menu Iniciar** com o nome e o ícone certos.
2. **Captura do áudio do sistema (loopback):** com música tocando, o visual reage e o medidor da faixa se mexe. O MSIX roda como app desktop de confiança total (`runFullTrust`), e a captura do Electron não usa o microfone, então nenhuma permissão extra deveria ser pedida. **Isto não foi verificado num PC: é o ponto principal do teste.** Se não reagir, olhe o log e o checklist de "Testar captura".
3. **Log:** `Ctrl+Shift+L` abre a pasta do log. A primeira linha da abertura deve terminar com `· Microsoft Store package (MSIX)`. No MSIX, o Windows guarda os arquivos novos da pasta de dados (`%APPDATA%\sonic-obsidian`) numa cópia privada do pacote (`%LOCALAPPDATA%\Packages\AlexandreTempel.SonicObsidian_<id>\LocalCache\Roaming\sonic-obsidian`); o log mostra o caminho normal mesmo assim. Anote em qual pasta o log abriu.
4. **Configurações e biblioteca:** se o instalador `.exe` também estiver instalado, os dois podem começar com os mesmos favoritos (o Windows lê os arquivos que já existiam), mas o que você mudar em um não aparece no outro.
5. **Câmera:** o app não pode pedir acesso à câmera. Para testar de novo depois de já ter negado uma vez, reinstale o pacote (a permissão fica guardada por pacote) ou veja Configurações do Windows › Privacidade › Câmera.
6. **Atualizações:** Configurações › Sobre › Atualizações mostra só a versão e "As atualizações vêm da Microsoft Store.", sem a chave e sem "Verificar agora". A busca rápida (`/`) não tem "Verificar atualizações". O log não tem linhas `[update]` de checagem.
7. **Desinstalar** pelo Windows (Configurações › Aplicativos) remove o app.

## 3. Primeira submissão (manual, no Partner Center)

A Microsoft exige que a primeira submissão seja feita no Partner Center. A automação só atualiza um app que já está publicado.

1. Gere o pacote da versão (passo 1) a partir da tag da release aprovada.
2. Partner Center › Apps and games › Sonic Obsidian › **Start your submission**.
3. **Packages:** envie o `SonicObsidian-Store-x64.msix`.
4. **Store listing:** descrição, capturas e a URL da política de privacidade: `https://atempel.github.io/sonic-obsidian/privacy/`.
5. **Age ratings:** responda o questionário. As luzes piscando aparecem no aviso de saúde do app e da landing.
6. **Properties:** a capability `runFullTrust` pede uma justificativa. Sugestão: "Desktop audio visualizer built with Electron; it needs full trust to capture the system's audio output (WASAPI loopback) and render it with WebGL."
7. Envie para a certificação.

## 4. Publicação automática (etapa 2)

O `.github/workflows/store.yml` publica o `.msix` de uma release quando ela é **publicada** (nunca em push nem em merge):

- ao publicar um rascunho de release no GitHub; ou
- quando o `release.yml` roda com `publicar=true` (ele dispara o `store.yml`); ou
- à mão, em Actions › store › Run workflow, com a tag.

Ele confere que a release existe, está publicada e não é pre-release, gera o `.msix` da tag, confere a identidade, guarda o pacote como artifact (90 dias), configura o `msstore` e roda `msstore publish <pacote> -id 9MV0B2P4T0G4`. Sem `--noCommit`, a submissão vai direto para a certificação. Para deixar em rascunho e conferir no Partner Center antes, crie também a variável `MSSTORE_NO_COMMIT=true`.

**Desligado** até existirem a variável de repositório `MSSTORE_ENABLED=true` e os quatro secrets abaixo. Pré-requisito da Microsoft: o app já publicado na Store (passo 3). O CLI só atualiza produtos gratuitos.

### Credenciais

O CLI autentica como um **aplicativo do Microsoft Entra ID** ligado à sua conta do Partner Center, com quatro valores:

| Secret do repositório | O que é | Onde aparece |
|---|---|---|
| `PARTNER_CENTER_TENANT_ID` | ID do tenant do Entra ID associado ao Partner Center | página do aplicativo em User management › Microsoft Entra applications |
| `PARTNER_CENTER_CLIENT_ID` | ID do aplicativo (client ID) | mesma página |
| `PARTNER_CENTER_CLIENT_SECRET` | a chave ("Key") criada para o aplicativo | aparece **uma vez só**, ao criar |
| `PARTNER_CENTER_SELLER_ID` | ID do vendedor da conta | Account settings › Legal info (ou Organization profile); confira no seu Partner Center |

**Conta individual com conta Microsoft pessoal:** a documentação da Microsoft não diz se é possível nem se não é. O que ela documenta: o CLI precisa de um tenant do Entra ID associado à conta do Partner Center; um Manager da conta pode associar um tenant existente ou **criar um novo, de graça, pelo próprio Partner Center**; e a documentação pede para não usar a conta Microsoft pessoal no CLI. O caminho provável:

1. Partner Center › ⚙ **Account settings › Tenants**. Se a página existir na sua conta, use **Create Microsoft Entra ID** (cria um tenant novo e uma conta de administrador, do tipo `nome@<algo>.onmicrosoft.com`). **Se a página não aparecer**, sua conta individual não tem esse caminho: a alternativa é a submissão manual de cada versão (passo 3, só que em "Update"), com o `.msix` gerado pelo workflow `msix`. Nesse caso o `store.yml` fica desligado.
2. Account settings › **User management › Microsoft Entra applications › Create Microsoft Entra application** (ou Add, se já houver um no tenant). Papel: **Manager**.
3. Abra o aplicativo criado › **Add new key**. Copie o **Client ID** e a **Key** (só aparece agora) e anote o **Tenant ID**.
4. Encontre o **Seller ID** (Account settings › Legal info / Organization profile).
5. GitHub › Settings › **Secrets and variables › Actions**:
   - em **Secrets**, crie os quatro secrets da tabela;
   - em **Variables**, crie `MSSTORE_ENABLED` = `true`.
6. Teste com uma release já publicada: Actions › store › Run workflow, com a tag e, da primeira vez, com a variável `MSSTORE_NO_COMMIT=true` para a submissão ficar em rascunho no Partner Center.

A chave do aplicativo expira (o Partner Center mostra a data). Quando expirar, crie outra e troque o secret `PARTNER_CENTER_CLIENT_SECRET`.

## Referências
- Requisitos do pacote: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements
- CLI (msstore): https://learn.microsoft.com/en-us/windows/apps/publish/msstore-dev-cli/overview · comandos: https://learn.microsoft.com/en-us/windows/apps/publish/msstore-dev-cli/commands · GitHub Actions: https://learn.microsoft.com/en-us/windows/apps/publish/msstore-dev-cli/github-actions
- Tenant e aplicativos do Entra ID no Partner Center: https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/associate-existing-azure-ad-tenant-with-partner-center-account · https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/create-new-azure-ad-tenant · https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/manage-azure-ad-applications-in-partner-center
- Certificado de teste: https://learn.microsoft.com/en-us/windows/msix/package/create-certificate-package-signing
- MSIX por dentro (pasta de dados virtualizada): https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes
- electron-builder `appx`: https://www.electron.build/docs/appx · `process.windowsStore`: https://www.electronjs.org/docs/latest/api/process
