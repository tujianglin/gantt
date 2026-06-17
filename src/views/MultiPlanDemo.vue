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
        :row-height="132"
        :lanes="lanes"
      />
    </div>
  </section>
</template>

<script>
import GanttChart from '../components/GanttChart.vue'
import DemoToolbar from '../components/DemoToolbar.vue'
import { scaleOptions } from '../demo/timeScales'

export default {
  name: 'MultiPlanDemo',
  components: {
    GanttChart,
    DemoToolbar
  },
  data() {
    return {
      rows: [
        {
          id: 'heat-group',
          name: '热处理',
          type: 'group',
          expanded: true,
          height: 132,
          children: [
            { id: 'unit-a', name: '机组单元A', load: 92, height: 132 },
            { id: 'unit-b', name: '机组单元B', load: 76, height: 132 },
            { id: 'unit-c', name: '机组单元C', load: 58, height: 132 }
          ]
        }
      ],
      tasks: this.createTasks(),
      blocks: [],
      links: [],
      restRanges: [
        this.rest('rest-1', '2026-03-30T11:40:00', '2026-03-30T12:35:00'),
        this.rest('rest-2', '2026-03-31T02:10:00', '2026-03-31T03:25:00')
      ],
      lanes: [
        { key: 'plan-1', offset: 8, height: 26 },
        { key: 'load-1', offset: 39, height: 6 },
        { key: 'unload-1', offset: 50, height: 6 },
        { key: 'plan-2', offset: 62, height: 26 },
        { key: 'load-2', offset: 93, height: 6 },
        { key: 'unload-2', offset: 104, height: 6 }
      ],
      start: '2026-03-30T02:00',
      end: '2026-03-31T18:00',
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
    createTasks() {
      const plans = [
        this.plan('p1', 'unit-a', 'plan-1', '产品图号001', '144', '2026-03-30T06:00:00', '2026-03-30T12:00:00', { striped: true }),
        this.plan('p2', 'unit-a', 'plan-2', '产品图号002', '80', '2026-03-30T08:30:00', '2026-03-30T15:30:00', { status: 'planned' }),
        this.plan('p3', 'unit-a', 'plan-1', '产品图号003', '120', '2026-03-31T00:30:00', '2026-03-31T08:00:00'),
        this.plan('p4', 'unit-a', 'plan-2', '产品图号004', '96', '2026-03-31T03:00:00', '2026-03-31T12:30:00', { status: 'blue' }),

        this.plan('p5', 'unit-b', 'plan-1', '产品图号005', '144', '2026-03-30T05:00:00', '2026-03-30T11:45:00', { status: 'planned', striped: true }),
        this.plan('p6', 'unit-b', 'plan-2', '产品图号006', '100', '2026-03-30T13:00:00', '2026-03-30T22:30:00'),
        this.plan('p7', 'unit-b', 'plan-1', '产品图号007', '72', '2026-03-31T01:30:00', '2026-03-31T07:10:00', { status: 'selected' }),
        this.plan('p8', 'unit-b', 'plan-2', '产品图号008', '88', '2026-03-31T07:30:00', '2026-03-31T15:00:00', { status: 'warning' }),

        this.plan('p9', 'unit-c', 'plan-1', '产品图号009', '60', '2026-03-30T07:20:00', '2026-03-30T16:00:00'),
        this.plan('p10', 'unit-c', 'plan-2', '产品图号010', '120', '2026-03-30T10:40:00', '2026-03-30T18:20:00', { status: 'planned' }),
        this.plan('p11', 'unit-c', 'plan-1', '产品图号011', '144', '2026-03-31T02:40:00', '2026-03-31T11:20:00', { status: 'blue' })
      ]

      return plans.concat(plans.flatMap(plan => this.handlingTasks(plan)))
    },
    plan(id, rowId, lane, title, subtitle, start, end, extra = {}) {
      return {
        id,
        rowId,
        lane,
        title,
        subtitle,
        start,
        end,
        ...extra
      }
    },
    handlingTasks(plan) {
      const index = plan.lane.split('-')[1]
      return [
        this.plan(`${plan.id}-load`, plan.rowId, `load-${index}`, '上料', plan.title, this.addMinutes(plan.start, -110), this.addMinutes(plan.start, -20), { status: 'load' }),
        this.plan(`${plan.id}-unload`, plan.rowId, `unload-${index}`, '下料', plan.title, this.addMinutes(plan.end, 20), this.addMinutes(plan.end, 120), { status: 'unload' })
      ]
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
    },
    rest(id, start, end) {
      return {
        id,
        start,
        end,
        fill: '#e4eaea',
        opacity: 1
      }
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
