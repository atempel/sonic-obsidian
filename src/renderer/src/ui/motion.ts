/**
 * Microinterações da faixa (spec 018; design 1794178325-0fd0, docs/v3-microinteracoes.md).
 * Tudo por Web Animations (interrompível, sem re-render) e nada com `prefers-reduced-motion`.
 */
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches

const cancelAll = (el: Element): void => el.getAnimations().forEach((a) => a.cancel())

/**
 * M02: pilha de duas camadas. `set` troca o texto sem animar; `swap` faz o antigo subir
 * 4 px e sumir (120 ms) e o novo entrar de baixo (220 ms), com flash violeta opcional.
 */
export class TextStack {
  private active = 0
  constructor(private readonly host: HTMLElement) {
    host.classList.add('stack')
    if (host.children.length !== 2) {
      host.textContent = ''
      host.append(document.createElement('span'), document.createElement('span'))
    }
  }

  private layers(): [HTMLElement, HTMLElement] {
    return [this.host.children[this.active] as HTMLElement, this.host.children[1 - this.active] as HTMLElement]
  }

  set(text: string): void {
    const [cur, other] = this.layers()
    cancelAll(cur)
    cancelAll(other)
    cur.textContent = text
    cur.style.opacity = '1'
    cur.removeAttribute('aria-hidden')
    other.style.opacity = '0'
    other.setAttribute('aria-hidden', 'true')
  }

  swap(text: string, delay = 0, flash = false): void {
    const [prev, next] = this.layers()
    if (prev.textContent === text && !reducedMotion()) return
    if (reducedMotion()) return this.set(text)
    cancelAll(prev)
    cancelAll(next)
    next.textContent = text
    prev.style.opacity = '1'
    next.style.opacity = '0'
    prev.setAttribute('aria-hidden', 'true')
    next.removeAttribute('aria-hidden')
    const out = prev.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 120, delay, easing: EASE_OUT, fill: 'both' })
    if (flash) next.animate([{ color: '#C244FF' }, { color: '#EEEEF5' }], { duration: 120, easing: EASE_OUT })
    const inn = next.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, delay, easing: EASE_OUT, fill: 'both' })
    out.onfinish = () => ((prev.style.opacity = '0'), out.cancel())
    inn.onfinish = () => ((next.style.opacity = '1'), inn.cancel())
    this.active = 1 - this.active
  }
}

/** M03: a linha da rotação esvazia da direita para a esquerda em 220 ms (de `p` a 0). */
export function drainLine(line: HTMLElement, p: number): void {
  if (!(p > 0.02) || reducedMotion()) return
  cancelAll(line)
  line.animate([{ transformOrigin: '100% 50%', transform: `scaleX(${p})` }, { transformOrigin: '100% 50%', transform: 'scaleX(0)' }], { duration: 220, easing: EASE_OUT })
}

/** M04: o ícone de anterior/próximo dá um passo de 2 px na sua direção (só com ponteiro). */
export function nudgeIcon(btn: HTMLElement, dx: number): void {
  if (reducedMotion()) return
  btn.querySelector('svg')?.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], { duration: 240, easing: EASE_OUT })
}

/** M05: as duas setas do `shuffle` se afastam e voltam (220 ms). */
export function shuffleIcon(btn: HTMLElement): void {
  if (reducedMotion()) return
  for (const [sel, dy] of [['.shA', 12], ['.shB', -12]] as const) {
    btn.querySelector(sel)?.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: EASE_OUT })
  }
}

/** M07: o núcleo (losango) sobe e some em 400 ms, só ao favoritar. */
export function coreRise(btn: HTMLElement): void {
  if (reducedMotion()) return
  btn.querySelector('.core')?.animate(
    [
      { opacity: 1, transform: 'translateY(-8px) rotate(45deg)' },
      { opacity: 0, transform: 'translateY(-14px) rotate(45deg)' }
    ],
    { duration: 400, easing: EASE_OUT }
  )
}
