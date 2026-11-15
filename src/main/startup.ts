import { performance } from 'node:perf_hooks'
import { log } from './log'

/**
 * Tempos da abertura (passagem de performance): cada etapa é marcada em ms desde o
 * início do processo (`performance.now()` do Node conta a partir dele) e o resumo sai
 * numa linha só do log, ex.:
 * `startup (ms since process start): main.js 180 · ready 420 · window 450 · … · first frame 2100`.
 * As marcas do renderer chegam por IPC e recebem o carimbo do main na chegada.
 */
const marks: [string, number][] = []
let written = false
let timer: NodeJS.Timeout | undefined

/** Etapas que encerram a medida; a linha sai quando todas chegam (ou aos 20 s). */
const FINAL = ['first frame', 'capture']
const NAMES = new Set([
  'main.js',
  'ready',
  'window',
  'page loaded',
  'renderer',
  'settings read',
  'engine',
  'first preset',
  'first frame',
  'capture',
  'extra packs'
])

function write(): void {
  if (written) return
  written = true
  if (timer) clearTimeout(timer)
  const parts = marks.sort((a, b) => a[1] - b[1]).map(([n, t]) => `${n} ${Math.round(t)}`)
  log('main', `startup (ms since process start): ${parts.join(' · ')}`)
}

export function mark(name: string): void {
  if (written || !NAMES.has(name) || marks.some(([n]) => n === name)) return
  marks.push([name, performance.now()])
  if (name === 'ready') timer = setTimeout(write, 20_000).unref()
  if (FINAL.every((f) => marks.some(([n]) => n === f))) write()
}
