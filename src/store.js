// Local storage data layer — replaces Firebase entirely
// All data lives in localStorage. Photos in IndexedDB as base64.

const KEYS = {
  tickets: 'tc_tickets',
  expenses: 'tc_expenses',
  dailyClosing: 'tc_closing',
  pin: 'tc_pin',
  role: 'tc_role',
  userName: 'tc_userName',
}

// ─── Generic CRUD ────────────────────────────────
function getAll(key) {
  return JSON.parse(localStorage.getItem(key) || '[]')
}

function setAll(key, items) {
  localStorage.setItem(key, JSON.stringify(items))
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ─── Business Day (10h–10h) ─────────────────────
export function businessDay() {
  const now = new Date()
  if (now.getHours() < 10) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  }
  return now.toISOString().slice(0, 10)
}

// Find days that have tickets or expenses but no closing (up to 7 days back)
export function getUnclosedDays() {
  const allTickets = getAll(KEYS.tickets)
  const allExpenses = getAll(KEYS.expenses)
  const closings = JSON.parse(localStorage.getItem(KEYS.dailyClosing) || '{}')
  const today = businessDay()

  // Collect all dates that have activity
  const activeDates = new Set()
  allTickets.forEach(t => activeDates.add(t.date))
  allExpenses.forEach(e => activeDates.add(e.date))

  // Filter to dates that have no closing and are before today
  return [...activeDates]
    .filter(d => d < today && !closings[d])
    .sort()
    .slice(-7) // last 7 unclosed days max
}

// ─── Tickets ─────────────────────────────────────
export function getTickets(date) {
  return getAll(KEYS.tickets).filter((t) => t.date === date).sort((a, b) => b.createdAt - a.createdAt)
}

export function getAllTickets() {
  return getAll(KEYS.tickets)
}

export function addTicket(ticket) {
  const all = getAll(KEYS.tickets)
  const id = genId()
  const ca = ticket.caFacture || 0
  const advance = ticket.advance || 0
  const entry = {
    id,
    date: ticket.date,
    clientName: ticket.clientName,
    serviceType: ticket.serviceType,
    items: ticket.items || 1,
    caFacture: ca,
    payments: [{
      amount: advance,
      paymentMode: ticket.paymentMode,
      createdAt: Date.now(),
    }],
    totalPaid: advance,
    remainingBalance: ca - advance,
    status: 'pending',
    intakeMode: ticket.intakeMode || 'depot_boutique',
    deliveryMode: null,
    createdAt: Date.now(),
    photoId: ticket.photoId || null,
  }
  all.push(entry)
  setAll(KEYS.tickets, all)
  return entry
}

export function addPayment(ticketId, payment) {
  const all = getAll(KEYS.tickets)
  const idx = all.findIndex((t) => t.id === ticketId)
  if (idx === -1) return null
  all[idx].payments.push({ ...payment, createdAt: Date.now() })
  all[idx].totalPaid = all[idx].payments.reduce((s, p) => s + p.amount, 0)
  all[idx].remainingBalance = all[idx].caFacture - all[idx].totalPaid
  all[idx].status = 'pending'
  setAll(KEYS.tickets, all)
  return all[idx]
}

export function getTicketById(id) {
  return getAll(KEYS.tickets).find((t) => t.id === id) || null
}

export function updateTicketStatus(id, status, flagNote) {
  const all = getAll(KEYS.tickets)
  const idx = all.findIndex((t) => t.id === id)
  if (idx === -1) return
  all[idx].status = status
  if (flagNote) all[idx].flagNote = flagNote
  all[idx].approvedAt = Date.now()
  setAll(KEYS.tickets, all)
}

export function updateTicketDelivery(id, deliveryMode) {
  const all = getAll(KEYS.tickets)
  const idx = all.findIndex((t) => t.id === id)
  if (idx === -1) return
  all[idx].deliveryMode = deliveryMode
  setAll(KEYS.tickets, all)
}

// ─── Expenses ────────────────────────────────────
export function getExpenses(date) {
  return getAll(KEYS.expenses).filter((e) => e.date === date).sort((a, b) => b.createdAt - a.createdAt)
}

export function addExpense(expense) {
  const all = getAll(KEYS.expenses)
  const id = genId()
  const entry = {
    id,
    date: expense.date,
    description: expense.description,
    category: expense.category,
    amount: expense.amount || 0,
    supplier: expense.supplier,
    paymentMode: expense.paymentMode,
    status: 'pending',
    createdAt: Date.now(),
    photoId: expense.photoId || null,
  }
  all.push(entry)
  setAll(KEYS.expenses, all)
  return entry
}

export function updateExpenseStatus(id, status) {
  const all = getAll(KEYS.expenses)
  const idx = all.findIndex((e) => e.id === id)
  if (idx === -1) return
  all[idx].status = status
  all[idx].approvedAt = Date.now()
  setAll(KEYS.expenses, all)
}

// ─── Daily Closing ───────────────────────────────
export function getClosing(date) {
  const all = JSON.parse(localStorage.getItem(KEYS.dailyClosing) || '{}')
  return all[date] || null
}

export function saveClosing(date, data) {
  const all = JSON.parse(localStorage.getItem(KEYS.dailyClosing) || '{}')
  all[date] = { ...data, closedAt: Date.now() }
  localStorage.setItem(KEYS.dailyClosing, JSON.stringify(all))
}

// ─── Compute daily expected (client-side, no Cloud Functions) ──
export function computeExpected(date) {
  const tickets = getTickets(date)
  const expenses = getExpenses(date)

  let cashIn = 0, momoIn = 0
  tickets.forEach((t) => {
    (t.payments || []).forEach((p) => {
      if (p.paymentMode === 'cash') cashIn += p.amount
      if (p.paymentMode === 'momo') momoIn += p.amount
    })
  })

  let cashOut = 0
  expenses.forEach((e) => {
    if (e.paymentMode === 'cash') cashOut += e.amount
  })

  return { expectedCash: cashIn - cashOut, expectedMomo: momoIn }
}

// ─── Auth (simple PIN) ───────────────────────────
export function getPin() {
  return localStorage.getItem(KEYS.pin)
}

export function setPin(pin) {
  localStorage.setItem(KEYS.pin, pin)
}

export function getRole() {
  return localStorage.getItem(KEYS.role) || 'staff'
}

export function setRole(role) {
  localStorage.setItem(KEYS.role, role)
}

export function getUserName() {
  return localStorage.getItem(KEYS.userName) || ''
}

export function setUserName(name) {
  localStorage.setItem(KEYS.userName, name)
}

export function isSetup() {
  return !!getPin()
}

// ─── Photos (IndexedDB) ─────────────────────────
const PHOTO_DB = 'topclean-photos'
const PHOTO_STORE = 'photos'

function openPhotoDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(PHOTO_STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function savePhoto(dataUrl) {
  const id = genId()
  const idb = await openPhotoDB()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(PHOTO_STORE, 'readwrite')
    tx.objectStore(PHOTO_STORE).put({ id, dataUrl, createdAt: Date.now() })
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPhoto(id) {
  if (!id) return null
  const idb = await openPhotoDB()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(PHOTO_STORE, 'readonly')
    const req = tx.objectStore(PHOTO_STORE).get(id)
    req.onsuccess = () => resolve(req.result?.dataUrl || null)
    req.onerror = () => reject(req.error)
  })
}
