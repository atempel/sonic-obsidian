/**
 * Erros lançados pelo processo main (spec 030, P1). O main escreve em inglês com um código
 * (`[too-big] preset larger than 256 KB`, ver `src/main/i18n.ts`); a interface mostra pelo
 * código, no idioma do app, e o log usa o texto inglês.
 */
import type { Msg } from './i18n'

type Parsed = { code: string | null; arg: string; text: string }

/** "Error invoking remote method 'x': Error: [code:arg] text" → partes. */
function parse(err: unknown): Parsed {
  const raw = (err instanceof Error ? err.message : String(err)).replace(/^.*Error: /, '')
  const m = /^\[([\w-]+)(?::([^\]]*))?\]\s*(.*)$/s.exec(raw)
  return m ? { code: m[1]!, arg: m[2] ?? '', text: m[3]! } : { code: null, arg: '', text: raw }
}

/** Texto em inglês, sem o código (para o log). */
export const mainErrorText = (err: unknown): string => parse(err).text

/** Motivo para a interface: traduzido pelo código; sem código conhecido, o texto como veio. */
export function mainError(err: unknown): Msg {
  const { code, arg, text } = parse(err)
  switch (code) {
    case 'too-big':
      return 'mainErr.tooBig'
    case 'js':
      return 'mainErr.js'
    case 'empty-title':
      return 'mainErr.emptyTitle'
    case 'shader':
      return { key: 'mainErr.shader', params: { which: arg || '?' } }
    case 'invalid':
      return { key: 'mainErr.invalid', params: { detail: text.slice(0, 120) } }
    default:
      return { raw: text.slice(0, 160) }
  }
}
