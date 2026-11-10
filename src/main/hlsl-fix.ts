/**
 * Contorno para o `hlslparser-js` 0.1.x (spike 006): numa cadeia de três ou mais operandos
 * (`a*b*c`, `a+b-c`, `x/2.0*3.0`), ele traduz o segundo operador como `&&` lógico. Com
 * parênteses explícitos (`(a*b)*c`), a tradução sai certa. Este módulo relê o HLSL do `.milk`
 * e reescreve cada expressão com toda operação binária entre parênteses, sem mudar a ordem
 * de avaliação (respeita precedência e associatividade à esquerda).
 *
 * Também troca funções que o conversor não conhece por equivalentes:
 * `round(x)` → `floor((x)+0.5)` e `fwidth(x)` → `(abs(ddx(x))+abs(ddy(x)))`.
 *
 * Só texto entra e sai; nada é executado. O que não for reconhecido passa adiante intacto.
 */

type Tok = { t: 'id' | 'num' | 'op' | 'raw'; v: string }

const OPS = ['<<=', '>>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==', '!=', '<=', '>=', '&&', '||', '<<', '>>']

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]!
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end < 0 ? src.length : end + 2
      continue
    }
    if (c === '#') {
      // Diretiva do pré-processador: a linha inteira. O corpo de um #define também vira
      // expressão com parênteses (a macro é expandida antes do conversor ver o operador).
      let j = src.indexOf('\n', i)
      if (j < 0) j = src.length
      out.push({ t: 'raw', v: fixDefine(src.slice(i, j)) + '\n' })
      i = j
      continue
    }
    const num = /^(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)[fFhH]?/.exec(src.slice(i, i + 40))
    if (num && (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? '')))) {
      out.push({ t: 'num', v: num[0] })
      i += num[0].length
      continue
    }
    const id = /^[A-Za-z_]\w*/.exec(src.slice(i, i + 200))
    if (id) {
      out.push({ t: 'id', v: id[0] })
      i += id[0].length
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (op) {
      out.push({ t: 'op', v: op })
      i += op.length
      continue
    }
    out.push({ t: 'op', v: c })
    i++
  }
  return out
}

const BIN: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '|': 3,
  '^': 4,
  '&': 5,
  '==': 6,
  '!=': 6,
  '<': 7,
  '>': 7,
  '<=': 7,
  '>=': 7,
  '<<': 8,
  '>>': 8,
  '+': 9,
  '-': 9,
  '*': 10,
  '/': 10,
  '%': 10
}
const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='])
const TYPES = /^(?:float|half|int|uint|bool|double)(?:[1-4](?:x[1-4])?)?$|^(?:sampler|sampler2D|sampler3D|texture)$/

class Parser {
  i = 0
  constructor(private readonly toks: Tok[]) {}

  private peek(k = 0): Tok | undefined {
    return this.toks[this.i + k]
  }
  private is(v: string, k = 0): boolean {
    return this.peek(k)?.v === v
  }
  private take(): Tok {
    return this.toks[this.i++]!
  }

  /** Expressão com precedência mínima `min`; ternário e atribuição incluídos. */
  expr(min = 0): string {
    let left = this.unary()
    for (;;) {
      const t = this.peek()
      if (!t || t.t !== 'op') break
      if (t.v === '?' && min <= 0) {
        this.take()
        const a = this.expr(0)
        if (this.is(':')) this.take()
        const b = this.expr(0)
        left = `(${left} ? ${a} : ${b})`
        continue
      }
      if (ASSIGN.has(t.v) && min <= 0) {
        this.take()
        left = `${left} ${t.v} ${this.expr(0)}`
        continue
      }
      const p = BIN[t.v]
      if (p === undefined || p <= min) break
      this.take()
      const right = this.expr(p)
      left = `(${left} ${t.v} ${right})`
    }
    return left
  }

  private unary(): string {
    const t = this.peek()
    if (t && t.t === 'op' && ['-', '+', '!', '~', '++', '--'].includes(t.v)) {
      this.take()
      return `(${t.v}${this.unary()})`
    }
    return this.postfix(this.primary())
  }

  private args(): string[] {
    // Já consumiu "(".
    const list: string[] = []
    while (this.peek() && !this.is(')')) {
      list.push(this.expr(0))
      if (this.is(',')) this.take()
      else break
    }
    if (this.is(')')) this.take()
    return list
  }

