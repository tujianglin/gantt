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
    <div ref="gantt" class="chart-wrap"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const scaleOptions = createScaleOptions()

export default {
  name: 'MultiPlanDemo',
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
      scaleOptions,
      gantt: null
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
        rowHeight: 132,
        lanes: this.lanes
      }
    },
    syncGantt() {
      if (this.gantt) this.gantt.setOptions(this.createOptions())
    },
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
      return { id, rowId, lane, title, subtitle, start, end, ...extra }
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
      return { id, start, end, fill: '#e4eaea', opacity: 1 }
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

<style scoped>
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

.chart-wrap {
  min-height: 0;
  flex: 1;
}
</style>
