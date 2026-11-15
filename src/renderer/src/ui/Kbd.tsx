import { keyName, keySpoken } from './shortcuts'

/**
 * Uma tecla (`<kbd>`). Símbolos (`←`, `,`, `?`…) ganham o nome falado para o leitor de tela,
 * no idioma do app; o símbolo fica escondido dele (spec 030, P1). Aceita combinação com `+`
 * (`Ctrl+,`): cada parte é lida pelo nome.
 */
export function Kbd({ k }: { k: string }) {
  const parts = k.length > 1 && k.includes('+') ? k.split(/\+(?=.)/) : [k]
  const spoken = parts.map((p) => keySpoken(p))
  const shown = parts.map(keyName).join('+')
  if (spoken.every((s) => s === null)) return <kbd>{shown}</kbd>
  return (
    <kbd>
      <span aria-hidden="true">{shown}</span>
      <span class="vh">{parts.map((p, i) => spoken[i] ?? keyName(p)).join(' + ')}</span>
    </kbd>
  )
}
