// src/components/Typewriter.tsx
'use client'
import { useState, useEffect } from 'react'

interface TypewriterProps {
  text: string
  speed?: number
}

export function Typewriter({ text, speed = 30 }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    let idx = 0
    const iv = setInterval(() => {
      setDisplayed((prev) => prev + text[idx])
      idx++
      if (idx >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])

  return <span>{displayed}</span>
}
