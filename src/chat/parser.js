// French natural language parser for TopClean+ actions
// Detects intent + extracts fields from casual French text

import { SERVICES, PAYMENT_MODES, EXPENSE_CATEGORIES } from '../utils/services.jsx'
import * as store from '../store'
import { exportWeeklyExcel } from '../utils/exportExcel'
import { formatFCFA } from '../utils/fcfa.jsx'

const SERVICE_ALIASES = {
  pressing: 'pressing', press: 'pressing', blanchisserie: 'pressing', blanch: 'pressing',
  lessive: 'lessive', laverie: 'lessive', lavage: 'lessive', laver: 'lessive',
  nettoyage: 'nettoyage', menage: 'nettoyage', maison: 'nettoyage', batiment: 'nettoyage', nettoyer: 'nettoyage',
  canape: 'canape', matelas: 'canape', sofa: 'canape',
  desinfection: 'desinfection', desinfecter: 'desinfection',
}

const MODE_ALIASES = {
  cash: 'cash', espece: 'cash', especes: 'cash', liquide: 'cash',
  momo: 'momo', mobile: 'momo', 'mobile money': 'momo', moov: 'momo', mtn: 'momo',
  cheque: 'cheque', chèque: 'cheque',
}

const CAT_ALIASES = {
  transport: 'Transport', taxi: 'Transport', deplacement: 'Transport',
  produit: 'Produits', produits: 'Produits', lessive: 'Produits', savon: 'Produits',
  loyer: 'Loyer', bail: 'Loyer',
  fourniture: 'Fournitures', fournitures: 'Fournitures', materiel: 'Fournitures',
  maintenance: 'Maintenance', reparation: 'Maintenance', reparer: 'Maintenance',
}

function normalize(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, ' ')
    .trim()
}

function extractAmount(text) {
  // Match patterns like: 50000, 50.000, 50 000, 50000f, 50000 fcfa
  const matches = text.match(/(\d[\d\s.,]*\d|\d+)\s*(?:f(?:cfa)?)?/gi) || []
  return matches.map(m => parseInt(m.replace(/[\s.,fcfa]/gi, ''), 10)).filter(n => n > 0)
}

function extractName(text) {
  // Look for patterns like "mme X", "mr X", "client X", or capitalized names
  const namePatterns = [
    /(?:mme|madame|mr|monsieur|m\.?)\s+([a-zéèêëàâäùûüîïôö]+(?:\s+[a-zéèêëàâäùûüîïôö]+)?)/i,
    /(?:client|cliente)\s+([a-zéèêëàâäùûüîïôö]+(?:\s+[a-zéèêëàâäùûüîïôö]+)?)/i,
    /(?:pour|de|chez)\s+([A-Z][a-zéèêëàâäùûüîïôö]+(?:\s+[A-Z][a-zéèêëàâäùûüîïôö]+)?)/,
  ]
  for (const pat of namePatterns) {
    const match = text.match(pat)
    if (match) return match[1].trim()
  }
  return null
}

function findService(text) {
  const norm = normalize(text)
  for (const [alias, id] of Object.entries(SERVICE_ALIASES)) {
    if (norm.includes(alias)) return id
  }
  return null
}

function findPaymentMode(text) {
  const norm = normalize(text)
  for (const [alias, id] of Object.entries(MODE_ALIASES)) {
    if (norm.includes(alias)) return id
  }
  return 'cash'
}

function findCategory(text) {
  const norm = normalize(text)
  for (const [alias, cat] of Object.entries(CAT_ALIASES)) {
    if (norm.includes(alias)) return cat
  }
  return 'Autre'
}

function extractPieces(text) {
  const match = text.match(/(\d+)\s*(?:pieces?|pcs?|articles?|habits?|vetements?|complets?)/i)
  return match ? parseInt(match[1], 10) : 1
}

function detectIntent(text) {
  const norm = normalize(text)

  // Excel export
  if (/excel|telecharger|download|exporter|fichier/.test(norm)) return 'export'

  // Stats / dashboard queries
  if (/combien|chiffre|total|resume|bilan|rapport|ca du jour|recette/.test(norm)) return 'stats'
  if (/en attente|pending|approuver|approuve/.test(norm)) return 'pending'
  if (/cloture|cloturee|caisse fermee/.test(norm)) return 'closing_status'

  // Expense
  if (/depense|achat|paye pour|frais|acheter|cout/.test(norm)) return 'expense'

  // Ticket (default if amounts + service detected)
  if (findService(text) || /ticket|client|nouveau/.test(norm)) return 'ticket'

  // If there are amounts, probably a ticket
  if (extractAmount(text).length > 0) return 'ticket'

  return 'unknown'
}

