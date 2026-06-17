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
      <GanttChart
        :rows="rows"
        :tasks="tasks"
        :blocks="blocks"
        :links="links"
        :rest-ranges="restRanges"
        :start="start"
        :end="end"
        now="2026-03-30T12:00"
        :time-scale="timeScale"
        :task-component="customTask"
        :timeline-component="customTimeline"
      >
        <template #row="{ row, expanded, toggle }">
          <div
            class="custom-row-name"
            :style="{ paddingLeft: `${row.level * 14}px` }"
            @click="row.children && toggle()"
          >
            <button v-if="row.children" class="custom-row-toggle" type="button">
              {{ expanded ? '⌄' : '›' }}
            </button>
            {{ row.name }}
          </div>
          <div v-if="row.load !== undefined" class="custom-row-load">
            <span :style="{ width: `${row.load}%` }"></span>
            <b>{{ row.load }}%</b>
          </div>
        </template>
      </GanttChart>
    </div>
  </section>
</template>

<script>
import GanttChart from '../components/GanttChart.vue'
import DemoToolbar from '../components/DemoToolbar.vue'
import CustomTask from '../components/demo/CustomTask.vue'
import CustomTimelineCell from '../components/demo/CustomTimelineCell.vue'
import { createScheduleData } from '../demo/scheduleData'
import { scaleOptions } from '../demo/timeScales'

export default {
  name: 'CustomRenderDemo',
  components: {
    GanttChart,
    DemoToolbar
  },
  data() {
    const data = createScheduleData()
    return {
      ...data,
      start: '2026-03-30T02:00',
      end: '2026-04-02T02:00',
      scaleKey: '4h',
      scaleOptions,
      customTask: CustomTask,
      customTimeline: CustomTimelineCell
    }
  },
  computed: {
    timeScale() {
      return this.scaleOptions.find(scale => scale.key === this.scaleKey).value
    }
  }
}
</script>

<style scoped>
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
</style>
