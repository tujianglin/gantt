import { attrs, el, svgEl } from '../utils/dom'
import { applyTimelineStyle, applyTimelineStyleToContent } from '../utils/style'

export function renderTimelineSvgContent(gantt: any, svg = gantt.timelineSvg) {
  if (!svg) return
  applyTimelineSvgViewport(gantt, svg)
  svg.innerHTML = ''
  const fragment = document.createDocumentFragment()
  let y = 0
  gantt.timelineUnitsByScale.forEach((units: any[], scaleIndex: number) => {
    const scale = gantt.timelineScales[scaleIndex]
    const height = gantt.scaleRowHeight(scale)
    units.forEach(unit => {
      fragment.append(renderTimelineUnit(gantt, unit, y, height, scale, scaleIndex))
    })
    y += height
  })
  svg.append(fragment)
}

export function applyTimelineSvgViewport(gantt: any, svg = gantt.timelineSvg) {
  if (!svg) return
  const window = gantt.activeVirtualWindow || gantt.virtualWindow
  const width = Math.max(1, window.xEnd - window.xStart)
  attrs(svg, {
    width,
    height: gantt.headerHeight,
    viewBox: `${window.xStart} 0 ${width} ${gantt.headerHeight}`
  })
  svg.style.position = 'absolute'
  svg.style.left = `${window.xStart}px`
  svg.style.top = '0'
  svg.style.width = `${width}px`
  svg.style.height = `${gantt.headerHeight}px`
}

export function renderTimelineUnit(gantt: any, unit: any, y: number, height: number, scale: any, scaleIndex: number) {
  const fo = svgEl('foreignObject')
  attrs(fo, {
    x: unit.x,
    y,
    width: unit.width,
    height,
    'data-timeline-unit-key': `${scaleIndex}:${unit.key}:${unit.x}:${unit.width}`
  })
  const shouldRenderContent = gantt.shouldRenderTimelineUnitContent(unit, scale)
  const custom = shouldRenderContent
    ? gantt.resolveContent(scale.customLayout || gantt.timelineHeader.customLayout, {
      dateInfo: unit,
      unit,
      scale,
      scaleIndex,
      major: scaleIndex === 0,
      gantt
    })
    : null
  const style = gantt.timelineCellStyle(scale)
  if (custom) {
    applyTimelineStyleToContent(custom, gantt.timelineCustomCellStyle(scale))
    fo.append(custom)
  } else {
    const cell = el('div', `vg-timeline-cell${scaleIndex === 0 ? ' vg-timeline-cell--major' : ''}`)
    applyTimelineStyle(cell, style)
    cell.textContent = shouldRenderContent ? unit.label : ''
    fo.append(cell)
  }
  return fo
}
