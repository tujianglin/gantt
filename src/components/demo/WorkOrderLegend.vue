<template>
  <div class="legend">
    <section>
      <h3>物流单状态图例</h3>
      <div v-for="item in logistics" :key="item.label" class="legend-row">
        <i class="legend-swatch" :style="{ background: item.color }"></i>
        <span>{{ item.label }}</span>
      </div>
    </section>
    <section>
      <h3>工单状态图例</h3>
      <div v-for="item in workOrders" :key="item.label" class="legend-row">
        <i
          class="legend-swatch"
          :class="item.className"
          :style="{ background: item.color, borderColor: item.borderColor }"
        ></i>
        <span>{{ item.label }}</span>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'WorkOrderLegend',
  data() {
    return {
      logistics: [
        { label: '上料物流单已完成', color: '#d9d9d9' },
        { label: '上料物流单执行中', color: '#2f9bff' },
        { label: '上料物流单待执行', color: '#bfe7ff' },
        { label: '下料物流单已完成', color: '#969696' },
        { label: '下料物流单执行中', color: '#9652e6' },
        { label: '下料物流单待执行', color: '#eadbff' }
      ],
      workOrders: [
        { label: '未开启', color: '#d8d8d8', className: 'legend-dot' },
        { label: '进度正常', color: '#40c51b', className: 'legend-dot' },
        { label: '轻微滞后', color: '#ffa51d', className: 'legend-dot' },
        { label: '严重滞后', color: '#ff4756', className: 'legend-dot' },
        { label: '已完成工单', color: '#fff', className: 'legend-striped' },
        { label: '前序外协未完成', color: '#ffe8bd' },
        { label: '重排前移', color: '#fff', borderColor: '#40c51b' },
        { label: '重排后移', color: '#fff', borderColor: '#ff4b55' },
        { label: '非班次时间', color: '#ffffff', borderColor: '#edf1f2' },
        { label: '班次时间', color: '#f2f3f3' },
        { label: '冻结区非班次时间', color: '#d7d7d7' },
        { label: '冻结区班次时间', color: '#bdbdbd' },
        { label: '停机时间', color: '#fdeeee' }
      ]
    }
  }
}
</script>

<style scoped>
.legend {
  display: grid;
  grid-template-columns: 210px 230px;
  gap: 22px;
  padding: 10px 14px;
  border: 1px solid #dfe8e8;
  border-bottom: 0;
  background: #fff;
}

.legend h3 {
  margin-bottom: 8px;
  color: #7a8588;
  font-size: 14px;
  font-weight: 700;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 24px;
  color: #586367;
  font-size: 13px;
}

.legend-swatch {
  width: 20px;
  height: 16px;
  border: 2px solid transparent;
}

.legend-dot {
  width: 10px;
  height: 10px;
  margin-left: 5px;
  border-radius: 50%;
}

.legend-striped {
  background-image: repeating-linear-gradient(
    45deg,
    #8f8f8f 0,
    #8f8f8f 2px,
    transparent 2px,
    transparent 8px
  );
}
</style>
