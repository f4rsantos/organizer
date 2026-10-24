export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8
export const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 }

function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function screenToWorld(view, [sx, sy]) {
  return [view.x + sx / view.zoom, view.y + sy / view.zoom]
}

export function worldToScreen(view, [wx, wy]) {
  return [(wx - view.x) * view.zoom, (wy - view.y) * view.zoom]
}

export function zoomAround(view, factor, anchor) {
  const zoom = clampZoom(view.zoom * factor)
  const [wx, wy] = screenToWorld(view, anchor)
  return { x: wx - anchor[0] / zoom, y: wy - anchor[1] / zoom, zoom }
}

export function panBy(view, dx, dy) {
  return { ...view, x: view.x - dx / view.zoom, y: view.y - dy / view.zoom }
}

export function fitViewport(bounds, size, margin) {
  const width = Math.max(1, bounds.maxX - bounds.minX)
  const height = Math.max(1, bounds.maxY - bounds.minY)
  const zoom = clampZoom(Math.min(1, (size.width - margin * 2) / width, (size.height - margin * 2) / height))
  return {
    x: bounds.minX - (size.width / zoom - width) / 2,
    y: bounds.minY - margin / zoom,
    zoom,
  }
}

export function visibleWorldRect(view, size) {
  return { minX: view.x, minY: view.y, maxX: view.x + size.width / view.zoom, maxY: view.y + size.height / view.zoom }
}
