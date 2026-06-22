# CapacityUsageDemo 行对齐问题排查

## 现象

在 Vue2 demo `src/views/CapacityUsageDemo.vue` 中，左侧工位组表格行和右侧负载率 task 单元格滚动后出现纵向错位。数据越往下，错位越明显。

## 根因

`CapacityUsageDemo` 把每个工位每天的负载率渲染为一个 task，并要求左侧表格行和右侧 SVG 行严格共用同一个行高。

库内部行度量使用配置值累计：

- `rowHeight: 72`
- `visibleRowEntries.top/bottom` 按 72px 累计
- 右侧 SVG 的网格线、task y 坐标都基于这套度量

但左侧 DOM 行样式中：

```css
.vg-row {
  height: 72px;
  border-bottom: 1px solid #edf1f1;
}
```

默认 `box-sizing` 是 `content-box`，因此左侧每行真实占用高度是 `72px + 1px border = 73px`。右侧仍按 72px 渲染，滚动或行数增加后会产生累计误差。左侧表头也存在相同的 `height + border-bottom` 问题，会让 body 起点额外偏移 1px。

## 修复

在基础样式中让左侧表头和行使用 `border-box`：

```css
.vg-left-header,
.vg-row {
  box-sizing: border-box;
}
```

这样 DOM 外高等于配置行高，左侧表格、右侧 SVG 网格线和 task 坐标使用同一套像素基准。

## 影响范围

该修复在 `packages/gantt/src/vanilla-gantt.css` 生效，覆盖所有使用左侧表格的 demo 和业务场景。它不改变 API，也不改变 `rowHeight` 的语义，只修正 CSS 盒模型和内部行度量不一致的问题。

## 验证

1. 检查 `.vg-row` 包含 `box-sizing: border-box`，避免边框撑大声明行高。
2. 执行 `npm --prefix packages/gantt run build`，确认库包构建通过。
3. 执行 `npm run build`，确认 Vue2 demo 构建通过。
4. 打开 `src/views/CapacityUsageDemo.vue` 对应页面，垂直滚动后左侧工位组行和右侧负载率单元格应保持同一水平线。
