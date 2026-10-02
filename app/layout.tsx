import type { Metadata } from "next"
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google"
import "./globals.css"

const sans = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Facily and Services School",
    template: "%s · Facily and Services School",
  },
  description: "Des vidéos courtes pour le personnel.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  )
}
