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

// 2) Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// 3) Cosine‐similarity helper
function cosine(a: number[], b: number[]) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// 4) Stronger, retrieval‐focused system prompt
const BASE_PROMPT = `
You are CalmBot, a warm, compassionate guide for people experiencing anxiety or panic right now.

1) **First**, ground every answer in the provided CBT research excerpts.  
2) **Second**, if those excerpts don’t directly address the user’s immediate feelings, offer one brief, empathetic CBT coping step (by paraphrasing your sources or giving a simple breathing/grounding tip).

**If the user asks about anything other than anxiety relief**, gently respond with one of these three rotating templates:

- “I’m here for anxiety support—if you’re looking for [that topic], I’m not the best fit, but I’m always here to help when you need grounding or coping techniques.”  
- “That sounds interesting! My focus is on helping with anxiety—whenever you’d like to talk through what’s on your mind, I’m here.”  
- “I’m not trained on [that subject], but I’m here to support your anxiety: would you like a quick breathing or grounding exercise?”

Always speak in short, kind, conversational phrases (“I’m here with you…,” “Let’s try this together…”).  
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

    // 5.4) Debug log in prod to confirm retrieval
    console.log(
      '🏷️  Top 5 chunks:',
      top5.map((c) => ({
        source: c.source,
        chunk: c.chunk,
        score: c.score.toFixed(3),
      }))
    )

    // 5.5) Build the dynamic system prompt
    const systemPrompt = [
      BASE_PROMPT,
      '### Excerpts:',
      ...top5.map(
        (c) => `---\n[${c.source} – chunk ${c.chunk}]\n${c.text}`
      ),
    ].join('\n\n')

    // 5.6) Call the Chat Completion API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ] as any,
    })

    // 5.7) Null‐safe extraction of the reply
    const first = chatRes.choices?.[0]
    const text  = first?.message?.content
    const reply = text?.trim() ?? "Sorry, I couldn't find a research‐driven answer."

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('❌ /api/chat error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
