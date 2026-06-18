<template>
  <section class="virtual-page">
    <div class="virtual-toolbar">
      <label>
        <span>开始</span>
        <input v-model="options.minDate" type="datetime-local" />
      </label>
      <label>
        <span>结束</span>
        <input v-model="options.maxDate" type="datetime-local" />
      </label>
      <label>
        <span>刻度</span>
        <select v-model="scaleKey">
          <option v-for="scale in scaleOptions" :key="scale.key" :value="scale.key">
            {{ scale.label }}
          </option>
        </select>
      </label>
      <label>
        <span>虚拟渲染</span>
        <select v-model="virtualEnabled">
          <option :value="true">开启</option>
          <option :value="false">关闭</option>
        </select>
      </label>
      <label>
        <span>缓冲区</span>
        <input v-model.number="bufferPx" type="number" min="0" step="200" />
      </label>
      <label>
        <span>行数</span>
        <input v-model.number="rowCount" type="number" min="1" max="50000" step="1000" />
      </label>
      <button type="button" @click="applyRowCount">生成</button>
      <strong>{{ rowCount }} 平铺行 + 树形自适应行高</strong>
    </div>
    <div ref="gantt" class="virtual-chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function makeTask(id, title, startDate, days, status) {
  const start = new Date(startDate)
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
  return {
    id,
    title,
    subtitle: `${days} 天`,
    startDate: formatLocal(start),
    endDate: formatLocal(end),
    status
  }
}

function offsetHour(value, hour) {
  const date = new Date(value)
  date.setHours(date.getHours() + hour)
  return formatLocal(date)
}

function planTasks(unitId, index, top, startDate, endDate, color) {
  return [
    {
      id: `${unitId}-plan-${index}`,
      type: 'plan',
      title: `计划 ${index}`,
      subtitle: `WO-${index}024`,
      startDate,
      endDate,
      offsetY: top,
      height: 34,
      color
    },
    {
      id: `${unitId}-load-${index}`,
      type: 'load',
      title: '上料',
      startDate: offsetHour(startDate, -1),
      endDate: offsetHour(startDate, 1),
      offsetY: top + 40,
      height: 7
    },
    {
      id: `${unitId}-unload-${index}`,
      type: 'unload',
      title: '下料',
      startDate: offsetHour(endDate, -1),
      endDate: offsetHour(endDate, 1),
      offsetY: top + 52,
      height: 7
    }
  ]
}

function makeAutoTreeRecords() {
  return [
    {
      id: 'virtual-auto-heat',
      name: '热处理（树形）',
      owner: '自适应',
      expanded: true,
      height: 42,
      children: [
        {
          id: 'virtual-auto-furnace-1',
          name: '热处理炉 1',
          owner: '多计划',
          tasks: [
            ...planTasks('virtual-auto-furnace-1', 1, 10, '2026-03-30T02:00:00', '2026-03-30T10:00:00', '#51c7bd'),
            ...planTasks('virtual-auto-furnace-1', 2, 82, '2026-03-30T11:00:00', '2026-03-31T06:00:00', '#f0a23a'),
            ...planTasks('virtual-auto-furnace-1', 3, 154, '2026-03-31T07:00:00', '2026-04-01T20:00:00', '#7c8cff')
          ]
        },
        {
          id: 'virtual-auto-furnace-2',
          name: '热处理炉 2',
          owner: '双计划',
          tasks: [
            ...planTasks('virtual-auto-furnace-2', 1, 10, '2026-03-30T00:30:00', '2026-03-30T08:30:00', '#51c7bd'),
            ...planTasks('virtual-auto-furnace-2', 2, 82, '2026-03-30T09:30:00', '2026-03-31T13:30:00', '#f0a23a')
          ]
        },
        {
          id: 'virtual-auto-furnace-3',
          name: '热处理炉 3',
          owner: '单计划',
          tasks: [
            ...planTasks('virtual-auto-furnace-3', 1, 10, '2026-03-30T04:00:00', '2026-03-31T01:00:00', '#51c7bd')
          ]
        }
      ]
    },
    {
      id: 'virtual-auto-outside',
      name: '外协加工（树形）',
      owner: '自适应',
      expanded: true,
      height: 42,
      children: [
        {
          id: 'virtual-auto-outside-1',
          name: '外协线 1',
          owner: '双计划',
          tasks: [
            ...planTasks('virtual-auto-outside-1', 1, 10, '2026-03-30T05:00:00', '2026-03-30T22:00:00', '#7c8cff'),
            ...planTasks('virtual-auto-outside-1', 2, 82, '2026-03-31T01:00:00', '2026-04-01T10:00:00', '#f0a23a')
          ]
        }
      ]
    }
  ]
}

