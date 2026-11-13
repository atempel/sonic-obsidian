/**
 * Idiomas do app (spec 030). Catálogos tipados em TypeScript, sem dependência:
 * `en.ts` é a fonte; `pt-BR.ts` tem o mesmo tipo (chave faltando = erro de typecheck).
 * Formatos (números, plurais, ordem) sempre pelo `Intl`, no idioma do app, não do Windows.
 * O log e o HUD de diagnóstico ficam em inglês e não passam por aqui.
 */
import { en, type MessageKey, type Messages } from './en'
import { ptBR } from './pt-BR'

export type { MessageKey } from './en'
export const LANGS = ['en', 'pt-BR'] as const
export type Lang = (typeof LANGS)[number]
/** O que fica salvo em `settings.language`. */
export const LANGUAGE_PREFS = ['auto', 'en', 'pt-BR'] as const
export type LanguagePref = (typeof LANGUAGE_PREFS)[number]

const catalogs: Record<Lang, Messages> = { en, 'pt-BR': ptBR }
/** Nome de cada idioma no próprio idioma (o seletor mostra os dois assim). */
export const LANG_NAME: Record<Lang, string> = { en: 'English', 'pt-BR': 'Português (Brasil)' }

/** `pt-*` → Português (Brasil); qualquer outro idioma → English (spec 030, decisão 2). */
export function langFromTag(tag: string | null | undefined): Lang {
  return typeof tag === 'string' && /^pt(-|_|$)/i.test(tag) ? 'pt-BR' : 'en'
}

let lang: Lang = 'en'
let system: Lang = 'en'
const listeners = new Set<(l: Lang) => void>()

export const getLang = (): Lang => lang
/** Idioma do Windows, já reduzido a `en` ou `pt-BR` (o main lê `app.getPreferredSystemLanguages()`). */
export const getSystemLang = (): Lang => system

export function setSystemLang(l: Lang): void {
  system = l
}

/** `'auto'` segue o Windows; os outros valem como estão. */
export const resolveLang = (pref: LanguagePref): Lang => (pref === 'auto' ? system : pref)

/** Troca o idioma ativo na hora (sem reiniciar); a interface redesenha pelo `stateChanged` do Core. */
export function applyLanguage(pref: LanguagePref): Lang {
  const next = resolveLang(pref)
  if (next !== lang) {
    lang = next
    cache.clear()
    for (const fn of listeners) fn(lang)
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang
  return lang
}

export function onLanguage(fn: (l: Lang) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export type Params = Record<string, string | number>

function fill(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = params[k]
    return v === undefined ? m : typeof v === 'number' ? fmtNum(v) : v
  })
}

/** Texto da chave no idioma ativo, com `{param}` preenchido (números formatados pelo idioma). */
export function t(key: MessageKey, params?: Params): string {
  return fill(catalogs[lang][key] ?? en[key], params)
}

/** Chaves terminadas em `.one` / `.other`: escolhe pela regra de plural do idioma (`{n}` = a quantidade). */
type BaseOf<K> = K extends `${infer B}.one` ? B : never
type PluralBase = BaseOf<MessageKey>
export function tn(base: PluralBase, n: number, params?: Params): string {
  const rule = pluralRules().select(n)
  const key = (rule === 'one' ? `${base}.one` : `${base}.other`) as MessageKey
  return t(key, { n, ...params })
}

// ── Formatos ──────────────────────────────────────────────
const cache = new Map<string, Intl.NumberFormat | Intl.PluralRules | Intl.Collator>()
function cached<T extends Intl.NumberFormat | Intl.PluralRules | Intl.Collator>(key: string, make: () => T): T {
  let v = cache.get(key) as T | undefined
  if (!v) cache.set(key, (v = make()))
  return v
}
const pluralRules = (): Intl.PluralRules => cached('plural', () => new Intl.PluralRules(lang))

/** Número no formato do idioma (`2.7` / `2,7`), com o menos tipográfico `−`. */
export function fmtNum(n: number, maxDigits = 2, signed = false): string {
  const f = cached(`num:${maxDigits}:${signed}`, () => new Intl.NumberFormat(lang, { maximumFractionDigits: maxDigits, signDisplay: signed ? 'exceptZero' : 'auto' }))
  return f.format(n).replace(/-/g, '−')
}

/** Segundos com espaço antes da unidade: `2.7 s` / `2,7 s`. */
export const fmtSeconds = (s: number): string => `${fmtNum(s)} s`

/** Ordem alfabética e busca no idioma ativo, sem diferenciar acentos nem caixa. */
export function compareText(a: string, b: string): number {
  return cached('collator', () => new Intl.Collator(lang, { sensitivity: 'base', numeric: true })).compare(a, b)
}
