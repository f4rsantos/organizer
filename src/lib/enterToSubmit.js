const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color', 'range'])
const MENU_ROLES = new Set(['combobox', 'listbox', 'option', 'menuitem'])

function isSingleLineField(target) {
  if (!target || target.tagName !== 'INPUT' || target.isContentEditable) return false
  if (NON_TEXT_INPUT_TYPES.has(target.type)) return false
  return !MENU_ROLES.has(target.getAttribute?.('role'))
}

export function isSubmitEnter(event) {
  if (event.key !== 'Enter' || event.shiftKey) return false
  if (event.nativeEvent?.isComposing) return false
  return isSingleLineField(event.target)
}
