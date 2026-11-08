const CURSOR_IDLE_MS = 3000

/** Tela cheia do BrowserWindow não aciona a Fullscreen API; a janela ocupa a tela inteira. */
function isFullScreen(): boolean {
  return window.innerWidth >= screen.width && window.innerHeight >= screen.height
}

/**
 * Comportamento da janela sem moldura:
 * - em janela, uma área de arrasto (#drag) cobre o visual, recuada das bordas
 *   para não disputar com o redimensionamento nativo;
 * - em tela cheia, a área some (regiões de drag engolem o mousemove) e o
 *   cursor some após 3 s parado.
 */
export function setupWindowChrome(): void {
  const body = document.body
  let idleTimer: number | undefined

  const armIdle = (): void => {
    body.classList.remove('cursor-idle')
    window.clearTimeout(idleTimer)
    if (body.classList.contains('fullscreen')) {
      idleTimer = window.setTimeout(() => body.classList.add('cursor-idle'), CURSOR_IDLE_MS)
    }
  }

  const update = (): void => {
    body.classList.toggle('fullscreen', isFullScreen())
    armIdle()
  }

  window.addEventListener('resize', update)
  window.addEventListener('mousemove', armIdle)
  update()
}
