<template>
  <section class="docs-page">
    <header class="docs-header">
      <h1>Gantt Options</h1>
      <p>所有示例均使用同一个 VanillaGantt 构造函数和 setOptions 更新方式。</p>
    </header>

    <section class="docs-card">
      <h2>基础用法</h2>
      <pre><code>{{ basicUsage }}</code></pre>
    </section>

    <section v-for="group in optionGroups" :key="group.title" class="docs-card">
      <h2>{{ group.title }}</h2>
      <p v-if="group.description">{{ group.description }}</p>
      <table>
        <thead>
          <tr>
            <th>字段</th>
            <th>类型/默认值</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in group.items" :key="item.name">
            <td><code>{{ item.name }}</code></td>
            <td>{{ item.type }}</td>
            <td>{{ item.description }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="docs-card">
      <h2>Renderer 返回值</h2>
      <p>所有 renderHeader、renderCell、customLayout 都可以返回模板字符串、Node、{ rootContainer } 或空值。</p>
      <pre><code>{{ rendererUsage }}</code></pre>
    </section>
  </section>
</template>

<script>
export default {
  name: 'OptionsDocs',
  data() {
    return {
      basicUsage: `import { VanillaGantt } from '@wimi/gantt'
import '@wimi/gantt/dist/VanillaGantt.css'

const gantt = new VanillaGantt(document.querySelector('#gantt'), {
  records: [],
  minDate: '2026-03-30T00:00:00',
  maxDate: '2026-04-01T00:00:00',
  taskListTable: { columns: [{ field: 'name', title: '资源', width: 160, tree: true }] },
  timelineHeader: { scales: [{ unit: 'day', step: 1 }, { unit: 'hour', step: 2, colWidth: 56 }] }
})

gantt.setOptions({ timelineHeader: { scales: [{ unit: 'day', step: 1 }] } })
gantt.destroy()`,
      rendererUsage: `customLayout: ({ task, startDate, endDate }) => \`
  <div class="task">
    <strong>\${task.title}</strong>
    <span>\${startDate.toLocaleString()} - \${endDate.toLocaleString()}</span>
    <button data-vg-no-drag>操作</button>
  </div>
\``,
      optionGroups: [
        {
          title: '顶层 options',
          description: '顶层控制数据、时间范围、默认尺寸和各功能模块。',
          items: [
            { name: 'records', type: 'GanttRecord[] / []', description: '左侧表格和任务数据。支持 children 树结构。' },
            { name: 'recordKeyField', type: "string / 'id'", description: '资源行唯一 key 字段。' },
            { name: 'taskKeyField', type: "string / 'id'", description: '任务唯一 key 字段，用于拖拽、依赖线和事件。' },
            { name: 'minDate', type: 'string | number | Date', description: '时间轴开始时间。不传时从任务最早开始时间推导。' },
            { name: 'maxDate', type: 'string | number | Date', description: '时间轴结束时间。不传时从任务最晚结束时间推导。' },
            { name: 'rowHeight', type: "number | 'auto' / 78", description: "默认资源行高度。设置为 'auto' 时按当前行任务 offsetY + height 自动撑开；大量自定义 task 建议配置 record.height、task.height 或 auto，减少 foreignObject 测量。" },
            { name: 'taskHeight', type: 'number / 36', description: '默认任务条高度。' },
            { name: 'headerRowHeight', type: 'number / 24', description: '默认时间轴单行刻度高度。' },
            { name: 'virtualScroll', type: 'object', description: '虚拟渲染配置，默认关闭。支持 enabled、bufferPx、rowEnabled、rowBufferPx、patchRender，用于长时间范围、高密度横向滚动和大行数场景。' },
            { name: 'loading', type: 'object', description: 'setOptions 重渲染时的加载层。支持 enabled、text、className、customLayout、bodyRenderSlice、bodyRenderSliceBudget。开启 loading 时默认分片追加 body SVG。' },
            { name: 'scrollbar', type: 'object', description: '主滚动区滚动条配置。支持 alwaysVisible、width、height、dragRenderDelay、dragRenderMaxWait。' },
            { name: 'performance', type: 'object', description: '性能日志配置。支持 enabled、console、onRender，可输出 body 渲染耗时、snapshot 耗时和可视节点数量。' },
            { name: 'filter', type: 'object | null', description: '筛选配置。支持 text、statuses、rowKeys、taskKeys、startDate、endDate、row/task predicate。' },
            { name: 'highlight', type: 'object | null', description: '高亮配置。支持 rowKeys 和 taskKeys，可配合 scrollToTask、scrollToRow 使用。' },
            { name: 'onScroll', type: 'function', description: '滚动回调，参数为 { scrollLeft, scrollTop }。' }
          ]
        },
        {
          title: 'records / tasks',
          description: 'records 描述左侧资源行，tasks 描述每个资源行内的任务条。',
          items: [
            { name: 'record.id', type: 'string | number', description: '资源行唯一标识，默认由 recordKeyField 指定。' },
            { name: 'record.name', type: 'string', description: '默认树列展示文本。' },
            { name: 'record.height', type: 'number', description: '当前行高度。' },
            { name: 'record.expanded', type: 'boolean', description: '树节点初始展开状态。' },
            { name: 'record.children', type: 'GanttRecord[]', description: '子资源节点。父节点未展开时会按子任务生成聚合任务条。' },
            { name: 'record.tasks', type: 'GanttTaskRecord[]', description: '当前资源行的任务集合，字段名可通过 taskBar.tasksField 改。' },
            { name: 'task.id', type: 'string | number', description: '任务唯一标识，默认由 taskKeyField 指定。' },
            { name: 'task.startDate / endDate', type: 'time value', description: '任务开始/结束时间，字段名可配置。' },
            { name: 'task.lane', type: 'string', description: '任务所在泳道，对应 taskBar.lanes[].key。' },
            { name: 'task.progress', type: 'number', description: '任务进度，0-100。' },
            { name: 'task.draggable', type: 'boolean', description: '单任务拖拽开关，优先级高于 taskBar.draggable；只有显式 true 才可拖拽。' },
            { name: 'task.striped', type: 'boolean', description: '开启内置斜纹背景。' },
            { name: 'task.milestones', type: 'GanttMilestoneRecord[]', description: '任务里程碑数组，字段名可通过 taskBar.milestoneField 修改。' }
          ]
        },
        {
          title: 'taskListTable',
          description: '左侧表格配置，支持多列、列宽拖拽、表头样式和自定义单元格。',
          items: [
            { name: 'tableWidth', type: "'auto' | number / 'auto'", description: '左侧表格宽度。auto 时按列宽求和。' },
            { name: 'minTableWidth', type: 'number / 120', description: '拖拽表格整体宽度时的最小值。' },
            { name: 'maxTableWidth', type: 'number / 640', description: '拖拽表格整体宽度时的最大值。' },
            { name: 'columnResizable', type: 'boolean / true', description: '是否允许拖拽调整列宽。' },
            { name: 'rowDraggable', type: 'boolean | function / false', description: '是否允许上下拖拽调整行顺序，默认关闭。函数返回 true 时当前行可拖拽。' },
            { name: 'onRowDragEnd', type: 'function', description: '行拖拽完成回调，返回 record、sourceIndex、targetIndex、records。' },
            { name: 'headerStyle', type: 'style object', description: '表头整体背景色、文字颜色、字号和字重。' },
            { name: 'columns', type: 'GanttTableColumn[]', description: '列定义。' },
            { name: 'renderHeader', type: 'renderer', description: '整体表头自定义渲染。' },
            { name: 'renderCell', type: 'renderer', description: '全局单元格自定义渲染。' },
            { name: 'columns[].field', type: 'string', description: '当前列读取的 record 字段。' },
            { name: 'columns[].title', type: 'string', description: '表头名称。' },
            { name: 'columns[].width/minWidth/maxWidth', type: 'number', description: '列宽配置。' },
            { name: 'columns[].tree', type: 'boolean', description: '是否作为树列。自定义树按钮需添加 data-vg-toggle。' },
            { name: 'columns[].valueGetter', type: 'function', description: '自定义单元格值。' },
            { name: 'columns[].renderHeader/renderCell', type: 'renderer', description: '当前列表头和单元格模板。' }
          ]
        },
        {
          title: 'timelineHeader',
          description: '顶部时间轴配置。scales 数组长度就是刻度行数。',
          items: [
            { name: 'backgroundColor', type: "string / '#fff'", description: '时间轴区域背景色。' },
            { name: 'colWidth', type: 'number / 56', description: '默认基础刻度列宽。' },
            { name: 'minLabelWidth', type: 'number / 0', description: '最小刻度文案显示宽度。大于 0 时，刻度宽度不足只渲染空刻度，减少密集时间轴开销。' },
            { name: 'style', type: 'style object', description: '所有刻度行默认样式。' },
            { name: 'scales', type: 'GanttTimelineScale[]', description: '刻度行配置。15 分钟刻度可配置 day + minute 两行。' },
            { name: 'customLayout', type: 'renderer', description: '全局刻度单元格模板。' },
            { name: 'scales[].unit', type: 'minute | hour | day | week | month | year', description: '刻度单位。' },
            { name: 'scales[].step', type: 'number', description: '刻度步长，例如 minute + 15 表示 15 分钟。' },
            { name: 'scales[].colWidth', type: 'number', description: '该刻度作为基础刻度时的宽度。' },
            { name: 'scales[].minLabelWidth', type: 'number', description: '当前刻度行的最小文案显示宽度，优先级高于 timelineHeader.minLabelWidth。' },
            { name: 'scales[].rowHeight', type: 'number', description: '当前刻度行高度。' },
            { name: 'scales[].style', type: 'style object', description: '当前刻度行样式。' },
            { name: 'scales[].format', type: 'function(dateInfo)', description: '自定义刻度文本，dateInfo 包含 startDate、endDate、unit、step、x、width 等。' },
            { name: 'scales[].customLayout', type: 'renderer', description: '当前刻度行模板，优先级高于 timelineHeader.customLayout。' }
          ]
        },
        {
          title: 'taskBar',
          description: '任务条字段映射、样式、自定义模板、拖拽、tooltip 和事件。',
          items: [
            { name: 'tasksField', type: "string / 'tasks'", description: 'record 上任务数组字段。' },
            { name: 'startDateField / endDateField', type: "string / 'startDate' | 'endDate'", description: '任务开始/结束字段。' },
            { name: 'progressField', type: "string / 'progress'", description: '进度字段。' },
            { name: 'laneField', type: "string / 'lane'", description: '泳道字段。' },
            { name: 'statusField', type: "string / 'status'", description: '状态字段。' },
            { name: 'milestoneField', type: "string / 'milestones'", description: 'task 上里程碑数组字段。' },
            { name: 'milestoneDateField', type: "string / 'date'", description: '里程碑时间字段。' },
            { name: 'labelText / subLabelText', type: 'string | function', description: '默认任务条标题和副标题。' },
            { name: 'barStyle', type: 'object | function', description: '普通任务条样式，支持 height 作为默认任务条高度。' },
            { name: 'projectStyle', type: 'object | function', description: '父节点聚合任务条样式。' },
            { name: 'customLayout', type: 'renderer', description: '任务条自定义模板。' },
            { name: 'denseRender', type: 'boolean | object / false', description: '高密度短任务批量渲染。开启后小于 maxTaskWidth 的任务会合并为少量 SVG path，适合只浏览密度的分钟级任务。' },
            { name: 'milestoneCustomLayout', type: 'renderer', description: '里程碑自定义模板，支持模板字符串。' },
            { name: 'milestoneStyle', type: 'object | function', description: '里程碑尺寸配置，支持 width、height。' },
            { name: 'milestoneTooltip', type: 'false | true | object', description: '里程碑 tooltip。true 显示默认时间节点，对象支持自定义模板。' },
            { name: 'clip', type: 'boolean / true', description: '是否裁剪超出时间范围的任务。' },
            { name: 'draggable', type: 'boolean | function / false', description: '是否允许拖拽任务。默认不支持拖拽，只有 true 或函数返回 true 才可拖拽。' },
            { name: 'dragStep', type: 'number / 60000', description: '拖拽吸附步长，单位毫秒。15 分钟为 15 * 60 * 1000。' },
            { name: 'tooltip', type: 'false | true | object', description: '默认关闭。true 使用默认 tooltip，对象支持 visible、customLayout、offsetX、offsetY、className。' },
            { name: 'lanes', type: 'GanttLane[]', description: '行内多泳道位置，字段为 { key, offset, height }。' },
            { name: 'onClick / onContextMenu', type: 'function', description: '点击和右键任务事件。' },
            { name: 'onMouseEnter / onMouseLeave', type: 'function', description: '鼠标移入和移出事件。' },
            { name: 'onDragStart / onDrag / onDragEnd', type: 'function', description: '拖拽生命周期。onDragStart 返回 false 可阻止拖拽。' }
          ]
        },
        {
          title: 'dependency',
          description: '任务依赖线。点击任务时可只显示当前任务所在的整条关联网络，其他任务可透明弱化。',
          items: [
            { name: 'links', type: 'GanttTaskLink[] / []', description: '连接线数组。' },
            { name: 'linkLineStyle', type: 'line style', description: '全局连接线样式。' },
            { name: 'showLinks', type: 'boolean / false', description: '是否默认显示所有连接线。false 时点击任务显示对应关联网络。' },
            { name: 'highlightConnected', type: 'boolean / false', description: '显示连接线时是否弱化无关任务。' },
            { name: 'dimOpacity', type: 'number / 0.18', description: '无关任务透明度。' },
            { name: 'lineMode', type: 'object', description: '连接线模式，支持 pattern: solid/dashed/dotted，path: straight/polyline/curved/smoothstep/oblique。' },
            { name: 'linkCreatable', type: 'boolean / false', description: '是否显示任务左右连接原点。开启后仅支持右侧输出点拖到其他任务左侧输入点。' },
            { name: 'linkCreateRules', type: 'object', description: '拖拽创建连接的规则。默认不允许重复线路，支持 fromTaskKeys、toTaskKeys、disabledFromTaskKeys、disabledToTaskKeys、pairs、validate。' },
            { name: 'linkConnector', type: 'object', description: '连接点模板配置，支持 width、height、customLayout、startLayout、finishLayout。' },
            { name: 'linkCreateDisabledTaskKeys', type: 'id[] / []', description: '兼容字段，同时禁止指定任务作为输出和输入端点。推荐使用 linkCreateRules。' },
            { name: 'onLinkCreate', type: 'function', description: '拖拽创建连接回调，返回 link、fromTask、toTask、fromSide、toSide。' },
            { name: 'links[].from / to', type: 'id | id[]', description: '源任务和目标任务 id。to 支持多个 id。' },
            { name: 'links[].type', type: 'finish_to_start | start_to_start | finish_to_finish | start_to_finish', description: '连接类型。' },
            { name: 'links[].color / dashed', type: 'string | boolean', description: '连接线颜色和虚线。' }
          ]
        },
        {
          title: 'grid / markLine',
          description: '时间区底色、休息时间、行背景和标记线。',
          items: [
            { name: 'grid.backgroundColor', type: 'string', description: '时间区底色。' },
            { name: 'grid.alternatingBackgroundColor', type: 'string', description: '按第一层刻度隔列背景。' },
            { name: 'grid.verticalLine / horizontalLine', type: 'line style | function', description: '网格线样式。函数参数包含 index、date、ganttInstance。' },
            { name: 'grid.backgroundRanges', type: 'range[]', description: '全局时间背景区间，支持精确到分钟。' },
            { name: 'grid.rowBackgroundRanges', type: 'row range[]', description: '指定资源行的时间背景区间。额外支持 recordKey、offsetY、height。' },
            { name: 'markLine', type: 'object | object[] | null', description: '标记线。支持 date、content、style、contentStyle。' }
          ]
        }
      ]
    }
  }
}
</script>

<style scoped>
.docs-page {
  height: 100%;
  overflow: auto;
  padding: 18px;
  background: #f5f8f8;
}

.docs-header,
.docs-card {
  max-width: 1120px;
  margin: 0 auto 14px;
}

.docs-header {
  padding: 4px 0 2px;
}

.docs-header h1 {
  color: #20383b;
  font-size: 24px;
  line-height: 1.3;
}

.docs-header p,
.docs-card p {
  color: #617074;
  font-size: 13px;
  line-height: 1.7;
}

.docs-card {
  padding: 16px;
  border: 1px solid #dfe8e8;
  background: #fff;
}

.docs-card h2 {
  margin-bottom: 10px;
  color: #2f4858;
  font-size: 16px;
}

.docs-card table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.docs-card th,
.docs-card td {
  padding: 9px 10px;
  border: 1px solid #e2ebeb;
  color: #435156;
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  vertical-align: top;
}

.docs-card th {
  background: #eaf3f8;
  color: #2f4858;
  font-weight: 700;
}

.docs-card th:nth-child(1),
.docs-card td:nth-child(1) {
  width: 220px;
}

.docs-card th:nth-child(2),
.docs-card td:nth-child(2) {
  width: 250px;
}

.docs-card code {
  color: #0f6b73;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
}

.docs-card pre {
  max-width: 100%;
  overflow: auto;
  padding: 12px;
  border: 1px solid #dfe8e8;
  background: #f7fbfb;
}

.docs-card pre code {
  color: #2f3f45;
  line-height: 1.6;
}
</style>
