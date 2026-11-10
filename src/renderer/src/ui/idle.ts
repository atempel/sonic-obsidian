/** Auto-hide da faixa (protótipo v3): 2,5 s sem mouse → body.idle (faixa some, cursor some). */
const IDLE_MS = 2500

export interface Idle {
  wake(): void
  /** `H`: esconde na hora. */
  hideNow(): void
}

export function setupIdle(blocked: () => boolean): Idle {
  const body = document.body
  let timer: number | undefined
  const arm = (): void => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (blocked()) arm()
      else body.classList.add('idle')
    }, IDLE_MS)
  }
  const wake = (): void => {
    body.classList.remove('idle')
    arm()
  }
  window.addEventListener('mousemove', wake, { passive: true })
  window.addEventListener('pointerdown', wake, { passive: true })
  document.addEventListener('focusin', (e) => {
    // Foco por teclado (Tab) dentro da faixa traz a faixa de volta.
    if ((e.target as HTMLElement | null)?.closest?.('.strip, .menu.collect')) wake()
  })
  wake()
  return {
    wake,
    hideNow: () => {
      window.clearTimeout(timer)
      if (body.contains(document.activeElement) && document.activeElement instanceof HTMLElement) document.activeElement.blur()
      body.classList.add('idle')
    }
  }
}
