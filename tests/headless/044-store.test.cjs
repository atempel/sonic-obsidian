// Spec 044: versão da Microsoft Store (pacote MSIX). Com `store: true` no estado do atualizador
// (o main lê `process.windowsStore`), Configurações › Sobre › Atualizações mostra só a versão e
// "As atualizações vêm da Microsoft Store.", sem a chave nem "Verificar agora", e a busca rápida
// não oferece "Verificar atualizações". O pacote de verdade (instalar, captura em loopback) só no Windows.
const H = require('./harness.cjs')
const R = H.createResults('044-store')
const ok = R.ok

const mockUpdate = (store) => {
  const st = { phase: 'idle', version: null, percent: 0, lastCheckAt: null, portable: false, supported: !store, store }
  const calls = (window.__updCalls = [])
  window.so.update = {
    state: async () => ({ ...st }),
    configure: (auto) => calls.push(['configure', auto]),
    check: async () => { calls.push(['check']); return 'error' },
    install: async () => false,
    openRelease: async () => {},
    onState: () => () => {}
  }
}

async function open(b, port, store) {
  const page = await b.newPage({ viewport: { width: 1400, height: 860 } })
  R.attach(page)
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
  await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } } })
  await page.addInitScript(mockUpdate, store)
  await H.mockAudio(page)
  await page.goto(`http://localhost:${port}/`)
  await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
  return { page, errs }
}
const commands = async (page, q) => {
  await page.keyboard.press('/')
  await page.keyboard.type(q)
  await H.poll(page, () => document.querySelectorAll('.prow').length > 0 || !!document.querySelector('.palette'), { timeout: 5000 })
  await page.waitForTimeout(200)
  const c = await page.$$eval('.prow.cmd .r-title', (els) => els.map((e) => e.textContent))
  await page.keyboard.press('Escape')
  return c
}
const about = async (page) => {
  await page.keyboard.press('Control+,')
  await page.waitForSelector('.settings [data-sec="sobre"]', { state: 'attached', timeout: 15000 })
  await page.$eval('.settings [data-sec="sobre"]', (e) => e.click())
  await H.poll(page, () => [...document.querySelectorAll('.settings .grp h3')].some((h) => h.textContent === 'Atualizações'), { timeout: 10000 })
  return page.evaluate(() => {
    const grp = [...document.querySelectorAll('.settings .grp')].find((g) => g.querySelector('h3')?.textContent === 'Atualizações')
    return {
      text: grp?.textContent || '',
      auto: !!document.querySelector('#st-upd-auto'),
      store: document.querySelector('#st-upd-store')?.textContent || '',
      checkBtn: [...(grp?.querySelectorAll('button') || [])].some((b) => b.textContent.includes('Verificar agora'))
    }
  })
}

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5259)
  const b = await H.launch()
  try {
    // 1. Versão da Store.
    let { page, errs } = await open(b, 5259, true)
    const c1 = await commands(page, 'atualiz')
    ok('1a busca: sem "Verificar atualizações" na versão da Store', !c1.includes('Verificar atualizações'), JSON.stringify(c1))
    const a1 = await about(page)
    ok('1b Sobre › Atualizações: "As atualizações vêm da Microsoft Store."', a1.store === 'As atualizações vêm da Microsoft Store.', JSON.stringify(a1))
    ok('1c sem a chave de atualização automática', !a1.auto)
    ok('1d sem "Verificar agora"', !a1.checkBtn)
    ok('1e a versão instalada continua', /Sonic Obsidian · /.test(a1.text), a1.text)
    ok('1f nenhuma checagem pedida', !(await page.evaluate(() => window.__updCalls.some((c) => c[0] === 'check'))))
    ok('1g sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()

    // 2. Instalador (fora da Store): tudo como antes.
    ;({ page, errs } = await open(b, 5259, false))
    const c2 = await commands(page, 'atualiz')
    ok('2a busca: "Verificar atualizações" no instalador', c2.includes('Verificar atualizações'), JSON.stringify(c2))
    const a2 = await about(page)
    ok('2b chave e "Verificar agora" no instalador, sem o texto da Store', a2.auto && a2.checkBtn && !a2.store, JSON.stringify(a2))
    ok('2c sem erros na página', errs.length === 0, errs.join(' | '))
    await page.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
