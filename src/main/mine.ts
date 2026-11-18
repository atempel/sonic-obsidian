import { app } from 'electron'
import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { log } from './log'

/**
 * "Meus presets" do Estúdio (spec 026), em `userData/presets/mine/<id>/`:
 * `preset.json` (preset Butterchurn 3), `meta.json` (título, autor, `basedOn`, `createdAt`) e o
 * histórico (spec 027, fatia 3): cada salvamento vira `v0001.json`, `v0002.json`… (até 50; as mais
 * antigas saem). O `preset.prev.json` da 026 vira a primeira versão na migração.
 * Fonte `.milk` (fatia 6): `source.milk`, só nos presets que vieram de um `.milk` (texto, até 256 KB);
 * o Estúdio gera o texto a partir do preset, com o HLSL dos shaders da fonte.
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
  if (!isObj(v)) throw new Error('[invalid] bad baseVals')
  const out: Record<string, number> = {}
  for (const [k, x] of Object.entries(v)) {
    if (!/^[a-z_][a-z0-9_]{0,40}$/i.test(k)) throw new Error(`[invalid] baseVals: bad field ${k}`)
    if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`[invalid] baseVals.${k} is not a number`)
    out[k] = x
  }
  return out
}

function part(v: unknown, keys: Set<string>, label: string): Record<string, unknown> {
  if (!isObj(v)) throw new Error(`[invalid] bad ${label}`)
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) {
    if (/_str$/.test(k) || k === 'useJS') throw new Error('[js] preset with JavaScript (*_str/useJS) refused')
    if (!keys.has(k)) throw new Error(`[invalid] ${label}: unknown field ${k}`)
    if (k === 'baseVals') out[k] = vals(x)
    else if (typeof x === 'string') out[k] = x
    else throw new Error(`[invalid] ${label}.${k} is not text`)
  }
  return out
}

/** Recusa o que não for um preset Butterchurn 3 só com EEL e GLSL. */
export function sanitizePreset(raw: unknown): Record<string, unknown> {
  if (!isObj(raw)) throw new Error('[invalid] bad preset')
  if (JSON.stringify(raw).length > MAX_BYTES) throw new Error('[too-big] preset larger than 256 KB')
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (/_str$/.test(k) || k === 'useJS') throw new Error('[js] preset with JavaScript (*_str/useJS) refused')
    if (!TOP.has(k)) throw new Error(`[invalid] unknown field: ${k}`)
    if (k === 'version') {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('[invalid] bad version')
      out[k] = v
    } else if (k === 'baseVals') out[k] = vals(v)
    else if (k === 'shapes' || k === 'waves') {
      if (!Array.isArray(v) || v.length > 4) throw new Error(`[invalid] bad ${k}`)
      out[k] = v.map((x, i) => part(x, k === 'shapes' ? SHAPE : WAVE, `${k}[${i}]`))
    } else if (typeof v === 'string') out[k] = v
    else throw new Error(`[invalid] ${k} is not text`)
  }
  for (const k of ['init_eqs_eel', 'frame_eqs_eel', 'pixel_eqs_eel']) if (typeof out[k] !== 'string') throw new Error(`[invalid] missing ${k}`)
  return out
}

