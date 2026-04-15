import { useState, useEffect, useRef } from 'react'
import GooseEmoji from './GooseEmoji'
import './StreamViewer.css'

const isDev = import.meta.env.DEV
const canMSE = typeof MediaSource !== 'undefined'

function connectMSE(video, setStatus) {
  const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${wsProto}//${location.host}/api/ws?src=goose`

  let ws, mediaSource, sourceBuffer, queue = []

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
            if (queue.length > 0) sourceBuffer.appendBuffer(queue.shift())
          })
        }
        return
      }
      if (sourceBuffer) {
        if (sourceBuffer.updating || queue.length > 0) queue.push(ev.data)
        else sourceBuffer.appendBuffer(ev.data)
        setStatus('playing')
      }
    }

    ws.onclose = () => { setTimeout(connect, 3000) }
    ws.onerror = () => { ws.close() }
  }

  connect()
  return () => { if (ws) { ws.onclose = null; ws.close() } }
}

function connectWebRTC(video, setStatus) {
  let pc, cleanup = false

  async function connect() {
    setStatus('connecting')
    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    pc.ontrack = (ev) => {
      video.srcObject = ev.streams[0] || new MediaStream([ev.track])
      setStatus('playing')
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        pc.close()
        if (!cleanup) setTimeout(connect, 3000)
      }
    }

    // go2rtc needs a recvonly transceiver before creating the offer
    pc.addTransceiver('video', { direction: 'recvonly' })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const res = await fetch(`/api/webrtc?src=goose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: offer.sdp,
    })

    const answerSdp = await res.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
  }

  connect().catch(() => {
    if (!cleanup) setTimeout(() => connect().catch(() => {}), 3000)
  })

  return () => {
    cleanup = true
    if (pc) pc.close()
  }
}

export default function StreamViewer() {
  const videoRef = useRef(null)
  const [status, setStatus] = useState(isDev ? 'dev' : 'connecting')

  useEffect(() => {
    if (isDev) return

    const video = videoRef.current
    if (canMSE) {
      return connectMSE(video, setStatus)
    } else {
      return connectWebRTC(video, setStatus)
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
