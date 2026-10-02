import { requireAdmin } from "@/lib/guard"

export default async function ResponsableLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return children
}
