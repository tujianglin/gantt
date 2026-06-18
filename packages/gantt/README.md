# @wimi/gantt

基于 SVG + DOM `foreignObject` 的通用排产甘特图组件，不绑定 Vue/React 等框架。组件只接收一个 DOM 容器和一份 `options`，通过 `setOptions` 增量更新。

## 安装和引入

```bash
npm install @wimi/gantt
```

```js
import { VanillaGantt } from '@wimi/gantt'
import '@wimi/gantt/style.css'
```

浏览器直接引入 UMD：

```html
<link rel="stylesheet" href="./dist/VanillaGantt.css" />
<script src="./dist/VanillaGantt.umd.js"></script>
<script>
  const { VanillaGantt } = window.VanillaGantt
</script>
```

## 独立开发和打包

`packages/gantt` 是独立 TypeScript 工具包，不依赖外层 Vue demo 工程。进入包目录后可单独安装依赖并打包：

```bash
cd packages/gantt
npm install
npm run build
```

打包工具使用 Vite library mode，入口为 `src/index.ts`，产物输出到 `dist`：

| 格式 | 文件 |
| --- | --- |
| ES Module | `dist/VanillaGantt.es.js` |
| CommonJS | `dist/VanillaGantt.cjs` |
| UMD | `dist/VanillaGantt.umd.js` |
| CSS | `dist/VanillaGantt.css` |

TypeScript 类型入口为 `types/index.d.ts`，由 `package.json` 的 `types` 和 `exports["."].types` 暴露。

## 最小示例

```html
<div id="gantt" style="height: 420px"></div>
```

```js
const gantt = new VanillaGantt(document.querySelector('#gantt'), {
  minDate: '2026-03-30T00:00:00',
  maxDate: '2026-03-31T00:00:00',
  records: [
    {
      id: 'unit-1',
      name: '机组 1',
      tasks: [
        {
          id: 'task-1',
          title: '计划工单',
          subtitle: 'A001',
          startDate: '2026-03-30T08:00:00',
          endDate: '2026-03-30T14:00:00',
          progress: 40
        }
      ]
    }
  ],
  taskListTable: {
    columns: [
      { field: 'name', title: '资源', width: 160, tree: true }
    ]
  },
  timelineHeader: {
    scales: [
      { unit: 'day', step: 1, rowHeight: 24 },
      { unit: 'hour', step: 2, colWidth: 56, rowHeight: 24 }
    ]
  }
})
```

## 表格列和自定义单元格

左侧表格通过 `taskListTable.columns` 配置，可多列显示，每列支持独立宽度、最小宽度、表头对齐、单元格对齐、列宽拖拽、表头模板和单元格模板。

```js
const options = {
  taskListTable: {
    tableWidth: 'auto',
    minTableWidth: 180,
    maxTableWidth: 720,
    columnResizable: true,
    headerStyle: {
      backgroundColor: '#eaf3f8',
      color: '#2f4858',
      fontWeight: '700'
    },
    columns: [
      { field: 'name', title: '资源', width: 160, minWidth: 120, tree: true },
      {
        field: 'stage',
        title: '工序',
        width: 90,
        renderHeader: () => '<strong>工序</strong>'
      },
      {
        title: '任务数',
        width: 72,
        align: 'right',
        headerAlign: 'right',
        valueGetter: ({ row }) => (row.tasks || []).length
      },
      {
        title: '状态',
        width: 96,
        headerStyle: { backgroundColor: '#dcecf4' },
        valueGetter: ({ row }) => row.status || '',
        renderCell: ({ value }) => `<span class="status-pill">${value || '-'}</span>`
      }
    ]
  }
}
```

树节点默认使用第一列 `field: 'name'` 作为树列，也可以显式设置 `tree: true`。如果自定义树单元格，需要给展开按钮加 `data-vg-toggle`：

```js
{
  field: 'name',
  title: '资源',
  tree: true,
  renderCell: ({ row, expanded }) => `
    <div class="resource-cell" style="padding-left:${row.level * 16}px">
      ${row.children ? `<button data-vg-toggle>${expanded ? '收起' : '展开'}</button>` : ''}
      <span>${row.name}</span>
    </div>
  `
}
```

## 时间轴刻度

时间轴由 `timelineHeader.scales` 决定，数组里每一项就是一行刻度。比如 15 分钟刻度只显示两行：天 + 15 分钟。

