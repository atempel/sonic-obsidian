/**
 * Lista única de atalhos e comandos (spec 020). A tabela das Configurações, o painel `?` e o
 * grupo "Comandos" da busca rápida leem daqui. Só teclas que existem no app: tecla nova no
 * `keydown` de `main.ts` entra também nesta lista.
 */
import { includesText, t, type MessageKey } from '../i18n'
import type { IconName } from './icons'

/**
 * Alternativas de uma ação; cada alternativa é uma sequência de teclas (um `kbd` por tecla).
 * Teclas com nome traduzível ficam aqui em inglês (`Space`) e saem pelo `keyName`.
 */
export type Keys = string[][]
export interface ShortcutRow {
  label: MessageKey
  keys: Keys
}
export interface ShortcutGroup {
  name: MessageKey
  rows: ShortcutRow[]
  now?: boolean
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'shortcuts.group.playback',
    rows: [
      { label: 'shortcuts.random', keys: [['Space']] },
      { label: 'shortcuts.previous', keys: [['←']] },
      { label: 'shortcuts.next', keys: [['→']] },
      { label: 'shortcuts.hardCut', keys: [['Shift', '←'], ['Shift', '→'], ['Shift', 'Space']] },
      { label: 'shortcuts.blendType', keys: [['B'], ['Shift', 'B']] },
      { label: 'shortcuts.blendTime', keys: [['↑'], ['↓']] },
      { label: 'shortcuts.rotation', keys: [['R']] },
      { label: 'shortcuts.hold', keys: [['Enter']] },
      { label: 'shortcuts.breath', keys: [['Shift', 'Enter']] }
    ]
  },
  {
    name: 'shortcuts.group.expression',
    rows: [
      { label: 'shortcuts.expressionMoreLess', keys: [['+'], ['−']] },
      { label: 'shortcuts.expressionNeutral', keys: [['0']] },
      { label: 'shortcuts.character', keys: [['X']] },
      { label: 'shortcuts.memory', keys: [['Shift', 'X']] }
    ]
  },
  {
    name: 'shortcuts.group.navigation',
    rows: [
      { label: 'shortcuts.search', keys: [['/'], ['Ctrl', 'K']] },
      { label: 'shortcuts.library', keys: [['L']] },
      { label: 'shortcuts.quick', keys: [[',']] },
      { label: 'shortcuts.settings', keys: [['Ctrl', ',']] },
      { label: 'shortcuts.studio', keys: [['E']] }
    ]
  },
  {
    name: 'shortcuts.group.text',
    rows: [
      { label: 'shortcuts.hide', keys: [['H']] },
      { label: 'shortcuts.clean', keys: [['T']] }
    ]
  },
  {
    name: 'shortcuts.group.window',
    rows: [
      { label: 'shortcuts.fullscreen', keys: [['F'], ['F11']] },
      { label: 'shortcuts.quit', keys: [['Ctrl', 'W']] },
      { label: 'shortcuts.closePanel', keys: [['Esc']] },
      { label: 'shortcuts.show', keys: [['?']] }
    ]
  },
  {
    name: 'shortcuts.group.diagnostics',
    rows: [
      { label: 'shortcuts.debug', keys: [['Ctrl', 'Shift', 'D']] },
      { label: 'shortcuts.logFolder', keys: [['Ctrl', 'Shift', 'L']] }
    ]
  }
]

/** Grupo "Agora" do painel: o lugar onde se está (protótipo `0fd0`, `ctxGroup`). */
export const NOW_STAGE: ShortcutGroup = {
  name: 'shortcuts.group.nowStage',
  now: true,
  rows: [
    { label: 'shortcuts.random', keys: [['Space']] },
    { label: 'shortcuts.prevNext', keys: [['←'], ['→']] },
    { label: 'shortcuts.hide', keys: [['H']] },
    { label: 'shortcuts.library', keys: [['L']] }
  ]
}
export const NOW_LIBRARY: ShortcutGroup = {
  name: 'shortcuts.group.nowLibrary',
  now: true,
  rows: [
    { label: 'shortcuts.libMove', keys: [['↑'], ['↓']] },
    { label: 'shortcuts.libPlay', keys: [['Enter']] },
    { label: 'shortcuts.libSearch', keys: [['/']] },
    { label: 'shortcuts.libClear', keys: [['Esc']] }
  ]
}

