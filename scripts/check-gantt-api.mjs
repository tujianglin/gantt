import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const typesPath = resolve(root, 'packages/gantt/types/index.d.ts')
const defaultsPath = resolve(root, 'packages/gantt/src/config/defaultOptions.ts')
const readmePath = resolve(root, 'packages/gantt/README.md')
const vanillaGanttPath = resolve(root, 'packages/gantt/src/VanillaGantt.ts')

const types = readFileSync(typesPath, 'utf8')
const defaults = readFileSync(defaultsPath, 'utf8')
const readme = readFileSync(readmePath, 'utf8')
const vanillaGantt = readFileSync(vanillaGanttPath, 'utf8')

const checks = [
  {
    name: 'dependency.linkSelectable',
    typePattern: /linkSelectable\?:\s*boolean/,
    defaultPattern: /linkSelectable:\s*false/
  },
  {
    name: 'dependency.linkDeletable',
    typePattern: /linkDeletable\?:\s*boolean/,
    defaultPattern: /linkDeletable:\s*false/
  },
  {
    name: 'dependency.onLinkDelete',
    typePattern: /onLinkDelete\?:\s*\(/,
    defaultPattern: /onLinkDelete:\s*null/
  },
  {
    name: 'performance.onRender',
    typePattern: /onRender\?:\s*\(payload:\s*GanttRenderPerformancePayload\)\s*=>\s*void/,
    defaultPattern: /onRender:\s*null/
  },
  {
    name: 'taskBar.denseRender',
    typePattern: /denseRender\?:\s*boolean\s*\|\s*GanttDenseRenderOptions/,
    defaultPattern: /denseRender:\s*false/
  },
  {
    name: 'virtualScroll.patchRender',
    typePattern: /patchRender\?:\s*boolean/,
    defaultPattern: /patchRender:\s*false/
  }
]

const failures = []

for (const check of checks) {
  if (!check.typePattern.test(types)) failures.push(`${check.name}: missing or mismatched public type`)
  if (!check.defaultPattern.test(defaults)) failures.push(`${check.name}: missing or mismatched default option`)
}

if (/linkSelectable\s*\|\s*`undefined`\s*\|\s*预留字段/.test(readme) || /linkDeletable\s*\|\s*`undefined`\s*\|\s*预留字段/.test(readme)) {
  failures.push('README: linkSelectable/linkDeletable are still documented as reserved fields')
}

if (/svgNodeCount:\s*svg\.querySelectorAll\('\*'\)\.length/.test(vanillaGantt)) {
  failures.push('performance: body render metrics must not query all SVG nodes')
}

if (failures.length) {
  console.error('Gantt API consistency check failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Gantt API consistency check passed.')
