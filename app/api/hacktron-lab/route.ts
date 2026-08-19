export const runtime = 'edge'

import { NextResponse } from 'next/server'

const LAB_ENABLED = process.env.ENABLE_HACKTRON_LAB === 'true'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function GET(req: Request) {
  if (!LAB_ENABLED) {
    return NextResponse.json({ error: 'Hacktron lab is disabled' }, { status: 404 })
  }

  const url = new URL(req.url)
  const name = url.searchParams.get('name') ?? 'guest'
  const redirectTo = url.searchParams.get('redirectTo')

  if (redirectTo) {
    // Only allow same-origin, relative-path redirects to prevent open redirects.
    let target: URL
    try {
      target = new URL(redirectTo, url.origin)
    } catch {
      return NextResponse.json({ error: 'Invalid redirect target' }, { status: 400 })
    }

    if (target.origin !== url.origin) {
      return NextResponse.json({ error: 'Invalid redirect target' }, { status: 400 })
    }

    return NextResponse.redirect(target)
  }

  const html = `
    <main>
      <h1>Hacktron automation lab</h1>
      <p>Hello, ${escapeHtml(name)}</p>
    </main>
  `

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}
