"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { VideoPlayer } from "@/components/VideoPlayer"
import type { QuizQuestion } from "@/lib/db"

export function VideoLesson({
  videoId,
  src,
  startAt,
  ceiling,
  watched,
  backHref,
  nextHref,
  nextTitle,
  questions,
  solvedIds,
}: {
  videoId: string
  src: string
  startAt: number
  ceiling: number
  watched: boolean
  backHref: string
  nextHref: string | null
  nextTitle: string | null
  questions: QuizQuestion[]
  solvedIds: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(watched)
  const [solved, setSolved] = useState(solvedIds)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const quizDone = questions.length === 0 || questions.every((question) => solved.includes(question.id))
  const currentIndex = questions.findIndex((question) => !solved.includes(question.id))
  const current = currentIndex === -1 ? null : questions[currentIndex]

  function revealQuestions() {
    setOpen(true)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document.getElementById("questions")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }

  async function choose(questionId: string, choiceId: string) {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/reponse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, choiceId }),
      })
      const data = (await response.json()) as { correct?: boolean; finished?: boolean; error?: string }
      if (!response.ok) {
        setFeedback(data.error || "Réessayez.")
        return
      }
      if (!data.correct) {
        setFeedback("Ce n'est pas la bonne réponse. Essayez encore.")
        return
      }
      setSolved((items) => (items.includes(questionId) ? items : [...items, questionId]))
      setFeedback(null)
      if (data.finished) router.refresh()
    } catch {
      setFeedback("La réponse n'a pas pu être envoyée. Réessayez.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <VideoPlayer
        videoId={videoId}
        src={src}
        startAt={startAt}
        ceiling={ceiling}
        alreadyDone={watched}
        hasQuiz={questions.length > 0}
        onWatched={revealQuestions}
        backHref={backHref}
        nextHref={quizDone ? nextHref : null}
        nextTitle={nextTitle}
      />
      {questions.length > 0 ? (
        <section className="quiz stack" id="questions">
          <h2>Les questions</h2>
          {!open ? (
            <p className="note">Elles s'ouvrent quand la vidéo est finie. Regardez-la jusqu'au bout.</p>
          ) : null}
          {open && current ? (
            <>
              <p className="kicker">
                Question {currentIndex + 1} sur {questions.length}
              </p>
              <p className="lead">{current.prompt}</p>
              <div className="stack">
                {current.choices.map((choice) => (
                  <button
                    key={choice.id}
                    className="btn btn-quiet"
                    type="button"
                    disabled={busy}
                    onClick={() => void choose(current.id, choice.id)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {open && !current ? <p className="okbox">C'est bien. Les questions sont finies.</p> : null}
          {feedback ? (
            <p className="warnbox" aria-live="polite">
              {feedback}
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
