"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function Nav({ role }: { role: "user" | "admin" }) {
  const path = usePathname()
  const items = [
    { href: "/accueil", label: "Accueil" },
    { href: "/accueil#chercher", label: "Chercher" },
    { href: "/progression", label: "Ma progression" },
  ]
  if (role === "admin") items.push({ href: "/responsable", label: "Responsable" })

  return (
    <nav aria-label="Menu">
      {items.map((item) => {
        const current =
          item.href === "/accueil"
            ? path === "/accueil" || path.startsWith("/sujets") || path.startsWith("/videos")
            : item.href === "/accueil#chercher"
              ? false
              : path === item.href || path.startsWith(`${item.href}/`)
        return (
          <Link key={item.href} href={item.href} className="navlink" aria-current={current ? "page" : undefined}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
