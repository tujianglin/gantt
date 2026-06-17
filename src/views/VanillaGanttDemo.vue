<template>
  <section class="demo-view">
    <div class="demo-toolbar">
      <label>
        <span>开始</span>
        <input :value="start" type="datetime-local" @input="updateOption('start', $event.target.value)" />
      </label>
      <label>
        <span>结束</span>
        <input :value="end" type="datetime-local" @input="updateOption('end', $event.target.value)" />
      </label>
      <label>
        <span>刻度</span>
        <select :value="scaleKey" @change="updateScale($event.target.value)">
          <option v-for="scale in scaleOptions" :key="scale.key" :value="scale.key">
            {{ scale.label }}
          </option>
        </select>
      </label>
    </div>
    <div class="actions">
      <button type="button" @click="collapseFirstGroup">收起第一组</button>
      <button type="button" @click="expandAll">全部展开</button>
      <button type="button" @click="zoomIn">放大刻度</button>
    </div>
    <div ref="gantt" class="vanilla-host"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const scaleOptions = createScaleOptions()

export default {
  name: 'VanillaGanttDemo',
  data() {
    const data = createScheduleData()
    return {
      ...data,
      start: '2026-03-30T02:00',
      end: '2026-04-01T18:00',
      scaleKey: '2h',
      scaleOptions,
      gantt: null
    }
  },
  computed: {
    timeScale() {
      return this.scaleOptions.find(scale => scale.key === this.scaleKey).value
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, {
      rows: this.rows,
      tasks: this.tasks,
      blocks: this.blocks,
      links: this.links,
      restRanges: this.restRanges,
      start: this.start,
      end: this.end,
      now: '2026-03-30T12:00',
      timeScale: this.timeScale,
      renderTask: ({ task }) => {
        const node = document.createElement('div')
        node.className = `demo-vanilla-task demo-vanilla-task--${task.status || 'normal'}`
        if (task.status === 'load' || task.status === 'unload') return node

        const title = document.createElement('strong')
        title.textContent = task.title
        const meta = document.createElement('span')
        meta.textContent = task.subtitle || ''
        node.append(title, meta)
        return node
      }
    })
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    updateOption(key, value) {
      this[key] = value
      this.gantt.setOptions({ [key]: value })
    },
    updateScale(value) {
      this.scaleKey = value
      this.gantt.setOptions({ timeScale: this.timeScale })
    },
    collapseFirstGroup() {
      const rows = this.rows.map((row, index) => index === 0 ? { ...row, expanded: false } : row)
      this.rows = rows
      this.gantt.setOptions({ rows })
    },
    expandAll() {
      const expand = rows => rows.map(row => ({
        ...row,
        expanded: true,
        children: row.children ? expand(row.children) : undefined
      }))
      this.rows = expand(this.rows)
      this.gantt.setOptions({ rows: this.rows })
    },
    zoomIn() {
      this.gantt.setOptions({
        timeScale: {
          ...this.timeScale,
          pxPerUnit: this.timeScale.pxPerUnit + 24
        }
      })
    }
  }
}

function createScheduleData() {
  const rows = [
    {
      id: 'heat-group-a',
      name: '热处理',
      type: 'group',
      expanded: true,
      children: [
        { id: 'unit-1', name: '机组单元1', load: 100 },
        { id: 'unit-2', name: '机组单元2', load: 80 },
        { id: 'unit-3', name: '机组单元3', load: 79 }
      ]
    },
    {
      id: 'machine-group-a',
      name: '热处理炉1',
      type: 'group',
      expanded: true,
      children: [
        { id: 'fanuc-004', name: 'FANUC004', load: 50 },
        { id: 'fanuc-006-a', name: 'FANUC006', load: 49 }
      ]
    },
    { id: 'heat', name: '热处理', type: 'group', height: 44 },
    { id: 'outside', name: '外协加工', type: 'group', height: 44 }
  ]
  const plans = [
    task('t1', 'unit-1', '产品图号001', '144', '2026-03-30T06:15:00', '2026-03-30T10:30:00', { striped: true }),
    task('t2', 'unit-1', '产品图号002', '80', '2026-03-30T11:05:00', '2026-03-30T13:00:00', { status: 'planned', progress: 60, locked: true }),
    task('t3', 'unit-1', '产品图号001', '144', '2026-03-31T06:30:00', '2026-03-31T10:45:00'),
    task('t4', 'unit-2', '产品图号001', '144 (50%)', '2026-03-30T09:10:00', '2026-03-30T19:00:00', { progress: 50 }),
    task('t5', 'unit-2', '产品图号002', '144', '2026-04-01T00:45:00', '2026-04-01T07:15:00', { status: 'selected' }),
    task('t6', 'unit-3', '产品图号004', '144', '2026-03-31T09:10:00', '2026-03-31T11:00:00', { status: 'blue' }),
    task('t7', 'fanuc-004', '产品图号001', '144', '2026-03-31T02:05:00', '2026-03-31T09:30:00'),
    task('t8', 'fanuc-006-a', '产品图号002', '80 (50%)', '2026-03-30T10:45:00', '2026-03-30T14:00:00', { status: 'planned', progress: 50 }),
    task('t9', 'fanuc-006-a', '产品图号003', '144', '2026-04-01T04:00:00', '2026-04-01T08:40:00', { status: 'warning' })
  ]

  return {
    rows,
    tasks: plans.concat(createHandlingTasks(plans)),
    blocks: [
      block('b1', 'unit-1', '2026-03-30T15:00:00', '2026-03-31T04:20:00', '#dcf8c9', 0.7),
      block('b2', 'unit-2', '2026-03-30T19:10:00', '2026-03-31T11:10:00', '#fde9e9', 0.75),
      block('b3', 'fanuc-006-a', '2026-03-30T19:00:00', '2026-03-31T04:20:00', '#c7d9f7', 0.75),
      { ...block('b4', 'heat', '2026-03-30T02:00:00', '2026-04-01T08:00:00', '#ffe6a8', 0.9), offsetY: 4, height: 32 },
      { ...block('b5', 'outside', '2026-03-30T02:00:00', '2026-04-01T08:00:00', '#cfe1ff', 0.9), offsetY: 4, height: 32 }
    ],
    links: [
      { id: 'l1', fromRowId: 'fanuc-006-a', toRowId: 'fanuc-006-a', fromTime: '2026-03-31T09:35:00', toTime: '2026-03-31T08:10:00', fromY: 31, toY: 31, color: '#43c51a' },
      { id: 'l2', fromRowId: 'unit-2', toRowId: 'unit-2', fromTime: '2026-04-01T09:55:00', toTime: '2026-04-01T07:15:00', fromY: 31, toY: 31, color: '#43c51a', dashed: true }
    ],
    restRanges: [
      rest('rest-1', '2026-03-30T09:36:00', '2026-03-30T10:42:00'),
      rest('rest-2', '2026-03-31T20:30:00', '2026-04-01T02:10:00')
    ]
  }
}

