# Gantt 优化与功能扩展计划

## 背景

当前项目由两层组成：

- `packages/gantt`：框架无关的 SVG 甘特图库，核心实现集中在 `src/VanillaGantt.ts`，并已拆分出依赖线、快照、任务布局、虚拟滚动等核心模块。
- `src/views`：Vue 2 demo 站点，用于展示基础表格、时间轴、虚拟滚动、连接线、行拖拽、高密度任务等场景。

近期瓶颈主要集中在高密度短任务和长时间轴横向滚动场景：可视窗口内任务数量和 SVG 节点数量过高，导致快照计算、DOM 构建和滚动重绘成本升高。

## 已完成优化

### 1. 高密度短任务批量渲染

新增 `taskBar.denseRender` 配置。开启后，宽度小于 `maxTaskWidth` 的短任务不再逐个渲染为 `foreignObject`，而是按行、颜色、形状合并为少量 SVG `path`。

适用场景：

- 每分钟一个任务、持续多天的密集点阵。
- 用户主要关心密度分布，而不是逐个短任务交互。

限制：

- 被合并的短任务不逐个触发 tooltip、click、drag。
- 带里程碑、条纹、父节点聚合、可拖拽任务不会进入 dense 渲染。

### 2. 按行任务时间索引

在行缓存中增加：

- `sortedTasksByRowId`
- `maxTaskDurationByRowId`

横向窗口刷新时通过二分查找获取可能重叠窗口的任务，避免每次横向滚动都扫描整行任务数组。

### 3. SVG 节点批量挂载

时间轴 SVG 与 body SVG 的非分片渲染改为先写入 `DocumentFragment`，再一次性 append 到 SVG，减少大量节点时的 DOM 写入次数。

### 4. Demo 默认启用高密度优化

`DenseVisibleTasksDemo.vue` 已开启：

- `taskBar.denseRender`
- 较小横向虚拟缓冲 `bufferPx: 360`
- 更短自定义滚动条拖拽重绘延迟

### 5. 搜索、筛选、定位和高亮 API

新增顶层配置：

- `filter`：支持 `text`、`statuses`、`rowKeys`、`taskKeys`、`startDate`、`endDate`、`row/task predicate`。
- `highlight`：支持 `rowKeys`、`taskKeys`。

新增实例方法：

- `setFilter(filter)` / `clearFilter()`
- `setHighlight(highlight)` / `clearHighlight()`
- `scrollToRow(rowKey, options)`
- `scrollToTask(taskKey, options)`
- `findTaskByKey(taskKey)`

新增 `FeatureExtensionsDemo.vue` 覆盖筛选、结果列表、任务定位、资源行定位和预警批量高亮。

## 当前风险与技术债

### 1. `VanillaGantt.ts` 仍然过大

虽然已有若干核心模块拆分，但生命周期、渲染、事件、拖拽、tooltip、滚动条、时间轴仍集中在一个类中。

影响：

- 后续性能优化容易互相影响。
- 单元测试边界不清晰。
- 功能扩展时回归风险较高。

### 2. SVG `foreignObject` 仍是复杂模板主要成本

普通任务仍使用 `foreignObject` 承载 HTML 模板。复杂自定义模板、动态测量、tooltip 交互较多时，DOM 与 layout 成本仍会升高。

### 3. 渲染仍以“清空并重建”为主

当前虚拟窗口刷新时会重建 body SVG 内容。对大部分业务场景已经可用，但在超高频滚动、复杂连接线、复杂模板下仍有进一步优化空间。

### 4. 缺少自动化性能基准

已有性能 demo 和指标面板，但缺少可重复执行的自动化基准，例如固定数据集下的渲染耗时、节点数、滚动帧率回归检查。

## P0 优化计划

### P0.1 拆分渲染器模块

目标：继续压缩 `VanillaGantt.ts` 复杂度。

建议拆分：

- `core/timelineRenderer.ts`
- `core/bodyRenderer.ts`
- `core/taskRenderer.ts`
- `core/interaction.ts`
- `core/scrollbar.ts`

验收：

