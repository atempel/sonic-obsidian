// Roda cada tests/headless/*.test.cjs em sequência (spec 025). Sai com 1 se algum falhar.
const { spawnSync } = require('child_process')
const fs = require('fs'), path = require('path')
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.cjs')).sort()
const failed = []
for (const f of files) {
  console.log(`\n=== ${f} ===`)
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' })
  if (r.status !== 0) failed.push(f)
}
console.log(`\n${files.length - failed.length}/${files.length} arquivos passaram${failed.length ? ` — falharam: ${failed.join(', ')}` : ''}`)
process.exit(failed.length ? 1 : 0)
