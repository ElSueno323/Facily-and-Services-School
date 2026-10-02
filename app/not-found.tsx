import Link from "next/link"

export default function NotFound() {
  return (
    <div className="wrap login-wrap">
      <main className="sheet stack-lg">
        <h1>Cette page n'existe pas.</h1>
        <p className="lead">Revenez à l'accueil.</p>
        <Link className="btn btn-green" href="/accueil">
          Accueil
        </Link>
      </main>
    </div>
  )
}
