export const IS_PROD = process.env.NODE_ENV === "production"

export const BADGE_OPTIONS = [
  {
    value: "featured",
    label: "Featured",
    icon: "🔥",
    color: "yellow",
  },
  {
    value: "trending",
    label: "Trending",
    icon: "📈",
    color: "red",
  },
  {
    value: "new",
    label: "New Launch",
    icon: "✨",
    color: "blue",
  },
  {
    value: "editor-pick",
    label: "Editor's Pick",
    icon: "📝",
    color: "purple",
  },
]
