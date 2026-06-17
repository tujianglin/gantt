<template>
  <div class="hello">
    <div class="hero">
      <h1>{{ msg }}</h1>
      <p>基于 Vue 2 的甘特图项目</p>
    </div>
    <div class="features">
      <div class="feature-card" v-for="feature in features" :key="feature.title">
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.desc }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data() {
    return {
      features: [
        { title: 'Vue 2', desc: '渐进式 JavaScript 框架，易于上手' },
        { title: 'Webpack', desc: '强大的模块打包工具，Vue CLI 内置' },
        { title: '热重载', desc: '开发时保存即刷新，提升开发效率' }
      ]
    }
  }
}
</script>

<style scoped>
.hello {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
}

.hero {
  text-align: center;
  margin-bottom: 50px;
}

.hero h1 {
  font-size: 2.4em;
  color: #42b983;
  margin-bottom: 12px;
}

.hero p {
  font-size: 1.1em;
  color: #666;
}

.features {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 900px;
}

.feature-card {
  background: #fff;
  border-radius: 8px;
  padding: 28px 24px;
  width: 260px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-card h3 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 1.2em;
}

.feature-card p {
  color: #888;
  font-size: 0.95em;
  line-height: 1.5;
}
</style>
