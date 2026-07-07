import confetti from 'canvas-confetti'

export function fireConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.4 },
    colors: ['#6366f1', '#22c55e', '#f97316', '#ec4899'],
  })
}
