// Teste headless da spec 027, fatia 4 (Estúdio: Comparar com o original e o "Comparar" da gaveta de versões).
// Uso: `npm run build` e `npm run test:ui` (ou `node tests/headless/027-estudio-comparar.test.cjs`).
// Vale para estados, o segundo motor ligando e desligando e o limite de fps (com `compareMinFps` do
// test-flags.json simulado). Se as duas prévias ficam lado a lado e iguais ao preset, só no Windows.
const H = require('./harness.cjs')
const path = require('path')
const srv = H.serve(5247)
const R = H.createResults('027-estudio-comparar'); const ok = R.ok

// window.so.presets.*Mine* em memória: cada salvamento vira uma versão.
function mineMock() {
  window.__vers = []
  Object.assign(window.so.presets, {
    listMine: async () => [],
    saveMine: async (d) => {
      const n = window.__vers.length + 1
      window.__vers.push({ n, savedAt: new Date().toISOString(), summary: n === 1 ? { kind: 'created' } : { kind: 'edit', vals: [], more: 0, blocks: ['per_frame'] }, preset: JSON.parse(JSON.stringify(d.preset)) })
      return { id: '1'.repeat(24), meta: { ...(d.meta || { title: 'Meu', author: 'Teste', basedOn: null }), createdAt: new Date().toISOString() } }
    },
    mineVersions: async () => window.__vers.map(({ n, savedAt, summary }) => ({ n, savedAt, summary })).reverse(),
    mineVersion: async (_id, n) => JSON.parse(JSON.stringify(window.__vers[n - 1].preset)),
    removeMine: async () => {}
  })
}

async function openPage(b, minFps) {
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } }); R.attach(page)
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await H.mockSo(page, { settings: { welcomeSeen: true, authorName: 'Teste', rotation: { enabled: false } }, testFlags: { compareMinFps: minFps } })
  await page.addInitScript(mineMock)
  // O Butterchurn desenha num OffscreenCanvas interno: guarda os contextos para simular a queda do segundo.
  await page.addInitScript(() => {
    window.__gls = []
    const get = OffscreenCanvas.prototype.getContext
    OffscreenCanvas.prototype.getContext = function (type, ...a) { const c = get.call(this, type, ...a); if (type === 'webgl2' && c) window.__gls.push(c); return c }
  })
  await H.mockAudio(page)
  await page.goto('http://localhost:5247/')
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  await page.waitForTimeout(1500)
  await page.keyboard.press('Control+Shift+d')
  await page.mouse.move(700, 400)
  await page.keyboard.press('e')
  await page.waitForSelector('.studio', { timeout: 15000 })
  await H.poll(page, () => /Compilado|Compiled/.test(document.querySelector('.cstat')?.textContent || ''), { timeout: 8000 })
  return { page, errs }
}

const toast = (page) => page.$eval('.gtoast', e => e.textContent).catch(() => '')
const hud = (page) => page.$eval('#hud', e => e.textContent)
const fpsOf = async (page) => Number((await hud(page)).match(/^(\d+) fps/)?.[1] ?? 0)
const turn = (page, on) => page.$eval('#studio-cmp', (e, on) => { if (e.checked !== on) e.click() }, on)
const cmpState = (page) => page.evaluate(() => ({
  checked: document.getElementById('studio-cmp')?.checked,
  split: !!document.querySelector('.st-stage.cmp'),
  canvases: document.querySelectorAll('.st-cmp-canvas').length,
  left: document.querySelector('.st-pane.orig .chip')?.textContent ?? null,
  right: document.querySelector('.st-pane.rmx .chip')?.textContent ?? null
}))

