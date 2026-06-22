# Gantt Extreme Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 `packages/gantt` 做下一阶段极致性能与可维护性优化，让 5w 行、长时间轴、复杂 task 模板、1000+ 连接线场景具备可验证的稳定滚动和可回归性能基线。

**Architecture:** 先建立自动化性能基准和渲染一致性测试，再把 `VanillaGantt.ts` 中的渲染、状态、交互、度量逻辑拆到明确模块。高风险优化采用“快照 -> 分层渲染 -> task layer diff -> timeline/grid diff”的递进方式，避免一次性重写渲染器。

**Tech Stack:** TypeScript, Vite library build, SVG + foreignObject, Vue 2 demo app, Playwright benchmark runner.

---

## 审查结论

当前代码已经完成了第一轮关键性能优化，包括渲染快照、行/时间虚拟滚动、高密度 task 合并、连接线索引、分片渲染和性能指标输出。下一阶段瓶颈主要不在单个算法，而在以下工程边界：

1. `packages/gantt/src/VanillaGantt.ts` 仍有 4075 行，并且类声明使用 `[key: string]: any`，核心模块虽已拆出但状态、渲染、交互仍高度耦合。
2. body 与 timeline 仍以 `svg.innerHTML = ''` 清空重建为主，小幅横向滚动仍会重建当前窗口内所有 SVG/foreignObject 节点。
3. 性能指标开启后会执行 `svg.querySelectorAll('*').length`，该统计本身会污染大节点场景的 `domDuration`。
4. `types/index.d.ts` 暴露了 `dependency.linkSelectable/linkDeletable`，README 标记为预留字段，但默认配置和运行时代码没有实现，属于 API 漂移。
5. `resolveContent()` 接受字符串并写入 `template.innerHTML`，这是灵活能力，但当前没有安全边界说明和测试覆盖。
6. 目前只有 demo 面板，没有可命令行执行的性能回归基准；计划文档里已有 `scripts/benchmark-render.mjs` 设想，但仓库内尚未实现。

## 关键证据

- `VanillaGantt.ts` 体量：`wc -l packages/gantt/src/VanillaGantt.ts` = 4075 行。
- 宽泛类型：`packages/gantt/src/VanillaGantt.ts:13-16` 使用索引签名和 `Record<string, any>`；`packages/gantt/src` 与 `types` 中 `any`/`Record<string, any>` 命中 39 处。
- 全量重建：`packages/gantt/src/VanillaGantt.ts:1122-1136` 重建 timeline SVG；`packages/gantt/src/VanillaGantt.ts:1438-1458` 重建 body SVG。
- 指标污染：`packages/gantt/src/VanillaGantt.ts:1478-1494` 在性能回调中执行 `svg.querySelectorAll('*').length`。
- 字符串模板：`packages/gantt/src/VanillaGantt.ts:3050-3058` 将 renderer 返回字符串写入 `template.innerHTML`。
- API 漂移：`packages/gantt/types/index.d.ts:366-380` 暴露 `linkSelectable/linkDeletable`；`packages/gantt/README.md` 标记为预留字段；`packages/gantt/src/config/defaultOptions.ts:86-109` 没有默认值和实现入口。
- 自动化基准缺口：仓库内只有 `packages/gantt/OPTIMIZATION_FEATURE_PLAN.md` 提到 `scripts/benchmark-render.mjs`，没有实际脚本。

## 优化原则

- 先测量，再改造。任何性能优化任务都必须在基准脚本中留下前后数据。
- 不一次性重写渲染器。先拆边界，再对 task layer 做 diff，最后扩展到 grid/timeline。
- 保持 API 兼容。已有 demo 必须继续通过，已经出现在公开类型里的字段必须补齐运行时行为和文档说明。
- 热路径避免查询 DOM。渲染过程优先使用构建期计数、快照索引和稳定 key。
- 自定义模板保持能力，但明确字符串模板安全边界，推荐 Node/rootContainer。

## 文件结构规划

- Modify: `packages/gantt/src/VanillaGantt.ts`
  - 保留构造、options 合并、生命周期协调和公开 API。
- Create: `packages/gantt/src/core/renderLayers.ts`
  - 定义 layer key、节点计数、layer diff 基础工具。
- Create: `packages/gantt/src/core/bodyRenderer.ts`
  - 承接 body SVG 渲染、分片渲染、task layer patch。
- Create: `packages/gantt/src/core/timelineRenderer.ts`
  - 承接 timeline SVG 渲染和 timeline unit patch。
- Create: `packages/gantt/src/core/interactions.ts`
  - 承接 task、milestone、link connector 委托事件。
- Create: `packages/gantt/src/core/measurements.ts`
  - 承接 tooltip、foreignObject 测量和批处理。
- Create: `packages/gantt/src/core/dependencyState.ts`
  - 缓存 dependency snapshot，按 `dependency.links`/高亮状态失效。
- Modify: `packages/gantt/src/types/internal.ts`
  - 补齐内部类型，减少 `any`。
- Modify: `packages/gantt/types/index.d.ts`
  - 对齐公开 API，补充性能字段、安全说明或移除未实现字段。
