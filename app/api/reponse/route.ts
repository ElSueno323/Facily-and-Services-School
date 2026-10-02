import { auth } from "@/auth"
import { answerQuestion } from "@/lib/db"

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
  const data = body as { questionId?: unknown; choiceId?: unknown }
  const questionId = typeof data.questionId === "string" ? data.questionId : ""
  const choiceId = typeof data.choiceId === "string" ? data.choiceId : ""
  if (!questionId || !choiceId || questionId.length > 80 || choiceId.length > 80) {
    return Response.json({ error: "Choisissez une réponse." }, { status: 400 })
  }

  const result = answerQuestion(userId, questionId, choiceId)
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 })
  return Response.json(result)
}