  private primary(): string {
    const t = this.take()
    if (!t) return ''
    if (t.v === '(') {
      // Conversão de tipo: (float3) x
      if (this.peek()?.t === 'id' && TYPES.test(this.peek()!.v) && this.is(')', 1)) {
        const ty = this.take().v
        this.take()
        return `((${ty})${this.unary()})`
      }
      const inner = this.expr(0)
      if (this.is(')')) this.take()
      return `(${inner})`
    }
    if (t.t === 'id' && this.is('(')) {
      this.take()
      const a = this.args()
      if (t.v === 'round' && a.length === 1) return `floor((${a[0]})+0.5)`
      if (t.v === 'fwidth' && a.length === 1) return `(abs(ddx(${a[0]}))+abs(ddy(${a[0]})))`
      return `${t.v}(${a.join(', ')})`
    }
    return t.v
  }

  private postfix(base: string): string {
    let s = base
    for (;;) {
      if (this.is('.') && this.peek(1)?.t === 'id') {
        this.take()
        s += '.' + this.take().v
      } else if (this.is('[')) {
        this.take()
        const ix = this.expr(0)
        if (this.is(']')) this.take()
        s += `[${ix}]`
      } else if (this.is('++') || this.is('--')) {
        s += this.take().v
      } else return s
    }
  }

  /**
   * Percorre o texto todo. Expressões começam depois de `=`/atribuição composta, de `return`
   * e dentro de `if (…)`/`while (…)`/`for (…;…;…)`; o resto (declarações, chaves, assinaturas
   * de função) passa adiante como está.
   */
  program(): string {
    const out: string[] = []
    while (this.peek()) {
      const t = this.peek()!
      if (t.t === 'raw') {
        out.push('\n' + this.take().v)
        continue
      }
      if (t.t === 'op' && ASSIGN.has(t.v)) {
        this.take()
        out.push(t.v, this.expr(0))
        continue
      }
      if (t.v === 'return') {
        this.take()
        out.push('return')
        if (!this.is(';')) out.push(this.expr(0))
        continue
      }
      if ((t.v === 'if' || t.v === 'while') && this.is('(', 1)) {
        this.take()
        this.take()
        const c = this.expr(0)
        if (this.is(')')) this.take()
        out.push(`${t.v} (${c})`)
        continue
      }
      if (t.v === 'for' && this.is('(', 1)) {
        this.take()
        this.take()
        const parts: string[] = []
        for (let k = 0; k < 3; k++) {
          // Inicialização pode ser declaração: "int i = 0".
          const head: string[] = []
          while (this.peek()?.t === 'id' && this.peek(1)?.t === 'id') head.push(this.take().v)
          parts.push([...head, this.is(';') || this.is(')') ? '' : this.expr(0)].join(' ').trim())
          if (this.is(';')) this.take()
        }
        if (this.is(')')) this.take()
        out.push(`for (${parts.join('; ')})`)
        continue
      }
      out.push(this.take().v)
    }
    // Espaços entre tokens; ";", "{" e "}" quebram linha (só legibilidade do GLSL gerado).
    return out
      .join(' ')
      .replace(/ ?([;{}]) ?/g, '$1\n')
      .replace(/\n\s*\n/g, '\n')
  }
}

