// Feedback e bugs (spec 031): menu dos Ajustes rápidos, painel "Relatar um problema" (URL conferida
// no openLink simulado), Discussions, "Copiar diagnóstico" (log:tail simulado), Configurações › Sobre ›
// Feedback e os comandos da busca rápida. Também as funções puras do main (src/main/feedback.ts,
// transpilada aqui). Os valores reais da máquina e o navegador abrindo só se veem no Windows.
const H = require('./harness.cjs')
const R = H.createResults('031-feedback')
const ok = R.ok
const fs = require('fs'), path = require('path'), ts = require('typescript')

// ── Main: Windows pelo build, pasta do usuário trocada por ~, últimas linhas ──
function loadMain() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'main', 'feedback.ts'), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (m) => (m === './log' ? { logPath: () => '' } : require(m))
  new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
  return mod.exports
}
const M = loadMain()
ok('main: build 22631 = Windows 11', M.osText('win32', '10.0.22631') === 'Windows 11 (build 22631)', M.osText('win32', '10.0.22631'))
ok('main: build 19045 = Windows 10', M.osText('win32', '10.0.19045') === 'Windows 10 (build 19045)', M.osText('win32', '10.0.19045'))
ok('main: build 22000 = Windows 11', M.osText('win32', '10.0.22000').startsWith('Windows 11'))
const homeTxt = 'x C:\\Users\\Ana Maria\\AppData\\Roaming\\Sonic Obsidian\\logs y\nz c:/users/ana maria/Music/a.milk'
const hidden = M.hideHome(homeTxt, 'C:\\Users\\Ana Maria')
ok('main: a pasta do usuário vira ~ (\\ ou /, sem diferença de maiúsculas)', !/Ana Maria/i.test(hidden) && hidden.includes('~\\AppData') && hidden.includes('~/Music'), hidden)
const many = Array.from({ length: 300 }, (_, i) => `line ${i}`).join('\n') + '\n'
const tail = M.tailLines(many)
ok('main: últimas 200 linhas', tail.split('\n').length === 200 && tail.startsWith('line 100') && tail.endsWith('line 299'))
const big = M.tailLines(Array.from({ length: 200 }, () => 'x'.repeat(1000)).join('\n'))
ok('main: cabe no limite do copyText (64 KB), cortando pelo começo', big.length <= M.COPY_MAX && big.split('\n').length === 63, String(big.length))

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: só o main'); process.exit(await R.finish()) }
  const srv = H.serve(5241)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1400, height: 860 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, rotation: { enabled: false } } })
    // O que o main e o sistema devolvem (spec 031).
    await page.addInitScript(() => {
      window.__links = []
      window.__tail = '2026-11-19T00:00:00.000Z [main] start ~\\AppData\\Roaming\\Sonic Obsidian\n2026-11-19T00:00:01.000Z [renderer] first frame'
      window.so.system.openLink = async (u) => { window.__links.push(u) }
      window.so.system.osInfo = async () => 'Windows 11 (build 22631)'
      window.so.logTail = async () => window.__tail
      const md = navigator.mediaDevices
      md.enumerateDevices = async () => [
        { kind: 'audiooutput', deviceId: 'default', label: 'Padrão - Alto-falantes (Realtek(R) Audio)', groupId: 'g' },
        { kind: 'audiooutput', deviceId: 'abc', label: 'Fones USB', groupId: 'h' }
      ]
    })
    await H.mockAudio(page)
    await page.goto('http://localhost:5241/')
    await page.waitForSelector('.now-title[title]:not([title=""])', { timeout: 30000 })
    await page.waitForTimeout(800)
    await page.mouse.move(700, 400)

    const toast = () => page.evaluate(() => document.querySelector('.gtoast')?.textContent || '')
    const links = () => page.evaluate(() => window.__links.slice())
    const menuOpen = () => page.evaluate(() => !document.querySelector('#fbMenu').hidden)
    const dlgOpen = () => page.evaluate(() => !document.querySelector('.fb-dialog').hidden && document.body.classList.contains('fb-open'))
    const focusId = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.dataset?.fb || document.activeElement?.className || '')
    const openMenu = async () => { await page.$eval('#fbBtn', (e) => e.click()); await page.waitForTimeout(150) }
    const pick = async (k) => { await page.$eval(`#fbMenu [data-fb="${k}"]`, (e) => e.click()); await page.waitForTimeout(250) }

    // 1. Botão dos Ajustes rápidos e o menu.
    await page.keyboard.press(','); await page.waitForTimeout(500)
    const btn = await page.evaluate(() => {
      const b = document.querySelector('.sheet header #fbBtn')
      return b && { label: b.getAttribute('aria-label'), pop: b.getAttribute('aria-haspopup'), nextIsClose: b.parentElement.lastElementChild?.getAttribute('aria-label') }
    })
    ok('1a botão "Feedback e bugs" no cabeçalho dos Ajustes, antes do fechar', !!btn && btn.label === 'Feedback e bugs' && btn.pop === 'menu' && /Fechar/.test(btn.nextIsClose || ''), JSON.stringify(btn))
    // Os Ajustes entram deslizando (transform na .sheet). Enquanto o transform não é `none`, o menu
    // (position: fixed dentro dela) se posiciona pela .sheet e não pela janela: num runner lento os
    // 500 ms acima não bastam. Abre o menu só com a folha parada.
    await H.poll(page, () => getComputedStyle(document.querySelector('.sheet')).transform === 'none', { timeout: 5000, every: 100 })
    await openMenu()
    const items = await page.$$eval('#fbMenu [role=menuitem]', (els) => els.map((e) => e.textContent.trim()))
    ok('1b menu com as quatro ações', items.join('|') === 'Relatar um problema|Sugerir uma ideia|Fazer uma pergunta|Copiar diagnóstico', items.join('|'))
    const box = await page.$eval('#fbMenu', (e) => { const r = e.getBoundingClientRect(); return { w: r.width, right: r.right, vw: innerWidth } })
    ok('1c menu de 224 px dentro da janela', Math.round(box.w) === 224 && box.right <= box.vw - 7, JSON.stringify(box))
    ok('1d foco no primeiro item; setas andam', (await focusId()) === 'bug' && (await (async () => { await page.keyboard.press('ArrowDown'); return focusId() })()) === 'idea')
    await page.keyboard.press('Escape'); await page.waitForTimeout(150)
    ok('1e Esc fecha o menu e devolve o foco ao botão (os Ajustes ficam)', !(await menuOpen()) && (await focusId()) === 'fbBtn' && await page.evaluate(() => document.body.classList.contains('sheet-open')))

    // 2. Painel "Relatar um problema".
    await openMenu(); await pick('bug')
    await page.waitForFunction(() => document.querySelector('.fb-list li[data-key="version"] .fb-v')?.textContent !== '…', null, { timeout: 5000 }).catch(() => {})
    const current = await page.evaluate(() => document.querySelector('.now-title')?.getAttribute('title') || '')
    const d = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('.fb-list li')].map((li) => [li.dataset.key, li.querySelector('.fb-k').textContent, li.querySelector('.fb-v').textContent, li.querySelector('input').checked]),
      focus: document.activeElement?.textContent?.trim(),
      w: Math.round(document.querySelector('.fb-dialog').getBoundingClientRect().width),
      texts: [...document.querySelectorAll('.fb-dialog p')].map((p) => p.textContent)
    }))
    ok('2a painel aberto (modal, 440 px) com foco em "Abrir no GitHub"', (await dlgOpen()) && d.focus === 'Abrir no GitHub' && d.w === 440, JSON.stringify([d.focus, d.w]))
    const val = (k) => (d.rows.find((r) => r[0] === k) || [])[2]
    ok('2b os cinco itens preenchidos', d.rows.length === 5 && val('version') === 'v0.5.0' && val('windows') === 'Windows 11 (build 22631)' && !!val('gpu') && val('gpu') !== 'Não identificada' && val('audio') === 'Alto-falantes (Realtek(R) Audio)' && !!current && current.includes(val('preset')) && d.rows.every((r) => r[3]), JSON.stringify(d.rows) + ' ' + current)
    ok('2c avisos do log e da conta', d.texts.some((t) => /O log não vai junto/.test(t)) && d.texts.some((t) => /conta no GitHub/.test(t)), JSON.stringify(d.texts))
    // Desliga a GPU: riscado e fora da URL.
    await page.$eval('.fb-list li[data-key="gpu"] input', (e) => e.click()); await page.waitForTimeout(100)
    const gpuOff = await page.evaluate(() => { const li = document.querySelector('.fb-list li[data-key="gpu"]'); return li.classList.contains('off') && getComputedStyle(li.querySelector('.fb-v')).textDecorationLine.includes('line-through') })
    ok('2d desligar um switch risca o item', gpuOff)
    await page.$eval('.fb-dialog .btn-primary', (e) => e.click()); await page.waitForTimeout(300)
    const u = (await links()).pop() || ''
    const q = new URL(u).searchParams
    ok('2e abre o formulário de bug com os valores codificados', u.startsWith('https://github.com/atempel/sonic-obsidian/issues/new?template=bug_report.yml&') && q.get('version') === 'v0.5.0' && q.get('system') === 'Windows 11 (build 22631)' && q.get('audio') === 'Alto-falantes (Realtek(R) Audio)' && q.get('preset') === val('preset') && !u.includes(' '), u)
    ok('2f a GPU desligada ficou fora da URL', !u.includes(encodeURIComponent(val('gpu'))) && !(q.get('system') || '').includes(val('gpu')), u)
    ok('2g fecha o painel e mostra o toast', !(await dlgOpen()) && /Abrimos o GitHub no navegador/.test(await toast()), await toast())
    // Esc no painel = Cancelar, foco de volta ao botão.
    await page.keyboard.press(','); await page.waitForTimeout(400)
    if (!(await page.evaluate(() => document.body.classList.contains('sheet-open')))) { await page.keyboard.press(','); await page.waitForTimeout(400) }
    await openMenu(); await pick('bug')
    const n0 = (await links()).length
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    ok('2h Esc cancela (nada aberto) e devolve o foco ao botão; os Ajustes ficam', !(await dlgOpen()) && (await links()).length === n0 && (await focusId()) === 'fbBtn' && await page.evaluate(() => document.body.classList.contains('sheet-open')), await focusId())
    // Sem GPU identificada: "Não identificada" e switch desligado.
    await page.evaluate(() => { const orig = HTMLCanvasElement.prototype.getContext; window.__origGetContext = orig; HTMLCanvasElement.prototype.getContext = function (k, o) { return k === 'webgl' ? null : orig.call(this, k, o) } })
    await openMenu(); await pick('bug')
    // Num runner lento o painel ainda mostra os dados da abertura anterior por alguns quadros:
    // espera a coleta nova (até 5 s) antes de ler.
    await H.poll(page, () => document.querySelector('.fb-list li[data-key="gpu"] .fb-v')?.textContent === 'Não identificada', { timeout: 5000, every: 100 })
    const noGpu = await page.evaluate(() => { const li = document.querySelector('.fb-list li[data-key="gpu"]'); return [li.querySelector('.fb-v').textContent, li.querySelector('input').checked, li.querySelector('input').disabled] })
    await page.$eval('.fb-dialog .btn-primary', (e) => e.click()); await page.waitForTimeout(200)
    await page.evaluate(() => { HTMLCanvasElement.prototype.getContext = window.__origGetContext })
    const u2 = (await links()).pop() || ''
    ok('2i GPU vazia: "Não identificada", switch desligado e só o Windows em system', noGpu[0] === 'Não identificada' && noGpu[1] === false && noGpu[2] === true && new URL(u2).searchParams.get('system') === 'Windows 11 (build 22631)', JSON.stringify(noGpu) + ' ' + u2)

    // 3. Ideia e pergunta.
    if (!(await page.evaluate(() => document.body.classList.contains('sheet-open')))) { await page.keyboard.press(','); await page.waitForTimeout(400) }
    await openMenu(); await pick('idea')
    ok('3a "Sugerir uma ideia" abre Discussions › Ideas, com o toast', (await links()).pop() === 'https://github.com/atempel/sonic-obsidian/discussions/new?category=ideas' && /Abrimos o GitHub/.test(await toast()))
    await openMenu(); await pick('ask')
    ok('3b "Fazer uma pergunta" abre Discussions › Q&A', (await links()).pop() === 'https://github.com/atempel/sonic-obsidian/discussions/new?category=q-a')

    // 4. Copiar diagnóstico.
    await openMenu(); await pick('diag')
    const copied = await page.evaluate(() => window.__copied.slice(-1)[0])
    const check = await page.evaluate(() => !!document.querySelector('#fbMenu [data-fb="diag"] path[d="M20 6 9 17l-5-5"]'))
    ok('4a copia o texto do log:tail, com o ícone check e o toast', copied === (await page.evaluate(() => window.__tail)) && check && /Diagnóstico copiado: últimas 200 linhas do log/.test(await toast()), JSON.stringify([check, await toast()]))
    await page.waitForTimeout(1700)
    ok('4b o ícone volta depois de 1,5 s', !(await page.evaluate(() => !!document.querySelector('#fbMenu [data-fb="diag"] path[d="M20 6 9 17l-5-5"]'))))
    await page.evaluate(() => { window.__tail = null })
    const nCopied = await page.evaluate(() => window.__copied.length)
    await pick('diag')
    ok('4c sem log: toast de falha e nada copiado', /Não deu para copiar o diagnóstico/.test(await toast()) && (await page.evaluate(() => window.__copied.length)) === nCopied, await toast())
    await page.evaluate(() => { window.__tail = 'linha 1\nlinha 2' })
    await page.keyboard.press('Escape'); await page.waitForTimeout(150)
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)

    // 5. Configurações › Sobre › Feedback.
    await page.keyboard.press('Control+,')
    await page.waitForSelector('.settings [data-sec="sobre"]', { state: 'attached', timeout: 15000 })
    await page.$eval('.settings [data-sec="sobre"]', (e) => e.click()); await page.waitForTimeout(300)
    const grp = await page.evaluate(() => {
      const h = [...document.querySelectorAll('.settings .grp h3')].find((x) => x.textContent === 'Feedback')
      const g = h && h.closest('.grp')
      return g ? [...g.querySelectorAll('.row .lbl')].map((l) => l.textContent) : null
    })
    ok('5a grupo Feedback com as cinco linhas', !!grp && grp.join('|') === 'Relatar um problema|Sugerir uma ideia|Fazer uma pergunta|Copiar diagnóstico|Abrir a pasta do log', JSON.stringify(grp))
    const rowBtn = (label) => page.evaluate((label) => { const r = [...document.querySelectorAll('.settings .row')].find((x) => x.querySelector('.lbl')?.textContent === label); r.querySelector('button').click() }, label)
    await rowBtn('Relatar um problema'); await page.waitForTimeout(400)
    ok('5b "Relatar um problema" abre o mesmo painel, por cima das Configurações', (await dlgOpen()) && await page.evaluate(() => document.body.classList.contains('settings-open')))
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    ok('5c Esc fecha só o painel (as Configurações ficam) e o foco volta ao botão', !(await dlgOpen()) && await page.evaluate(() => document.body.classList.contains('settings-open') && !!document.activeElement?.closest('.settings .row')))
    await rowBtn('Sugerir uma ideia'); await page.waitForTimeout(200)
    ok('5d "Sugerir uma ideia" nas Configurações', (await links()).pop() === 'https://github.com/atempel/sonic-obsidian/discussions/new?category=ideas')
    await rowBtn('Copiar diagnóstico')
    // A cópia é assíncrona (log:tail + copyText) e, num runner lento, passa de 200 ms: espera o
    // "Copiado" (que fica 1,5 s) em vez de ler o botão depois de um tempo fixo.
    const sawCopied = await H.poll(page, () => document.querySelector('.settings button[data-fb="diag"]')?.textContent === 'Copiado', { timeout: 5000, every: 50 })
    ok('5e "Copiar diagnóstico" copia e o botão diz "Copiado"', sawCopied && (await page.evaluate(() => window.__copied.slice(-1)[0])) === 'linha 1\nlinha 2', await page.$eval('.settings button[data-fb="diag"]', (e) => e.textContent))
    const found = async (qq) => {
      await page.fill('#st-search', qq); await page.waitForTimeout(250)
      return page.evaluate(() => [...document.querySelectorAll('.settings .row.hit')].map((r) => r.querySelector('.lbl')?.textContent))
    }
    const fBug = await found('bug'), fLog = await found('log')
    ok('5f busca "bug" acha "Relatar um problema"', fBug.includes('Relatar um problema'), JSON.stringify(fBug))
    ok('5g busca "log" acha "Copiar diagnóstico" e "Abrir a pasta do log"', fLog.includes('Copiar diagnóstico') && fLog.includes('Abrir a pasta do log'), JSON.stringify(fLog))
    await page.fill('#st-search', '')
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    if (await page.evaluate(() => document.body.classList.contains('settings-open'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(400) }

    // 6. Busca rápida.
    await page.mouse.move(700, 420)
    await page.keyboard.press('/'); await page.waitForTimeout(200)
    await page.keyboard.type('relatar'); await page.waitForTimeout(250)
    const cmds = await page.$$eval('.prow.cmd .r-title', (els) => els.map((e) => e.textContent))
    ok('6a busca: comando "Relatar um problema"', cmds.includes('Relatar um problema'), JSON.stringify(cmds))
    await page.evaluate(() => [...document.querySelectorAll('.prow.cmd')].find((e) => e.textContent.includes('Relatar um problema')).querySelector('.r-btn').click())
    await page.waitForTimeout(400)
    ok('6b o comando fecha a busca e abre o painel', (await dlgOpen()) && !(await page.evaluate(() => document.body.classList.contains('palette-open'))))
    await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    for (const [qq, label] of [['sugerir', 'Sugerir uma ideia'], ['pergunta', 'Fazer uma pergunta'], ['diagn', 'Copiar diagnóstico']]) {
      await page.keyboard.press('/'); await page.waitForTimeout(200)
      await page.keyboard.type(qq); await page.waitForTimeout(250)
      const c = await page.$$eval('.prow.cmd .r-title', (els) => els.map((e) => e.textContent))
      ok(`6c busca: comando "${label}"`, c.includes(label), JSON.stringify(c))
      await page.keyboard.press('Escape'); await page.waitForTimeout(250)
    }

    ok('sem erros na página', errs.length === 0, JSON.stringify(errs.slice(0, 5)))
  } finally {
    const code = await R.finish()
    await b.close(); srv.close(); process.exit(code)
  }
})().catch((e) => { R.dump(); console.error(e); process.exit(1) })
