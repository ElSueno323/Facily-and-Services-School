import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { TRIAL_EMAIL } from "@/lib/constants"
import { authenticateAccount, getUserByEmail, getUserById, upsertUser, visibleEmployee } from "@/lib/db"

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
    Credentials({
      id: "compte",
      name: "Compte",
      credentials: {
        email: { label: "Adresse", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : ""
        const password = typeof credentials?.password === "string" ? credentials.password : ""
        if (!email || !password) return null
        const user = authenticateAccount(email, password)
        if (!user) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
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
      const actorId = typeof token.uid === "string" ? token.uid : ""
      const actor = actorId ? getUserById(actorId) : null
      if (!actor?.active) {
        session.user.id = ""
        session.user.role = "user"
        session.user.actorId = ""
        session.user.actorName = ""
        session.user.actorRole = "user"
        session.user.switched = false
        return session
      }
      const actAs = typeof token.actAs === "string" ? token.actAs : null
      const target = visibleEmployee(actor.id, actAs)
      session.user.actorId = actor.id
      session.user.actorName = actor.name
      session.user.actorRole = actor.role
      session.user.switched = Boolean(target)
      if (target) {
        session.user.id = target.id
        session.user.name = target.name
        session.user.email = target.email
        session.user.role = "user"
      } else {
        session.user.id = actor.id
        session.user.name = actor.name
        session.user.email = actor.email
        session.user.role = actor.role
      }
      return session
    },
  },
})
