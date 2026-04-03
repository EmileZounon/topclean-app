import * as XLSX from 'xlsx'
import * as store from '../store'
import { SERVICES, PAYMENT_MODES } from './services.jsx'

export function exportWeeklyExcel() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // Go back to Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const wb = XLSX.utils.book_new()

  // ─── Sheet 1: TICKETS ──────────────────────────
  const ticketRows = [['Date', 'Client', 'Service', 'Nb Pieces', 'CA Facture', 'Total Paye', 'Reste', 'Mode Paiement', 'Statut']]
  let allTickets = []
  dates.forEach(date => {
    const tickets = store.getTickets(date)
    allTickets = allTickets.concat(tickets)
    tickets.forEach(t => {
      const service = SERVICES.find(s => s.id === t.serviceType)?.label || t.serviceType
      const mode = t.payments?.[0]?.paymentMode || ''
      const statut = t.status === 'approved' ? 'Approuve' : t.status === 'flagged' ? 'Signale' : 'En attente'
      ticketRows.push([t.date, t.clientName, service, t.items, t.caFacture, t.totalPaid, t.remainingBalance, mode, statut])
    })
  })
  const wsTickets = XLSX.utils.aoa_to_sheet(ticketRows)
  wsTickets['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsTickets, 'TICKETS')

  // ─── Sheet 2: DEPENSES ─────────────────────────
  const expenseRows = [['Date', 'Description', 'Categorie', 'Montant', 'Fournisseur', 'Mode Paiement', 'Statut']]
  let allExpenses = []
  dates.forEach(date => {
    const expenses = store.getExpenses(date)
    allExpenses = allExpenses.concat(expenses)
    expenses.forEach(e => {
      const statut = e.status === 'approved' ? 'Approuve' : e.status === 'flagged' ? 'Signale' : 'En attente'
      expenseRows.push([e.date, e.description, e.category, e.amount, e.supplier || '', e.paymentMode, statut])
    })
  })
  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows)
  wsExpenses['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'DEPENSES')

  // ─── Sheet 3: BILAN HEBDO ─────────────────────
  const bilanRows = [['BILAN HEBDOMADAIRE', '', '', '', '', ''],
    [`Semaine du ${dates[0]} au ${dates[6]}`],
    [],
    ['Date', 'CA Facture', 'Encaisse', 'Depenses', 'Net', 'Nb Tickets']]

  let weekCA = 0, weekEnc = 0, weekExp = 0
  dates.forEach(date => {
    const tickets = store.getTickets(date)
    const expenses = store.getExpenses(date)
    const ca = tickets.reduce((s, t) => s + (t.caFacture || 0), 0)
    const enc = tickets.reduce((s, t) => s + (t.totalPaid || 0), 0)
    const exp = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    weekCA += ca; weekEnc += enc; weekExp += exp
    bilanRows.push([date, ca, enc, exp, enc - exp, tickets.length])
  })
  bilanRows.push([])
  bilanRows.push(['TOTAL', weekCA, weekEnc, weekExp, weekEnc - weekExp, allTickets.length])

  // By service
  bilanRows.push([])
  bilanRows.push(['CA PAR SERVICE', 'CA', 'Objectif', '% Objectif'])
  SERVICES.forEach(s => {
    const ca = allTickets.filter(t => t.serviceType === s.id).reduce((sum, t) => sum + (t.caFacture || 0), 0)
    const pct = s.objectif > 0 ? Math.round((ca / s.objectif) * 100) : 0
    bilanRows.push([s.label, ca, s.objectif, pct + '%'])
  })

  // By payment mode
  bilanRows.push([])
  bilanRows.push(['ENCAISSEMENTS PAR MODE', 'Montant'])
  const byMode = { cash: 0, momo: 0, cheque: 0 }
  allTickets.forEach(t => (t.payments || []).forEach(p => { if (byMode.hasOwnProperty(p.paymentMode)) byMode[p.paymentMode] += p.amount }))
  PAYMENT_MODES.forEach(m => bilanRows.push([m.label, byMode[m.id]]))

  const wsBilan = XLSX.utils.aoa_to_sheet(bilanRows)
  wsBilan['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsBilan, 'BILAN HEBDO')

  // ─── Sheet 4: CLOTURES ─────────────────────────
  const clotureRows = [['Date', 'Especes Caisse', 'Especes Attendu', 'Ecart Especes', 'MoMo Matin', 'MoMo Soir', 'MoMo Attendu', 'Ecart MoMo']]
  dates.forEach(date => {
    const c = store.getClosing(date)
    if (c) {
      clotureRows.push([date, c.cashCount, c.expectedCash, c.cashDiscrepancy, c.momoMorning, c.momoEvening, c.expectedMomo, c.momoDiscrepancy])
    } else {
      clotureRows.push([date, 'Non cloturee', '', '', '', '', '', ''])
    }
  })
  const wsCloture = XLSX.utils.aoa_to_sheet(clotureRows)
  wsCloture['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsCloture, 'CLOTURES')

  // Download
  const weekLabel = dates[0].replace(/-/g, '')
  XLSX.writeFile(wb, `TopClean_Semaine_${weekLabel}.xlsx`)
}
