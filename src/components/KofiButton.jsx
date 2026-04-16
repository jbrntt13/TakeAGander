import { useEffect } from 'react'

export default function KofiButton() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'
    script.async = true
    script.onload = () => {
      if (window.kofiWidgetOverlay) {
        window.kofiWidgetOverlay.draw('jackburnett', {
          type: 'floating-chat',
          'floating-chat.donateButton.text': 'Support me',
          'floating-chat.donateButton.background-color': '#FF8C42',
          'floating-chat.donateButton.text-color': '#fff',
        })
      }
    }
    document.body.appendChild(script)

    return () => {
      script.remove()
      document.querySelector('.floatingchat-container-wrap')?.remove()
    }
  }, [])

  return null
}
