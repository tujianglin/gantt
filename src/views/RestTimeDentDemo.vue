<template>
  <section class="rest-time-demo">
    <div class="rest-time-demo__toolbar">
      <label>
        <span>刻度</span>
        <select v-model="scaleKey">
          <option v-for="scale in scaleOptions" :key="scale.key" :value="scale.key">
            {{ scale.label }}
          </option>
        </select>
      </label>
    </div>
    <div ref="gantt" class="rest-time-demo__chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatHour({ startDate }) {
  return `${pad(startDate.getHours())}:00`
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const scaleOptions = [
  {
    key: '1h',
    label: '1小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#e8f0f5', color: '#2d4654', fontWeight: '700' } },
      { unit: 'hour', step: 1, colWidth: 56, rowHeight: 24, style: { backgroundColor: '#f8fbfd', color: '#526872' }, format: formatHour }
    ]
  },
  {
    key: '2h',
    label: '2小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#e8f0f5', color: '#2d4654', fontWeight: '700' } },
      { unit: 'hour', step: 2, colWidth: 70, rowHeight: 24, style: { backgroundColor: '#f8fbfd', color: '#526872' }, format: formatHour }
    ]
  }
]

const restRanges = [
  { id: 'lunch', startDate: '2026-03-30T12:00:00', endDate: '2026-03-30T13:30:00' },
  { id: 'maintain', startDate: '2026-03-30T18:00:00', endDate: '2026-03-30T19:00:00' }
]

export default {
  name: 'RestTimeDentDemo',
  data() {
    return {
      scaleKey: '1h',
      scaleOptions,
      gantt: null,
      options: {
        minDate: '2026-03-30T08:00:00',
        maxDate: '2026-03-31T02:00:00',
        rowHeight: 76,
        taskHeight: 48,
        taskListTable: {
          tableWidth: 210,
          columns: [
            { field: 'name', title: '资源', width: 130, tree: true },
            { field: 'mode', title: '渲染', width: 80 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f8fbfd',
          scales: scaleOptions[0].value
        },
        taskBar: {
          labelText: 'title',
          subLabelText: 'subtitle',
          // 返回 null 的任务会走内置默认 TaskBar；自定义任务读取 restTimeSegments 自己画凹槽。
          customLayout: this.renderTask,
          // 内置实现：开启 restTime 后，核心按任务时间与休息段交集计算凹槽位置。
          restTime: {
            enabled: true,
            ranges: restRanges,
            rowRanges: [
              { recordKey: 'rest-custom', startDate: '2026-03-30T21:00:00', endDate: '2026-03-30T21:40:00' }
            ],
            dentHeight: 18,
            bridgeHeight: 9,
            minWidth: 3
          },
          barStyle: {
            barColor: '#a9ddff',
            borderColor: '#5da9d6',
            cornerRadius: 4
          }
        },
        grid: {
          backgroundColor: '#ffffff',
          alternatingBackgroundColor: '#f8fbfb',
          verticalLine: { lineColor: '#e4ecec' },
          horizontalLine: { lineColor: '#edf1f2' },
          backgroundRanges: restRanges.map(range => ({
            ...range,
            fill: '#fff2c7',
            opacity: 0.74
          }))
        },
        records: [
          {
            id: 'rest-built-in',
            name: '产线 A',
            mode: '内置',
            tasks: [
              {
                id: 'rest-task-built-in',
                title: '连续工单',
                subtitle: '跨午休和维护',
                startDate: '2026-03-30T09:00:00',
                endDate: '2026-03-30T22:30:00'
              }
            ]
          },
          {
            id: 'rest-custom',
            name: '产线 B',
            mode: '自定义',
            restTimes: [
              { startDate: '2026-03-30T15:30:00', endDate: '2026-03-30T16:10:00' }
            ],
            tasks: [
              {
                id: 'rest-task-custom',
                title: '自定义条',
                subtitle: '读取 restTimeSegments',
                startDate: '2026-03-30T10:00:00',
                endDate: '2026-03-31T00:30:00',
                useCustomRestLayout: true
              }
            ]
          },
          {
            id: 'rest-disabled',
            name: '产线 C',
            mode: '禁用',
            restTimeMode: 'disabled',
            tasks: [
              {
                id: 'rest-task-disabled',
                title: '普通工单',
                subtitle: '行级禁用休息段',
                startDate: '2026-03-30T11:00:00',
                endDate: '2026-03-30T20:00:00'
              }
            ]
          }
        ]
      }
    }
  },
  watch: {
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
    renderTask({ task, restTimeSegments }) {
      if (!task.useCustomRestLayout) return null
      // 自定义实现：segment.left/segment.width 已经是任务条内的像素位置。
      return `
        <div class="rest-time-custom-task">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
          <div class="rest-time-custom-task__layer">
            ${restTimeSegments.map(segment => `
              <i
                class="rest-time-custom-task__dent"
                style="left:${segment.left}px;width:${segment.width}px"
              ></i>
            `).join('')}
          </div>
        </div>
      `
    }
  }
}
</script>

<style>
.rest-time-demo {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f8f8;
}

.rest-time-demo__toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.rest-time-demo__toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #556164;
  font-size: 13px;
}

.rest-time-demo__toolbar select {
  height: 30px;
  border: 1px solid #ccd8d8;
  border-radius: 3px;
  padding: 0 8px;
  color: #344247;
  background: #fff;
}

.rest-time-demo__chart {
  min-height: 0;
  flex: 1;
}

.rest-time-custom-task {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid #6d8fd6;
  border-top: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #bdd3ff;
  color: #23365f;
  font-size: 12px;
  line-height: 1.3;
}

.rest-time-custom-task strong,
.rest-time-custom-task span {
  position: relative;
  z-index: 2;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rest-time-custom-task__layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.rest-time-custom-task__dent {
  position: absolute;
  top: 0;
  bottom: 8px;
  background: #fff;
  box-shadow: inset 1px 0 rgba(35, 54, 95, 0.12), inset -1px 0 rgba(35, 54, 95, 0.12);
}
</style>
