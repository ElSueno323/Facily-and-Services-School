import Link from "next/link"
import { isGoogleReady } from "@/auth"
import { TRIAL_EMAIL } from "@/lib/constants"
import { getCatalog, listUsers } from "@/lib/db"
import { requireAdmin } from "@/lib/guard"

export const metadata = { title: "IT" }

export default async function ResponsablePage() {
  const session = await requireAdmin()
  const users = listUsers().filter((user) => user.email !== TRIAL_EMAIL)
  const catalog = getCatalog(session.user.id)

  return (
    <div className="stack-lg">
      <div>
        <p className="kicker">IT</p>
        <h1>Que voulez-vous faire ?</h1>
        <p className="lead">
          {users.length === 0
            ? "Aucune personne n'est encore entrée avec Google."
            : `${users.length} personne${users.length > 1 ? "s" : ""}.`}{" "}
          {catalog.total} vidéo{catalog.total > 1 ? "s" : ""}.
        </p>
      </div>
      {!isGoogleReady ? (
        <p className="note">
          Google n'est pas encore branché.{" "}
          <Link className="back" href="/reglage-google">
            Voir comment faire
          </Link>
        </p>
      ) : (
        <p className="okbox">Google est branché. Les personnes peuvent entrer.</p>
      )}
      <div className="stack">
        <Link className="scard" href="/responsable/videos">
          <span className="kicker">Contenu</span>
          <span className="scard-title">Mettre une vidéo</span>
          <span className="hint">Ajouter une catégorie, une vidéo, ou des mots-clés.</span>
          <span className="vrow-go">Ouvrir</span>
        </Link>
        <Link className="scard" href="/responsable/suivi">
          <span className="kicker">Suivi</span>
          <span className="scard-title">Voir qui a regardé</span>
          <span className="hint">Où en est chaque personne.</span>
          <span className="vrow-go">Ouvrir</span>
        </Link>
        <Link className="scard" href="/responsable/personnes">
          <span className="kicker">Comptes</span>
          <span className="scard-title">Les personnes</span>
          <span className="hint">Magasins, restaurants, et les profils liés aux responsables.</span>
          <span className="vrow-go">Ouvrir</span>
        </Link>
      </div>
    </div>
  )
}
