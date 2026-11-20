**Sonic Obsidian** — MilkDrop-style audio visualizer for Windows. It listens to what your computer is playing; nothing to configure.

## What's new in 0.10.0 — visual and sound in sync

If you listen through Bluetooth headphones, a TV or an audio router, the sound reaches you a little after the app hears it, and the visual seems to react early. Now you can line them up.

- **Delay the visual** in **Settings › Capture › Sync** (0–500 ms, default 0): raise it until the visual matches what you hear. The beat dot and beat-synced switches move with it.
- **Measure capture delay** in the quick search (`/`, type "measure"): plays three short clicks and shows how long the app takes to hear the system sound.
- The debug HUD (`Ctrl+Shift+D`) has a new `sync` line with the parts of the delay, and the log gets `[sync]` lines — handy to paste into a bug report.

### Updating from an earlier version

The installed app updates itself (or check now in Settings › About › Updates). From 0.6.0 or earlier, install this version by hand **once** — your presets, favorites, collections and settings are kept.

## Download

- **Installer:** `SonicObsidian-Setup.exe` (per user, no admin rights; updates itself).
- **Portable:** `SonicObsidian-win-x64.zip` — unzip anywhere and run `Sonic Obsidian.exe`.
- **Checksums:** `SHA256SUMS.txt`.

Windows SmartScreen may warn because the app is not code-signed: click **More info → Run anyway**.

⚠️ **Photosensitivity warning:** the visuals flash and change quickly. Avoid use if you are sensitive to flashing lights.

Site: https://atempel.github.io/sonic-obsidian/ · Press `?` in the app to see every shortcut.
