<template>
  <div id="app">
    <aside class="app-nav">
      <div class="brand">SVG Gantt</div>
      <router-link exact to="/">首页</router-link>
      <router-link to="/basic">基础示例</router-link>
      <router-link to="/table-columns">表格列</router-link>
      <router-link to="/timeline">时间轴</router-link>
      <router-link to="/virtual-timeline">虚拟长时间轴</router-link>
      <router-link to="/performance-benchmark">性能基准</router-link>
      <router-link to="/dense-visible-tasks">高密度任务</router-link>
      <router-link to="/feature-extensions">扩展能力</router-link>
      <router-link to="/auto-row-height">自适应行高</router-link>
      <router-link to="/capacity-usage">工位负载率</router-link>
      <router-link to="/row-drag">行拖拽</router-link>
      <router-link to="/context-menu">右键菜单</router-link>
      <router-link to="/link-create">拖拽连线</router-link>
      <router-link to="/task-interaction">任务交互</router-link>
      <router-link to="/work-order-milestone">工单里程碑</router-link>
      <router-link to="/work-order-status">工单状态图例</router-link>
      <router-link to="/work-order-distribution">工单上下料</router-link>
      <router-link to="/options">配置文档</router-link>
    </aside>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
}

body {
  background: #eef3f4;
}

#app {
  display: grid;
  grid-template-columns: 164px minmax(0, 1fr);
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.app-nav {
  padding: 16px 10px;
  border-right: 1px solid #d9e4e4;
  background: #fff;
}

.brand {
  margin-bottom: 18px;
  padding: 0 8px;
  color: #20383b;
  font-size: 16px;
  font-weight: 800;
}

.app-nav a {
  display: block;
  height: 34px;
  line-height: 34px;
  padding: 0 10px;
  border-radius: 4px;
  color: #556164;
  font-size: 14px;
  text-decoration: none;
}

.app-nav a.router-link-active {
  background: #e7f5f3;
  color: #126d68;
  font-weight: 700;
}

.app-main {
  min-width: 0;
  min-height: 0;
  padding: 8px;
  overflow: hidden;
}
</style>
