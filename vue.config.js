const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  publicPath: process.env.NODE_ENV === 'production'
    ? (process.env.VUE_APP_PUBLIC_PATH || '/gantt/')
    : '/',
  configureWebpack: {
    performance: {
      maxAssetSize: 450 * 1024,
      maxEntrypointSize: 450 * 1024
    }
  },
  transpileDependencies: true,
  lintOnSave: false
})
