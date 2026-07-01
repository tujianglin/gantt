import Vue from 'vue'
import Router from 'vue-router'
import HomePage from './views/HomePage.vue'

const BasicDemo = () => import('./views/BasicDemo.vue')
const TableColumnsDemo = () => import('./views/TableColumnsDemo.vue')
const TimelineDemo = () => import('./views/TimelineDemo.vue')
const RestTimeDentDemo = () => import('./views/RestTimeDentDemo.vue')
const VirtualTimelineDemo = () => import('./views/VirtualTimelineDemo.vue')
const PerformanceBenchmarkDemo = () => import('./views/PerformanceBenchmarkDemo.vue')
const DenseVisibleTasksDemo = () => import('./views/DenseVisibleTasksDemo.vue')
const FeatureExtensionsDemo = () => import('./views/FeatureExtensionsDemo.vue')
const AutoRowHeightDemo = () => import('./views/AutoRowHeightDemo.vue')
const CapacityUsageDemo = () => import('./views/CapacityUsageDemo.vue')
const RowDragDemo = () => import('./views/RowDragDemo.vue')
const ContextMenuDemo = () => import('./views/ContextMenuDemo.vue')
const LinkCreateDemo = () => import('./views/LinkCreateDemo.vue')
const TaskInteractionDemo = () => import('./views/TaskInteractionDemo.vue')
const WorkOrderMilestoneDemo = () => import('./views/WorkOrderMilestoneDemo.vue')
const WorkOrderStatusDemo = () => import('./views/WorkOrderStatusDemo.vue')
const WorkOrderDistributionDemo = () => import('./views/WorkOrderDistributionDemo.vue')
const OptionsDocs = () => import('./views/OptionsDocs.vue')

Vue.use(Router)

export default new Router({
  mode: 'hash',
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: {
        title: '首页'
      }
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
      path: '/rest-time-dent',
      name: 'rest-time-dent',
      component: RestTimeDentDemo,
      meta: {
        title: '休息时间段'
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
      path: '/dense-visible-tasks',
      name: 'dense-visible-tasks',
      component: DenseVisibleTasksDemo,
      meta: {
        title: '高密度可视任务'
      }
    },
    {
      path: '/feature-extensions',
      name: 'feature-extensions',
      component: FeatureExtensionsDemo,
      meta: {
        title: '扩展能力'
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
      path: '/work-order-distribution',
      name: 'work-order-distribution',
      component: WorkOrderDistributionDemo,
      meta: {
        title: '工单上下料'
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
