import { app } from 'electron'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SAVE_DEBOUNCE_MS = 500

/**
 * Um arquivo JSON em userData, lido e escrito só pelo main.
 * - load(): conteúdo ou null (ausente ou ilegível; ilegível vira <nome>.json.bak).
 * - save(): debounce + escrita atômica (.tmp e rename), para não corromper se o app cair no meio.
 */
export class JsonStore {
  readonly path: string
  private pending: unknown = undefined
  private timer: NodeJS.Timeout | undefined
  private waiters: Array<() => void> = []
  private writing: Promise<void> = Promise.resolve()

  constructor(readonly name: string) {
    this.path = join(app.getPath('userData'), `${name}.json`)
  }

  async load(): Promise<unknown> {
    let text: string
    try {
      text = await readFile(this.path, 'utf8')
    } catch {
      return null // primeira execução
    }
    try {
      return JSON.parse(text) as unknown
    } catch (err) {
      console.error(`[store] ${this.name}.json ilegível; movido para .bak e usando os padrões`, err)
      await rename(this.path, `${this.path}.bak`).catch(() => undefined)
      return null
    }
  }

  /** Agenda a escrita; resolve quando o dado (ou um mais novo) estiver em disco. */
  save(data: unknown): Promise<void> {
    this.pending = data
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS)
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer)
    this.timer = undefined
    if (this.pending === undefined) return this.writing
    const data = this.pending
    const waiters = this.waiters
    this.pending = undefined
    this.waiters = []
    this.writing = this.writing.then(async () => {
      const tmp = `${this.path}.tmp`
      try {
        await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
        await rename(tmp, this.path)
      } catch (err) {
        console.error(`[store] falha ao gravar ${this.name}.json`, err)
      }
    })
    await this.writing
    for (const resolve of waiters) resolve()
  }
}
