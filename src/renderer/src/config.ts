/**
 * Valores ajustáveis do visual num só lugar. Ainda sem UI: os ajustes rápidos
 * e as Configurações da Fase 2 (interface v3) vão ler e gravar daqui.
 */
export const config = {
  /** Blend da troca manual (←, →, Espaço). 0 = corte seco. */
  blendManualSeconds: 0,
  /** Blend da troca automática (rotação). */
  blendAutoSeconds: 2.7,
  /** Limite de quadros: 'monitor' segue a taxa da tela; número = fps máximo. */
  fpsLimit: 'monitor' as 'monitor' | number,
  /** Ganho de entrada (dB) aplicado antes do Butterchurn; não muda o que se ouve. */
  gainDb: 0,
  gainMinDb: -12,
  gainMaxDb: 24,
  gainStepDb: 1.5
}
