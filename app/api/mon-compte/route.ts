import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { rememberAccount } from "@/lib/act-as"
import { clearSwitch } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await auth()
  if (session?.user?.actorId) clearSwitch(session.user.actorId)
  await rememberAccount(null)
  return NextResponse.redirect(new URL("/accueil", request.url), 303)
}
