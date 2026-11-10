import { app, dialog, type BrowserWindow } from 'electron'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { log } from './log'
import { milkToPreset3 } from './milk'

/**
 * Presets importados (spec 022), em `userData/presets/imported/`:
 * `<id>.milk` é a fonte (o arquivo como veio) e `<id>.json` o cache convertido, com o nome.
 * O nome do preset é o nome do arquivo sem `.milk` e nunca é alterado (créditos).
 */
export const MAX_BATCH = 200
export const MAX_BYTES = 256 * 1024

export interface MilkFile {
  name: string
  text: string
}
interface CacheFile {
  name: string
  preset: Record<string, unknown>
}

const dir = (): string => join(app.getPath('userData'), 'presets', 'imported')
const idOf = (name: string): string => createHash('sha256').update(name).digest('hex').slice(0, 24)

/** Nome a partir do arquivo: sem a extensão, sem caracteres de controle, até 200 caracteres. */
export function presetNameFromFile(file: string): string {
  return basename(file)
    .replace(/\.milk$/i, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 200)
}

/** Todos os importados (do cache; um `.milk` sem cache é convertido de novo). */
export async function listImported(): Promise<CacheFile[]> {
  let files: string[]
  try {
    files = await readdir(dir())
  } catch {
    return []
  }
  const out: CacheFile[] = []
  for (const f of files.filter((x) => x.endsWith('.json'))) {
    try {
      const c = JSON.parse(await readFile(join(dir(), f), 'utf8')) as CacheFile
      if (typeof c.name === 'string' && c.preset && typeof c.preset === 'object') out.push(c)
    } catch (err) {
      log('main', `importado ilegível: ${f}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  for (const f of files.filter((x) => x.endsWith('.milk'))) {
    const id = f.replace(/\.milk$/, '')
    if (files.includes(`${id}.json`)) continue
    try {
      const raw = JSON.parse(await readFile(join(dir(), `${id}.name`), 'utf8')) as { name?: unknown }
      if (typeof raw.name !== 'string') continue
      const preset = await milkToPreset3(await readFile(join(dir(), f), 'utf8'))
      await writeFile(join(dir(), `${id}.json`), JSON.stringify({ name: raw.name, preset }))
      out.push({ name: raw.name, preset })
    } catch {
      // Sem nome registrado ou conversão falhou: fica de fora.
    }
  }
  return out
}

/** Converte e grava (fonte + cache). O renderer só chama isto depois de validar o preset. */
export async function saveImported(file: MilkFile): Promise<void> {
  const name = presetNameFromFile(file.name)
  if (!name) throw new Error('nome de arquivo vazio')
  const preset = await milkToPreset3(file.text)
  await mkdir(dir(), { recursive: true })
  const id = idOf(name)
  await writeFile(join(dir(), `${id}.milk`), file.text, 'utf8')
  await writeFile(join(dir(), `${id}.name`), JSON.stringify({ name }))
  await writeFile(join(dir(), `${id}.json`), JSON.stringify({ name, preset }))
}

export async function removeImported(name: unknown): Promise<void> {
  if (typeof name !== 'string') return
  const id = idOf(name)
  for (const ext of ['milk', 'json', 'name']) await rm(join(dir(), `${id}.${ext}`), { force: true })
}

/** Diálogo nativo para escolher `.milk` (até MAX_BATCH; arquivos grandes demais ficam de fora). */
export async function pickMilkFiles(win: BrowserWindow | null): Promise<{ files: MilkFile[]; tooBig: string[]; extra: number }> {
  const opts = { title: 'Importar presets .milk', filters: [{ name: 'Presets MilkDrop', extensions: ['milk'] }], properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'> }
  const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
  if (res.canceled) return { files: [], tooBig: [], extra: 0 }
  const paths = res.filePaths.filter((p) => /\.milk$/i.test(p))
  const files: MilkFile[] = []
  const tooBig: string[] = []
  for (const p of paths.slice(0, MAX_BATCH)) {
    if ((await stat(p)).size > MAX_BYTES) tooBig.push(basename(p))
    else files.push({ name: basename(p), text: await readFile(p, 'utf8') })
  }
  return { files, tooBig, extra: Math.max(0, paths.length - MAX_BATCH) }
}
