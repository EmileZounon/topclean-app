export const SERVICES = [
  { id: 'pressing', label: 'Pressing & Blanchisserie', objectif: 4000000, minAdvancePct: 50 },
  { id: 'lessive', label: 'Lessive / Laverie', objectif: 1500000, minAdvancePct: 50 },
  { id: 'nettoyage', label: 'Nettoyage Maison/Bat.', objectif: 3000000, minAdvancePct: 0 },
  { id: 'canape', label: 'Canapé', objectif: 600000, minAdvancePct: 0 },
  { id: 'matelas', label: 'Matelas', objectif: 400000, minAdvancePct: 0 },
  { id: 'desinfection', label: 'Désinfection', objectif: 500000, minAdvancePct: 0 },
]

export const PIECE_TYPES = [
  { id: 'chemise', label: 'Chemise' },
  { id: 'pantalon', label: 'Pantalon' },
  { id: 'costume', label: 'Costume (complet)' },
  { id: 'robe', label: 'Robe' },
  { id: 'jupe', label: 'Jupe' },
  { id: 'veste', label: 'Veste / Blazer' },
  { id: 'drap', label: 'Drap' },
  { id: 'autre', label: 'Autre' },
]

export const INTAKE_MODES = [
  { id: 'depot_boutique', label: 'Dépôt boutique' },
  { id: 'collecte', label: 'Collecte' },
]

export const DELIVERY_MODES = [
  { id: 'retrait_boutique', label: 'Retrait boutique' },
  { id: 'livraison', label: 'Livraison' },
]

export const PAYMENT_MODES = [
  { id: 'cash', label: 'Espèces' },
  { id: 'momo', label: 'Mobile Money' },
  { id: 'cheque', label: 'Chèque' },
]

export const EXPENSE_CATEGORIES = [
  'Produits',
  'Transport',
  'Loyer',
  'Fournitures',
  'Maintenance',
  'Autre',
]

export const TOTAL_OBJECTIF = SERVICES.reduce((sum, s) => sum + s.objectif, 0)

// Returns true if the service uses the detailed item picker (pressing/lessive)
export function usesItemPicker(serviceId) {
  return serviceId === 'pressing' || serviceId === 'lessive'
}

// Returns total piece count from items (handles both old number format and new array format)
export function countItems(items) {
  if (typeof items === 'number') return items
  if (Array.isArray(items)) return items.reduce((sum, i) => sum + (i.qty || 0), 0)
  return 1
}
