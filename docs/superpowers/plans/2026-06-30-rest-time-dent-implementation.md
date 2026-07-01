# Rest Time Dent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional rest-time dent rendering capability to `@wimi/gantt` and a Vue demo that shows both built-in and custom rendering.

**Architecture:** Rest-time range collection and segment math live in a focused helper module under `packages/gantt/src/core/restTime.ts`. `VanillaGantt` consumes that helper to add `restTimeSegments` to task render payloads and to render the default dent overlay. The Vue demo uses normal options plus `taskBar.customLayout` to prove consumers can reuse the computed segments.

**Tech Stack:** TypeScript library code, SVG `foreignObject`, plain DOM helpers, Vue 2 demo app, existing npm scripts.

---

## File Structure

- Create: `packages/gantt/src/core/restTime.ts`
  - Owns rest-time defaults, option normalization, range collection, overlap merge, and segment geometry.
- Modify: `packages/gantt/src/config/defaultOptions.ts`
  - Adds data-only `taskBar.restTime` default.
- Modify: `packages/gantt/src/utils/options.ts`
  - Merges nested `taskBar.restTime` objects during `setOptions`.
- Modify: `packages/gantt/src/VanillaGantt.ts`
  - Imports rest-time helper functions, adds `restTimeOptions` getter, adds task segment methods, includes `restTimeSegments` in task payloads, and renders default dent overlays.
- Modify: `packages/gantt/src/vanilla-gantt.css`
  - Adds default dent overlay styles while preserving existing task title, meta, progress, and lock layers.
- Modify: `packages/gantt/types/index.d.ts`
  - Adds public rest-time range/options/segment types and exposes `restTimeSegments` on custom task layout context.
- Modify: `packages/gantt/README.md`
  - Documents `taskBar.restTime` and `restTimeSegments` with a short example.
- Create: `src/views/RestTimeDentDemo.vue`
  - Shows built-in dent rendering and a custom layout using `restTimeSegments`.
- Modify: `src/router.js`
  - Registers `/rest-time-dent`.
- Modify: `src/views/HomePage.vue`
  - Adds the demo entry to the home page.
- Create: `scripts/check-rest-time-api.mjs`
  - Static consistency check for API/defaults/docs/demo wiring.
- Modify: `package.json`
  - Adds `check:rest-time` script.

---

## Task 1: Add Rest-Time API Checks

**Files:**
- Create: `scripts/check-rest-time-api.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing API consistency check**

Create `scripts/check-rest-time-api.mjs`:

```js
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
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add this script after `check:gantt-dist`:

```json
"check:rest-time": "node scripts/check-rest-time-api.mjs",
```

- [ ] **Step 3: Run the check and confirm it fails**

Run:

```bash
npm run check:rest-time
```

Expected: FAIL with missing helper, demo, types, defaults, README, route, and CSS messages.

- [ ] **Step 4: Commit the failing check**

Run:

```bash
git add package.json scripts/check-rest-time-api.mjs
git commit -m "test: add rest time api check"
```

---

## Task 2: Add Core Rest-Time Helper, Defaults, Merge, and Types

**Files:**
- Create: `packages/gantt/src/core/restTime.ts`
- Modify: `packages/gantt/src/config/defaultOptions.ts`
- Modify: `packages/gantt/src/utils/options.ts`
- Modify: `packages/gantt/types/index.d.ts`

- [ ] **Step 1: Create the rest-time helper**

Create `packages/gantt/src/core/restTime.ts`:

