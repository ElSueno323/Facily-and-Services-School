import Link from "next/link"
import { TRIAL_EMAIL } from "@/lib/constants"
import { getCatalog } from "@/lib/db"
import { requireUser } from "@/lib/guard"
import { matchesQuery } from "@/lib/search"
import { CountBar } from "@/components/CountBar"
import { VideoRow } from "@/components/VideoRow"

export const metadata = { title: "Accueil" }

export default async function AccueilPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireUser()
  const params = await searchParams
  const query = (params.q ?? "").trim()
  const catalog = getCatalog(session.user.id)
  const results = query
    ? catalog.modules.flatMap((moduleItem) =>
        moduleItem.videos
          .filter((video) =>
            matchesQuery([video.title, video.summary, moduleItem.title, ...video.tags], query),
          )
          .map((video) => ({ video, category: moduleItem.title })),
      )
    : []
  const remaining = catalog.total - catalog.done
  const firstName = (session.user.name || "vous").split(" ")[0]

  return (
    <div className="stack-lg">
      <div>
        <p className="kicker">Accueil</p>
        <h1>Bonjour {firstName}.</h1>
        {catalog.total === 0 ? (
          <p className="lead">Il n'y a pas encore de vidéo. Le responsable va les ajouter.</p>
        ) : remaining === 0 ? (
          <p className="lead">Bravo. Vous avez vu toutes les vidéos. Vous pouvez les revoir quand vous voulez.</p>
        ) : (
          <p className="lead">
            {remaining === 1 ? "Il vous reste 1 vidéo." : `Il vous reste ${remaining} vidéos.`}
          </p>
        )}
        {catalog.total > 0 ? (
          <>
            <p className="countline">
              {catalog.done} sur {catalog.total} {catalog.total > 1 ? "vidéos finies" : "vidéo finie"}
            </p>
            <CountBar done={catalog.done} total={catalog.total} />
          </>
        ) : null}
      </div>

      {session.user.email === TRIAL_EMAIL ? (
        <p className="note">Vous êtes dans l'essai. Le personnel entrera avec Google.</p>
      ) : null}
      {catalog.hasExample ? (
        <p className="note">
          Certaines vidéos sont des exemples, pour essayer le site. Le responsable mettra les vraies vidéos à la place.
        </p>
      ) : null}

      <form id="chercher" className="stack" action="/accueil" method="get">
        <label className="field">
          <span>Chercher une vidéo</span>
          <input name="q" type="search" defaultValue={query} />
          <span className="hint">Un mot du titre, de la catégorie, ou un mot-clé. Par exemple : ticket</span>
        </label>
        <button className="btn btn-green" type="submit">
          Chercher
        </button>
      </form>

      {query ? (
        <div className="stack">
          <h2>Résultats</h2>
          <p>
            {results.length === 0
              ? "Aucune vidéo pour ce mot. Essayez un autre mot."
              : `${results.length} vidéo${results.length > 1 ? "s" : ""}.`}
          </p>
          <Link className="back" href="/accueil">
            Effacer la recherche
          </Link>
          {results.map(({ video, category }, index) => (
            <VideoRow
              key={video.id}
              index={index + 1}
              title={video.title}
              summary={[category, video.summary].filter(Boolean).join(" · ")}
              status={video.status}
              watched={video.watched}
              questionCount={video.questionCount}
              correctCount={video.correctCount}
              tags={video.tags}
              href={`/videos/${video.id}`}
            />
          ))}
        </div>
      ) : null}

      {!query && catalog.resume ? (
        <Link href={`/videos/${catalog.resume.video.id}`} className="scard resume">
          <span className="kicker">Reprendre</span>
          <span className="scard-title">{catalog.resume.video.title}</span>
          <span className="hint">{catalog.resume.moduleTitle}</span>
          <span className="vrow-go">
            {catalog.resume.video.watched &&
            catalog.resume.video.questionCount > catalog.resume.video.correctCount
              ? "Répondre"
              : "Continuer"}
          </span>
        </Link>
      ) : null}

      {!query ? (
      <div className="stack">
        <h2>Les catégories</h2>
        {catalog.modules.length === 0 ? <p>Aucune catégorie pour le moment.</p> : null}
        {catalog.modules.map((moduleItem) => {
          const done = moduleItem.videos.filter((video) => video.status === "done").length
          return (
            <Link key={moduleItem.id} href={`/sujets/${moduleItem.id}`} className="scard">
              <span className="kicker">Catégorie</span>
              <span className="scard-title">{moduleItem.title}</span>
              <span className="hint">
                {moduleItem.videos.length === 0
                  ? "Aucune vidéo pour le moment."
                  : `${done} sur ${moduleItem.videos.length} ${moduleItem.videos.length > 1 ? "vidéos finies" : "vidéo finie"}`}
              </span>
              <span className="vrow-go">Ouvrir</span>
            </Link>
          )
        })}
      </div>
      ) : null}
    </div>
  )
}
