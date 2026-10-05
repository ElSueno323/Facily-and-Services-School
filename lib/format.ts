export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const remain = total % 60
  if (minutes === 0) {
    return `${remain} seconde${remain > 1 ? "s" : ""}`
  }
  return `${minutes} min ${remain.toString().padStart(2, "0")}`
}

export function formatWhen(iso: string | null) {
  if (!iso) return ""
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso))
}

export function roleLabel(role: "user" | "responsable" | "admin") {
  if (role === "admin") return "IT"
  if (role === "responsable") return "Responsable"
  return "Employé"
}

export function placeKindLabel(kind: "magasin" | "restaurant" | null) {
  if (kind === "restaurant") return "Restaurant"
  if (kind === "magasin") return "Magasin"
  return ""
}

export function statusLabel(
  status: "new" | "started" | "done",
  detail?: { watched?: boolean; questionCount?: number; correctCount?: number },
) {
  if (status === "done") return "Terminée"
  if (
    detail?.watched &&
    (detail.questionCount ?? 0) > 0 &&
    (detail.correctCount ?? 0) < (detail.questionCount ?? 0)
  ) {
    return "Questions à faire"
  }
  if (status === "started") return "En cours"
  return "Pas encore vue"
}
