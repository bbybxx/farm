export const clipboardAvailable = () => typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function'

export async function copyToClipboard(text) {
  if (clipboardAvailable() && (typeof window === 'undefined' || window.isSecureContext)) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      // fall through to manual fallback
    }
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  if (typeof document.execCommand !== 'function') {
    return false
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    const selection = typeof window !== 'undefined' && typeof window.getSelection === 'function' ? window.getSelection() : null
    const selected = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    textarea.select()
    let successful = false
    try {
      successful = document.execCommand('copy')
    } finally {
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea)
      }
    }
    if (selected && selection) {
      selection.removeAllRanges()
      selection.addRange(selected)
    }
    return successful
  } catch (error) {
    return false
  }
}