- `VanillaGantt.ts` 主要保留生命周期、options、状态协调。
- body 渲染、timeline 渲染、任务交互可分别测试。

### P0.2 增量 patch body SVG

目标：虚拟窗口小幅移动时复用可保留节点，而不是每次全量重建。

实施思路：

- 为 task、milestone、link、grid line 构建稳定 key。
- 维护当前 SVG 节点 map。
- 新 snapshot 与旧 snapshot diff 后执行 insert/update/remove。

风险：

- DOM diff 实现复杂度较高。
- 需要覆盖任务拖拽、连接线高亮、tooltip、denseRender 等状态。

建议先只对 task layer 做 diff，grid/timeline 仍可重建。

### P0.3 自动化性能基准

目标：把性能优化从手动观察变成可回归验证。

建议新增：

- `scripts/benchmark-render.mjs`
- Playwright 打开 `/performance-benchmark` 和 `/dense-visible-tasks`
- 采集 `onRender` 指标：`totalDuration`、`snapshotDuration`、`domDuration`、`renderTaskCount`、`svgNodeCount`

验收：

- CI 或本地命令能输出固定格式 JSON。
- 同一场景下超过阈值时失败。

## P1 功能扩展计划

### P1.1 服务端分页与懒加载数据

适用场景：

- 资源行超过 5w。
- 时间范围跨多年。
- 用户只查看当前窗口附近的数据。

建议 API：

```ts
dataSource: {
  loadRows?: (params) => Promise<GanttRecord[]>
  loadTasks?: (params) => Promise<GanttTaskRecord[]>
}
```

关键点：

- 滚动窗口变化时触发数据加载。
- 缓存已加载时间片。
- loading 状态只覆盖局部区域，避免全图闪烁。

### P1.2 搜索、筛选和定位

建议能力：

- 按资源名、任务标题、状态、时间范围过滤。
- `scrollToTask(taskKey)`。
- `scrollToRow(rowKey)`。
- 搜索结果高亮。

### P1.3 批量编辑与撤销重做

适用场景：

- 排产调整。
- 批量拖动同一工序。
- 多任务状态变更。

建议能力：

- 框选任务。
- 多选拖拽。
- `history.undo()` / `history.redo()`。
- 对外暴露变更集 `changeset`。

### P1.4 连接线增强

建议能力：

- 连接线删除。
- 连接线右键菜单。
- 循环依赖检测。
- 关键路径计算。
- 连接线自动避让密集任务。

### P1.5 导出能力

建议能力：

- 导出当前视窗为 PNG。
- 导出完整时间范围为分片 PNG/PDF。
- 导出 CSV/Excel。

技术点：

- SVG 序列化。
- foreignObject 样式内联。
- 大图分片渲染和拼接。

## P2 体验与工程化计划

### P2.1 可访问性

建议能力：

- 任务条 aria-label。
- 键盘左右移动选中任务。
- 表格行与时间轴焦点同步。

### P2.2 主题系统

建议能力：

- CSS variables 暴露颜色、间距、字体、边框。
- 深色模式。
- 紧凑模式。

### P2.3 插件化扩展点

建议能力：

- 自定义 task layer。
- 自定义 context menu。
- 自定义 selection model。
- 自定义 dependency routing。

目标是把复杂业务差异留在插件层，核心库保持稳定。

## 建议实施顺序

1. 增加自动化性能基准，锁定当前优化收益。
2. 继续拆分 `VanillaGantt.ts`，先拆渲染，再拆交互。
3. 对 task layer 做增量 patch，降低横向滚动重建成本。
4. 增加搜索、定位、筛选 API。
5. 增加服务端懒加载数据协议。
6. 增强连接线删除、校验、关键路径。
7. 增加导出能力和主题系统。

## 验收指标

- 高密度 demo 默认 5 行、10 天、每分钟一个任务时，SVG 节点数应显著低于原始逐任务渲染。
- 横向滚动不应出现长时间主线程卡死。
- 常规 demo 的 tooltip、拖拽、右键、连接线行为不回归。
- `npm --prefix packages/gantt run build` 通过。
- `npm run build` 通过。
