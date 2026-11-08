# Security

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through GitHub: on the repository page, go to **Security → Report a vulnerability**. You will get an answer within a week.

Useful to include: what an attacker could do, the steps to reproduce, and the app version or build.

## What is in scope

- The Electron app: main process, preload API (`window.so`) and renderer.
- Preset loading. Presets from outside the bundled library must never run as JavaScript (see [docs/architecture.md](docs/architecture.md)).
- The local MCP server, once it exists (localhost only, token, scopes).

## Supported versions

Only the latest release gets fixes.
