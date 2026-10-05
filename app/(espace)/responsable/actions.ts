"use server"

import fs from "fs/promises"
import path from "path"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/guard"
import { splitTags } from "@/lib/search"
import {
  createModule,
  createQuestion,
  createVideo,
  setVideoTags,
  deleteExamples,
  deleteModule,
  deleteQuestion,
  deleteVideo,
  renameModule,
  renameVideo,
  assignPerson,
  createAccount,
  createPlace,
  deletePlace,
  setUserActive,
} from "@/lib/db"

function clean(value: FormDataEntryValue | null, max: number) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ")
  if (!text) return { error: "titre" as const }
  if (text.length > max) return { error: "long" as const }
  return { text }
}

async function removeUploaded(sources: Array<string | null>) {
  const root = path.resolve(process.cwd(), "public", "uploads")
  for (const src of sources) {
    if (!src?.startsWith("/uploads/")) continue
    const full = path.resolve(process.cwd(), "public", src.replace(/^\/+/, ""))
    if (full !== root && !full.startsWith(root + path.sep)) continue
    await fs.unlink(full).catch(() => undefined)
  }
}

export async function ajouterSujet(formData: FormData) {
  await requireAdmin()
  const title = clean(formData.get("titre"), 80)
  if ("error" in title) redirect(`/responsable/videos?erreur=${title.error === "titre" ? "sujet-nom" : "long"}`)
  const summary = clean(formData.get("phrase"), 240)
  const phrase = "error" in summary ? "" : summary.text
  if ("error" in summary && summary.error === "long") redirect("/responsable/videos?erreur=long")
  createModule(title.text, phrase)
  redirect("/responsable/videos?ok=sujet")
}

export async function renommerSujet(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const title = clean(formData.get("titre"), 80)
  if (!id || "error" in title) redirect("/responsable/videos?erreur=sujet-nom")
  const summary = clean(formData.get("phrase"), 240)
  if ("error" in summary && summary.error === "long") redirect("/responsable/videos?erreur=long")
  renameModule(id, title.text, "error" in summary ? "" : summary.text)
  redirect("/responsable/videos?ok=nom")
}

export async function retirerSujet(formData: FormData) {
  await requireAdmin()
  if (formData.get("confirme") !== "on") redirect("/responsable/videos?erreur=sujet")
  const id = String(formData.get("id") ?? "")
  const sources = deleteModule(id)
  await removeUploaded(sources)
  redirect("/responsable/videos?ok=retire")
}

export async function ajouterVideo(formData: FormData) {
  await requireAdmin()
  const moduleId = String(formData.get("sujet") ?? "")
  const title = clean(formData.get("titre"), 120)
  if (!moduleId) redirect("/responsable/videos?erreur=sujet")
  if ("error" in title) redirect(`/responsable/videos?erreur=${title.error}`)
  const summary = clean(formData.get("phrase"), 240)
  if ("error" in summary && summary.error === "long") redirect("/responsable/videos?erreur=long")
  const file = formData.get("fichier")
  if (!(file instanceof File) || file.size === 0) redirect("/responsable/videos?erreur=fichier")
  if (file.size > 500 * 1024 * 1024) redirect("/responsable/videos?erreur=taille")
  const ext = path.extname(file.name).toLowerCase()
  if (ext !== ".mp4" && ext !== ".webm") redirect("/responsable/videos?erreur=format")
  const filename = `${crypto.randomUUID()}${ext}`
  const full = path.join(process.cwd(), "public", "uploads", filename)
  await fs.writeFile(full, Buffer.from(await file.arrayBuffer()))
  const mots = splitTags(String(formData.get("mots") ?? ""))
  if ("error" in mots) {
    await fs.unlink(full).catch(() => undefined)
    redirect("/responsable/videos?erreur=mot")
  }
  const id = createVideo({
    moduleId,
    title: title.text,
    summary: "error" in summary ? "" : summary.text,
    src: `/uploads/${filename}`,
  })
  if (!id) {
    await fs.unlink(full).catch(() => undefined)
    redirect("/responsable/videos?erreur=sujet")
  }
  setVideoTags(id, mots.tags)
  redirect("/responsable/videos?ok=video")
}

export async function enregistrerMots(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const mots = splitTags(String(formData.get("mots") ?? ""))
  if (!id) redirect("/responsable/videos?erreur=sujet")
  if ("error" in mots) redirect("/responsable/videos?erreur=mot")
  setVideoTags(id, mots.tags)
  redirect("/responsable/videos?ok=mots")
}

