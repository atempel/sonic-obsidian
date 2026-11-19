import { existsSync, readFileSync } from 'node:fs'
import { homedir, platform, release, type as osType } from 'node:os'
import { logPath } from './log'

/**
 * Feedback e bugs (spec 031): o que o painel "Relatar um problema" e o "Copiar diagnóstico"
 * leem do sistema. Nada sai daqui sozinho: o renderer mostra e a pessoa decide.
 * Sem dependência de Electron além do `logPath()`, para o teste headless transpilar as funções puras.
 */

/** Máximo que o `system:copyText` aceita (64 KB): cabe o diagnóstico de 200 linhas. */
export const COPY_MAX = 64_000
export const TAIL_LINES = 200

/** `Windows 11 (build 22631)`: o build 22000 em diante é o 11 (o `os.release()` do 11 ainda diz 10.0). */
export function osText(plat: string, rel: string, type = ''): string {
  if (plat !== 'win32') return `${type || plat} ${rel}`.trim()
  const build = Number(rel.split('.')[2])
  if (!Number.isFinite(build) || build <= 0) return `Windows (${rel})`
  return `${build >= 22000 ? 'Windows 11' : 'Windows 10'} (build ${build})`
}

export function osInfo(): string {
  return osText(platform(), release(), osType())
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Troca a pasta do usuário por `~` (o texto vai para uma issue pública), com `\` ou `/`
 * e sem diferença de maiúsculas (o Windows não diferencia).
 */
export function hideHome(text: string, home: string): string {
  const h = home.replace(/[\\/]+$/, '')
  if (h.length < 3) return text
  const pattern = h.split(/[\\/]+/).map(escapeRe).join('[\\\\/]+')
  return text.replace(new RegExp(pattern, 'gi'), '~')
}

/** As últimas `n` linhas que cabem em `max` caracteres (corta pelo começo, nunca no meio de uma linha). */
export function tailLines(text: string, n = TAIL_LINES, max = COPY_MAX): string {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0).slice(-n)
  let size = 0
  let i = lines.length
  while (i > 0 && size + lines[i - 1]!.length + 1 <= max) size += lines[--i]!.length + 1
  return lines.slice(i).join('\n')
}

/** `log:tail`: últimas 200 linhas do log (o anterior, `.1.log`, completa se o atual for curto). `null` = sem log. */
export function logTail(): string | null {
  const path = logPath()
  const old = path.replace(/\.log$/, '.1.log')
  const read = (p: string): string => (existsSync(p) ? readFileSync(p, 'utf8') : '')
  let text = read(path)
  if (text.split('\n').length <= TAIL_LINES) text = read(old) + text
  if (!text.trim()) return null
  return tailLines(hideHome(text, homedir()))
}
