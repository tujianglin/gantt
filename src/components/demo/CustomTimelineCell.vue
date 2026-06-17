<template>
  <div class="custom-timeline" :class="{ 'custom-timeline--day': unit.type === 'day' }">
    {{ unit.label }}
  </div>
</template>

<script>
export default {
  name: 'CustomTimelineCell',
  props: {
    unit: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
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

.custom-timeline--day {
  background: #dce9e8;
  color: #243f3d;
  font-weight: 700;
}
</style>