function sanitizeMeta(raw: unknown, createdAt: string): MineMeta {
  const m = isObj(raw) ? raw : {}
  const title = clean(m.title, 200)
  if (!title) throw new Error('[empty-title] empty title')
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
      log('main', `unreadable Mine preset: ${id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return out
}

// ── Versões (spec 027, fatia 3) ────────────────────────────
export const MAX_VERSIONS = 50
const VER = /^v(\d{4,})\.json$/
const verFile = (n: number): string => `v${String(n).padStart(4, '0')}.json`

/**
 * Resumo de uma versão, sem texto: o renderer escreve na língua do app.
 * `created` = primeira versão do preset; `earlier` = o `preset.prev.json` da 026 (sem como saber o que mudou);
 * `edit` = até 3 parâmetros base mudados (`vals`, `more` = quantos além deles) e os blocos editados.
 */
export interface VersionSummary {
  kind: 'created' | 'earlier' | 'edit'
  vals: { key: string; from: number; to: number }[]
  more: number
  blocks: string[]
}
export interface VersionInfo {
  n: number
  savedAt: string
  summary: VersionSummary
}

const EQ_BLOCKS: [string, string][] = [
  ['init_eqs_eel', 'per_frame_init'],
  ['frame_eqs_eel', 'per_frame'],
  ['pixel_eqs_eel', 'per_pixel'],
  ['warp', 'warp'],
  ['comp', 'comp']
]

/** O que mudou de `a` para `b` (os dois já sanitizados). */
export function diffPresets(a: Record<string, unknown>, b: Record<string, unknown>): VersionSummary {
  const va = (isObj(a.baseVals) ? a.baseVals : {}) as Record<string, number>
  const vb = (isObj(b.baseVals) ? b.baseVals : {}) as Record<string, number>
  const changed: { key: string; from: number; to: number }[] = []
  for (const key of Object.keys(vb)) {
    const from = va[key]
    if (from === undefined || Math.abs(from - vb[key]!) > 1e-9) changed.push({ key, from: from ?? 0, to: vb[key]! })
  }
  const blocks: string[] = []
  for (const [k, name] of EQ_BLOCKS) if (String(a[k] ?? '') !== String(b[k] ?? '')) blocks.push(name)
  // Onda ou forma: qualquer mudança no slot conta como o slot (`wave_1`, `shape_0`), como no `.milk`.
  for (const kind of ['waves', 'shapes'] as const) {
    const la = Array.isArray(a[kind]) ? (a[kind] as unknown[]) : []
    const lb = Array.isArray(b[kind]) ? (b[kind] as unknown[]) : []
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      if (JSON.stringify(la[i] ?? null) !== JSON.stringify(lb[i] ?? null)) blocks.push(`${kind === 'waves' ? 'wave' : 'shape'}_${i}`)
    }
  }
  return { kind: 'edit', vals: changed.slice(0, 3), more: Math.max(0, changed.length - 3), blocks }
}

async function versionNumbers(folder: string): Promise<number[]> {
  const names = await readdir(folder).catch(() => [] as string[])
  return names
    .map((x) => VER.exec(x))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => Number(m[1]))
    .sort((x, y) => x - y)
}

async function writeVersion(folder: string, n: number, preset: Record<string, unknown>, summary: VersionSummary, savedAt: string): Promise<void> {
  await writeFile(join(folder, verFile(n)), JSON.stringify({ savedAt, summary, preset }))
}

const mtime = async (f: string): Promise<string> => (await stat(f).catch(() => null))?.mtime.toISOString() ?? new Date().toISOString()
const NONE: VersionSummary = { kind: 'created', vals: [], more: 0, blocks: [] }

/**
 * Preset salvo antes do histórico: o `preset.prev.json` (se houver) vira a v0001 e o
 * `preset.json` atual, a seguinte. Sem nada a migrar, não faz nada.
 */
async function migrate(folder: string): Promise<void> {
  if ((await versionNumbers(folder)).length) return
  let cur: Record<string, unknown>
  try {
    cur = sanitizePreset(JSON.parse(await readFile(join(folder, 'preset.json'), 'utf8')))
  } catch {
    return
  }
  const prevPath = join(folder, 'preset.prev.json')
  let prev: Record<string, unknown> | null = null
  try {
    prev = sanitizePreset(JSON.parse(await readFile(prevPath, 'utf8')))
  } catch {
    prev = null
  }
  if (prev) {
    await writeVersion(folder, 1, prev, { ...NONE, kind: 'earlier' }, await mtime(prevPath))
    await writeVersion(folder, 2, cur, diffPresets(prev, cur), await mtime(join(folder, 'preset.json')))
    await rm(prevPath, { force: true })
  } else {
    await writeVersion(folder, 1, cur, NONE, await mtime(join(folder, 'preset.json')))
  }
  log('main', `studio: migrated history of ${folder.slice(-24)} (${prev ? 2 : 1} versions)`)
}

/** Grava a próxima versão e tira as mais antigas além de 50. */
async function addVersion(folder: string, preset: Record<string, unknown>, summary: VersionSummary): Promise<void> {
  const ns = await versionNumbers(folder)
  const n = (ns[ns.length - 1] ?? 0) + 1
  await writeVersion(folder, n, preset, summary, new Date().toISOString())
  const all = [...ns, n]
  for (const old of all.slice(0, Math.max(0, all.length - MAX_VERSIONS))) await rm(join(folder, verFile(old)), { force: true })
}

const folderOf = (id: unknown): string => {
  if (typeof id !== 'string' || !ID.test(id)) throw new Error('[invalid] bad id')
  return join(dir(), id)
}

function sanitizeSummary(raw: unknown): VersionSummary {
  const s = isObj(raw) ? raw : {}
  const kind = s.kind === 'earlier' || s.kind === 'edit' ? s.kind : 'created'
  const vals = (Array.isArray(s.vals) ? s.vals : [])
    .filter((v): v is Record<string, unknown> => isObj(v) && typeof v.key === 'string' && typeof v.from === 'number' && typeof v.to === 'number')
    .slice(0, 3)
    .map((v) => ({ key: clean(v.key, 40), from: v.from as number, to: v.to as number }))
  const blocks = (Array.isArray(s.blocks) ? s.blocks : []).filter((b): b is string => typeof b === 'string').map((b) => clean(b, 40)).slice(0, 20)
  return { kind, vals, more: typeof s.more === 'number' && s.more > 0 ? Math.floor(s.more) : 0, blocks }
}

/** Versões de um "meu" preset, da mais nova para a mais antiga (sem os presets). */
export async function listVersions(id: unknown): Promise<VersionInfo[]> {
  const folder = folderOf(id)
  await migrate(folder)
  const out: VersionInfo[] = []
  for (const n of (await versionNumbers(folder)).reverse()) {
    try {
      const v = JSON.parse(await readFile(join(folder, verFile(n)), 'utf8')) as Record<string, unknown>
      out.push({ n, savedAt: typeof v.savedAt === 'string' ? v.savedAt : '', summary: sanitizeSummary(v.summary) })
    } catch (err) {
      log('main', `studio: unreadable version ${n} of ${String(id)}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return out
}

/** O preset de uma versão, pela mesma barreira de sempre. */
export async function readVersion(id: unknown, n: unknown): Promise<Record<string, unknown>> {
  const folder = folderOf(id)
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) throw new Error('[invalid] bad version')
  const v = JSON.parse(await readFile(join(folder, verFile(n)), 'utf8')) as Record<string, unknown>
  return sanitizePreset(v.preset)
}

