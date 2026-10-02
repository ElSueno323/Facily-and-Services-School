export function CountBar({ done, total }: { done: number; total: number }) {
  const ratio = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="track" aria-hidden="true">
      <div className="fill" style={{ width: `${ratio}%` }} />
    </div>
  )
}
