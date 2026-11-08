/** Aviso discreto e temporário (nome do preset ao trocar). Mostra o texto inteiro. */
export class Toast {
  private timer: number | undefined

  constructor(private readonly el: HTMLElement) {}

  show(text: string, ms = 3000): void {
    this.el.textContent = text
    this.el.classList.add('visible')
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => this.el.classList.remove('visible'), ms)
  }
}
