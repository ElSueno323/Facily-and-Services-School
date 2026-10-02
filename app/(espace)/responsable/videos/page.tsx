import Link from "next/link"
import { Banner } from "@/components/Banner"
import { SubmitButton } from "@/components/SubmitButton"
import { getCatalog, listQuestionsForAdmin, listSubjects } from "@/lib/db"
import { requireAdmin } from "@/lib/guard"
import {
  ajouterQuestion,
  ajouterSujet,
  ajouterVideo,
  enregistrerMots,
  renommerSujet,
  renommerVideo,
  retirerExemples,
  retirerQuestion,
  retirerSujet,
  retirerVideo,
} from "../actions"

export const metadata = { title: "Mettre une vidéo" }

export default async function VideosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>
}) {
  const session = await requireAdmin()
  const params = await searchParams
  const subjects = listSubjects()
  const catalog = getCatalog(session.user.id)
  const questions = listQuestionsForAdmin()

  return (
    <div className="stack-lg">
      <Link className="back" href="/responsable">
        Retour à l'espace responsable
      </Link>
      <div>
        <p className="kicker">Contenu</p>
        <h1>Mettre une vidéo</h1>
        <p className="lead">
          Une explication = une vidéo, puis des questions en bas. Le personnel regarde la vidéo jusqu'au bout, ensuite il
          répond.
        </p>
      </div>
      <Banner ok={params.ok} erreur={params.erreur} />

      <form action={ajouterSujet} className="stack">
        <h2>Nouvelle catégorie</h2>
        <label className="field">
          <span>Nom de la catégorie</span>
          <input name="titre" type="text" required />
          <span className="hint">Par exemple : La caisse</span>
        </label>
        <label className="field">
          <span>Une phrase pour expliquer</span>
          <input name="phrase" type="text" />
          <span className="hint">Vous pouvez laisser vide.</span>
        </label>
        <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
          Ajouter la catégorie
        </SubmitButton>
      </form>

      {subjects.length > 0 ? (
        <form action={ajouterVideo} className="stack">
          <h2>Nouvelle vidéo</h2>
          <label className="field">
            <span>Dans quelle catégorie ?</span>
            <select name="sujet" required defaultValue="">
              <option value="" disabled>
                Choisissez une catégorie
              </option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Titre de la vidéo</span>
            <input name="titre" type="text" required />
            <span className="hint">Par exemple : Le ticket ne sort pas</span>
          </label>
          <label className="field">
            <span>Une phrase pour expliquer</span>
            <input name="phrase" type="text" />
          </label>
          <label className="field">
            <span>Mots-clés</span>
            <input name="mots" type="text" />
            <span className="hint">Séparez les mots par une virgule. Par exemple : ticket, papier, panne</span>
          </label>
          <label className="field">
            <span>La vidéo sur votre ordinateur</span>
            <input name="fichier" type="file" accept="video/mp4,video/webm,.mp4,.webm" required />
            <span className="hint">Un fichier qui se termine par .mp4</span>
          </label>
          <SubmitButton pendingLabel="Envoi de la vidéo…">Ajouter la vidéo</SubmitButton>
        </form>
      ) : null}

      {catalog.hasExample ? (
        <form action={retirerExemples} className="stack">
          <h2>Vidéos d'exemple</h2>
          <p>Elles servent à essayer le site. Retirez-les quand vos vraies vidéos sont prêtes.</p>
          <label className="checkline">
            <input type="checkbox" name="confirme" required />
            <span>Oui, retirer les vidéos d'exemple</span>
          </label>
          <SubmitButton variant="quiet" pendingLabel="Retrait…">
            Retirer les vidéos d'exemple
          </SubmitButton>
        </form>
      ) : null}

      {catalog.modules.map((moduleItem) => (
        <section key={moduleItem.id} className="stack">
          <h2>{moduleItem.title}</h2>
          <form action={renommerSujet} className="stack">
            <input type="hidden" name="id" value={moduleItem.id} />
            <label className="field">
              <span>Nom de la catégorie</span>
              <input name="titre" type="text" defaultValue={moduleItem.title} required />
            </label>
            <label className="field">
              <span>Phrase</span>
              <input name="phrase" type="text" defaultValue={moduleItem.summary} />
            </label>
            <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
              Enregistrer le nom
            </SubmitButton>
          </form>
          <form action={retirerSujet} className="stack">
            <input type="hidden" name="id" value={moduleItem.id} />
            <label className="checkline">
              <input type="checkbox" name="confirme" required />
              <span>Oui, retirer cette catégorie et ses vidéos</span>
            </label>
            <SubmitButton variant="danger" pendingLabel="Retrait…">
              Retirer cette catégorie
            </SubmitButton>
          </form>
          {moduleItem.videos.map((video, index) => (
            <article key={video.id} className="person stack">
              <h3>
                Vidéo {index + 1}. {video.title}
              </h3>
              {video.isExample ? <p className="hint">Vidéo d'exemple</p> : null}
              <form action={renommerVideo} className="stack">
                <input type="hidden" name="id" value={video.id} />
                <label className="field">
                  <span>Titre</span>
                  <input name="titre" type="text" defaultValue={video.title} required />
                </label>
                <label className="field">
                  <span>Phrase</span>
                  <input name="phrase" type="text" defaultValue={video.summary} />
                </label>
                <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
                  Enregistrer
                </SubmitButton>
              </form>
              <form action={enregistrerMots} className="stack">
                <input type="hidden" name="id" value={video.id} />
                <label className="field">
                  <span>Mots-clés</span>
                  <input name="mots" type="text" defaultValue={video.tags.join(", ")} />
                  <span className="hint">Séparez les mots par une virgule. Laissez vide pour tout retirer.</span>
                </label>
                <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
                  Enregistrer les mots
                </SubmitButton>
              </form>
              <div className="stack">
                <p className="kicker">Questions en bas de cette vidéo</p>
                {questions.filter((question) => question.videoId === video.id).length === 0 ? (
                  <p className="hint">Aucune question pour le moment.</p>
                ) : null}
                {questions
                  .filter((question) => question.videoId === video.id)
                  .map((question, questionIndex) => (
                    <div key={question.id} className="stack">
                      <p>
                        {questionIndex + 1}. {question.prompt}
                      </p>
                      {question.choices.map((choice) => (
                        <p key={choice.id} className="hint">
                          {choice.correct ? `Bonne réponse : ${choice.label}` : choice.label}
                        </p>
                      ))}
                      <form action={retirerQuestion} className="stack">
                        <input type="hidden" name="id" value={question.id} />
                        <label className="checkline">
                          <input type="checkbox" name="confirme" required />
                          <span>Oui, retirer cette question</span>
                        </label>
                        <SubmitButton variant="danger" pendingLabel="Retrait…">
                          Retirer cette question
                        </SubmitButton>
                      </form>
                    </div>
                  ))}
                <form action={ajouterQuestion} className="stack">
                  <input type="hidden" name="video" value={video.id} />
                  <label className="field">
                    <span>La question</span>
                    <input name="question" type="text" required />
                    <span className="hint">Une seule phrase. Par exemple : Où range-t-on l'argent ?</span>
                  </label>
                  {[1, 2, 3].map((number) => (
                    <div key={number} className="stack">
                      <label className="field">
                        <span>
                          Réponse {number}
                          {number === 3 ? " (vous pouvez laisser vide)" : ""}
                        </span>
                        <input name={`reponse${number}`} type="text" required={number < 3} />
                      </label>
                      <label className="choice-pick">
                        <input type="radio" name="bonne" value={String(number)} required={number === 1} />
                        <span>C'est la bonne réponse</span>
                      </label>
                    </div>
                  ))}
                  <SubmitButton variant="quiet" pendingLabel="Enregistrement…">
                    Ajouter la question
                  </SubmitButton>
                </form>
              </div>
              <form action={retirerVideo} className="stack">
                <input type="hidden" name="id" value={video.id} />
                <label className="checkline">
                  <input type="checkbox" name="confirme" required />
                  <span>Oui, retirer cette vidéo</span>
                </label>
                <SubmitButton variant="danger" pendingLabel="Retrait…">
                  Retirer cette vidéo
                </SubmitButton>
              </form>
            </article>
          ))}
        </section>
      ))}
    </div>
  )
}
