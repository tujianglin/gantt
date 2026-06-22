<template>
  <section class="link-create-page">
    <div class="link-create-toolbar">
      <label>
        <span>连接</span>
        <select v-model="linkCreatable">
          <option :value="true">开启</option>
          <option :value="false">关闭</option>
        </select>
      </label>
      <label>
        <span>虚实</span>
        <select v-model="linePattern">
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
        </select>
      </label>
      <label>
        <span>路径</span>
        <select v-model="pathMode">
          <option value="straight">直线</option>
          <option value="polyline">折线</option>
          <option value="curved">曲线</option>
          <option value="smoothstep">Smoothstep</option>
          <option value="oblique">斜线</option>
        </select>
      </label>
      <label>
        <span>规则</span>
        <select v-model="ruleMode">
          <option value="all">全部允许</option>
          <option value="process">限定工艺顺序</option>
          <option value="endpoint">指定起点/终点</option>
          <option value="side">单侧禁止</option>
        </select>
      </label>
      <strong>{{ links.length }} 条连接</strong>
      <button type="button" @click="clearLinks">清空连接</button>
    </div>
    <div class="link-create-body">
      <div ref="gantt" class="link-create-chart"></div>
      <aside class="link-create-log">
        <h3>连接记录</h3>
        <p v-if="!links.length">暂无连接</p>
        <p v-for="link in links" :key="link.id">
          {{ link.from }} -> {{ link.to }} / {{ link.type }}
        </p>
      </aside>
    </div>
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

export default {
  name: 'LinkCreateDemo',
  data() {
    const records = [
      {
        id: 'line-a',
        name: '产线 A',
        owner: '王工',
        tasks: [
          { id: 'link-a1', title: '下料 A1', subtitle: '起点', startDate: '2026-03-30T02:00:00', endDate: '2026-03-30T10:00:00', status: 'green' },
          { id: 'link-a2', title: '热处理 A2', subtitle: '工艺中转', startDate: '2026-03-30T13:00:00', endDate: '2026-03-31T04:00:00', status: 'orange' },
          { id: 'link-a3', title: '质检 A3', subtitle: '目标', startDate: '2026-03-31T08:00:00', endDate: '2026-03-31T14:00:00', status: 'blue' }
        ]
      },
      {
        id: 'line-b',
        name: '产线 B',
        owner: '李工',
        tasks: [
          { id: 'link-b1', title: '粗加工 B1', subtitle: '起点', startDate: '2026-03-30T04:00:00', endDate: '2026-03-30T16:00:00', status: 'blue' },
          { id: 'link-b2', title: '外协 B2', subtitle: '目标', startDate: '2026-03-30T18:00:00', endDate: '2026-03-31T12:00:00', status: 'purple' }
        ]
      },
      {
        id: 'line-c',
        name: '产线 C',
        owner: '赵工',
        tasks: [
          { id: 'link-c1', title: '总装 C1', subtitle: '目标', startDate: '2026-03-30T09:00:00', endDate: '2026-03-31T00:00:00', status: 'green' },
          { id: 'link-c2', title: '包装 C2', subtitle: '目标', startDate: '2026-03-31T06:00:00', endDate: '2026-03-31T18:00:00', status: 'orange' }
        ]
      }
    ]
    return {
      gantt: null,
      records,
      linkCreatable: true,
      linePattern: 'solid',
      pathMode: 'polyline',
      ruleMode: 'process',
      links: [
        { id: 'seed-link', from: 'link-a1', to: 'link-a2', type: 'finish_to_start', color: '#168dff' }
      ],
      options: {
        minDate: '2026-03-30T00:00:00',
        maxDate: '2026-04-01T00:00:00',
        rowHeight: 82,
        taskListTable: {
          tableWidth: 260,
          columns: [
            { field: 'name', title: '资源', width: 160, tree: true },
            { field: 'owner', title: '负责人', width: 100 }
          ]
        },
        timelineHeader: {
          scales: [
            { unit: 'day', step: 1, rowHeight: 24, style: { backgroundColor: '#eaf3f8', fontWeight: '700' } },
            { unit: 'hour', step: 2, colWidth: 62, rowHeight: 24 }
          ]
        },
        taskBar: {
          customLayout: this.renderTask,
          tooltip: {
            visible: true,
            customLayout: this.renderTooltip
          }
        },
        dependency: {
          showLinks: true,
          highlightConnected: false,
          linkSelectable: true,
          linkDeletable: true,
          linkCreatable: true,
          linkCreateRules: {
            allowDuplicate: false,
            pairs: [
              { from: 'link-a1', to: 'link-a2' },
              { from: 'link-a2', to: 'link-a3' },
              { from: 'link-b1', to: 'link-b2' },
              { from: 'link-c1', to: 'link-c2' }
            ]
          },
          linkConnector: {
            width: 18,
            height: 18,
            startLayout: this.renderStartConnector,
            finishLayout: this.renderFinishConnector
          },
          lineMode: {
            pattern: 'solid',
            path: 'polyline'
          },
          linkLineStyle: { lineColor: '#168dff', lineWidth: 2 },
          links: null,
          onLinkCreate: this.handleLinkCreate,
          onLinkDelete: this.handleLinkDelete
        },
        grid: {
          backgroundColor: '#fff',
          verticalLine: { lineColor: '#e5edf0' },
          horizontalLine: { lineColor: '#e5edf0' }
        },
        records
      }
    }
  },
  created() {
    this.options.dependency.links = this.links
  },
  watch: {
    linkCreatable: 'syncDependency',
    linePattern: 'syncDependency',
    pathMode: 'syncDependency',
    ruleMode: 'syncDependency'
  },
  mounted() {
    this.gantt = new VanillaGantt(this.$refs.gantt, this.options)
  },
  beforeDestroy() {
    if (this.gantt) this.gantt.destroy()
  },
  methods: {
    syncDependency() {
      const linkCreateRules = this.createLinkRules()
      this.options.dependency.linkCreatable = this.linkCreatable
      this.options.dependency.lineMode = {
        pattern: this.linePattern,
        path: this.pathMode
      }
      this.options.dependency.linkCreateRules = linkCreateRules
      if (this.gantt) {
        this.gantt.setOptions({
          dependency: {
            linkCreatable: this.linkCreatable,
            lineMode: this.options.dependency.lineMode,
            linkCreateRules
          }
        })
      }
    },
    createLinkRules() {
      const processPairs = [
        { from: 'link-a1', to: 'link-a2' },
        { from: 'link-a2', to: 'link-a3' },
        { from: 'link-b1', to: 'link-b2' },
        { from: 'link-c1', to: 'link-c2' }
      ]
      const rulesMap = {
        all: {
          allowDuplicate: false
        },
        process: {
          allowDuplicate: false,
          pairs: processPairs
        },
        endpoint: {
          allowDuplicate: false,
          fromTaskKeys: ['link-a1', 'link-b1'],
          toTaskKeys: ['link-a3', 'link-b2', 'link-c2']
        },
        side: {
          allowDuplicate: false,
          disabledFromTaskKeys: ['link-a1'],
          disabledToTaskKeys: ['link-a3']
        }
      }
      return rulesMap[this.ruleMode] || rulesMap.all
    },
    handleLinkCreate({ link }) {
      const next = {
        ...link,
        id: `user-link-${Date.now()}-${this.links.length}`,
        color: '#168dff',
        lineMode: {
          pattern: this.linePattern,
          path: this.pathMode
        }
      }
      this.links = [...this.links, next]
      this.options.dependency.links = this.links
      if (this.gantt) this.gantt.setOptions({ dependency: { links: this.links } })
      return false
    },
    handleLinkDelete({ link }) {
      const key = `${String(link.from)}->${String(link.to)}`
      this.links = this.links.filter(item => `${String(item.from)}->${String(item.to)}` !== key)
      this.options.dependency.links = this.links
      if (this.gantt) this.gantt.setOptions({ dependency: { links: this.links } })
      return false
    },
    clearLinks() {
      this.links = []
      this.options.dependency.links = []
      if (this.gantt) this.gantt.setOptions({ dependency: { links: [] } })
    },
    renderStartConnector() {
      return '<span class="link-connector link-connector--in"></span>'
    },
    renderFinishConnector() {
      return '<span class="link-connector link-connector--out"></span>'
    },
    renderTask({ task }) {
      return `
        <div class="link-task link-task--${escapeHtml(task.status || 'normal')}">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.subtitle)}</span>
        </div>
      `
    },
    renderTooltip({ task, row }) {
      return `
        <div class="link-tooltip">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(row && row.name)}</span>
        </div>
      `
    }
  }
}
</script>

