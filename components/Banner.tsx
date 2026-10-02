import { confirmations, erreurs } from "@/lib/messages"

export function Banner({ ok, erreur }: { ok?: string; erreur?: string }) {
  if (ok && confirmations[ok]) return <p className="okbox">{confirmations[ok]}</p>
  if (erreur && erreurs[erreur]) return <p className="warnbox">{erreurs[erreur]}</p>
  return null
}