```ts
import { toTime } from '../utils/time'

export const DEFAULT_REST_TIME_OPTIONS = {
  enabled: false,
  ranges: [],
  rowRanges: [],
  rowRangesField: 'restTimes',
  taskRangesField: 'restTimes',
  modeField: 'restTimeMode',
  renderMode: 'dent',
  dentHeight: 12,
  bridgeHeight: 8,
  minWidth: 2
}

export function normalizeRestTimeOptions(restTime: any) {
  if (restTime === true) {
    return { ...DEFAULT_REST_TIME_OPTIONS, enabled: true }
  }
  if (!restTime || restTime === false || restTime.enabled === false) return null
  return {
    ...DEFAULT_REST_TIME_OPTIONS,
    ...restTime,
    enabled: true,
    ranges: Array.isArray(restTime.ranges) ? restTime.ranges : [],
    rowRanges: Array.isArray(restTime.rowRanges) ? restTime.rowRanges : []
  }
}

export function resolveRestTimeRanges(restTime: any, task: any, row: any, rowKey: string | number) {
  const options = normalizeRestTimeOptions(restTime)
  if (!options) return []

  const modeField = options.modeField || DEFAULT_REST_TIME_OPTIONS.modeField
  const rowRangesField = options.rowRangesField || DEFAULT_REST_TIME_OPTIONS.rowRangesField
  const taskRangesField = options.taskRangesField || DEFAULT_REST_TIME_OPTIONS.taskRangesField
  const normalizedRowKey = String(rowKey)

  let ranges = asArray(options.ranges)
  const optionRowRanges = asArray(options.rowRanges).filter(range => String(range.recordKey) === normalizedRowKey)
  const rowFieldRanges = asArray(row && row[rowRangesField])
  const rowMode = row && row[modeField]

  if (rowMode === 'disabled') return []
  ranges = rowMode === 'override'
    ? [...optionRowRanges, ...rowFieldRanges]
    : [...ranges, ...optionRowRanges, ...rowFieldRanges]

  const taskMode = task && task[modeField]
  if (taskMode === 'disabled') return []

  const taskFieldRanges = asArray(task && task[taskRangesField])
  ranges = taskMode === 'override' ? taskFieldRanges : [...ranges, ...taskFieldRanges]

  return ranges
}

export function createRestTimeSegments(
  ranges: any[],
  taskStart: any,
  taskEnd: any,
  taskWidth: number,
  minWidth = DEFAULT_REST_TIME_OPTIONS.minWidth
) {
  const startTime = toTime(taskStart)
  const endTime = toTime(taskEnd)
  const width = Number(taskWidth)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return []
  if (!Number.isFinite(width) || width <= 0) return []

  const clippedRanges = asArray(ranges)
    .map(range => {
      const rangeStart = toTime(range.startDate)
      const rangeEnd = toTime(range.endDate)
      if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) return null
      const clippedStart = Math.max(startTime, rangeStart)
      const clippedEnd = Math.min(endTime, rangeEnd)
      if (clippedEnd <= clippedStart) return null
      return { startTime: clippedStart, endTime: clippedEnd }
    })
    .filter(Boolean)
    .sort((a, b) => a.startTime - b.startTime)

  const mergedRanges = mergeRanges(clippedRanges)
  const minimumWidth = Number.isFinite(Number(minWidth)) ? Math.max(0, Number(minWidth)) : 0
  const duration = endTime - startTime

  return mergedRanges
    .map(range => {
      const left = ((range.startTime - startTime) / duration) * width
      const segmentWidth = ((range.endTime - range.startTime) / duration) * width
      return {
        startDate: new Date(range.startTime),
        endDate: new Date(range.endTime),
        startTime: range.startTime,
        endTime: range.endTime,
        left,
        width: segmentWidth,
        leftPercent: (left / width) * 100,
        widthPercent: (segmentWidth / width) * 100
      }
    })
    .filter(segment => segment.width >= minimumWidth)
}

function asArray(value: any) {
  return Array.isArray(value) ? value : []
}

function mergeRanges(ranges: Array<{ startTime: number, endTime: number }>) {
  return ranges.reduce((merged, range) => {
    const previous = merged[merged.length - 1]
    if (!previous || range.startTime > previous.endTime) {
      merged.push({ ...range })
    } else {
      previous.endTime = Math.max(previous.endTime, range.endTime)
    }
    return merged
  }, [] as Array<{ startTime: number, endTime: number }>)
}
```

- [ ] **Step 2: Add the default option**

In `packages/gantt/src/config/defaultOptions.ts`, import the helper constant:

```ts
import { DEFAULT_REST_TIME_OPTIONS } from '../core/restTime'
```

Then add this field inside `taskBar`, after `customLayout: null`:

```ts
restTime: DEFAULT_REST_TIME_OPTIONS,
```

- [ ] **Step 3: Merge nested rest-time options**

In `packages/gantt/src/utils/options.ts`, update the `taskBar` merge block to include:

```ts
restTime: mergeNestedOption(baseTaskBar.restTime, patchTaskBar.restTime),
```

Place it after `tooltip: mergeNestedOption(baseTaskBar.tooltip, patchTaskBar.tooltip),`.

- [ ] **Step 4: Add public types**

In `packages/gantt/types/index.d.ts`, add these interfaces near `GanttTaskBarStyle`:

