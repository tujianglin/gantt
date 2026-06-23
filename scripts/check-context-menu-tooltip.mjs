import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/ContextMenuDemo.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1]

if (!script) {
  throw new Error('ContextMenuDemo.vue script block not found')
}

const runnableScript = script
  .replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]\s*/, '')
  .replace('export default', 'return')

const createComponent = new Function('VanillaGantt', `${runnableScript}`)
const component = createComponent(function VanillaGantt() {})
const vm = {
  ...component.methods,
  ...component.data.call(component.methods)
}

let tooltipHidden = false
const preventDefault = () => {}
const stopPropagation = () => {}

globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768
}

vm.gantt = {
  hideTaskTooltip() {
    tooltipHidden = true
  }
}

vm.openMenu({
  task: { id: 'ctx-1', title: '工单 A001' },
  row: { id: 'unit-a' },
  event: {
    clientX: 24,
    clientY: 32,
    preventDefault,
    stopPropagation
  }
})

if (!tooltipHidden) {
  throw new Error('openMenu should hide the active task tooltip before showing the context menu')
}

if (!vm.menu.visible) {
  throw new Error('openMenu should still show the context menu')
}
