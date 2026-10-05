import Link from "next/link"
import { Banner } from "@/components/Banner"
import { SubmitButton } from "@/components/SubmitButton"
import { TRIAL_EMAIL } from "@/lib/constants"
import { listPlaces, listUsers, type User } from "@/lib/db"
import { placeKindLabel, roleLabel } from "@/lib/format"
import { requireAdmin } from "@/lib/guard"
import { ajouterCompte, ajouterLieu, associerResponsable, changerAcces, retirerLieu } from "../actions"

export const metadata = { title: "Les personnes" }

function AccessForm({ user }: { user: User }) {
  return (
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
  )
}

export default async function PersonnesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>
}) {
  await requireAdmin()
  const params = await searchParams
  const users = listUsers().filter((user) => user.email !== TRIAL_EMAIL && user.role !== "admin")
  const places = listPlaces()
  const loose = users.filter((user) => user.role === "responsable" && !user.placeId)

  return (
    <div className="stack-lg">
      <Link className="back" href="/responsable">
        Retour à l'espace IT
      </Link>
      <div>
        <p className="kicker">IT</p>
        <h1>Lieux et responsables</h1>
        <p className="lead">
          Créez un magasin ou un restaurant, puis associez-y un responsable. Les profils d'employés créés par ce
          responsable apparaissent sous son lieu.
        </p>
      </div>
      <Banner ok={params.ok} erreur={params.erreur} />

      <form action={ajouterLieu} className="person stack">
        <h2>Ajouter un lieu</h2>
        <label className="field">
          <span>Nom</span>
          <input name="nom" type="text" required />
        </label>
        <label className="field">
          <span>Type</span>
          <select name="type" defaultValue="magasin">
            <option value="magasin">Magasin</option>
            <option value="restaurant">Restaurant</option>
          </select>
        </label>
        <SubmitButton variant="green" pendingLabel="Enregistrement…">
          Ajouter le lieu
        </SubmitButton>
      </form>

      {places.length === 0 ? <p>Aucun lieu pour le moment. Ajoutez un magasin ou un restaurant.</p> : null}

      {places.map((place) => {
        const responsables = users.filter((user) => user.role === "responsable" && user.placeId === place.id)
        const employees = users.filter((user) => user.role === "user" && user.placeId === place.id)
        return (
          <section key={place.id} className="stack">
            <form action={retirerLieu} className="person stack">
              <input type="hidden" name="id" value={place.id} />
              <h2>
                {placeKindLabel(place.kind)} · {place.name}
              </h2>
              <label className="checkline">
                <input type="checkbox" name="confirme" required />
                <span>Oui, retirer ce lieu</span>
              </label>
              <SubmitButton variant="danger" pendingLabel="Enregistrement…">
                Retirer le lieu
              </SubmitButton>
            </form>

            {responsables.length === 0 ? <p>Aucun responsable pour ce lieu.</p> : null}
            {responsables.map((user) => (
              <article key={user.id} className="person stack">
                <div>
                  <h2>{user.name}</h2>
                  <p className="hint">{user.email}</p>
                  <p style={{ marginTop: "0.45rem" }}>
                    <span className="badge badge-done">{roleLabel(user.role)}</span>{" "}
                    <span className={`badge ${user.active ? "badge-started" : "badge-new"}`}>
                      {user.active ? "Accès ouvert" : "Accès fermé"}
                    </span>
                  </p>
                </div>
                <form action={associerResponsable} className="stack">
                  <input type="hidden" name="id" value={user.id} />
                  <label className="field">
                    <span>Lieu</span>
                    <select name="lieu" defaultValue={user.placeId ?? ""} required>
                      {places.map((placeItem) => (
                        <option key={placeItem.id} value={placeItem.id}>
                          {placeKindLabel(placeItem.kind)} · {placeItem.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
                    Enregistrer le lieu
                  </SubmitButton>
                </form>
                <AccessForm user={user} />
              </article>
            ))}

            <div className="person stack">
              <h3>Profils liés à ce lieu</h3>
              {employees.length === 0 ? (
                <p>Aucun profil pour le moment. Le responsable de ce lieu les crée.</p>
              ) : (
                employees.map((user) => (
                  <article key={user.id} className="stack">
                    <div>
                      <h3>{user.name}</h3>
                      <p className="hint">{user.email}</p>
                      <p style={{ marginTop: "0.45rem" }}>
                        <span className="badge badge-new">Employé</span>{" "}
                        <span className={`badge ${user.active ? "badge-started" : "badge-new"}`}>
                          {user.active ? "Accès ouvert" : "Accès fermé"}
                        </span>
                      </p>
                    </div>
                    <AccessForm user={user} />
                  </article>
                ))
              )}
            </div>
          </section>
        )
      })}

      {loose.length > 0 ? (
        <section className="stack">
          <h2>Responsables sans lieu</h2>
          {loose.map((user) => (
            <article key={user.id} className="person stack">
              <div>
                <h3>{user.name}</h3>
                <p className="hint">{user.email}</p>
              </div>
              {places.length > 0 ? (
                <form action={associerResponsable} className="stack">
                  <input type="hidden" name="id" value={user.id} />
                  <label className="field">
                    <span>Lieu</span>
                    <select name="lieu" defaultValue="" required>
                      <option value="" disabled>
                        Choisissez un lieu
                      </option>
                      {places.map((placeItem) => (
                        <option key={placeItem.id} value={placeItem.id}>
                          {placeKindLabel(placeItem.kind)} · {placeItem.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
                    Associer au lieu
                  </SubmitButton>
                </form>
              ) : (
                <p>Ajoutez d'abord un magasin ou un restaurant.</p>
              )}
            </article>
          ))}
        </section>
      ) : null}

      {places.length > 0 ? (
        <form action={ajouterCompte} className="person stack">
          <h2>Créer un responsable</h2>
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
          <label className="field">
            <span>Lieu</span>
            <select name="lieu" defaultValue="" required>
              <option value="" disabled>
                Choisissez un lieu
              </option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {placeKindLabel(place.kind)} · {place.name}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton variant="green" pendingLabel="Enregistrement…">
            Créer le responsable
          </SubmitButton>
        </form>
      ) : null}
    </div>
  )
}
