import { useEffect, useRef } from 'react'

const HEARTBEAT_INTERVAL = 30 // seconds between flushes

export default function WatchTracker({ user }) {
  const accumulated = useRef(0)
  const lastTick = useRef(null)

  useEffect(() => {
    if (!user) return

    function startTicking() {
      lastTick.current = Date.now()
    }

    function stopTicking() {
      if (lastTick.current) {
        accumulated.current += (Date.now() - lastTick.current) / 1000
        lastTick.current = null
      }
    }

    function flush() {
      stopTicking()
      const seconds = Math.round(accumulated.current)
      accumulated.current = 0
      if (document.visibilityState === 'visible') {
        startTicking()
      }
      if (seconds < 1) return
      fetch('/api/watchtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, seconds }),
      }).catch(() => {})
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        startTicking()
      } else {
        stopTicking()
      }
    }

    // Start tracking if tab is already visible
    if (document.visibilityState === 'visible') {
      startTicking()
    }

    document.addEventListener('visibilitychange', onVisibility)
    const interval = setInterval(flush, HEARTBEAT_INTERVAL * 1000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(interval)
      // Flush remaining time on unmount
      stopTicking()
      const seconds = Math.round(accumulated.current)
      if (seconds >= 1) {
        navigator.sendBeacon(
          '/api/watchtime',
          new Blob(
            [JSON.stringify({ username: user, seconds })],
            { type: 'application/json' }
          )
        )
      }
    }
  }, [user])

  return null // no UI, just tracking
}
