import { Shell } from "@/components/Shell"
import { requireUser } from "@/lib/guard"

export const dynamic = "force-dynamic"

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  return (
    <Shell name={session.user.name || "vous"} role={session.user.role}>
      {children}
    </Shell>
  )
}
