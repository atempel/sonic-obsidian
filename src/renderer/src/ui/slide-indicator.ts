import { useLayoutEffect, type Inputs } from 'preact/hooks'
import type { RefObject } from 'preact'

/**
 * M10 (design 1794175739-7509): um indicador único desliza até o item selecionado,
 * em vez de cada item ter o próprio sublinhado. O host precisa de um filho `.ind`
 * com `position: absolute` e transição em `transform` (t-med). Na abertura e no
 * redimensionamento ele vai direto, sem animar.
 * Eixo x: barra embaixo (abas). Eixo y: barra à esquerda (menu vertical).
 */
export function useSlideIndicator(host: RefObject<HTMLElement | null>, selected: string, axis: 'x' | 'y', deps: Inputs): void {
  useLayoutEffect(() => {
    const el = host.current
    const ind = el?.querySelector<HTMLElement>(':scope > .ind')
    if (!el || !ind) return
    const place = (instant: boolean): void => {
      const b = el.querySelector<HTMLElement>(selected)
      if (!b || !b.offsetWidth) {
        ind.style.opacity = '0'
        return
      }
      ind.style.opacity = '1'
      const t =
        axis === 'x'
          ? `translateX(${b.offsetLeft}px) scaleX(${b.offsetWidth})`
          : `translateY(${b.offsetTop + (b.offsetParent === el ? 0 : (b.offsetParent as HTMLElement).offsetTop)}px) scaleY(${b.offsetHeight})`
      if (instant) {
        ind.style.transition = 'none'
        ind.style.transform = t
        void ind.offsetWidth
        ind.style.transition = ''
      } else ind.style.transform = t
    }
    const first = !ind.dataset.placed
    ind.dataset.placed = '1'
    place(first)
    const ro = new ResizeObserver(() => place(true))
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
