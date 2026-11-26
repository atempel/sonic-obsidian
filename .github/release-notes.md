**Sonic Obsidian** — MilkDrop-style audio visualizer for Windows. It listens to what your computer is playing; nothing to configure.

## What's new in 0.11.0 — profiles, Simple mode and a frequency curve

- **Profiles:** save a combination of settings (signal, expressiveness, rotation, transitions, text) and switch with `Alt+1…9`. The app ships with Default, Calm, Party and Study presets; your own live in **Settings › Profiles** (rename, duplicate, delete, export/import, and a **Profile on start**).
- **Simple mode:** **Settings › General › Interface › Simple** shows a shorter strip, the essential quick settings and the 10 essential shortcuts. Everything else is one click away ("More settings…", "Show all").
- **Frequency curve:** a 16-band EQ in **Quick settings › Expressiveness** decides which frequencies move the visual — try **Lows** to follow the kick drum, or draw your own curve.
- **Normalize audio** now works per track: it keeps the quiet break and the drop apart inside a song instead of flattening them, and still evens out loud and quiet tracks.
- **Manual switches on beat** is now separate from rotation's **Switch on beat**: `→` switches right away unless you turn it on.
- **Quick settings:** the strip stays visible while the pointer is on it, the panel closes when you click outside, it reopens at the top, sections have icons and the header has an **All settings** button.

### Fixes

- When the graphics driver restarts, the visual comes back by itself with the same preset.
- Dark presets that draw small shapes are no longer logged as black.
- The log now records memory per process, to track long sessions.

### Updating from an earlier version

The installed app updates itself (or check now in Settings › About › Updates). From 0.6.0 or earlier, install this version by hand **once** — your presets, favorites, collections and settings are kept.

## Download

- **Installer:** `SonicObsidian-Setup.exe` (per user, no admin rights; updates itself).
- **Portable:** `SonicObsidian-win-x64.zip` — unzip anywhere and run `Sonic Obsidian.exe`.
- **Checksums:** `SHA256SUMS.txt`.

Windows SmartScreen may warn because the app is not code-signed: click **More info → Run anyway**.

⚠️ **Photosensitivity warning:** the visuals flash and change quickly. Avoid use if you are sensitive to flashing lights.

Site: https://atempel.github.io/sonic-obsidian/ · Press `?` in the app to see every shortcut.
