// Spec 038 (#110): Perfis de ajustes — P0: aplicar (Alt+1…9, menu, busca), "modificado",
// Desfazer, Salvar como novo, Atualizar (com profiles.json pelo window.so simulado) e a barra fixa;
// P1 (parte 8): Configurações › Perfis — renomear, duplicar, apagar/desfazer, exportar, importar, Perfil ao abrir.
// Estados da interface e o valor que chega ao motor (HUD); o clima com música, só no Windows.
const H = require('./harness.cjs')
const R = H.createResults('038-perfis')
const ok = R.ok

const RENDER = { meshWidth: 32, meshHeight: 24, pixelRatio: 1, textureRatio: 0.5, fxaa: false, canvasScale: 0.5, extraImages: false }
const recordToasts = () => {
  window.__toasts = []
  const watch = () => {
    const span = document.querySelector('.gtoast span')
    if (!span) return void setTimeout(watch, 100)
    new MutationObserver(() => window.__toasts.push(span.textContent)).observe(span, { childList: true, characterData: true, subtree: true })
  }
  watch()
}
const has = (cls) => document.body.classList.contains(cls)
const hasNot = (cls) => !document.body.classList.contains(cls)
const lastToast = (page) => page.evaluate(() => window.__toasts.at(-1) || '')
const toastIs = (page, text) => H.poll(page, (x) => window.__toasts.includes(x), { timeout: 5000, arg: text })

// O que os Ajustes rápidos mostram agora.
const quickState = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const seg = (id) => q(`#${id} [aria-checked="true"]`)?.textContent.replace(/\(padrão\)|\(default\)/, '').trim()
  return {
    level: q('#expr')?.value,
    curve: seg('exprCurve'),
    memory: seg('exprMemory'),
    manualType: q('#blend-manual-type')?.value,
    manualS: q('#blend-manual-s')?.value ?? null,
    autoType: q('#blend-auto-type')?.value,
    autoS: q('#blend-auto-s')?.value ?? null,
    rot: q('#rotSwitch')?.checked,
    interval: q('#interval')?.value,
    gain: q('#gain')?.value,
    presetName: q('#otPreset')?.value,
    toasts: q('#otToasts')?.value,
    name: q('#pfName')?.textContent,
    dot: !q('#pfDot')?.hidden,
    sum: q('#pfSum')?.textContent ?? null,
    undo: !!q('#pfUndo'),
    upd: !!q('#pfUpd')
  }
})
const pressAlt = (page, n) => page.keyboard.press(`Alt+Digit${n}`)

async function openQuick(page) {
  if (await page.evaluate(() => document.body.classList.contains('sheet-open'))) return
  await page.keyboard.press(',')
  await H.poll(page, has, { timeout: 10000, arg: 'sheet-open' })
}

