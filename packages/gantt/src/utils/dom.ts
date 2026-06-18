import { SVG_NS } from './constants'

export function el(tag, className = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

export function svgEl(tag, className = '') {
  const node = document.createElementNS(SVG_NS, tag)
  if (className) node.setAttribute('class', className)
  return node
}

export function attrs(node, values) {
  Object.keys(values).forEach(key => {
    if (values[key] !== undefined && values[key] !== null) {
      node.setAttribute(key, values[key])
    }
  })
}
