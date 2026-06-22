<template>
  <section class="dense-page">
    <div class="dense-toolbar">
      <label>
        <span>热区行</span>
        <select v-model.number="denseRows">
          <option :value="1">1</option>
          <option :value="3">3</option>
          <option :value="5">5</option>
        </select>
      </label>
      <label>
        <span>持续天数</span>
        <select v-model.number="durationDays">
          <option :value="1">1天</option>
          <option :value="5">5天</option>
          <option :value="10">10天</option>
        </select>
      </label>
      <label>
        <span>行缓冲</span>
        <input v-model.number="rowBufferPx" type="number" min="0" step="360" />
      </label>
      <label>
        <span>日志</span>
        <select v-model="consoleEnabled">
          <option :value="false">面板</option>
          <option :value="true">控制台</option>
        </select>
      </label>
      <button type="button" @click="applyOptions">生成数据</button>
      <button type="button" @click="scrollToDense">滚到前5行任务时间</button>
      <button type="button" @click="scrollToSparse">滚到稀疏区</button>
      <strong>{{ summary }}</strong>
    </div>
    <div class="dense-metrics">
      <span>总耗时 {{ metric.totalDuration }}ms</span>
      <span>快照 {{ metric.snapshotDuration }}ms</span>
      <span>DOM {{ metric.domDuration }}ms</span>
      <span>渲染行 {{ metric.renderedRowCount }}</span>
      <span>Task {{ metric.renderTaskCount }}</span>
      <span>SVG {{ metric.svgNodeCount }}</span>
      <span>分片 {{ metric.sliced ? '是' : '否' }}</span>
    </div>
    <div ref="gantt" class="dense-chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const HOUR = 60 * 60 * 1000
const MINUTE = 60 * 1000
const ROW_HEIGHT = 36
const SPARSE_ROWS_BEFORE = 0
const SPARSE_ROWS_AFTER = 720
const HOT_START = new Date('2026-06-18T08:00:00')

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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function createSparseRecord(index, section) {
  const start = new Date(HOT_START.getTime() + (index % 5) * HOUR)
  const end = new Date(start.getTime() + 2 * HOUR)
  return {
    id: `${section}-sparse-row-${index}`,
    name: `${section === 'before' ? '前置' : '后置'}资源 ${String(index).padStart(4, '0')}`,
    group: '稀疏区',
    height: ROW_HEIGHT,
    tasks: [
      {
        id: `${section}-sparse-task-${index}`,
        title: `稀疏任务 ${index}`,
        startDate: formatLocal(start),
        endDate: formatLocal(end),
        status: 'sparse'
      }
    ]
  }
}

function createDenseRecord(rowIndex, durationDays) {
  const tasksPerRow = durationDays * 24 * 60
  const tasks = Array.from({ length: tasksPerRow }, (_, taskIndex) => {
    const start = new Date(HOT_START.getTime() + taskIndex * MINUTE)
    const end = new Date(start.getTime() + MINUTE)
    return {
      id: `dense-task-${rowIndex}-${taskIndex}`,
      title: `T${rowIndex}-${taskIndex}`,
      startDate: formatLocal(start),
      endDate: formatLocal(end),
      offsetY: 7 + (taskIndex % 4) * 5,
      height: 4,
      status: taskIndex % 3 === 0 ? 'hot' : 'normal'
    }
  })
  return {
    id: `dense-row-${rowIndex}`,
    name: `高密资源 ${String(rowIndex + 1).padStart(3, '0')}`,
    group: `1分钟/task x ${durationDays}天`,
    height: ROW_HEIGHT,
    tasks
  }
}

function createRecords(denseRows, durationDays) {
  const before = Array.from({ length: SPARSE_ROWS_BEFORE }, (_, index) => createSparseRecord(index + 1, 'before'))
  const dense = Array.from({ length: denseRows }, (_, index) => createDenseRecord(index, durationDays))
  const after = Array.from({ length: SPARSE_ROWS_AFTER }, (_, index) => createSparseRecord(index + 1, 'after'))
  return [...before, ...dense, ...after]
}

