import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, isGoogleReady } from "@/auth"
import { entrerCompte, entrerEssai, entrerGoogle } from "@/app/login-actions"
import { erreurs } from "@/lib/messages"
import { GoogleMark } from "@/components/GoogleMark"
import { SubmitButton } from "@/components/SubmitButton"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const session = await auth()
  if (session?.user?.id) redirect("/accueil")
  const params = await searchParams
  const erreur = params.erreur ? erreurs[params.erreur] : ""

  return (
    <div className="wrap login-wrap">
      <main className="sheet stack-lg">
        <svg className="mark" viewBox="0 0 120 120" aria-hidden="true">
          <rect x="8" y="16" width="104" height="78" rx="16" fill="#1a140f" />
          <rect x="16" y="24" width="88" height="62" rx="10" fill="#fffaf3" />
          <polygon points="52,40 52,70 78,55" fill="#0f5a38" />
          <rect x="46" y="98" width="28" height="8" rx="3" fill="#241c15" />
        </svg>
        <div>
          <p className="kicker">Pour le personnel</p>
          <h1>Facily and Services School</h1>
          <p className="lead">Des vidéos courtes pour apprendre, et pour dépanner.</p>
        </div>
        {isGoogleReady ? (
          <form action={entrerGoogle} className="stack">
            <p>Appuyez sur le gros bouton pour entrer avec votre compte Google.</p>
            <SubmitButton variant="google" pendingLabel="Ouverture de Google…">
              <GoogleMark />
              <span>Continuer avec Google</span>
            </SubmitButton>
            <p className="hint">Utilisez toujours le même compte. Votre progression reste gardée.</p>
          </form>
        ) : (
          <form action={entrerEssai} className="stack">
            <p>Google n'est pas encore branché. Vous pouvez déjà essayer le site.</p>
            <SubmitButton pendingLabel="Ouverture…">Entrer pour essayer</SubmitButton>
            <p className="hint">
              Ceci est un essai. Plus tard, chaque personne entrera avec son compte Google.
            </p>
            <Link className="back" href="/reglage-google">
              Brancher Google
            </Link>
          </form>
        )}
        <form action={entrerCompte} className="stack">
          {erreur ? <p className="warnbox">{erreur}</p> : null}
          <label className="field">
            <span>Adresse</span>
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <SubmitButton pendingLabel="Ouverture…">Entrer</SubmitButton>
        </form>
      </main>
    </div>
  )
}
