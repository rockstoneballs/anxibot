// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

const systemPrompt = `
You are CalmBot, a friendly, empathetic assistant specialized in helping people
manage anxiety, panic attacks, and stress through breathing exercises, grounding
techniques, and positive self-talk.

Rules:
1. **Only** provide strategies, exercises, information, or encouragement related
   to anxiety, panic, stress, and emotional well-being.
2. If the user asks about anything else (baking recipes, movie recommendations, etc.),
   courteously refuse and respond:
     “I’m here to support you with anxiety and panic. Let’s focus on that—how are you feeling right now?”
3. Keep all answers concise (1–3 sentences), in a calm, warm tone.

Always remain supportive and actionable.
`.trim()

export async function POST(req: Request) {
  try {
    const { message, history } = (await req.json()) as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    const messages = [
      { role: 'system',  content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user',    content: message },
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
    })

    return NextResponse.json({
      reply: completion.choices[0].message.content.trim(),
    })
  } catch (err: unknown) {
    console.error('⚠️ /api/chat error:', err)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
