<template>
  <section class="demo-view">
    <div class="demo-toolbar">
      <label>
        <span>开始</span>
        <input v-model="start" type="datetime-local" />
      </label>
      <label>
        <span>结束</span>
        <input v-model="end" type="datetime-local" />
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

const scaleOptions = createScaleOptions()

export default {
  name: 'WorkOrderStatusDemo',
  data() {
    const rows = this.createRows()
    const tasks = this.createTasks()

    return {
      rows,
      tasks,
      blocks: this.createBlocks(),
      links: [
        {
          id: 'delay-link',
          fromRowId: 'heat-2',
          toRowId: 'heat-2',
          fromTime: '2026-04-01T00:50:00',
          toTime: '2026-04-01T06:10:00',
          fromY: 46,
          toY: 46,
          color: '#40c51b',
          dashed: true
        }
      ],
      restRanges: [
        this.rest('stop-1', '2026-03-30T19:00:00', '2026-03-31T05:00:00', '#fdeeee'),
        this.rest('freeze-1', '2026-03-30T06:30:00', '2026-03-30T12:30:00', '#ececec')
      ],
      lanes: [
        { key: 'plan', offset: 8, height: 58 },
        { key: 'load', offset: 70, height: 6 },
        { key: 'unload', offset: 82, height: 6 }
      ],
      start: '2026-03-30T02:00',
      end: '2026-04-01T08:00',
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
  computed: {
    timeScale() {
      return this.scaleOptions.find(scale => scale.key === this.scaleKey).value
    }
  },
  watch: {
    start: 'syncGantt',
    end: 'syncGantt',
    scaleKey: 'syncGantt'
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.createOptions())
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    createOptions() {
      return {
        rows: this.rows,
        tasks: this.tasks,
        blocks: this.blocks,
        links: this.links,
        restRanges: this.restRanges,
        start: this.start,
        end: this.end,
        now: '2026-03-30T12:00',
        timeScale: this.timeScale,
        rowHeight: 92,
        leftWidth: 150,
        lanes: this.lanes,
        renderTask: this.renderTask
      }
    },
    syncGantt() {
      if (this.gantt) this.gantt.setOptions(this.createOptions())
    },
    createRows() {
      return [
        {
          id: 'heat',
          name: '热处理',
          type: 'group',
          expanded: true,
          height: 48,
          children: [
            { id: 'heat-1', name: '热处理炉1', height: 92 },
            { id: 'heat-2', name: '热处理炉1', height: 92 },
            { id: 'heat-3', name: '热处理炉1', height: 92 },
            { id: 'heat-4', name: '热处理炉1', height: 92 }
          ]
        },
        {
          id: 'outside',
          name: '外协加工',
          type: 'group',
          expanded: true,
          height: 48,
          children: [
            { id: 'outside-1', name: '外协加工1', height: 92 },
            { id: 'outside-2', name: '外协加工2', height: 92 }
          ]
        }
      ]
    },
    createTasks() {
      const plans = [
        this.plan('wo-1', 'heat-1', '产品图号001', '144', '2026-03-30T02:10:00', '2026-03-30T10:00:00', { completed: true }),
        this.plan('wo-2', 'heat-1', '图号001', '144', '2026-03-30T10:30:00', '2026-03-31T06:30:00', { status: 'planned', progress: 50 }),
        this.plan('wo-3', 'heat-1', '图号001', '144', '2026-03-31T07:10:00', '2026-04-01T07:40:00', { status: 'planned' }),

        this.plan('wo-4', 'heat-2', '产品图号001', '144', '2026-03-30T02:00:00', '2026-03-30T07:30:00', { status: 'blue', completed: true, workStatus: 'not-started' }),
        this.plan('wo-5', 'heat-2', '图号001', '144', '2026-03-30T08:20:00', '2026-03-31T03:10:00', { status: 'purple', workStatus: 'progress-normal' }),
        this.plan('wo-6', 'heat-2', '图号001', '144', '2026-03-31T05:10:00', '2026-04-01T07:30:00', { status: 'pink', workStatus: 'slight-delay' }),

        this.plan('wo-7', 'heat-3', '产品图号001', '144', '2026-03-30T02:00:00', '2026-03-30T08:30:00', { status: 'planned', completed: true, predecessorIncomplete: true }),
        this.plan('wo-8', 'heat-3', '图号001', '144', '2026-03-30T08:20:00', '2026-03-31T03:10:00', { status: 'planned', workStatus: 'progress-normal' }),
        this.plan('wo-9', 'heat-3', '图号001', '144', '2026-03-31T05:10:00', '2026-04-01T07:30:00', { status: 'planned', workStatus: 'severe-delay' }),

        this.plan('wo-10', 'heat-4', '产品图号001', '144', '2026-03-30T02:00:00', '2026-03-30T10:00:00', { completed: true }),
        this.plan('wo-11', 'heat-4', '图号001', '144', '2026-03-30T10:30:00', '2026-03-31T06:30:00', { status: 'planned', replan: 'before' }),
        this.plan('wo-12', 'heat-4', '图号001', '144', '2026-03-31T07:10:00', '2026-04-01T07:40:00', { status: 'planned', replan: 'after' }),

        this.plan('wo-13', 'outside-1', '外协图号001', '144', '2026-03-30T02:20:00', '2026-03-31T10:00:00', { status: 'blue', predecessorIncomplete: true }),
        this.plan('wo-14', 'outside-1', '外协图号002', '144', '2026-03-31T10:00:00', '2026-04-01T08:00:00', { status: 'purple' }),
        this.plan('wo-15', 'outside-2', '外协图号003', '144', '2026-03-30T04:30:00', '2026-03-31T02:00:00', { status: 'planned' }),
        this.plan('wo-16', 'outside-2', '外协图号004', '144', '2026-03-31T03:00:00', '2026-04-01T06:30:00', { status: 'pink' })
      ]

      return plans.concat(plans.flatMap(plan => this.logistics(plan)))
    },
    createBlocks() {
      return [
        this.block('shift-heat', 'heat', '2026-03-30T02:00:00', '2026-04-01T08:00:00', '#ffe2a8', 0.82, 8, 32),
        this.block('shift-outside', 'outside', '2026-03-30T02:00:00', '2026-04-01T08:00:00', '#cfe1ff', 0.82, 8, 32)
      ]
    },
    renderTask({ task }) {
      const node = document.createElement('div')
      node.className = [
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

      if (task.logistics) return node

      const dot = document.createElement('span')
      dot.className = 'work-task-dot'
      const title = document.createElement('div')
      title.className = 'work-task-title'
      title.textContent = task.title
      const meta = document.createElement('div')
      meta.className = 'work-task-meta'
      meta.textContent = task.subtitle || ''

      if (task.progress !== undefined) {
        const progressText = document.createElement('span')
        progressText.textContent = `（${task.progress}%）`
        meta.append(progressText)
      }

      node.append(dot, title, meta)

      if (task.progress !== undefined) {
        const progress = document.createElement('div')
        progress.className = 'work-task-progress'
        const bar = document.createElement('i')
        bar.style.width = `${task.progress}%`
        progress.append(bar)
        node.append(progress)
      }

      return node
    },
    plan(id, rowId, title, subtitle, start, end, extra = {}) {
      return {
        id,
        rowId,
        lane: 'plan',
        title,
        subtitle,
        start,
        end,
        progress: extra.progress,
        workStatus: extra.workStatus || 'progress-normal',
        ...extra
      }
    },
    logistics(plan) {
      const loadStatus = plan.completed ? 'load-done' : plan.workStatus === 'severe-delay' ? 'load-waiting' : 'load-running'
      const unloadStatus = plan.completed ? 'unload-done' : plan.workStatus === 'slight-delay' ? 'unload-waiting' : 'unload-running'

      return [
        this.logistic(`${plan.id}-load`, plan.rowId, 'load', this.addMinutes(plan.start, -150), this.addMinutes(plan.start, -20), loadStatus),
        this.logistic(`${plan.id}-unload`, plan.rowId, 'unload', this.addMinutes(plan.end, 20), this.addMinutes(plan.end, 150), unloadStatus)
      ]
    },
    logistic(id, rowId, lane, start, end, status) {
      return {
        id,
        rowId,
        lane,
        title: status,
        subtitle: '',
        start,
        end,
        status,
        logistics: true
      }
    },
    block(id, rowId, start, end, fill, opacity, offsetY, height) {
      return {
        id,
        rowId,
        start,
        end,
        fill,
        opacity,
        offsetY,
        height
      }
    },
    rest(id, start, end, fill) {
      return {
        id,
        start,
        end,
        fill,
        opacity: 1
      }
    },
    addMinutes(value, minutes) {
      const date = new Date(value)
      date.setMinutes(date.getMinutes() + minutes)
      return this.formatDateTime(date)
    },
    formatDateTime(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hour}:${minute}:00`
    }
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
