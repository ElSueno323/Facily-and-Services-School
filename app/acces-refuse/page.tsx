import Link from "next/link"

export const metadata = { title: "Accès fermé" }

export default function AccesRefusePage() {
  return (
    <div className="wrap login-wrap">
      <main className="sheet stack-lg">
        <h1>Ce compte ne peut pas entrer.</h1>
        <p className="lead">Demandez au responsable. Il peut rouvrir votre accès.</p>
        <Link className="btn btn-green" href="/">
          Retour
        </Link>
      </main>
    </div>
  )
}
