import { getCatalog } from "@/lib/db"
import { requireUser } from "@/lib/guard"
import { CountBar } from "@/components/CountBar"
import { VideoRow } from "@/components/VideoRow"

export const metadata = { title: "Ma progression" }

export default async function ProgressionPage() {
  const session = await requireUser()
  const catalog = getCatalog(session.user.id)
  const remaining = catalog.total - catalog.done

  return (
    <div className="stack-lg">
      <div>
        <p className="kicker">Ma progression</p>
        <h1>{remaining === 0 && catalog.total > 0 ? "Tout est vu." : "Où vous en êtes."}</h1>
        <p className="lead">
          {catalog.total === 0
            ? "Les vidéos ne sont pas encore en place."
            : `${catalog.done} vidéo${catalog.done > 1 ? "s" : ""} finie${catalog.done > 1 ? "s" : ""} sur ${catalog.total}.`}
        </p>
        {catalog.total > 0 ? <CountBar done={catalog.done} total={catalog.total} /> : null}
      </div>
      {catalog.modules.map((moduleItem) => (
        <section key={moduleItem.id} className="stack">
          <h2>{moduleItem.title}</h2>
          {moduleItem.videos.length === 0 ? <p>Aucune vidéo dans cette catégorie.</p> : null}
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
        </section>
      ))}
    </div>
  )
}
