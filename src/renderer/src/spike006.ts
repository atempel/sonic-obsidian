/**
 * Spike 006 (Butterchurn 3 + `.milk`): bateria de checagens que roda dentro do app quando
 * `test-flags.json` tem `"spike006": true`. Os resultados vão para o log (`spike006: …`).
 * Código descartável: sai junto com a flag quando a decisão do spike for registrada.
 *
 * 1. Todos os presets carregados pelo motor atual: quantos compilam (equações + shaders).
 * 2. Isolamento: presets com campos `*_str`/`useJS` maliciosos não executam nada.
 * 3. Conversão `.milk` → preset 3.x (EEL bruto + HLSL → GLSL, no main: src/main/milk.ts) com os 10 fixtures de `spike/006/milk/`.
 * 4. fps médio de 5 presets pesados (comparar rodando com e sem `engine3`).
 */
import type { Preset, Visualizer } from 'butterchurn'
import type { PresetLibrary } from './presets'
import type { PresetVisualizer } from './visualizer'

const log = (m: string): void => {
  console.log(`[spike006] ${m}`)
  window.so.log(`spike006: ${m}`)
}
const frames = (n: number): Promise<void> =>
  new Promise((resolve) => {
    const step = (): void => (--n <= 0 ? resolve() : void requestAnimationFrame(step))
    requestAnimationFrame(step)
  })
const errText = (e: unknown): string => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 160)

interface ShaderHolder {
  shaderProgram?: WebGLProgram | null
}
interface RendererInternals {
  gl?: WebGL2RenderingContext
  warpShader?: ShaderHolder
  compShader?: ShaderHolder
}

/** Shaders do preset atual linkaram? (o motor não reporta erro de compilação). */
function shadersOk(v: Visualizer): boolean | null {
  const r = (v as unknown as { renderer?: RendererInternals }).renderer
  const gl = r?.gl
  if (!gl) return null
  for (const h of [r?.warpShader, r?.compShader]) {
    const p = h?.shaderProgram
    if (!p || !gl.getProgramParameter(p, gl.LINK_STATUS)) {
      // Primeira linha do erro do compilador GLSL (o motor não reporta).
      const info = p ? (gl.getAttachedShaders(p) ?? []).map((sh) => gl.getShaderInfoLog(sh) ?? '').join(' ') || gl.getProgramInfoLog(p) : ''
      lastShaderError = (info ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
      return false
    }
  }
  return true
}
let lastShaderError = ''

/** Carrega com corte seco, espera 3 quadros e confere os shaders. */
async function tryLoad(viz: PresetVisualizer, preset: Preset): Promise<string | null> {
  const warns: string[] = []
  const warn = console.warn
  console.warn = (...a: unknown[]) => {
    warns.push(a.map(String).join(' '))
    warn(...a)
  }
  try {
    await viz.load(preset, 'cut', 0)
    await frames(3)
  } catch (e) {
    return errText(e)
  } finally {
    console.warn = warn
  }
  if (warns.some((w) => /preset|WASM/i.test(w))) return `aviso: ${warns.join(' | ').slice(0, 160)}`
  if (shadersOk(viz.visualizer) === false) return `shader não linkou: ${lastShaderError}`
  return null
}

const MILK = import.meta.glob('../../../spike/006/milk/*.milk', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Presets pesados no 2.6.7 (log do usuário e do spike 012) para comparar fps nos dois motores. */
const HEAVY = [
  'Flexi - predator-prey-spirals',
  'fiShbRaiN - witchcraft (necromancer remix)_phat_edit_v3',
  'Geiss - Reaction Diffusion 2',
  'Flexi + Martin - cascading decay swing',
  'Martin - mucus cervix'
]

export async function runSpike006(viz: PresetVisualizer, library: PresetLibrary, extras: Promise<number>): Promise<void> {
  await extras.catch(() => 0)
  await frames(30)
  log(`início · motor ${viz.engine} · ${library.count} presets`)

  // 1. Todos os presets.
  const t0 = performance.now()
  const fails: string[] = []
  for (const name of library.all()) {
    const err = await tryLoad(viz, library.get(name))
    if (err) fails.push(`${name} → ${err}`)
  }
  const total = library.count
  log(`presets: ${total - fails.length}/${total} carregaram (${(((total - fails.length) / total) * 100).toFixed(1)}%) em ${((performance.now() - t0) / 1000).toFixed(0)} s`)
  for (const f of fails) log(`  falhou: ${f}`)

  // 2. Isolamento: *_str maliciosos, com e sem *_eel, e useJS.
  const base = structuredClone(library.get(library.all()[0]!)) as Record<string, unknown>
  const evil = "document.title='pwned'; window.__pwned=(window.__pwned||0)+1; a.zoom=1;"
  const title = document.title
  const cases: [string, Record<string, unknown>][] = [
    ['com *_eel + *_str + useJS', { ...base, useJS: true, init_eqs_str: evil, frame_eqs_str: evil, pixel_eqs_str: evil }],
    ['só *_str (sem *_eel)', Object.fromEntries(Object.entries({ ...base, init_eqs_str: evil, frame_eqs_str: evil, pixel_eqs_str: evil }).filter(([k]) => !k.endsWith('_eel')))]
  ]
  for (const [label, preset] of cases) {
    const err = await tryLoad(viz, preset as Preset)
    await frames(10)
    const w = window as unknown as { __pwned?: number }
    const ok = document.title === title && w.__pwned === undefined
    log(`isolamento (${label}): ${ok ? 'OK, nada executou' : `FALHOU: título="${document.title}", __pwned=${String(w.__pwned)}`}${err ? ` · motor: ${err}` : ''}`)
  }
  let evalBlocked = false
  try {
    new Function('return 1')()
  } catch {
    evalBlocked = true
  }
  log(`CSP: new Function ${evalBlocked ? 'bloqueado' : 'PERMITIDO'} nesta página`)

  // 3. Conversão .milk → 3.x.
  if (viz.engine === 'v3') {
    let ok = 0
    for (const [path, text] of Object.entries(MILK)) {
      const name = path.split('/').pop()!.replace(/\.milk$/, '')
      try {
        const { preset, ms } = await window.so.presets.convertMilk(text)
        const err = await tryLoad(viz, preset as Preset)
        if (!err) ok++
        log(`.milk ${err ? 'FALHOU' : 'ok'}: ${name} (conversão ${ms.toFixed(0)} ms)${err ? ` → ${err}` : ''}`)
      } catch (e) {
        log(`.milk FALHOU: ${name} → conversão: ${errText(e)}`)
      }
    }
    log(`.milk: ${ok}/${Object.keys(MILK).length} converteram e tocaram`)
  } else {
    log('.milk: pulado (só no motor 3)')
  }

  // 4. fps dos pesados (janela visível; 1 s de folga e 5 s de medida).
  for (const name of HEAVY) {
    if (!library.has(name)) {
      log(`fps: ${name} não está nesta biblioteca`)
      continue
    }
    await tryLoad(viz, library.get(name))
    await new Promise((r) => setTimeout(r, 1000))
    if (document.hidden) {
      log('fps: janela oculta, medida cancelada')
      break
    }
    let n = 0
    const start = performance.now()
    while (performance.now() - start < 5000) {
      await frames(1)
      n++
    }
    log(`fps ${viz.engine}: ${name} = ${((n * 1000) / (performance.now() - start)).toFixed(1)}`)
  }
  log('fim')
}
