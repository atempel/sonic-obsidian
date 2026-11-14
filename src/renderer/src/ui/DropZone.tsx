import { useEffect, useRef, useState } from 'preact/hooks'
import { importSummary } from '../importer'
import { Icon } from './icons'
import type { PalcoBridge } from './Overlay'
import { showToast } from './toast'
import { t } from '../i18n'

/**
 * Soltar `.milk` na janela (spec 022) — protótipo "Palco integrado" (`#dropzone`, M21), versão
 * 1794178325-0fd0. Enquanto arrasta, a borda tracejada anda; ao soltar, fecha num retângulo
 * sólido por 120 ms. O primeiro preset importado começa a tocar, e o resumo sai no toast.
 */
export function DropZone({ bridge }: { bridge: PalcoBridge }) {
  const [on, setOn] = useState(false)
  const [closing, setClosing] = useState(false)
  const depth = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')
    let timer = 0
    const close = (): void => {
      setClosing(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        setOn(false)
        setClosing(false)
      }, 120)
    }
    const enter = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current++
      window.clearTimeout(timer)
      setClosing(false)
      setOn(true)
    }
    const over = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }
    const leave = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (!depth.current) setOn(false)
    }
    const drop = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current = 0
      close()
      const milk = Array.from(e.dataTransfer!.files).filter((f) => /\.milk$/i.test(f.name))
      if (!milk.length) {
        showToast(t('toast.dropOnlyMilk'), { force: true })
        return
      }
      if (busy.current) return
      busy.current = true
      void (async () => {
        try {
          const files = await Promise.all(milk.map(async (f) => ({ name: f.name, text: f.size > 256 * 1024 ? 'x'.repeat(256 * 1024 + 1) : await f.text() })))
          const r = await bridge.importMilk(files, (done, total) => {
            if (total > 3 && done < total) showToast(t('toast.importing', { done, total }), { force: true })
          })
          if (r.added[0]) bridge.core.run('preset.play', { name: r.added[0] }, 'ui')
          showToast(importSummary(r), { force: true })
        } finally {
          busy.current = false
        }
      })()
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [bridge])

  return (
    <div class={`dropzone${on ? ' on' : ''}${closing ? ' closing' : ''}`} aria-hidden="true">
      <div class="dz-box">
        <i class="march" />
        <i class="solid" />
        <Icon name="file-plus-2" />
        <strong>Solte para adicionar presets .milk</strong>
      </div>
    </div>
  )
}
