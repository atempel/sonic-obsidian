/** API exposta pelo preload (src/preload/index.ts). */
interface SoStore {
  load(): Promise<unknown>
  save(data: unknown): Promise<void>
}

interface Window {
  so: {
    settings: SoStore
    library: SoStore
    window: { toggleFullScreen(): Promise<void> }
    system: { openSoundSettings(): Promise<void> }
    log(message: string): void
    showLog(): Promise<void>
  }
}
