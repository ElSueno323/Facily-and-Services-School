import Link from "next/link"
import { statusLabel } from "@/lib/format"
import type { VideoStatus } from "@/lib/db"

export function VideoRow({
  index,
  title,
  summary,
  status,
  watched,
  questionCount,
  correctCount,
  tags = [],
  href,
}: {
  index: number
  title: string
  summary: string
  status: VideoStatus
  watched: boolean
  questionCount: number
  correctCount: number
  tags?: string[]
  href: string
}) {
  const waitingQuiz = watched && questionCount > correctCount
  const action = status === "done" ? "Revoir" : waitingQuiz ? "Répondre" : status === "started" ? "Continuer" : "Regarder"
  return (
    <Link href={href} className="vrow">
      <span className={`num num-${status}`}>{index}</span>
      <span>
        <span className={`badge badge-${status}`}>{statusLabel(status, { watched, questionCount, correctCount })}</span>
        <span className="vrow-title">{title}</span>
        {summary ? <span className="hint">{summary}</span> : null}
        {tags.length > 0 ? (
          <span className="tags">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="vrow-go">{action}</span>
    </Link>
  )
}
