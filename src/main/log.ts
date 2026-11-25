import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Log em arquivo para diagnosticar quedas no Windows (o app não tem console
 * visível): `%APPDATA%/sonic-obsidian/logs/sonic-obsidian.log`, com rotação
 * simples em 1 MB (o anterior vira `.1.log`). Escrita síncrona e curta: só
 * eventos raros (abertura, falhas, memória a cada 5 min). Sempre em inglês (spec 030):
 * o texto vai para issues, seja qual for o idioma do app.
 */
const MAX_BYTES = 1_000_000
let file = ''

export function logPath(): string {
  if (!file) {
    const dir = join(app.getPath('userData'), 'logs')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    file = join(dir, 'sonic-obsidian.log')
  }
  return file
}

export function log(source: string, message: string): void {
  try {
    const path = logPath()
    if (existsSync(path) && statSync(path).size > MAX_BYTES) renameSync(path, path.replace(/\.log$/, '.1.log'))
    // Uma linha por evento; o texto vem do app, mas corta quebras e limita o tamanho.
    const line = `${new Date().toISOString()} [${source}] ${message.replace(/\s+/g, ' ').slice(0, 2000)}\n`
    appendFileSync(path, line, 'utf8')
  } catch (err) {
    console.error('[log] write failed', err)
  }
}

/**
 * Memória por processo (MB): o processo da GPU crescendo sem parar indica vazamento.
 * Spec 034: o *working set* sobe e desce com a pressão do sistema; a memória privada
 * (`privateBytes`, só no Windows) é o que o processo reteve. Fora do Windows, omitida.
 */
export function memPart(m: { type: string; name?: string; memory: { workingSetSize: number; privateBytes?: number } }): string {
  const mb = (kb: number): number => Math.round(kb / 1024)
  const priv = typeof m.memory.privateBytes === 'number' && m.memory.privateBytes > 0 ? `/private=${mb(m.memory.privateBytes)}MB` : ''
  return `${m.type}${m.name ? `(${m.name})` : ''}=${mb(m.memory.workingSetSize)}MB${priv}`
}

export function logMetrics(): void {
  log('mem', app.getAppMetrics().map(memPart).join(' '))
}
