# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库结构

这是一个双层仓库:

- **根目录** 是一个 Vue 2 (`@vue/cli-service`) 演示站点,用于展示甘特图组件的各种用法。每个用法对应 `src/views/*Demo.vue` 一个页面,在 `src/router.js` 注册为 hash 路由。
- **`packages/gantt`** 是真正的核心库 `@wimi/gantt`:一个**不依赖任何框架**的 TypeScript 甘特图组件,基于 SVG + `foreignObject` 渲染,用 Vite library mode 打包。它是独立的 TS 工程,不依赖外层 Vue。

### 关键:演示站点消费的是构建产物,不是源码

演示站点通过 `src/lib/index.js` 引入库:

```js
import '../../packages/gantt/dist/VanillaGantt.css'
export { default, VanillaGantt } from '../../packages/gantt/dist/VanillaGantt.es.js'
```

各 demo 页面统一写 `import { VanillaGantt } from '../lib'`。这意味着**修改 `packages/gantt/src` 后,必须先重新打包库,演示站点才能看到变化**。`dist/` 被 gitignore,不进版本库。

## 常用命令

库的改动(绝大多数功能开发在这里):

```bash
# 改完 packages/gantt/src 后必须重新打包,demo 才生效
npm run build:gantt
# 等价于 npm --prefix packages/gantt run build
```

演示站点:

```bash
npm run serve        # 本地开发服务器
npm run build        # 仅打包演示站点(不重新打包库)
npm run build:site   # 先打包库再打包站点(发布站点用)
npm run lint         # ESLint(eslint-plugin-vue),仅作用于根目录 demo
```

库本身没有独立的 lint / test 脚本,只有 `vite build`。`tsconfig.json` 设了 `noEmit` 且 `strict: false`,类型仅做编辑期检查,不参与产物。

典型工作流:改 `packages/gantt/src` → `npm run build:gantt` → `npm run serve` 验证。

## 核心库架构 (`packages/gantt/src`)

整个库导出**单个类** `VanillaGantt`(`VanillaGantt.ts`,约 3700 行,是绝大部分逻辑所在)。对外 API 极简:

```js
const gantt = new VanillaGantt(container, options)
gantt.setOptions(partialOptions)  // 增量合并并重渲染
gantt.destroy()
```

`options` 是唯一的配置入口,完整字段说明见 `packages/gantt/README.md`(非常详尽,改配置相关功能前先读它)。`mergeOptions`(`utils/options.ts`)负责把传入 options 与 `config/defaultOptions.ts` 的默认值深合并。

### 渲染快照模式 (`core/renderSnapshot.ts`)

这是理解性能设计的核心。一次 body SVG 渲染开始时调用 `buildRenderSnapshot(gantt)` **一次性**计算出该帧需要的所有派生数据:可见行 `renderedRowEntries`、可见任务 `visibleTasks`、父节点聚合任务条 `parentTimelineTasks`、`taskLayoutByKey`(每个任务的 x/y/宽高布局)、可见连接线、连接邻接关系、可见里程碑、背景区间等。后续 `appendGrid` / `renderTask` / `appendLink` 等都从这一份 snapshot 读,避免把原本是 getter 的派生数据在一帧内反复重算(历史包袱见 `PERFORMANCE_PLAN.md`)。

修改渲染逻辑时:**不要在渲染过程中重新扫描 records 计算布局**,应扩展 snapshot 并从中读取。

### 双向虚拟滚动 (`core/virtualScroll.ts`)

x 轴(时间)和 y 轴(行)各自独立虚拟化,由 `options.virtualScroll` 控制(`enabled` 控横向、`rowEnabled` 控纵向)。

- `getVirtualWindow` / `getVirtualRowWindow` 计算当前视口 + buffer 对应的渲染窗口。
- `renderedEntriesInWindow` 用二分查找在已排序的行 metrics 中定位窗口内的行。
- `shouldRefreshVirtualWindow` / `shouldRefreshVirtualRows` 判断滚动距离是否超过阈值,超过才重建窗口和重渲染,避免每次滚动都重算。

### 依赖连接线 (`core/dependency.ts`)

`buildDependencySnapshot` 把 `options.dependency.links` 规范化:`from`/`to` 支持单值或数组,展开成成对的归一化 link,并构建 `linkAdjacencyByTaskKey`(任务 key → 相邻任务 key 列表)用于 O(1) 查邻接。`linkNetworkByTask` 用 BFS 从某个任务出发遍历邻接表,得到整条关联网络——点击任务高亮整条链路就靠它。默认 `showLinks: false`,只在点击任务时显示其所在网络。

### 其他模块

- `core/taskLayout.ts`:把任务的时间/泳道换算成 SVG 坐标(`timeToX`、`taskY`、`durationWidth` 等几何方法挂在主类上)。
- `utils/time.ts`:时间解析与刻度相关(`toTime`、`formatDateTime`)。
- `utils/dom.ts`:`el` / `svgEl` / `attrs` 创建 DOM/SVG 节点的小工具。
- `utils/style.ts`:时间轴、表头样式应用。
- `types/internal.ts`:内部快照、窗口、布局等类型。

## 约定与注意点

- 库内部所有 `customLayout` / `renderHeader` / `renderCell` 可返回 `Node | string | { rootContainer } | null`,推荐返回**模板字符串**(内部用 `<template>` 解析)。
- 自定义模板中阻止默认交互用 data 属性:`data-vg-toggle`(树展开按钮)、`data-vg-no-drag`(任务条内不触发拖拽)、`data-vg-row-drag-handle`(行拖拽手柄)。
- 拖拽结束后组件会把新的开始/结束时间**写回原始 task 对象**,字段名由 `taskBar.startDateField` / `endDateField` 决定。
- 大量自定义 task 时优先给行/任务显式 `height` 或用 `rowHeight: 'auto'`,减少 `foreignObject` 测量开销。
- 全局指令(`CLAUDE.md` 用户级):用中文回复;写完代码要校验有无警告/报错并修复。
