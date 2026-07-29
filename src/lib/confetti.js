export async function fireConfetti() {
  try {
    const { default: confetti } = await import('canvas-confetti')
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.4 },
      colors: ['#6366f1', '#22c55e', '#f97316', '#ec4899'],
    })
  } catch {
  }
}
