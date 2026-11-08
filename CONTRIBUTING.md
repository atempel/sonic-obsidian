# Contributing to Sonic Obsidian

Thanks for your interest. Sonic Obsidian is a small project with one maintainer, so the process is light. Issues and pull requests are welcome in English or Portuguese.

## Before you start

- **Bugs:** open an issue with the *Bug report* form. Include the app version (or the build `sonic-obsidian-win-<sha>`), your Windows version, your GPU and, if the app froze or closed, the log file (`Ctrl+Shift+L` opens its folder).
- **Ideas:** open an issue with the *Feature idea* form before writing code. The roadmap is in [docs/PRD.md](docs/PRD.md) and current work in [TASKS.md](TASKS.md); some things are out of scope on purpose (recording, DRM content, embedded AI).
- **Preset credits:** if a preset is credited wrong, or you are an author and want a preset removed, use the *Preset credit* form. These requests get priority.

## Running the app

You need Windows to hear and see it: system audio capture uses Chromium's loopback, which only exists on Windows.

```bash
npm ci
npm run dev        # run with hot reload
npm run typecheck  # must pass before every commit
npm run dist:win   # portable build in release/win-unpacked/
```

On Linux or macOS you can still edit, type-check and build. Every push also builds a portable Windows app in GitHub Actions.

## How changes are made

1. Each feature has a spec in [`docs/specs/`](docs/specs/). Bigger changes start with one; small fixes don't need it.
2. One branch per change: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`.
3. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
4. Open a pull request against `main`. It is squash-merged, so the PR title becomes the commit message.

Project conventions, constraints and vocabulary are in [CONTEXT.md](CONTEXT.md); decisions and their reasons in [DECISIONS.md](DECISIONS.md). Most internal docs are in Portuguese.

## Ground rules

- **Never remove or rename a preset's author credit.** The preset name carries it.
- **The render loop comes first.** UI work must not drop frames.
- **No DRM workarounds**, no telemetry, no network calls the user didn't ask for.
- **Dependencies:** pinned exact versions, permissive licenses only (MIT, BSD, Apache). Each new dependency gets a short check recorded in [docs/dependencias.md](docs/dependencias.md).
- **The engine stays upstream.** Butterchurn is used as a dependency, not forked. Visual additions go in layers on top of it.

## Licensing

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
