import { useState, useEffect, useRef } from 'react'
import GooseEmoji from './GooseEmoji'
import './StreamViewer.css'

const isDev = import.meta.env.DEV

export default function StreamViewer() {
  const videoRef = useRef(null)
  const [status, setStatus] = useState(isDev ? 'dev' : 'connecting')

  useEffect(() => {
    if (isDev) return

    const video = videoRef.current
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProto}//${location.host}/api/ws?src=goose`

    let ws
    let mediaSource
    let sourceBuffer
    let queue = []

    function connect() {
      setStatus('connecting')
      ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        mediaSource = new MediaSource()
        video.src = URL.createObjectURL(mediaSource)

        mediaSource.addEventListener('sourceopen', () => {
          ws.send(JSON.stringify({ type: 'mse', value: '' }))
        })
      }

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'mse') {
            sourceBuffer = mediaSource.addSourceBuffer(msg.value)
            sourceBuffer.mode = 'segments'
            sourceBuffer.addEventListener('updateend', () => {
              if (queue.length > 0) {
                sourceBuffer.appendBuffer(queue.shift())
              }
            })
          }
          return
        }

        if (sourceBuffer) {
          if (sourceBuffer.updating || queue.length > 0) {
            queue.push(ev.data)
          } else {
            sourceBuffer.appendBuffer(ev.data)
          }
          setStatus('playing')
        }
      }

      ws.onclose = () => {
        setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
  }, [])

  return (
    <div className="stream-wrapper">
      {status !== 'playing' && (
        <div className="stream-placeholder">
          <GooseEmoji className="loading-goose" />
          <p>
            {status === 'dev'
              ? 'Stream unavailable in dev mode'
              : 'Waiting for the goose...'}
          </p>
        </div>
      )}
      {!isDev && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: status === 'playing' ? 'block' : 'none' }}
        />
      )}
    </div>
  )
}
