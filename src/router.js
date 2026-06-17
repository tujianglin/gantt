import Vue from 'vue'
import Router from 'vue-router'
import BasicDemo from './views/BasicDemo.vue'
import CustomRenderDemo from './views/CustomRenderDemo.vue'
import MultiPlanDemo from './views/MultiPlanDemo.vue'
import WorkOrderStatusDemo from './views/WorkOrderStatusDemo.vue'

Vue.use(Router)

export default new Router({
  mode: 'hash',
  routes: [
    {
      path: '/',
      redirect: '/basic'
    },
    {
      path: '/basic',
      name: 'basic',
      component: BasicDemo,
      meta: {
        title: '基础排产'
      }
    },
    {
      path: '/custom',
      name: 'custom',
      component: CustomRenderDemo,
      meta: {
        title: '自定义渲染'
      }
    },
    {
      path: '/multi-plan',
      name: 'multi-plan',
      component: MultiPlanDemo,
      meta: {
        title: '多计划泳道'
      }
    },
    {
      path: '/work-order-status',
      name: 'work-order-status',
      component: WorkOrderStatusDemo,
      meta: {
        title: '工单状态图例'
      }
    }
  ]
})