```ts
export interface GanttRestTimeRange {
  id?: string | number
  startDate: GanttTimeValue
  endDate: GanttTimeValue
  recordKey?: string | number
  [key: string]: unknown
}

export interface GanttRestTimeOptions {
  enabled?: boolean
  ranges?: GanttRestTimeRange[]
  rowRanges?: GanttRestTimeRange[]
  rowRangesField?: string
  taskRangesField?: string
  modeField?: string
  renderMode?: 'dent'
  dentHeight?: number
  bridgeHeight?: number
  minWidth?: number
}

export interface GanttRestTimeSegment {
  startDate: Date
  endDate: Date
  startTime: number
  endTime: number
  left: number
  width: number
  leftPercent: number
  widthPercent: number
}
```

In `GanttTaskBarOptions`, add this field after `customLayout?: GanttRenderer<GanttTaskBarCustomLayoutContext>`:

```ts
restTime?: boolean | GanttRestTimeOptions
```

In `GanttTaskBarCustomLayoutContext`, add this field before `event?: Event`:

```ts
restTimeSegments?: GanttRestTimeSegment[]
```

- [ ] **Step 5: Run checks after core API changes**

Run:

```bash
npm run check:rest-time
npm run build:gantt
```

Expected: `check:rest-time` still fails because render, CSS, README, and demo are not done. `build:gantt` should pass.

- [ ] **Step 6: Commit core API changes**

Run:

```bash
git add packages/gantt/src/core/restTime.ts packages/gantt/src/config/defaultOptions.ts packages/gantt/src/utils/options.ts packages/gantt/types/index.d.ts
git commit -m "feat: add rest time option model"
```

---

## Task 3: Connect Rest-Time Segments to Task Rendering

**Files:**
- Modify: `packages/gantt/src/VanillaGantt.ts`
- Modify: `packages/gantt/src/vanilla-gantt.css`

- [ ] **Step 1: Import rest-time helpers**

In `packages/gantt/src/VanillaGantt.ts`, add this import near other core imports:

```ts
import {
  createRestTimeSegments,
  normalizeRestTimeOptions,
  resolveRestTimeRanges
} from './core/restTime'
```

- [ ] **Step 2: Add `restTimeSegments` to task payloads**

In `createTaskPayload`, add this field after `progress: this.taskProgress(task),`:

```ts
restTimeSegments: this.taskRestTimeSegments(task, width),
```

- [ ] **Step 3: Pass payload to default task rendering**

In `renderTask`, replace:

```ts
fo.append(custom || this.renderDefaultTask(task))
```

with:

```ts
fo.append(custom || this.renderDefaultTask(task, payload))
```

- [ ] **Step 4: Add rest-time getters and segment methods**

Add these methods before `get filterOptions()`:

```ts
get restTimeOptions() {
  return normalizeRestTimeOptions(this.taskBar.restTime)
}

taskRestTimeSegments(task, width) {
  const options = this.restTimeOptions
  if (!options) return []
  const sourceTask = this.findSourceTask(task) || task
  const row = task.__rowRecord || this.rowById[task.__rowId]
  const ranges = resolveRestTimeRanges(this.taskBar.restTime, sourceTask, row, task.__rowId)
  return createRestTimeSegments(
    ranges,
    this.taskStart(sourceTask),
    this.taskEnd(sourceTask),
    width === undefined ? this.durationWidth(this.taskStart(task), this.taskEnd(task)) : width,
    options.minWidth
  )
}
```

- [ ] **Step 5: Render default dent overlays**

Change the signature of `renderDefaultTask`:

```ts
renderDefaultTask(task, payload = null) {
```

After `this.applyTaskStyle(root, style, task)`, add:

```ts
const restTimeSegments = payload && payload.restTimeSegments ? payload.restTimeSegments : this.taskRestTimeSegments(task)
if (restTimeSegments.length) {
  this.renderTaskRestTimeDent(root, restTimeSegments)
}
```

Add this method before `applyTaskStyle`:

