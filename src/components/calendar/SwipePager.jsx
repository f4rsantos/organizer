import { useEffect, useRef } from 'react'

const CLAIM_DISTANCE = 8
const HORIZONTAL_RATIO = 1.4
const COMMIT_FRACTION = 0.25
const FLICK_VELOCITY = 0.5
const SETTLE_MS = 260

export function SwipePager({ pageKey, renderPage, onPrev, onNext, canPrev = true, canNext = true }) {
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const dragRef = useRef(null)

  const cbRef = useRef({ onPrev, onNext, canPrev, canNext })
  useEffect(() => { cbRef.current = { onPrev, onNext, canPrev, canNext } }, [onPrev, onNext, canPrev, canNext])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.style.transition = 'none'
    track.style.transform = 'translate3d(-33.3333%, 0, 0)'
  }, [pageKey])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const setOffset = (px, animate = false) => {
      const track = trackRef.current
      if (!track) return
      track.style.transition = animate ? `transform ${SETTLE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none'
      track.style.transform = `translate3d(calc(-33.3333% + ${px}px), 0, 0)`
    }

    const swallowClick = () => {
      const swallow = ev => { ev.stopPropagation(); ev.preventDefault() }
      viewport.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => viewport.removeEventListener('click', swallow, { capture: true }), 0)
    }

    const release = () => {
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }

    const settle = () => {
      const drag = dragRef.current
      dragRef.current = null
      release()
      if (!drag) return
      if (drag.pointerId != null && viewport.hasPointerCapture?.(drag.pointerId)) {
        viewport.releasePointerCapture?.(drag.pointerId)
      }
      if (!drag.claimed) return

      const width = viewport.clientWidth || 1
      const dx = drag.dx
      const elapsed = Math.max(1, performance.now() - drag.t)
      const velocity = Math.abs(dx) / elapsed
      const past = Math.abs(dx) > width * COMMIT_FRACTION
      const flick = velocity > FLICK_VELOCITY && Math.abs(dx) > CLAIM_DISTANCE * 2

      const { onPrev: prev, onNext: next, canPrev: allowPrev, canNext: allowNext } = cbRef.current
      const wantsNext = dx < 0
      const allowed = wantsNext ? allowNext : allowPrev
      const commit = (past || flick) && allowed

      if (!commit) {
        setOffset(0, true)
        setTimeout(() => viewport.classList.remove('swiping'), SETTLE_MS)
        return
      }

      swallowClick()
      setOffset(wantsNext ? -width : width, true)
      setTimeout(() => {
        setOffset(0)
        if (wantsNext) next?.(); else prev?.()
        viewport.classList.remove('swiping')
      }, SETTLE_MS)
    }

    const onDown = e => {
      if (e.button != null && e.button !== 0) { dragRef.current = null; return }
      dragRef.current = {
        x: e.clientX, y: e.clientY, t: performance.now(),
        pointerId: e.pointerId, target: e.target,
        dx: 0, claimed: false, rejected: false,
      }
    }

    const onMove = e => {
      const drag = dragRef.current
      if (!drag || drag.rejected) return
      if (e.pointerId != null && e.pointerId !== drag.pointerId) return

      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.dx = dx

      if (drag.claimed) {
        const { canPrev: allowPrev, canNext: allowNext } = cbRef.current
        const blocked = dx > 0 ? !allowPrev : !allowNext
        setOffset(blocked ? dx * 0.2 : dx)
        return
      }

      if (Math.max(Math.abs(dx), Math.abs(dy)) < CLAIM_DISTANCE) return
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) { drag.rejected = true; return }

      drag.claimed = true
      viewport.classList.add('swiping')
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      window.getSelection?.()?.removeAllRanges?.()

      const captor = e.target
      if (captor?.hasPointerCapture?.(e.pointerId)) captor.releasePointerCapture?.(e.pointerId)
    }

    const onUp = e => {
      if (e.isTrusted === false) return
      const drag = dragRef.current
      if (drag && e.pointerId === drag.pointerId) drag.dx = e.clientX - drag.x
      settle()
    }

    const onCancel = e => {
      if (e.isTrusted === false) return
      settle()
    }

    const onWindowUp = e => { if (dragRef.current) onUp(e) }
    const onWindowBlur = () => { if (dragRef.current) settle() }

    viewport.addEventListener('pointerdown', onDown, true)
    viewport.addEventListener('pointermove', onMove, true)
    viewport.addEventListener('pointerup', onUp, true)
    viewport.addEventListener('pointercancel', onCancel, true)
    window.addEventListener('pointerup', onWindowUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      viewport.removeEventListener('pointerdown', onDown, true)
      viewport.removeEventListener('pointermove', onMove, true)
      viewport.removeEventListener('pointerup', onUp, true)
      viewport.removeEventListener('pointercancel', onCancel, true)
      window.removeEventListener('pointerup', onWindowUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
      window.removeEventListener('blur', onWindowBlur)
      viewport.classList.remove('swiping')
      release()
    }
  }, [])

  return (
    <div ref={viewportRef} className="flex-1 min-h-0 overflow-hidden swipe-viewport">
      <div ref={trackRef} className="flex h-full w-[300%]"
        style={{ transform: 'translate3d(-33.3333%, 0, 0)' }}>
        <div className="w-1/3 h-full flex flex-col" aria-hidden>{renderPage(-1)}</div>
        <div className="w-1/3 h-full flex flex-col">{renderPage(0)}</div>
        <div className="w-1/3 h-full flex flex-col" aria-hidden>{renderPage(1)}</div>
      </div>
    </div>
  )
}
