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

export default {
  name: 'VirtualTimelineDemo',
  data() {
    return {
      gantt: null,
      virtualEnabled: true,
      bufferPx: 2000,
      options: {
        minDate: '2026-01-01T00:00',
        maxDate: '2029-01-01T00:00',
        rowHeight: 72,
        virtualScroll: {
          enabled: true,
          bufferPx: 2000
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
          scales: [
            { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#eaf3f8', fontWeight: '700' }, format: formatDay },
            { unit: 'minute', step: 15, colWidth: 44, rowHeight: 24, style: { backgroundColor: '#f8fbfd' }, format: formatMinute }
          ]
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
        records: [
          {
            id: 'virtual-1',
            name: '热处理炉 1',
            owner: '王工',
            tasks: [
              makeTask('v-task-1', '季度计划 A', '2026-02-02T08:00:00', 24, 'running'),
              makeTask('v-task-2', '年度检修', '2027-05-10T08:00:00', 18, 'warning'),
              makeTask('v-task-3', '批量排产', '2028-09-15T08:00:00', 32, 'normal')
            ]
          },
          {
            id: 'virtual-2',
            name: '热处理炉 2',
            owner: '李工',
            tasks: [
              makeTask('v-task-4', '跨年工单', '2026-12-20T08:00:00', 42, 'outside'),
              makeTask('v-task-5', '产能补排', '2028-03-03T08:00:00', 21, 'running')
            ]
          },
          {
            id: 'virtual-3',
            name: '外协线 1',
            owner: '赵工',
            tasks: [
              makeTask('v-task-6', '外协包 1', '2026-07-12T08:00:00', 36, 'outside'),
              makeTask('v-task-7', '外协包 2', '2027-11-01T08:00:00', 45, 'warning')
            ]
          }
        ]
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
    renderTask({ task }) {
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

.virtual-toolbar input[type='number'] {
  width: 92px;
}

.virtual-chart {
  min-height: 0;
  flex: 1;
  border: 1px solid #dbe6ea;
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
