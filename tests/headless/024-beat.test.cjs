// Teste headless da spec 024 (troca no beat a cada N compassos + segurar). Uso: `npm run build` e
// depois `npm run test:ui` (ou `node tests/headless/024-beat.test.cjs`). Precisa do Chromium/Playwright do ambiente da nuvem.
// O getDisplayMedia simulado devolve um bumbo sintético a 124 BPM (buffer em loop: tempo exato),
// que pode virar música ambiente (sem ataques) ou silêncio por `window.__audio(modo)`.
// Vale para estados, interface e o algoritmo com áudio limpo; com música real, só no Windows.
const H = require('./harness.cjs')
const path = require('path'), os = require('os')
const srv = H.serve(5200)
const R = H.createResults('024-beat'); const ok = R.ok
const BPM = 124, BEAT_S = 60 / BPM
;(async () => {
  const b = await H.launch()
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, { saveSettings: true, settings: { welcomeSeen: true, rotation: { enabled: true, intervalSeconds: 30, onBeat: true, bars: 4 }, render: { meshWidth: 32, meshHeight: 24, pixelRatio: 1, textureRatio: 0.5, fxaa: false, canvasScale: 0.5, extraImages: false } } })
  await H.mockAudio(page, { bpm: BPM })
  // Trocas de preset com o tempo (performance.now) em que aconteceram.
  await page.addInitScript(() => {
    window.__changes = []
    new MutationObserver(() => {
      const t = document.querySelector('.now-title')?.getAttribute('title')
      if (t && t !== window.__changes.at(-1)?.name) window.__changes.push({ name: t, at: performance.now() })
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['title'] })
  })
  await page.goto('http://localhost:5200/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.keyboard.press('Control+Shift+KeyD')
  const hud = () => page.$eval('#hud', e => e.textContent)
  const rotText = () => page.$eval('.strip .rot', e => e.textContent)
  const bpmOf = (t) => { const m = /beat estável · ([\d.]+) BPM/.exec(t); return m ? Number(m[1]) : null }

  // 1. BPM a ±2 em até 8 s.
  const t0 = Date.now(); let bpm = null, at = 0
  while (Date.now() - t0 < 10000) { bpm = bpmOf(await hud()); if (bpm !== null) { at = Date.now() - t0; break } await page.waitForTimeout(250) }
  ok('1a trava a batida em até 8 s (+captura)', bpm !== null && at <= 9000, `${at} ms · ${(await hud()).split('\n').find(l => l.startsWith('beat'))}`)
  await page.waitForTimeout(2000)
  bpm = bpmOf(await hud())
  ok('1b BPM a ±2 de 124', bpm !== null && Math.abs(bpm - BPM) <= 2, `${bpm} — ${(await hud()).split('\n').find(l => l.startsWith('beat'))}`)
  // O headless roda a ~5 fps: cada quadro processa ~12× mais áudio que a 60 fps. Normaliza para 60 fps.
  const h7 = await hud(); const cost = Number(/detecção ([\d.]+) ms/.exec(h7)?.[1]); const fps = Number(/^(\d+) fps/.exec(h7)?.[1]) || 60
  ok('7a custo da detecção < 0,5 ms por quadro (normalizado a 60 fps)', cost * fps / 60 < 0.5, `${cost} ms a ${fps} fps → ${(cost * fps / 60).toFixed(3)} ms a 60 fps`)
  ok('2a ponto de beat visível', await page.isVisible('.strip .bdot'))
  // Travada a batida, os compassos valem a partir da troca seguinte (spec 024).
  const tb = Date.now(); while (Date.now() - tb < 35000 && !/\d c$/.test((await rotText()).trim())) await page.waitForTimeout(250)
  ok('2b depois da troca seguinte, a faixa mostra compassos ("N c")', /\d c$/.test((await rotText()).trim()), `${await rotText()} em ${Date.now() - tb} ms`)
  ok('log: "beat: estável a … BPM"', (await page.evaluate(() => window.__logs)).some(l => /^beat: estável a 12[2-6] BPM$/.test(l)), JSON.stringify(await page.evaluate(() => window.__logs.filter(l => l.startsWith('beat')))))

  // 1c/2. Trocas automáticas em 4 compassos = 16 batidas ≈ 7,74 s, na batida.
  await page.evaluate(() => { window.__changes = [] })
  await page.waitForTimeout(19000)
  const ch = await page.evaluate(() => window.__changes)
  const gaps = ch.slice(1).map((c, i) => (c.at - ch[i].at) / 1000)
  ok('1c trocas a cada 4 compassos (16 × 60/124 ≈ 7,74 s)', gaps.length >= 1 && gaps.every(g => Math.abs(g - 16 * BEAT_S) < 0.5), JSON.stringify({ n: ch.length, gaps: gaps.map(g => g.toFixed(2)) }))

  // 4. Troca manual espera a batida, botão tracejado.
  await page.mouse.move(640, 400)
  const before = await page.$eval('.now-title', e => e.getAttribute('title'))
  const r4 = await page.evaluate(() => new Promise((res) => {
    const t = performance.now(); let dashed = false
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }))
    const id = setInterval(() => {
      if (document.querySelector('button[aria-label="Próximo preset"].wait')) dashed = true
      const n = window.__changes.at(-1)
      if (n && n.at > t) { clearInterval(id); res({ wait: n.at - t, dashed }) }
      if (performance.now() - t > 3000) { clearInterval(id); res({ wait: -1, dashed }) }
    }, 5)
  }))
  // A troca sai no primeiro quadro depois da batida: no headless (~5 fps) isso soma até ~1 quadro.
  const fps4 = Number(/^(\d+) fps/.exec(await hud())?.[1]) || 60
  ok('4a → espera a batida (≤ 1 batida + 1 quadro) e troca', r4.wait >= 0 && r4.wait <= BEAT_S * 1000 + 1000 / fps4 + 80, `${r4.wait.toFixed?.(0)} ms a ${fps4} fps`)
  ok('4b botão tracejado durante a espera', r4.dashed)
  ok('4c sem tracejado depois', !(await page.isVisible('.strip .ibtn.wait')))
  void before

  // 5. Enter segura.
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('5a faixa mostra "Segurado"', (await rotText()).includes('Segurado'), await rotText())
  // O toast pode aparecer depois do primeiro quadro lento do headless: espera até 2 s em vez de ler uma vez.
  ok('5b toast de segurado', await page.waitForFunction(() => document.body.innerText.includes('Visual segurado'), null, { timeout: 2000 }).then(() => true, () => false))
  await page.evaluate(() => { window.__changes = [] })
  await page.waitForTimeout(9500)
  ok('5c segurado: nenhuma troca automática em > 4 compassos', (await page.evaluate(() => window.__changes.length)) === 0)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800)
  ok('5d → ainda troca segurado', (await page.evaluate(() => window.__changes.length)) === 1)
  ok('5e continua segurado', (await rotText()).includes('Segurado'))
  await page.keyboard.press('KeyR'); await page.waitForTimeout(200); await page.keyboard.press('KeyR'); await page.waitForTimeout(200)
  ok('5f R não solta (só liga/desliga a rotação)', (await rotText()).includes('Segurado'))
  await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  ok('5g Enter de novo solta e a contagem recomeça', !(await rotText()).includes('Segurado') && /(4|3) c$/.test((await rotText()).trim()), await rotText())

  // 6. Enter num botão aciona o botão.
  await page.mouse.move(640, 700)
  await page.focus('button[aria-label="Atalhos"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400)
  const panel = await page.evaluate(() => document.body.innerText)
  ok('6a Enter no botão abre o painel e não segura', panel.includes('Segurar visual') && !(await rotText()).includes('Segurado'))
  await page.keyboard.press('Escape'); await page.waitForTimeout(200)

  // 8. Configurações salvas.
  const last = await page.evaluate(() => window.__saves.at(-1))
  ok('8a settings salvos com onBeat e bars, sem "held"', last?.rotation?.onBeat === true && last.rotation.bars === 4 && !('held' in last), JSON.stringify(last?.rotation))
  await page.keyboard.press('Comma'); await page.waitForTimeout(400)
  ok('8b Ajustes rápidos: switch habilitado e ligado', await page.$eval('#beatSwitch', e => !e.disabled && e.checked))
  const opts = await page.$$eval('#interval option', es => es.map(e => e.textContent))
  ok('8c "Trocar a cada" lista compassos', JSON.stringify(opts) === JSON.stringify(['4 compassos', '8 compassos', '16 compassos', '32 compassos']), JSON.stringify(opts))
  await page.screenshot({ path: path.join(os.tmpdir(), '024-quick.png') })
  await page.selectOption('#interval', '8'); await page.waitForTimeout(300)
  ok('8d escolher 8 compassos salva', (await page.evaluate(() => window.__saves.at(-1).rotation.bars)) === 8)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  await page.keyboard.press('Control+Comma'); await page.waitForTimeout(500)
  ok('8e Configurações: "Trocar no beat" habilitado', await page.$eval('#st-beat', e => !e.disabled && e.checked))
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)

  // 2c. Em 8 compassos, metade da frequência.
  await page.evaluate(() => { window.__changes = [] })
  await page.waitForTimeout(33000)
  const ch8 = await page.evaluate(() => window.__changes)
  const gaps8 = ch8.slice(1).map((c, i) => (c.at - ch8[i].at) / 1000)
  ok('2c em 8 compassos, ≈ 15,5 s entre trocas', ch8.length >= 2 && gaps8.every(g => Math.abs(g - 32 * BEAT_S) < 0.6), JSON.stringify({ n: ch8.length, gaps: gaps8.map(g => g.toFixed(2)) }))

  // 3. Ambiente: o ponto some em até 4 s e volta aos segundos; → troca na hora.
  const tAmb = await page.evaluate(() => { window.__audio('ambient'); return performance.now() })
  const ta = Date.now(); let gone = -1
  while (Date.now() - ta < 8000) { if (!(await page.isVisible('.strip .bdot'))) { gone = Date.now() - ta; break } await page.waitForTimeout(200) }
  const lostAt = await page.evaluate((t) => (window.__logT.find(([at, m]) => at > t && m.startsWith('beat: perdido')) || [NaN])[0] - t, tAmb)
  ok('3a ambiente: ponto some em até 4 s', gone >= 0 && gone <= 4200, `${gone} ms na faixa · ${lostAt.toFixed(0)} ms até o log "perdido"`)
  await page.waitForTimeout(500)
  ok('3b volta a contar em segundos (m:ss)', /\d:\d\d$/.test((await rotText()).trim()), await rotText())
  ok('3c log: "beat: perdido, voltando a segundos"', (await page.evaluate(() => window.__logs)).includes('beat: perdido, voltando a segundos'))
  await page.waitForTimeout(6000)
  ok('3d ambiente não volta a travar (6 s)', !(await page.isVisible('.strip .bdot')) && bpmOf(await hud()) === null, (await hud()).split('\n').find(l => l.startsWith('beat')))
  const r3 = await page.evaluate(() => new Promise((res) => {
    const t = performance.now()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }))
    const id = setInterval(() => { const n = window.__changes.at(-1); if (n && n.at >= t) { clearInterval(id); res(n.at - t) } if (performance.now() - t > 2000) { clearInterval(id); res(-1) } }, 2)
  }))
  ok('3e sem batida, → troca na hora (< 300 ms no headless lento)', r3 >= 0 && r3 < 300, `${r3.toFixed?.(0)} ms`)
  // silêncio também perde a batida
  await page.evaluate(() => window.__audio('beat')); await page.waitForTimeout(6000)
  ok('3f a batida volta', await page.isVisible('.strip .bdot'))
  const logs = await page.evaluate(() => window.__logs.filter(l => l.startsWith('beat')))
  ok('7b log só com mudanças de estado', logs.length <= 4, JSON.stringify(logs))
  await page.screenshot({ path: path.join(os.tmpdir(), '024-strip.png') })
  ok('sem erros na página', errs.filter(e => !/getDisplayMedia|AudioContext/.test(e)).length === 0, JSON.stringify(errs.slice(0, 5)))
  const code = await R.finish()
  await b.close(); srv.close(); process.exit(code)
})().catch(e => { R.dump(); console.error(e); process.exit(1) })
