// Third-party ad scripts retain globals, callbacks and observers after unmount.
// Give each ad-bearing pathname its own document, including history/router moves.
export function reloadAdDocumentIfNeeded() {
  const state = document.documentElement.dataset
  if (!state.adDocumentPath || state.adDocumentPath === location.pathname) {
    return false
  }
  if (!state.adDocumentReloading) {
    state.adDocumentReloading = "true"
    window.location.reload()
  }
  return true
}

export function claimAdDocument() {
  if (reloadAdDocumentIfNeeded()) return false
  const state = document.documentElement.dataset
  state.adDocumentPath = location.pathname
  return true
}

export function handleAdDocumentClick(event: MouseEvent) {
  if (
    !document.documentElement.dataset.adDocumentPath ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return

  const link =
    event.target instanceof Element ? event.target.closest("a") : null
  if (
    !link ||
    link.hasAttribute("download") ||
    (link.target && link.target !== "_self")
  )
    return
  const url = new URL(link.href, location.href)
  if (url.origin !== location.origin || url.pathname === location.pathname)
    return

  event.preventDefault()
  event.stopPropagation()
  window.location.assign(url.href)
}
