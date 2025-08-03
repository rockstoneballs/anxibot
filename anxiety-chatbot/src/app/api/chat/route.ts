// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'

// 1) Load index
const INDEX_PATH = path.join(process.cwd(), 'prompts', 'index.json')
type IndexEntry = { text: string; embedding: number[]; source: string; chunk: number }
const INDEX: IndexEntry[] = JSON.parse(
  fs.readFileSync(INDEX_PATH, 'utf-8')
)

// 2) OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// 3) Cosine‐similarity
function cosine(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// 4) Base prompt
const BASE_PROMPT = `
You are CalmBot, an empathetic assistant trained on peer-reviewed CBT research.
Only provide anxiety‐relief advice; if asked otherwise, reply:
"I'm here to support you with anxiety—how can I help?"
Keep answers short (1–3 sentences), warm, and actionable.
`.trim()

export async function POST(req: Request) {
  try {
    const { message, history } = (await req.json()) as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    // 5.1) Embed user query
    const { data: [ { embedding: qEmbedding } ] } =
      await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: message,
      })

    // 5.2) Score & sort
    const scored = INDEX
      .map((e) => ({ ...e, score: cosine(qEmbedding, e.embedding) }))
      .sort((a, b) => b.score - a.score)

    // 5.3) Top 5
    const top5 = scored.slice(0, 5)

    // 5.4) Build system prompt
    const systemPrompt = [
      BASE_PROMPT,
      'Reference excerpts:',
      ...top5.map(
        (c) => `---\n[${c.source} – chunk ${c.chunk}]\n${c.text}`
      ),
    ].join('\n\n')

    // 5.5) Chat completion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system',  content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user',    content: message },
      ] as any,
    })

    // 5.6) Null‐safe reply extraction
    const firstChoice = chatRes.choices?.[0]
    const content = firstChoice?.message?.content
    const reply = content ? content.trim() : 'Sorry, something went wrong.'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('❌ /api/chat error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
