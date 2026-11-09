import { performance } from 'node:perf_hooks'
import { log } from './log'

/**
 * Tempos da abertura (passagem de performance): cada etapa é marcada em ms desde o
 * início do processo (`performance.now()` do Node conta a partir dele) e o resumo sai
 * numa linha só do log, ex.:
 * `abertura (ms desde o processo): main.js 180 · pronto 420 · janela 450 · … · primeiro quadro 2100`.
 * As marcas do renderer chegam por IPC e recebem o carimbo do main na chegada.
 */
const marks: [string, number][] = []
let written = false
let timer: NodeJS.Timeout | undefined

/** Etapas que encerram a medida; a linha sai quando todas chegam (ou aos 20 s). */
const FINAL = ['primeiro quadro', 'captura']
const NAMES = new Set([
  'main.js',
  'pronto',
  'janela',
  'página carregada',
  'renderer',
  'ajustes lidos',
  'motor',
  'primeiro preset',
  'primeiro quadro',
  'captura',
  'pacotes extras'
])

function write(): void {
  if (written) return
  written = true
  if (timer) clearTimeout(timer)
  const parts = marks.sort((a, b) => a[1] - b[1]).map(([n, t]) => `${n} ${Math.round(t)}`)
  log('main', `abertura (ms desde o processo): ${parts.join(' · ')}`)
}

export function mark(name: string): void {
  if (written || !NAMES.has(name) || marks.some(([n]) => n === name)) return
  marks.push([name, performance.now()])
  if (name === 'pronto') timer = setTimeout(write, 20_000).unref()
  if (FINAL.every((f) => marks.some(([n]) => n === f))) write()
}
