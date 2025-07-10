// src/app/page.tsx
'use client'

import { useState } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ChatMessage = {
  role: 'user' | 'bot'
  text: string
}

export default function Home() {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

  const sendMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed) return

    // 1) Add the new user message to history
    const userMsg = { role: 'user' as const, text: trimmed }
    setChatHistory((h) => [...h, userMsg])
    setMessage('')

    // 2) Build the payload including the full conversation so far
    const historyPayload = [...chatHistory, userMsg].map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    try {
      // 3) Send both the new message and the history
      const { data } = await axios.post('/api/chat', {
        message: trimmed,
        history: historyPayload,
      })

      // 4) Add the bot's reply to the chat
      const botMsg = { role: 'bot' as const, text: data.reply }
      setChatHistory((h) => [...h, botMsg])
    } catch (err) {
      console.error(err)
      const errMsg = {
        role: 'bot' as const,
        text: 'Oops—something went wrong. Please try again.',
      }
      setChatHistory((h) => [...h, errMsg])
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      {/* Header */}
      <header className="w-full max-w-xl mb-4 py-4 text-center bg-white rounded-t-2xl shadow">
        <h1 className="text-2xl font-semibold text-gray-800">🧘 CalmBot</h1>
        <p className="text-gray-600">Your friendly assistant for anxiety relief</p>
      </header>

      {/* Chat window */}
      <div className="w-full max-w-xl flex-1 bg-white rounded-b-2xl shadow-inner overflow-y-auto p-6 space-y-3">
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`
              max-w-[80%] p-3 rounded-lg shadow-sm
              ${msg.role === 'user'
                ? 'ml-auto bg-blue-100 text-blue-900'
                : 'mr-auto bg-gray-100 text-gray-900'}
            `}
          >
            {msg.role === 'bot' ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.text}
              </ReactMarkdown>
            ) : (
              <span>{msg.text}</span>
            )}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="w-full max-w-xl mt-4 flex items-center gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Type your message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage()
          }}
          autoFocus
        />
        <button
          onClick={sendMessage}
          disabled={!message.trim()}
          className="bg-blue-600 disabled:bg-blue-300 text-white font-medium px-6 py-2 rounded-lg transition-opacity"
        >
          Send
        </button>
      </div>
    </main>
  )
}