```js
function formatMinute({ startDate }) {
  const hour = String(startDate.getHours()).padStart(2, '0')
  const minute = String(startDate.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

const options = {
  timelineHeader: {
    backgroundColor: '#f7fbfd',
    style: {
      backgroundColor: '#f7fbfd',
      color: '#53666f'
    },
    scales: [
      {
        unit: 'day',
        step: 1,
        rowHeight: 24,
        style: { backgroundColor: '#eaf3f8', fontWeight: '700' }
      },
      {
        unit: 'minute',
        step: 15,
        colWidth: 48,
        rowHeight: 24,
        format: formatMinute
      }
    ]
  }
}
```

可配置的 `unit`：`minute`、`hour`、`day`、`week`、`month`、`year`。

```js
const scalePresets = {
  hour: [
    { unit: 'day', step: 1, rowHeight: 24 },
    { unit: 'hour', step: 1, colWidth: 44, rowHeight: 24 }
  ],
  week: [
    { unit: 'month', step: 1, rowHeight: 24 },
    { unit: 'week', step: 1, colWidth: 180, rowHeight: 24 }
  ],
  month: [
    { unit: 'year', step: 1, rowHeight: 24 },
    { unit: 'month', step: 1, colWidth: 220, rowHeight: 24 }
  ]
}

gantt.setOptions({
  timelineHeader: {
    scales: scalePresets.week
  }
})
```

自定义刻度内容：

```js
timelineHeader: {
  customLayout: ({ unit, major }) => `
    <div class="timeline-cell ${major ? 'is-major' : ''}">
      ${unit.label}
    </div>
  `,
  scales: [
    { unit: 'day', step: 1 },
    { unit: 'hour', step: 2, colWidth: 64 }
  ]
}
```

## 多行任务和自定义 TaskBar

一个资源行里可以放多条任务。通过 `taskBar.lanes` 定义泳道位置，任务记录上通过 `lane` 选择泳道。下面示例中第一行是计划任务，第二行是上料任务，第三行是下料任务。

```js
const options = {
  rowHeight: 92,
  taskBar: {
    startDateField: 'startDate',
    endDateField: 'endDate',
    progressField: 'progress',
    laneField: 'lane',
    statusField: 'status',
    labelText: 'title',
    subLabelText: 'subtitle',
    lanes: [
      { key: 'plan', offset: 8, height: 58 },
      { key: 'load', offset: 70, height: 6 },
      { key: 'unload', offset: 82, height: 6 }
    ],
    customLayout: ({ task, progress }) => {
      if (task.logistics) {
        return `<div class="logistics logistics-${task.status}"></div>`
      }
      return `
        <div class="work-task work-task-${task.status || 'normal'}">
          <strong>${task.title || ''}</strong>
          <span>${task.subtitle || ''}</span>
          ${progress !== undefined ? `<i style="width:${progress}%"></i>` : ''}
        </div>
      `
    }
  },
  records: [
    {
      id: 'unit-1',
      name: '热处理炉 1',
      height: 92,
      tasks: [
        { id: 'wo-1', lane: 'plan', title: '计划工单', subtitle: 'A001', startDate: '2026-03-30T08:00', endDate: '2026-03-30T18:00', progress: 60 },
        { id: 'wo-1-load', lane: 'load', title: '上料', startDate: '2026-03-30T06:30', endDate: '2026-03-30T08:00', status: 'load-running', logistics: true },
        { id: 'wo-1-unload', lane: 'unload', title: '下料', startDate: '2026-03-30T18:00', endDate: '2026-03-30T19:00', status: 'unload-waiting', logistics: true }
      ]
    }
  ]
}
```

自定义模板中如果存在按钮、下拉等控件，并且不希望触发任务拖拽，给元素加 `data-vg-no-drag`。

```js
customLayout: ({ task }) => `
  <div class="work-task">
    <span>${task.title}</span>
    <button data-vg-no-drag>操作</button>
  </div>
`
```

## 任务交互、拖拽和 Tooltip

Tooltip 默认关闭。需要显示时配置 `taskBar.tooltip: true` 或传入对象。

