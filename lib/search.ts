export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
}

export function splitTags(raw: string): { tags: string[] } | { error: "mot" } {
  const parts = raw
    .split(/[,;\n]+/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean)
  if (parts.length > 8 || parts.some((part) => part.length > 40)) return { error: "mot" }
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of parts) {
    if (part.length < 2) continue
    const key = fold(part)
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(part)
  }
  return { tags }
}

export function matchesQuery(parts: string[], query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = fold(parts.filter(Boolean).join(" "))
  return words.every((word) => haystack.includes(word))
}