/**
 * Salva. Sem `id`: cria uma pasta nova (id gerado aqui) e a primeira versão. Com `id`: sobrescreve
 * só aquele "meu" preset e grava uma versão nova com o resumo do que mudou; o título não muda
 * aqui (renomear é `renameMine`).
 */
export async function saveMine(raw: unknown): Promise<{ id: string; meta: MineMeta }> {
  const r = isObj(raw) ? raw : {}
  const preset = sanitizePreset(r.preset)
  const milk = sanitizeMilk(r.milk)
  if (r.id !== undefined && r.id !== null) {
    if (typeof r.id !== 'string' || !ID.test(r.id)) throw new Error('[invalid] bad id')
    const folder = join(dir(), r.id)
    const meta = JSON.parse(await readFile(join(folder, 'meta.json'), 'utf8')) as MineMeta
    await migrate(folder)
    let before: Record<string, unknown> | null = null
    try {
      before = sanitizePreset(JSON.parse(await readFile(join(folder, 'preset.json'), 'utf8')))
    } catch {
      before = null
    }
    await writeFile(join(folder, 'preset.json'), JSON.stringify(preset))
    await writeMilk(folder, milk)
    await addVersion(folder, preset, before ? diffPresets(before, preset) : NONE)
    return { id: r.id, meta }
  }
  const meta = sanitizeMeta(r.meta, new Date().toISOString())
  const id = randomBytes(12).toString('hex')
  const folder = join(dir(), id)
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, 'preset.json'), JSON.stringify(preset))
  await writeFile(join(folder, 'meta.json'), JSON.stringify(meta))
  await writeMilk(folder, milk)
  await addVersion(folder, preset, NONE)
  return { id, meta }
}

// ── Fonte .milk (spec 027, fatia 6) ─────────────────────────
/** `undefined` = não mexer; `null` = o preset não tem (mais) fonte `.milk`; texto = a fonte nova. */
function sanitizeMilk(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'string') throw new Error('[invalid] .milk must be text')
  if (v.length > MAX_BYTES) throw new Error('[too-big] .milk larger than 256 KB')
  return v
}
async function writeMilk(folder: string, milk: string | null | undefined): Promise<void> {
  if (milk === undefined) return
  if (milk === null) await rm(join(folder, 'source.milk'), { force: true })
  else await writeFile(join(folder, 'source.milk'), milk, 'utf8')
}
/** A fonte `.milk` de um "meu" preset, ou `null` se ele não tem (cópia de um preset do pacote). */
export async function readMineMilk(id: unknown): Promise<string | null> {
  const folder = folderOf(id)
  try {
    const text = await readFile(join(folder, 'source.milk'), 'utf8')
    return text.length > MAX_BYTES ? null : text
  } catch {
    return null
  }
}

/**
 * Renomear (spec 027, fatia 9): só o `title` do `meta.json` muda; pasta, versões e fonte `.milk`
 * ficam. O renderer manda o nome já livre na biblioteca; aqui só a mesma limpeza do salvar.
 */
export async function renameMine(id: unknown, title: unknown): Promise<MineMeta> {
  const folder = folderOf(id)
  const old = JSON.parse(await readFile(join(folder, 'meta.json'), 'utf8')) as MineMeta
  const meta = sanitizeMeta({ ...old, title }, typeof old.createdAt === 'string' ? old.createdAt : '')
  await writeFile(join(folder, 'meta.json'), JSON.stringify(meta))
  return meta
}

export async function removeMine(id: unknown): Promise<void> {
  if (typeof id !== 'string' || !ID.test(id)) return
  await rm(join(dir(), id), { recursive: true, force: true })
}
