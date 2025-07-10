// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// A friendly, concise system prompt
const systemPrompt = `
You are CalmBot, a friendly, empathetic anxiety-relief assistant.  
• Keep replies concise (1–3 sentences).  
• Don’t repeat the same exercise twice.  
• If the user says “yes” or “keep going,” move to a new technique (breathing, grounding, muscle relaxation, etc.).  
• Use “we” and “you” to build rapport.  
Always be supportive and actionable.
`.trim()

export async function POST(req: Request) {
  try {
    const { message, history } = (await req.json()) as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'o4-mini-high',
      messages,
    })

    return NextResponse.json({
      reply: completion.choices[0].message.content,
    })
  } catch (err: unknown) {
    // Safely log errors of unknown type
    if (err instanceof Error) {
      console.error('⚠️ /api/chat error:', err.message)
    } else {
      console.error('⚠️ /api/chat error:', err)
    }
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