```ts
renderTaskRestTimeDent(root, restTimeSegments) {
  const options = this.restTimeOptions
  if (!options || options.renderMode !== 'dent') return
  const layer = el('div', 'vg-task-rest-layer')
  const bridgeHeight = Math.max(0, Number(options.bridgeHeight || 0))
  const dentHeight = Math.max(0, Number(options.dentHeight || 0))
  const background = this.grid.backgroundColor || '#f7fbfb'
  root.classList.add('vg-task--rest-time-dent')
  root.style.setProperty('--vg-task-rest-bg', background)
  root.style.setProperty('--vg-task-rest-bridge-height', `${bridgeHeight}px`)
  if (dentHeight > 0) root.style.setProperty('--vg-task-rest-dent-height', `${dentHeight}px`)

  restTimeSegments.forEach(segment => {
    const dent = el('i', 'vg-task-rest-dent')
    dent.style.left = `${segment.left}px`
    dent.style.width = `${segment.width}px`
    layer.append(dent)
  })

  root.append(layer)
}
```

- [ ] **Step 6: Add CSS for the dent overlay**

In `packages/gantt/src/vanilla-gantt.css`, add these rules after `.vg-task`:

```css
.vg-task--rest-time-dent {
  isolation: isolate;
}

.vg-task-rest-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.vg-task-rest-dent {
  position: absolute;
  top: 0;
  bottom: var(--vg-task-rest-bridge-height, 8px);
  min-height: var(--vg-task-rest-dent-height, 0);
  background: var(--vg-task-rest-bg, #f7fbfb);
  box-shadow: inset 1px 0 rgba(39, 65, 62, 0.08), inset -1px 0 rgba(39, 65, 62, 0.08);
}

.vg-task--rest-time-dent .vg-task-title,
.vg-task--rest-time-dent .vg-task-meta,
.vg-task--rest-time-dent .vg-task-progress,
.vg-task--rest-time-dent .vg-task-lock {
  z-index: 2;
}

.vg-task--rest-time-dent .vg-task-title,
.vg-task--rest-time-dent .vg-task-meta {
  position: relative;
}
```

- [ ] **Step 7: Verify render integration**

Run:

```bash
npm run build:gantt
npm run check:rest-time
```

Expected: `build:gantt` passes. `check:rest-time` still fails only for README, route, home, and demo wiring.

- [ ] **Step 8: Commit rendering changes**

Run:

```bash
git add packages/gantt/src/VanillaGantt.ts packages/gantt/src/vanilla-gantt.css
git commit -m "feat: render rest time dents in task bars"
```

---

## Task 4: Add README Documentation

**Files:**
- Modify: `packages/gantt/README.md`

- [ ] **Step 1: Add a rest-time section after the taskBar example**

In `packages/gantt/README.md`, after the “多行任务和自定义 TaskBar” section's first example, add:

````md
## 休息时间段任务条下凹

`taskBar.restTime` 只改变任务条视觉，不改变任务开始、结束时间，也不改变拖拽写回规则。全局休息段默认作用于所有任务，行和任务可以追加、覆盖或禁用休息段。

```js
const options = {
  taskBar: {
    restTime: {
      enabled: true,
      ranges: [
        { startDate: '2026-03-30T12:00:00', endDate: '2026-03-30T13:30:00' }
      ],
      rowRangesField: 'restTimes',
      taskRangesField: 'restTimes',
      modeField: 'restTimeMode',
      dentHeight: 12,
      bridgeHeight: 8
    },
    customLayout: ({ task, restTimeSegments }) => {
      return `
        <div class="my-task">
          <strong>${task.title || ''}</strong>
          ${restTimeSegments.map(segment => `
            <i
              class="my-task-rest"
              style="left:${segment.left}px;width:${segment.width}px"
            ></i>
          `).join('')}
        </div>
      `
    }
  }
}
```

`restTimeMode` 支持：

| 值 | 说明 |
| --- | --- |
| `append` 或不填 | 追加到全局和行级休息段 |
| `override` | 覆盖上层休息段 |
| `disabled` | 当前行或任务不应用休息段视觉 |
````

- [ ] **Step 2: Verify README content**

Run:

```bash
npm run check:rest-time
```

Expected: FAIL only for route, home, and demo wiring.

- [ ] **Step 3: Commit README documentation**

Run:

```bash
git add packages/gantt/README.md
git commit -m "docs: document rest time task dents"
```

---

## Task 5: Add the Rest-Time Demo Page

**Files:**
- Create: `src/views/RestTimeDentDemo.vue`
- Modify: `src/router.js`
- Modify: `src/views/HomePage.vue`

- [ ] **Step 1: Create the demo page**

Create `src/views/RestTimeDentDemo.vue`:

