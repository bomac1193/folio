import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// POST - Translate text to target language
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text, targetLanguage, sourceLanguage } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 })
    }

    // Use Claude to translate
    const prompt = sourceLanguage
      ? `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text, nothing else.

Text: "${text}"`
      : `Translate the following text to ${targetLanguage}. Detect the source language automatically. Only return the translated text, nothing else.

Text: "${text}"`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const translatedText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : ''

    return NextResponse.json({
      original: text,
      translated: translatedText,
      targetLanguage,
    })
  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}

// Batch translate multiple texts
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { texts, targetLanguage } = await request.json()

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'Texts array is required' }, { status: 400 })
    }

    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 })
    }

    // Batch translate using a single API call for efficiency
    const prompt = `Translate each of the following texts to ${targetLanguage}. Return a JSON array with the translations in the same order. Only return the JSON array, nothing else.

Texts to translate:
${texts.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}

Return format: ["translated text 1", "translated text 2", ...]`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : '[]'

    try {
      const translations = JSON.parse(responseText)
      return NextResponse.json({
        translations,
        targetLanguage,
      })
    } catch {
      return NextResponse.json({ error: 'Failed to parse translations' }, { status: 500 })
    }
  } catch (error) {
    console.error('Batch translation error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
