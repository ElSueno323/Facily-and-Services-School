import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "user" | "responsable" | "admin"
      actorId: string
      actorName: string
      actorRole: "user" | "responsable" | "admin"
      switched: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string
    role?: "user" | "responsable" | "admin"
    actAs?: string
  }
}
