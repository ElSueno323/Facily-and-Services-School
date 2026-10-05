import { cookies } from "next/headers"
import { decode, encode } from "next-auth/jwt"
import { VUE_COOKIE } from "@/lib/constants"

const NAMES = ["__Secure-authjs.session-token", "authjs.session-token"]

export async function rememberAccount(targetId: string | null) {
  const secret = process.env.AUTH_SECRET
  if (!secret) return
  const jar = await cookies()
  const all = jar.getAll()
  const name = NAMES.find((candidate) => all.some((cookie) => cookie.name === candidate || cookie.name.startsWith(`${candidate}.`)))
  if (!name) return
  const exact = all.find((cookie) => cookie.name === name)
  const chunks = all
    .filter((cookie) => cookie.name.startsWith(`${name}.`))
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
  const value = exact?.value ?? chunks.map((cookie) => cookie.value).join("")
  if (!value) return
  const token = await decode({ token: value, secret, salt: name })
  if (!token) return
  if (targetId) token.actAs = targetId
  else delete token.actAs
  const next = await encode({ token, secret, salt: name, maxAge: 60 * 60 * 24 * 30 })
  for (const cookie of chunks) jar.delete(cookie.name)
  jar.set(name, next, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: name.startsWith("__Secure-"),
    maxAge: 60 * 60 * 24 * 30,
  })
  jar.delete(VUE_COOKIE)
}