- Create: `scripts/benchmark-render.mjs`
  - 命令行性能基准入口。
- Modify: `package.json`
  - 增加 `benchmark:gantt` 脚本。
- Modify: `packages/gantt/README.md`
  - 更新极限性能建议、模板安全说明、性能指标说明。

## Phase 0: 基线与护栏

### Task 0.1: 增加自动化性能基准

**Files:**
- Create: `scripts/benchmark-render.mjs`
- Modify: `package.json`

- [x] 创建 benchmark 脚本，复用 `/performance-benchmark` 与 `/dense-visible-tasks` 场景。
- [x] 输出 JSON 指标：`totalDuration`、`snapshotDuration`、`domDuration`、`renderTaskCount`、`visibleLinkCount`、`svgNodeCount`、`scrollJankCount`。
- [x] 增加阈值：10k 行 + 1000 link 的可视窗口 body render P95 不超过 32ms；dense demo 横向滚动不出现超过 120ms 的长任务。
- [x] 在 `package.json` 增加 `benchmark:gantt`。
- [x] 验证命令：`npm run benchmark:gantt`。

### Task 0.2: 增加类型和 API 漂移检查

**Files:**
- Create: `scripts/check-gantt-api.mjs`
- Modify: `package.json`

- [x] 检查 `types/index.d.ts` 的公开字段是否存在于 `DEFAULT_OPTIONS` 或运行时代码。
- [x] 将 `linkSelectable/linkDeletable` 纳入本轮实现，补齐默认配置、运行时行为和 README 文档。
- [x] 增加 `check:gantt-api` 脚本。
- [x] 验证命令：`npm run check:gantt-api`。

## Phase 1: 模块拆分

### Task 1.1: 拆分 body renderer

**Files:**
- Create: `packages/gantt/src/core/bodyRenderer.ts`
- Modify: `packages/gantt/src/VanillaGantt.ts`

- [x] 移动 `renderBodySvgContent()`、`appendGrid()`、`appendGridSliced()`、`renderDefs()` 到 body renderer。
- [x] 保留 `VanillaGantt` 方法名作为薄包装，避免破坏内部调用。
- [x] 输出渲染结果对象：`{ nodeCount, taskNodeCount, linkNodeCount }`，替代后续 DOM 查询。
- [x] 验证命令：`npm --prefix packages/gantt run build`、`npm run build`。

### Task 1.2: 拆分 timeline renderer

**Files:**
- Create: `packages/gantt/src/core/timelineRenderer.ts`
- Modify: `packages/gantt/src/VanillaGantt.ts`

- [x] 移动 `renderTimelineSvgContent()`、`applyTimelineSvgViewport()`、`renderTimelineUnit()`。
- [x] 为 timeline unit 构建稳定 key：`${scaleIndex}:${unit.key}:${unit.x}:${unit.width}`。
- [x] 保留当前全量重建行为，先只拆边界。
- [ ] 验证 timeline demo：15分钟、1小时、天、月刻度切换无回归。

### Task 1.3: 拆分交互和测量

**Files:**
- Create: `packages/gantt/src/core/interactions.ts`
- Create: `packages/gantt/src/core/measurements.ts`
- Modify: `packages/gantt/src/VanillaGantt.ts`

- [x] 移动 task 委托事件、milestone 事件、link connector 事件。
- [x] 移动 `scheduleTaskForeignObjectMeasure()` 和 tooltip positioning。
- [x] 清理废弃方法 `bindTaskInteractions()`、`bindLinkConnector()`，若无调用则删除。
- [ ] 验证 demo：拖拽、右键菜单、tooltip、连接线创建不回归。

## Phase 2: 热路径优化

### Task 2.1: 移除性能指标 DOM 全量查询

**Files:**
- Modify: `packages/gantt/src/core/bodyRenderer.ts`
- Modify: `packages/gantt/src/VanillaGantt.ts`
- Modify: `packages/gantt/types/index.d.ts`

- [x] 渲染过程中累加节点数量，不再在 `emitBodyRenderPerformance()` 中调用 `svg.querySelectorAll('*')`。
- [x] 指标对象增加 `estimatedSvgNodeCount` 或保留 `svgNodeCount` 但来源改为计数器。
- [ ] benchmark 开启 `performance.enabled` 时，`domDuration` 不应因为节点统计显著上升。

### Task 2.2: 缓存 dependency snapshot

**Files:**
- Create: `packages/gantt/src/core/dependencyState.ts`
- Modify: `packages/gantt/src/core/dependency.ts`
- Modify: `packages/gantt/src/VanillaGantt.ts`

- [x] 引入 `dependencyVersion`，在 `setOptions({ dependency })`、`onLinkCreate` 后递增。
- [x] `normalizedLinks`、`linkKeySet`、`linkAdjacencyByTaskKey`、`firstLinkGroupByTaskKey` 统一读缓存。
- [x] 保证 `activeLinkTaskKeys` 改变时只影响 active links，不重复归一化所有 links。
- [ ] 验证 1000 link 点击高亮网络时，snapshot 耗时下降或保持稳定。

