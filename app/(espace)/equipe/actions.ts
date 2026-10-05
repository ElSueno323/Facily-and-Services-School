"use server"

import { redirect } from "next/navigation"
import { requireUser } from "@/lib/guard"
import { createAccount, getUserById } from "@/lib/db"

export async function creerEmploye(formData: FormData) {
  const session = await requireUser()
  if (session.user.switched || session.user.actorRole !== "responsable") redirect("/accueil")
  const actor = getUserById(session.user.actorId)
  if (!actor?.placeId) redirect("/equipe?erreur=lieu")
  const result = createAccount({
    name: String(formData.get("nom") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("motdepasse") ?? ""),
    role: "user",
    placeId: actor.placeId,
  })
  redirect(`/equipe?${result.ok ? "ok=compte" : `erreur=${result.error}`}`)
}
