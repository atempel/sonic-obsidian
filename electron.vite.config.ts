import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    // Fontes viram arquivo, nunca data: — a CSP (default-src 'self') bloqueia fontes data:.
    build: { assetsInlineLimit: 0 },
    // JSX do overlay em Preact pelo compilador nativo do Vite 8 (oxc); ver DECISIONS "UI do overlay".
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } }
  }
})
