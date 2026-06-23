<template>
  <section class="distribution-page">
    <div class="distribution-toolbar">
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
          <option v-for="item in scaleOptions" :key="item.key" :value="item.key">
            {{ item.label }}
          </option>
        </select>
      </label>
      <div class="distribution-legend">
        <span><i class="distribution-swatch distribution-swatch--plan"></i>工单</span>
        <span><i class="distribution-swatch distribution-swatch--load"></i>上料</span>
        <span><i class="distribution-swatch distribution-swatch--unload"></i>下料</span>
      </div>
      <div class="distribution-summary">
        <span>{{ summary.groupCount }} 工位组</span>
        <span>{{ summary.orderCount }} 工单</span>
        <span>{{ summary.distributionCount }} 配送单</span>
      </div>
    </div>
    <div ref="gantt" class="distribution-chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'
import sourceData from './data.json'
import distributionData from './workOrderDistributionData.cjs'

const {
  createWorkOrderDistributionRecords,
  createWorkOrderDistributionRange
} = distributionData

const timelineMajorStyle = { backgroundColor: '#e8f0f5', color: '#2d4654', fontWeight: '700' }
const timelineMinorStyle = { backgroundColor: '#f8fbfd', color: '#526872' }

const scaleOptions = [
  {
    key: '1h',
    label: '1小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: timelineMajorStyle },
      { unit: 'hour', step: 1, colWidth: 40, rowHeight: 24, style: timelineMinorStyle }
    ]
  },
  {
    key: '2h',
    label: '2小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: timelineMajorStyle },
      { unit: 'hour', step: 2, colWidth: 58, rowHeight: 24, style: timelineMinorStyle }
    ]
  },
  {
    key: '4h',
    label: '4小时',
    value: [
      { unit: 'day', step: 1, rowHeight: 24, style: timelineMajorStyle },
      { unit: 'hour', step: 4, colWidth: 72, rowHeight: 24, style: timelineMinorStyle }
    ]
  },
  {
    key: '1d',
    label: '1天',
    value: [
      { unit: 'month', step: 1, rowHeight: 24, style: timelineMajorStyle },
      { unit: 'day', step: 1, colWidth: 132, rowHeight: 24, style: timelineMinorStyle }
    ]
  }
]

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTooltipDate(date) {
  const value = date instanceof Date ? date : new Date(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function progressPercent(task) {
  const value = Number(task.progress || 0) * 100
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function createSummary(records) {
  return records.reduce((summary, row) => {
    summary.orderCount += row.orderCount
    summary.distributionCount += row.loadCount + row.unloadCount
    return summary
  }, {
    groupCount: records.length,
    orderCount: 0,
    distributionCount: 0
  })
}

export default {
  name: 'WorkOrderDistributionDemo',
  data() {
    const records = createWorkOrderDistributionRecords(sourceData)
    const range = createWorkOrderDistributionRange(sourceData)

    return {
      gantt: null,
      scaleKey: '2h',
      scaleOptions,
      summary: createSummary(records),
      options: {
        minDate: range.minDate,
        maxDate: range.maxDate,
        rowHeight: 'auto',
        taskListTable: {
          tableWidth: 'auto',
          headerStyle: {
            backgroundColor: '#e8f0f5',
            color: '#2d4654',
            fontWeight: '700'
          },
          columns: [
            { field: 'name', title: '工位组', width: 150, minWidth: 120 },
            { title: '负载率', width: 82, minWidth: 70, align: 'right', headerAlign: 'right', valueGetter: this.getWorkloadRate },
            { title: '工单', width: 70, minWidth: 58, align: 'right', headerAlign: 'right', valueGetter: this.getOrderCount },
            { title: '上/下料', width: 84, minWidth: 72, align: 'right', headerAlign: 'right', valueGetter: this.getLogisticsCount },
            { title: '行高', width: 76, minWidth: 64, align: 'right', headerAlign: 'right', valueGetter: this.getAutoHeight }
          ]
        },
        timelineHeader: {
          backgroundColor: '#f8fbfd',
          scales: scaleOptions.find(item => item.key === '2h').value
        },
        taskBar: {
          customLayout: this.renderTask,
          draggable: false,
          hoverBringToFront: true,
          tooltip: {
            visible: true,
            showDelay: 80,
            customLayout: this.renderTooltip
          }
        },
        grid: {
          backgroundColor: '#fff',
          verticalLine: { lineColor: '#e4ebef' },
          horizontalLine: { lineColor: '#d9e3e8' }
        },
        records
      }
    }
  },
  watch: {
    scaleKey(value) {
      const scale = this.scaleOptions.find(item => item.key === value)
      if (scale && this.gantt) {
        this.gantt.setOptions({ timelineHeader: { scales: scale.value } })
      }
    },
    'options.minDate'(value) {
      if (this.gantt) this.gantt.setOptions({ minDate: value })
    },
    'options.maxDate'(value) {
      if (this.gantt) this.gantt.setOptions({ maxDate: value })
    }
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    getWorkloadRate({ row }) {
      const value = Number(row.workloadRate)
      return Number.isFinite(value) ? `${value.toFixed(2)}%` : ''
    },
    getOrderCount({ row }) {
      return row.orderCount
    },
    getLogisticsCount({ row }) {
      return `${row.loadCount}/${row.unloadCount}`
    },
    getAutoHeight({ row, gantt }) {
      return `${gantt.rowHeight(row)}px`
    },
    renderTask({ task }) {
      if (task.type === 'load' || task.type === 'unload') {
        return `
          <div class="distribution-logistics distribution-logistics--${task.type}">
            <span>${escapeHtml(task.title)}</span>
            <b>${escapeHtml(task.code)}</b>
          </div>
        `
      }

      return `
        <div class="distribution-plan" style="background:${escapeHtml(task.color)}">
          <i style="width:${progressPercent(task)}%"></i>
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.dispatchQuantity)} / ${escapeHtml(task.totalQuantity)}</span>
        </div>
      `
    },
    renderTooltip({ task, startDate, endDate }) {
      if (task.type === 'load' || task.type === 'unload') {
        return `
          <div class="distribution-tooltip">
            <strong>${escapeHtml(task.title)} ${escapeHtml(task.code)}</strong>
            <span>${formatTooltipDate(startDate)} - ${formatTooltipDate(endDate)}</span>
          </div>
        `
      }

      return `
        <div class="distribution-tooltip">
          <strong>${escapeHtml(task.title)} / ${escapeHtml(task.planCode)}</strong>
          <span>${escapeHtml(task.productName)}</span>
          <span>${formatTooltipDate(startDate)} - ${formatTooltipDate(endDate)}</span>
        </div>
      `
    }
  }
}
</script>

<style>
.distribution-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.distribution-toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 10px 12px;
  border: 1px solid #d8e3e8;
  border-bottom: 0;
  background: #fff;
}

.distribution-toolbar label,
.distribution-legend span,
.distribution-summary span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #51636b;
  font-size: 13px;
}

.distribution-toolbar input,
.distribution-toolbar select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #ccd9df;
  border-radius: 4px;
  background: #fff;
  color: #263b45;
}

