<template>
  <section class="demo-view">
    <div class="demo-toolbar">
      <label>
        <span>开始</span>
        <input :value="options.minDate" type="datetime-local" @input="updateDate('minDate', $event.target.value)" />
      </label>
      <label>
        <span>结束</span>
        <input :value="options.maxDate" type="datetime-local" @input="updateDate('maxDate', $event.target.value)" />
      </label>
      <label>
        <span>刻度</span>
        <select :value="scaleKey" @change="updateScale($event.target.value)">
          <option v-for="scale in scaleOptions" :key="scale.key" :value="scale.key">
            {{ scale.label }}
          </option>
        </select>
      </label>
    </div>
    <div class="actions">
      <button type="button" @click="collapseFirstGroup">收起第一组</button>
      <button type="button" @click="expandAll">全部展开</button>
      <button type="button" @click="zoomIn">放大刻度</button>
    </div>
    <div ref="gantt" class="vanilla-host"></div>
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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default {
  name: 'VanillaGanttDemo',
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
            { field: 'load', title: '负载', width: 78 }
          ]
        },
        timelineHeader: {
          scales: scaleOptions.find(scale => scale.key === '2h').value
        },
        taskBar: {
          customLayout: this.renderTask,
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
                  { id: 't3', title: '产品图号001', subtitle: '144', startDate: '2026-03-31T06:30:00', endDate: '2026-03-31T10:45:00', height: 36, offsetY: 10 }
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
                  { id: 't5', title: '产品图号002', subtitle: '144', startDate: '2026-04-01T00:45:00', endDate: '2026-04-01T07:15:00', height: 36, offsetY: 10, status: 'selected' }
                ]
              },
              {
                id: 'unit-3',
                name: '机组单元3',
                load: 79,
                tasks: [
                  { id: 't6', title: '产品图号004', subtitle: '144', startDate: '2026-03-31T09:10:00', endDate: '2026-03-31T11:00:00', height: 36, offsetY: 10, status: 'blue' }
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
                  { id: 't7', title: '产品图号001', subtitle: '144', startDate: '2026-03-31T02:05:00', endDate: '2026-03-31T09:30:00', height: 36, offsetY: 10 }
                ]
              },
              {
                id: 'fanuc-006-a',
                name: 'FANUC006',
                load: 49,
                tasks: [
                  { id: 't8', title: '产品图号002', subtitle: '80 (50%)', startDate: '2026-03-30T10:45:00', endDate: '2026-03-30T14:00:00', height: 36, offsetY: 10, status: 'planned', progress: 50 },
                  { id: 't9', title: '产品图号003', subtitle: '144', startDate: '2026-04-01T04:00:00', endDate: '2026-04-01T08:40:00', height: 36, offsetY: 10, status: 'warning' }
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
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    renderTask({ task }) {
      const className = `demo-vanilla-task demo-vanilla-task--${task.status || 'normal'}`
      if (task.status === 'load' || task.status === 'unload') {
        return `<div class="${escapeHtml(className)}"></div>`
      }

      return `
        <div class="${escapeHtml(className)}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
        </div>
      `
    },
    updateDate(key, value) {
      this.options[key] = value
      this.gantt.setOptions({ [key]: value })
    },
    updateScale(value) {
      this.scaleKey = value
      this.options.timelineHeader.scales = this.scaleOptions.find(scale => scale.key === value).value
      this.gantt.setOptions({ timelineHeader: this.options.timelineHeader })
    },
    collapseFirstGroup() {
      this.options.records = this.options.records.map((record, index) => index === 0 ? { ...record, expanded: false } : record)
      this.gantt.setOptions({ records: this.options.records })
    },
    expandAll() {
      const expand = records => records.map(record => ({
        ...record,
        expanded: true,
        children: record.children ? expand(record.children) : undefined
      }))
      this.options.records = expand(this.options.records)
      this.gantt.setOptions({ records: this.options.records })
    },
    zoomIn() {
      this.options.timelineHeader.scales = this.options.timelineHeader.scales.map((scale, index, items) => {
        if (index !== items.length - 1) return scale
        return { ...scale, colWidth: (scale.colWidth || 56) + 24 }
      })
      this.gantt.setOptions({
        timelineHeader: this.options.timelineHeader
      })
    }
  }
}
</script>

<style>
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

.actions {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.actions button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #cfdada;
  border-radius: 3px;
  background: #fff;
  color: #344247;
  cursor: pointer;
}

.vanilla-host {
  min-height: 0;
  flex: 1;
}

.demo-vanilla-task {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 8px;
  border: 1px solid rgba(29, 93, 86, 0.12);
  background: #a7eee6;
  color: #27413e;
  overflow: hidden;
}

.demo-vanilla-task--planned {
  background: #fff1b8;
}

.demo-vanilla-task--warning {
  border-color: #ff5b62;
  background: #ffe3e5;
}

.demo-vanilla-task--selected {
  border: 2px solid #49c419;
  background: #f7ed9d;
}

.demo-vanilla-task--blue {
  background: #bfe8ff;
}

.demo-vanilla-task--load,
.demo-vanilla-task--unload {
  padding: 0;
  border: 0;
}

.demo-vanilla-task--load {
  background: #6eddd8;
}

.demo-vanilla-task--unload {
  background: #45a2ff;
}

.demo-vanilla-task strong,
.demo-vanilla-task span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-vanilla-task strong {
  font-size: 12px;
}

.demo-vanilla-task span {
  font-size: 11px;
}
</style>
