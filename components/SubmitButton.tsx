"use client"

import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  pendingLabel,
  variant = "green",
}: {
  children: React.ReactNode
  pendingLabel: string
  variant?: "green" | "quiet" | "danger" | "google"
}) {
  const { pending } = useFormStatus()
  return (
    <button className={`btn btn-${variant}`} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  )
}
