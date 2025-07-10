// src/app/api/chat/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// A short, conversational system prompt
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
    const { message, history } = await req.json() as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    // Build the OpenAI message array:
    const messages = [
      { role: 'system', content: systemPrompt },
      // replay the prior conversation so the model knows what’s already been said
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      // finally, the new user input
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    })

    return NextResponse.json({
      reply: completion.choices[0].message.content,
    })
  } catch (err: any) {
    console.error('⚠️ /api/chat error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
