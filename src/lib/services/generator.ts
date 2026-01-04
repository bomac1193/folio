import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import type { GeneratedVariant, Platform } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const GENERATION_PROMPT = `You are an expert content strategist who creates high-performing titles and hooks that match a creator's unique aesthetic.

USER'S TASTE PROFILE:
Performance Patterns (what goes viral for them):
{performancePatterns}

Aesthetic Patterns (what they aesthetically prefer):
{aestheticPatterns}

Voice Signature (how they write):
{voiceSignature}

TASK:
Generate {count} title variants for:
Platform: {platform}
Topic: {topic}
{referenceItems}

Each variant must:
1. Leverage proven performance patterns from their collection
2. Match their aesthetic signature
3. Feel authentic to their voice

Return a JSON array with exactly {count} objects:
[
  {
    "text": "the generated title",
    "performanceRationale": "brief explanation of why this will perform well",
    "tasteRationale": "brief explanation of how this matches their taste",
    "performanceScore": 0-100,
    "tasteScore": 0-100
  }
]

Return ONLY the JSON array, no additional text.`

export async function generateVariants(
  userId: string,
  topic: string,
  platform: Platform,
  count: number = 10,
  referenceItemIds?: string[]
): Promise<GeneratedVariant[]> {
  // Get user's taste profile
  const tasteProfile = await prisma.tasteProfile.findUnique({
    where: { userId },
  })

  // Get reference items if specified
  let referenceItemsText = ''
  if (referenceItemIds && referenceItemIds.length > 0) {
    const items = await prisma.collection.findMany({
      where: {
        id: { in: referenceItemIds },
        userId,
      },
    })
    if (items.length > 0) {
      referenceItemsText = `\nReference items from their collection:\n${items
        .map((i) => `- "${i.title}"`)
        .join('\n')}`
    }
  }

  // Build prompt
  const prompt = GENERATION_PROMPT
    .replace('{performancePatterns}', tasteProfile?.performancePatterns || 'No data yet - use general best practices')
    .replace('{aestheticPatterns}', tasteProfile?.aestheticPatterns || 'No data yet - use general quality standards')
    .replace('{voiceSignature}', tasteProfile?.voiceSignature || 'No data yet - use clear, direct language')
    .replace('{count}', count.toString())
    .replace('{platform}', platform)
    .replace('{topic}', topic)
    .replace('{referenceItems}', referenceItemsText)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const variants = JSON.parse(responseText) as GeneratedVariant[]

    // Save generated variants to database
    for (const variant of variants) {
      await prisma.generatedVariant.create({
        data: {
          userId,
          prompt: topic,
          variant: variant.text,
          performanceScore: variant.performanceScore,
          tasteScore: variant.tasteScore,
          platform,
        },
      })
    }

    return variants
  } catch {
    // Return empty array if parsing fails
    return []
  }
}
