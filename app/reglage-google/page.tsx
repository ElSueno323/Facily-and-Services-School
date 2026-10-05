import Link from "next/link"

export const metadata = { title: "Brancher Google" }

export default function ReglageGooglePage() {
  return (
    <div className="wrap" style={{ paddingTop: "1.5rem" }}>
      <main className="sheet stack-lg">
        <Link className="back" href="/">
          Retour à l'entrée
        </Link>
        <div>
          <p className="kicker">Pour le responsable</p>
          <h1>Brancher Google</h1>
          <p className="lead">Le personnel appuiera ensuite sur un seul bouton : Continuer avec Google.</p>
        </div>
        <ol className="steps">
          <li>
            <span className="num">1</span>
            <p>
              Ouvrez la console Google :{" "}
              <a href="https://console.cloud.google.com/apis/credentials" className="back">
                console.cloud.google.com
              </a>
            </p>
          </li>
          <li>
            <span className="num">2</span>
            <p>Créez un projet, puis un identifiant de type Application Web.</p>
          </li>
          <li>
            <span className="num">3</span>
            <div>
              <p>Dans « URI de redirection autorisés », collez cette adresse :</p>
              <pre className="copiable">http://localhost:3000/api/auth/callback/google</pre>
            </div>
          </li>
          <li>
            <span className="num">4</span>
            <div>
              <p>Ouvrez le fichier .env.local à la racine du site. Ajoutez les deux lignes, avec vos vraies clés :</p>
              <pre className="copiable">{`AUTH_GOOGLE_ID=collez l'identifiant ici
AUTH_GOOGLE_SECRET=collez le secret ici`}</pre>
            </div>
          </li>
          <li>
            <span className="num">5</span>
            <p>Enregistrez le fichier. Le site se relance. Revenez à l'entrée : le bouton Google est là.</p>
          </li>
        </ol>
        <p className="note">
          La première personne qui entre avec Google devient admin. Les suivantes sont des employés. Vous
          pourrez changer les rôles dans l'espace IT.
        </p>
      </main>
    </div>
  )
}