;(async () => {
  if (process.env.SKIP_UI === '1') { console.log('SKIP_UI=1: nada a testar'); process.exit(0) }
  const srv = H.serve(5262)
  const b = await H.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
    R.attach(page)
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)))
    await H.mockSo(page, { settings: { welcomeSeen: true, gainDefaultDb: 3, rotation: { enabled: false }, overlayText: { presetName: 'never', trackTitle: true, toasts: 'all', clean: false }, render: RENDER } })
    await H.mockAudio(page)
    await page.addInitScript(recordToasts)
    await page.goto('http://localhost:5262/')
    await page.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })
    await page.mouse.move(640, 300)
    await page.keyboard.press('Control+Shift+KeyD')

    // ── 1. Aplicar Festa com Alt+3 ──
    await pressAlt(page, 3)
    ok('1a toast "Perfil: Festa"', await toastIs(page, 'Perfil: Festa'), await lastToast(page))
    await openQuick(page)
    const s1 = await quickState(page)
    ok('1b Expressividade +2, Nervo, Fixa', s1.level === '2' && s1.curve === 'Nervo' && s1.memory === 'Fixa', JSON.stringify([s1.level, s1.curve, s1.memory]))
    ok('1c manual Corte seco (sem tempo), automática Radial 1 s', s1.manualType === 'cut' && s1.manualS === null && s1.autoType === 'radial' && s1.autoS === '1', JSON.stringify([s1.manualType, s1.manualS, s1.autoType, s1.autoS]))
    ok('1d rotação ligada a 15 s', s1.rot === true && s1.interval === '15', JSON.stringify([s1.rot, s1.interval]))
    ok('1e ganho e texto sobre o visual não mudam', s1.gain === '3' && s1.presetName === 'never' && s1.toasts === 'all', JSON.stringify([s1.gain, s1.presetName, s1.toasts]))
    ok('1f barra: "Festa", sem ponto, resumo de uma linha', s1.name === 'Festa' && !s1.dot && s1.sum === '+2 · Nervo · Fixa · corte seco · 15 s', JSON.stringify([s1.name, s1.dot, s1.sum]))
    ok('1g HUD: a Expressividade chegou ao motor', await H.poll(page, () => /expressiveness \+2 · character c · memory locked/.test(document.querySelector('#hud').textContent), { timeout: 10000 }))

    // ── 2. Modificado, Desfazer, grupo fora do perfil ──
    await page.click('#exprMemory [data-v="slow"]')
    await H.poll(page, () => !!document.querySelector('#pfUndo'), { timeout: 3000 })
    const s2 = await quickState(page)
    ok('2a mudar a Memória marca o ponto e mostra Desfazer', s2.dot && s2.undo && s2.sum === null, JSON.stringify([s2.dot, s2.undo, s2.sum]))
    ok('2b perfil do app: sem Atualizar', !s2.upd)
    ok('2c aria-label do seletor diz "modificado"', (await page.getAttribute('#pfSel', 'aria-label')) === 'Perfil: Festa, modificado')
    await page.click('#pfUndo')
    await H.poll(page, () => !document.querySelector('#pfUndo'), { timeout: 3000 })
    const s2b = await quickState(page)
    ok('2d Desfazer volta a Fixa e o ponto some', s2b.memory === 'Fixa' && !s2b.dot, JSON.stringify([s2b.memory, s2b.dot]))
    ok('2e toast "Valores de “Festa” restaurados."', await toastIs(page, 'Valores de “Festa” restaurados.'))
    await page.evaluate(() => { const g = document.querySelector('#gain'); g.value = '-4'; g.dispatchEvent(new Event('input', { bubbles: true })) })
    await page.waitForTimeout(150)
    const s2c = await quickState(page)
    ok('2f mudar o ganho (fora do perfil) não marca', s2c.gain === '-4' && !s2c.dot && !s2c.undo, JSON.stringify([s2c.gain, s2c.dot]))

    // ── 3. Salvar como novo, Atualizar ──
    await page.click('#pfSel')
    ok('3a menu aberto com o ativo focado', await H.poll(page, () => document.activeElement?.getAttribute('data-pid') === 'party', { timeout: 3000 }))
    const menu = await page.evaluate(() => [...document.querySelectorAll('#pfMenu button')].map((x) => ({ role: x.getAttribute('role'), text: x.querySelector('.grow').textContent, tag: x.querySelector('.tag')?.textContent || '', key: x.querySelector('.pf-k')?.textContent || '' })))
    ok('3b menu: quatro do app com "do app" e Alt+1…4, depois "Salvar como novo perfil…"', JSON.stringify(menu.map((m) => [m.text, m.tag, m.key])) === JSON.stringify([['Padrão', 'do app', 'Alt1'], ['Calmo', 'do app', 'Alt2'], ['Festa', 'do app', 'Alt3'], ['Estudar presets', 'do app', 'Alt4'], ['Salvar como novo perfil…', '', '']]), JSON.stringify(menu))
    await page.keyboard.press('End')
    ok('3c End vai ao último item', await page.evaluate(() => document.activeElement?.id === 'pfNew'))
    await page.keyboard.press('Escape')
    ok('3d Esc fecha só o menu e devolve o foco ao seletor', await H.poll(page, () => !document.querySelector('#pfMenu') && document.activeElement?.id === 'pfSel' && document.body.classList.contains('sheet-open'), { timeout: 3000 }))
    await page.click('#pfSel')
    await page.click('#pfNew')
    await H.poll(page, () => document.activeElement?.id === 'pfNameIn', { timeout: 3000 })
    const form = await page.evaluate(() => ({ ph: document.querySelector('#pfNameIn').placeholder, checked: [...document.querySelectorAll('#pfGrps input')].map((c) => `${c.value}:${c.checked}`) }))
    ok('3e formulário: "Perfil 1" de exemplo e três grupos marcados', form.ph === 'Perfil 1' && form.checked.join() === 'expression:true,blend:true,rotation:true,signal:false,text:false', JSON.stringify(form))
    // Teclas do app não valem no campo: Alt+1 não aplica o Padrão.
    await pressAlt(page, 1)
    await page.waitForTimeout(150)
    ok('3f Alt+1 com o foco no nome não aplica', (await quickState(page)).name === 'Festa')
    for (const g of ['expression', 'blend', 'rotation']) await page.click(`#pfGrps label:has(input[value="${g}"])`)
    ok('3g nenhum grupo marcado: Salvar desativado', await page.evaluate(() => document.querySelector('#pfFormOk').disabled))
    for (const g of ['expression', 'blend', 'rotation']) await page.click(`#pfGrps label:has(input[value="${g}"])`)
    await page.focus('#pfNameIn')
    await page.keyboard.press('Enter')
    await H.poll(page, () => !document.querySelector('#pfForm'), { timeout: 3000 })
    const s3 = await quickState(page)
    ok('3h nome vazio → "Perfil 1", vira o ativo', s3.name === 'Perfil 1' && !s3.dot, JSON.stringify([s3.name, s3.dot]))
    ok('3i toast "Salvo como perfil “Perfil 1”."', await toastIs(page, 'Salvo como perfil “Perfil 1”.'))
    const file1 = await page.evaluate(() => window.__profiles)
    const p1 = file1?.profiles?.[0]
    ok('3j profiles.json: versão 1, um perfil com três grupos e os valores de agora', file1?.version === 1 && file1.profiles.length === 1 && p1.name === 'Perfil 1' && p1.groups.join() === 'expression,blend,rotation' && p1.values.expression.level === 2 && p1.values.rotation.intervalSeconds === 15 && !p1.values.signal, JSON.stringify(file1))
    // Mudar o nível → Atualizar → confirmação com a diferença.
    await page.evaluate(() => { const g = document.querySelector('#expr'); g.value = '-1'; g.dispatchEvent(new Event('input', { bubbles: true })) })
    await H.poll(page, () => !!document.querySelector('#pfUpd'), { timeout: 3000 })
    ok('3k perfil do usuário modificado: Desfazer e Atualizar', (await quickState(page)).undo && (await quickState(page)).upd)
    await page.click('#pfUpd')
    await H.poll(page, () => document.activeElement?.id === 'pfConfOk', { timeout: 3000 })
    const diff = await page.evaluate(() => ({ title: document.querySelector('#pfConfT').textContent, rows: [...document.querySelectorAll('#pfDiff li')].map((l) => l.textContent) }))
    ok('3l confirmação lista "Expressividade: +2 → −1"', diff.title === 'Atualizar “Perfil 1” com estes valores?' && diff.rows.length === 1 && diff.rows[0] === 'Expressividade:+2 → −1', JSON.stringify(diff))
    await page.click('#pfConfOk')
    await H.poll(page, () => !document.querySelector('#pfConfirm'), { timeout: 3000 })
    const file2 = await page.evaluate(() => window.__profiles)
    ok('3m confirmar grava em profiles.json e o ponto some', file2.profiles[0].values.expression.level === -1 && !(await quickState(page)).dot, JSON.stringify(file2.profiles[0].values.expression))
    ok('3n toast "Perfil “Perfil 1” atualizado."', await toastIs(page, 'Perfil “Perfil 1” atualizado.'))

    // ── 4. Teclado e busca ──
    await page.keyboard.press('Escape')
    await H.poll(page, hasNot, { timeout: 5000, arg: 'sheet-open' })
    await pressAlt(page, 2)
    await toastIs(page, 'Perfil: Calmo')
    await pressAlt(page, 5)
    ok('4a Alt+5 aplica o primeiro perfil do usuário', await toastIs(page, 'Perfil: Perfil 1'))
    const before = await page.evaluate(() => window.__toasts.length)
    await pressAlt(page, 9)
    await page.waitForTimeout(200)
    ok('4b Alt+9 sem perfil não faz nada', (await page.evaluate(() => window.__toasts.length)) === before)
    await page.keyboard.press('/')
    await H.poll(page, has, { timeout: 5000, arg: 'palette-open' })
    await page.keyboard.type('calmo')
    await H.poll(page, () => !!document.querySelector('.prow.cmd'), { timeout: 3000 })
    const cmd = await page.evaluate(() => [...document.querySelectorAll('.prow.cmd')].map((r) => `${r.querySelector('.r-title').textContent}|${[...r.querySelectorAll('.k-keys kbd')].map((k) => k.textContent).join(' ')}`))
    ok('4c busca acha "Perfil: Calmo" com Alt 2', cmd.includes('Perfil: Calmo|Alt 2'), JSON.stringify(cmd))
    await page.evaluate(() => { window.__toasts.length = 0 })
    await page.keyboard.press('ArrowDown')
    const idx = await page.evaluate(() => [...document.querySelectorAll('.p-list [role=option]')].findIndex((o) => o.textContent.includes('Perfil: Calmo')))
    for (let i = 1; i < idx; i++) await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    ok('4d o comando aplica (toast "Perfil: Calmo")', await toastIs(page, 'Perfil: Calmo'))
    await openQuick(page)
    const s4 = await quickState(page)
    ok('4e Calmo nos Ajustes: −2, Contraste, Longa, Crossfade 5 s, 60 s', s4.name === 'Calmo' && s4.level === '-2' && s4.curve === 'Contraste' && s4.memory === 'Longa' && s4.manualType === 'crossfade' && s4.manualS === '5' && s4.interval === '60' && s4.sum === '−2 · Contraste · Longa · crossfade 5 s · 60 s', JSON.stringify(s4))
    await page.keyboard.press('Escape')
    await H.poll(page, hasNot, { timeout: 5000, arg: 'sheet-open' })
    // "Salvar como novo perfil…" pela busca abre os Ajustes com o formulário.
    await page.keyboard.press('/')
    await H.poll(page, has, { timeout: 5000, arg: 'palette-open' })
    await page.keyboard.type('novo perfil')
    await H.poll(page, () => [...document.querySelectorAll('.prow.cmd .r-title')].some((x) => x.textContent === 'Salvar como novo perfil…'), { timeout: 3000 })
    await page.evaluate(() => [...document.querySelectorAll('.prow.cmd')].find((r) => r.textContent.includes('Salvar como novo perfil…')).querySelector('.r-btn').click())
    ok('4f o comando "Salvar como novo perfil…" abre o formulário com o foco no nome', await H.poll(page, () => document.body.classList.contains('sheet-open') && document.activeElement?.id === 'pfNameIn', { timeout: 3000 }))
    await page.keyboard.type('Festa')
    await page.keyboard.press('Enter')
    ok('4g nome repetido ganha " (2)"', await toastIs(page, 'Salvo como perfil “Festa (2)”.'))
    await page.keyboard.press('Escape')
    await H.poll(page, hasNot, { timeout: 5000, arg: 'sheet-open' })
    await page.keyboard.press('?')
    await H.poll(page, () => !!document.querySelector('.kpanel'), { timeout: 3000 })
    const kp = await page.$eval('.kpanel', (e) => e.innerText)
    ok('4h o painel ? lista "Aplicar perfil 1 a 9"', /Aplicar perfil 1 a 9/.test(kp) && /Perfis/.test(kp))
    await page.keyboard.press('Escape')

    // ── 5. Barra fixa ──
    await openQuick(page)
    const bar = await page.evaluate(() => {
      const b = document.querySelector('.sheet .body'); b.scrollTop = b.scrollHeight
      const pf = document.querySelector('#pf').getBoundingClientRect(), h = document.querySelector('.sheet header').getBoundingClientRect()
      return { scrolled: b.scrollTop, top: Math.round(pf.top), headBottom: Math.round(h.bottom), visible: pf.height > 40 }
    })
    ok('5 rolada a lista até o fim, a barra continua logo abaixo do cabeçalho', bar.scrolled > 50 && bar.visible && Math.abs(bar.top - bar.headBottom) <= 1, JSON.stringify(bar))
    ok('6 sem erros na página', errs.length === 0, errs.join(' | '))

    // ── 7. Reabrir: perfis do arquivo e o ativo salvos; perfil inválido no arquivo sai ──
    const p2 = await b.newPage({ viewport: { width: 1280, height: 720 } })
    R.attach(p2)
    const saved = await page.evaluate(() => window.__profiles)
    saved.profiles.push({ id: 'bad', name: 'Sem grupos', groups: ['nada'], values: {} })
    await H.mockSo(p2, { profiles: saved, settings: { welcomeSeen: true, language: 'en', rotation: { enabled: false }, render: RENDER, profile: { active: saved.profiles[0].id, startup: 'last' } } })
    await H.mockAudio(p2)
    await p2.goto('http://localhost:5262/')
    await p2.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })
    await p2.mouse.move(640, 300)
    await openQuick(p2)
    await p2.click('#pfSel')
    const menu2 = await p2.evaluate(() => [...document.querySelectorAll('#pfMenu button .grow')].map((x) => x.textContent))
    ok('7a em inglês: perfis do app traduzidos, os do usuário depois, o inválido fora', JSON.stringify(menu2) === JSON.stringify(['Default', 'Calm', 'Party', 'Study presets', 'Perfil 1', 'Festa (2)', 'Save as new profile…']), JSON.stringify(menu2))
    ok('7b o ativo salvo continua marcado', await p2.evaluate(() => document.querySelector('#pfMenu [aria-checked="true"] .grow')?.textContent === 'Perfil 1'))
    await p2.close()

    // ── 8. Configurações › Perfis (P1, critério 6 da spec) ──
    const MINE = { version: 1, profiles: [{ id: 'u1', name: 'Meu', groups: ['expression', 'signal'], values: { expression: { level: 1, curve: 'b', adaptation: 'normal' }, signal: { gainDb: 2, autoGain: false } } }] }
    const p3 = await b.newPage({ viewport: { width: 1280, height: 720 } })
    R.attach(p3)
    const errs3 = []; p3.on('pageerror', (e) => errs3.push(String(e)))
    await H.mockSo(p3, { profiles: MINE, saveSettings: true, settings: { welcomeSeen: true, rotation: { enabled: false }, render: RENDER, profile: { active: 'u1', startup: 'last' } } })
    await H.mockAudio(p3)
    await p3.addInitScript(recordToasts)
    await p3.goto('http://localhost:5262/')
    await p3.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })
    await p3.mouse.move(640, 300)
    await p3.keyboard.press('Control+Comma')
    await H.poll(p3, has, { timeout: 5000, arg: 'settings-open' })
    await p3.click('.settings [data-sec="perfis"]')
    await H.poll(p3, () => !!document.querySelector('#pfList .pfrow'), { timeout: 3000 })
    const rows = () => p3.evaluate(() => [...document.querySelectorAll('#pfList .pfrow')].map((r) => ({
      id: r.dataset.pid, name: r.querySelector('.lbl')?.textContent, tag: r.querySelector('.pfs-tag')?.textContent || '', use: r.querySelector('.pfs-use')?.textContent || '',
      sum: r.querySelector('.pfs-sum').textContent, key: r.querySelector('.pfs-k')?.textContent || ''
    })))
    const r8 = await rows()
    ok('8a lista: quatro do app ("do app") e o do usuário, com resumo e Alt+N; o ativo "Em uso · modificado" (o ganho de agora não é o +2 dB dele)', JSON.stringify(r8.map((r) => [r.name, r.tag, r.key])) === JSON.stringify([['Padrão', 'do app', 'Alt1'], ['Calmo', 'do app', 'Alt2'], ['Festa', 'do app', 'Alt3'], ['Estudar presets', 'do app', 'Alt4'], ['Meu', '', 'Alt5']]) && r8[4].use === 'Em uso · modificado' && r8.slice(0, 4).every((r) => r.use === '') && r8[4].sum === '+1 · Energia · Curta · +2 dB' && r8[2].sum === '+2 · Nervo · Fixa · corte seco · 15 s', JSON.stringify(r8))
    const openMore = async (id) => {
      await p3.click(`[data-pmore="${id}"]`)
      await H.poll(p3, () => !!document.activeElement?.closest('#pfMenuS'), { timeout: 3000 })
    }
    const menuItems = () => p3.evaluate(() => [...document.querySelectorAll('#pfMenuS button')].map((x) => `${x.dataset.pact}:${x.disabled ? 'off' : 'on'}`).join())
    await openMore('party')
    ok('8b perfil do app: menu sem Renomear nem Apagar', (await menuItems()) === 'apply:on,rename:off,dup:on,export:on,del:off', await menuItems())
    ok('8c Apagar desativado com title', (await p3.getAttribute('#pfMenuS [data-pact="del"]', 'title')) === 'Perfis do app não podem ser apagados')
    await p3.keyboard.press('Escape')
    ok('8d Esc fecha só o menu e devolve o foco ao "…"', await H.poll(p3, () => !document.querySelector('#pfMenuS') && document.activeElement?.dataset.pmore === 'party' && document.body.classList.contains('settings-open'), { timeout: 3000 }))
    // Renomear
    await openMore('u1')
    ok('8e perfil do usuário: tudo ativo', (await menuItems()) === 'apply:on,rename:on,dup:on,export:on,del:on', await menuItems())
    await p3.click('#pfMenuS [data-pact="rename"]')
    await H.poll(p3, () => document.activeElement?.id === 'pfRenIn', { timeout: 3000 })
    await p3.keyboard.press('Escape')
    await H.poll(p3, () => !document.querySelector('#pfRenIn'), { timeout: 3000 })
    ok('8f Esc cancela o renomear (nome igual, Configurações abertas)', (await rows())[4].name === 'Meu' && await p3.evaluate(() => document.body.classList.contains('settings-open')))
    await openMore('u1')
    await p3.click('#pfMenuS [data-pact="rename"]')
    await H.poll(p3, () => document.activeElement?.id === 'pfRenIn', { timeout: 3000 })
    await p3.fill('#pfRenIn', 'Noite')
    await p3.keyboard.press('Enter')
    await H.poll(p3, () => !document.querySelector('#pfRenIn'), { timeout: 3000 })
    ok('8g Enter renomeia: lista, profiles.json e o seletor dos Ajustes', (await rows())[4].name === 'Noite' && (await p3.evaluate(() => window.__profiles.profiles[0].name)) === 'Noite' && (await p3.evaluate(() => document.querySelector('#pfName')?.textContent)) === 'Noite')
    // Duplicar (perfil do app vira do usuário, "(cópia)")
    await openMore('calm')
    await p3.click('#pfMenuS [data-pact="dup"]')
    await H.poll(p3, () => document.querySelectorAll('#pfList .pfrow').length === 6, { timeout: 3000 })
    const r8h = await rows()
    ok('8h Duplicar Calmo → "Calmo (cópia)" do usuário, no fim, com Alt+6', r8h[5].name === 'Calmo (cópia)' && r8h[5].tag === '' && r8h[5].key === 'Alt6' && r8h[5].sum === r8[1].sum && (await p3.evaluate(() => window.__profiles.profiles.length)) === 2, JSON.stringify(r8h[5]))
    // Exportar
    await openMore('u1')
    await p3.click('#pfMenuS [data-pact="export"]')
    await H.poll(p3, () => window.__pfExports.length === 1, { timeout: 3000 })
    const exp = await p3.evaluate(() => window.__pfExports[0])
    const ej = JSON.parse(exp.text)
    ok('8i Exportar: nome sonic-obsidian-perfil-noite e o JSON { app, version, profile: { name, groups, values } }', exp.name === 'sonic-obsidian-perfil-noite' && ej.app === 'sonic-obsidian' && ej.version === 1 && ej.profile.name === 'Noite' && ej.profile.groups.join() === 'expression,signal' && ej.profile.values.expression.level === 1 && ej.profile.values.signal.gainDb === 2 && Object.keys(ej.profile.values).join() === 'expression,signal', exp.name + ' ' + exp.text)
    ok('8j nota "exportado para"', await H.poll(p3, () => /Perfil “Noite” exportado para sonic-obsidian-perfil-noite\.json\./.test(document.querySelector('#pfNote')?.textContent || ''), { timeout: 3000 }))
    // Importar o próprio arquivo → "Noite (2)"
    await p3.evaluate((text) => { window.__pfImport = { ok: true, name: 'x.json', text } }, exp.text)
    await p3.click('#pfImpBtn')
    await H.poll(p3, () => document.querySelectorAll('#pfList .pfrow').length === 7, { timeout: 3000 })
    const r8k = await rows()
    ok('8k importar o JSON exportado cria "Noite (2)" com os mesmos valores', r8k[6].name === 'Noite (2)' && r8k[6].sum === r8k[4].sum && /Perfil “Noite \(2\)” importado\./.test(await p3.textContent('#pfNote')), JSON.stringify(r8k[6]))
    // Importar com grupo desconhecido → erro, nada muda
    const bad = JSON.parse(exp.text); bad.profile.groups.push('cor'); bad.profile.values.cor = { x: 1 }
    await p3.evaluate((text) => { window.__pfImport = { ok: true, name: 'ruim.json', text } }, JSON.stringify(bad))
    const nBefore = await p3.evaluate(() => window.__profiles.profiles.length)
    await p3.click('#pfImpBtn')
    await H.poll(p3, () => /Arquivo não é um perfil do Sonic Obsidian\./.test(document.querySelector('#pfNote')?.textContent || ''), { timeout: 3000 })
    ok('8l grupo desconhecido: erro e nada criado', (await rows()).length === 7 && (await p3.evaluate(() => window.__profiles.profiles.length)) === nBefore)
    await p3.evaluate(() => { window.__pfImport = { ok: true, name: 'lixo.json', text: '{nada' } })
    await p3.click('#pfImpBtn')
    await p3.waitForTimeout(150)
    ok('8m JSON quebrado: o mesmo erro', /Arquivo não é um perfil/.test(await p3.textContent('#pfNote')) && (await rows()).length === 7)
    // Apagar o ativo e desfazer
    await openMore('u1')
    await p3.click('#pfMenuS [data-pact="del"]')
    await H.poll(p3, () => !document.querySelector('[data-pid="u1"]'), { timeout: 3000 })
    ok('8n Apagar o ativo: nota com Desfazer, nenhum ativo ("Nenhum" no seletor), fora do profiles.json', /Perfil “Noite” apagado\./.test(await p3.textContent('#pfNote')) && !!(await p3.$('#pfUndoDel')) && (await p3.evaluate(() => document.querySelector('#pfName')?.textContent)) === 'Nenhum' && !(await p3.evaluate(() => window.__profiles.profiles.some((p) => p.id === 'u1'))))
    await p3.click('#pfUndoDel')
    await H.poll(p3, () => !!document.querySelector('[data-pid="u1"]'), { timeout: 3000 })
    const r8o = await rows()
    ok('8o Desfazer: volta no mesmo lugar, ativo de novo', r8o[4].id === 'u1' && r8o[4].use.startsWith('Em uso') && (await p3.evaluate(() => window.__profiles.profiles[0].id)) === 'u1' && (await p3.evaluate(() => document.querySelector('#pfName')?.textContent)) === 'Noite', JSON.stringify(r8o.map((r) => r.id)))
    // Aplicar pelo menu
    await openMore('party')
    await p3.click('#pfMenuS [data-pact="apply"]')
    ok('8p Aplicar pelo menu: toast "Perfil: Festa" e "Em uso" na linha', await toastIs(p3, 'Perfil: Festa') && await H.poll(p3, () => /Em uso/.test(document.querySelector('[data-pid="party"] .pfs-use')?.textContent || ''), { timeout: 3000 }))
    // Perfil ao abrir: Calmo
    const opts = await p3.evaluate(() => [...document.querySelectorAll('#perfilAbrir option')].map((o) => o.textContent))
    ok('8q "Perfil ao abrir": Último usado e os perfis', opts[0] === 'Último usado' && opts.includes('Calmo') && opts.includes('Noite (2)') && (await p3.inputValue('#perfilAbrir')) === 'last', JSON.stringify(opts))
    await p3.selectOption('#perfilAbrir', 'calm')
    ok('8r settings.json grava profile.startup = calm', await H.poll(p3, () => window.__saves.at(-1)?.profile?.startup === 'calm', { timeout: 3000 }))
    ok('8s sem erros na página', errs3.length === 0, errs3.join(' | '))
    const lastSettings = await p3.evaluate(() => window.__saves.at(-1))
    const lastProfiles = await p3.evaluate(() => window.__profiles)
    await p3.close()
    // Reabrir com esse settings.json: Calmo aplicado antes do primeiro preset (ganho do Meu fica fora).
    const p4 = await b.newPage({ viewport: { width: 1280, height: 720 } })
    R.attach(p4)
    await H.mockSo(p4, { profiles: lastProfiles, settings: { ...lastSettings, render: RENDER } })
    await H.mockAudio(p4)
    await p4.goto('http://localhost:5262/')
    await p4.waitForSelector('.strip [data-sheet-btn]', { timeout: 30000 })
    await p4.mouse.move(640, 300)
    await openQuick(p4)
    const s8 = await quickState(p4)
    ok('8t "Perfil ao abrir: Calmo" aplica Calmo na reabertura', s8.name === 'Calmo' && !s8.dot && s8.level === '-2' && s8.memory === 'Longa' && s8.interval === '60', JSON.stringify(s8))
    await p4.close()
  } finally {
    await b.close(); srv.close()
  }
  process.exit(await R.finish())
})().catch((e) => { console.error(e); R.dump(); process.exit(1) })