```vue
<template>
  <section class="rest-time-demo">
    <div class="rest-time-demo__toolbar">
      <label>
        <span>刻度</span>
        <select v-model="scaleKey">
          <option v-for="scale in scaleOptions" :key="scale.key" :value="scale.key">
            {{ scale.label }}
          </option>
        </select>
      </label>
    </div>
    <div ref="gantt" class="rest-time-demo__chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatHour({ startDate }) {
  return `${pad(startDate.getHours())}:00`
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const scaleOptions = [
  {
    key: '1h',
    label: '1小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#e8f0f5', color: '#2d4654', fontWeight: '700' } },
      { unit: 'hour', step: 1, colWidth: 56, rowHeight: 24, style: { backgroundColor: '#f8fbfd', color: '#526872' }, format: formatHour }
    ]
  },
  {
    key: '2h',
    label: '2小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#e8f0f5', color: '#2d4654', fontWeight: '700' } },
      { unit: 'hour', step: 2, colWidth: 70, rowHeight: 24, style: { backgroundColor: '#f8fbfd', color: '#526872' }, format: formatHour }
    ]
  }
]

const restRanges = [
  { id: 'lunch', startDate: '2026-03-30T12:00:00', endDate: '2026-03-30T13:30:00' },
  { id: 'maintain', startDate: '2026-03-30T18:00:00', endDate: '2026-03-30T19:00:00' }
]

export default {
  name: 'RestTimeDentDemo',
  data() {
    return {
      scaleKey: '1h',
      scaleOptions,
      gantt: null,
      options: {
        minDate: '2026-03-30T08:00:00',
        maxDate: '2026-03-31T02:00:00',
        rowHeight: 76,
        taskHeight: 48,
        taskListTable: {
          tableWidth: 210,
          columns: [
            { field: 'name', title: '资源', width: 130, tree: true },
            { field: 'mode', title: '渲染', width: 80 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f8fbfd',
          scales: scaleOptions[0].value
        },
        taskBar: {
          labelText: 'title',
          subLabelText: 'subtitle',
          customLayout: this.renderTask,
          restTime: {
            enabled: true,
            ranges: restRanges,
            rowRanges: [
              { recordKey: 'rest-custom', startDate: '2026-03-30T21:00:00', endDate: '2026-03-30T21:40:00' }
            ],
            dentHeight: 18,
            bridgeHeight: 9,
            minWidth: 3
          },
          barStyle: {
            barColor: '#a9ddff',
            borderColor: '#5da9d6',
            cornerRadius: 4
          }
        },
        grid: {
          backgroundColor: '#ffffff',
          alternatingBackgroundColor: '#f8fbfb',
          verticalLine: { lineColor: '#e4ecec' },
          horizontalLine: { lineColor: '#edf1f2' },
          backgroundRanges: restRanges.map(range => ({
            ...range,
            fill: '#fff2c7',
            opacity: 0.74
          }))
        },
        records: [
          {
            id: 'rest-built-in',
            name: '产线 A',
            mode: '内置',
            tasks: [
              {
                id: 'rest-task-built-in',
                title: '连续工单',
                subtitle: '跨午休和维护',
                startDate: '2026-03-30T09:00:00',
                endDate: '2026-03-30T22:30:00'
              }
            ]
          },
          {
            id: 'rest-custom',
            name: '产线 B',
            mode: '自定义',
            restTimes: [
              { startDate: '2026-03-30T15:30:00', endDate: '2026-03-30T16:10:00' }
            ],
            tasks: [
              {
                id: 'rest-task-custom',
                title: '自定义条',
                subtitle: '读取 restTimeSegments',
                startDate: '2026-03-30T10:00:00',
                endDate: '2026-03-31T00:30:00',
                useCustomRestLayout: true
              }
            ]
          },
          {
            id: 'rest-disabled',
            name: '产线 C',
            mode: '禁用',
            restTimeMode: 'disabled',
            tasks: [
              {
                id: 'rest-task-disabled',
                title: '普通工单',
                subtitle: '行级禁用休息段',
                startDate: '2026-03-30T11:00:00',
                endDate: '2026-03-30T20:00:00'
              }
            ]
          }
        ]
      }
    }
  },
  watch: {
    scaleKey(value) {
      this.options.timelineHeader.scales = this.scaleOptions.find(scale => scale.key === value).value
      this.syncGantt()
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    syncGantt() {
      if (this.gantt) this.gantt.setOptions(this.options)
    },
    renderTask({ task, restTimeSegments }) {
      if (!task.useCustomRestLayout) return null
      return `
        <div class="rest-time-custom-task">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
          <div class="rest-time-custom-task__layer">
            ${restTimeSegments.map(segment => `
              <i
                class="rest-time-custom-task__dent"
                style="left:${segment.left}px;width:${segment.width}px"
              ></i>
            `).join('')}
          </div>
        </div>
      `
    }
  }
}
</script>

<style>
.rest-time-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f8f8;
}

.rest-time-demo__toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.rest-time-demo__toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #556164;
  font-size: 13px;
}

.rest-time-demo__toolbar select {
  height: 30px;
  border: 1px solid #ccd8d8;
  border-radius: 3px;
  padding: 0 8px;
  color: #344247;
  background: #fff;
}

.rest-time-demo__chart {
  min-height: 0;
  flex: 1;
}

.rest-time-custom-task {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid #6d8fd6;
  border-radius: 4px;
  overflow: hidden;
  background: #bdd3ff;
  color: #23365f;
  font-size: 12px;
  line-height: 1.3;
}

.rest-time-custom-task strong,
.rest-time-custom-task span {
  position: relative;
  z-index: 2;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rest-time-custom-task__layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.rest-time-custom-task__dent {
  position: absolute;
  top: 0;
  bottom: 8px;
  background: #fff;
  box-shadow: inset 1px 0 rgba(35, 54, 95, 0.12), inset -1px 0 rgba(35, 54, 95, 0.12);
}
</style>
```

