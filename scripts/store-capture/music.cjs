// Faixa sintetizada para as capturas da Store: gerada aqui, sem direitos de terceiros.
// 124 BPM, 16 compassos em loop: subida (0–3), drop (4–11), respiro (12–13), virada (14–15).
// Roda como init script na página: troca o getDisplayMedia por um stream com esta faixa e expõe
// window.__energy() (RMS dos graves, 0–1), window.__songPos() ({ bar, beat, sinceKick, section })
// e window.__seek(bar) (recomeça a faixa no compasso pedido).
module.exports = function musicInit() {
  const BPM = 124
  navigator.mediaDevices.getDisplayMedia = async () => {
    const ac = new AudioContext(); const sr = ac.sampleRate
    const beat = 60 / BPM, bar = beat * 4, bars = 16, len = Math.round(bar * bars * sr)
    const L = new Float32Array(len)
    const add = (t0, dur, fn) => { const s = Math.round(t0 * sr), n = Math.round(dur * sr); for (let i = 0; i < n && s + i < len; i++) L[s + i] += fn(i / sr) }
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1 }
    const chords = [[110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8]] // Am F C G
    const section = (b) => b < 4 ? 'build' : b < 12 ? 'drop' : b < 14 ? 'break' : 'riser'
    for (let b = 0; b < bars; b++) {
      const sec = section(b), ch = chords[b % 4], t = b * bar
      // Pad sempre, mais alto no respiro.
      const padAmp = sec === 'break' ? 0.12 : 0.06
      add(t, bar, (x) => padAmp * Math.min(1, x * 4) * ch.reduce((s, f) => s + Math.sin(2 * Math.PI * f * 2 * x) + 0.5 * Math.sin(2 * Math.PI * f * 2.005 * x), 0) / 3)
      for (let q = 0; q < 4; q++) {
        const tb = t + q * beat
        if (sec === 'drop' || (sec === 'build' && b >= 2) || sec === 'riser') // bumbo
          add(tb, 0.35, (x) => 0.9 * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-x * 35)) * x) * Math.exp(-x * 9))
        if ((sec === 'drop') && (q === 1 || q === 3)) // caixa
          add(tb, 0.2, (x) => (0.35 * rnd() + 0.25 * Math.sin(2 * Math.PI * 190 * x)) * Math.exp(-x * 22))
        if (sec !== 'break') for (const h of [0.5]) add(tb + h * beat, 0.05, (x) => 0.12 * rnd() * Math.exp(-x * 90)) // chimbal
        if (sec === 'drop') add(tb + beat / 2, beat / 2, (x) => 0.35 * Math.tanh(3 * Math.sin(2 * Math.PI * ch[0] / 2 * x)) * Math.exp(-x * 5)) // baixo
        if (sec === 'drop' || sec === 'break') for (let s = 0; s < 4; s++) { // arpejo
          const f = ch[(q * 4 + s) % 3] * 4; add(tb + s * beat / 4, beat / 4, (x) => 0.07 * Math.sign(Math.sin(2 * Math.PI * f * x)) * Math.exp(-x * 14))
        }
      }
      if (sec === 'riser') { // rufo + ruído subindo
        for (let s = 0; s < 16; s++) add(t + s * beat / 4, 0.08, (x) => 0.2 * (b - 13) / 2 * rnd() * Math.exp(-x * 40))
        add(t, bar, (x) => 0.1 * ((b - 14) + x / bar) / 2 * rnd())
      }
    }
    for (let i = 0; i < len; i++) L[i] = Math.tanh(L[i] * 1.1) * 0.9
    const buf = ac.createBuffer(1, len, sr); buf.copyToChannel(L, 0)
    const dest = ac.createMediaStreamDestination(); const an = ac.createAnalyser(); an.fftSize = 2048
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200; lp.connect(an)
    let src = null, startAt = 0, offset = 0
    window.__seek = (b) => {
      if (src) { src.stop(); src.disconnect() }
      src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(dest); src.connect(lp)
      offset = (b || 0) * bar; startAt = ac.currentTime; src.start(0, offset)
    }
    window.__seek(0)
    const data = new Float32Array(an.fftSize)
    window.__energy = () => { an.getFloatTimeDomainData(data); let s = 0; for (const v of data) s += v * v; return Math.min(1, Math.sqrt(s / data.length) * 2) }
    window.__songPos = () => {
      const p = (offset + ac.currentTime - startAt) % (bar * bars); const b = Math.floor(p / bar)
      return { bar: b, beat: Math.floor((p % bar) / beat), sinceKick: (p % beat) * 1000, section: section(b) }
    }
    const s = dest.stream; const c = document.createElement('canvas'); s.addTrack(c.captureStream(1).getVideoTracks()[0]); return s
  }
}
