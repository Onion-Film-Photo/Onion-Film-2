import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Onion — Every Event Has Layers',
  description: 'Onion assigns every guest a role before your event begins. No moment goes undocumented.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
