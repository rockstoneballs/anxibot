'use client'

import { useState, useEffect } from 'react'

interface TypewriterProps {
  text: string
  speed?: number // ms per character
}

export function Typewriter({ text, speed = 30 }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')       // reset on each new text
    let i = 0
    const iv = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(i))
      i++
      if (i >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])

  return <>{displayed}</>
}
