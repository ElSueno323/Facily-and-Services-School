import Link from "next/link"
import { notFound } from "next/navigation"
import { getModulePage } from "@/lib/db"
import { requireUser } from "@/lib/guard"
import { VideoRow } from "@/components/VideoRow"

export const metadata = { title: "Catégorie" }

export default async function SujetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser()
  const { id } = await params
  const moduleItem = getModulePage(id, session.user.id)
  if (!moduleItem) notFound()
  const done = moduleItem.videos.filter((video) => video.status === "done").length

  return (
    <div className="stack-lg">
      <Link className="back" href="/accueil">
        Retour à l'accueil
      </Link>
      <div>
        <p className="kicker">Catégorie</p>
        <h1>{moduleItem.title}</h1>
        {moduleItem.summary ? <p className="lead">{moduleItem.summary}</p> : null}
        {moduleItem.videos.length > 0 ? (
          <p>
            {done} sur {moduleItem.videos.length} {moduleItem.videos.length > 1 ? "vidéos finies" : "vidéo finie"}.
            Choisissez une vidéo. La première fois, elle se regarde jusqu'au bout. Ensuite, répondez aux questions.
          </p>
        ) : (
          <p>Aucune vidéo dans cette catégorie pour le moment.</p>
        )}
      </div>
      <div className="stack">
        {moduleItem.videos.map((video, index) => (
          <VideoRow
            key={video.id}
            index={index + 1}
            title={video.title}
            summary={video.summary}
              status={video.status}
              watched={video.watched}
              questionCount={video.questionCount}
              correctCount={video.correctCount}
            tags={video.tags}
            href={`/videos/${video.id}`}
          />
        ))}
      </div>
    </div>
  )
}
