export function formatFCFA(amount) {
  if (amount == null || isNaN(amount)) return '0 FCFA'
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

export function formatShort(amount) {
  if (amount == null || isNaN(amount)) return '0'
  if (Math.abs(amount) >= 1000000) {
    return (amount / 1000000).toFixed(1).replace('.0', '') + 'M'
  }
  if (Math.abs(amount) >= 1000) {
    return Math.round(amount / 1000) + 'k'
  }
  return String(Math.round(amount))
}
