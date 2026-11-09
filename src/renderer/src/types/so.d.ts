/** API exposta pelo preload (src/preload/index.ts). */
interface SoStore {
  load(): Promise<unknown>
  save(data: unknown): Promise<void>
}

interface Window {
  so: {
    settings: SoStore
    library: SoStore
    window: { toggleFullScreen(): Promise<void>; minimize(): Promise<void>; close(): Promise<void> }
    system: {
      openSoundSettings(): Promise<void>
      openNotices(): Promise<string>
      openLink(url: string): Promise<void>
      copyText(text: string): Promise<void>
      gpuInfo(): Promise<{ driver: string; ids: string }>
      testFlags(): Promise<{ captureFail: boolean; noWebgl2: boolean }>
    }
    app: { version(): Promise<string> }
    presets: { convertMilk(text: string): Promise<{ preset: Record<string, unknown>; ms: number }> }
    collections: {
      export(text: string): Promise<{ ok: boolean; canceled?: boolean; name?: string }>
      import(): Promise<{ ok: boolean; canceled?: boolean; name?: string; text?: string; error?: string }>
    }
    log(message: string): void
    mark(name: string): void
    showLog(): Promise<void>
  }
}
