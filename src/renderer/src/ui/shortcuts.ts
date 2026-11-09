/**
 * Lista única de atalhos e comandos (spec 020). A tabela das Configurações, o painel `?` e o
 * grupo "Comandos" da busca rápida leem daqui. Só teclas que existem no app: tecla nova no
 * `keydown` de `main.ts` entra também nesta lista.
 */
import type { IconName } from './icons'

/** Alternativas de uma ação; cada alternativa é uma sequência de teclas (um `kbd` por tecla). */
export type Keys = string[][]
export interface ShortcutRow {
  label: string
  keys: Keys
}
export interface ShortcutGroup {
  name: string
  rows: ShortcutRow[]
  now?: boolean
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'Reprodução',
    rows: [
      { label: 'Preset aleatório', keys: [['Espaço']] },
      { label: 'Preset anterior', keys: [['←']] },
      { label: 'Próximo preset', keys: [['→']] },
      { label: 'Trocar com corte seco', keys: [['Shift', '←'], ['Shift', '→'], ['Shift', 'Espaço']] },
      { label: 'Tipo da transição', keys: [['B'], ['Shift', 'B']] },
      { label: 'Tempo da transição', keys: [['↑'], ['↓']] },
      { label: 'Rotação automática', keys: [['R']] }
    ]
  },
  {
    name: 'Expressividade',
    rows: [
      { label: 'Mais ou menos expressividade', keys: [['+'], ['−']] },
      { label: 'Expressividade neutra', keys: [['0']] },
      { label: 'Caráter da reação', keys: [['X']] },
      { label: 'Memória da reação', keys: [['Shift', 'X']] }
    ]
  },
  {
    name: 'Navegação',
    rows: [
      { label: 'Busca rápida', keys: [['/'], ['Ctrl', 'K']] },
      { label: 'Biblioteca', keys: [['L']] },
      { label: 'Ajustes rápidos', keys: [[',']] },
      { label: 'Configurações', keys: [['Ctrl', ',']] }
    ]
  },
  {
    name: 'Texto e controles',
    rows: [
      { label: 'Esconder controles', keys: [['H']] },
      { label: 'Modo limpo', keys: [['T']] }
    ]
  },
  {
    name: 'Janela',
    rows: [
      { label: 'Tela cheia', keys: [['F'], ['F11']] },
      { label: 'Fechar o app', keys: [['Ctrl', 'W']] },
      { label: 'Fechar painel ou gaveta', keys: [['Esc']] },
      { label: 'Mostrar atalhos', keys: [['?']] }
    ]
  },
  {
    name: 'Diagnóstico',
    rows: [
      { label: 'Painel de depuração (fps, áudio)', keys: [['Ctrl', 'Shift', 'D']] },
      { label: 'Abrir a pasta do log', keys: [['Ctrl', 'Shift', 'L']] }
    ]
  }
]

/** Grupo "Agora" do painel: o lugar onde se está (protótipo `0fd0`, `ctxGroup`). */
export const NOW_STAGE: ShortcutGroup = {
  name: 'Agora · Palco',
  now: true,
  rows: [
    { label: 'Preset aleatório', keys: [['Espaço']] },
    { label: 'Anterior / próximo', keys: [['←'], ['→']] },
    { label: 'Esconder controles', keys: [['H']] },
    { label: 'Biblioteca', keys: [['L']] }
  ]
}
export const NOW_LIBRARY: ShortcutGroup = {
  name: 'Agora · Biblioteca',
  now: true,
  rows: [
    { label: 'Mover entre as linhas', keys: [['↑'], ['↓']] },
    { label: 'Tocar o preset', keys: [['Enter']] },
    { label: 'Buscar presets', keys: [['/']] },
    { label: 'Limpar a busca ou fechar', keys: [['Esc']] }
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

export interface Command {
  id: ActionId
  label: string
  keys: string[]
  icon: IconName
}

/** Comandos da busca rápida (aba Todos, abaixo dos presets). */
export const COMMANDS: Command[] = [
  { id: 'clean', label: 'Modo limpo', keys: ['T'], icon: 'eye-off' },
  { id: 'library', label: 'Abrir biblioteca', keys: ['L'], icon: 'library' },
  { id: 'shortcuts', label: 'Mostrar atalhos', keys: ['?'], icon: 'keyboard' },
  { id: 'quick', label: 'Ajustes rápidos', keys: [','], icon: 'sliders-horizontal' },
  { id: 'settings', label: 'Configurações', keys: ['Ctrl', ','], icon: 'settings' },
  { id: 'fullscreen', label: 'Tela cheia', keys: ['F'], icon: 'maximize' },
  { id: 'rotation', label: 'Rotação automática', keys: ['R'], icon: 'repeat' },
  { id: 'random', label: 'Preset aleatório', keys: ['Espaço'], icon: 'shuffle' },
  { id: 'next', label: 'Próximo preset', keys: ['→'], icon: 'skip-forward' },
  { id: 'previous', label: 'Preset anterior', keys: ['←'], icon: 'skip-back' },
  { id: 'hide', label: 'Esconder controles', keys: ['H'], icon: 'eye-off' },
  // Sem tecla no Palco: F é tela cheia (decisão do usuário; DIVERGENCIAS 2026-11-09).
  { id: 'favorite', label: 'Favoritar preset atual', keys: [], icon: 'star' }
]

/** Minúsculas e sem acento, para o filtro do painel e a busca. */
export const norm = (t: string): string =>
  t
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const keysText = (keys: Keys): string => keys.map((a) => a.join(' ')).join(' ')

export function matchCommands(q: string): Command[] {
  const f = norm(q.trim())
  if (!f) return []
  return COMMANDS.filter((c) => norm(`${c.label} ${c.keys.join(' ')}`).includes(f))
}

// Quem executa as ações é o `main.ts` (as mesmas funções das teclas, com os mesmos toasts).
let runner: (id: ActionId) => void = () => {}
export function setActionRunner(fn: (id: ActionId) => void): void {
  runner = fn
}
export function runAction(id: ActionId): void {
  runner(id)
}