.distribution-legend,
.distribution-summary {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.distribution-summary {
  margin-left: auto;
}

.distribution-swatch {
  width: 18px;
  height: 10px;
  display: inline-block;
  border-radius: 2px;
}

.distribution-swatch--plan {
  background: #42b8ad;
}

.distribution-swatch--load {
  background: #bfeee8;
}

.distribution-swatch--unload {
  background: #ffd796;
}

.distribution-chart {
  min-height: 0;
  flex: 1;
}

.distribution-plan {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border-radius: 4px;
  color: #fff;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.16);
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
}

.vg-task-fo--hover .distribution-plan {
  width: max-content;
  min-width: 100%;
  overflow: visible;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.16), 0 6px 14px rgba(21, 45, 52, 0.18);
}

.distribution-plan i {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.18);
}

.distribution-plan strong,
.distribution-plan span {
  min-width: 0;
  position: relative;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vg-task-fo--hover .distribution-plan strong,
.vg-task-fo--hover .distribution-plan span {
  overflow: visible;
  text-overflow: clip;
}

.distribution-plan span {
  flex: 0 0 auto;
  opacity: 0.9;
  font-size: 12px;
  font-weight: 600;
}

.distribution-logistics {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 6px;
  border-radius: 2px;
  overflow: hidden;
  color: #37474f;
  font-size: 10px;
  line-height: 12px;
}

.vg-task-fo--hover .distribution-logistics {
  width: max-content;
  min-width: 100%;
  overflow: visible;
  box-shadow: 0 4px 12px rgba(21, 45, 52, 0.16);
}

.distribution-logistics--load {
  background: #bfeee8;
}

.distribution-logistics--unload {
  background: #ffd796;
}

.distribution-logistics span,
.distribution-logistics b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vg-task-fo--hover .distribution-logistics span,
.vg-task-fo--hover .distribution-logistics b {
  overflow: visible;
  text-overflow: clip;
}

.distribution-logistics b {
  font-weight: 600;
  opacity: 0.76;
}

.distribution-tooltip {
  min-width: 220px;
  display: grid;
  gap: 6px;
}

.distribution-tooltip strong {
  color: #1d3440;
}

.distribution-tooltip span {
  color: #60727b;
  font-size: 12px;
}
</style>
