export function applyTableHeaderStyle(node, style = {}) {
  if (!style) return
  if (style.backgroundColor) node.style.background = style.backgroundColor
  if (style.color) node.style.color = style.color
  if (style.fontSize) node.style.fontSize = `${style.fontSize}px`
  if (style.fontWeight) node.style.fontWeight = style.fontWeight
}

export function applyTimelineStyle(node, style = {}) {
  if (style.backgroundColor) node.style.background = style.backgroundColor
  if (style.color) node.style.color = style.color
  if (style.fontSize) node.style.fontSize = `${style.fontSize}px`
  if (style.fontWeight) node.style.fontWeight = style.fontWeight
  if (style.textAlign) node.style.justifyContent = alignToFlex(style.textAlign)
}

export function applyTimelineStyleToContent(content, style = {}) {
  if (!style || !Object.keys(style).length) return
  const target = content.nodeType === 11 ? content.firstElementChild : content
  if (target instanceof HTMLElement) {
    applyTimelineStyle(target, style)
  }
}

export function alignToFlex(value) {
  if (value === 'left' || value === 'start') return 'flex-start'
  if (value === 'right' || value === 'end') return 'flex-end'
  return 'center'
}