export function processMessage(text) {
  const intent = detectIntent(text)
  const today = new Date().toISOString().slice(0, 10)

  switch (intent) {
    case 'export': {
      try {
        exportWeeklyExcel()
        return { type: 'success', message: '📥 Fichier Excel telecharge! Verifiez vos telechargements.' }
      } catch (err) {
        return { type: 'error', message: 'Erreur lors du telechargement. Essayez depuis le tableau de bord.' }
      }
    }

    case 'stats': {
      const tickets = store.getTickets(today)
      const expenses = store.getExpenses(today)
      const totalCA = tickets.reduce((s, t) => s + (t.caFacture || 0), 0)
      const totalEnc = tickets.reduce((s, t) => s + (t.totalPaid || 0), 0)
      const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0)
      const pending = tickets.filter(t => t.status === 'pending').length
      return {
        type: 'info',
        message: `📊 Resume du jour:\n• CA facture: ${formatFCFA(totalCA)}\n• Encaisse: ${formatFCFA(totalEnc)}\n• Depenses: ${formatFCFA(totalExp)}\n• Net: ${formatFCFA(totalEnc - totalExp)}\n• ${tickets.length} tickets (${pending} en attente)\n• ${expenses.length} depenses`,
      }
    }

    case 'pending': {
      const tickets = store.getTickets(today)
      const expenses = store.getExpenses(today)
      const pt = tickets.filter(t => t.status === 'pending')
      const pe = expenses.filter(e => e.status === 'pending')

      if (normalize(text).includes('approuve')) {
        pt.forEach(t => store.updateTicketStatus(t.id, 'approved'))
        pe.forEach(e => store.updateExpenseStatus(e.id, 'approved'))
        return { type: 'success', message: `✅ ${pt.length} tickets et ${pe.length} depenses approuves.` }
      }

      if (pt.length + pe.length === 0) return { type: 'info', message: 'Rien en attente. Tout est approuve.' }
      const lines = [
        ...pt.map(t => `• Ticket: ${t.clientName} — ${formatFCFA(t.caFacture)}`),
        ...pe.map(e => `• Depense: ${e.description} — ${formatFCFA(e.amount)}`),
      ]
      return { type: 'info', message: `⏳ ${pt.length + pe.length} en attente:\n${lines.join('\n')}\n\nTapez "approuve tout" pour valider.` }
    }

    case 'closing_status': {
      const closing = store.getClosing(today)
      if (!closing) return { type: 'warning', message: '⚠️ La caisse n\'a pas encore ete cloturee aujourd\'hui.' }
      const cashOk = closing.cashDiscrepancy === 0
      const momoOk = closing.momoDiscrepancy === 0
      return {
        type: cashOk && momoOk ? 'success' : 'warning',
        message: `Cloture effectuee.\n• Especes: ${cashOk ? 'OK' : 'Ecart ' + formatFCFA(closing.cashDiscrepancy)}\n• MoMo: ${momoOk ? 'OK' : 'Ecart ' + formatFCFA(closing.momoDiscrepancy)}`,
      }
    }

    case 'expense': {
      const amounts = extractAmount(text)
      if (amounts.length === 0) return { type: 'error', message: 'Je n\'ai pas trouve de montant. Ex: "depense 15000 transport taxi"' }

      const category = findCategory(text)
      const mode = findPaymentMode(text)
      const norm = normalize(text)
      // Try to extract description: remove known keywords
      let desc = text.replace(/depense|achat|frais|acheter/gi, '').replace(/\d[\d\s.,]*(?:f(?:cfa)?)?/gi, '').trim()
      for (const alias of Object.keys(MODE_ALIASES)) desc = desc.replace(new RegExp(alias, 'gi'), '').trim()
      for (const alias of Object.keys(CAT_ALIASES)) desc = desc.replace(new RegExp(alias, 'gi'), '').trim()
      desc = desc.replace(/\s+/g, ' ').trim() || category

      const expense = store.addExpense({
        date: today,
        description: desc,
        category,
        amount: amounts[0],
        supplier: '',
        paymentMode: mode,
        photoId: null,
      })

      return { type: 'success', message: `✅ Depense enregistree:\n• ${desc}: ${formatFCFA(amounts[0])}\n• Categorie: ${category}\n• Mode: ${mode}\n\n⚠️ N'oubliez pas d'ajouter la photo du recu dans l'onglet Depenses.` }
    }

    case 'ticket': {
      const amounts = extractAmount(text)
      const clientName = extractName(text)
      const service = findService(text)
      const mode = findPaymentMode(text)
      const pieces = extractPieces(text)

      if (!clientName && amounts.length === 0) {
        return { type: 'error', message: 'Je n\'ai pas compris. Essayez:\n"Mme Adjovi pressing 3 pieces 50000 avance 25000 momo"' }
      }

      const ca = amounts[0] || 0
      const advance = amounts[1] || ca

      const ticket = store.addTicket({
        date: today,
        clientName: clientName || 'Client',
        serviceType: service || 'pressing',
        items: pieces,
        caFacture: ca,
        advance: Math.min(advance, ca),
        paymentMode: mode,
        photoId: null,
      })

      const sLabel = SERVICES.find(s => s.id === ticket.serviceType)?.label || ticket.serviceType
      return {
        type: 'success',
        message: `✅ Ticket cree:\n• Client: ${ticket.clientName}\n• Service: ${sLabel}\n• CA: ${formatFCFA(ticket.caFacture)}\n• Avance: ${formatFCFA(ticket.totalPaid)}\n• Reste: ${formatFCFA(ticket.remainingBalance)}\n• Mode: ${mode}`,
      }
    }

    default:
      return {
        type: 'info',
        message: `Je peux vous aider avec:\n• Creer un ticket: "Mme Adjovi pressing 50000 avance 25000 momo"\n• Ajouter une depense: "depense 15000 transport taxi"\n• Voir le resume: "combien aujourd'hui?"\n• Voir les attentes: "en attente"\n• Approuver tout: "approuve tout"\n• Statut cloture: "la caisse est cloturee?"\n• Telecharger Excel: "telecharger excel"`,
      }
  }
}