```js
const options = {
  taskBar: {
    draggable: ({ task }) => !task.locked && !task.logistics,
    dragStep: 15 * 60 * 1000,
    tooltip: {
      visible: true,
      offsetX: 12,
      offsetY: 12,
      customLayout: ({ task, startDate, endDate }) => `
        <div class="task-tooltip">
          <strong>${task.title}</strong>
          <span>${startDate.toLocaleString()} - ${endDate.toLocaleString()}</span>
        </div>
      `
    },
    onClick: ({ task, row }) => {
      console.log('click', task, row)
    },
    onContextMenu: ({ task, event }) => {
      console.log('context menu', task, event.clientX, event.clientY)
    },
    onMouseEnter: ({ task }) => {
      console.log('mouseenter', task.id)
    },
    onMouseLeave: ({ task }) => {
      console.log('mouseleave', task.id)
    },
    onDragStart: ({ task }) => {
      if (task.locked) return false
    },
    onDrag: ({ sourceTask, startDate, endDate }) => {
      console.log('dragging', sourceTask.id, startDate, endDate)
    },
    onDragEnd: ({ sourceTask, startDate, endDate }) => {
      console.log('drag end', sourceTask.id, startDate, endDate)
    }
  }
}
```

拖拽结束后组件会把源任务的开始和结束字段写回原始任务对象，字段名由 `startDateField`、`endDateField` 决定。

## 树形数据和父节点任务条

`records` 支持 `children`。父节点未展开时，组件会基于所有子节点的主任务自动生成一条聚合任务条；父节点展开后，只显示子节点任务，父节点自己的聚合任务条不显示。

```js
const options = {
  records: [
    {
      id: 'heat',
      name: '热处理',
      expanded: false,
      children: [
        {
          id: 'heat-1',
          name: '热处理炉 1',
          tasks: [
            { id: 'wo-1', lane: 'plan', title: '工单 1', startDate: '2026-03-30T08:00', endDate: '2026-03-30T12:00' }
          ]
        },
        {
          id: 'heat-2',
          name: '热处理炉 2',
          tasks: [
            { id: 'wo-2', lane: 'plan', title: '工单 2', startDate: '2026-03-30T13:00', endDate: '2026-03-30T18:00' }
          ]
        }
      ]
    }
  ],
  taskBar: {
    projectStyle: {
      barColor: '#dff4f1',
      borderColor: '#8bc7c0',
      cornerRadius: 2
    }
  }
}
```

## 背景区间、休息时间和标记线

`grid.backgroundRanges` 用于整张时间区域背景，比如休息、停机、冻结区；支持精确到分钟。`grid.rowBackgroundRanges` 用于某个资源行的局部背景。

```js
const options = {
  grid: {
    backgroundColor: '#f7fbfb',
    alternatingBackgroundColor: '#f8fbfb',
    verticalLine: { lineColor: '#e8eeee' },
    horizontalLine: { lineColor: '#edf1f2' },
    backgroundRanges: [
      {
        id: 'rest-1',
        startDate: '2026-03-30T12:00:00',
        endDate: '2026-03-30T13:30:00',
        fill: '#f2f3f3',
        opacity: 1
      },
      {
        id: 'stop-1',
        startDate: '2026-03-30T19:00:00',
        endDate: '2026-03-31T05:00:00',
        fill: '#fdeeee',
        opacity: 1
      }
    ],
    rowBackgroundRanges: [
      {
        id: 'shift-unit-1',
        recordKey: 'unit-1',
        startDate: '2026-03-30T08:00:00',
        endDate: '2026-03-30T20:00:00',
        fill: '#ffe2a8',
        opacity: 0.8,
        offsetY: 8,
        height: 32
      }
    ]
  },
  markLine: [
    {
      date: '2026-03-30T12:00:00',
      content: '当前时间',
      style: { lineColor: '#35cce0', lineDash: [4, 4] },
      contentStyle: { color: '#1599aa' }
    }
  ]
}
```

## 依赖连接线

通过 `dependency.links` 定义任务依赖。`from`、`to` 都可以是单个 id 或 id 数组。默认 `showLinks: false`，即不常驻显示连接线；点击某个任务后只显示它所在的一组连接关系。点击空白区域会取消连接状态。

