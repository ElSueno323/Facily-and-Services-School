"use client"

import { useEffect, useRef, useState } from "react"
import { formatClock } from "@/lib/format"

type Props = {
  videoId: string
  src: string
  startAt: number
  ceiling: number
  alreadyDone: boolean
  hasQuiz: boolean
  onWatched?: () => void
  backHref: string
  nextHref: string | null
  nextTitle: string | null
}

export function VideoPlayer({
  videoId,
  src,
  startAt,
  ceiling,
  alreadyDone,
  hasQuiz,
  onWatched,
  backHref,
  nextHref,
  nextTitle,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const maxRef = useRef(alreadyDone ? Number.POSITIVE_INFINITY : Math.max(ceiling, startAt))
  const lastRef = useRef({ t: startAt, at: 0 })
  const doneRef = useRef(alreadyDone)
  const appliedRef = useRef(false)
  const lastSaveRef = useRef(0)
  const [paused, setPaused] = useState(true)
  const [done, setDone] = useState(alreadyDone)
  const [current, setCurrent] = useState(startAt)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const api = useRef({ toggle() {}, rewind() {}, forward() {} })

  async function save(position: number, completed: boolean) {
    const length = videoRef.current && Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, position, completed, duration: length }),
        keepalive: true,
      })
      if (!response.ok) {
        setSaveError(true)
        return false
      }
      setSaveError(false)
      return true
    } catch {
      setSaveError(true)
      return false
    }
  }

  function clampForward() {
    const video = videoRef.current
    if (!video || doneRef.current) return
    const now = performance.now()
    const elapsed = lastRef.current.at === 0 ? 0.3 : (now - lastRef.current.at) / 1000
    const allowed = Math.max(maxRef.current, lastRef.current.t + elapsed + 1)
    if (video.currentTime > allowed + 0.35 && video.currentTime > maxRef.current + 0.5) {
      video.currentTime = maxRef.current
      return
    }
    if (video.currentTime > maxRef.current) maxRef.current = video.currentTime
    lastRef.current = { t: video.currentTime, at: now }
  }

  function onTime() {
    const video = videoRef.current
    if (!video) return
    clampForward()
    setCurrent(video.currentTime)
    setDuration(Number.isFinite(video.duration) ? video.duration : 0)
    if (doneRef.current) return
    const now = Date.now()
    if (now - lastSaveRef.current > 5000) {
      lastSaveRef.current = now
      void save(video.currentTime, false)
    }
  }

  function toggle() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.playbackRate = 1
      if (!doneRef.current && video.currentTime > maxRef.current + 0.2) {
        video.currentTime = maxRef.current
      }
      void video.play().catch(() => setError(true))
    } else {
      video.pause()
      void save(video.currentTime, false)
    }
  }

  function rewind() {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, video.currentTime - 10)
    lastRef.current = { t: video.currentTime, at: performance.now() }
    setCurrent(video.currentTime)
  }

  function forward() {
    const video = videoRef.current
    if (!video || !doneRef.current) return
    const limit = Number.isFinite(video.duration) ? video.duration : video.currentTime + 10
    video.currentTime = Math.min(limit, video.currentTime + 10)
    setCurrent(video.currentTime)
  }

  api.current.toggle = toggle
  api.current.rewind = rewind
  api.current.forward = forward

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      if (typing) return
      if (event.key === " " || event.key === "k" || event.key === "K") {
        event.preventDefault()
        api.current.toggle()
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        api.current.rewind()
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        api.current.forward()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function onLoaded() {
    const video = videoRef.current
    if (!video || appliedRef.current) return
    appliedRef.current = true
    const length = Number.isFinite(video.duration) ? video.duration : 0
    setDuration(length)
    if (!alreadyDone && startAt > 0 && (length === 0 || startAt < length - 0.4)) {
      video.currentTime = startAt
    }
    maxRef.current = alreadyDone ? Number.POSITIVE_INFINITY : Math.max(ceiling, startAt, video.currentTime)
    lastRef.current = { t: video.currentTime, at: performance.now() }
    setCurrent(video.currentTime)
  }

  async function onEnded() {
    const video = videoRef.current
    doneRef.current = true
    setDone(true)
    setPaused(true)
    const saved = await save(video?.duration || video?.currentTime || 0, true)
    if (saved) onWatched?.()
  }

  async function stop() {
    const video = videoRef.current
    try {
      if (video) {
        video.pause()
        await Promise.race([save(video.currentTime, false), new Promise((resolve) => setTimeout(resolve, 1200))])
      }
    } finally {
      window.location.assign(backHref)
    }
  }

  const ratio = duration > 0 ? Math.min(100, Math.round((current / duration) * 100)) : 0
  const playLabel = !paused ? "Mettre en pause" : current > 1 && !done ? "Continuer la vidéo" : "Lire la vidéo"

  return (
    <div className="stack-lg">
      <div className="video-frame">
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          controls={false}
          onClick={toggle}
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTime}
          onSeeking={clampForward}
          onEnded={onEnded}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onError={() => setError(true)}
          onRateChange={() => {
            const video = videoRef.current
            if (video && video.playbackRate !== 1) video.playbackRate = 1
          }}
        />
      </div>

      <div>
        <p className="countline">
          {duration > 0 ? `${formatClock(current)} sur ${formatClock(duration)}` : formatClock(current)}
        </p>
        <div
          className="track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ratio}
          aria-label="Avancement de la vidéo"
        >
          <div className="fill" style={{ width: `${ratio}%` }} />
        </div>
      </div>

      <p className={done ? "okbox" : "note"} aria-live="polite">
        {done
          ? hasQuiz
            ? "La vidéo est finie. Répondez aux questions en bas."
            : "C'est fait. Cette vidéo est terminée. Vous pouvez la revoir et avancer ou reculer."
          : "La première fois, regardez la vidéo jusqu'au bout. Vous pouvez l'arrêter. Elle reprendra au même endroit."}
      </p>

      {error ? <p className="warnbox">La vidéo ne s'ouvre pas. Appelez le responsable.</p> : null}
      {saveError ? <p className="warnbox">La progression n'a pas pu être gardée. Restez sur cette page un instant.</p> : null}

      <div className="stack">
        <button className="btn btn-green" type="button" onClick={toggle}>
          {playLabel}
        </button>
        <button className="btn btn-quiet" type="button" onClick={rewind}>
          Reculer de 10 secondes
        </button>
        {done ? (
          <button className="btn btn-quiet" type="button" onClick={forward}>
            Avancer de 10 secondes
          </button>
        ) : null}
        {done && duration > 0 ? (
          <label className="field">
            <span>Aller à un moment de la vidéo</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={Math.min(current, duration)}
              onChange={(event) => {
                const video = videoRef.current
                if (!video) return
                video.currentTime = Number(event.target.value)
                setCurrent(video.currentTime)
              }}
            />
          </label>
        ) : null}
        {done && nextHref ? (
          <a className="btn btn-green" href={nextHref}>
            Vidéo suivante{nextTitle ? ` : ${nextTitle}` : ""}
          </a>
        ) : null}
        <button className="btn btn-quiet" type="button" onClick={() => void stop()}>
          Arrêter et revenir
        </button>
      </div>
    </div>
  )
}
