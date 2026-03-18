import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zoho Mail',
  description: 'Real-time Zoho Mail viewer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 h-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  )
}