function createScaleOptions() {
  return [
    { key: '1h', label: '1小时', value: { unit: 'hour', step: 1, pxPerUnit: 40, topUnit: 'day' } },
    { key: '2h', label: '2小时', value: { unit: 'hour', step: 2, pxPerUnit: 64, topUnit: 'day' } },
    { key: '4h', label: '4小时', value: { unit: 'hour', step: 4, pxPerUnit: 72, topUnit: 'day' } },
    { key: 'day', label: '天', value: { unit: 'day', step: 1, pxPerUnit: 120, topUnit: 'day' } },
    { key: 'week', label: '周', value: { unit: 'week', step: 1, pxPerUnit: 180, topUnit: 'month' } },
    { key: 'month', label: '月', value: { unit: 'month', step: 1, pxPerUnit: 220, topUnit: 'year' } },
    { key: 'year', label: '年', value: { unit: 'year', step: 1, pxPerUnit: 260, topUnit: 'year' } }
  ]
}

function task(id, rowId, title, subtitle, start, end, extra = {}) {
  return { id, rowId, title, subtitle, start, end, height: 36, offsetY: 10, ...extra }
}

function createHandlingTasks(tasks) {
  return tasks.flatMap(item => [
    task(`${item.id}-load`, item.rowId, '上料', item.title, addHours(item.start, -3), addHours(item.start, -0.4), { lane: 'load', status: 'load', progress: undefined }),
    task(`${item.id}-unload`, item.rowId, '下料', item.title, addHours(item.end, 0.4), addHours(item.end, 3), { lane: 'unload', status: 'unload', progress: undefined })
  ])
}

function addHours(value, hours) {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() + Math.round(hours * 60))
  return formatDateTime(date)
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function block(id, rowId, start, end, fill, opacity) {
  return { id, rowId, start, end, offsetY: 0, height: 62, fill, opacity }
}

function rest(id, start, end) {
  return { id, start, end, fill: '#e4eaea', opacity: 1 }
}
</script>

<style>
.demo-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.demo-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.demo-toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #556164;
  font-size: 13px;
}

.demo-toolbar input,
.demo-toolbar select {
  height: 30px;
  border: 1px solid #ccd8d8;
  border-radius: 3px;
  padding: 0 8px;
  color: #344247;
  background: #fff;
}

.actions {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.actions button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #cfdada;
  border-radius: 3px;
  background: #fff;
  color: #344247;
  cursor: pointer;
}

.vanilla-host {
  min-height: 0;
  flex: 1;
}

.demo-vanilla-task {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 8px;
  border: 1px solid rgba(29, 93, 86, 0.12);
  background: #a7eee6;
  color: #27413e;
  overflow: hidden;
}

.demo-vanilla-task--planned {
  background: #fff1b8;
}

.demo-vanilla-task--warning {
  border-color: #ff5b62;
  background: #ffe3e5;
}

.demo-vanilla-task--selected {
  border: 2px solid #49c419;
  background: #f7ed9d;
}

.demo-vanilla-task--blue {
  background: #bfe8ff;
}

.demo-vanilla-task--load,
.demo-vanilla-task--unload {
  padding: 0;
  border: 0;
}

.demo-vanilla-task--load {
  background: #6eddd8;
}

.demo-vanilla-task--unload {
  background: #45a2ff;
}

.demo-vanilla-task strong,
.demo-vanilla-task span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-vanilla-task strong {
  font-size: 12px;
}

.demo-vanilla-task span {
  font-size: 11px;
}
</style>
