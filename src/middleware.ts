import { NextResponse, NextRequest } from 'next/server'

// Allow local dev origins
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3007',
]

function getAllowedOrigins() {
  const fromEnv = process.env.ALLOWED_ORIGINS
  if (fromEnv) {
    return fromEnv.split(',').map(o => o.trim()).filter(Boolean)
  }
  return DEFAULT_ORIGINS
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = getAllowedOrigins()
  const isAllowed = allowedOrigins.includes(origin)

  // Build base response (cover all routes so redirects carry CORS)
  const response = request.method === 'OPTIONS'
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next()

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

  return response
}

export const config = {
  matcher: '/:path*',
}
