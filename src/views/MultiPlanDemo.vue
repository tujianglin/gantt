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
    <div ref="gantt" class="chart-wrap"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const scaleOptions = [
  { key: '1h', label: '1小时', value: [{ unit: 'day', step: 1, rowHeight: 24 }, { unit: 'hour', step: 1, colWidth: 40, rowHeight: 24 }] },
  { key: '2h', label: '2小时', value: [{ unit: 'day', step: 1, rowHeight: 24 }, { unit: 'hour', step: 2, colWidth: 64, rowHeight: 24 }] },
  { key: '4h', label: '4小时', value: [{ unit: 'day', step: 1, rowHeight: 24 }, { unit: 'hour', step: 4, colWidth: 72, rowHeight: 24 }] },
  { key: 'day', label: '天', value: [{ unit: 'month', step: 1, rowHeight: 24 }, { unit: 'day', step: 1, colWidth: 120, rowHeight: 24 }] },
  { key: 'week', label: '周', value: [{ unit: 'month', step: 1, rowHeight: 24 }, { unit: 'week', step: 1, colWidth: 180, rowHeight: 24 }] },
  { key: 'month', label: '月', value: [{ unit: 'year', step: 1, rowHeight: 24 }, { unit: 'month', step: 1, colWidth: 220, rowHeight: 24 }] },
  { key: 'year', label: '年', value: [{ unit: 'year', step: 1, colWidth: 260, rowHeight: 48 }] }
]