;(async () => {
  const b = await H.launch()

  // ── A. Liga, desliga, versão, queda do contexto (limite 0 = sem limite: o runner sem GPU fica em poucos fps) ──
  {
    const { page, errs } = await openPage(b, 0)
    await H.poll(page, () => /^\d+ fps/.test(document.getElementById('hud').textContent), { timeout: 15000 })
    const fpsAlone = await fpsOf(page)

    const s0 = await cmpState(page)
    ok('A1 switch "Comparar com o original" abaixo da prévia, desligado', s0.checked === false && !s0.split && s0.canvases === 0 && (await page.$eval('label[for=studio-cmp]', e => e.textContent.trim())) === 'Comparar com o original', JSON.stringify(s0))
    ok('A2 sem comparar: um painel só, com o selo "Seu remix"', s0.right === 'Seu remix' && !(await page.isVisible('.st-pane.orig')))
    const solo = await page.evaluate(() => {
      const r = document.querySelector('.st-pane.rmx').getBoundingClientRect(), m = document.getElementById('canvas').getBoundingClientRect()
      const chip = document.querySelector('.st-pane.rmx .chip').getBoundingClientRect()
      return { r: [r.left, r.top, r.right, r.bottom], m: [m.left, m.top, m.right, m.bottom], chip: [chip.left, chip.top], w: innerWidth, h: innerHeight }
    })
    const inside = (k, p) => k[0] >= p[0] - 1 && k[1] >= p[1] - 1 && k[2] <= p[2] + 1 && k[3] <= p[3] + 1
    ok('A2b quadro inteiro na prévia: o visual cabe no painel "Seu remix", com a proporção da janela (#143)', inside(solo.m, solo.r) && Math.abs((solo.m[2] - solo.m[0]) / (solo.m[3] - solo.m[1]) - solo.w / solo.h) < 0.02 && (solo.m[2] - solo.m[0]) < solo.w, JSON.stringify(solo))
    ok('A2c o selo "Seu remix" fica sobre o quadro', solo.chip[0] >= solo.m[0] && solo.chip[1] >= solo.m[1] - 1, JSON.stringify(solo))

    await turn(page, true)
    await page.waitForTimeout(300)
    const s1 = await cmpState(page)
    ok('A3 ligar divide a prévia em duas: Original à esquerda, Seu remix à direita', s1.checked && s1.split && s1.canvases === 1 && s1.left === 'Original' && s1.right === 'Seu remix', JSON.stringify(s1))
    const box = await page.evaluate(() => {
      const o = document.querySelector('.st-pane.orig').getBoundingClientRect(), r = document.querySelector('.st-pane.rmx').getBoundingClientRect()
      const c = document.querySelector('.st-cmp-canvas'), cr = c.getBoundingClientRect()
      const m = document.getElementById('canvas').getBoundingClientRect()
      return { ow: o.width, rw: r.width, o: [o.left, o.top, o.right, o.bottom], r: [r.left, r.top, r.right, r.bottom], c: [cr.left, cr.top, cr.right, cr.bottom], m: [m.left, m.top, m.right, m.bottom], w: innerWidth, h: innerHeight, glw: c.width }
    })
    // Quadro inteiro (#143): cada canvas cabe inteiro no seu painel, com a proporção da janela, e centrado.
    const fits = (k, p) => k[0] >= p[0] - 1 && k[1] >= p[1] - 1 && k[2] <= p[2] + 1 && k[3] <= p[3] + 1 &&
      Math.abs((k[2] - k[0]) / (k[3] - k[1]) - box.w / box.h) < 0.02 &&
      (Math.abs(k[0] - p[0]) <= 1 || Math.abs(k[1] - p[1]) <= 1) &&
      Math.abs((k[0] + k[2]) / 2 - (p[0] + p[2]) / 2) <= 1 && Math.abs((k[1] + k[3]) / 2 - (p[1] + p[3]) / 2) <= 1
    ok('A4 os dois painéis têm a mesma largura', Math.abs(box.ow - box.rw) <= 2, JSON.stringify(box))
    ok('A5 os dois quadros aparecem inteiros: o original no painel da esquerda e o remix no da direita (#143)', fits(box.c, box.o) && fits(box.m, box.r), JSON.stringify(box))
    ok('A6 o segundo motor desenha no tamanho da janela', box.glw >= Math.round(box.w * 0.5), String(box.glw))
    const hudOn = await H.poll(page, () => /studio: compare on · minimum 0 fps/.test(document.getElementById('hud').textContent), { timeout: 15000 })
    ok('A7 HUD mostra a comparação ligada e o mínimo de fps', hudOn, (await hud(page)).split('\n').filter(l => l.startsWith('studio')).join(' | '))
    ok('A8 log registra', await page.evaluate(() => window.__logs.some(l => /^studio: compare on \(minimum 0 fps\)$/.test(l))), JSON.stringify(await page.evaluate(() => window.__logs.filter(l => /compare/.test(l)))))
    await page.waitForTimeout(3000)
    const fpsBoth = await fpsOf(page)
    ok('A9 os dois motores seguem desenhando (fps > 0)', fpsBoth > 0, `sozinho ${fpsAlone} fps · com a comparação ${fpsBoth} fps`)
    await page.screenshot({ path: path.join(__dirname, '..', '..', 'test-results', '027-estudio-comparar.png') }).catch(() => {})

    await turn(page, false)
    await page.waitForTimeout(1500)
    const s2 = await cmpState(page)
    ok('A10 desligar volta a um painel e tira o segundo canvas', !s2.checked && !s2.split && s2.canvases === 0, JSON.stringify(s2))
    ok('A11 HUD sem a linha da comparação', !/studio: compare/.test(await hud(page)))

    // Versões: salvar três vezes e comparar com a primeira
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { document.activeElement?.blur(); document.querySelector('.studio').focus() })
      await page.keyboard.press('Control+s')
      await H.poll(page, (n) => window.__vers.length >= n, { timeout: 15000, arg: i + 1 })
    }
    await page.click('.st-ver')
    await page.waitForSelector('.st-vlist .ver', { timeout: 15000 })
    const btns = await page.$$eval('.st-vlist .ver', es => es.map(e => [...e.querySelectorAll('.ver-a .btn')].map(x => x.textContent.trim()).join('+')))
    ok('A12 cada versão tem Restaurar e Comparar', btns.length === 3 && btns.every(x => x === 'Restaurar+Comparar'), JSON.stringify(btns))
    await page.click('.st-vlist .ver:last-child .ver-a .btn-ghost')
    await H.poll(page, () => document.querySelectorAll('.st-cmp-canvas').length === 1, { timeout: 3000 })
    const s3 = await cmpState(page)
    ok('A13 "Comparar" de uma versão liga a prévia dividida com a hora dela à esquerda', s3.checked && s3.split && /^Versão de \d/.test(s3.left || ''), JSON.stringify(s3))
    ok('A14 toast "Comparando com a versão de …"', /Comparando com a versão de/.test(await toast(page)), await toast(page))
    ok('A15 log registra a versão comparada', await page.evaluate(() => window.__logs.includes('studio: comparing with version 1')))
    await page.click('.st-vlist .ver:first-child .ver-a .btn-ghost')
    await page.waitForTimeout(300)
    ok('A16 comparar outra versão reaproveita o segundo motor (um canvas só)', (await cmpState(page)).canvases === 1)
    await page.keyboard.press('Escape') // fecha a gaveta
    await page.waitForTimeout(300)

    // Queda do contexto WebGL do segundo motor: desliga e avisa, o Estúdio continua
    await page.evaluate(() => window.__gls[window.__gls.length - 1].getExtension('WEBGL_lose_context').loseContext())
    await H.poll(page, () => !document.getElementById('studio-cmp').checked, { timeout: 3000 })
    const s4 = await cmpState(page)
    ok('A17 contexto perdido: a comparação desliga sozinha', !s4.checked && !s4.split && s4.canvases === 0, JSON.stringify(s4))
    ok('A18 e avisa', /Não deu para mostrar a comparação/.test(await toast(page)), await toast(page))
    ok('A19 o Estúdio continua aberto e o app não recarregou', (await page.isVisible('.studio')) && (await page.evaluate(() => window.__logs.some(l => /compare turned off: WebGL context lost/.test(l)))))

    // Sair do Estúdio com a comparação ligada tira o segundo motor
    await turn(page, true)
    await page.waitForTimeout(300)
    await page.evaluate(() => { document.activeElement?.blur(); document.querySelector('.studio').focus() })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    if (await page.$('.studio')) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
    ok('A20 sair do Estúdio desliga a comparação', !(await page.$('.studio')) && (await page.$$('.st-cmp-canvas')).length === 0 && !/studio: compare/.test(await hud(page)))
    const full = await page.evaluate(() => { const m = document.getElementById('canvas').getBoundingClientRect(); return [m.left, m.top, m.width, m.height, innerWidth, innerHeight] })
    ok('A20b fora do Estúdio o visual volta à tela cheia (#143)', Math.abs(full[0]) <= 1 && Math.abs(full[1]) <= 1 && Math.abs(full[2] - full[4]) <= 1 && Math.abs(full[3] - full[5]) <= 1, JSON.stringify(full))
    ok('A21 sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()

    // ── B. Sem folga de GPU: recusa e avisa ──
    {
      const { page, errs } = await openPage(b, 1000)
      await H.poll(page, () => /^\d+ fps/.test(document.getElementById('hud').textContent), { timeout: 15000 })
      await turn(page, true)
      await page.waitForTimeout(300)
      const s = await cmpState(page)
      ok('B1 abaixo do mínimo, não liga', !s.checked && !s.split && s.canvases === 0, JSON.stringify(s))
      ok('B2 avisa com o fps medido', /Sem folga de GPU para comparar: o visual está a \d+ fps/.test(await toast(page)), await toast(page))
      ok('B3 log registra a recusa', await page.evaluate(() => window.__logs.some(l => /^studio: compare refused at \d+ fps \(minimum 1000\)$/.test(l))))
      ok('B4 sem erros na página', errs.length === 0, errs.join(' | '))
      await page.close()
    }

    // ── C. O fps cai com os dois motores: desliga sozinho e avisa ──
    // Sem GPU, o segundo motor pesa como o primeiro: o fps cai bem abaixo de 85 % do que era.
    // Abaixo de ~10 fps (runner muito lento), a medida de 1 s oscila demais para este teste.
    // O mínimo fica no meio entre o fps sozinho e o com a comparação: o runner do CI oscila (mediu 14 fps,
    // e 7 fps na hora de ligar, #133); com 85 % do sozinho a comparação era recusada em vez de ligar.
    const min = Math.max(2, Math.round((fpsAlone + fpsBoth) / 2))
    if (fpsAlone >= 10 && fpsBoth < min * 0.8) {
      const { page, errs } = await openPage(b, min)
      await H.poll(page, () => /^\d+ fps/.test(document.getElementById('hud').textContent), { timeout: 15000 })
      // Liga só com o fps desta página acima do mínimo (até 15 s de espera por isso).
      const ready = await H.poll(page, (m) => Number(document.getElementById('hud').textContent.match(/^(\d+) fps/)?.[1] ?? 0) >= m, { timeout: 15000, arg: min })
      if (!ready) console.log(`(C: o fps desta página não chegou ao mínimo ${min} em 15 s — tenta ligar mesmo assim)`)
      // A medida antes de ligar oscila: tenta ligar até 3 vezes.
      let on = false
      for (let i = 0; i < 3 && !on; i++) {
        await turn(page, true)
        await page.waitForTimeout(200)
        on = (await cmpState(page)).checked
        if (!on) await page.waitForTimeout(1500)
      }
      const dropped = on && (await H.poll(page, () => !document.getElementById('studio-cmp').checked, { timeout: 15000 }))
      ok('C1 com o fps abaixo do mínimo por 2 s, a comparação desliga sozinha', dropped, `mínimo ${min} · ligou ${on}`)
      ok('C2 e avisa com o fps', /Comparação desligada: o visual caiu para \d+ fps/.test(await toast(page)), await toast(page))
      ok('C3 log registra o motivo', await page.evaluate(() => window.__logs.some(l => /^studio: compare turned off: \d+ fps, below \d+$/.test(l))))
      ok('C4 sem erros na página', errs.length === 0, errs.join(' | '))
      await page.close()
    } else console.log(`(C pulado: sozinho ${fpsAlone} fps, com a comparação ${fpsBoth} fps — lento demais ou sem queda clara)`)
  }

  await b.close(); srv.close()
  process.exit(await R.finish())
})().catch(async (e) => { console.error(e); R.dump(); process.exit(1) })
