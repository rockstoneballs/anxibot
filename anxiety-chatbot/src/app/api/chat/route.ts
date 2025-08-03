// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'

// 1) Load your precomputed RAG index
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

// 2) Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// 3) Cosine-similarity helper
function cosine(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// 4) Your base system prompt
const BASE_PROMPT = `
You are CalmBot, an empathetic assistant trained on peer-reviewed CBT research.
Only provide anxiety-relief advice; if asked about anything else respond:
"I'm here to support you with anxiety—how can I help?"
Keep answers short (1–3 sentences), warm, and actionable.
`.trim()

export async function POST(req: Request) {
  try {
    const { message, history } = (await req.json()) as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    // 5.1) Embed the user’s message
    const embedRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    })
    const qEmbedding = embedRes.data[0].embedding

    // 5.2) Score and sort your index
    const scored = INDEX
      .map((entry) => ({
        ...entry,
        score: cosine(qEmbedding, entry.embedding),
      }))
      .sort((a, b) => b.score - a.score)

    // 5.3) Take the top 5
    const top5 = scored.slice(0, 5)

    // ───── Debug log ─────────────────────────────────────────────
    console.log(
      '🏷️  Top 5 chunks for query:',
      top5.map((c) => ({
        source: c.source,
        chunk: c.chunk,
        score: c.score.toFixed(3),
      }))
    )
    // ───────────────────────────────────────────────────────────────

    // 5.4) Build the dynamic system prompt
    const systemPrompt = [
      BASE_PROMPT,
      'Reference excerpts from CBT research:',
      ...top5.map(
        (c) => `---\n[${c.source} – chunk ${c.chunk}]\n${c.text}`
      ),
    ].join('\n\n')

    // 5.5) Call the Chat Completion endpoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system',  content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user',    content: message },
      ] as any,
    })

    // 5.6) Null-safe extraction of the reply
    const firstChoice = chatRes.choices?.[0]
    const content     = firstChoice?.message?.content
    const reply       = content ? content.trim() : 'Sorry, something went wrong.'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('❌ /api/chat error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
