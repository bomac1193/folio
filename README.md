# FOLIO - Creative Intelligence Platform

A platform for saving, analyzing, and learning from high-performing content across social platforms. Treats taste as a trainable, compounding creative asset.

## Quick Start

```bash
npm install
npx prisma db push
npm run dev
# Open http://localhost:3000
```

## Environment Variables (.env)

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="your-key"
YOUTUBE_API_KEY="your-key"  # For real metrics
```

---

## Architecture Overview

```
folio/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Protected pages
│   │   │   ├── dashboard/     # Main collection view
│   │   │   ├── taste-profile/ # Aggregated taste patterns
│   │   │   ├── generate/      # AI content generation
│   │   │   └── save/          # Save from extension
│   │   └── api/               # API routes
│   │       ├── auth/          # NextAuth endpoints
│   │       ├── collections/   # CRUD + metrics refresh
│   │       ├── analyze/       # AI analysis
│   │       └── generate/      # AI generation
│   ├── components/            # React components
│   ├── lib/
│   │   ├── auth.ts           # NextAuth config
│   │   ├── db.ts             # Prisma client
│   │   ├── types.ts          # TypeScript types
│   │   └── services/
│   │       ├── aiAnalysis.ts # Claude AI analysis
│   │       ├── generator.ts  # Content generation
│   │       └── youtubeApi.ts # YouTube Data API
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js            # Hover overlay + extraction
│   ├── popup.html/js         # Extension popup
│   └── background.js         # Service worker
└── prisma/
    └── schema.prisma         # Database schema
```

---

## Key Features

### Implemented

| Feature | Location | Description |
|---------|----------|-------------|
| **Auth** | `src/lib/auth.ts` | NextAuth with credentials provider |
| **Collection CRUD** | `src/app/api/collections/` | Save, list, filter by platform |
| **Chrome Extension** | `extension/` | Hover overlay for quick save on YT/TikTok |
| **YouTube Metrics** | `src/lib/services/youtubeApi.ts` | Real views, likes, viral velocity via API |
| **Batch Refresh** | `api/collections/refresh-metrics/` | Fast parallel metric updates |
| **Platform Filtering** | `src/components/CollectionFilters.tsx` | Filter by YouTube, TikTok, etc. |
| **TikTok Detection** | `extension/content.js` | Real-time video detection on For You page |
| **Hover Save** | `extension/content.js` | Hover over video → FOLIO button appears |

### Pending

| Feature | Priority | Notes |
|---------|----------|-------|
| **Video Content Analysis** | High | Analyze actual video (visuals, audio, pacing) not just title |
| **Scoring Algorithm v2** | High | Combine real metrics + AI analysis for accurate scores |
| **TikTok API** | Medium | TikTok Research API for real metrics (limited access) |
| **Taste Profile v2** | Medium | Better pattern aggregation from saved content |
| **Auto Re-check** | Low | Scheduled job to re-check metrics after 7 days |

---

## Database Schema (Prisma)

Key fields in `Collection` model:

```
id, userId, title, url, videoId, platform, thumbnail

# Metrics (from API or extension)
views, likes, comments, engagement

# Tracking over time
initialViews, growthRate, viewsPerDay, viralVelocity (0-100)

# AI Analysis (JSON strings)
performanceDNA  - hooks, structure, keywords
aestheticDNA    - tone, voice, style
videoAnalysis   - visual/audio analysis (TODO)
```

---

## Chrome Extension

### How It Works

1. **Hover Overlay**: When user hovers over video, "FOLIO Save" button appears
2. **Click to Expand**: Shows thumbnail, title, platform, views
3. **One-Click Save**: Saves directly to collection via API
4. **TikTok Real-time**: Detects current video as user scrolls For You page

### Key Files

- `content.js`: Main logic - hover overlay, extraction, TikTok observer
- `popup.js`: Extension popup with polling for TikTok updates
- `manifest.json`: Permissions for YouTube, TikTok, Instagram, Twitter

### To Test Extension

1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" → select `extension/` folder
4. Refresh target site (YouTube/TikTok)

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/collections` | GET | List user's collections (supports `?platform=` filter) |
| `/api/collections` | POST | Save new collection item |
| `/api/collections/refresh-metrics` | POST | Batch refresh YouTube metrics (fast) |
| `/api/collections/rescan` | POST | Rescan thumbnails |
| `/api/analyze` | POST | AI analyze a collection item |
| `/api/generate` | POST | Generate content variants |
| `/api/taste-profile` | GET | Get user's taste profile |

---

## Scoring System

### Current (v1)

| Score | Source | Reliability |
|-------|--------|-------------|
| **Viral Velocity** | YouTube API | Real data - views/day relative to channel size |
| **Performance** | Claude AI | Prediction based on title analysis only |
| **Taste** | Claude AI | Subjective aesthetic scoring |

### Planned (v2)

- Combine real metrics (views, engagement, growth) with AI analysis
- Track performance over time (save → check after 7 days)
- Analyze actual video content, not just title

---

## Common Tasks

### Add New Platform Support

1. Update `PLATFORMS` in `src/lib/types.ts`
2. Add extraction logic in `extension/content.js`
3. Add API integration if available (like YouTube)
4. Update `next.config.ts` for image hostnames

### Modify AI Analysis

Edit `src/lib/services/aiAnalysis.ts` - the `ANALYSIS_PROMPT` defines what Claude extracts.

### Change Scoring Algorithm

Edit `src/lib/services/youtubeApi.ts` for viral velocity calculation, or `aiAnalysis.ts` for AI scores.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite + Prisma
- **Auth**: NextAuth.js (credentials)
- **AI**: Anthropic Claude API
- **APIs**: YouTube Data API v3
- **Extension**: Chrome Manifest V3

