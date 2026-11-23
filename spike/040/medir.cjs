// Spike 040: roda spike/040/medir.html no Chromium headless e imprime os números.
// Precisa da raiz do repo servida em :8765 (python3 -m http.server 8765).
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader'] })
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log('erro:', e.message))
  await p.goto('http://localhost:8765/spike/040/medir.html')
  await p.waitForFunction('window.ready')
  for (const sr of [44100, 48000]) console.log(JSON.stringify(await p.evaluate((s) => window.zones(s), sr)))
  console.log('ms/quadro', JSON.stringify(await p.evaluate(() => window.cost())))
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
  console.log('ms/quadro, CPU 6x', JSON.stringify(await p.evaluate(() => window.cost())))
  await b.close()
})()
