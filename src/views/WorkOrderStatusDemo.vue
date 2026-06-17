<template>
  <section class="demo-view">
    <DemoToolbar
      :start="start"
      :end="end"
      :scale-key="scaleKey"
      :scales="scaleOptions"
      @update:start="start = $event"
      @update:end="end = $event"
      @update:scale-key="scaleKey = $event"
    />
    <WorkOrderLegend />
    <div class="chart-wrap">
      <VanillaGanttHost
        :rows="rows"
        :tasks="tasks"
        :blocks="blocks"
        :links="links"
        :rest-ranges="restRanges"
        :start="start"
        :end="end"
        now="2026-03-30T12:00"
        :time-scale="timeScale"
        :row-height="92"
        :initial-left-width="150"
        :lanes="lanes"
        :render-task="renderTask"
      />
    </div>
  </section>
</template>

<script>
import VanillaGanttHost from '../components/VanillaGanttHost.vue'
import DemoToolbar from '../components/DemoToolbar.vue'
import WorkOrderLegend from '../components/demo/WorkOrderLegend.vue'
import { scaleOptions } from '../demo/timeScales'

export default {
  name: 'WorkOrderStatusDemo',
  components: {
    VanillaGanttHost,
    DemoToolbar,
    WorkOrderLegend
  },
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
      scaleOptions
    }
  },
  computed: {
    timeScale() {
      return this.scaleOptions.find(scale => scale.key === this.scaleKey).value
    }
  },
  methods: {
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
</script>

<style>
.demo-view {
  height: 100%;
  display: flex;
  flex-direction: column;
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
