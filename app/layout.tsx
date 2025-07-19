import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PlantVillageVQA - Expert Validation',
  description: 'Created by Syed Nazmus Sakib',
  generator: 'sns.sakib',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
