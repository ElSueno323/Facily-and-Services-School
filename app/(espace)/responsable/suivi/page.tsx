import Link from "next/link"
import { TRIAL_EMAIL } from "@/lib/constants"
import { getTracking } from "@/lib/db"
import { formatClock, formatWhen, statusLabel } from "@/lib/format"
import { requireAdmin } from "@/lib/guard"

export const metadata = { title: "Suivi" }

export default async function SuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>
}) {
  await requireAdmin()
  const params = await searchParams
  const filtre = params.filtre === "reste" || params.filtre === "fini" ? params.filtre : "tout"
  const tracking = getTracking()
  const realPeople = tracking.people.filter((person) => person.user.email !== TRIAL_EMAIL)

  return (
    <div className="stack-lg">
      <Link className="back" href="/responsable">
        Retour à l'espace responsable
      </Link>
      <div>
        <p className="kicker">Suivi</p>
        <h1>Qui a regardé</h1>
        <p className="lead">Chaque personne, vidéo par vidéo.</p>
      </div>
      <div className="top-actions">
        <Link className="navlink" href="/responsable/suivi" aria-current={filtre === "tout" ? "page" : undefined}>
          Tout
        </Link>
        <Link
          className="navlink"
          href="/responsable/suivi?filtre=reste"
          aria-current={filtre === "reste" ? "page" : undefined}
        >
          Ce qu'il reste
        </Link>
        <Link
          className="navlink"
          href="/responsable/suivi?filtre=fini"
          aria-current={filtre === "fini" ? "page" : undefined}
        >
          Ce qui est fini
        </Link>
      </div>
      {realPeople.length === 0 ? (
        <p className="note">Personne n'est encore entrée avec Google. Le compte d'essai est affiché en dessous.</p>
      ) : null}
      {tracking.people.map((person) => {
        const lines = person.lines.filter((line) => {
          if (filtre === "fini") return line.status === "done"
          if (filtre === "reste") return line.status !== "done"
          return true
        })
        if (filtre !== "tout" && lines.length === 0) return null
        const done = person.lines.filter((line) => line.status === "done").length
        const trial = person.user.email === TRIAL_EMAIL
        return (
          <article key={person.user.id} className="person stack">
            <div>
              <h2>{trial ? "Compte d'essai" : person.user.name}</h2>
              <p className="hint">{trial ? "Essai sur cet ordinateur" : person.user.email}</p>
              <p className="countline" style={{ marginTop: "0.4rem" }}>
                {done} sur {person.lines.length} {person.lines.length > 1 ? "vidéos finies" : "vidéo finie"}
              </p>
            </div>
            {lines.length === 0 ? <p>Rien à montrer avec ce filtre.</p> : null}
            {lines.map((line) => (
              <div key={line.id}>
                <span className={`badge badge-${line.status}`}>
                  {statusLabel(line.status, {
                    watched: line.watched,
                    questionCount: line.questionCount,
                    correctCount: line.correctCount,
                  })}
                </span>
                <p className="vrow-title" style={{ marginTop: "0.3rem" }}>
                  {line.title}
                </p>
                <p className="hint">
                  {line.moduleTitle}
                  {line.watched && line.questionCount > line.correctCount
                    ? ` · vidéo vue, questions ${line.correctCount} sur ${line.questionCount}`
                    : ""}
                  {line.status === "started" && !(line.watched && line.questionCount > line.correctCount)
                    ? ` · arrêtée à ${formatClock(line.position)}`
                    : ""}
                  {line.status === "done" && line.completedAt ? ` · finie le ${formatWhen(line.completedAt)}` : ""}
                  {line.status === "new" ? " · pas encore ouverte" : ""}
                </p>
              </div>
            ))}
          </article>
        )
      })}
    </div>
  )
}
