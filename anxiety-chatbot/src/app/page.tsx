// src/app/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Typewriter } from '../../components/typewrite.tsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [history, setHistory] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  // auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  async function send() {
    if (!input.trim()) return
    const userMsg: Message = { role: 'user', content: input }
    setHistory((h) => [...h, userMsg])
    setInput('')

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg.content, history }),
    })
    const { reply } = await res.json()
    const botMsg: Message = { role: 'assistant', content: reply }
    setHistory((h) => [...h, botMsg])
  }

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="flex-none p-4 bg-white shadow">
        <h1 className="text-xl sm:text-2xl font-bold text-center">🧘 CalmBot</h1>
        <p className="text-center text-gray-600">Your friendly assistant for anxiety relief</p>
      </header>

      {/* Messages area */}
      <section className="flex-grow overflow-y-auto px-4 sm:px-8 py-4">
        <div className="max-w-xl mx-auto space-y-3 flex flex-col">
          {history.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
                m.role === 'user'
                  ? 'bg-blue-200 self-end text-blue-900'
                  : 'bg-white shadow text-gray-800'
              }`}
            >
              {m.role === 'assistant' ? (
                <Typewriter text={m.content} speed={30} />
              ) : (
                m.content
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </section>

      {/* Input bar */}
      <footer className="flex-none bg-white p-4 shadow-inner">
        <div className="max-w-xl mx-auto flex gap-2">
          <input
            type="text"
            className="flex-grow border rounded-md px-3 py-2 focus:outline-none focus:ring focus:border-blue-300 text-black"
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            onClick={send}
          >
            Send
          </button>
        </div>
      </footer>
    </main>
  )
}
