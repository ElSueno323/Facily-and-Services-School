import { Suspense } from "react"
import { quitter } from "@/app/login-actions"
import { Nav } from "@/components/Nav"
import { SearchField } from "@/components/SearchField"

export function Shell({
  name,
  role,
  showTeam,
  switched,
  children,
}: {
  name: string
  role: "user" | "responsable" | "admin"
  showTeam: boolean
  switched: { actorName: string } | null
  children: React.ReactNode
}) {
  return (
    <div className="wrap">
      <a className="skip" href="#contenu">
        Aller au contenu
      </a>
      <header className="topbar">
        <div>
          <a className="brand" href="/accueil">
            Facily and Services School
          </a>
          {switched ? (
            <p className="who">
              Compte de <strong>{name}</strong>. Ouvert par {switched.actorName}.
            </p>
          ) : (
            <p className="who">
              Vous êtes <strong>{name}</strong>. Si ce n'est pas vous, quittez.
            </p>
          )}
        </div>
        <div className="top-actions">
          <Nav role={role} showTeam={showTeam} />
          {switched ? (
            <form method="post" action="/api/mon-compte">
              <button className="navlink" type="submit">
                Mon compte
              </button>
            </form>
          ) : null}
          <form action={quitter}>
            <button className="quit" type="submit">
              Quitter
            </button>
          </form>
          <Suspense>
            <SearchField />
          </Suspense>
        </div>
      </header>
      <main id="contenu" className="sheet">
        {children}
      </main>
    </div>
  )
}
