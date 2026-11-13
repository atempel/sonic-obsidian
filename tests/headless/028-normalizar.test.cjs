// Normalizar áudio (spec 028, P1), interface: Ajustes rápidos, Configurações › Captura, comando, HUD e
// log, no Chromium headless com o bumbo simulado. A conta do ganho fica no 028-agc-sim; o nível real
// (critério 7) só se mede no Windows.
const H = require('./harness.cjs')
const R = H.createResults('028-normalizar')
const ok = R.ok

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5229)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false }, gainDefaultDb: 10 }, saveSettings: true })
    await H.mockAudio(page)
    await page.goto('http://localhost:5229/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    ok('log da abertura diz "normalizar áudio desligado"', (await page.evaluate(() => window.__logs)).some((l) => /normalizar áudio desligado/.test(l)))

    await page.keyboard.press(',')
    await page.waitForSelector('#autoGain', { state: 'attached', timeout: 5000 })
    const g0 = await page.evaluate(() => { const g = document.querySelector('#gain'); return { checked: document.querySelector('#autoGain').checked, max: g.max, value: g.value } })
    ok('desligado por padrão; Ganho vai a +12 e abre no padrão (+10)', !g0.checked && g0.max === '12' && g0.value === '10', JSON.stringify(g0))

    await page.$eval('#autoGain', (e) => e.click())
    await page.waitForTimeout(300)
    const g1 = await page.evaluate(() => {
      const g = document.querySelector('#gain')
      return { checked: document.querySelector('#autoGain').checked, min: g.min, max: g.max, value: g.value, label: document.querySelector('label[for="gain"]')?.textContent || '', readout: document.querySelector('#autoGainLbl .autodb')?.textContent || '' }
    })
    ok('ligado: o Ganho vira "Ajuste fino" de −6 a +6, e o +10 cai para +6', g1.checked && g1.min === '-6' && g1.max === '6' && g1.value === '6' && /Ajuste fino/.test(g1.label), JSON.stringify(g1))
    ok('ligado: mostra o ganho aplicado em mono ("auto … dB")', /^auto [+−]?\d+ dB$/.test(g1.readout), g1.readout)
    const saved = await page.evaluate(() => window.__saves.at(-1))
    ok('salva autoGain e o ganho limitado', saved && saved.autoGain === true && saved.gainDb === 6, saved && JSON.stringify({ autoGain: saved.autoGain, gainDb: saved.gainDb }))

    // Arrastar o ajuste fino além de ±6 pelo comando não passa do limite.
    await page.$eval('#gain', (e) => { e.value = '-6'; e.dispatchEvent(new Event('input', { bubbles: true })) })
    await page.waitForTimeout(200)
    ok('ajuste fino aceita −6', (await page.evaluate(() => window.__saves.at(-1).gainDb)) === -6)

    // O AGC mede o bumbo e mexe: HUD com manual + auto e o nível medido.
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+Shift+D')
    const hudOk = await H.poll(page, () => /ganho em vigor [+−\-]?[\d.]+ dB \(manual -6\.0 \+ auto [+−\-]?[\d.]+, nível medido -[\d.]+ dBFS\)/.test(document.querySelector('#hud').textContent), { timeout: 10000 })
    const hud = await page.$eval('#hud', (e) => (e.textContent.match(/ganho em vigor[^\n]*/) || [''])[0])
    ok('HUD: ganho em vigor = manual + auto, com o nível medido', hudOk, hud)
    const auto = Number((hud.match(/auto ([+\-]?[\d.]+)/) || [])[1])
    ok('o bumbo simulado move o ganho automático (≠ 0)', Number.isFinite(auto) && Math.abs(auto) >= 0.1, String(auto))

    // Silêncio congela: o ganho não anda em 4 s sem som.
    await page.evaluate(() => window.__audio('silence'))
    await page.waitForTimeout(800)
    const read = () => page.$eval('#hud', (e) => Number(((e.textContent.match(/auto ([+\-]?[\d.]+)/) || [])[1])))
    const s0 = await read(); await page.waitForTimeout(4000); const s1 = await read()
    ok('silêncio: o ganho automático congela', Math.abs(s1 - s0) < 0.15, `${s0} → ${s1}`)
    await page.evaluate(() => window.__audio('beat'))

    // Configurações › Captura: a mesma chave, ligada; desligar volta ao ganho manual puro.
    await page.keyboard.press('Control+Comma'); await page.waitForTimeout(500)
    await page.click('[data-sec="captura"]'); await page.waitForTimeout(300)
    ok('Configurações › Captura tem "Normalizar áudio" ligado, com o valor auto', await page.$eval('#st-autogain', (e) => e.checked) && /auto/.test(await page.$eval('.settings .ctl .autodb', (e) => e.textContent)))
    await page.$eval('#st-autogain', (e) => e.click())
    await page.waitForTimeout(300)
    ok('desligar pelas Configurações salva autoGain false', (await page.evaluate(() => window.__saves.at(-1).autoGain)) === false)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    const off = await H.poll(page, () => /ganho em vigor -6\.0 dB \(manual\)/.test(document.querySelector('#hud').textContent), { timeout: 4000 })
    ok('desligado: HUD volta ao ganho manual puro', off, await page.$eval('#hud', (e) => (e.textContent.match(/ganho em vigor[^\n]*/) || [''])[0]))

    // Shift+X chega à Memória Viva (4ª opção).
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+X')
    ok('Shift+X: 4ª opção é a Memória Viva', /Memória viva/i.test(await page.$eval('.gtoast', (e) => e.textContent)), await page.$eval('.gtoast', (e) => e.textContent))
    ok('sem erros na página', errs.length === 0, errs.join(' '))
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { R.dump(); console.error(e); process.exit(1) })
