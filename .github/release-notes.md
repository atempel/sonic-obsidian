**Sonic Obsidian** — MilkDrop-style audio visualizer for Windows. It listens to what your computer is playing; nothing to configure.

## What's new in 0.12.0 — a beat detector that follows the main beat

- **Beat detection** now listens in three bands (kick, low-mids and the snare/hi-hat range) and locks onto the kick and snare: in trance with a "galloping" bass, funk basslines or rock with a strong snare, beat switches land on the beat instead of between beats. It also locks a little faster when the beat is clear.
- **Rest** (`Shift+Enter`) now shows a small wind icon and the word "Rest" next to the preset name, readable over light and dark presets.
- **Visual lead** moved to **Settings › Capture › Sync**, right below **Delay the visual**.
- **`Esc`** while a manual switch is waiting for the beat cancels that switch (it no longer leaves full screen or closes a panel).
- The debug HUD (`Ctrl+Shift+D`) shows the kick, snare and phase readings of the beat detector.

### Updating from an earlier version

The installed app updates itself (or check now in Settings › About › Updates). From 0.6.0 or earlier, install this version by hand **once** — your presets, favorites, collections and settings are kept.

## Download

- **Installer:** `SonicObsidian-Setup.exe` (per user, no admin rights; updates itself).
- **Portable:** `SonicObsidian-win-x64.zip` — unzip anywhere and run `Sonic Obsidian.exe`.
- **Checksums:** `SHA256SUMS.txt`.

Windows SmartScreen may warn because the app is not code-signed: click **More info → Run anyway**.

⚠️ **Photosensitivity warning:** the visuals flash and change quickly. Avoid use if you are sensitive to flashing lights.

Site: https://atempel.github.io/sonic-obsidian/ · Press `?` in the app to see every shortcut.
