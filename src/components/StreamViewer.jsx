import { useState } from 'react'
import GooseEmoji from './GooseEmoji'
import './StreamViewer.css'

const isDev = import.meta.env.DEV

export default function StreamViewer() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="stream-wrapper">
      {!loaded && !isDev && (
        <div className="stream-placeholder">
          <GooseEmoji className="loading-goose" />
          <p>Waiting for the goose...</p>
        </div>
      )}
      {isDev && (
        <div className="stream-placeholder">
          <GooseEmoji className="loading-goose" />
          <p>Stream unavailable in dev mode</p>
        </div>
      )}
      {!isDev && (
        <iframe
          src="/stream.html?src=goose_web"
          allow="autoplay"
          onLoad={() => setLoaded(true)}
          style={{ display: loaded ? 'block' : 'none', border: 'none' }}
        />
      )}
    </div>
  )
}
