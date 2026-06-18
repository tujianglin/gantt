import Vue from 'vue'
import Router from 'vue-router'
import BasicDemo from './views/BasicDemo.vue'
import TableColumnsDemo from './views/TableColumnsDemo.vue'
import TimelineDemo from './views/TimelineDemo.vue'
import VirtualTimelineDemo from './views/VirtualTimelineDemo.vue'
import PerformanceBenchmarkDemo from './views/PerformanceBenchmarkDemo.vue'
import AutoRowHeightDemo from './views/AutoRowHeightDemo.vue'
import CapacityUsageDemo from './views/CapacityUsageDemo.vue'
import RowDragDemo from './views/RowDragDemo.vue'
import ContextMenuDemo from './views/ContextMenuDemo.vue'
import LinkCreateDemo from './views/LinkCreateDemo.vue'
import TaskInteractionDemo from './views/TaskInteractionDemo.vue'
import WorkOrderMilestoneDemo from './views/WorkOrderMilestoneDemo.vue'
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
      path: '/virtual-timeline',
      name: 'virtual-timeline',
      component: VirtualTimelineDemo,
      meta: {
        title: '虚拟长时间轴'
      }
    },
    {
      path: '/performance-benchmark',
      name: 'performance-benchmark',
      component: PerformanceBenchmarkDemo,
      meta: {
        title: '性能基准'
      }
    },
    {
      path: '/auto-row-height',
      name: 'auto-row-height',
      component: AutoRowHeightDemo,
      meta: {
        title: '自适应行高'
      }
    },
    {
      path: '/capacity-usage',
      name: 'capacity-usage',
      component: CapacityUsageDemo,
      meta: {
        title: '工位负载率'
      }
    },
    {
      path: '/row-drag',
      name: 'row-drag',
      component: RowDragDemo,
      meta: {
        title: '行拖拽'
      }
    },
    {
      path: '/context-menu',
      name: 'context-menu',
      component: ContextMenuDemo,
      meta: {
        title: '右键菜单'
      }
    },
    {
      path: '/link-create',
      name: 'link-create',
      component: LinkCreateDemo,
      meta: {
        title: '拖拽连线'
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
      path: '/work-order-milestone',
      name: 'work-order-milestone',
      component: WorkOrderMilestoneDemo,
      meta: {
        title: '工单里程碑'
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
