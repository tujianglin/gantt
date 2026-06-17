<template>
  <div class="demo-toolbar">
    <label>
      <span>开始</span>
      <input :value="start" type="datetime-local" @input="$emit('update:start', $event.target.value)" />
    </label>
    <label>
      <span>结束</span>
      <input :value="end" type="datetime-local" @input="$emit('update:end', $event.target.value)" />
    </label>
    <label>
      <span>刻度</span>
      <select :value="scaleKey" @change="$emit('update:scale-key', $event.target.value)">
        <option v-for="scale in scales" :key="scale.key" :value="scale.key">
          {{ scale.label }}
        </option>
      </select>
    </label>
  </div>
</template>

<script>
export default {
  name: 'DemoToolbar',
  props: {
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    },
    scaleKey: {
      type: String,
      required: true
    },
    scales: {
      type: Array,
      required: true
    }
  }
}
</script>

<style scoped>
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
</style>
