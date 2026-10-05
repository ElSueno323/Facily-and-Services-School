import { redirect } from "next/navigation"
import { Banner } from "@/components/Banner"
import { SubmitButton } from "@/components/SubmitButton"
import { employeesOf, getUserById } from "@/lib/db"
import { placeKindLabel } from "@/lib/format"
import { requireUser } from "@/lib/guard"
import { creerEmploye } from "./actions"

export const metadata = { title: "Équipe" }

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>
}) {
  const session = await requireUser()
  if (session.user.actorRole !== "responsable" || session.user.switched) redirect("/accueil")
  const params = await searchParams
  const actor = getUserById(session.user.actorId)
  const employees = actor?.placeId ? employeesOf(actor.placeId) : []
  const place = actor?.placeName
    ? `${placeKindLabel(actor.placeKind)} ${actor.placeName}`.trim()
    : ""

  return (
    <div className="stack-lg">
      <div>
        <p className="kicker">Équipe</p>
        <h1>Les employés</h1>
        <p className="lead">
          {place
            ? `Vous êtes responsable de ${place}. Créez le profil d'un employé, puis ouvrez son compte pour voir le site comme lui.`
            : "Votre compte n'est pas encore lié à un magasin ou un restaurant. Le compte IT peut le faire."}
        </p>
      </div>
      <Banner ok={params.ok} erreur={params.erreur} />
      {place ? (
        <form action={creerEmploye} className="person stack">
          <h2>Créer un profil</h2>
          <label className="field">
            <span>Nom</span>
            <input name="nom" type="text" required />
          </label>
          <label className="field">
            <span>Adresse</span>
            <input name="email" type="email" required />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <input name="motdepasse" type="text" required />
          </label>
          <SubmitButton variant="green" pendingLabel="Enregistrement…">
            Créer le profil
          </SubmitButton>
        </form>
      ) : null}
      {place && employees.length === 0 ? <p>Aucun employé pour le moment.</p> : null}
      <div className="stack">
        {employees.map((employee) => (
          <form key={employee.id} method="post" action="/api/ouvrir-compte" className="person stack">
            <input type="hidden" name="id" value={employee.id} />
            <div>
              <h2>{employee.name}</h2>
              <p className="hint">{employee.email}</p>
            </div>
            <button className="btn btn-green" type="submit">
              Ouvrir ce compte
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}
