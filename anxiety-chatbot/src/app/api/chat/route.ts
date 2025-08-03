// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

/** Pre-load your embeddings index once at startup */
const INDEX_PATH = path.join(process.cwd(), 'prompts', 'index.json')
const raw = fs.readFileSync(INDEX_PATH, 'utf-8')
type Doc = { text: string; embedding: number[]; source: string; chunk: number }
const INDEX: Doc[] = JSON.parse(raw)

/** Simple cosine similarity */
function cosineSim(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8)
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json() as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    // 1. Embed the user’s query
    const embedRes = await openai.embeddings.create({
      model: 'gpt-4o-mini',
      input: message,
    })
    const qEmb = embedRes.data[0].embedding

    // 2. Score against all docs
    const scored = INDEX.map((doc) => ({
      doc,
      score: cosineSim(doc.embedding, qEmb),
    }))

    // 3. Pick top 5
    scored.sort((a, b) => b.score - a.score)
    const top5 = scored.slice(0, 5).map((s) => s.doc)

    // 4. Build system prompt
    const excerpts = top5
      .map(
        (d) =>
          `From ${d.source} (chunk ${d.chunk}):\n${d.text.trim().replace(/\s+/g, ' ')}`
      )
      .join('\n\n---\n\n')

    const systemPrompt = `
You are CalmBot, a gentle, conversational assistant guiding people through moments of anxiety or panic. 
Use the following CBT research excerpts to inform your supportive instructions—do NOT quote them verbatim or mention sources:
${excerpts}

When replying:
- Keep your tone warm, empathetic, and brief.
- Focus only on anxiety relief techniques.
- If the user asks about unrelated topics, gently steer the conversation back to their feelings and breathing.
`

    // 5. Query OpenAI (silence TS overload error)
    // @ts-ignore
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        // preserve history
        ...history.map((h) => ({ role: h.role, content: h.content })),
        // current user turn
        { role: 'user', content: message },
      ],
    })

    // 6. Extract reply (safe-guard null)
    const choice = chatRes.choices?.[0]?.message
    const reply = choice?.content?.trim() ?? "I'm here for you—let me know how I can help."

    return NextResponse.json({ reply })
  } catch (err: unknown) {
    console.error('❌ /api/chat error:', err)
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Let's try again." },
      { status: 500 }
    )
  }
}
