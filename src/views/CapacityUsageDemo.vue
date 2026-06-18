<template>
  <section class="capacity-gantt-page">
    <div class="capacity-toolbar">
      <label>
        <span>月份</span>
        <select v-model="monthKey">
          <option value="2026-06">2026-06</option>
          <option value="2026-07">2026-07</option>
        </select>
      </label>
      <label>
        <span>开始</span>
        <input v-model="queryStartDate" type="date" />
      </label>
      <label>
        <span>结束</span>
        <input v-model="queryEndDate" type="date" />
      </label>
      <button type="button" @click="applyRange">查询</button>
      <label class="capacity-toggle">
        <input v-model="onlyBusy" type="checkbox" />
        <span>只看有负载</span>
      </label>
      <div class="capacity-summary">
        <span>平均 {{ averageUsage }}%</span>
        <span>峰值 {{ maxUsage }}%</span>
        <span v-if="selectedCell">{{ selectedCell.resource }} / {{ selectedCell.day }}：{{ selectedCell.value }}</span>
      </div>
    </div>
    <div ref="gantt" class="capacity-chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

const monthPresets = {
  '2026-06': { start: '2026-06-08', end: '2026-06-18', current: '2026-06-18' },
  '2026-07': { start: '2026-07-01', end: '2026-07-11', current: '2026-07-08' }
}

const sourceRows = [
  { id: 'default', name: '默认', usage: {} },
  { id: 'unit-1', name: '机组单元1', usage: { '2026-06': { 9: 21.15, 10: 33.02 }, '2026-07': { 2: 18.7, 5: 42.6 } } },
  { id: 'test-group', name: '测试组', usage: { '2026-07': { 3: 12.5 } } },
  { id: 'car-room', name: '四车间', usage: { '2026-06': { 9: 8.33 }, '2026-07': { 6: 27.2 } } },
  { id: 'erp', name: 'ERP', usage: {} },
  { id: 'line', name: '加工产线', usage: { '2026-06': { 12: 63.5 }, '2026-07': { 8: 61.4 } } },
  { id: 'process-1', name: '加工1', usage: {} },
  { id: 'calendar-test', name: '日历测试工位', usage: {} },
  { id: 'test', name: '测试', usage: {} },
  { id: 'eleven', name: '11', usage: {} },
  { id: 'unit', name: '机组单元', usage: { '2026-07': { 10: 9.8 } } },
  { id: 'final', name: '终检组', usage: { '2026-06': { 18: 15.4 } } },
  { id: 'storage', name: '缓存工位', usage: { '2026-06': { 16: 92.3 } } }
]

function pad(value) {
  return String(value).padStart(2, '0')
}

function parseDateKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date, count) {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

function createDayItems(startDate, endDate) {
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  const days = []
  let cursor = start
  while (cursor.getTime() <= end.getTime()) {
    days.push({
      dateKey: formatDateKey(cursor),
      monthKey: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`,
      day: cursor.getDate(),
      label: pad(cursor.getDate()),
      startDate: `${formatDateKey(cursor)}T00:00:00`,
      endDate: `${formatDateKey(addDays(cursor, 1))}T00:00:00`
    })
    cursor = addDays(cursor, 1)
  }
  return days
}

function valueText(value) {
  return value ? `${Number(value).toFixed(2).replace(/\.00$/, '')}%` : '0%'
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default {
  name: 'CapacityUsageDemo',
  data() {
    return {
      monthKey: '2026-06',
      queryStartDate: monthPresets['2026-06'].start,
      queryEndDate: monthPresets['2026-06'].end,
      appliedStartDate: monthPresets['2026-06'].start,
      appliedEndDate: monthPresets['2026-06'].end,
      currentDate: monthPresets['2026-06'].current,
      onlyBusy: false,
      selectedCell: null,
      gantt: null,
      options: null
    }
  },
  computed: {
    days() {
      return createDayItems(this.appliedStartDate, this.appliedEndDate)
    },
    activeValues() {
      return sourceRows.reduce((values, row) => {
        this.days.forEach(dayInfo => {
          const value = this.cellValue(row, dayInfo)
          if (value > 0) values.push(value)
        })
        return values
      }, [])
    },
    averageUsage() {
      if (!this.activeValues.length) return '0'
      const total = this.activeValues.reduce((sum, value) => sum + value, 0)
      return (total / this.activeValues.length).toFixed(2)
    },
    maxUsage() {
      if (!this.activeValues.length) return '0'
      return Math.max(...this.activeValues).toFixed(2)
    }
  },
  watch: {
    monthKey(value) {
      const preset = monthPresets[value]
      this.queryStartDate = preset.start
      this.queryEndDate = preset.end
      this.currentDate = preset.current
      this.applyRange()
    },
    onlyBusy() {
      this.selectedCell = null
      this.syncOptions()
    }
  },
  mounted() {
    this.options = this.createOptions()
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    cellValue(row, dayInfo) {
      return Number((row.usage[dayInfo.monthKey] || {})[dayInfo.day] || 0)
    },
    visibleSourceRows() {
      if (!this.onlyBusy) return sourceRows
      return sourceRows.filter(row => this.days.some(dayInfo => this.cellValue(row, dayInfo) > 0))
    },
    applyRange() {
      const start = parseDateKey(this.queryStartDate)
      const end = parseDateKey(this.queryEndDate)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
      if (start.getTime() > end.getTime()) {
        this.queryEndDate = this.queryStartDate
      }
      this.appliedStartDate = this.queryStartDate
      this.appliedEndDate = this.queryEndDate
      this.selectedCell = null
      this.syncOptions()
    },
    createOptions() {
      const dayItems = this.days
      const firstDay = dayItems[0]
      const lastDay = dayItems[dayItems.length - 1]
      const markLine = this.currentDate >= this.appliedStartDate && this.currentDate <= this.appliedEndDate
        ? {
            date: `${this.currentDate}T12:00:00`,
            style: { lineColor: '#36d7df', lineDash: [4, 4], lineWidth: 1 }
          }
        : null
      return {
        minDate: firstDay.startDate,
        maxDate: lastDay.endDate,
        rowHeight: 72,
        taskHeight: 72,
        taskListTable: {
          tableWidth: 120,
          columnResizable: false,
          headerStyle: {
            backgroundColor: '#dbe8e8',
            color: '#2f3538',
            fontSize: 16,
            fontWeight: '700'
          },
          columns: [
            { field: 'name', title: '工位组/日期', width: 120, minWidth: 120 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#dbe8e8',
          scales: [
            {
              unit: 'month',
              step: 1,
              rowHeight: 26,
              style: { backgroundColor: '#dbe8e8', color: '#2f3538', fontWeight: '700' },
              format: ({ startDate }) => `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}`
            },
            {
              unit: 'day',
              step: 1,
              colWidth: 100,
              rowHeight: 26,
              style: { backgroundColor: '#dbe8e8', color: '#2f3538', fontWeight: '700' },
              format: ({ startDate }) => pad(startDate.getDate())
            }
          ]
        },
        taskBar: {
          startDateField: 'startDate',
          endDateField: 'endDate',
          labelText: 'title',
          customLayout: this.renderCapacityCell,
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          },
          onClick: ({ task }) => this.selectTask(task)
        },
        grid: {
          backgroundColor: '#fff',
          verticalLine: { lineColor: '#dce5e5' },
          horizontalLine: { lineColor: '#dce5e5' }
        },
        markLine,
        records: this.visibleSourceRows().map(row => ({
          id: row.id,
          name: row.name,
          height: 72,
          tasks: dayItems.map(dayInfo => {
            const value = this.cellValue(row, dayInfo)
            return {
              id: `${row.id}-${dayInfo.dateKey}`,
              title: row.name,
              day: dayInfo.label,
              dateKey: dayInfo.dateKey,
              usage: value,
              startDate: dayInfo.startDate,
              endDate: dayInfo.endDate,
              height: 72,
              offsetY: 0
            }
          })
        }))
      }
    },
    syncOptions() {
      this.options = this.createOptions()
      if (this.gantt) this.gantt.setOptions(this.options)
    },
    selectTask(task) {
      this.selectedCell = {
        id: task.id,
        resource: task.title,
        day: task.dateKey,
        value: valueText(task.usage)
      }
      this.$nextTick(() => {
        if (this.gantt) this.gantt.render()
      })
    },
    renderCapacityCell({ task }) {
      const value = Number(task.usage || 0)
      const selected = this.selectedCell && this.selectedCell.id === task.id
      const barHeight = Math.max(0, Math.min(100, value))
      const levelClass = value >= 90 ? 'is-danger' : value >= 60 ? 'is-warning' : 'is-normal'
      return `
        <div class="capacity-task${selected ? ' capacity-task--selected' : ''}${value > 0 ? ' capacity-task--active' : ''}">
          <span class="capacity-task-meter">
            ${value > 0 ? `<i class="capacity-task-fill ${levelClass}" style="height:${barHeight}%"></i>` : ''}
          </span>
          <span class="capacity-task-value">${escapeHtml(valueText(value))}</span>
        </div>
      `
    },
    renderTooltip({ task }) {
      return `
        <div class="capacity-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.dateKey)}</span>
          <b>${escapeHtml(valueText(task.usage))}</b>
        </div>
      `
    }
  }
}
</script>

<style>
.capacity-gantt-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.capacity-toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid #d9e4e4;
  border-bottom: 0;
  background: #fff;
}

.capacity-toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #526367;
  font-size: 13px;
}

.capacity-toolbar select,
.capacity-toolbar input {
  height: 30px;
  border: 1px solid #cbd8d8;
  border-radius: 3px;
  padding: 0 8px;
  background: #fff;
  color: #344247;
}

.capacity-toolbar button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #2f9bff;
  border-radius: 3px;
  background: #2f9bff;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.capacity-toggle input {
  width: 14px;
  height: 14px;
}

.capacity-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  color: #607174;
  font-size: 13px;
}

.capacity-chart {
  min-height: 0;
  flex: 1;
}

.capacity-chart .vg-left-header {
  align-items: stretch;
}

.capacity-chart .vg-table-header-cell {
  padding-left: 10px;
}

.capacity-chart .vg-row {
  background: #fff;
}

.capacity-chart .vg-table-cell {
  color: #111;
  font-weight: 700;
}

.capacity-chart .vg-task-fo {
  overflow: visible;
}

.capacity-task {
  position: relative;
  width: 100%;
  height: 100%;
  background: transparent;
  cursor: pointer;
}

.capacity-task:hover {
  background: rgba(232, 247, 247, 0.72);
}

.capacity-task--selected {
  box-shadow: inset 0 0 0 2px #7bd9df;
}

.capacity-task-value {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 14px;
  line-height: 1;
}

.capacity-task-meter {
  position: absolute;
  left: 50%;
  bottom: 8px;
  width: 80px;
  height: 40px;
  transform: translateX(-50%);
  overflow: hidden;
}

.capacity-task-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #3bc322;
}

.capacity-task-fill.is-warning {
  background: #f6a623;
}

.capacity-task-fill.is-danger {
  background: #f05a4f;
}

.capacity-tooltip {
  display: grid;
  gap: 4px;
  min-width: 132px;
  color: #344247;
}

.capacity-tooltip strong {
  font-size: 13px;
}

.capacity-tooltip span {
  color: #68777b;
  font-size: 12px;
}

.capacity-tooltip b {
  color: #2ea51c;
  font-size: 13px;
}
</style>