export type ActionId =
  | 'clean'
  | 'library'
  | 'shortcuts'
  | 'quick'
  | 'settings'
  | 'fullscreen'
  | 'favorite'
  | 'rotation'
  | 'random'
  | 'next'
  | 'previous'
  | 'hide'
  | 'hold'
  | 'breath'
  | 'studio'

export interface Command {
  id: ActionId
  label: MessageKey
  keys: string[]
  icon: IconName
}

/** Comandos da busca rápida (aba Todos, abaixo dos presets). */
export const COMMANDS: Command[] = [
  { id: 'clean', label: 'shortcuts.clean', keys: ['T'], icon: 'eye-off' },
  { id: 'library', label: 'shortcuts.cmd.library', keys: ['L'], icon: 'library' },
  { id: 'shortcuts', label: 'shortcuts.show', keys: ['?'], icon: 'keyboard' },
  { id: 'quick', label: 'shortcuts.quick', keys: [','], icon: 'sliders-horizontal' },
  { id: 'settings', label: 'shortcuts.settings', keys: ['Ctrl', ','], icon: 'settings' },
  { id: 'fullscreen', label: 'shortcuts.fullscreen', keys: ['F'], icon: 'maximize' },
  { id: 'rotation', label: 'shortcuts.rotation', keys: ['R'], icon: 'repeat' },
  { id: 'hold', label: 'shortcuts.hold', keys: ['Enter'], icon: 'lock' },
  { id: 'breath', label: 'shortcuts.breath', keys: ['Shift', 'Enter'], icon: 'volume-x' },
  { id: 'random', label: 'shortcuts.random', keys: ['Space'], icon: 'shuffle' },
  { id: 'next', label: 'shortcuts.next', keys: ['→'], icon: 'skip-forward' },
  { id: 'previous', label: 'shortcuts.previous', keys: ['←'], icon: 'skip-back' },
  { id: 'hide', label: 'shortcuts.hide', keys: ['H'], icon: 'eye-off' },
  { id: 'studio', label: 'shortcuts.studio', keys: ['E'], icon: 'pencil' },
  // Sem tecla no Palco: F é tela cheia (decisão do usuário; DIVERGENCIAS 2026-11-09).
  { id: 'favorite', label: 'shortcuts.cmd.favorite', keys: [], icon: 'star' }
]

/** Nome da tecla no idioma do app (`Space` / `Espaço`); as outras saem como estão. */
const KEY_NAMES: Record<string, MessageKey> = { Space: 'shortcuts.key.space' }
export const keyName = (k: string): string => (KEY_NAMES[k] ? t(KEY_NAMES[k]) : k)

export const keysText = (keys: Keys): string => keys.map((a) => a.map(keyName).join(' ')).join(' ')

/** Texto de uma linha para o filtro (rótulo e teclas, no idioma do app). */
export const rowText = (r: ShortcutRow): string => `${t(r.label)} ${keysText(r.keys)}`

export function matchCommands(q: string): Command[] {
  if (!q.trim()) return []
  return COMMANDS.filter((c) => includesText(`${t(c.label)} ${c.keys.map(keyName).join(' ')}`, q.trim()))
}

// Quem executa as ações é o `main.ts` (as mesmas funções das teclas, com os mesmos toasts).
let runner: (id: ActionId) => void = () => {}
export function setActionRunner(fn: (id: ActionId) => void): void {
  runner = fn
}
export function runAction(id: ActionId): void {
  runner(id)
}