```js
const options = {
  dependency: {
    showLinks: false,
    highlightConnected: true,
    dimOpacity: 0.18,
    linkLineStyle: {
      lineColor: '#168dff',
      lineWidth: 2
    },
    links: [
      {
        id: 'flow-1',
        type: 'finish_to_start',
        from: 'wo-1',
        to: ['wo-2', 'wo-3'],
        color: '#168dff'
      },
      {
        id: 'flow-2',
        type: 'start_to_start',
        from: 'wo-4',
        to: 'wo-5',
        dashed: true,
        linkLineStyle: { lineColor: '#40c51b' }
      }
    ]
  }
}
```

支持的连接类型：

| type | 说明 |
| --- | --- |
| `finish_to_start` | 从前置任务结束连到后置任务开始 |
| `start_to_start` | 从前置任务开始连到后置任务开始 |
| `finish_to_finish` | 从前置任务结束连到后置任务结束 |
| `start_to_finish` | 从前置任务开始连到后置任务结束 |

## 动态更新

```js
gantt.setOptions({
  minDate: '2026-03-30T00:00:00',
  maxDate: '2026-04-02T00:00:00',
  timelineHeader: {
    scales: [
      { unit: 'day', step: 1, rowHeight: 24 },
      { unit: 'hour', step: 4, colWidth: 72, rowHeight: 24 }
    ]
  }
})
```

销毁：

```js
gantt.destroy()
```

## 完整 options 说明

### 顶层配置

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `records` | `GanttRecord[]` | `[]` | 左侧表格和任务数据 |
| `recordKeyField` | `string` | `'id'` | 资源行唯一 key 字段 |
| `taskKeyField` | `string` | `'id'` | 任务唯一 key 字段 |
| `minDate` | `string \| number \| Date` | 自动取最小任务开始时间 | 时间轴开始时间 |
| `maxDate` | `string \| number \| Date` | 自动取最大任务结束时间 | 时间轴结束时间 |
| `rowHeight` | `number \| 'auto'` | `78` | 默认行高。设置为 `'auto'` 时按当前行任务的 `offsetY + height` 自动撑开 |
| `taskHeight` | `number` | `36` | 默认任务条高度 |
| `headerRowHeight` | `number` | `24` | 默认时间刻度行高 |
| `taskListTable` | `GanttTaskListTableOptions` | 见下方 | 左侧表格配置 |
| `timelineHeader` | `GanttTimelineHeaderOptions` | 见下方 | 顶部时间轴配置 |
| `taskBar` | `GanttTaskBarOptions` | 见下方 | 任务条配置 |
| `dependency` | `GanttDependencyOptions` | 见下方 | 依赖连接线配置 |
| `grid` | `GanttGridOptions` | 见下方 | 时间区网格和背景配置 |
| `markLine` | `GanttMarkLine \| GanttMarkLine[] \| null` | `null` | 标记线 |
| `onScroll` | `(payload) => void` | `null` | 滚动回调，返回 `scrollLeft`、`scrollTop` |

### records

```ts
interface GanttRecord {
  id?: string | number
  name?: string
  type?: string
  height?: number
  load?: number
  expanded?: boolean
  children?: GanttRecord[]
  tasks?: GanttTaskRecord[]
  [key: string]: unknown
}
```

`children` 表示树形子节点；`expanded` 控制初始展开状态；`height` 可单独覆盖当前行行高。顶层 `rowHeight: 'auto'` 时，没有显式 `height` 的行会基于当前行任务的 `offsetY + height` 自动计算高度，适合一个资源包含多组计划、上料、下料的场景。

### tasks

```ts
interface GanttTaskRecord {
  id?: string | number
  title?: string
  subtitle?: string
  startDate?: string | number | Date
  endDate?: string | number | Date
  lane?: string
  status?: string
  height?: number
  offsetY?: number
  progress?: number
  locked?: boolean
  striped?: boolean
  draggable?: boolean
  milestones?: Array<{
    id?: string | number
    title?: string
    date?: string | number | Date
    width?: number
    height?: number
  }>
  [key: string]: unknown
}
```

任务字段名可以通过 `taskBar.startDateField`、`taskBar.endDateField`、`taskBar.progressField`、`taskBar.laneField`、`taskBar.statusField` 改掉。里程碑数组默认读取 `task.milestones`。

