const PACKING_RATIO = 0.55
const MAX_SIMULATED_TOMATOES = 250

function circleArea(size) {
  return Math.PI * (size / 2) ** 2
}

export function fitTomatoesToArea(tomatoes, { width, height, sizeOf, max = MAX_SIMULATED_TOMATOES }) {
  const budget = width * height * PACKING_RATIO
  let used = 0
  let first = tomatoes.length
  while (first > 0 && tomatoes.length - first < max) {
    const area = circleArea(sizeOf(tomatoes[first - 1]))
    if (used + area > budget) break
    used += area
    first -= 1
  }
  return first === 0 ? tomatoes : tomatoes.slice(first)
}
