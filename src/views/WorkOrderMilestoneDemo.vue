<template>
  <section class="milestone-page">
    <div class="milestone-toolbar">
      <label>
        <span>时间间隔</span>
        <select v-model="scaleKey">
          <option value="4h">4</option>
          <option value="8h">8</option>
          <option value="12h">12</option>
        </select>
      </label>
      <div class="milestone-summary">
        <span>里程碑可通过 task.milestones 配置</span>
        <span>旗标由 taskBar.milestoneCustomLayout 模板字符串渲染</span>
      </div>
    </div>
    <div ref="gantt" class="milestone-chart"></div>
  </section>
</template>

<script>
import { VanillaGantt } from '../lib'

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}`
}

const scaleOptions = {
  '4h': [
    { unit: 'day', step: 1, rowHeight: 20, style: { backgroundColor: '#dbe8e8', fontWeight: '700' } },
    { unit: 'hour', step: 4, colWidth: 84, rowHeight: 20, style: { backgroundColor: '#dbe8e8', fontWeight: '700' } }
  ],
  '8h': [
    { unit: 'day', step: 1, rowHeight: 20, style: { backgroundColor: '#dbe8e8', fontWeight: '700' } },
    { unit: 'hour', step: 8, colWidth: 96, rowHeight: 20, style: { backgroundColor: '#dbe8e8', fontWeight: '700' } }
  ],
  '12h': [
    { unit: 'day', step: 1, rowHeight: 20, style: { backgroundColor: '#dbe8e8', fontWeight: '700' } },
    { unit: 'hour', step: 12, colWidth: 118, rowHeight: 20, style: { backgroundColor: '#dbe8e8', fontWeight: '700' } }
  ]
}

export default {
  name: 'WorkOrderMilestoneDemo',
  data() {
    return {
      scaleKey: '4h',
      gantt: null,
      options: {
        minDate: '2025-06-04T00:00:00',
        maxDate: '2025-06-10T04:00:00',
        rowHeight: 68,
        taskHeight: 50,
        taskListTable: {
          tableWidth: 168,
          columnResizable: false,
          headerStyle: {
            backgroundColor: '#dbe8e8',
            color: '#2f3538',
            fontWeight: '700'
          },
          columns: [
            { field: 'name', title: '工单', width: 168 }
          ]
        },
        timelineHeader: {
          backgroundColor: '#dbe8e8',
          scales: scaleOptions['4h']
        },
        taskBar: {
          customLayout: this.renderTask,
          milestoneStyle: { width: 18, height: 26 },
          milestoneCustomLayout: this.renderMilestone,
          milestoneTooltip: {
            visible: true,
            customLayout: this.renderMilestoneTooltip
          },
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          }
        },
        grid: {
          backgroundColor: '#fff',
          verticalLine: { lineColor: '#e5eded' },
          horizontalLine: { lineColor: '#edf2f2' }
        },
        markLine: {
          date: '2025-06-04T12:00:00',
          style: { lineColor: '#35d8df', lineDash: [4, 4], lineWidth: 1 }
        },
        records: [
          {
            id: 'order-1',
            name: 'JGDD2025501010001',
            tasks: [
              {
                id: 'wo-m-1',
                title: '产品：生产产品1',
                subtitle: '提前交货日期：3天6小时30分',
                quantity: 20,
                startDate: '2025-06-04T10:00:00',
                endDate: '2025-06-05T06:00:00',
                status: 'normal',
                milestones: [
                  { id: 'm-1', title: '交付', date: '2025-06-08T08:00:00', label: '2025-06-08 08:00' }
                ]
              }
            ]
          },
          {
            id: 'order-2',
            name: 'JGDD2025501010002',
            tasks: [
              {
                id: 'wo-m-2',
                title: '产品：生产产品1',
                subtitle: '提前交货日期：0天6小时30分',
                quantity: 20,
                startDate: '2025-06-05T02:00:00',
                endDate: '2025-06-06T12:00:00',
                status: 'normal',
                milestones: [
                  { id: 'm-2', title: '交付', date: '2025-06-08T20:00:00' }
                ]
              }
            ]
          },
          {
            id: 'order-3',
            name: 'JGDD2025501010003',
            tasks: [
              {
                id: 'wo-m-3',
                title: '产品：生产产品1',
                subtitle: '提前交货日期：3天',
                quantity: 40,
                startDate: '2025-06-06T00:00:00',
                endDate: '2025-06-09T18:00:00',
                status: 'normal'
              }
            ]
          },
          {
            id: 'order-4',
            name: 'JGDD2025501010004',
            tasks: [
              {
                id: 'wo-m-4',
                title: '产品：生产产品1',
                subtitle: '提前交货日期：1天',
                quantity: 15,
                startDate: '2025-06-09T09:00:00',
                endDate: '2025-06-10T04:00:00',
                status: 'normal'
              }
            ]
          },
          {
            id: 'order-5',
            name: 'JGDD2025501010005',
            tasks: []
          },
          {
            id: 'order-6',
            name: 'JGDD2025501010006',
            tasks: [
              {
                id: 'wo-m-6',
                title: '产品：生产产品1',
                subtitle: '提前交货日期：延期3天6小时30分',
                quantity: 20,
                startDate: '2025-06-07T02:00:00',
                endDate: '2025-06-08T22:00:00',
                status: 'delay',
                milestones: [
                  { id: 'm-6', title: '计划交付', date: '2025-06-07T10:00:00' }
                ]
              }
            ]
          },
          {
            id: 'order-7',
            name: 'JGDD2025501010007',
            tasks: [
              {
                id: 'wo-m-7',
                title: '产品：生产产品1',
                subtitle: '提前交货日期：3天6小时30分',
                quantity: 20,
                startDate: '2025-06-04T04:00:00',
                endDate: '2025-06-06T00:00:00',
                status: 'normal',
                milestones: [
                  { id: 'm-7', title: '交付', date: '2025-06-08T20:00:00' }
                ]
              }
            ]
          }
        ]
      }
    }
  },
  watch: {
    scaleKey(value) {
      this.options.timelineHeader.scales = scaleOptions[value]
      if (this.gantt) this.gantt.setOptions({ timelineHeader: this.options.timelineHeader })
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
      const className = task.status === 'delay' ? 'order-task order-task--delay' : 'order-task'
      return `
        <div class="${className}">
          <div><span>${escapeHtml(task.title)}</span><b>数量：${escapeHtml(task.quantity)}</b></div>
          <p>${escapeHtml(task.subtitle)}</p>
        </div>
      `
    },
    renderMilestone({ milestone }) {
      return `
        <div class="order-milestone" title="${escapeHtml(milestone.title || '')}">
          <i></i>
          <b></b>
        </div>
      `
    },
    renderMilestoneTooltip({ milestone, task, date }) {
      return `
        <div class="order-milestone-tooltip">
          <strong>${escapeHtml(milestone.title || '里程碑')}</strong>
          <span>${escapeHtml(task.title.replace('产品：', ''))}</span>
          <time>${escapeHtml(formatTime(date))}</time>
        </div>
      `
    },
    renderTooltip({ task }) {
      const milestone = task.milestones && task.milestones[0]
      return `
        <div class="order-tooltip">
          <p><span>工单编号：</span>${escapeHtml(task.id)}</p>
          <p><span>优先级：</span>0</p>
          <p><span>交货日期：</span>${escapeHtml(milestone ? formatTime(milestone.date).slice(0, 10) : '-')}</p>
          <hr />
          <p><span>产品：</span>${escapeHtml(task.title.replace('产品：', ''))}</p>
          <p><span>数量：</span>${escapeHtml(task.quantity)}/40</p>
          <hr />
          <p><span>计划完成日期：</span>${escapeHtml(formatTime(task.endDate))}</p>
          <p><span>提前交货日期：</span>${escapeHtml(task.subtitle.replace('提前交货日期：', ''))}</p>
        </div>
      `
    }
  }
}
</script>

<style>
.milestone-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.milestone-toolbar {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 10px;
  border: 1px solid #d9e4e4;
  border-bottom: 0;
  background: #fff;
}

.milestone-toolbar label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #526367;
  font-size: 13px;
}

.milestone-toolbar select {
  height: 28px;
  border: 1px solid #cbd8d8;
  border-radius: 2px;
  padding: 0 8px;
  color: #526367;
  background: #fff;
}

.milestone-summary {
  display: flex;
  gap: 16px;
  color: #6b777a;
  font-size: 12px;
}

.milestone-chart {
  min-height: 0;
  flex: 1;
}

.milestone-chart .vg-table-cell {
  font-size: 12px;
}

.milestone-chart .vg-table-cell::before {
  content: '生产';
  display: inline-flex;
  align-items: center;
  height: 16px;
  margin-right: 4px;
  padding: 0 4px;
  border-radius: 2px;
  background: #34d5c8;
  color: #fff;
  font-size: 10px;
}

.milestone-chart .vg-timeline-cell {
  font-size: 11px;
}

.order-task {
  width: 100%;
  height: 100%;
  padding: 4px 8px;
  background: rgba(151, 234, 222, 0.74);
  color: #24776f;
  overflow: hidden;
}

.order-task--delay {
  background: rgba(255, 177, 177, 0.72);
  color: #ec3e47;
}

.order-task div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.order-task b {
  font-weight: 500;
}

.order-task p {
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.order-milestone {
  position: relative;
  width: 100%;
  height: 100%;
}

.order-milestone i {
  position: absolute;
  left: 3px;
  top: 1px;
  bottom: 1px;
  width: 2px;
  background: #ff4d5a;
}

.order-milestone b {
  position: absolute;
  left: 5px;
  top: 1px;
  width: 12px;
  height: 11px;
  background: #ff4d5a;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.order-tooltip {
  min-width: 260px;
  color: #586367;
  font-size: 12px;
}

.order-milestone-tooltip {
  display: grid;
  gap: 5px;
  min-width: 160px;
}

.order-milestone-tooltip strong {
  color: #344247;
  font-size: 13px;
}

.order-milestone-tooltip span {
  color: #68777b;
  font-size: 12px;
}

.order-milestone-tooltip time {
  color: #ff4d5a;
  font-size: 12px;
}

.order-tooltip p {
  display: flex;
  gap: 6px;
  margin: 0;
  line-height: 1.8;
}

.order-tooltip span {
  width: 86px;
  color: #8b9699;
  text-align: right;
}

.order-tooltip hr {
  border: 0;
  border-top: 1px solid #edf1f1;
  margin: 8px 0;
}
</style>