### taskListTable

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `tableWidth` | `'auto' \| number` | `'auto'` | 左侧表格宽度，`auto` 时按列宽求和 |
| `minTableWidth` | `number` | `120` | 左侧表格整体最小宽度 |
| `maxTableWidth` | `number` | `640` | 左侧表格整体最大宽度 |
| `columnResizable` | `boolean` | `true` | 是否允许拖拽调整列宽 |
| `rowDraggable` | `boolean \| function` | `false` | 是否允许上下拖拽调整行顺序，默认关闭 |
| `onRowDragEnd` | `function` | `null` | 行拖拽完成回调，返回 `record`、`sourceIndex`、`targetIndex`、`records` |
| `headerStyle` | `GanttTableHeaderStyle` | `null` | 表头整体样式 |
| `columns` | `GanttTableColumn[]` | `[{ field: 'name', title: '工位', width: 170, tree: true }]` | 表格列 |
| `renderHeader` | `renderer` | `null` | 整体表头自定义渲染 |
| `renderCell` | `renderer` | `null` | 全局单元格自定义渲染 |

`GanttTableColumn`：

| 字段 | 说明 |
| --- | --- |
| `field` | 从 row 上读取的字段名 |
| `title` | 表头文本 |
| `width` / `minWidth` / `maxWidth` | 列宽配置 |
| `resizable` | 当前列是否允许拖拽列宽 |
| `align` | 单元格水平对齐：`left`、`center`、`right`、`start`、`end` |
| `headerAlign` | 表头水平对齐 |
| `headerStyle` | 当前列表头样式，会覆盖 `taskListTable.headerStyle` |
| `tree` | 是否作为树列 |
| `className` | 追加到表头和单元格的 class |
| `valueGetter` | 自定义单元格值 |
| `renderHeader` | 当前列表头模板 |
| `renderCell` | 当前列单元格模板 |

行拖拽默认可从行区域起拖。如果自定义单元格里提供 `data-vg-row-drag-handle`，则只有从该元素起拖才会触发行拖拽：

```js
renderCell: ({ value }) => `
  <span data-vg-row-drag-handle>⠿</span>
  <span>${value}</span>
`
```

### timelineHeader

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `backgroundColor` | `string` | `'#fff'` | 时间轴区域背景 |
| `colWidth` | `number` | `56` | 默认基础刻度列宽 |
| `style` | `GanttTimelineHeaderStyle` | `null` | 时间刻度默认样式 |
| `scales` | `GanttTimelineScale[]` | 天 + 2 小时 | 时间轴刻度行 |
| `customLayout` | `renderer` | `null` | 全局刻度自定义模板 |

`GanttTimelineScale`：

| 字段 | 说明 |
| --- | --- |
| `unit` | `minute`、`hour`、`day`、`week`、`month`、`year` |
| `step` | 刻度步长，例如 `minute + 15` 表示 15 分钟 |
| `colWidth` | 当前刻度作为基础刻度时的列宽 |
| `rowHeight` | 当前刻度行高 |
| `startOfWeek` | 周起始：`monday` 或 `sunday` |
| `visible` | 是否显示当前刻度行 |
| `style` | 当前刻度行样式 |
| `format` | 自定义刻度文案，参数为完整 `dateInfo` |
| `customLayout` | 当前刻度行自定义模板 |

`format` 参数：

```ts
{
  unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
  step: number
  scaleIndex: number
  dateIndex: number
  label: string
  title: string
  startDate: Date
  endDate: Date
  days: number
  x: number
  width: number
}
```

### taskBar

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `tasksField` | `'tasks'` | row 上任务数组字段 |
| `startDateField` | `'startDate'` | 任务开始时间字段 |
| `endDateField` | `'endDate'` | 任务结束时间字段 |
| `progressField` | `'progress'` | 进度字段 |
| `laneField` | `'lane'` | 泳道字段 |
| `statusField` | `'status'` | 状态字段 |
| `milestoneField` | `'milestones'` | task 上里程碑数组字段 |
| `milestoneDateField` | `'date'` | 里程碑时间字段 |
| `labelText` | `'title'` | 默认任务标题字段或函数 |
| `subLabelText` | `'subtitle'` | 默认任务副标题字段或函数 |
| `barStyle` | `null` | 普通任务默认样式，支持函数 |
| `projectStyle` | `null` | 父节点聚合任务样式，支持函数 |
| `customLayout` | `null` | 任务条自定义模板 |
| `milestoneStyle` | `null` | 里程碑尺寸配置，支持函数 |
| `milestoneCustomLayout` | `null` | 里程碑自定义模板，支持模板字符串 |
| `milestoneTooltip` | `false` | 里程碑 tooltip，`true` 显示默认时间节点，也支持自定义模板 |
| `clip` | `true` | 是否裁剪超出时间范围的任务 |
| `draggable` | `false` | 是否允许拖拽，默认不支持拖拽；只有配置为 `true` 或函数返回 `true` 才能拖拽 |
| `dragStep` | `60000` | 拖拽吸附步长，单位毫秒 |
| `tooltip` | `false` | Tooltip 配置，默认关闭 |
| `lanes` | `plan/load/unload` | 行内多任务泳道 |
| `onClick` | `null` | 任务点击 |
| `onContextMenu` | `null` | 任务右键 |
| `onMouseEnter` | `null` | 鼠标移入 |
| `onMouseLeave` | `null` | 鼠标移出 |
| `onDragStart` | `null` | 拖拽开始，返回 `false` 可阻止拖拽 |
| `onDrag` | `null` | 拖拽中 |
| `onDragEnd` | `null` | 拖拽结束 |

