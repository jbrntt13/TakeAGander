import { useMemo } from 'react'
import gooseSvg from '../assets/goose.svg'

function supportsGooseEmoji() {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 40
    canvas.height = 20
    const ctx = canvas.getContext('2d')
    ctx.font = '16px sans-serif'
    ctx.fillText('🪿', 0, 16)
    ctx.fillText('\uFFFF', 20, 16)
    const gooseData = ctx.getImageData(0, 0, 20, 20).data
    const invalidData = ctx.getImageData(20, 0, 20, 20).data
    return gooseData.toString() !== invalidData.toString()
  } catch {
    return false
  }
}

export default function GooseEmoji({ className }) {
  const supported = useMemo(() => supportsGooseEmoji(), [])

  if (supported) {
    return <span className={className}>🪿</span>
  }

  return (
    <img
      src={gooseSvg}
      alt="goose"
      className={className}
      style={{ display: 'inline-block', height: '1em', verticalAlign: '-0.1em' }}
    />
  )
}
