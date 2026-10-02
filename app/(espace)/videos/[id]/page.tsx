import Link from "next/link"
import { notFound } from "next/navigation"
import { VideoLesson } from "@/components/VideoLesson"
import { getQuiz, getVideoPage } from "@/lib/db"
import { requireUser } from "@/lib/guard"

export const metadata = { title: "Vidéo" }

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser()
  const { id } = await params
  const page = getVideoPage(id, session.user.id)
  if (!page) notFound()
  const { module, video, index, next } = page
  const quiz = getQuiz(video.id, session.user.id)

  return (
    <div className="stack-lg">
      <Link className="back" href={`/sujets/${module.id}`}>
        Retour à {module.title}
      </Link>
      <div>
        <p className="kicker">
          Vidéo {index + 1} sur {module.videos.length}
        </p>
        <h1>{video.title}</h1>
        {video.summary ? <p className="lead">{video.summary}</p> : null}
        <p className="hint">Catégorie : {module.title}</p>
        {video.tags.length > 0 ? (
          <div className="tags">
            {video.tags.map((tag) => (
              <Link key={tag} className="tag" href={`/accueil?q=${encodeURIComponent(tag)}`}>
                {tag}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {video.isExample ? (
        <p className="note">Ceci est une vidéo d'exemple. Elle montre comment le lecteur fonctionne.</p>
      ) : null}
      <VideoLesson
        videoId={video.id}
        src={video.src}
        startAt={video.watched ? 0 : video.position}
        ceiling={video.watched ? 0 : video.maxSeconds}
        watched={video.watched}
        backHref={`/sujets/${module.id}`}
        nextHref={next ? `/videos/${next.id}` : null}
        nextTitle={next?.title ?? null}
        questions={quiz.questions}
        solvedIds={quiz.solvedIds}
      />
    </div>
  )
}
