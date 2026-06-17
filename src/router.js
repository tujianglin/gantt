import Vue from 'vue'
import Router from 'vue-router'
import BasicDemo from './views/BasicDemo.vue'
import TableColumnsDemo from './views/TableColumnsDemo.vue'
import TimelineDemo from './views/TimelineDemo.vue'
import TaskInteractionDemo from './views/TaskInteractionDemo.vue'
import WorkOrderStatusDemo from './views/WorkOrderStatusDemo.vue'
import OptionsDocs from './views/OptionsDocs.vue'

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
        title: '基础示例'
      }
    },
    {
      path: '/table-columns',
      name: 'table-columns',
      component: TableColumnsDemo,
      meta: {
        title: '表格列'
      }
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: TimelineDemo,
      meta: {
        title: '时间轴'
      }
    },
    {
      path: '/task-interaction',
      name: 'task-interaction',
      component: TaskInteractionDemo,
      meta: {
        title: '任务交互'
      }
    },
    {
      path: '/work-order-status',
      name: 'work-order-status',
      component: WorkOrderStatusDemo,
      meta: {
        title: '工单状态图例'
      }
    },
    {
      path: '/options',
      name: 'options',
      component: OptionsDocs,
      meta: {
        title: '配置文档'
      }
    },
    {
      path: '*',
      redirect: '/basic'
    }
  ]
})
