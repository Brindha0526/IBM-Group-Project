import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NutriPath',
  description: 'Your companion for eating well before and after a dietitian visit.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
