import { app } from 'electron'
import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { log } from './log'

/**
 * "Meus presets" do Estúdio (spec 026), em `userData/presets/mine/<id>/`:
 * `preset.json` (preset Butterchurn 3), `meta.json` (título, autor, `basedOn`, `createdAt`) e,
 * depois do segundo salvamento, `preset.prev.json` (a versão anterior).
 * O `<id>` é gerado aqui; nenhum caminho vem do renderer. A mesma barreira da 022:
 * só campos conhecidos, só `*_eel` (nenhum `*_str` nem `useJS`), até 256 KB.
 */
export const MAX_BYTES = 256 * 1024
const ID = /^[a-f0-9]{24}$/

export interface MineMeta {
  title: string
  author: string
  basedOn: { name: string; author: string } | null
  createdAt: string
}
export interface MineEntry {
  id: string
  meta: MineMeta
  preset: Record<string, unknown>
}

const dir = (): string => join(app.getPath('userData'), 'presets', 'mine')

const TOP = new Set(['version', 'baseVals', 'shapes', 'waves', 'init_eqs_eel', 'frame_eqs_eel', 'pixel_eqs_eel', 'warp', 'comp'])
const SHAPE = new Set(['baseVals', 'init_eqs_eel', 'frame_eqs_eel'])
const WAVE = new Set(['baseVals', 'init_eqs_eel', 'frame_eqs_eel', 'point_eqs_eel'])

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
// eslint-disable-next-line no-control-regex
const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '')

/** Só números em baseVals. */
function vals(v: unknown): Record<string, number> {
  if (!isObj(v)) throw new Error('baseVals inválido')
  const out: Record<string, number> = {}
  for (const [k, x] of Object.entries(v)) {
    if (!/^[a-z_][a-z0-9_]{0,40}$/i.test(k)) throw new Error(`baseVals: campo inválido ${k}`)
    if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`baseVals.${k} não é número`)
    out[k] = x
  }
  return out
}

function part(v: unknown, keys: Set<string>, label: string): Record<string, unknown> {
  if (!isObj(v)) throw new Error(`${label} inválido`)
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) {
    if (/_str$/.test(k) || k === 'useJS') throw new Error('preset com JavaScript (*_str/useJS) recusado')
    if (!keys.has(k)) throw new Error(`${label}: campo desconhecido ${k}`)
    if (k === 'baseVals') out[k] = vals(x)
    else if (typeof x === 'string') out[k] = x
    else throw new Error(`${label}.${k} não é texto`)
  }
  return out
}

/** Recusa o que não for um preset Butterchurn 3 só com EEL e GLSL. */
export function sanitizePreset(raw: unknown): Record<string, unknown> {
  if (!isObj(raw)) throw new Error('preset inválido')
  if (JSON.stringify(raw).length > MAX_BYTES) throw new Error('preset maior que 256 KB')
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (/_str$/.test(k) || k === 'useJS') throw new Error('preset com JavaScript (*_str/useJS) recusado')
    if (!TOP.has(k)) throw new Error(`campo desconhecido: ${k}`)
    if (k === 'version') {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('version inválido')
      out[k] = v
    } else if (k === 'baseVals') out[k] = vals(v)
    else if (k === 'shapes' || k === 'waves') {
      if (!Array.isArray(v) || v.length > 4) throw new Error(`${k} inválido`)
      out[k] = v.map((x, i) => part(x, k === 'shapes' ? SHAPE : WAVE, `${k}[${i}]`))
    } else if (typeof v === 'string') out[k] = v
    else throw new Error(`${k} não é texto`)
  }
  for (const k of ['init_eqs_eel', 'frame_eqs_eel', 'pixel_eqs_eel']) if (typeof out[k] !== 'string') throw new Error(`falta ${k}`)
  return out
}

function sanitizeMeta(raw: unknown, createdAt: string): MineMeta {
  const m = isObj(raw) ? raw : {}
  const title = clean(m.title, 200)
  if (!title) throw new Error('título vazio')
  const b = isObj(m.basedOn) ? m.basedOn : null
  const basedOn = b && clean(b.name, 300) ? { name: clean(b.name, 300), author: clean(b.author, 120) } : null
  return { title, author: clean(m.author, 60) || 'Eu', basedOn, createdAt }
}

export async function listMine(): Promise<MineEntry[]> {
  let ids: string[]
  try {
    ids = (await readdir(dir())).filter((x) => ID.test(x))
  } catch {
    return []
  }
  const out: MineEntry[] = []
  for (const id of ids) {
    try {
      const meta = JSON.parse(await readFile(join(dir(), id, 'meta.json'), 'utf8')) as MineMeta
      const preset = sanitizePreset(JSON.parse(await readFile(join(dir(), id, 'preset.json'), 'utf8')))
      out.push({ id, meta: sanitizeMeta(meta, typeof meta.createdAt === 'string' ? meta.createdAt : ''), preset })
    } catch (err) {
      log('main', `meu preset ilegível: ${id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return out
}

/**
 * Salva. Sem `id`: cria uma pasta nova (id gerado aqui). Com `id`: sobrescreve só aquele
 * "meu" preset, guardando o anterior em `preset.prev.json`; o título não muda (renomear na 027).
 */
export async function saveMine(raw: unknown): Promise<{ id: string; meta: MineMeta }> {
  const r = isObj(raw) ? raw : {}
  const preset = sanitizePreset(r.preset)
  if (r.id !== undefined && r.id !== null) {
    if (typeof r.id !== 'string' || !ID.test(r.id)) throw new Error('id inválido')
    const folder = join(dir(), r.id)
    const meta = JSON.parse(await readFile(join(folder, 'meta.json'), 'utf8')) as MineMeta
    await rename(join(folder, 'preset.json'), join(folder, 'preset.prev.json')).catch(() => {})
    await writeFile(join(folder, 'preset.json'), JSON.stringify(preset))
    return { id: r.id, meta }
  }
  const meta = sanitizeMeta(r.meta, new Date().toISOString())
  const id = randomBytes(12).toString('hex')
  const folder = join(dir(), id)
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, 'preset.json'), JSON.stringify(preset))
  await writeFile(join(folder, 'meta.json'), JSON.stringify(meta))
  return { id, meta }
}

export async function removeMine(id: unknown): Promise<void> {
  if (typeof id !== 'string' || !ID.test(id)) return
  await rm(join(dir(), id), { recursive: true, force: true })
}
