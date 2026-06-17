<template>
  <section class="demo-view">
    <div class="demo-toolbar">
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
    </div>
    <div class="legend">
      <section>
        <h3>物流单状态图例</h3>
        <div v-for="item in logisticsLegend" :key="item.label" class="legend-row">
          <i class="legend-swatch" :style="{ background: item.color }"></i>
          <span>{{ item.label }}</span>
        </div>
      </section>
      <section>
        <h3>工单状态图例</h3>
        <div v-for="item in workOrderLegend" :key="item.label" class="legend-row">
          <i
            class="legend-swatch"
            :class="item.className"
            :style="{ background: item.color, borderColor: item.borderColor }"
          ></i>
          <span>{{ item.label }}</span>
        </div>
      </section>
    </div>
    <div ref="gantt" class="chart-wrap"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

function formatMinuteLabel({ startDate }) {
  return `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
}

const timelineMajorStyle = { backgroundColor: '#eaf3f8', color: '#2f4858', fontWeight: '700' }
const timelineMinorStyle = { backgroundColor: '#f7fbfd', color: '#53666f' }

const scaleOptions = [
  { key: '15m', label: '15分钟', value: [{ unit: 'day', step: 1, rowHeight: 24, style: timelineMajorStyle }, { unit: 'minute', step: 15, colWidth: 48, rowHeight: 24, format: formatMinuteLabel, style: timelineMinorStyle }] },
  { key: '1h', label: '1小时', value: [{ unit: 'day', step: 1, rowHeight: 24, style: timelineMajorStyle }, { unit: 'hour', step: 1, colWidth: 40, rowHeight: 24, style: timelineMinorStyle }] },
  { key: '2h', label: '2小时', value: [{ unit: 'day', step: 1, rowHeight: 24, style: timelineMajorStyle }, { unit: 'hour', step: 2, colWidth: 64, rowHeight: 24, style: timelineMinorStyle }] },
  { key: '4h', label: '4小时', value: [{ unit: 'day', step: 1, rowHeight: 24, style: timelineMajorStyle }, { unit: 'hour', step: 4, colWidth: 72, rowHeight: 24, style: timelineMinorStyle }] },
  { key: 'day', label: '天', value: [{ unit: 'month', step: 1, rowHeight: 24, style: timelineMajorStyle }, { unit: 'day', step: 1, colWidth: 120, rowHeight: 24, style: timelineMinorStyle }] },
  { key: 'week', label: '周', value: [{ unit: 'month', step: 1, rowHeight: 24, style: timelineMajorStyle }, { unit: 'week', step: 1, colWidth: 180, rowHeight: 24, style: timelineMinorStyle }] },
  { key: 'month', label: '月', value: [{ unit: 'year', step: 1, rowHeight: 24, style: timelineMajorStyle }, { unit: 'month', step: 1, colWidth: 220, rowHeight: 24, style: timelineMinorStyle }] },
  { key: 'year', label: '年', value: [{ unit: 'year', step: 1, colWidth: 260, rowHeight: 48, style: timelineMajorStyle }] }
]

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTooltipDate(date) {
  const value = date instanceof Date ? date : new Date(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

export default {
  name: 'WorkOrderStatusDemo',
  data() {
    return {
      options: {
        minDate: '2026-03-30T02:00',
        maxDate: '2026-04-01T08:00',
        rowHeight: 92,
        markLine: {
          date: '2026-03-30T12:00',
          style: { lineColor: '#35cce0' }
        },
        taskListTable: {
          tableWidth: 'auto',
          headerStyle: {
            backgroundColor: '#eaf3f8',
            color: '#2f4858'
          },
          columns: [
            { field: 'name', title: '资源', width: 140, minWidth: 100, tree: true },
            { title: '工序', width: 78, minWidth: 64, valueGetter: this.getRecordStage },
            { title: '任务数', width: 70, minWidth: 60, align: 'right', headerAlign: 'right', valueGetter: this.getRecordTaskCount },
            { title: '状态', width: 86, minWidth: 72, headerStyle: { backgroundColor: '#dcecf4' }, valueGetter: this.getRecordStatus, renderCell: this.renderRecordStatus }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f7fbfd',
          scales: scaleOptions.find(scale => scale.key === '2h').value
        },
        taskBar: {
          customLayout: this.renderTask,
          draggable: ({ task }) => !task.logistics && !task.parentAggregate,
          dragStep: 5 * 60 * 1000,
          tooltip: {
            visible: true,
            customLayout: this.renderTaskTooltip
          },
          lanes: [
            { key: 'plan', offset: 8, height: 58 },
            { key: 'load', offset: 70, height: 6 },
            { key: 'unload', offset: 82, height: 6 }
          ]
        },
        dependency: {
          showLinks: false,
          highlightConnected: true,
          dimOpacity: 0.18,
          links: [
            { id: 'heat-flow-1', type: 'finish_to_start', from: 'wo-1', to: ['wo-2', 'wo-17'], color: '#168dff' },
            { id: 'heat-flow-2', type: 'finish_to_start', from: 'wo-5', to: ['wo-6', 'wo-18'], color: '#168dff' },
            { id: 'outside-flow', type: 'finish_to_start', from: 'wo-13', to: 'wo-14', color: '#40c51b', dashed: true }
          ]
        },
        grid: {
          backgroundRanges: [
            { id: 'stop-1', startDate: '2026-03-30T19:00:00', endDate: '2026-03-31T05:00:00', fill: '#fdeeee', opacity: 1 },
            { id: 'freeze-1', startDate: '2026-03-30T06:30:00', endDate: '2026-03-30T12:30:00', fill: '#ececec', opacity: 1 }
          ],
          rowBackgroundRanges: [
            { id: 'shift-heat', recordKey: 'heat', startDate: '2026-03-30T02:00:00', endDate: '2026-04-01T08:00:00', fill: '#ffe2a8', opacity: 0.82, offsetY: 8, height: 32 },
            { id: 'shift-outside', recordKey: 'outside', startDate: '2026-03-30T02:00:00', endDate: '2026-04-01T08:00:00', fill: '#cfe1ff', opacity: 0.82, offsetY: 8, height: 32 }
          ]
        },
        records: [
          {
            id: 'heat',
            name: '热处理',
            type: 'group',
            expanded: true,
            height: 48,
            children: [
              {
                id: 'heat-1',
                name: '热处理炉1',
                height: 92,
                tasks: [
                  { id: 'wo-1', lane: 'plan', title: '产品图号001', subtitle: '144', startDate: '2026-03-30T02:10:00', endDate: '2026-03-30T10:00:00', completed: true, workStatus: 'progress-normal' },
                  { id: 'wo-1-load', lane: 'load', title: 'load-done', startDate: '2026-03-30T02:00:00', endDate: '2026-03-30T03:00:00', status: 'load-done', logistics: true },
                  { id: 'wo-1-unload', lane: 'unload', title: 'unload-done', startDate: '2026-03-30T10:20:00', endDate: '2026-03-30T12:30:00', status: 'unload-done', logistics: true },
                  { id: 'wo-2', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-30T10:30:00', endDate: '2026-03-31T06:30:00', status: 'planned', progress: 50, workStatus: 'progress-normal' },
                  { id: 'wo-2-load', lane: 'load', title: 'load-running', startDate: '2026-03-30T08:00:00', endDate: '2026-03-30T10:10:00', status: 'load-running', logistics: true },
                  { id: 'wo-2-unload', lane: 'unload', title: 'unload-running', startDate: '2026-03-31T06:50:00', endDate: '2026-03-31T09:00:00', status: 'unload-running', logistics: true },
                  { id: 'wo-3', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-31T07:10:00', endDate: '2026-04-01T07:40:00', status: 'planned', workStatus: 'progress-normal' },
                  { id: 'wo-3-load', lane: 'load', title: 'load-waiting', startDate: '2026-03-31T04:40:00', endDate: '2026-03-31T06:50:00', status: 'load-waiting', logistics: true },
                  { id: 'wo-3-unload', lane: 'unload', title: 'unload-waiting', startDate: '2026-04-01T07:55:00', endDate: '2026-04-01T08:00:00', status: 'unload-waiting', logistics: true }
                ]
              },
              {
                id: 'heat-2',
                name: '热处理炉1',
                height: 92,
                tasks: [
                  { id: 'wo-4', lane: 'plan', title: '产品图号001', subtitle: '144', startDate: '2026-03-30T02:00:00', endDate: '2026-03-30T07:30:00', status: 'blue', completed: true, workStatus: 'not-started' },
                  { id: 'wo-5', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-30T08:20:00', endDate: '2026-03-31T03:10:00', status: 'purple', workStatus: 'progress-normal' },
                  { id: 'wo-5-load', lane: 'load', title: 'load-running', startDate: '2026-03-30T05:50:00', endDate: '2026-03-30T08:00:00', status: 'load-running', logistics: true },
                  { id: 'wo-5-unload', lane: 'unload', title: 'unload-running', startDate: '2026-03-31T03:30:00', endDate: '2026-03-31T05:40:00', status: 'unload-running', logistics: true },
                  { id: 'wo-6', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-31T05:10:00', endDate: '2026-04-01T07:30:00', status: 'pink', workStatus: 'slight-delay' },
                  { id: 'wo-6-load', lane: 'load', title: 'load-running', startDate: '2026-03-31T02:40:00', endDate: '2026-03-31T04:50:00', status: 'load-running', logistics: true },
                  { id: 'wo-6-unload', lane: 'unload', title: 'unload-waiting', startDate: '2026-04-01T07:50:00', endDate: '2026-04-01T08:00:00', status: 'unload-waiting', logistics: true }
                ]
              },
              {
                id: 'heat-3',
                name: '热处理炉1',
                height: 92,
                tasks: [
                  { id: 'wo-7', lane: 'plan', title: '产品图号001', subtitle: '144', startDate: '2026-03-30T02:00:00', endDate: '2026-03-30T08:30:00', status: 'planned', completed: true, predecessorIncomplete: true, workStatus: 'progress-normal' },
                  { id: 'wo-8', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-30T08:20:00', endDate: '2026-03-31T03:10:00', status: 'planned', workStatus: 'progress-normal' },
                  { id: 'wo-9', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-31T05:10:00', endDate: '2026-04-01T07:30:00', status: 'planned', workStatus: 'severe-delay' }
                ]
              },
              {
                id: 'heat-4',
                name: '热处理炉1',
                height: 92,
                tasks: [
                  { id: 'wo-10', lane: 'plan', title: '产品图号001', subtitle: '144', startDate: '2026-03-30T02:00:00', endDate: '2026-03-30T10:00:00', completed: true, workStatus: 'progress-normal' },
                  { id: 'wo-11', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-30T10:30:00', endDate: '2026-03-31T06:30:00', status: 'planned', replan: 'before', workStatus: 'progress-normal' },
                  { id: 'wo-12', lane: 'plan', title: '图号001', subtitle: '144', startDate: '2026-03-31T07:10:00', endDate: '2026-04-01T07:40:00', status: 'planned', replan: 'after', workStatus: 'progress-normal' }
                ]
              }
            ]
          },
          {
            id: 'outside',
            name: '外协加工',
            type: 'group',
            expanded: true,
            height: 48,
            children: [
              {
                id: 'outside-1',
                name: '外协加工1',
                height: 92,
                tasks: [
                  { id: 'wo-13', lane: 'plan', title: '外协图号001', subtitle: '144', startDate: '2026-03-30T02:20:00', endDate: '2026-03-31T10:00:00', status: 'blue', predecessorIncomplete: true, workStatus: 'progress-normal' },
                  { id: 'wo-14', lane: 'plan', title: '外协图号002', subtitle: '144', startDate: '2026-03-31T10:00:00', endDate: '2026-04-01T08:00:00', status: 'purple', workStatus: 'progress-normal' }
                ]
              },
              {
                id: 'outside-2',
                name: '外协加工2',
                height: 92,
                tasks: [
                  { id: 'wo-15', lane: 'plan', title: '外协图号003', subtitle: '144', startDate: '2026-03-30T04:30:00', endDate: '2026-03-31T02:00:00', status: 'planned', workStatus: 'progress-normal' },
                  { id: 'wo-16', lane: 'plan', title: '外协图号004', subtitle: '144', startDate: '2026-03-31T03:00:00', endDate: '2026-04-01T06:30:00', status: 'pink', workStatus: 'slight-delay' }
                ]
              }
            ]
          },
          {
            id: 'single-plan-a',
            name: '计划任务A',
            stage: '计划',
            height: 92,
            tasks: [
              { id: 'wo-17', lane: 'plan', title: '补充计划001', subtitle: '96', startDate: '2026-03-30T15:30:00', endDate: '2026-03-31T00:30:00', status: 'planned', progress: 35, workStatus: 'progress-normal' }
            ]
          },
          {
            id: 'single-plan-b',
            name: '计划任务B',
            stage: '计划',
            height: 92,
            tasks: [
              { id: 'wo-18', lane: 'plan', title: '补充计划002', subtitle: '120', startDate: '2026-03-31T12:30:00', endDate: '2026-04-01T06:00:00', status: 'blue', workStatus: 'slight-delay' }
            ]
          }
        ]
      },
      scaleKey: '2h',
      scaleOptions,
      gantt: null,
      logisticsLegend: [
        { label: '上料物流单已完成', color: '#d9d9d9' },
        { label: '上料物流单执行中', color: '#2f9bff' },
        { label: '上料物流单待执行', color: '#bfe7ff' },
        { label: '下料物流单已完成', color: '#969696' },
        { label: '下料物流单执行中', color: '#9652e6' },
        { label: '下料物流单待执行', color: '#eadbff' }
      ],
      workOrderLegend: [
        { label: '未开启', color: '#d8d8d8', className: 'legend-dot' },
        { label: '进度正常', color: '#40c51b', className: 'legend-dot' },
        { label: '轻微滞后', color: '#ffa51d', className: 'legend-dot' },
        { label: '严重滞后', color: '#ff4756', className: 'legend-dot' },
        { label: '已完成工单', color: '#fff', className: 'legend-striped' },
        { label: '前序外协未完成', color: '#ffe8bd' },
        { label: '重排前移', color: '#fff', borderColor: '#40c51b' },
        { label: '重排后移', color: '#fff', borderColor: '#ff4b55' },
        { label: '非班次时间', color: '#ffffff', borderColor: '#edf1f2' },
        { label: '班次时间', color: '#f2f3f3' },
        { label: '冻结区非班次时间', color: '#d7d7d7' },
        { label: '冻结区班次时间', color: '#bdbdbd' },
        { label: '停机时间', color: '#fdeeee' }
      ]
    }
  },
  watch: {
    'options.minDate': 'syncGantt',
    'options.maxDate': 'syncGantt',
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
    getRecordStage({ row }) {
      if (row.stage) return row.stage
      if (row.type === 'group') return row.name || ''
      if (String(row.id).startsWith('outside')) return '外协'
      if (String(row.id).startsWith('heat')) return '热处理'
      return ''
    },
    getRecordTaskCount({ row }) {
      if (!row.tasks || !row.tasks.length) return ''
      return row.tasks.filter(task => !task.logistics).length
    },
    getRecordStatus({ row }) {
      const tasks = row.tasks || []
      if (!tasks.length) return row.children ? '分组' : ''
      if (tasks.some(task => task.workStatus === 'severe-delay')) return '严重滞后'
      if (tasks.some(task => task.workStatus === 'slight-delay')) return '轻微滞后'
      if (tasks.every(task => task.completed)) return '已完成'
      return '正常'
    },
    renderRecordStatus({ value }) {
      if (!value) return ''
      const className = `record-status record-status--${String(value).replace(/\s+/g, '-')}`
      return `<span class="${escapeHtml(className)}">${escapeHtml(value)}</span>`
    },
    renderTask({ task }) {
      const className = [
        'work-task',
        `work-task--${task.status || 'normal'}`,
        `work-task--${task.workStatus || 'progress-normal'}`,
        task.logistics ? 'work-task--logistics' : '',
        task.completed ? 'work-task--completed' : '',
        task.predecessorIncomplete ? 'work-task--predecessor' : '',
        task.replan === 'before' ? 'work-task--before' : '',
        task.replan === 'after' ? 'work-task--after' : '',
        task.parentAggregate ? 'work-task--aggregate' : ''
      ].filter(Boolean).join(' ')

      if (task.logistics) {
        return `<div class="${escapeHtml(className)}"></div>`
      }

      const progressWidth = Math.max(0, Math.min(100, Number(task.progress) || 0))
      const progressText = task.progress !== undefined ? `<span>（${escapeHtml(task.progress)}%）</span>` : ''
      const progressBar = task.progress !== undefined
        ? `<div class="work-task-progress"><i style="width:${progressWidth}%"></i></div>`
        : ''

      return `
        <div class="${escapeHtml(className)}">
          <span class="work-task-dot"></span>
          <div class="work-task-title">${escapeHtml(task.title)}</div>
          <div class="work-task-meta">${escapeHtml(task.subtitle)}${progressText}</div>
          ${progressBar}
        </div>
      `
    },
    renderTaskTooltip({ task, row, startDate, endDate }) {
      return `
        <div class="work-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(row && row.name)} / ${escapeHtml(task.subtitle)}</span>
          <time>${escapeHtml(formatTooltipDate(startDate))} - ${escapeHtml(formatTooltipDate(endDate))}</time>
        </div>
      `
    }
  }
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

.legend {
  display: grid;
  grid-template-columns: 210px 230px;
  gap: 22px;
  padding: 10px 14px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.legend h3 {
  margin-bottom: 8px;
  color: #7a8588;
  font-size: 14px;
  font-weight: 700;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
  color: #586367;
  font-size: 13px;
}

.legend-swatch {
  width: 20px;
  height: 16px;
  border: 2px solid transparent;
}

.legend-dot {
  width: 10px;
  height: 10px;
  margin-left: 5px;
  border-radius: 50%;
}

.legend-striped {
  background-image: repeating-linear-gradient(
    45deg,
    #8f8f8f 0,
    #8f8f8f 2px,
    transparent 2px,
    transparent 8px
  );
}

.chart-wrap {
  min-height: 0;
  flex: 1;
}

.record-status {
  display: inline-flex;
  align-items: center;
  height: 20px;
  max-width: 100%;
  padding: 0 6px;
  border-radius: 3px;
  background: #edf6f5;
  color: #53706c;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-status--正常,
.record-status--已完成 {
  background: #e8f7e9;
  color: #2e8a3d;
}

.record-status--轻微滞后 {
  background: #fff3dc;
  color: #a76709;
}

.record-status--严重滞后 {
  background: #ffe8ea;
  color: #c9333f;
}

.record-status--分组 {
  background: #eef3f4;
  color: #6d7b7f;
}

.work-task {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(35, 101, 94, 0.12);
  background: #a8eee5;
  color: #27413e;
  overflow: hidden;
}

.work-task--planned {
  background: #fff0b5;
}

.work-task--blue {
  background: #bfe7ff;
}

.work-task--pink {
  background: #ffd9e8;
}

.work-task--purple {
  background: #ecd9ff;
}

.work-task--predecessor::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  background: #ffe8bd;
}

.work-task--completed {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(41, 164, 154, 0.24) 0,
    rgba(41, 164, 154, 0.24) 2px,
    transparent 2px,
    transparent 8px
  );
}

.work-task--before {
  border: 2px solid #40c51b;
}

.work-task--after {
  border: 2px solid #ff4b55;
}

.work-task-title {
  position: relative;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  line-height: 1.2;
}

.work-task-meta {
  position: relative;
  z-index: 1;
  margin-top: 7px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  line-height: 1.15;
}

.work-task-meta span {
  color: #41c51b;
}

.work-task-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #40c51b;
}

.work-task--not-started .work-task-dot {
  background: #d8d8d8;
}

.work-task--slight-delay .work-task-dot {
  background: #ffa51d;
}

.work-task--severe-delay .work-task-dot {
  background: #ff4756;
}

.work-task-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  background: #d9d9d9;
}

.work-task-progress i {
  display: block;
  height: 100%;
  background: #40c51b;
}

.work-task--logistics {
  padding: 0;
  border: 0;
  font-size: 0;
}

.work-task--load-done {
  background: #d9d9d9;
}

.work-task--load-running {
  background: #2f9bff;
}

.work-task--load-waiting {
  background: #bfe7ff;
}

.work-task--unload-done {
  background: #969696;
}

.work-task--unload-running {
  background: #9652e6;
}

.work-task--unload-waiting {
  background: #eadbff;
}

.work-task--aggregate .work-task-title {
  font-size: 14px;
}

.work-task--aggregate .work-task-meta {
  font-size: 13px;
}
</style>
