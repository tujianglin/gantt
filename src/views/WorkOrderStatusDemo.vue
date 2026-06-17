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
      <GanttChart
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
        :task-component="taskComponent"
      />
    </div>
  </section>
</template>

<script>
import GanttChart from '../components/GanttChart.vue'
import DemoToolbar from '../components/DemoToolbar.vue'
import WorkOrderLegend from '../components/demo/WorkOrderLegend.vue'
import WorkOrderTask from '../components/demo/WorkOrderTask.vue'
import { scaleOptions } from '../demo/timeScales'

export default {
  name: 'WorkOrderStatusDemo',
  components: {
    GanttChart,
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
      scaleOptions,
      taskComponent: WorkOrderTask
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

<style scoped>
.demo-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-wrap {
  min-height: 0;
  flex: 1;
}
</style>
