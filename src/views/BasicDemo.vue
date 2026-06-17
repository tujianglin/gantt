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

function formatMinuteLabel({ startDate }) {
  return `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
}

const scaleOptions = [
  { key: '15m', label: '15分钟', value: [{ unit: 'day', step: 1, rowHeight: 24 }, { unit: 'minute', step: 15, colWidth: 48, rowHeight: 24, format: formatMinuteLabel }] },
  { key: '1h', label: '1小时', value: [{ unit: 'day', step: 1, rowHeight: 24 }, { unit: 'hour', step: 1, colWidth: 40, rowHeight: 24 }] },
  { key: '2h', label: '2小时', value: [{ unit: 'day', step: 1, rowHeight: 24 }, { unit: 'hour', step: 2, colWidth: 64, rowHeight: 24 }] },
  { key: '4h', label: '4小时', value: [{ unit: 'day', step: 1, rowHeight: 24 }, { unit: 'hour', step: 4, colWidth: 72, rowHeight: 24 }] },
  { key: 'day', label: '天', value: [{ unit: 'month', step: 1, rowHeight: 24 }, { unit: 'day', step: 1, colWidth: 120, rowHeight: 24 }] },
  { key: 'week', label: '周', value: [{ unit: 'month', step: 1, rowHeight: 24 }, { unit: 'week', step: 1, colWidth: 180, rowHeight: 24 }] },
  { key: 'month', label: '月', value: [{ unit: 'year', step: 1, rowHeight: 24 }, { unit: 'month', step: 1, colWidth: 220, rowHeight: 24 }] },
  { key: 'year', label: '年', value: [{ unit: 'year', step: 1, colWidth: 260, rowHeight: 48 }] }
]

export default {
  name: 'BasicDemo',
  data() {
    return {
      options: {
        minDate: '2026-03-30T02:00',
        maxDate: '2026-04-01T18:00',
        markLine: {
          date: '2026-03-30T12:00',
          style: { lineColor: '#35cce0' }
        },
        taskListTable: {
          tableWidth: 'auto',
          columns: [
            { field: 'name', title: '工位', width: 150, tree: true },
            { field: 'load', title: '负载', width: 78, align: 'left' }
          ]
        },
        timelineHeader: {
          scales: scaleOptions.find(scale => scale.key === '2h').value
        },
        taskBar: {
          lanes: [
            { key: 'plan', offset: 8, height: 36 },
            { key: 'load', offset: 52, height: 6 },
            { key: 'unload', offset: 66, height: 6 }
          ]
        },
        dependency: {
          links: [
            { id: 'l1', type: 'finish_to_start', from: 't7', to: 't8', color: '#43c51a' },
            { id: 'l2', type: 'finish_to_start', from: 't5', to: 't4', color: '#43c51a', dashed: true }
          ]
        },
        grid: {
          backgroundRanges: [
            { id: 'rest-1', startDate: '2026-03-30T09:36:00', endDate: '2026-03-30T10:42:00', fill: '#e4eaea', opacity: 1 },
            { id: 'rest-2', startDate: '2026-03-31T20:30:00', endDate: '2026-04-01T02:10:00', fill: '#e4eaea', opacity: 1 }
          ],
          rowBackgroundRanges: [
            { id: 'b1', recordKey: 'unit-1', startDate: '2026-03-30T15:00:00', endDate: '2026-03-31T04:20:00', offsetY: 0, height: 62, fill: '#dcf8c9', opacity: 0.7 },
            { id: 'b2', recordKey: 'unit-2', startDate: '2026-03-30T19:10:00', endDate: '2026-03-31T11:10:00', offsetY: 0, height: 62, fill: '#fde9e9', opacity: 0.75 },
            { id: 'b3', recordKey: 'fanuc-006-a', startDate: '2026-03-30T19:00:00', endDate: '2026-03-31T04:20:00', offsetY: 0, height: 62, fill: '#c7d9f7', opacity: 0.75 },
            { id: 'b4', recordKey: 'heat', startDate: '2026-03-30T02:00:00', endDate: '2026-04-01T08:00:00', offsetY: 4, height: 32, fill: '#ffe6a8', opacity: 0.9 },
            { id: 'b5', recordKey: 'outside', startDate: '2026-03-30T02:00:00', endDate: '2026-04-01T08:00:00', offsetY: 4, height: 32, fill: '#cfe1ff', opacity: 0.9 }
          ]
        },
        records: [
          {
            id: 'heat-group-a',
            name: '热处理',
            type: 'group',
            expanded: true,
            children: [
              {
                id: 'unit-1',
                name: '机组单元1',
                load: 100,
                tasks: [
                  { id: 't1', title: '产品图号001', subtitle: '144', startDate: '2026-03-30T06:15:00', endDate: '2026-03-30T10:30:00', height: 36, offsetY: 10, striped: true },
                  { id: 't1-load', title: '上料', subtitle: '产品图号001', startDate: '2026-03-30T03:15:00', endDate: '2026-03-30T05:51:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't1-unload', title: '下料', subtitle: '产品图号001', startDate: '2026-03-30T10:54:00', endDate: '2026-03-30T13:30:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' },
                  { id: 't2', title: '产品图号002', subtitle: '80', startDate: '2026-03-30T11:05:00', endDate: '2026-03-30T13:00:00', height: 36, offsetY: 10, status: 'planned', progress: 60, locked: true },
                  { id: 't2-load', title: '上料', subtitle: '产品图号002', startDate: '2026-03-30T08:05:00', endDate: '2026-03-30T10:41:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't2-unload', title: '下料', subtitle: '产品图号002', startDate: '2026-03-30T13:24:00', endDate: '2026-03-30T16:00:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' },
                  { id: 't3', title: '产品图号001', subtitle: '144', startDate: '2026-03-31T06:30:00', endDate: '2026-03-31T10:45:00', height: 36, offsetY: 10 },
                  { id: 't3-load', title: '上料', subtitle: '产品图号001', startDate: '2026-03-31T03:30:00', endDate: '2026-03-31T06:06:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't3-unload', title: '下料', subtitle: '产品图号001', startDate: '2026-03-31T11:09:00', endDate: '2026-03-31T13:45:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' }
                ]
              },
              {
                id: 'unit-2',
                name: '机组单元2',
                load: 80,
                tasks: [
                  { id: 't4', title: '产品图号001', subtitle: '144 (50%)', startDate: '2026-03-30T09:10:00', endDate: '2026-03-30T19:00:00', height: 36, offsetY: 10, progress: 50 },
                  { id: 't4-load', title: '上料', subtitle: '产品图号001', startDate: '2026-03-30T06:10:00', endDate: '2026-03-30T08:46:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't4-unload', title: '下料', subtitle: '产品图号001', startDate: '2026-03-30T19:24:00', endDate: '2026-03-30T22:00:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' },
                  { id: 't5', title: '产品图号002', subtitle: '144', startDate: '2026-04-01T00:45:00', endDate: '2026-04-01T07:15:00', height: 36, offsetY: 10, status: 'selected' },
                  { id: 't5-load', title: '上料', subtitle: '产品图号002', startDate: '2026-03-31T21:45:00', endDate: '2026-04-01T00:21:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't5-unload', title: '下料', subtitle: '产品图号002', startDate: '2026-04-01T07:39:00', endDate: '2026-04-01T10:15:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' }
                ]
              },
              {
                id: 'unit-3',
                name: '机组单元3',
                load: 79,
                tasks: [
                  { id: 't6', title: '产品图号004', subtitle: '144', startDate: '2026-03-31T09:10:00', endDate: '2026-03-31T11:00:00', height: 36, offsetY: 10, status: 'blue' },
                  { id: 't6-load', title: '上料', subtitle: '产品图号004', startDate: '2026-03-31T06:10:00', endDate: '2026-03-31T08:46:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't6-unload', title: '下料', subtitle: '产品图号004', startDate: '2026-03-31T11:24:00', endDate: '2026-03-31T14:00:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' }
                ]
              }
            ]
          },
          {
            id: 'machine-group-a',
            name: '热处理炉1',
            type: 'group',
            expanded: true,
            children: [
              {
                id: 'fanuc-004',
                name: 'FANUC004',
                load: 50,
                tasks: [
                  { id: 't7', title: '产品图号001', subtitle: '144', startDate: '2026-03-31T02:05:00', endDate: '2026-03-31T09:30:00', height: 36, offsetY: 10 },
                  { id: 't7-load', title: '上料', subtitle: '产品图号001', startDate: '2026-03-30T23:05:00', endDate: '2026-03-31T01:41:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't7-unload', title: '下料', subtitle: '产品图号001', startDate: '2026-03-31T09:54:00', endDate: '2026-03-31T12:30:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' }
                ]
              },
              {
                id: 'fanuc-006-a',
                name: 'FANUC006',
                load: 49,
                tasks: [
                  { id: 't8', title: '产品图号002', subtitle: '80 (50%)', startDate: '2026-03-30T10:45:00', endDate: '2026-03-30T14:00:00', height: 36, offsetY: 10, status: 'planned', progress: 50 },
                  { id: 't8-load', title: '上料', subtitle: '产品图号002', startDate: '2026-03-30T07:45:00', endDate: '2026-03-30T10:21:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't8-unload', title: '下料', subtitle: '产品图号002', startDate: '2026-03-30T14:24:00', endDate: '2026-03-30T17:00:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' },
                  { id: 't9', title: '产品图号003', subtitle: '144', startDate: '2026-04-01T04:00:00', endDate: '2026-04-01T08:40:00', height: 36, offsetY: 10, status: 'warning' },
                  { id: 't9-load', title: '上料', subtitle: '产品图号003', startDate: '2026-04-01T01:00:00', endDate: '2026-04-01T03:36:00', height: 36, offsetY: 10, lane: 'load', status: 'load' },
                  { id: 't9-unload', title: '下料', subtitle: '产品图号003', startDate: '2026-04-01T09:04:00', endDate: '2026-04-01T11:40:00', height: 36, offsetY: 10, lane: 'unload', status: 'unload' }
                ]
              }
            ]
          },
          { id: 'heat', name: '热处理', type: 'group', height: 44, tasks: [] },
          { id: 'outside', name: '外协加工', type: 'group', height: 44, tasks: [] }
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