export default {
  name: 'DenseVisibleTasksDemo',
  data() {
    return {
      gantt: null,
      denseRows: 5,
      durationDays: 10,
      rowBufferPx: 360,
      consoleEnabled: false,
      metric: {
        totalDuration: '-',
        snapshotDuration: '-',
        domDuration: '-',
        renderedRowCount: 0,
        renderTaskCount: 0,
        svgNodeCount: 0,
        sliced: false
      },
      options: this.createOptions(5, 10, 360)
    }
  },
  computed: {
    summary() {
      const tasksPerRow = this.durationDays * 24 * 60
      const total = this.denseRows * tasksPerRow
      return `前 ${this.denseRows} 行 x ${tasksPerRow.toLocaleString()} task/行，1分钟/task，持续 ${this.durationDays} 天，共 ${total.toLocaleString()} task`
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
    this.$nextTick(() => this.scrollToDense())
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    createOptions(denseRows, durationDays, rowBufferPx) {
      return {
        minDate: '2026-01-01T00:00:00',
        maxDate: '2027-01-01T00:00:00',
        rowHeight: ROW_HEIGHT,
        taskHeight: 18,
        taskListTable: {
          tableWidth: 280,
          columns: [
            { field: 'name', title: '资源', width: 180 },
            { field: 'group', title: '区域', width: 100 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f8fbfd',
          minLabelWidth: 30,
          scales: [
            { unit: 'day', step: 1, rowHeight: 24, format: formatDay },
            { unit: 'hour', step: 1, colWidth: 96, rowHeight: 24, format: formatHour },
            { unit: 'minute', step: 15, colWidth: 24, rowHeight: 20, format: formatMinute, minLabelWidth: 22 }
          ]
        },
        virtualScroll: {
          enabled: true,
          bufferPx: 360,
          rowEnabled: true,
          rowBufferPx
        },
        scrollbar: {
          alwaysVisible: true,
          width: 12,
          height: 12,
          dragRenderDelay: 48,
          dragRenderMaxWait: 120
        },
        loading: {
          enabled: true,
          text: '正在渲染高密度任务...',
          bodyRenderSlice: true,
          bodyRenderSliceBudget: 8
        },
        performance: {
          enabled: true,
          console: this.consoleEnabled,
          onRender: this.handleRenderMetric
        },
        taskBar: {
          denseRender: {
            enabled: true,
            maxTaskWidth: 6,
            shape: 'circle',
            fill: ({ task }) => {
              if (task.status === 'hot') return '#f1a64b'
              if (task.status === 'sparse') return '#dff4f1'
              return '#63c6bd'
            }
          },
          customLayout: this.renderTask,
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          }
        },
        records: createRecords(denseRows, durationDays)
      }
    },
    applyOptions() {
      this.options = this.createOptions(this.denseRows, this.durationDays, this.rowBufferPx)
      if (this.gantt) {
        this.gantt.setOptions(this.options)
        this.$nextTick(() => this.scrollToDense())
      }
    },
    scrollToSparse() {
      if (!this.gantt || !this.gantt.scrollEl) return
      this.gantt.scrollEl.scrollTop = Math.max(0, (this.denseRows + 40) * ROW_HEIGHT)
    },
    scrollToDense() {
      if (!this.gantt || !this.gantt.scrollEl) return
      this.gantt.scrollEl.scrollTop = 0
      const hotX = this.gantt.timeToX ? this.gantt.timeToX(HOT_START) : 0
      this.gantt.scrollEl.scrollLeft = Math.max(0, hotX - 240)
    },
    handleRenderMetric(payload) {
      this.metric = {
        totalDuration: payload.totalDuration.toFixed(1),
        snapshotDuration: payload.snapshotDuration.toFixed(1),
        domDuration: payload.domDuration.toFixed(1),
        renderedRowCount: payload.renderedRowCount,
        renderTaskCount: payload.renderTaskCount,
        svgNodeCount: payload.svgNodeCount,
        sliced: payload.sliced === true
      }
    },
    renderTask({ task }) {
      return `
        <div class="dense-task dense-task--${escapeHtml(task.status || 'normal')}" title="${escapeHtml(task.title)}">
          <span>${escapeHtml(task.title)}</span>
        </div>
      `
    },
    renderTooltip({ taskRecord }) {
      return `
        <div class="dense-tooltip">
          <strong>${escapeHtml(taskRecord.title)}</strong>
          <span>开始：${escapeHtml(taskRecord.startDate)}</span>
          <span>结束：${escapeHtml(taskRecord.endDate)}</span>
          <span>状态：${escapeHtml(taskRecord.status || 'normal')}</span>
        </div>
      `
    }
  }
}
</script>

<style>
.dense-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.dense-toolbar,
.dense-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #dbe6ea;
  background: #fff;
}

.dense-toolbar {
  border-bottom: 0;
}

.dense-metrics {
  min-height: 38px;
  border-bottom: 0;
  color: #41555d;
  font-size: 12px;
}

.dense-metrics span {
  padding: 3px 8px;
  border-radius: 3px;
  background: #eef6f7;
}

.dense-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #53646b;
  font-size: 13px;
}

.dense-toolbar select,
.dense-toolbar input,
.dense-toolbar button {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #cdd9de;
  border-radius: 4px;
  background: #fff;
  color: #30444c;
}

.dense-toolbar input {
  width: 92px;
}

.dense-toolbar button {
  cursor: pointer;
}

.dense-toolbar strong {
  color: #176b87;
  font-size: 13px;
}

.dense-chart {
  min-height: 0;
  flex: 1;
  border: 1px solid #dbe6ea;
}

.dense-task {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  background: #63c6bd;
  color: transparent;
  overflow: hidden;
}

.dense-task--hot {
  background: #f1a64b;
}

.dense-task--sparse {
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 4px;
  background: #dff4f1;
  color: #254047;
  font-size: 12px;
}

.dense-task span {
  white-space: nowrap;
}

.dense-tooltip {
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #cfe1df;
  border-radius: 4px;
  background: #fff;
  color: #33474d;
  box-shadow: 0 10px 26px rgba(30, 54, 59, 0.14);
  font-size: 12px;
}

.dense-tooltip strong {
  color: #173b3f;
  font-size: 13px;
}

.dense-tooltip span {
  color: #5f7378;
  line-height: 1.4;
}
</style>
