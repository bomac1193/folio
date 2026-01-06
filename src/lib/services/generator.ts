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

const RANDOMIZE_PROMPT = `You are an expert content strategist who creates original, high-performing content hooks.

USER'S TASTE PROFILE:
Performance Patterns (what goes viral for them):
{performancePatterns}

Aesthetic Patterns (what they aesthetically prefer):
{aestheticPatterns}

Voice Signature (how they write):
{voiceSignature}

REFERENCE ITEMS FROM THEIR COLLECTION:
{referenceItems}

TASK:
Analyze the reference items and taste profile above. Generate {count} COMPLETELY NEW and ORIGINAL hook/title ideas for {platform}.

These should NOT be rewrites of the reference items. Instead:
1. Identify the underlying themes, patterns, and angles that make these references compelling
2. Synthesize new ideas that combine different elements in fresh ways
3. Generate hooks that the user hasn't thought of yet but would align with their taste
4. Be creative and unexpected while staying true to their aesthetic

The hooks should:
- Feel like they came from the same creative mind as the references
- Have viral potential based on their performance patterns
- Cover different angles/approaches (don't repeat the same formula)
- Be specific and immediately compelling

Return a JSON array with exactly {count} objects:
[
  {
    "text": "the generated hook/title",
    "performanceRationale": "why this will perform well based on their patterns",
    "tasteRationale": "how this synthesizes elements from their taste profile",
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

// Randomize mode - generate new hooks based on references and taste profile
export async function randomizeHooks(
  userId: string,
  platform: Platform,
  count: number = 10,
  referenceItemIds?: string[]
): Promise<GeneratedVariant[]> {
  // Get user's taste profile
  const tasteProfile = await prisma.tasteProfile.findUnique({
    where: { userId },
  })

  // Get reference items - if none specified, get recent items from collection
  let referenceItems: { title: string; platform: string }[] = []

  if (referenceItemIds && referenceItemIds.length > 0) {
    const items = await prisma.collection.findMany({
      where: {
        id: { in: referenceItemIds },
        userId,
      },
      select: { title: true, platform: true },
    })
    referenceItems = items
  } else {
    // Get recent items as default references
    const items = await prisma.collection.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      take: 10,
      select: { title: true, platform: true },
    })
    referenceItems = items
  }

  if (referenceItems.length === 0) {
    throw new Error('No reference items available. Save some content to your collection first.')
  }

  const referenceItemsText = referenceItems
    .map((i) => `- "${i.title}" (${i.platform})`)
    .join('\n')

  // Build prompt
  const prompt = RANDOMIZE_PROMPT
    .replace('{performancePatterns}', tasteProfile?.performancePatterns || 'No data yet - infer from references')
    .replace('{aestheticPatterns}', tasteProfile?.aestheticPatterns || 'No data yet - infer from references')
    .replace('{voiceSignature}', tasteProfile?.voiceSignature || 'No data yet - infer from references')
    .replace('{count}', count.toString())
    .replace('{platform}', platform)
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
          prompt: '[RANDOMIZE]',
          variant: variant.text,
          performanceScore: variant.performanceScore,
          tasteScore: variant.tasteScore,
          platform,
        },
      })
    }

    return variants
  } catch {
    return []
  }
}
