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
  name: 'BasicDemo',
  components: {
    VanillaGanttHost,
    DemoToolbar
  },
  data() {
    const data = createScheduleData()
    return {
      ...data,
      start: '2026-03-30T02:00',
      end: '2026-04-01T18:00',
      scaleKey: '2h',
      scaleOptions
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
</style>