`barStyle` / `projectStyle` 支持：

```ts
{
  barColor?: string
  completedBarColor?: string
  height?: number
  width?: number
  cornerRadius?: number
  borderWidth?: number
  borderLineWidth?: number
  borderColor?: string
  minSize?: number
}
```

### tooltip

```js
taskBar: {
  tooltip: false
}
```

```js
taskBar: {
  tooltip: true
}
```

```js
taskBar: {
  tooltip: {
    visible: true,
    className: 'my-tooltip',
    offsetX: 12,
    offsetY: 12,
    customLayout: ({ task, startDate, endDate }) => `
      <div>${task.title} ${startDate.toLocaleString()} - ${endDate.toLocaleString()}</div>
    `
  }
}
```

### dependency

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `links` | `[]` | 依赖连接线数组 |
| `linkLineStyle` | `null` | 全局连接线样式 |
| `showLinks` | `false` | 是否默认显示全部连接线 |
| `highlightConnected` | `false` | 显示连接线时是否弱化无关任务 |
| `dimOpacity` | `0.18` | 无关任务透明度 |
| `linkCreatable` | `undefined` | 预留字段 |
| `linkSelectable` | `undefined` | 预留字段 |
| `linkDeletable` | `undefined` | 预留字段 |

`links`：

```ts
{
  id?: string | number
  type?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  from: string | number | Array<string | number>
  to: string | number | Array<string | number>
  color?: string
  dashed?: boolean
  linkLineStyle?: {
    lineColor?: string
    lineWidth?: number
    lineDash?: number[]
  }
}
```

### grid

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `backgroundColor` | `'#f7fbfb'` | 时间区底色 |
| `alternatingBackgroundColor` | `'#f8fbfb'` | 按第一层刻度隔列背景 |
| `verticalLine` | `{ lineColor: '#e8eeee' }` | 竖向网格线，支持函数 |
| `horizontalLine` | `{ lineColor: '#edf1f2' }` | 横向网格线，支持函数 |
| `backgroundRanges` | `[]` | 全局时间背景区间 |
| `rowBackgroundRanges` | `[]` | 指定行背景区间 |

`backgroundRanges`：

```ts
{
  id?: string | number
  startDate: string | number | Date
  endDate: string | number | Date
  color?: string
  fill?: string
  opacity?: number
}
```

`rowBackgroundRanges` 额外支持：

```ts
{
  recordKey: string | number
  height?: number
  offsetY?: number
}
```

### markLine

```ts
{
  date: string | number | Date
  content?: string
  contentStyle?: {
    color?: string
    fontSize?: number
    fontWeight?: string
  }
  style?: {
    lineColor?: string
    lineWidth?: number
    lineDash?: number[]
  }
  position?: 'left' | 'right' | 'middle' | 'date'
  scrollToMarkLine?: boolean
}
```

### renderer 返回值

所有 `customLayout`、`renderHeader`、`renderCell` 都支持返回：

```ts
Node | string | { rootContainer?: Node } | null | undefined
```

推荐使用模板字符串。组件内部会把字符串放入 `<template>` 解析成 DOM。

## 本项目内 demo

当前项目只保留一个业务 demo：

```text
src/views/WorkOrderStatusDemo.vue
```

路由：

```text
#/work-order-status
```

## 构建

```bash
npm --prefix packages/gantt run build
```
