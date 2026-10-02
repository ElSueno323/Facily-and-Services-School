import Link from "next/link"
import { Banner } from "@/components/Banner"
import { SubmitButton } from "@/components/SubmitButton"
import { TRIAL_EMAIL } from "@/lib/constants"
import { listUsers } from "@/lib/db"
import { requireAdmin } from "@/lib/guard"
import { changerAcces, changerRole } from "../actions"

export const metadata = { title: "Les personnes" }

export default async function PersonnesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>
}) {
  const session = await requireAdmin()
  const params = await searchParams
  const users = listUsers()

  return (
    <div className="stack-lg">
      <Link className="back" href="/responsable">
        Retour à l'espace responsable
      </Link>
      <div>
        <p className="kicker">Comptes</p>
        <h1>Les personnes</h1>
        <p className="lead">
          Un utilisateur regarde les vidéos. Un responsable ajoute les vidéos et voit le suivi.
        </p>
      </div>
      <Banner ok={params.ok} erreur={params.erreur} />
      {users.length === 0 ? <p>Personne n'est encore entrée.</p> : null}
      {users.map((user) => {
        const self = user.id === session.user.id
        const trial = user.email === TRIAL_EMAIL
        return (
          <article key={user.id} className="person stack">
            <div>
              <h2>{trial ? "Compte d'essai" : user.name}</h2>
              <p className="hint">{trial ? "Pour essayer le site avant Google." : user.email}</p>
              <p style={{ marginTop: "0.45rem" }}>
                <span className={`badge ${user.role === "admin" ? "badge-done" : "badge-new"}`}>
                  {user.role === "admin" ? "Responsable" : "Utilisateur"}
                </span>{" "}
                <span className={`badge ${user.active ? "badge-started" : "badge-new"}`}>
                  {user.active ? "Accès ouvert" : "Accès fermé"}
                </span>
              </p>
            </div>
            {self ? <p>C'est votre compte.</p> : null}
            {!self && !trial ? (
              <>
                <form action={changerRole}>
                  <input type="hidden" name="id" value={user.id} />
                  <input type="hidden" name="role" value={user.role === "admin" ? "user" : "admin"} />
                  <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
                    {user.role === "admin" ? "Remettre en utilisateur" : "Donner les droits de responsable"}
                  </SubmitButton>
                </form>
                <form action={changerAcces} className="stack">
                  <input type="hidden" name="id" value={user.id} />
                  <input type="hidden" name="actif" value={user.active ? "0" : "1"} />
                  <label className="checkline">
                    <input type="checkbox" name="confirme" required />
                    <span>{user.active ? "Oui, fermer l'accès" : "Oui, rouvrir l'accès"}</span>
                  </label>
                  <SubmitButton variant={user.active ? "danger" : "green"} pendingLabel="Enregistrement…">
                    {user.active ? "Fermer l'accès" : "Rouvrir l'accès"}
                  </SubmitButton>
                </form>
              </>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
