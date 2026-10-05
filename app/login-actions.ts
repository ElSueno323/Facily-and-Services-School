"use server"

import { cookies } from "next/headers"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { auth, signIn, signOut } from "@/auth"
import { VUE_COOKIE } from "@/lib/constants"
import { clearSwitch } from "@/lib/db"

export async function entrerGoogle() {
  await signIn("google", { redirectTo: "/accueil" })
}

export async function entrerEssai() {
  await signIn("essai", { redirectTo: "/accueil" })
}

export async function entrerCompte(formData: FormData) {
  try {
    await signIn("compte", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/accueil",
    })
  } catch (error) {
    if (error instanceof AuthError) redirect("/?erreur=connexion")
    throw error
  }
}

export async function quitter() {
  const session = await auth()
  if (session?.user?.actorId) clearSwitch(session.user.actorId)
  const jar = await cookies()
  jar.delete(VUE_COOKIE)
  await signOut({ redirectTo: "/" })
}