### Task 2.3: task layer 增量 patch

**Files:**
- Create: `packages/gantt/src/core/renderLayers.ts`
- Modify: `packages/gantt/src/core/bodyRenderer.ts`

- [x] 为 task、milestone、link、connector 分配稳定 key。
- [ ] 第一阶段只 patch task layer：相同 key 且 layout 未变时复用节点；layout 变化只更新 `x/y/width/height`。
- [x] 自定义 `customLayout` 任务默认不复用内容；只有显式 `task.version` 或 layout 不变时复用。
- [x] denseRender path 以 group key 复用。
- [ ] 验证横向小幅滚动时 DOM 创建数量下降。

## Phase 3: 类型收敛与安全边界

### Task 3.1: 收敛内部类型

**Files:**
- Modify: `packages/gantt/src/types/internal.ts`
- Modify: `packages/gantt/src/core/*.ts`
- Modify: `packages/gantt/src/VanillaGantt.ts`

- [ ] 定义 `GanttRuntimeState`、`NormalizedRow`、`NormalizedTask`、`RendererHost` 类型。
- [ ] 优先替换 core 模块里的 `gantt: any`，再逐步收敛 `VanillaGantt` 的索引签名。
- [ ] 目标：`packages/gantt/src/core` 不再出现 `gantt: any`。
- [ ] 验证命令：`npm --prefix packages/gantt run build`。

### Task 3.2: 明确字符串模板安全策略

**Files:**
- Modify: `packages/gantt/README.md`
- Modify: `packages/gantt/types/index.d.ts`

- [x] README 明确：renderer 返回字符串会作为 HTML 解析，业务必须自行转义不可信内容。
- [x] 推荐返回 `Node` 或 `{ rootContainer }`。
- [x] `types/index.d.ts` 为 `GanttRenderer<T>` 增加注释，说明 string 返回值是 HTML 片段。
- [x] 为 demo 中字符串模板保留 `escapeHtml()`。

## Phase 4: 功能一致性与发布质量

### Task 4.1: 处理 linkSelectable/linkDeletable

**Files:**
- Modify: `packages/gantt/types/index.d.ts`
- Modify: `packages/gantt/src/config/defaultOptions.ts`
- Modify: `packages/gantt/src/core/interactions.ts`
- Modify: `packages/gantt/README.md`

- [x] 增加 link click/contextmenu 委托、选中态、删除回调。
- [x] 为 link path 写入 `data-link-key` 和 `data-link-group-key`。
- [x] `linkSelectable` 开启时点击连接线写入 active link state。
- [x] `linkDeletable` 开启时提供默认 Delete/Backspace 删除行为，并暴露 `onLinkDelete` 回调。
- [x] 不允许公开类型显示可用但运行时无行为。

### Task 4.2: 发布兼容检查

**Files:**
- Modify: `packages/gantt/vite.config.ts`
- Modify: `packages/gantt/package.json`
- Create: `scripts/check-gantt-dist.mjs`

- [x] 检查 dist 产物不包含 `&&=`、`||=`、`??=`、optional chaining、nullish coalescing。
- [x] 增加 `check:gantt-dist` 脚本。
- [x] 发布前固定执行：`npm --prefix packages/gantt run build && npm run check:gantt-dist && npm run build`。

## 验收矩阵

- [x] `npm --prefix packages/gantt run build` 通过。
- [x] `npm run build` 通过。
- [x] `npm run benchmark:gantt` 输出 JSON，且阈值通过。
- [ ] `/performance-benchmark`：10k 行、1000 link、15分钟刻度，横向滚动 P95 body render <= 32ms。
- [ ] `/performance-benchmark`：50k 行纵向滚动，renderedRowCount 只随窗口和 buffer 变化。
- [ ] `/dense-visible-tasks`：横向滚动无长时间卡死，SVG 节点数保持低位。
- [ ] `/capacity-usage`：左侧表格行和右侧 task 行保持对齐。
- [ ] `/task-interaction`：拖拽、点击、tooltip 不回归。
- [ ] `/link-create`：连接线创建、高亮、重复校验不回归。
- [ ] `types/index.d.ts` 与 README、默认配置一致。

## 实施顺序

1. Phase 0：自动化基准和 API 漂移检查。
2. Phase 1：模块拆分，不改变行为。
3. Phase 2.1：移除性能指标 DOM 查询。
4. Phase 2.2：dependency snapshot 缓存。
5. Phase 2.3：task layer 增量 patch。
6. Phase 3：类型收敛和模板安全说明。
7. Phase 4：连接线预留 API 决策和发布兼容检查。

## 风险与回滚

- 增量 patch 风险最高，必须 behind feature flag 开发，例如 `virtualScroll.patchRender?: boolean`，默认关闭，基准通过后再默认开启。
- 自定义 HTML 模板不可强行改成 text 模式，否则会破坏既有用户；安全策略先文档化，再提供 opt-in。
- 模块拆分期间保持薄包装方法，避免一次性修改所有调用点。
- 每个 phase 单独提交，任何回归都可以回退到上一 phase。
