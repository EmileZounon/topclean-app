export const SERVICES = [
  { id: 'pressing', label: 'Pressing & Blanchisserie', objectif: 4000000 },
  { id: 'lessive', label: 'Lessive / Laverie', objectif: 1500000 },
  { id: 'nettoyage', label: 'Nettoyage Maison/Bat.', objectif: 3000000 },
  { id: 'canape', label: 'Canapé & Matelas', objectif: 1000000 },
  { id: 'desinfection', label: 'Désinfection', objectif: 500000 },
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
