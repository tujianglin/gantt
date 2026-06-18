# Gantt Performance Plan

## 目标

将 `packages/gantt` 优化到适合大数据排产甘特图的渲染结构，重点覆盖：

- 1w+ 行数据下纵向滚动稳定。
- 3 年以上、15 分钟刻度下横向滚动可用。
- 多 task、多连接线、多父节点聚合时避免重复计算。
- 自定义 task / timeline / tooltip 模板不造成明显卡顿。
- 核心渲染逻辑具备可维护的缓存、失效和快照边界。

## P0: 渲染快照重构

### 问题

当前 `renderTasks`、`visibleTasks`、`parentTimelineTasks`、`taskLayoutByKey`、`visibleLinks`、`connectedTaskKeys` 等是 getter。一次 `renderBodySvgContent()` 内会被多次读取，每次都会重新构造数组或扫描数据。

### 计划

- [x] 新增 `buildRenderSnapshot()`。
- [x] 在 `renderBodySvgContent()` 开头构建一次 snapshot。
- [x] snapshot 包含：
  - `renderedRowEntries`
  - `visibleTasks`
  - `parentTimelineTasks`
  - `renderTasks`
  - `taskLayoutByKey`
  - `visibleLinks`
  - `connectedTaskKeys`
  - `taskIndexByKey`
- [x] `appendGrid()`、`appendLink()`、`appendLinkConnectors()`、`renderTask()` 改为读 snapshot。
- [x] 保留 getter 作为兼容入口，但内部优先读当前 snapshot。

### 验收

- `taskLayoutByKey` 在一次 body SVG 渲染中只计算一次。
- `renderTasks` 在一次 body SVG 渲染中只构造一次。
- 连接线数量增加时，不再出现 `links * visibleTasks` 级重复计算。

## P0: 连接线计算优化

### 问题

`appendLink()` 每条连接线都重新读取 `taskLayoutByKey`；`visibleLinks` 过滤也重复读取 layout。`linkNetworkByTask()` BFS 每次遍历都全量扫描 `normalizedLinks`。

### 计划

- [x] 将 `normalizedLinks` 缓存到 dependency snapshot。
- [x] 构建 `linkAdjacencyByTaskKey`。
- [x] `visibleLinks` 使用 snapshot 中的 `taskLayoutByKey` 一次性过滤。
- [x] `linkNetworkByTask()` 改为基于 adjacency BFS。
- [x] `isDuplicateLink()` 改为使用 `linkKeySet`。

### 验收

- 点击 task 高亮连接网络时，复杂度接近 `nodes + edges`。
- 多连接线场景下 body SVG 重绘不重复构建 task layout。

## P0: Task 样式与索引优化

### 问题

`taskStyle()` 内部通过 `this.renderTasks.findIndex(...)` 获取 index，导致每个 task 渲染时都可能重新构造并扫描全部 task。

### 计划

- [x] 在 `buildRenderSnapshot()` 中给 task 写入 `__renderIndex`。
- [x] `taskStyle()` 使用 `task.__renderIndex`。
- [x] `taskRenderHeight()` 避免在不需要时触发 `taskStyle()`。
- [x] 将 `taskStart()`、`taskEnd()`、`taskY()`、`durationWidth()` 的常用结果缓存到 layout。

### 验收

- 渲染 500+ 可视 task 时不出现 O(n²) 样式索引扫描。
- 自定义 `barStyle` 函数仍能拿到正确 index。

## P1: 父节点聚合优化

### 问题

`parentTimelineTasks` 对每个折叠父节点都会获取后代 id，再全量扫描 `allTasks`。树形数据多时成本高。

### 计划

- [x] 在行缓存中构建 `descendantKeysByRowId`。
- [x] 构建 `tasksByRowId`。
- [x] 构建 `subtreeTasksByRowId` 或按需缓存聚合结果。
- [x] 父节点 taskbar 聚合直接读子树任务索引。
- [x] 展开/收起、records 变化时失效聚合缓存。

### 验收

- 多级树、多个折叠父节点时，不再对全部任务重复扫描。
- 父节点未展开时只显示完整聚合 task，不渲染子 task。

## P1: foreignObject 高度测量优化

### 问题

每个 task 都创建一个 RAF，并读取 `getBoundingClientRect()`、`scrollHeight`、`offsetHeight`，可能造成集中 layout thrash。

### 计划

- [x] 只有 `taskBar.customLayout` 存在且 task 未显式高度时才测量。
- [x] 将多个 task 测量合并到一个 RAF 批处理。
- [x] 增加 `taskMeasuredHeightByKey` 缓存。
- [x] records、task 模板、task 内容变化时清理对应缓存。
- [x] 优先推荐用户配置 `height` 或 `rowHeight: auto` 数据高度。

### 验收

- 单次 body SVG 渲染最多创建一个测量 RAF。
- 已测量过的 task 不重复读取布局。
- 大量自定义 task 时滚动后不出现明显布局抖动。

## P1: setOptions 增量更新

### 问题

`setOptions()` 目前大多数配置变化都会完整 `render()`，时间范围、刻度、滚动条配置都可能重建全部 DOM。

### 计划

- [x] 增加 options diff 分类：
  - `recordsChanged`
  - `timelineChanged`
  - `tableChanged`
  - `scrollbarChanged`
  - `interactionChanged`
