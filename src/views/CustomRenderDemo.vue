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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default {
  name: 'CustomRenderDemo',
  data() {
    return {
      options: {
        minDate: '2026-03-30T02:00',
        maxDate: '2026-04-02T02:00',
        markLine: {
          date: '2026-03-30T12:00',
          style: { lineColor: '#35cce0' }
        },
        taskListTable: {
          tableWidth: 'auto',
          columns: [
            {
              field: 'name',
              title: '资源',
              width: 150,
              tree: true,
              renderHeader: this.renderNameHeader,
              renderCell: this.renderNameCell
            },
            {
              field: 'load',
              title: '负载',
              width: 90,
              renderHeader: this.renderLoadHeader,
              renderCell: this.renderLoadCell
            }
          ]
        },
        timelineHeader: {
          scales: scaleOptions[2].value,
          customLayout: this.renderTimeline
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
      scaleKey: '4h',
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
    },
    renderNameHeader() {
      return '<span class="custom-table-header">资源</span>'
    },
    renderLoadHeader() {
      return '<span class="custom-table-header">当日负载</span>'
    },
    renderNameCell({ row, expanded }) {
      const toggle = row.children
        ? `<button class="custom-row-toggle" type="button" data-vg-toggle>${expanded ? '⌄' : '›'}</button>`
        : ''
      return `
        <div class="custom-row-name" style="padding-left:${Number(row.level || 0) * 14}px">
          ${toggle}
          <span>${escapeHtml(row.name)}</span>
        </div>
      `
    },
    renderLoadCell({ value }) {
      if (value === undefined) return ''
      const width = Math.max(0, Math.min(100, Number(value) || 0))
      return `
        <div class="custom-row-load">
          <span style="width:${width}%"></span>
          <b>${escapeHtml(value)}%</b>
        </div>
      `
    },
    renderTask({ task }) {
      const className = `custom-task custom-task--${task.status || 'normal'}`
      if (task.status === 'load' || task.status === 'unload') {
        return `<div class="${escapeHtml(className)}"></div>`
      }

      const meta = task.summary || task.parentAggregate ? '' : task.subtitle || ''
      return `
        <div class="${escapeHtml(className)}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(meta)}</span>
        </div>
      `
    },
    renderTimeline({ unit, major }) {
      return `
        <div class="custom-timeline${major ? ' custom-timeline--major' : ''}">
          ${escapeHtml(unit.label)}
        </div>
      `
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

.chart-wrap {
  min-height: 0;
  flex: 1;
}

.custom-table-header {
  color: #355052;
  font-weight: 800;
}

.custom-row-name {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #374548;
}

.custom-row-toggle {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #168f87;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.custom-row-load {
  position: relative;
  height: 16px;
  width: 100%;
  background: #edf2f2;
}

.custom-row-load span {
  display: block;
  height: 100%;
  background: #74d7d0;
}

.custom-row-load b {
  position: absolute;
  right: 4px;
  top: 1px;
  font-size: 11px;
  color: #42615e;
}

.custom-task {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 8px;
  border-left: 4px solid #168f87;
  background: #e9fbf7;
  color: #234441;
  box-shadow: inset 0 0 0 1px #a5e4dc;
  overflow: hidden;
}

.custom-task--warning {
  border-left-color: #ef4444;
  background: #fff0f1;
  box-shadow: inset 0 0 0 1px #ff9aa0;
}

.custom-task--load,
.custom-task--unload {
  padding: 0;
  border-left: 0;
  box-shadow: none;
}

.custom-task--load {
  background: #6eddd8;
}

.custom-task--unload {
  background: #45a2ff;
}

.custom-task strong,
.custom-task span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-task strong {
  font-size: 12px;
}

.custom-task span {
  font-size: 11px;
  color: #637174;
}

.custom-timeline {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #bfd2d2;
  background: #f7fbfb;
  color: #43605e;
  font-size: 12px;
}

.custom-timeline--major {
  background: #dce9e8;
  color: #243f3d;
  font-weight: 700;
}
</style>
