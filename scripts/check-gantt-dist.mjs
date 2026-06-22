import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const distFiles = [
  'packages/gantt/dist/VanillaGantt.es.js',
  'packages/gantt/dist/VanillaGantt.cjs',
  'packages/gantt/dist/VanillaGantt.umd.js'
]

const forbidden = [
  { name: 'logical AND assignment', pattern: /&&=/ },
  { name: 'logical OR assignment', pattern: /\|\|=/ },
  { name: 'nullish assignment', pattern: /\?\?=/ },
  { name: 'optional chaining', pattern: /\?\.(?=[A-Za-z_$[(])/ },
  { name: 'nullish coalescing', pattern: /\?\?/ }
]

const failures = []

for (const relativeFile of distFiles) {
  const file = resolve(root, relativeFile)
  if (!existsSync(file)) {
    failures.push(`${relativeFile}: file does not exist. Run npm --prefix packages/gantt run build first.`)
    continue
  }

  const source = readFileSync(file, 'utf8')
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) {
      failures.push(`${relativeFile}: contains ${rule.name}`)
    }
  }
}

if (failures.length) {
  console.error('Gantt dist compatibility check failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Gantt dist compatibility check passed.')
