'use client'

import { useState, useEffect } from 'react'

interface TypewriterProps {
  text: string
  /** Delay (ms) between each character. Lower = faster. */
  speed?: number
}

export function Typewriter({ text, speed = 20 }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    let idx = 0
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, idx + 1))
      idx++
      if (idx >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])

  return <span>{displayed}</span>
}
