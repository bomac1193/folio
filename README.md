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
