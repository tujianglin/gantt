<template>
  <section class="timeline-demo">
    <div class="timeline-demo__toolbar">
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
    <div ref="gantt" class="timeline-demo__chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatMinute({ startDate }) {
  return `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
}

function formatHour({ startDate }) {
  return `${pad(startDate.getHours())}:00`
}

function formatDay({ startDate }) {
  return `${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`
}

const majorStyle = { backgroundColor: '#eaf3f8', color: '#2f4858', fontWeight: '700' }
const minorStyle = { backgroundColor: '#f7fbfd', color: '#53666f' }

const scaleOptions = [
  { key: '15m', label: '15分钟', value: [{ unit: 'day', step: 1, rowHeight: 24, style: majorStyle, format: formatDay }, { unit: 'minute', step: 15, colWidth: 44, rowHeight: 24, style: minorStyle, format: formatMinute }] },
  { key: '1h', label: '1小时', value: [{ unit: 'day', step: 1, rowHeight: 24, style: majorStyle, format: formatDay }, { unit: 'hour', step: 1, colWidth: 42, rowHeight: 24, style: minorStyle, format: formatHour }] },
  { key: '4h', label: '4小时', value: [{ unit: 'day', step: 1, rowHeight: 24, style: majorStyle, format: formatDay }, { unit: 'hour', step: 4, colWidth: 72, rowHeight: 24, style: minorStyle, format: formatHour }] },
  { key: 'day', label: '天', value: [{ unit: 'month', step: 1, rowHeight: 24, style: majorStyle }, { unit: 'day', step: 1, colWidth: 108, rowHeight: 24, style: minorStyle, format: formatDay }] },
  { key: 'week', label: '周', value: [{ unit: 'month', step: 1, rowHeight: 24, style: majorStyle }, { unit: 'week', step: 1, colWidth: 180, rowHeight: 24, style: minorStyle }] },
  { key: 'month', label: '月', value: [{ unit: 'year', step: 1, rowHeight: 24, style: majorStyle }, { unit: 'month', step: 1, colWidth: 220, rowHeight: 24, style: minorStyle }] },
  { key: 'year', label: '年', value: [{ unit: 'year', step: 1, colWidth: 260, rowHeight: 48, style: majorStyle }] }
]

export default {
  name: 'TimelineDemo',
  data() {
    return {
      scaleKey: '15m',
      scaleOptions,
      gantt: null,
      options: {
        minDate: '2026-03-30T06:00',
        maxDate: '2026-04-02T06:00',
        rowHeight: 68,
        taskListTable: {
          tableWidth: 190,
          columns: [
            { field: 'name', title: '资源', width: 190, tree: true }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f7fbfd',
          customLayout: this.renderTimelineCell,
          scales: scaleOptions.find(scale => scale.key === '15m').value
        },
        taskBar: {
          labelText: 'title',
          subLabelText: 'subtitle',
          barStyle: {
            barColor: '#dff4f1',
            borderColor: '#8bc7c0',
            cornerRadius: 2
          }
        },
        grid: {
          backgroundColor: '#f7fbfb',
          alternatingBackgroundColor: '#f8fbfb',
          verticalLine: ({ date }) => {
            return date && date.getHours && date.getHours() === 0
              ? { lineColor: '#cbdadb', lineWidth: 1.4 }
              : { lineColor: '#e8eeee' }
          },
          horizontalLine: { lineColor: '#edf1f2' },
          backgroundRanges: [
            { id: 'rest-1', startDate: '2026-03-30T12:00:00', endDate: '2026-03-30T13:30:00', fill: '#f2f3f3', opacity: 1 },
            { id: 'rest-2', startDate: '2026-03-31T12:00:00', endDate: '2026-03-31T13:30:00', fill: '#f2f3f3', opacity: 1 },
            { id: 'stop-1', startDate: '2026-03-31T20:00:00', endDate: '2026-04-01T05:00:00', fill: '#fdeeee', opacity: 1 }
          ],
          rowBackgroundRanges: [
            { id: 'shift-unit-1', recordKey: 'timeline-unit-1', startDate: '2026-03-30T08:00:00', endDate: '2026-03-31T20:00:00', fill: '#ffe2a8', opacity: 0.65, offsetY: 8, height: 26 }
          ]
        },
        markLine: [
          { date: '2026-03-30T10:00:00', content: '冻结', style: { lineColor: '#35cce0', lineDash: [4, 4] }, contentStyle: { color: '#1599aa' } },
          { date: '2026-03-31T08:00:00', content: '交付', style: { lineColor: '#ff4d5a' }, contentStyle: { color: '#c9333f' } }
        ],
        records: [
          {
            id: 'timeline-unit-1',
            name: '热处理炉 1',
            tasks: [
              { id: 'timeline-task-1', title: '工单 A', subtitle: '含班次背景', startDate: '2026-03-30T08:00:00', endDate: '2026-03-31T02:00:00' }
            ]
          },
          {
            id: 'timeline-unit-2',
            name: '热处理炉 2',
            tasks: [
              { id: 'timeline-task-2', title: '工单 B', subtitle: '跨停机区', startDate: '2026-03-31T14:00:00', endDate: '2026-04-01T09:00:00' }
            ]
          }
        ]
      }
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
    renderTimelineCell({ unit, major }) {
      return `
        <div class="timeline-demo__cell${major ? ' timeline-demo__cell--major' : ''}">
          ${unit.label}
        </div>
      `
    }
  }
}
</script>

<style>
.timeline-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.timeline-demo__toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.timeline-demo__toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #556164;
  font-size: 13px;
}

.timeline-demo__toolbar input,
.timeline-demo__toolbar select {
  height: 30px;
  border: 1px solid #ccd8d8;
  border-radius: 3px;
  padding: 0 8px;
  color: #344247;
  background: #fff;
}

.timeline-demo__chart {
  min-height: 0;
  flex: 1;
}

.timeline-demo__cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #d5dddd;
  background: #f7fbfd;
  color: #53666f;
  font-size: 12px;
}

.timeline-demo__cell--major {
  background: #eaf3f8;
  color: #2f4858;
  font-weight: 700;
}
</style>