---

## Development Notes

- Extension saves directly to `localhost:3000` - user must be logged in
- YouTube API has quota limits (10,000 units/day default)
- TikTok/Instagram/Twitter don't have public APIs for metrics
- SQLite is fine for dev, consider PostgreSQL for production
- When modifying `next.config.ts`, restart dev server for changes to apply

---

## Next Steps: Revolutionary Features Roadmap

### Phase 1: Deep Diagnosis Engine

The core problem FOLIO solves: **Creators don't know WHY their content works or fails.** Analytics show what happened, not why.

| Feature | Impact | Description |
|---------|--------|-------------|
| **Performance Autopsy** | Critical | When a video underperforms, automatically diagnose: Was it the hook? Thumbnail? Timing? Topic mismatch with audience? Compare against your top performers to identify the gap. |
| **Taste Drift Detection** | High | Alert when your recent saves diverge from your established taste profile. "Your last 10 saves are 40% more educational than your usual style - intentional pivot or drift?" |
| **Hook Effectiveness Scoring** | High | Analyze first 3 seconds of saved videos. Build a database of hook patterns that work for YOUR audience based on your top performers. |
| **Audience Resonance Map** | High | Cluster your content by topic/tone and show which clusters get highest engagement. Reveal blind spots - topics you never cover that align with your taste. |

### Phase 2: Predictive Intelligence

Move from reactive analysis to proactive guidance.

| Feature | Impact | Description |
|---------|--------|-------------|
| **Pre-Publish Score** | Critical | Before posting, paste your script/title → get predicted performance score based on your historical patterns. "This hook style has 73% success rate for you." |
| **Optimal Timing Engine** | High | Analyze when your saved viral content was posted. Cross-reference with your own posting history to find YOUR optimal windows. |
| **Trend Velocity Tracker** | High | Monitor rising topics in your niche before they peak. "This sound/topic is at 23% of peak - ideal entry window." |
| **Fatigue Detector** | Medium | "You've posted 4 videos on this topic in 2 weeks. Historical data shows engagement drops 34% after 3 consecutive same-topic posts." |

### Phase 3: Competitive Intelligence

Understand the landscape, not just your own content.

| Feature | Impact | Description |
|---------|--------|-------------|
| **Creator Taste Fingerprint** | High | Save competitors' content → FOLIO builds their taste profile. See exactly what patterns they use that you don't. |
| **Gap Analysis** | High | "Creator X covers these 5 topics you never touch but align with your taste. Opportunity?" |
| **Style Transfer Generator** | Medium | "Generate a hook in YOUR voice but using the structure that works for Creator X." |
| **Niche Heat Map** | Medium | Visualize which sub-niches are oversaturated vs. underserved based on your saved content landscape. |

### Phase 4: Content Generation 2.0

Generate content that's actually YOU, not generic AI slop.

| Feature | Impact | Description |
|---------|--------|-------------|
| **Voice Clone from Collection** | Critical | Train generation on YOUR saved content + YOUR top performers. Output should be indistinguishable from your natural style. |
| **A/B Hook Generator** | High | Generate 5 hook variations for any topic, each using a different proven pattern from your collection. Test which resonates. |
| **Script Scaffolding** | High | Given a topic, generate full script structure based on your highest-performing content patterns (intro length, CTA placement, outro style). |
| **Thumbnail Concept Generator** | Medium | Based on your saved thumbnails, generate concepts that match your proven visual taste + platform best practices. |

### Phase 5: The Compound Effect

Turn taste into a self-improving asset.

| Feature | Impact | Description |
|---------|--------|-------------|
| **Performance Feedback Loop** | Critical | After posting, track actual performance → automatically refine your taste profile. What you THINK works vs. what ACTUALLY works. |
| **Taste Confidence Score** | High | Show how reliable your taste profile is. "Based on 847 saves and 52 training ratings, your taste profile has 89% predictive accuracy." |
| **Weekly Taste Report** | Medium | "This week: You saved 12 items. 8 matched your profile, 4 were explorations. 2 explorations revealed new pattern preferences." |
| **Taste Evolution Timeline** | Medium | Visualize how your taste has evolved over months. See when you pivoted, what triggered it, and how it affected performance. |

### The Diagnosis Problem Solved

Traditional analytics tell you: "This video got 10K views."

FOLIO tells you:
- **WHY** it got 10K views (hook pattern, topic timing, tone alignment)
- **HOW** to replicate it (specific patterns that worked)
- **WHAT** to avoid (patterns that historically underperform for you)
- **WHEN** to post similar content (trend and fatigue awareness)
- **WHO** else succeeds with this style (competitive context)

This transforms content creation from guesswork to **pattern recognition at scale**.

---

## Technical Implementation Notes

### Profile Source Modes (Implemented)

The Taste Profile now supports three viewing modes:
- **Collection**: Patterns derived from your saved items only
- **Training**: Patterns derived from your training ratings only
- **All (Combined)**: Merged patterns from both sources

This separation allows creators to see:
1. What they naturally gravitate toward (Collection)
2. What they explicitly prefer when forced to choose (Training)
3. The full picture combining both signals (All)

### Pattern-Based Analysis (Implemented)

FOLIO can analyze content without API dependencies using keyword pattern matching:
- Sentiment detection (controversial, inspiring, educational, etc.)
- Format classification (interview, reaction, tutorial, etc.)
- Niche identification (music production, tech, fitness, etc.)
- Tone extraction (edgy, chill, confident, etc.)
- Hook pattern recognition (curiosity gap, controversy, transformation, etc.)
