import { Suspense } from "react"
import { quitter } from "@/app/login-actions"
import { Nav } from "@/components/Nav"
import { SearchField } from "@/components/SearchField"

export function Shell({
  name,
  role,
  children,
}: {
  name: string
  role: "user" | "admin"
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
          <p className="who">
            Vous êtes <strong>{name}</strong>. Si ce n'est pas vous, quittez.
          </p>
        </div>
        <div className="top-actions">
          <Nav role={role} />
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
