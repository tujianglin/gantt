<template>
  <section class="demo-view">
    <DemoToolbar
      :start="start"
      :end="end"
      :scale-key="scaleKey"
      :scales="scaleOptions"
      @update:start="start = $event"
      @update:end="end = $event"
      @update:scale-key="scaleKey = $event"
    />
    <div class="chart-wrap">
      <VanillaGanttHost
        :rows="rows"
        :tasks="tasks"
        :blocks="blocks"
        :links="links"
        :rest-ranges="restRanges"
        :start="start"
        :end="end"
        now="2026-03-30T12:00"
        :time-scale="timeScale"
        :render-row="renderRow"
        :render-task="renderTask"
        :render-timeline="renderTimeline"
      />
    </div>
  </section>
</template>

<script>
import VanillaGanttHost from '../components/VanillaGanttHost.vue'
import DemoToolbar from '../components/DemoToolbar.vue'
import { createScheduleData } from '../demo/scheduleData'
import { scaleOptions } from '../demo/timeScales'

export default {
  name: 'CustomRenderDemo',
  components: {
    VanillaGanttHost,
    DemoToolbar
  },
  data() {
    const data = createScheduleData()
    return {
      ...data,
      start: '2026-03-30T02:00',
      end: '2026-04-02T02:00',
      scaleKey: '4h',
      scaleOptions
    }
  },
  computed: {
    timeScale() {
      return this.scaleOptions.find(scale => scale.key === this.scaleKey).value
    }
  },
  methods: {
    renderRow({ row, expanded, toggle }) {
      const fragment = document.createDocumentFragment()
      const name = document.createElement('div')
      name.className = 'custom-row-name'
      name.style.paddingLeft = `${row.level * 14}px`
      if (row.children) {
        const button = document.createElement('button')
        button.className = 'custom-row-toggle'
        button.type = 'button'
        button.textContent = expanded ? '⌄' : '›'
        name.append(button)
        name.addEventListener('click', toggle)
      }
      name.append(document.createTextNode(row.name))
      fragment.append(name)

      if (row.load !== undefined) {
        const load = document.createElement('div')
        load.className = 'custom-row-load'
        const bar = document.createElement('span')
        bar.style.width = `${row.load}%`
        const value = document.createElement('b')
        value.textContent = `${row.load}%`
        load.append(bar, value)
        fragment.append(load)
      }

      return fragment
    },
    renderTask({ task }) {
      const node = document.createElement('div')
      node.className = `custom-task custom-task--${task.status || 'normal'}`

      if (task.status === 'load' || task.status === 'unload') {
        return node
      }

      const title = document.createElement('strong')
      title.textContent = task.title
      const meta = document.createElement('span')
      meta.textContent = task.summary || task.parentAggregate ? '' : task.subtitle || ''
      node.append(title, meta)
      return node
    },
    renderTimeline({ unit, major }) {
      const node = document.createElement('div')
      node.className = `custom-timeline${major ? ' custom-timeline--major' : ''}`
      node.textContent = unit.label
      return node
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

.chart-wrap {
  min-height: 0;
  flex: 1;
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
  border: 0;
  background: transparent;
  color: #168f87;
  font-size: 18px;
  line-height: 18px;
  cursor: pointer;
}

.custom-row-load {
  position: relative;
  height: 16px;
  width: 100%;
  margin-top: 10px;
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
