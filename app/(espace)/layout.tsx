import { Shell } from "@/components/Shell"
import { requireUser } from "@/lib/guard"

export const dynamic = "force-dynamic"

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const switched = session.user.switched
  return (
    <Shell
      name={session.user.name || "vous"}
      role={switched ? "user" : session.user.actorRole}
      showTeam={!switched && session.user.actorRole === "responsable"}
      switched={switched ? { actorName: session.user.actorName } : null}
    >
      {children}
    </Shell>
  )
}
