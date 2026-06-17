# @vue2-gantt/gantt

Framework-agnostic SVG scheduling gantt chart.

## Usage

```js
import { VanillaGantt } from '@vue2-gantt/gantt'
import '@vue2-gantt/gantt/src/vanilla-gantt.css'

const gantt = new VanillaGantt(document.querySelector('#gantt'), {
  rows,
  tasks,
  start: '2026-03-30T02:00',
  end: '2026-04-01T18:00',
  timeScale: { unit: 'hour', step: 2, pxPerUnit: 64, topUnit: 'day' }
})

gantt.setOptions({
  timeScale: { unit: 'hour', step: 1, pxPerUnit: 48 }
})

gantt.destroy()
```

## Build

```sh
npm --prefix packages/gantt run build
```
