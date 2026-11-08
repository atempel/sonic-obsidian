/** Tela cheia do BrowserWindow não aciona a Fullscreen API; a janela ocupa a tela inteira. */
export function isFullScreen(): boolean {
  return window.innerWidth >= screen.width && window.innerHeight >= screen.height
}

/**
 * Comportamento da janela sem moldura:
 * - em janela, uma faixa de arrasto (#drag) de 40 px no topo, recuada das bordas
 *   para não disputar com o redimensionamento nativo. Desde a spec 009 o arrasto
 *   não cobre mais o visual inteiro: regiões de drag engolem o mousemove e a faixa
 *   de controle não conseguiria aparecer;
 * - em tela cheia, a faixa de arrasto some. O cursor some junto com a faixa de
 *   controle (ui/idle.ts).
 */
export function setupWindowChrome(): void {
  const update = (): void => {
    document.body.classList.toggle('fullscreen', isFullScreen())
  }
  window.addEventListener('resize', update)
  update()
}
