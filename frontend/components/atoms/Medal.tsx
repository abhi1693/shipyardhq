export function Medal({ rank }: { rank: 1 | 2 | 3 }) {
  const emoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-100 text-yellow-800 border text-sm">
      {emoji}
    </span>
  )
}

export default Medal
