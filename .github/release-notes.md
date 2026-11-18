**Sonic Obsidian** — MilkDrop-style audio visualizer for Windows. It listens to what your computer is playing; nothing to configure.

## What's new in 0.8.0 — the full Preset Studio

Press `E` on any preset to open the Studio. Every change shows up on the visual within half a second, and a mistake never breaks what is playing: the last version that worked keeps running until you fix it.

- **Basic:** zoom, rotation, warp, decay, colors, wave mode and the rest, live *while you drag* — no reload, no flicker.
- **Waves and Shapes:** turn on up to 4 custom waves and 4 shapes, with their own equations, sample count, spectrum mode, sides and radius.
- **Shaders:** edit the `warp` and `comp` shaders; GLSL errors point to your line, with **Go to line**.
- **`.milk` code:** for imported presets, edit the `.milk` text itself and every tab follows. Presets from the built-in pack show their Butterchurn JSON, read-only.
- **Checker:** typos like `bas_att` show a warning with **Fix → `bass_att`** (the preset still runs); unknown functions suggest the closest one.
- **Version history:** every save is a version you can **restore** or **compare** side by side. `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo inside the Studio.
- **Compare with the original:** split preview, original on the left and your remix on the right, reacting to the same beat. It turns itself off if the visual drops below 50 fps.
- **New preset:** start from a simple template that pulses with the bass (Library › **New preset**, or in the Studio).
- **Rename** your presets from the name field; favorites, collections and recents follow the new name.
- **Export `.milk`** (or Butterchurn JSON). Copies of built-in presets export without their shaders, with a clear note first.
- **Test switch** previews the transition into your preset with its name and credit; **Capture frame** saves the current frame as a PNG.

Original authors' credits are always kept: a remix says "based on …".

### Updating from 0.7.0

The installed app updates itself (or check now in Settings › About › Updates). From 0.6.0 or earlier, install this version by hand **once** — your presets, favorites, collections and settings are kept.

## Download

- **Installer:** `SonicObsidian-Setup.exe` (per user, no admin rights; updates itself).
- **Portable:** `SonicObsidian-win-x64.zip` — unzip anywhere and run `Sonic Obsidian.exe`.
- **Checksums:** `SHA256SUMS.txt`.

Windows SmartScreen may warn because the app is not code-signed: click **More info → Run anyway**.

⚠️ **Photosensitivity warning:** the visuals flash and change quickly. Avoid use if you are sensitive to flashing lights.

Site: https://atempel.github.io/sonic-obsidian/ · Press `?` in the app to see every shortcut.