export async function renommerVideo(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const title = clean(formData.get("titre"), 120)
  if (!id || "error" in title) redirect("/responsable/videos?erreur=titre")
  const summary = clean(formData.get("phrase"), 240)
  if ("error" in summary && summary.error === "long") redirect("/responsable/videos?erreur=long")
  renameVideo(id, title.text, "error" in summary ? "" : summary.text)
  redirect("/responsable/videos?ok=nom")
}

export async function retirerVideo(formData: FormData) {
  await requireAdmin()
  if (formData.get("confirme") !== "on") redirect("/responsable/videos?erreur=fichier")
  const id = String(formData.get("id") ?? "")
  const src = deleteVideo(id)
  await removeUploaded(src ? [src] : [])
  redirect("/responsable/videos?ok=retire")
}

export async function retirerExemples(formData: FormData) {
  await requireAdmin()
  if (formData.get("confirme") !== "on") redirect("/responsable/videos?erreur=fichier")
  const sources = deleteExamples()
  await removeUploaded(sources)
  redirect("/responsable/videos?ok=exemples")
}

export async function ajouterQuestion(formData: FormData) {
  await requireAdmin()
  const videoId = String(formData.get("video") ?? "")
  const prompt = clean(formData.get("question"), 180)
  if (!videoId) redirect("/responsable/videos?erreur=sujet")
  if ("error" in prompt) redirect(`/responsable/videos?erreur=${prompt.error === "titre" ? "question" : "long"}`)
  const answers = [1, 2, 3].map((number) => clean(formData.get(`reponse${number}`), 120))
  if (answers.some((answer) => "error" in answer && answer.error === "long")) {
    redirect("/responsable/videos?erreur=long")
  }
  const bonne = String(formData.get("bonne") ?? "")
  if (bonne !== "1" && bonne !== "2" && bonne !== "3") redirect("/responsable/videos?erreur=bonne")
  const chosen = answers[Number(bonne) - 1]
  if (!chosen || "error" in chosen) redirect("/responsable/videos?erreur=bonne")
  const choices = answers.flatMap((answer, index) => {
    if ("error" in answer) return []
    return [{ label: answer.text, correct: String(index + 1) === bonne }]
  })
  if (choices.length < 2) redirect("/responsable/videos?erreur=reponses")
  const id = createQuestion(videoId, prompt.text, choices)
  if (!id) redirect("/responsable/videos?erreur=sujet")
  redirect("/responsable/videos?ok=question")
}

export async function retirerQuestion(formData: FormData) {
  await requireAdmin()
  if (formData.get("confirme") !== "on") redirect("/responsable/videos?erreur=question")
  deleteQuestion(String(formData.get("id") ?? ""))
  redirect("/responsable/videos?ok=retire")
}

export async function ajouterLieu(formData: FormData) {
  await requireAdmin()
  const name = clean(formData.get("nom"), 80)
  if ("error" in name) redirect(`/responsable/personnes?erreur=${name.error === "titre" ? "lieu" : "long"}`)
  const kind = formData.get("type") === "restaurant" ? "restaurant" : formData.get("type") === "magasin" ? "magasin" : null
  if (!kind) redirect("/responsable/personnes?erreur=lieu")
  createPlace(name.text, kind)
  redirect("/responsable/personnes?ok=lieu")
}

export async function retirerLieu(formData: FormData) {
  await requireAdmin()
  if (formData.get("confirme") !== "on") redirect("/responsable/personnes?erreur=lieu")
  const result = deletePlace(String(formData.get("id") ?? ""))
  redirect(`/responsable/personnes?${result.ok ? "ok=retire" : `erreur=${result.error}`}`)
}

export async function ajouterCompte(formData: FormData) {
  await requireAdmin()
  const result = createAccount({
    name: String(formData.get("nom") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("motdepasse") ?? ""),
    role: "responsable",
    placeId: String(formData.get("lieu") ?? "") || null,
  })
  redirect(`/responsable/personnes?${result.ok ? "ok=compte" : `erreur=${result.error}`}`)
}

export async function associerResponsable(formData: FormData) {
  await requireAdmin()
  const result = assignPerson(
    String(formData.get("id") ?? ""),
    "responsable",
    String(formData.get("lieu") ?? "") || null,
  )
  redirect(`/responsable/personnes?${result.ok ? "ok=personne" : `erreur=${result.error}`}`)
}

export async function changerAcces(formData: FormData) {
  const session = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  if (id === session.user.actorId) redirect("/responsable/personnes?erreur=soi")
  if (formData.get("confirme") !== "on") redirect("/responsable/personnes?erreur=personne")
  const active = formData.get("actif") === "1"
  const result = setUserActive(id, active)
  redirect(`/responsable/personnes?${result.ok ? "ok=personne" : `erreur=${result.error}`}`)
}
