import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const file = relativePath => readFileSync(resolve(root, relativePath), 'utf8')

const files = {
  types: file('packages/gantt/types/index.d.ts'),
  defaults: file('packages/gantt/src/config/defaultOptions.ts'),
  options: file('packages/gantt/src/utils/options.ts'),
  gantt: file('packages/gantt/src/VanillaGantt.ts'),
  css: file('packages/gantt/src/vanilla-gantt.css'),
  readme: file('packages/gantt/README.md'),
  router: file('src/router.js'),
  home: file('src/views/HomePage.vue'),
  packageJson: file('package.json')
}

const demoPath = resolve(root, 'src/views/RestTimeDentDemo.vue')
const helperPath = resolve(root, 'packages/gantt/src/core/restTime.ts')
const failures = []

function expect(name, condition) {
  if (!condition) failures.push(name)
}

expect('restTime helper exists', existsSync(helperPath))
expect('demo exists', existsSync(demoPath))
expect('types expose GanttRestTimeOptions', /interface\s+GanttRestTimeOptions/.test(files.types))
expect('types expose GanttRestTimeSegment', /interface\s+GanttRestTimeSegment/.test(files.types))
expect('taskBar.restTime public type exists', /restTime\?:\s*boolean\s*\|\s*GanttRestTimeOptions/.test(files.types))
expect('custom layout receives restTimeSegments', /restTimeSegments\?:\s*GanttRestTimeSegment\[\]/.test(files.types))
expect('default restTime import exists', /DEFAULT_REST_TIME_OPTIONS/.test(files.defaults))
expect('default taskBar.restTime exists', /restTime:\s*DEFAULT_REST_TIME_OPTIONS/.test(files.defaults))
expect('mergeOptions merges restTime', /restTime:\s*mergeNestedOption\(baseTaskBar\.restTime,\s*patchTaskBar\.restTime\)/.test(files.options))
expect('VanillaGantt imports restTime helper', /from\s+'\.\/core\/restTime'/.test(files.gantt))
expect('VanillaGantt creates restTimeSegments payload', /restTimeSegments:\s*this\.taskRestTimeSegments\(task,\s*width\)/.test(files.gantt))
expect('VanillaGantt renders default rest dent', /renderTaskRestTimeDent/.test(files.gantt))
expect('CSS includes dent layer class', /\.vg-task-rest-layer/.test(files.css))
expect('README documents restTime', /taskBar\.restTime/.test(files.readme))
expect('router registers rest-time-dent route', /path:\s*'\/rest-time-dent'/.test(files.router))
expect('home links rest-time-dent demo', /path:\s*'\/rest-time-dent'/.test(files.home))
expect('package exposes check:rest-time', /"check:rest-time":\s*"node scripts\/check-rest-time-api\.mjs"/.test(files.packageJson))

if (failures.length) {
  console.error('Rest time API check failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Rest time API check passed.')
