# Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

> **Status:** the project has applied to the SignPath Foundation. Releases published before the approval are not signed; release notes say which releases are.

## Signed artifacts

The files attached to each [GitHub release](https://github.com/atempel/sonic-obsidian/releases) of Sonic Obsidian:

- `SonicObsidian-Setup.exe`: the Windows installer;
- `Sonic Obsidian.exe`: the program inside the portable `SonicObsidian-win-x64.zip`.

They are built from this repository only, by the [`release`](.github/workflows/release.yml) workflow on GitHub-hosted runners, with the build scripts kept in this repository ([`electron-builder.yml`](electron-builder.yml), [`package.json`](package.json)). Every release is signed only after manual approval. Third-party libraries bundled with the app (Electron, Butterchurn and the others listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)) are upstream components and are not signed by this project.

The Microsoft Store edition is a separate MSIX package that Microsoft signs after Store certification; it is not signed through SignPath.

## Team roles

| Role | Members |
|---|---|
| Committers and reviewers | [Alexandre Tempel (atempel)](https://github.com/atempel) |
| Approvers | [Alexandre Tempel (atempel)](https://github.com/atempel), repository owner |

Sonic Obsidian is maintained by one person. Changes reach `main` only through pull requests that pass the automated checks; some are prepared by AI coding assistants working under the maintainer's account. Releases are published only after the maintainer tests and approves the build. Team members use multi-factor authentication for GitHub and SignPath.

## Privacy policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it, with one exception: the installer and portable editions check GitHub Releases for a newer version once a day. The check is described in the [privacy policy](PRIVACY.md) and can be turned off in **Settings › About › Updates**. The Microsoft Store edition makes no such check.

Full privacy policy: [PRIVACY.md](PRIVACY.md) · https://atempel.github.io/sonic-obsidian/privacy/