- [x] records 变化才重建行缓存和任务索引。
- [x] timeline 变化只重建 timeline SVG 与 body SVG。
- [x] scrollbar 变化只更新滚动条 DOM/CSS 变量。
- [x] table 列宽变化只同步 table layout。
- [x] `minDate`、`maxDate`、`markLine` 变化原地刷新 timeline SVG 与 body SVG。
- [x] `scrollbar`、`loading`、`performance` 等嵌套配置支持局部 `setOptions` 合并。

### 验收

- 切换滚动条宽高不触发完整根 DOM 重建。
- 切换刻度时保留左表 DOM，减少闪烁和卡顿。
- 查询时间范围变更时只重算时间窗口相关内容。

## P2: 时间轴与刻度缓存

### 问题

长时间范围 + 15 分钟刻度下，时间轴 unit 生成和背景网格可能生成大量 SVG 节点。

### 计划

- [x] 缓存 `timelineUnitsByScale`，按 `scale + start/end + virtualWindow` 失效。
- [x] 限制最小可视刻度宽度，避免单屏生成过多 label。
- [x] 将背景 shade、vertical line 计算纳入 render snapshot。
- [x] 大范围切换刻度时保留 loading，渲染分片执行。
  - [x] options 重渲染延后到第二帧，让 loading 先绘制。
  - [x] body SVG 分片渲染。

### 验收

- 3 年 + 15 分钟刻度下，只渲染虚拟窗口内刻度。
- 刻度切换时不会长时间阻塞主线程。

## P2: 事件绑定优化

### 问题

每个 task、milestone、connector 都绑定多组事件。可视节点多时事件函数和 disposer 数量膨胀。

### 计划

- [x] 将 task click/contextmenu/pointerdown 改成 body SVG 委托。
- [x] tooltip mouseenter/mousemove/mouseleave 尽量委托到 stage。
- [x] connector pointerdown 保留最少绑定或委托。
- [x] 通过 `data-task-key` 查询 snapshot 中 task。

### 验收

- 可视 task 数增加时，事件监听数量不线性快速膨胀。
- 拖拽、右键、点击、高亮、tooltip 行为保持不变。

## P2: 内部类型与模块拆分

### 问题

`VanillaGantt.ts` 文件过大，缓存、渲染、交互、连接线、时间轴逻辑混在一起，后续性能优化容易互相影响。

### 计划

- [x] 拆分 `renderSnapshot.ts`。
- [x] 拆分 `dependency.ts`。
- [x] 拆分 `taskLayout.ts`。
- [x] 拆分 `virtualScroll.ts`。
- [x] 补充内部类型：`RenderSnapshot`、`TaskLayout`、`RowEntry`、`NormalizedLink`。

### 验收

- `VanillaGantt.ts` 只保留生命周期、options、核心协调逻辑。
- 各模块可以单独做单元测试或性能测试。

## P3: 性能验证与基准

### 计划

- [x] 新增大数据 benchmark demo：
  - 10k rows
  - 50k rows
  - 3 年时间轴
  - 15 分钟刻度
  - 1000+ visible tasks
  - 1000+ links
- [x] 增加开发态性能日志开关：
  - render body 耗时
  - build snapshot 耗时
  - visible task 数
  - visible link 数
  - SVG node 数
- [x] 输出 Performance Profile 检查清单。

### 验收

- 默认不开启性能日志。
- 开启后可以定位每次滚动和重绘的主要耗时。
- 优化前后有可对比数据。

## 建议实施顺序

1. P0 渲染快照重构。
2. P0 连接线计算优化。
3. P0 task 样式与索引优化。
4. P1 父节点聚合优化。
5. P1 foreignObject 高度测量优化。
6. P1 setOptions 增量更新。
7. P2 时间轴与刻度缓存。
8. P2 事件绑定优化。
9. P2 模块拆分。
10. P3 性能 benchmark。

## Performance Profile 检查清单

- [ ] 打开 `/performance-benchmark`，先用 10k rows / 15分钟 / 1000 links 作为基线。
- [ ] 开启性能日志，记录 `totalDuration`、`snapshotDuration`、`domDuration`、`renderTaskCount`、`visibleLinkCount`、`svgNodeCount`。
- [ ] 横向滚动 10 秒，确认大多数 body render 稳定在 16ms 到 32ms 以内；若超过，优先检查 DOM 节点数量和刻度 label 数量。
- [ ] 纵向滚动 10 秒，确认 `renderedRowCount` 只随可视窗口和 `rowBufferPx` 增减，不随总行数线性增长。
- [ ] 切换 15分钟 / 1小时 / 1天 / 1月刻度，确认 loading 先显示，且没有长时间白屏。
- [ ] 将行数切到 50k，重复横向和纵向滚动，观察浏览器内存是否持续增长。
- [ ] 将连接线切到 1000，点击 task 后确认只高亮同一连接网络，非相关 task 和连接线透明度降低。
- [ ] 若 `snapshotDuration` 占比高，优先检查连接线归一化、父节点聚合和 task layout 缓存。
- [ ] 若 `domDuration` 占比高，优先检查 SVG 节点数、foreignObject 自适应测量和自定义模板复杂度。
- [ ] 压测结束后关闭 `performance.enabled`，确认默认场景没有额外 `querySelectorAll` 统计成本。

## 每轮修复后的固定验证

- [x] `npm --prefix packages/gantt run build`
- [x] `npm run build`
- [ ] 虚拟时间轴 demo：10k 行纵向滚动。
- [ ] 虚拟时间轴 demo：3 年 + 15 分钟横向滚动。
- [ ] 工单状态 demo：连接线高亮。
- [ ] 自适应行高 demo：多计划、多上下料。
- [ ] 右键菜单 demo：交互不回归。