export default {
  name: 'MultiPlanDemo',
  data() {
    return {
      options: {
        minDate: '2026-03-30T02:00',
        maxDate: '2026-03-31T18:00',
        rowHeight: 132,
        markLine: {
          date: '2026-03-30T12:00',
          style: { lineColor: '#35cce0' }
        },
        taskListTable: {
          tableWidth: 'auto',
          columns: [
            { field: 'name', title: '机组单元', width: 150, tree: true },
            { field: 'load', title: '负载', width: 78 }
          ]
        },
        timelineHeader: {
          scales: scaleOptions[1].value
        },
        dependency: {
          links: []
        },
        grid: {
          backgroundRanges: [
            { id: 'rest-1', startDate: '2026-03-30T11:40:00', endDate: '2026-03-30T12:35:00', fill: '#e4eaea', opacity: 1 },
            { id: 'rest-2', startDate: '2026-03-31T02:10:00', endDate: '2026-03-31T03:25:00', fill: '#e4eaea', opacity: 1 }
          ],
          rowBackgroundRanges: []
        },
        taskBar: {
          lanes: [
            { key: 'plan-1', offset: 8, height: 26 },
            { key: 'load-1', offset: 39, height: 6 },
            { key: 'unload-1', offset: 50, height: 6 },
            { key: 'plan-2', offset: 62, height: 26 },
            { key: 'load-2', offset: 93, height: 6 },
            { key: 'unload-2', offset: 104, height: 6 }
          ]
        },
        records: [
          {
            id: 'heat-group',
            name: '热处理',
            type: 'group',
            expanded: true,
            height: 132,
            children: [
              {
                id: 'unit-a',
                name: '机组单元A',
                load: 92,
                height: 132,
                tasks: [
                  { id: 'p1', lane: 'plan-1', title: '产品图号001', subtitle: '144', startDate: '2026-03-30T06:00:00', endDate: '2026-03-30T12:00:00', striped: true },
                  { id: 'p1-load', lane: 'load-1', title: '上料', subtitle: '产品图号001', startDate: '2026-03-30T04:10:00', endDate: '2026-03-30T05:40:00', status: 'load' },
                  { id: 'p1-unload', lane: 'unload-1', title: '下料', subtitle: '产品图号001', startDate: '2026-03-30T12:20:00', endDate: '2026-03-30T14:00:00', status: 'unload' },
                  { id: 'p2', lane: 'plan-2', title: '产品图号002', subtitle: '80', startDate: '2026-03-30T08:30:00', endDate: '2026-03-30T15:30:00', status: 'planned' },
                  { id: 'p2-load', lane: 'load-2', title: '上料', subtitle: '产品图号002', startDate: '2026-03-30T06:40:00', endDate: '2026-03-30T08:10:00', status: 'load' },
                  { id: 'p2-unload', lane: 'unload-2', title: '下料', subtitle: '产品图号002', startDate: '2026-03-30T15:50:00', endDate: '2026-03-30T17:30:00', status: 'unload' },
                  { id: 'p3', lane: 'plan-1', title: '产品图号003', subtitle: '120', startDate: '2026-03-31T00:30:00', endDate: '2026-03-31T08:00:00' },
                  { id: 'p3-load', lane: 'load-1', title: '上料', subtitle: '产品图号003', startDate: '2026-03-30T22:40:00', endDate: '2026-03-31T00:10:00', status: 'load' },
                  { id: 'p3-unload', lane: 'unload-1', title: '下料', subtitle: '产品图号003', startDate: '2026-03-31T08:20:00', endDate: '2026-03-31T10:00:00', status: 'unload' },
                  { id: 'p4', lane: 'plan-2', title: '产品图号004', subtitle: '96', startDate: '2026-03-31T03:00:00', endDate: '2026-03-31T12:30:00', status: 'blue' },
                  { id: 'p4-load', lane: 'load-2', title: '上料', subtitle: '产品图号004', startDate: '2026-03-31T01:10:00', endDate: '2026-03-31T02:40:00', status: 'load' },
                  { id: 'p4-unload', lane: 'unload-2', title: '下料', subtitle: '产品图号004', startDate: '2026-03-31T12:50:00', endDate: '2026-03-31T14:30:00', status: 'unload' }
                ]
              },
              {
                id: 'unit-b',
                name: '机组单元B',
                load: 76,
                height: 132,
                tasks: [
                  { id: 'p5', lane: 'plan-1', title: '产品图号005', subtitle: '144', startDate: '2026-03-30T05:00:00', endDate: '2026-03-30T11:45:00', status: 'planned', striped: true },
                  { id: 'p5-load', lane: 'load-1', title: '上料', subtitle: '产品图号005', startDate: '2026-03-30T03:10:00', endDate: '2026-03-30T04:40:00', status: 'load' },
                  { id: 'p5-unload', lane: 'unload-1', title: '下料', subtitle: '产品图号005', startDate: '2026-03-30T12:05:00', endDate: '2026-03-30T13:45:00', status: 'unload' },
                  { id: 'p6', lane: 'plan-2', title: '产品图号006', subtitle: '100', startDate: '2026-03-30T13:00:00', endDate: '2026-03-30T22:30:00' },
                  { id: 'p6-load', lane: 'load-2', title: '上料', subtitle: '产品图号006', startDate: '2026-03-30T11:10:00', endDate: '2026-03-30T12:40:00', status: 'load' },
                  { id: 'p6-unload', lane: 'unload-2', title: '下料', subtitle: '产品图号006', startDate: '2026-03-30T22:50:00', endDate: '2026-03-31T00:30:00', status: 'unload' },
                  { id: 'p7', lane: 'plan-1', title: '产品图号007', subtitle: '72', startDate: '2026-03-31T01:30:00', endDate: '2026-03-31T07:10:00', status: 'selected' },
                  { id: 'p7-load', lane: 'load-1', title: '上料', subtitle: '产品图号007', startDate: '2026-03-30T23:40:00', endDate: '2026-03-31T01:10:00', status: 'load' },
                  { id: 'p7-unload', lane: 'unload-1', title: '下料', subtitle: '产品图号007', startDate: '2026-03-31T07:30:00', endDate: '2026-03-31T09:10:00', status: 'unload' },
                  { id: 'p8', lane: 'plan-2', title: '产品图号008', subtitle: '88', startDate: '2026-03-31T07:30:00', endDate: '2026-03-31T15:00:00', status: 'warning' },
                  { id: 'p8-load', lane: 'load-2', title: '上料', subtitle: '产品图号008', startDate: '2026-03-31T05:40:00', endDate: '2026-03-31T07:10:00', status: 'load' },
                  { id: 'p8-unload', lane: 'unload-2', title: '下料', subtitle: '产品图号008', startDate: '2026-03-31T15:20:00', endDate: '2026-03-31T17:00:00', status: 'unload' }
                ]
              },
              {
                id: 'unit-c',
                name: '机组单元C',
                load: 58,
                height: 132,
                tasks: [
                  { id: 'p9', lane: 'plan-1', title: '产品图号009', subtitle: '60', startDate: '2026-03-30T07:20:00', endDate: '2026-03-30T16:00:00' },
                  { id: 'p9-load', lane: 'load-1', title: '上料', subtitle: '产品图号009', startDate: '2026-03-30T05:30:00', endDate: '2026-03-30T07:00:00', status: 'load' },
                  { id: 'p9-unload', lane: 'unload-1', title: '下料', subtitle: '产品图号009', startDate: '2026-03-30T16:20:00', endDate: '2026-03-30T18:00:00', status: 'unload' },
                  { id: 'p10', lane: 'plan-2', title: '产品图号010', subtitle: '120', startDate: '2026-03-30T10:40:00', endDate: '2026-03-30T18:20:00', status: 'planned' },
                  { id: 'p10-load', lane: 'load-2', title: '上料', subtitle: '产品图号010', startDate: '2026-03-30T08:50:00', endDate: '2026-03-30T10:20:00', status: 'load' },
                  { id: 'p10-unload', lane: 'unload-2', title: '下料', subtitle: '产品图号010', startDate: '2026-03-30T18:40:00', endDate: '2026-03-30T20:20:00', status: 'unload' },
                  { id: 'p11', lane: 'plan-1', title: '产品图号011', subtitle: '144', startDate: '2026-03-31T02:40:00', endDate: '2026-03-31T11:20:00', status: 'blue' },
                  { id: 'p11-load', lane: 'load-1', title: '上料', subtitle: '产品图号011', startDate: '2026-03-31T00:50:00', endDate: '2026-03-31T02:20:00', status: 'load' },
                  { id: 'p11-unload', lane: 'unload-1', title: '下料', subtitle: '产品图号011', startDate: '2026-03-31T11:40:00', endDate: '2026-03-31T13:20:00', status: 'unload' }
                ]
              }
            ]
          }
        ]
      },
      scaleKey: '2h',
      scaleOptions,
      gantt: null
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
