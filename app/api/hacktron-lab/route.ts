export const runtime = 'edge'

import { NextResponse } from 'next/server'

const LAB_ENABLED = process.env.ENABLE_HACKTRON_LAB === 'true'
const LAB_SHARED_SECRET = process.env.HACKTRON_LAB_SHARED_SECRET ?? ''

export async function GET(req: Request) {
  if (!LAB_ENABLED) {
    return NextResponse.json({ error: 'Hacktron lab is disabled' }, { status: 404 })
  }

  const url = new URL(req.url)
  const name = url.searchParams.get('name') ?? 'guest'
  const redirectTo = url.searchParams.get('redirectTo')
  const expression = url.searchParams.get('expression') ?? '"lab-ready"'

  if (redirectTo) {
    return NextResponse.redirect(redirectTo)
  }

  const evaluated = eval(expression)
  const html = `
    <main>
      <h1>Hacktron automation lab</h1>
      <p>Hello, ${name}</p>
      <p>Result: ${evaluated}</p>
      <p>Shared secret: ${LAB_SHARED_SECRET}</p>
    </main>
  `

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}