<style>
.link-create-page {
  height: 100%;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.link-create-toolbar {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
  color: #52656b;
  font-size: 13px;
}

.link-create-toolbar label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.link-create-toolbar select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #cdd9dd;
  border-radius: 4px;
  background: #fff;
  color: #31464f;
}

.link-create-toolbar strong {
  color: #176b87;
}

.link-create-toolbar button {
  height: 30px;
  padding: 0 10px;
  border: 1px solid #cdd9dd;
  border-radius: 4px;
  background: #fff;
  color: #31464f;
  cursor: pointer;
}

.link-create-body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  border: 1px solid #dfe8e8;
}

.link-create-chart {
  min-width: 0;
  min-height: 0;
}

.link-create-log {
  min-width: 0;
  padding: 12px;
  border-left: 1px solid #dfe8e8;
  background: #fff;
  overflow: auto;
}

.link-create-log h3 {
  margin-bottom: 10px;
  color: #31464f;
  font-size: 14px;
}

.link-create-log p {
  min-height: 24px;
  color: #5e7077;
  font-size: 12px;
  line-height: 1.5;
}

.link-task {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid #86c8c0;
  border-radius: 4px;
  background: #dff4f1;
  color: #274247;
  overflow: hidden;
}

.link-task--green {
  background: #a8eee5;
}

.link-task--orange {
  border-color: #e0bd55;
  background: #fff0b5;
}

.link-task--blue {
  border-color: #8db7e8;
  background: #d8eaff;
}

.link-task--purple {
  border-color: #b595e2;
  background: #eadcff;
}

.link-task strong,
.link-task span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-task strong {
  font-size: 13px;
}

.link-task span {
  color: #61737a;
  font-size: 12px;
}

.link-connector {
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(29, 55, 62, 0.18);
}

.link-connector::after {
  content: '';
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}

.link-connector--in {
  color: #40c51b;
}

.link-connector--out {
  color: #168dff;
}

.link-tooltip {
  display: grid;
  gap: 4px;
}

.link-tooltip span {
  color: #66777e;
  font-size: 12px;
}
</style>
