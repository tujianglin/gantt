<template>
  <section class="home-page">
    <div class="home-hero">
      <div class="home-copy">
        <p class="home-kicker">SVG Scheduling Gantt</p>
        <h1>通用排产甘特图组件</h1>
        <p class="home-desc">
          基于 SVG 和 DOM foreignObject 实现，支持树形资源、虚拟长时间轴、连接线、任务交互、自定义模板和独立包构建。
        </p>
        <div class="home-actions">
          <router-link class="home-primary" to="/work-order-status">查看工单示例</router-link>
          <router-link class="home-secondary" to="/options">配置文档</router-link>
        </div>
      </div>
      <div class="home-preview" aria-label="甘特图预览">
        <div class="preview-table">
          <span>资源</span>
          <span>班组</span>
          <b>热处理</b>
          <b>A1</b>
          <b>外协加工</b>
          <b>B3</b>
          <b>精加工</b>
          <b>C2</b>
        </div>
        <div class="preview-chart">
          <div class="preview-axis">
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
          </div>
          <div class="preview-row">
            <i class="bar bar-a"></i>
            <i class="sub sub-a"></i>
          </div>
          <div class="preview-row">
            <i class="bar bar-b"></i>
            <i class="sub sub-b"></i>
          </div>
          <div class="preview-row">
            <i class="bar bar-c"></i>
            <i class="sub sub-c"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="home-section">
      <h2>能力入口</h2>
      <div class="feature-grid">
        <router-link v-for="item in demos" :key="item.path" class="feature-card" :to="item.path">
          <strong>{{ item.title }}</strong>
          <span>{{ item.desc }}</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      demos: [
        { path: '/basic', title: '基础示例', desc: '最小可用配置和基础任务条。' },
        { path: '/virtual-timeline', title: '虚拟长时间轴', desc: '长时间范围、刻度切换和虚拟渲染。' },
        { path: '/performance-benchmark', title: '性能基准', desc: '10k/50k 行和连接线压测。' },
        { path: '/work-order-status', title: '工单状态图例', desc: '树形工艺、状态图例和连接线高亮。' },
        { path: '/link-create', title: '拖拽连线', desc: '连接点模板、连接规则和线型配置。' },
        { path: '/auto-row-height', title: '自适应行高', desc: '多计划、多上下料任务自动撑开行高。' }
      ]
    }
  }
}
</script>

<style>
.home-page {
  min-height: 100%;
  overflow: auto;
  background: #f4f7f8;
}

.home-hero {
  min-height: 430px;
  display: grid;
  grid-template-columns: minmax(320px, 0.82fr) minmax(480px, 1.18fr);
  gap: 28px;
  align-items: center;
  padding: 40px;
  background: #eef5f4;
  border: 1px solid #d8e5e3;
}

.home-kicker {
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.home-copy h1 {
  margin: 12px 0 14px;
  color: #19383c;
  font-size: 40px;
  line-height: 1.14;
  letter-spacing: 0;
}

.home-desc {
  max-width: 560px;
  color: #4e6268;
  font-size: 16px;
  line-height: 1.75;
}

.home-actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
}

.home-actions a {
  height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.home-primary {
  background: #13766f;
  color: #fff;
}

.home-secondary {
  border: 1px solid #bdd4d0;
  background: #fff;
  color: #275257;
}

.home-preview {
  min-width: 0;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  border: 1px solid #cbdad9;
  background: #fff;
  box-shadow: 0 16px 42px rgba(31, 63, 68, 0.1);
}

.preview-table {
  display: grid;
  grid-template-columns: 1fr 64px;
  grid-auto-rows: 52px;
  border-right: 1px solid #dbe7e6;
}

.preview-table span,
.preview-table b {
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #edf2f2;
  color: #365256;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-table span {
  height: 44px;
  background: #f8fbfb;
  font-weight: 800;
}

.preview-table b {
  font-weight: 600;
}

.preview-chart {
  min-width: 0;
  overflow: hidden;
}

.preview-axis {
  height: 44px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid #dbe7e6;
  background: #f8fbfb;
}

.preview-axis span {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e7eeee;
  color: #587078;
  font-size: 12px;
}

.preview-row {
  position: relative;
  height: 52px;
  border-bottom: 1px solid #edf2f2;
  background-image: linear-gradient(to right, #eef3f3 1px, transparent 1px);
  background-size: 25% 100%;
}

.preview-row i {
  position: absolute;
  display: block;
  border-radius: 4px;
}

.bar {
  top: 10px;
  height: 22px;
}

.sub {
  top: 37px;
  height: 5px;
}

.bar-a {
  left: 8%;
  width: 42%;
  background: #71d6cb;
}

.sub-a {
  left: 12%;
  width: 30%;
  background: #f1b84b;
}

.bar-b {
  left: 28%;
  width: 48%;
  background: #b49be5;
}

.sub-b {
  left: 34%;
  width: 22%;
  background: #ea6b73;
}

.bar-c {
  left: 18%;
  width: 64%;
  background: #7fb3e8;
}

.sub-c {
  left: 50%;
  width: 25%;
  background: #48b27c;
}

.home-section {
  padding: 28px 40px 40px;
}

.home-section h2 {
  margin-bottom: 16px;
  color: #20383b;
  font-size: 20px;
  letter-spacing: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.feature-card {
  min-height: 96px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #dbe6ea;
  border-radius: 6px;
  background: #fff;
  color: #344b50;
  text-decoration: none;
}

.feature-card strong {
  color: #183b3f;
  font-size: 15px;
}

.feature-card span {
  color: #65767b;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 980px) {
  .home-hero {
    grid-template-columns: 1fr;
    padding: 28px;
  }

  .home-preview {
    grid-template-columns: 160px minmax(0, 1fr);
  }
}
</style>
