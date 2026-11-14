import { findText } from '../i18n'

/** Destaca o trecho buscado (`<mark>`), sem diferenciar acentos nem maiúsculas (spec 030). */
export function Highlight({ text, q }: { text: string; q: string }) {
  const hit = q ? findText(text, q) : null
  if (!hit) return <>{text}</>
  const [i, j] = hit
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, j)}</mark>
      {text.slice(j)}
    </>
  )
}
