// jsdom doesn't implement modal dialogs or the clipboard; these stand-ins are
// enough for components to render and for tests to see what was copied.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
}

if (typeof navigator !== 'undefined' && !navigator.clipboard) {
  const clipboard = { text: '', writeText: async (text: string) => void (clipboard.text = text) }
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
}
