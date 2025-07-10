// src/app/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [history, setHistory] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  // auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  async function send() {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setHistory((h) => [...h, userMsg])
    setInput('')

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMsg.content, history }),
      headers: { 'Content-Type': 'application/json' },
    })
    const { reply } = await res.json()
    setHistory((h) => [...h, { role: 'assistant', content: reply }])
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
        <div className="max-w-xl mx-auto space-y-3">
          {history.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
                m.role === 'user'
                  ? 'bg-blue-200 self-end text-blue-900'
                  : 'bg-white shadow text-gray-800'
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </section>

      {/* Input bar */}
      <footer className="flex-none bg-white p-4 shadow-inner">
        <div className="max-w-xl mx-auto flex gap-2">
          <input
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
