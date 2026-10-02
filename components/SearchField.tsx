"use client"

import { useSearchParams } from "next/navigation"

export function SearchField() {
  const query = useSearchParams().get("q") ?? ""

  return (
    <form id="chercher" className="top-search" action="/accueil" method="get">
      <input
        key={query}
        name="q"
        type="text"
        defaultValue={query}
        placeholder="Cherchez une vidéo, une catégorie ou un mot-clé"
        aria-label="Chercher une vidéo"
      />
    </form>
  )
}
