**Sonic Obsidian** — MilkDrop-style audio visualizer for Windows. It listens to what your computer is playing; nothing to configure.

## What's new in 0.6.0

- **Reacts better to the music:** the visual memory now learns from sound only (no more stuck or maxed-out reaction after opening in silence), and real silence means no pulsing — presets keep drifting, slow and dim, and the reaction comes back smoothly when the music returns. Defaults are marked in Quick settings (`,`), with a **Restaurar padrão** (restore defaults) button.
- **Normalize audio** (*Normalizar áudio*): optional automatic gain (Quick settings › *Sinal*, or Settings › *Captura*) so quiet and loud tracks move the visuals alike. With it on, the manual gain becomes a ±6 dB fine adjustment. It never changes what you hear.
- **Live memory:** a fourth memory mode (`Shift+X`) for more contrast on steady tracks.
- **New engine (Butterchurn 3, WebAssembly):** runs more presets safely.
- **Import your own `.milk` presets** and organize **collections** right from the Stage.
- **Switch on the beat:** change presets every N bars, and hold the current visual when you like it.
- **Preset Studio:** edit a preset's equations with a live preview.
- Fixes: two presets that rendered black, and dot waves that were invisible on Windows. The debug HUD (`Ctrl+Shift+D`) and the log now show audio levels and reaction.

## Download

- **Installer:** `SonicObsidian-Setup.exe` (per user, no admin rights).
- **Portable:** `SonicObsidian-win-x64.zip` — unzip anywhere and run `Sonic Obsidian.exe`.
- **Checksums:** `SHA256SUMS.txt`.

Windows SmartScreen may warn because the app is not code-signed: click **More info → Run anyway**.

⚠️ **Photosensitivity warning:** the visuals flash and change quickly. Avoid use if you are sensitive to flashing lights.

Site: https://atempel.github.io/sonic-obsidian/ · Press `?` in the app to see every shortcut.
