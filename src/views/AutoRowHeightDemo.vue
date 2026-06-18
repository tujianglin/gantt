<template>
  <section class="auto-row-page">
    <div class="auto-row-toolbar">
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
          <option v-for="item in scaleOptions" :key="item.key" :value="item.key">
            {{ item.label }}
          </option>
        </select>
      </label>
    </div>
    <div ref="gantt" class="auto-row-chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const scaleOptions = [
  {
    key: '1h',
    label: '1小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#e8f0f5', fontWeight: '700' } },
      { unit: 'hour', step: 1, colWidth: 42, rowHeight: 24, style: { backgroundColor: '#f8fbfd' } }
    ]
  },
  {
    key: '2h',
    label: '2小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#e8f0f5', fontWeight: '700' } },
      { unit: 'hour', step: 2, colWidth: 58, rowHeight: 24, style: { backgroundColor: '#f8fbfd' } }
    ]
  },
  {
    key: '4h',
    label: '4小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#e8f0f5', fontWeight: '700' } },
      { unit: 'hour', step: 4, colWidth: 76, rowHeight: 24, style: { backgroundColor: '#f8fbfd' } }
    ]
  }
]

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

function offsetHour(value, hour) {
  const date = new Date(value)
  date.setHours(date.getHours() + hour)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}T${hh}:${mm}:00`
}

export default {
  name: 'AutoRowHeightDemo',
  data() {
    return {
      gantt: null,
      scaleKey: '2h',
      scaleOptions,
      options: {
        minDate: '2026-03-30T00:00',
        maxDate: '2026-04-02T00:00',
        rowHeight: 'auto',
        taskListTable: {
          tableWidth: 'auto',
          headerStyle: {
            backgroundColor: '#e8f0f5',
            color: '#2d4654',
            fontWeight: '700'
          },
          columns: [
            { field: 'name', title: '资源', width: 150, minWidth: 120, tree: true },
            { title: '计划数', width: 78, minWidth: 64, valueGetter: this.getPlanCount },
            { title: '自动行高', width: 92, minWidth: 78, valueGetter: this.getAutoHeight }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f8fbfd',
          scales: scaleOptions.find(item => item.key === '2h').value
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
          verticalLine: { lineColor: '#e4ebef' },
          horizontalLine: { lineColor: '#d9e3e8' }
        },
        records: [
          {
            id: 'heat',
            name: '热处理',
            expanded: true,
            height: 42,
            children: [
              {
                id: 'furnace-1',
                name: '热处理炉 1',
                stage: '多计划',
                tasks: [
                  ...planTasks('furnace-1', 1, 10, '2026-03-30T02:00:00', '2026-03-30T10:00:00', '#51c7bd'),
                  ...planTasks('furnace-1', 2, 82, '2026-03-30T11:00:00', '2026-03-31T06:00:00', '#f0a23a'),
                  ...planTasks('furnace-1', 3, 154, '2026-03-31T07:00:00', '2026-04-01T20:00:00', '#7c8cff')
                ]
              },
              {
                id: 'furnace-2',
                name: '热处理炉 2',
                stage: '双计划',
                tasks: [
                  ...planTasks('furnace-2', 1, 10, '2026-03-30T00:30:00', '2026-03-30T08:30:00', '#51c7bd'),
                  ...planTasks('furnace-2', 2, 82, '2026-03-30T09:30:00', '2026-03-31T13:30:00', '#f0a23a')
                ]
              },
              {
                id: 'furnace-3',
                name: '热处理炉 3',
                stage: '单计划',
                tasks: [
                  ...planTasks('furnace-3', 1, 10, '2026-03-30T04:00:00', '2026-03-31T01:00:00', '#51c7bd')
                ]
              }
            ]
          },
          {
            id: 'outside',
            name: '外协加工',
            expanded: true,
            height: 42,
            children: [
              {
                id: 'outside-1',
                name: '外协线 1',
                stage: '双计划',
                tasks: [
                  ...planTasks('outside-1', 1, 10, '2026-03-30T05:00:00', '2026-03-30T22:00:00', '#7c8cff'),
                  ...planTasks('outside-1', 2, 82, '2026-03-31T01:00:00', '2026-04-01T10:00:00', '#f0a23a')
                ]
              }
            ]
          }
        ]
      }
    }
  },
  watch: {
    scaleKey(value) {
      const scale = this.scaleOptions.find(item => item.key === value)
      if (scale && this.gantt) {
        this.gantt.setOptions({ timelineHeader: { scales: scale.value } })
      }
    },
    'options.minDate'(value) {
      if (this.gantt) this.gantt.setOptions({ minDate: value })
    },
    'options.maxDate'(value) {
      if (this.gantt) this.gantt.setOptions({ maxDate: value })
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    getPlanCount({ row }) {
      return Array.isArray(row.tasks) ? row.tasks.filter(task => task.type === 'plan').length : ''
    },
    getAutoHeight({ row, gantt }) {
      if (row.children) return row.height
      return `${gantt.rowHeight(row)}px`
    },
    renderTask({ task }) {
      if (task.type === 'load' || task.type === 'unload') {
        return `
          <div class="auto-logistics auto-logistics--${task.type}">
            <span>${escapeHtml(task.title)}</span>
          </div>
        `
      }
      return `
        <div class="auto-plan" style="background:${escapeHtml(task.color)}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
        </div>
      `
    },
    renderTooltip({ task, startDate, endDate }) {
      return `
        <div class="auto-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${startDate.toLocaleString()} - ${endDate.toLocaleString()}</span>
        </div>
      `
    }
  }
}
</script>

<style>
.auto-row-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.auto-row-toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #d8e3e8;
  border-bottom: 0;
  background: #fff;
}

.auto-row-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #51636b;
  font-size: 13px;
}

.auto-row-toolbar input,
.auto-row-toolbar select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #ccd9df;
  border-radius: 4px;
  background: #fff;
  color: #263b45;
}

.auto-row-chart {
  min-height: 0;
  flex: 1;
}

.auto-plan {
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
  font-size: 13px;
  font-weight: 700;
}

.auto-plan span {
  opacity: 0.88;
  font-size: 12px;
  font-weight: 600;
}

.auto-logistics {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 2px;
  overflow: hidden;
  color: #37474f;
  font-size: 10px;
  line-height: 7px;
}

.auto-logistics--load {
  background: #bfeee8;
}

.auto-logistics--unload {
  background: #ffd796;
}

.auto-logistics span {
  position: absolute;
  left: 4px;
  top: -1px;
}

.auto-tooltip {
  min-width: 220px;
  display: grid;
  gap: 6px;
}

.auto-tooltip strong {
  color: #1d3440;
}

.auto-tooltip span {
  color: #60727b;
  font-size: 12px;
}
</style>
