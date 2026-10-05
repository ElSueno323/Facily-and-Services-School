import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { rememberAccount } from "@/lib/act-as"
import { setSwitch } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await auth()
  const back = new URL("/accueil", request.url)
  if (!session?.user?.actorId || session.user.switched || session.user.actorRole !== "responsable") {
    return NextResponse.redirect(back, 303)
  }
  const form = await request.formData()
  const id = String(form.get("id") ?? "")
  const result = setSwitch(session.user.actorId, id)
  if (!result.ok) {
    return NextResponse.redirect(new URL("/equipe?erreur=personne", request.url), 303)
  }
  await rememberAccount(id)
  return NextResponse.redirect(back, 303)
}
