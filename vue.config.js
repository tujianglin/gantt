const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  publicPath: process.env.NODE_ENV === 'production'
    ? (process.env.VUE_APP_PUBLIC_PATH || '/gantt/')
    : '/',
  transpileDependencies: true,
  lintOnSave: false
})
