// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

// 1. Load the precomputed RAG index
const INDEX_PATH = path.resolve(process.cwd(), 'prompts/index.json')
const indexJson = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8')) as {
  source: string
  chunk: number
  score: string
}[]

// 2. Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: Request) {
  const { message, history } = await req.json() as {
    message: string
    history: { role: string; content: string }[]
  }

  // 3. Pick top-5 RAG passages
  const topChunks = indexJson.slice(0, 5)
    .map((c, i) => `【${i+1}】 From "${c.source}", chunk #${c.chunk} (score ${c.score}):\n…`)
    .join('\n')

  // 4. Build a dynamic system prompt
  const systemPrompt = `
You are CalmBot, an empathetic assistant trained on peer-reviewed CBT research.
Use only the information in the following extracted passages to answer questions
about anxiety relief and coping techniques. Cite each passage by its number.

${topChunks}

If the user asks something outside anxiety management (e.g. recipes, sports),
politely redirect back: “I’m here to support your anxiety—how can I help you feel
calmer right now?” and ask a question to clarify their current emotional state.
Keep your tone warm and conversational; avoid long clinical monologues.
  `.trim()

  // 5. Query OpenAI
  const chatRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ]
  })

  // 6. Safely extract reply
  const choice = chatRes.choices?.[0]
  const reply = choice?.message?.content?.trim() ?? 
    "I'm here to support you—how can I help right now?"

  return NextResponse.json({ reply })
}
