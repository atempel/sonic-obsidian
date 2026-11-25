/**
 * Spec 034: o lado JS/DOM da memória do renderer, para o log a cada 5 min.
 * `heap` = heap JS em uso (`performance.memory`, só no Chromium); `nodes` = elementos
 * do documento. Listeners ficam de fora: o Chromium não os conta sem o DevTools.
 * Se `heap` e `nodes` ficam parados enquanto a memória privada do `Tab` sobe, o
 * vazamento é do lado nativo (texturas, buffers do motor), não da interface.
 */
export interface RendererMem {
  heapMb: number | null
  nodes: number
}

export function rendererMem(doc: Document = document, perf: Performance = performance): RendererMem {
  const mem = (perf as Performance & { memory?: { usedJSHeapSize: number } }).memory
  return {
    heapMb: mem ? Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10 : null,
    nodes: doc.getElementsByTagName('*').length
  }
}

/** `heap=23.4MB nodes=812` (log em inglês, spec 030). */
export function rendererMemLine(m: RendererMem = rendererMem()): string {
  return `heap=${m.heapMb === null ? '?' : `${m.heapMb.toFixed(1)}MB`} nodes=${m.nodes}`
}
