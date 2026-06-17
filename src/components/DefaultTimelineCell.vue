<template>
  <div class="timeline-cell" :class="{ 'timeline-cell--day': unit.type === 'day' }">
    {{ unit.label }}
  </div>
</template>

<script>
export default {
  name: 'DefaultTimelineCell',
  props: {
    unit: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.timeline-cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #474f52;
  font-size: 12px;
  font-weight: 600;
  background: #e5ebeb;
  border-right: 1px solid #d5dddd;
  white-space: nowrap;
}

.timeline-cell--day {
  background: #d4dddd;
  font-size: 13px;
}
</style>
