import { auth } from "@/auth"
import { saveProgress } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return Response.json({ error: "Connectez-vous." }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Lecture impossible." }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Lecture impossible." }, { status: 400 })
  }

  const data = body as {
    videoId?: unknown
    position?: unknown
    completed?: unknown
    duration?: unknown
  }
  const videoId = typeof data.videoId === "string" ? data.videoId : ""
  const position = typeof data.position === "number" ? data.position : Number(data.position)
  const duration = typeof data.duration === "number" ? data.duration : Number(data.duration ?? 0)
  if (!videoId || videoId.length > 80 || !Number.isFinite(position) || position < 0 || position > 60 * 60 * 12) {
    return Response.json({ error: "Informations incorrectes." }, { status: 400 })
  }

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  let completed = data.completed === true
  if (completed && safeDuration > 0 && position < safeDuration - 1.5) completed = false
  if (completed && safeDuration <= 0 && position < 1) completed = false

  const saved = saveProgress(userId, videoId, position, completed)
  if (!saved) return Response.json({ error: "Vidéo introuvable." }, { status: 404 })
  return Response.json({ ok: true, completed })
}
