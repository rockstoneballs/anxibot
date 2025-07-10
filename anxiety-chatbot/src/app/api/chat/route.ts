// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const systemPrompt = `
You are CalmBot, a friendly, empathetic anxiety-relief assistant.
• Keep replies concise (1–3 sentences).
• Don’t repeat the same exercise twice.
• If the user says “yes” or “keep going,” move to a new technique.
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
    })

    return NextResponse.json({
      reply: completion.choices[0].message.content,
    })
  } catch (err: unknown) {
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
