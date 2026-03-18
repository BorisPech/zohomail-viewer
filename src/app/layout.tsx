import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Zoho Mail',
  description: 'Real-time Zoho Mail viewer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-sans bg-zinc-950 text-zinc-100 h-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  )
}