/** `#define NOME(a,b) corpo` → corpo com parênteses; se o corpo não for uma expressão inteira, fica como está. */
function fixDefine(line: string): string {
  const m = /^(#\s*define\s+\w+(?:\([^)]*\))?)\s+(.+)$/.exec(line.trim())
  if (!m) return line
  const toks = tokenize(m[2]!)
  // Um nome ou número só (#define tex2d tex2D) fica como está: "(tex2D)(x)" não compila.
  if (toks.length < 2 || toks.some((t) => t.t === 'raw')) return line
  const p = new Parser(toks)
  const body = p.expr(0)
  return p.i === toks.length ? `${m[1]} (${body})` : line
}

/**
 * Macros que o `prepareShader` do milkdrop-preset-utils injeta no cabeçalho, já com parênteses
 * (`GetBlur1(uv)` expande para `a*b + c`, que cairia no mesmo bug).
 */
export function fixPreparedHeader(prepared: string): string {
  return prepared.replace(/^(\s*)(#define\s+\w+(?:\([^)]*\))?\s+.+)$/gm, (_all, ind: string, def: string) => ind + fixDefine(def))
}

/** Reescreve o HLSL de um shader do `.milk` com parênteses explícitos em toda operação binária. */
export function parenthesizeHlsl(src: string): string {
  if (!src.trim()) return src
  return new Parser(tokenize(src)).program()
}

/**
 * Pós-processamento do GLSL que sai do conversor (formato "não otimizado" do
 * milkdrop-preset-utils), para o Butterchurn 3 compilar:
 * - o corpo do shader vem numa função `main_shader_sentinel(uv)` chamada de dentro do
 *   `shader_body`; ali dentro, `rad`, `ang`, `uv_orig` e `hue_shader` (que o motor declara no
 *   próprio `main`) não existem. O corpo volta para dentro do `shader_body`, como na conversão
 *   oficial;
 * - texturas do usuário (`sampler2D sampler_x;`) precisam ser `uniform` (é também o que o motor
 *   procura para ligar as texturas).
 */
export function fixConvertedGlsl(glsl: string): string {
  let s = glsl.replace(/^(\s*)sampler2D\s+(\w+)\s*;/gm, '$1uniform sampler2D $2;')
  const sig = /vec4\s+main_shader_sentinel\s*\(\s*vec2\s+uv\s*\)\s*\{/.exec(s)
  const call = /shader_body\s*\{\s*vec4\s+result\s*=\s*main_shader_sentinel\s*\(\s*uv\s*\)\s*;\s*ret\s*=\s*result\.rgb\s*;\s*\}/.exec(s)
  if (!sig || !call) return s
  // Corpo da função: casar as chaves a partir da assinatura.
  let depth = 0
  let end = -1
  for (let k = sig.index + sig[0].length - 1; k < s.length; k++) {
    if (s[k] === '{') depth++
    else if (s[k] === '}' && --depth === 0) {
      end = k
      break
    }
  }
  if (end < 0) return s
  let body = s.slice(sig.index + sig[0].length, end)
  // `ret` já existe no main do motor; o retorno vira só o valor de `ret`.
  body = body.replace(/^\s*vec3\s+ret\s*;\s*$/m, '').replace(/return\s+vec4\s*\(\s*ret\s*,\s*1(?:\.0*)?\s*\)\s*;/g, '')
  const { header, inits } = hoistGlobalInits(s.slice(0, sig.index) + s.slice(end + 1, call.index))
  const after = s.slice(call.index + call[0].length)
  // No HLSL, `uv` e os `q` eram graváveis (parâmetro da função); no motor são entrada e uniform.
  // Cópias locais num bloco interno (em GLSL, `vec2 uv = uv;` lê o de fora). `ret` fica de fora.
  const copies = ['vec2 uv = uv;', 'vec4 texsize = texsize;', ...'abcdefgh'.split('').map((c) => `vec4 _q${c} = _q${c};`)].join(' ')
  s = `${header}shader_body {\n{ ${copies}\n${inits}${body}\n}\n}${after}`
  return s
}

/**
 * Variáveis globais com inicializador não constante (`float2 c = uv*2;` fora de função) não
 * compilam em GLSL. A declaração fica no cabeçalho e a atribuição vai para o começo do corpo.
 */
function hoistGlobalInits(header: string): { header: string; inits: string } {
  const lines = header.split('\n')
  const inits: string[] = []
  let depth = 0
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k]!
    if (depth === 0) {
      const m = /^(\s*)((?:const\s+)?(?:float|int|bool|[biu]?vec[234]|mat[234]))\s+(\w+)\s*=\s*(.+);\s*$/.exec(line)
      if (m && !/^\s*[-+]?[\d.]+\s*$/.test(m[4]!)) {
        lines[k] = `${m[1]}${m[2]!.replace(/^const\s+/, '')} ${m[3]};`
        inits.push(`${m[3]} = ${m[4]};`)
      }
    }
    for (const ch of line) {
      if (ch === '{') depth++
      else if (ch === '}') depth--
    }
  }
  return { header: lines.join('\n'), inits: inits.length ? inits.join('\n') + '\n' : '' }
}
