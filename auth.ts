import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { TRIAL_EMAIL } from "@/lib/constants"
import { getUserByEmail, upsertUser } from "@/lib/db"

const googleOn = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

export const isGoogleReady = googleOn

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/",
    error: "/acces-refuse",
  },
  providers: [
    ...(googleOn
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : [
          Credentials({
            id: "essai",
            name: "Essai",
            credentials: {
              essai: { label: "Essai", type: "text" },
            },
            authorize() {
              const user = upsertUser({
                email: TRIAL_EMAIL,
                name: "Essai",
                image: null,
              })
              if (!user.active) return null
              return { id: user.id, email: user.email, name: user.name }
            },
          }),
        ]),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.trim().toLowerCase()
      if (!email) return false
      if (account?.provider === "google") {
        const domain = process.env.ALLOWED_GOOGLE_DOMAIN?.trim().toLowerCase()
        if (domain && email.split("@")[1] !== domain) return false
        const saved = upsertUser({
          email,
          name: user.name || email,
          image: user.image ?? null,
        })
        return saved.active
      }
      const saved = getUserByEmail(email)
      return Boolean(saved?.active)
    },
    async jwt({ token }) {
      if (!token.email) return token
      const user = getUserByEmail(token.email)
      if (!user?.active) {
        token.uid = ""
        token.email = undefined
        return token
      }
      token.uid = user.id
      token.role = user.role
      token.name = user.name
      return token
    },
    async session({ session, token }) {
      session.user.id = typeof token.uid === "string" ? token.uid : ""
      session.user.role = token.role === "admin" ? "admin" : "user"
      if (typeof token.name === "string") session.user.name = token.name
      return session
    },
  },
})
