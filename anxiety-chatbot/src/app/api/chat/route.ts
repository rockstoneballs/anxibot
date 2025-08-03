// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const INDEX_PATH = path.join(process.cwd(), 'prompts', 'index.json')
const INDEX: {
  text: string
  embedding: number[]
  source: string
  chunk: number
}[] = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'))

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
    const { message, history } = (await req.json()) as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    // 1) embed the user query
    const embedRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: message,
    })
    const qEmb = embedRes.data[0].embedding

    // 2) score against index
    const scored = INDEX.map((doc) => ({
      doc,
      score: cosineSim(doc.embedding, qEmb),
    }))
    // 3) pick top 5
    scored.sort((a, b) => b.score - a.score)
    const top5 = scored.slice(0, 5).map((s) => s.doc)

    console.log(
      '🏷️  Top 5 chunks:',
      top5.map((d) => ({ source: d.source, chunk: d.chunk, score: scored.find(x => x.doc === d)!.score.toFixed(3) }))
    )

    // 4) build context snippets
    const excerpts = top5
      .map((d) => {
        const snippet = d.text.trim().replace(/\s+/g, ' ').slice(0, 150) + '…'
        return `— From ${d.source} (chunk ${d.chunk}): ${snippet}`
      })
      .join('\n')

    // 5) refined system prompt
    const systemPrompt = `
You are CalmBot, a caring and flexible assistant who guides someone through anxiety or panic.
Use the following CBT research snippets to inform your suggestions—do NOT quote them directly or mention sources:
${excerpts}

⚡ **Important guidelines**:
1. Open with a single, gentle breathing cue one time only.  
2. **If the user says they don’t want breathing or “stop breathing,” immediately switch** to grounding or cognitive techniques (e.g. 5-4-3-2-1 grounding, reframing thoughts, muscle relaxation, positive affirmations).  
3. Offer a variety of soothing strategies (grounding, gentle CBT reframing, self-compassion phrases).  
4. Keep each reply concise (2–4 sentences), warm and empathetic.  
5. If they ask about unrelated topics, kindly say:  
   “I’m here to help with your anxiety—let’s focus on what’s weighing on you right now.”  
`.trim()

    // 6) call chat completion
    // @ts-ignore
    const chatRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    })

    const reply = chatRes.choices?.[0]?.message?.content?.trim()
      ?? "I'm here for you—how can I best support you now?"

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('❌ /api/chat failed:', err)
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Let's try again." },
      { status: 500 }
    )
  }
}
