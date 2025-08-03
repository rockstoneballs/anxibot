// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load your precomputed RAG index from prompts/index.json
// ─────────────────────────────────────────────────────────────────────────────
const INDEX_PATH = path.join(process.cwd(), 'prompts', 'index.json')
type IndexEntry = {
  text: string
  embedding: number[]
  source: string
  chunk: number
}
const INDEX: IndexEntry[] = JSON.parse(
  fs.readFileSync(INDEX_PATH, 'utf-8')
)

// ─────────────────────────────────────────────────────────────────────────────
// 2. Initialize your OpenAI client
// ─────────────────────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,  // ensure you have this defined
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cosine‐similarity helper
// ─────────────────────────────────────────────────────────────────────────────
function cosine(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. System‐level prompt for CalmBot
// ─────────────────────────────────────────────────────────────────────────────
const BASE_PROMPT = `
You are CalmBot, an empathetic assistant trained on peer-reviewed CBT research.
Only provide anxiety‐relief advice. If asked anything else, say:
"I'm here to support you with anxiety—how can I help?"

Keep answers short (1–3 sentences), warm, and actionable.
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { message, history } = (await req.json()) as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    // 5.1 Embed the incoming user query
    const embedRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    })
    const qEmbedding = embedRes.data[0].embedding

    // 5.2 Score each chunk, sort descending
    const scored = INDEX
      .map((entry) => ({
        ...entry,
        score: cosine(qEmbedding, entry.embedding),
      }))
      .sort((a, b) => b.score - a.score)

    // 5.3 Take top 5 most relevant chunks
    const top5 = scored.slice(0, 5)

    // 5.4 Build the dynamic system prompt
    const systemPrompt = [
      BASE_PROMPT,
      'Reference excerpts:',
      ...top5.map(
        (c) => `---\n[${c.source} – chunk ${c.chunk}]\n${c.text}`
      ),
    ].join('\n\n')

    // 5.5 Call the Chat Completion API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system',  content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user',    content: message },
      ] as any,
    })

    // 5.6 Return the assistant’s reply
    const reply = chatRes.choices[0].message.content.trim()
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('❌ /api/chat error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
