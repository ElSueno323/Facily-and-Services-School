import { redirect } from "next/navigation"
import { auth } from "@/auth"

export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")
  return session
}

export async function requireAdmin() {
  const session = await requireUser()
  if (session.user.role !== "admin") redirect("/accueil")
  return session
}
