const EDITOR_PICK_BADGES = new Set(["editor-pick"])

export const hasEditorPickBadge = (badges?: string[] | null): boolean => {
  if (!badges || badges.length === 0) return false
  return badges.some((badge) =>
    EDITOR_PICK_BADGES.has(badge.trim().toLowerCase()),
  )
}
