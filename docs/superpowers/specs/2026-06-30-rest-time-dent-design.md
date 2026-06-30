# 休息时间段下凹任务条设计

## 背景

现有甘特图已经支持 `grid.backgroundRanges` 和 `grid.rowBackgroundRanges` 绘制休息或停机背景区间，也支持 `taskBar.customLayout` 自定义任务条内容。但默认任务条只能按连续矩形渲染，不能表达“任务跨过休息时间段，条形中间下凹但仍保持连接”的视觉效果。

本次需求是在保留任务连续时间语义的前提下，提供一个内置的休息时间段视觉能力，并新增 demo 展示内置能力和业务自定义渲染两种做法。

## 目标

- 核心库新增可选的 `taskBar.restTime` 配置，用于声明全局、行级、任务级休息时间段。
- 默认任务条在启用 `restTime` 后，把与任务时间重叠的休息段渲染为下凹区，凹区底部保留连接桥。
- 新增 demo 页面，展示内置下凹任务条，以及通过 `taskBar.customLayout` 基于同一段数据自定义渲染。
- 保持任务 `startDate`、`endDate`、宽度、拖拽、依赖线等现有时间计算不变。

## 非目标

- 不把休息时间纳入有效工时计算。
- 不改变任务拖拽后的开始、结束时间写回规则。
- 不修改时间轴刻度生成逻辑。
- 不重构现有 `grid.backgroundRanges` 行为。

## API 设计

在 `taskBar` 下新增 `restTime`：

```js
taskBar: {
  restTime: {
    enabled: true,
    ranges: [
      { startDate: '2026-03-30T12:00:00', endDate: '2026-03-30T13:30:00' }
    ],
    rowRanges: [
      { recordKey: 'unit-1', startDate: '2026-03-30T16:00:00', endDate: '2026-03-30T17:00:00' }
    ],
    rowRangesField: 'restTimes',
    taskRangesField: 'restTimes',
    modeField: 'restTimeMode',
    renderMode: 'dent',
    dentHeight: 12,
    bridgeHeight: 8,
    minWidth: 2
  }
}
```

配置含义：

- `enabled`：是否启用休息时间段视觉能力。
- `ranges`：全局休息段，作用于所有任务。
- `rowRanges`：按 `recordKey` 指定的行级休息段。
- `rowRangesField`：从行对象读取休息段数组，默认 `restTimes`。
- `taskRangesField`：从任务对象读取休息段数组，默认 `restTimes`。
- `modeField`：从行或任务对象读取合并模式，默认 `restTimeMode`。
- `renderMode`：当前支持 `dent`，为后续扩展保留。
- `dentHeight`：休息段下凹深度。
- `bridgeHeight`：休息段底部连接桥高度。
- `minWidth`：宽度小于该值的重叠休息段不渲染，避免产生视觉噪点。

合并规则：

- 默认合并顺序为全局 `ranges`、配置项 `rowRanges`、行对象 `rowRangesField`、任务对象 `taskRangesField`。
- 行或任务上的 `restTimeMode: 'override'` 表示覆盖上层休息段。
- 行或任务上的 `restTimeMode: 'disabled'` 表示该行或任务不应用休息段视觉。
- 未设置模式或设置为 `append` 时追加到上层休息段。

## 渲染设计

默认任务条渲染时，如果 `taskBar.restTime.enabled` 为真：

1. 根据任务时间和当前行、任务配置收集休息段。
2. 过滤出与任务 `[startDate, endDate]` 重叠的区间。
3. 将重叠区间裁剪到任务范围内。
4. 按任务条宽度换算为百分比位置和宽度。
5. 默认任务条根节点保留现有标题、描述、进度、锁定状态。
6. 在任务条内新增下凹覆盖层：
   - 主体条保持连续背景。
   - 每个休息段绘制一个与背景同色的凹槽覆盖区域。
   - 凹槽底部绘制细连接桥，使左右两侧视觉上仍相连。

自定义任务条渲染时，`GanttTaskBarCustomLayoutContext` 增加 `restTimeSegments`。业务可直接根据每个 segment 的 `left`、`width`、`startDate`、`endDate` 渲染自己的下凹、断续、斜纹等效果。

## Demo 设计

新增 `src/views/RestTimeDentDemo.vue`，并在 `src/router.js` 注册路由：

- 路由路径：`/rest-time-dent`
- 页面标题：`休息时间段`

页面包含一个工具栏和甘特图主体：

- 工具栏提供刻度切换。
- 第一行任务使用内置 `taskBar.restTime` 下凹效果。
- 第二行任务使用 `taskBar.customLayout` 和 `restTimeSegments` 渲染类似效果。
- 背景继续使用 `grid.backgroundRanges` 标出休息时间，便于观察任务条凹槽与背景区间对齐。

## 类型和文档

- 更新 `packages/gantt/types/index.d.ts`，增加 `GanttRestTimeOptions`、`GanttRestTimeRange`、`GanttRestTimeSegment`。
- 更新 `GanttTaskBarOptions`，加入 `restTime?: boolean | GanttRestTimeOptions`。
- 更新 `GanttTaskBarCustomLayoutContext`，加入 `restTimeSegments?: GanttRestTimeSegment[]`。
- 如 README 已覆盖任务条配置章节，补充一个简短示例。

## 验证

实现后需要运行：

- `npm run build:gantt`
- `npm run lint`
- 如 demo 站点依赖构建产物，再运行 `npm run build`

验证重点：

- 未启用 `taskBar.restTime` 时默认任务条视觉不变。
- 启用后，跨休息段任务出现下凹且不中断。
- 全局、行级、任务级休息段合并规则符合设计。
- `taskBar.customLayout` 能收到 `restTimeSegments`。
- 构建和 lint 无警告、无报错。
