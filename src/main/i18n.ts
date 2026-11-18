/**
 * Textos do processo main (spec 030, P1): só os diálogos nativos. O renderer avisa o idioma
 * ativo (`app:setLanguage`) sempre que ele muda; até lá vale o do Windows.
 * Erros lançados pelo main ficam em inglês com um código (`[code] text`), e o renderer
 * traduz pelo código ao mostrar (`src/renderer/src/main-error.ts`). O log fica em inglês.
 */
import { app } from 'electron'

export type MainLang = 'en' | 'pt-BR'

const en = {
  'collections.exportTitle': 'Export collections',
  'collections.importTitle': 'Import collections',
  'collections.defaultFile': 'sonic-obsidian-collections.json',
  'milk.pickTitle': 'Import .milk presets',
  'milk.filter': 'MilkDrop presets',
  'export.milkTitle': 'Export .milk',
  'export.jsonTitle': 'Export Butterchurn JSON',
  'export.jsonFilter': 'Butterchurn 3 preset',
  'export.frameTitle': 'Capture frame',
  'export.frameSuffix': '-frame',
  'export.frameFilter': 'PNG image'
} as const

type Key = keyof typeof en
const ptBR: Record<Key, string> = {
  'collections.exportTitle': 'Exportar coleções',
  'collections.importTitle': 'Importar coleções',
  'collections.defaultFile': 'sonic-obsidian-colecoes.json',
  'milk.pickTitle': 'Importar presets .milk',
  'milk.filter': 'Presets MilkDrop',
  'export.milkTitle': 'Exportar .milk',
  'export.jsonTitle': 'Exportar JSON do Butterchurn',
  'export.jsonFilter': 'Preset do Butterchurn 3',
  'export.frameTitle': 'Capturar quadro',
  'export.frameSuffix': '-quadro',
  'export.frameFilter': 'Imagem PNG'
}

/** `pt-*` → pt-BR; o resto → en (a mesma regra do renderer). */
export const systemLang = (): MainLang => (/^pt(-|_|$)/i.test(app.getPreferredSystemLanguages()[0] ?? app.getLocale()) ? 'pt-BR' : 'en')

let lang: MainLang | null = null
export function setMainLanguage(l: unknown): void {
  if (l === 'en' || l === 'pt-BR') lang = l
}

export const mt = (key: Key): string => ((lang ?? systemLang()) === 'pt-BR' ? ptBR[key] : en[key])
