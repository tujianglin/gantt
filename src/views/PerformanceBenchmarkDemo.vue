<template>
  <section class="benchmark-page">
    <div class="benchmark-toolbar">
      <label>
        <span>行数</span>
        <select v-model.number="rowCount">
          <option :value="10000">10k</option>
          <option :value="50000">50k</option>
        </select>
      </label>
      <label>
        <span>刻度</span>
        <select v-model="scaleKey">
          <option value="15m">15分钟</option>
          <option value="1h">1小时</option>
          <option value="1d">1天</option>
          <option value="1m">1月</option>
        </select>
      </label>
      <label>
        <span>连接线</span>
        <select v-model.number="linkCount">
          <option :value="0">0</option>
          <option :value="100">100</option>
          <option :value="1000">1000</option>
        </select>
      </label>
      <label>
        <span>日志</span>
        <select v-model="consoleEnabled">
          <option :value="false">面板</option>
          <option :value="true">控制台</option>
        </select>
      </label>
      <button type="button" @click="applyBenchmark">生成</button>
      <strong>{{ summary }}</strong>
    </div>
    <div class="benchmark-metrics">
      <span>总耗时 {{ metric.totalDuration }}ms</span>
      <span>快照 {{ metric.snapshotDuration }}ms</span>
      <span>DOM {{ metric.domDuration }}ms</span>
      <span>行 {{ metric.renderedRowCount }}</span>
      <span>Task {{ metric.renderTaskCount }}</span>
      <span>Link {{ metric.visibleLinkCount }}</span>
      <span>SVG {{ metric.svgNodeCount }}</span>
    </div>
    <div ref="gantt" class="benchmark-chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function formatDay({ startDate }) {
  return `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`
}

function formatHour({ startDate }) {
  return `${pad(startDate.getHours())}:00`
}

