import type { ExpressionProbe } from './expression'

/**
 * Ponte entre o gancho da Expressividade e o EQ da curva por frequência (spec 040): o EQ
 * desenha o espectro ao vivo do analisador próprio. `want` conta os EQs visíveis; com zero
 * e a curva plana, o analisador nem é lido.
 */
export const curveLive: { want: number; probe: ExpressionProbe | null } = { want: 0, probe: null }
