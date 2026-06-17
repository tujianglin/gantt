<template>
  <section class="demo-page">
    <div class="demo-toolbar">
      <label>
        <span>刻度</span>
        <select v-model="scaleKey">
          <option value="2h">2小时</option>
          <option value="4h">4小时</option>
          <option value="day">天</option>
        </select>
      </label>
    </div>
    <div ref="gantt" class="chart-wrap"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const scaleOptions = {
  '2h': [
    { unit: 'day', step: 1, rowHeight: 24 },
    { unit: 'hour', step: 2, colWidth: 56, rowHeight: 24 }
  ],
  '4h': [
    { unit: 'day', step: 1, rowHeight: 24 },
    { unit: 'hour', step: 4, colWidth: 72, rowHeight: 24 }
  ],
  day: [
    { unit: 'month', step: 1, rowHeight: 24 },
    { unit: 'day', step: 1, colWidth: 120, rowHeight: 24 }
  ]
}

export default {
  name: 'BasicDemo',
  data() {
    return {
      scaleKey: '2h',
      gantt: null,
      options: {
        minDate: '2026-03-30T00:00:00',
        maxDate: '2026-04-01T00:00:00',
        rowHeight: 68,
        taskListTable: {
          tableWidth: 180,
          columns: [
            { field: 'name', title: '资源', width: 180, tree: true }
          ]
        },
        timelineHeader: {
          scales: scaleOptions['2h']
        },
        taskBar: {
          labelText: 'title',
          subLabelText: 'subtitle',
          barStyle: {
            barColor: '#bfe7ff',
            completedBarColor: '#40c51b',
            cornerRadius: 2
          }
        },
        records: [
          {
            id: 'unit-1',
            name: '机组 1',
            tasks: [
              { id: 'task-1', title: '计划 A', subtitle: '60%', startDate: '2026-03-30T06:00:00', endDate: '2026-03-30T14:00:00', progress: 60 }
            ]
          },
          {
            id: 'unit-2',
            name: '机组 2',
            tasks: [
              { id: 'task-2', title: '计划 B', subtitle: '30%', startDate: '2026-03-30T12:00:00', endDate: '2026-03-31T02:00:00', progress: 30 }
            ]
          },
          {
            id: 'unit-3',
            name: '机组 3',
            tasks: [
              { id: 'task-3', title: '计划 C', subtitle: '待执行', startDate: '2026-03-31T04:00:00', endDate: '2026-03-31T16:00:00' }
            ]
          }
        ]
      }
    }
  },
  watch: {
    scaleKey(value) {
      this.options.timelineHeader.scales = scaleOptions[value]
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
.demo-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.demo-toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
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