function formatMinute({ startDate }) {
  return `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
}

function formatMonth({ startDate }) {
  return `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}`
}

function createRecords(count) {
  const base = new Date('2026-01-01T08:00:00').getTime()
  const statuses = ['normal', 'running', 'warning', 'outside']
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1
    const start = new Date(base + ((index * 11) % 1000) * DAY + (index % 12) * 2 * HOUR)
    const duration = (8 + (index % 96)) * HOUR
    const end = new Date(start.getTime() + duration)
    return {
      id: `bench-row-${id}`,
      name: `资源 ${String(id).padStart(5, '0')}`,
      owner: `班组 ${(index % 9) + 1}`,
      height: 62,
      tasks: [
        {
          id: `bench-task-${id}`,
          title: `工单 ${id}`,
          subtitle: `${Math.round(duration / HOUR)}h`,
          startDate: formatLocal(start),
          endDate: formatLocal(end),
          status: statuses[index % statuses.length]
        }
      ]
    }
  })
}

function createLinks(count, rowCount) {
  const max = Math.min(count, Math.max(0, rowCount - 8))
  return Array.from({ length: max }, (_, index) => {
    const from = index + 1
    const to = from + 5 + (index % 3)
    return {
      id: `bench-link-${from}-${to}`,
      from: `bench-task-${from}`,
      to: `bench-task-${to}`,
      lineMode: {
        pattern: index % 4 === 0 ? 'dashed' : 'solid',
        path: 'polyline'
      }
    }
  })
}

const scaleMap = {
  '15m': [
    { unit: 'day', step: 1, rowHeight: 24, format: formatDay, minLabelWidth: 44 },
    { unit: 'minute', step: 15, colWidth: 40, rowHeight: 24, format: formatMinute, minLabelWidth: 34 }
  ],
  '1h': [
    { unit: 'day', step: 1, rowHeight: 24, format: formatDay, minLabelWidth: 44 },
    { unit: 'hour', step: 1, colWidth: 44, rowHeight: 24, format: formatHour, minLabelWidth: 34 }
  ],
  '1d': [
    { unit: 'month', step: 1, rowHeight: 24, format: formatMonth, minLabelWidth: 56 },
    { unit: 'day', step: 1, colWidth: 34, rowHeight: 24, format: formatDay, minLabelWidth: 56 }
  ],
  '1m': [
    { unit: 'year', step: 1, rowHeight: 24, minLabelWidth: 60 },
    { unit: 'month', step: 1, colWidth: 72, rowHeight: 24, format: formatMonth, minLabelWidth: 64 }
  ]
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default {
  name: 'PerformanceBenchmarkDemo',
  data() {
    return {
      gantt: null,
      rowCount: 10000,
      linkCount: 1000,
      scaleKey: '15m',
      consoleEnabled: false,
      metric: {
        totalDuration: '-',
        snapshotDuration: '-',
        domDuration: '-',
        renderedRowCount: 0,
        renderTaskCount: 0,
        visibleLinkCount: 0,
        svgNodeCount: 0
      },
      options: this.createOptions(10000, 1000, '15m')
    }
  },
  computed: {
    summary() {
      return `${this.rowCount.toLocaleString()} 行 / ${this.linkCount} 连接线 / ${this.scaleKey}`
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    createOptions(rowCount, linkCount, scaleKey) {
      return {
        minDate: '2026-01-01T00:00',
        maxDate: '2029-01-01T00:00',
        rowHeight: 62,
        taskListTable: {
          tableWidth: 250,
          columns: [
            { field: 'name', title: '资源', width: 160 },
            { field: 'owner', title: '班组', width: 90 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f8fbfd',
          minLabelWidth: 36,
          scales: scaleMap[scaleKey]
        },
        virtualScroll: {
          enabled: true,
          bufferPx: 2200,
          rowEnabled: true,
          rowBufferPx: 7200
        },
        scrollbar: {
          alwaysVisible: true,
          width: 12,
          height: 12,
          dragRenderDelay: 80,
          dragRenderMaxWait: 260
        },
        performance: {
          enabled: true,
          console: this.consoleEnabled,
          onRender: this.handleRenderMetric
        },
        dependency: {
          links: createLinks(linkCount, rowCount),
          showLinks: true,
          lineMode: {
            pattern: 'solid',
            path: 'polyline'
          }
        },
        taskBar: {
          customLayout: this.renderTask
        },
        records: createRecords(rowCount)
      }
    },
    applyBenchmark() {
      this.options = this.createOptions(this.rowCount, this.linkCount, this.scaleKey)
      if (this.gantt) this.gantt.setOptions(this.options)
    },
    handleRenderMetric(payload) {
      this.metric = {
        totalDuration: payload.totalDuration.toFixed(1),
        snapshotDuration: payload.snapshotDuration.toFixed(1),
        domDuration: payload.domDuration.toFixed(1),
        renderedRowCount: payload.renderedRowCount,
        renderTaskCount: payload.renderTaskCount,
        visibleLinkCount: payload.visibleLinkCount,
        svgNodeCount: payload.svgNodeCount
      }
    },
    renderTask({ task }) {
      return `
        <div class="benchmark-task benchmark-task--${escapeHtml(task.status || 'normal')}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
        </div>
      `
    }
  }
}
</script>

<style>
.benchmark-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.benchmark-toolbar,
.benchmark-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #dbe6ea;
  background: #fff;
}

.benchmark-toolbar {
  border-bottom: 0;
}

.benchmark-metrics {
  min-height: 38px;
  border-bottom: 0;
  color: #41555d;
  font-size: 12px;
}

.benchmark-metrics span {
  padding: 3px 8px;
  border-radius: 3px;
  background: #eef6f7;
}

.benchmark-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #53646b;
  font-size: 13px;
}

.benchmark-toolbar select,
.benchmark-toolbar button {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #cdd9de;
  border-radius: 4px;
  background: #fff;
  color: #30444c;
}

.benchmark-toolbar button {
  cursor: pointer;
}

.benchmark-toolbar strong {
  color: #176b87;
  font-size: 13px;
}

.benchmark-chart {
  min-height: 0;
  flex: 1;
  border: 1px solid #dbe6ea;
}

.benchmark-task {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 9px;
  border: 1px solid #8bc6bf;
  border-radius: 4px;
  background: #dff4f1;
  color: #254047;
  overflow: hidden;
}

.benchmark-task--running {
  border-color: #62bdb5;
  background: #a4e7df;
}

.benchmark-task--warning {
  border-color: #dfbf55;
  background: #fff0b5;
}

.benchmark-task--outside {
  border-color: #b79be4;
  background: #eadcff;
}

.benchmark-task strong,
.benchmark-task span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