function makeRecords(count) {
  const owners = ['王工', '李工', '赵工', '陈工', '周工']
  const statuses = ['running', 'warning', 'normal', 'outside']
  const base = new Date('2026-01-01T08:00:00')
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(base.getTime() + ((index * 7) % 980) * 24 * 60 * 60 * 1000 + (index % 8) * 2 * 60 * 60 * 1000)
    const days = 2 + (index % 28)
    const id = index + 1
    return {
      id: `virtual-${id}`,
      name: `资源 ${String(id).padStart(5, '0')}`,
      owner: owners[index % owners.length],
      height: 72,
      tasks: [
        makeTask(`v-task-${id}`, `排产工单 ${id}`, formatLocal(start), days, statuses[index % statuses.length])
      ]
    }
  })
}

function formatLocal(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}T${hour}:${minute}:00`
}

function formatDay({ startDate }) {
  const month = String(startDate.getMonth() + 1).padStart(2, '0')
  const day = String(startDate.getDate()).padStart(2, '0')
  return `${startDate.getFullYear()}-${month}-${day}`
}

function formatMinute({ startDate }) {
  return `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
}

function formatHour({ startDate }) {
  return `${String(startDate.getHours()).padStart(2, '0')}:00`
}

function formatMonth({ startDate }) {
  return `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
}

function formatQuarter({ startDate }) {
  return `${startDate.getFullYear()} Q${Math.floor(startDate.getMonth() / 3) + 1}`
}

const majorStyle = { backgroundColor: '#eaf3f8', fontWeight: '700' }
const minorStyle = { backgroundColor: '#f8fbfd' }

const scaleOptions = [
  {
    key: '15m',
    label: '15分钟',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: majorStyle, format: formatDay },
      { unit: 'minute', step: 15, colWidth: 44, rowHeight: 24, style: minorStyle, format: formatMinute }
    ]
  },
  {
    key: '1h',
    label: '1h',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: majorStyle, format: formatDay },
      { unit: 'hour', step: 1, colWidth: 42, rowHeight: 24, style: minorStyle, format: formatHour }
    ]
  },
  {
    key: '2h',
    label: '2h',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: majorStyle, format: formatDay },
      { unit: 'hour', step: 2, colWidth: 58, rowHeight: 24, style: minorStyle, format: formatHour }
    ]
  },
  {
    key: '4h',
    label: '4h',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: majorStyle, format: formatDay },
      { unit: 'hour', step: 4, colWidth: 76, rowHeight: 24, style: minorStyle, format: formatHour }
    ]
  },
  {
    key: '1w',
    label: '1周',
    value: [
      { unit: 'month', step: 1, rowHeight: 24, style: majorStyle, format: formatMonth },
      { unit: 'week', step: 1, colWidth: 56, rowHeight: 24, style: minorStyle }
    ]
  },
  {
    key: '1M',
    label: '1月',
    value: [
      { unit: 'year', step: 1, rowHeight: 24, style: majorStyle },
      { unit: 'month', step: 1, colWidth: 92, rowHeight: 24, style: minorStyle, format: formatMonth }
    ]
  },
  {
    key: '1Q',
    label: '1季度',
    value: [
      { unit: 'year', step: 1, rowHeight: 24, style: majorStyle },
      { unit: 'month', step: 3, colWidth: 150, rowHeight: 24, style: minorStyle, format: formatQuarter }
    ]
  },
  {
    key: '1Y',
    label: '1年',
    value: [
      { unit: 'year', step: 1, colWidth: 220, rowHeight: 48, style: majorStyle }
    ]
  }
]

export default {
  name: 'VirtualTimelineDemo',
  data() {
    const records = [...makeAutoTreeRecords(), ...makeRecords(10000)]
    return {
      gantt: null,
      virtualEnabled: true,
      bufferPx: 2000,
      rowCount: 10000,
      scaleKey: '15m',
      scaleOptions,
      options: {
        minDate: '2026-01-01T00:00',
        maxDate: '2029-01-01T00:00',
        rowHeight: 'auto',
        virtualScroll: {
          enabled: true,
          bufferPx: 2000,
          rowEnabled: true,
          rowBufferPx: 7200
        },
        loading: {
          enabled: true,
          customLayout: this.renderLoading
        },
        taskListTable: {
          tableWidth: 260,
          columns: [
            { field: 'name', title: '资源', width: 160, tree: true },
            { field: 'owner', title: '负责人', width: 100 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f8fbfd',
          scales: scaleOptions.find(scale => scale.key === '15m').value
        },
        taskBar: {
          customLayout: this.renderTask,
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          }
        },
        grid: {
          backgroundColor: '#fff',
          alternatingBackgroundColor: '#f7fbfb',
          verticalLine: ({ date }) => {
            return date && date.getHours && date.getHours() === 0 && date.getMinutes() === 0
              ? { lineColor: '#cbdadb', lineWidth: 1.2 }
              : { lineColor: '#edf2f3' }
          },
          horizontalLine: { lineColor: '#e5edef' }
        },
        records
      }
    }
  },
  watch: {
    virtualEnabled(value) {
      this.options.virtualScroll.enabled = value
      this.syncGantt()
    },
    bufferPx(value) {
      this.options.virtualScroll.bufferPx = value
      this.syncGantt()
    },
    scaleKey(value) {
      const scale = this.scaleOptions.find(item => item.key === value)
      if (!scale) return
      this.options.timelineHeader.scales = scale.value
      this.syncGantt()
    },
    'options.minDate': 'syncGantt',
    'options.maxDate': 'syncGantt'
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
    applyRowCount() {
      const count = Math.max(1, Math.min(50000, Number(this.rowCount) || 1))
      this.rowCount = count
      this.options.records = [...makeAutoTreeRecords(), ...makeRecords(count)]
      this.syncGantt()
    },
    renderLoading() {
      return `
        <div class="virtual-loading">
          <i></i>
          <span>正在更新刻度</span>
        </div>
      `
    },
    renderTask({ task }) {
      if (task.type === 'load' || task.type === 'unload') {
        return `
          <div class="virtual-logistics virtual-logistics--${task.type}">
            <span>${escapeHtml(task.title)}</span>
          </div>
        `
      }
      if (task.type === 'plan') {
        return `
          <div class="virtual-plan" style="background:${escapeHtml(task.color || '#51c7bd')}">
            <strong>${escapeHtml(task.title)}</strong>
            <span>${escapeHtml(task.subtitle)}</span>
          </div>
        `
      }
      return `
        <div class="virtual-task virtual-task--${escapeHtml(task.status || 'normal')}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
        </div>
      `
    },
    renderTooltip({ task, row, startDate, endDate }) {
      return `
        <div class="virtual-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(row && row.name)}</span>
          <time>${startDate.toLocaleString()} - ${endDate.toLocaleString()}</time>
        </div>
      `
    }
  }
}
</script>

<style>
.virtual-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.virtual-toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #dbe6ea;
  border-bottom: 0;
  background: #fff;
}

.virtual-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #53646b;
  font-size: 13px;
}

.virtual-toolbar input,
.virtual-toolbar select {
  height: 30px;
  max-width: 190px;
  padding: 0 8px;
  border: 1px solid #cdd9de;
  border-radius: 4px;
  background: #fff;
  color: #30444c;
}

.virtual-toolbar button {
  height: 30px;
  padding: 0 10px;
  border: 1px solid #cdd9de;
  border-radius: 4px;
  background: #fff;
  color: #30444c;
  cursor: pointer;
}

.virtual-toolbar strong {
  color: #176b87;
  font-size: 13px;
}

.virtual-toolbar input[type='number'] {
  width: 92px;
}

.virtual-chart {
  min-height: 0;
  flex: 1;
  border: 1px solid #dbe6ea;
}

.virtual-loading {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 14px;
  border: 1px solid rgba(23, 107, 135, 0.16);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.96);
  color: #176b87;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 22px rgba(30, 62, 72, 0.14);
}

.virtual-loading i {
  width: 14px;
  height: 14px;
  border: 2px solid #d7e8ec;
  border-top-color: #176b87;
  border-radius: 50%;
  animation: virtual-loading-spin 0.8s linear infinite;
}

@keyframes virtual-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.virtual-task {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid #83c8c0;
  border-radius: 4px;
  background: #dff4f1;
  color: #254047;
  overflow: hidden;
}

.virtual-task--running {
  background: #9ce7df;
}

.virtual-task--warning {
  border-color: #e0bf55;
  background: #fff0b5;
}

.virtual-task--outside {
  border-color: #b798e5;
  background: #eadcff;
}

.virtual-task strong,
.virtual-task span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.virtual-task strong {
  font-size: 13px;
}

.virtual-task span {
  flex: 0 0 auto;
  color: #61737a;
  font-size: 12px;
}

.virtual-plan {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border-radius: 4px;
  color: #fff;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.16);
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
}

.virtual-plan strong,
.virtual-plan span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.virtual-plan span {
  opacity: 0.88;
  font-size: 12px;
  font-weight: 600;
}

.virtual-logistics {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 2px;
  overflow: hidden;
  color: #37474f;
  font-size: 10px;
  line-height: 7px;
}

.virtual-logistics--load {
  background: #bfeee8;
}

.virtual-logistics--unload {
  background: #ffd796;
}

.virtual-logistics span {
  position: absolute;
  left: 4px;
  top: -1px;
}

.virtual-tooltip {
  min-width: 240px;
  display: grid;
  gap: 4px;
}

.virtual-tooltip span,
.virtual-tooltip time {
  color: #66777e;
  font-size: 12px;
}
</style>