- [ ] **Step 2: Register the route**

In `src/router.js`, add the async import near other demo imports:

```js
const RestTimeDentDemo = () => import('./views/RestTimeDentDemo.vue')
```

Add this route after `/timeline`:

```js
{
  path: '/rest-time-dent',
  name: 'rest-time-dent',
  component: RestTimeDentDemo,
  meta: {
    title: '休息时间段'
  }
},
```

- [ ] **Step 3: Add the home-page entry**

In `src/views/HomePage.vue`, add this item after the `基础示例` entry:

```js
{ path: '/rest-time-dent', title: '休息时间段', desc: '跨休息区任务条下凹，支持内置和自定义渲染。' },
```

- [ ] **Step 4: Verify demo wiring**

Run:

```bash
npm run check:rest-time
```

Expected: PASS.

- [ ] **Step 5: Commit demo changes**

Run:

```bash
git add src/views/RestTimeDentDemo.vue src/router.js src/views/HomePage.vue
git commit -m "feat: add rest time dent demo"
```

---

## Task 6: Final Validation and Cleanup

**Files:**
- Check all modified files.

- [ ] **Step 1: Run library build**

Run:

```bash
npm run build:gantt
```

Expected: PASS with no TypeScript or Vite errors.

- [ ] **Step 2: Run root lint**

Run:

```bash
npm run lint
```

Expected: PASS with no ESLint warnings or errors.

- [ ] **Step 3: Run demo build**

Run:

```bash
npm run build
```

Expected: PASS with no Vue CLI errors or warnings caused by this change.

- [ ] **Step 4: Run API and dist checks**

Run:

```bash
npm run check:rest-time
node scripts/check-gantt-api.mjs
node scripts/check-gantt-dist.mjs
```

Expected: all PASS.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git status --short
git diff HEAD -- packages/gantt/src/core/restTime.ts packages/gantt/src/config/defaultOptions.ts packages/gantt/src/utils/options.ts packages/gantt/src/VanillaGantt.ts packages/gantt/src/vanilla-gantt.css packages/gantt/types/index.d.ts packages/gantt/README.md src/views/RestTimeDentDemo.vue src/router.js src/views/HomePage.vue package.json scripts/check-rest-time-api.mjs
```

Expected: only intended rest-time feature files appear.

- [ ] **Step 6: Commit final fixes if validation required edits**

If validation required edits, run:

```bash
git add packages/gantt/src/core/restTime.ts packages/gantt/src/config/defaultOptions.ts packages/gantt/src/utils/options.ts packages/gantt/src/VanillaGantt.ts packages/gantt/src/vanilla-gantt.css packages/gantt/types/index.d.ts packages/gantt/README.md src/views/RestTimeDentDemo.vue src/router.js src/views/HomePage.vue package.json scripts/check-rest-time-api.mjs
git commit -m "fix: stabilize rest time dent validation"
```

If validation required no edits, do not create an empty commit.
